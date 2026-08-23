-- Enable RLS now that Supabase Auth identity (auth.uid()) is real and the
-- full app flow (sign-in, invite, settings, teams, draft, picks, kiosk) has
-- been verified working against the anon/service-role clients. This is
-- defense-in-depth alongside the app-layer commissioner/ownsTeam checks
-- already enforced in every route.

CREATE OR REPLACE FUNCTION public.is_commissioner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'commissioner'
  );
$$;

-- profiles: read any; update only your own row (role changes are handled by
-- the service-role admin path / commissioner promotion, not by users
-- themselves, since there's no authenticated write path to role in the app).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- leagues / league_settings / teams: read any authenticated user, write
-- commissioner only.
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY leagues_select ON public.leagues FOR SELECT TO authenticated USING (true);
CREATE POLICY leagues_write ON public.leagues FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY league_settings_select ON public.league_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY league_settings_write ON public.league_settings FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_write ON public.teams FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

-- team_members: read any; insert/delete commissioner only (this is the
-- invite/team-assignment action).
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_members_select ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY team_members_write ON public.team_members FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

-- drafts: read any; write (create/delete) commissioner only.
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY drafts_select ON public.drafts FOR SELECT TO authenticated USING (true);
CREATE POLICY drafts_write ON public.drafts FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

-- picks: read any; update only by the commissioner or the owner of the
-- team on that pick. This is the core "can this person make this pick" gate.
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY picks_select ON public.picks FOR SELECT TO authenticated USING (true);
CREATE POLICY picks_update_own_team ON public.picks FOR UPDATE
  TO authenticated
  USING (
    public.is_commissioner()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = picks.team_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_commissioner()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = picks.team_id AND tm.user_id = auth.uid())
  );
CREATE POLICY picks_insert_commissioner ON public.picks FOR INSERT
  TO authenticated WITH CHECK (public.is_commissioner());
CREATE POLICY picks_delete_commissioner ON public.picks FOR DELETE
  TO authenticated USING (public.is_commissioner());

-- players / draft_players / player_adp / players_with_adp: read any
-- authenticated user; writes are service-role only (Sleeper cron import,
-- and the ADP-update route which already gates on isCommissioner at the
-- app layer before writing as the calling user -- so authenticated also
-- needs write here for draft_players/player_adp specifically).
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY players_select ON public.players FOR SELECT TO authenticated USING (true);

ALTER TABLE public.draft_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY draft_players_select ON public.draft_players FOR SELECT TO authenticated USING (true);
CREATE POLICY draft_players_write ON public.draft_players FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.player_adp ENABLE ROW LEVEL SECURITY;
CREATE POLICY player_adp_select ON public.player_adp FOR SELECT TO authenticated USING (true);
CREATE POLICY player_adp_write ON public.player_adp FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

GRANT EXECUTE ON FUNCTION public.is_commissioner() TO authenticated, service_role;

-- submit_draft_pick also updates drafts.current_pick/status, which a
-- non-commissioner team owner isn't allowed to write under the drafts_write
-- policy above. Make it SECURITY DEFINER (bypassing RLS for its own writes)
-- and add an explicit authorization check at the top, so it's still exactly
-- as restrictive as the picks_update_own_team policy for the pick itself.
CREATE OR REPLACE FUNCTION public.submit_draft_pick(
    p_draft_id integer,
    p_pick_id integer,
    p_player_id integer,
    p_picked_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pick RECORD;
    v_next_pick INTEGER;
    v_result JSONB;
    v_total_picks INTEGER;
    v_picked_count INTEGER;
BEGIN
    SELECT p.*, d.current_pick, d.total_picks
    INTO v_pick
    FROM picks p
    JOIN drafts d ON p.draft_id = d.id
    WHERE p.id = p_pick_id AND p.draft_id = p_draft_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pick not found';
    END IF;

    IF NOT (
        public.is_commissioner()
        OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = v_pick.team_id AND tm.user_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Not authorized to make this pick';
    END IF;

    UPDATE picks
    SET player_id = p_player_id, is_picked = true, picked_by = p_picked_by
    WHERE id = p_pick_id AND draft_id = p_draft_id;

    INSERT INTO draft_players (draft_id, player_id, is_picked)
    VALUES (p_draft_id, p_player_id, true)
    ON CONFLICT (draft_id, player_id)
    DO UPDATE SET is_picked = true;

    IF v_pick.total_pick_number = v_pick.current_pick THEN
        SELECT MIN(total_pick_number)
        INTO v_next_pick
        FROM picks
        WHERE draft_id = p_draft_id
          AND is_picked = false
          AND total_pick_number > v_pick.current_pick;

        IF v_next_pick IS NULL THEN
            v_next_pick := v_pick.total_picks + 1;
        END IF;

        UPDATE drafts
        SET current_pick = v_next_pick
        WHERE id = p_draft_id;
    END IF;

    SELECT total_picks, COUNT(*) FILTER (WHERE is_picked = true)
    INTO v_total_picks, v_picked_count
    FROM drafts d
    JOIN picks p ON d.id = p.draft_id
    WHERE d.id = p_draft_id
    GROUP BY d.id, d.total_picks;

    IF v_picked_count = v_total_picks THEN
        UPDATE drafts
        SET status = 'completed'
        WHERE id = p_draft_id;
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Pick submitted successfully'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'message', 'Failed to submit pick: ' || SQLERRM
        );
        RETURN v_result;
END;
$$;
