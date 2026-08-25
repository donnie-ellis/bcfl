-- Rebuild the league/team/player schema around Supabase Auth identity, a
-- single commissioner-configured league, and Sleeper-sourced player data.
-- All existing Yahoo-era league/team/player/draft data is wiped (confirmed
-- acceptable: player IDs cannot map from Yahoo to Sleeper and the
-- league/team keys are being restructured from Yahoo strings to surrogate
-- ids).

-- ============================================================
-- 0. Wipe data in tables that are being restructured in place
-- ============================================================
TRUNCATE TABLE public.drafts, public.draft_players, public.player_adp CASCADE;

-- ============================================================
-- 1. Drop objects that hard-depend on the tables being rebuilt
-- ============================================================
DROP VIEW IF EXISTS public.players_with_adp;
DROP FUNCTION IF EXISTS public.get_player_with_adp(integer);
DROP FUNCTION IF EXISTS public.get_player_with_adp(integer, integer);

DROP TABLE IF EXISTS public.picks;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.league_settings;

ALTER TABLE public.drafts DROP COLUMN IF EXISTS league_id CASCADE;

DROP TABLE IF EXISTS public.leagues;

-- players is rebuilt in place; CASCADE drops the two FKs that reference it
-- (draft_players.player_id, player_adp.player_id) without touching those
-- tables themselves. Both FKs are re-added below once the new players
-- table exists.
DROP TABLE IF EXISTS public.players CASCADE;

-- ============================================================
-- 2. players (rewritten to Sleeper's shape)
-- ============================================================
CREATE TABLE public.players (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sleeper_id text NOT NULL UNIQUE,
    first_name text,
    last_name text,
    full_name text,
    position text,
    fantasy_positions text[],
    team text,
    status text,
    injury_status text,
    number integer,
    age integer,
    years_exp integer,
    college text,
    height text,
    weight text,
    active boolean,
    search_rank integer,
    headshot_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.players IS 'NFL players sourced from Sleeper''s public player list (https://api.sleeper.app/v1/players/nfl).';

CREATE INDEX idx_players_full_name ON public.players (full_name);
CREATE INDEX idx_players_position ON public.players (position);
CREATE INDEX idx_players_team ON public.players (team);
CREATE INDEX idx_players_search_rank ON public.players (search_rank);

CREATE TRIGGER update_players_modtime
    BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

ALTER TABLE public.draft_players
    ADD CONSTRAINT draft_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
ALTER TABLE public.player_adp
    ADD CONSTRAINT player_adp_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);

-- ============================================================
-- 3. leagues (singleton, commissioner-configured)
-- ============================================================
CREATE TABLE public.leagues (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    logo_url text,
    season integer,
    num_teams integer,
    current_week integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leagues IS 'Singleton: this app models exactly one league, configured directly by the commissioner.';

CREATE OR REPLACE FUNCTION public.enforce_single_league()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (SELECT count(*) FROM public.leagues) > 0 THEN
        RAISE EXCEPTION 'Only one league is allowed';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_league_trigger
    BEFORE INSERT ON public.leagues
    FOR EACH ROW EXECUTE FUNCTION public.enforce_single_league();

CREATE TRIGGER update_leagues_modtime
    BEFORE UPDATE ON public.leagues
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

INSERT INTO public.leagues (name) VALUES ('My League');

-- ============================================================
-- 4. league_settings (same shape as before, repointed to leagues.id)
-- ============================================================
CREATE TABLE public.league_settings (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    league_id bigint NOT NULL UNIQUE REFERENCES public.leagues(id) ON DELETE CASCADE,
    draft_type character varying(50),
    is_auction_draft boolean,
    scoring_type character varying(50),
    persistent_url text,
    uses_playoff boolean,
    has_playoff_consolation_games boolean,
    playoff_start_week integer,
    uses_playoff_reseeding boolean,
    uses_lock_eliminated_teams boolean,
    num_playoff_teams integer,
    num_playoff_consolation_teams integer,
    waiver_type character varying(50),
    waiver_rule character varying(50),
    uses_faab boolean,
    draft_time timestamp without time zone,
    draft_pick_time integer,
    post_draft_players character varying(50),
    max_teams integer,
    waiver_time integer,
    trade_end_date date,
    trade_ratify_type character varying(50),
    trade_reject_time integer,
    player_pool character varying(50),
    cant_cut_list character varying(50),
    roster_positions jsonb,
    stat_categories jsonb,
    uses_fractional_points boolean,
    uses_negative_points boolean,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.league_settings IS 'Commissioner-entered scoring/roster/playoff/waiver configuration for the single league.';

CREATE TRIGGER update_league_settings_modtime
    BEFORE UPDATE ON public.league_settings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- 5. teams (commissioner-managed, no more Yahoo season-sync columns)
-- ============================================================
CREATE TABLE public.teams (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    league_id bigint NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    name text NOT NULL,
    logo_url text,
    draft_position integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_league_id ON public.teams (league_id);

CREATE TRIGGER update_teams_modtime
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- 6. team_members (the auth.uid() <-> team link, replaces
--    managers/manager_team_league)
-- ============================================================
CREATE TABLE public.team_members (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id bigint NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'co_owner')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, team_id)
);

COMMENT ON TABLE public.team_members IS 'Links a Supabase Auth user to the team they manage.';

CREATE UNIQUE INDEX one_owner_per_team ON public.team_members (team_id) WHERE role = 'owner';
CREATE INDEX idx_team_members_user_id ON public.team_members (user_id);

-- ============================================================
-- 7. drafts (repoint league_id from Yahoo string to leagues.id)
-- ============================================================
ALTER TABLE public.drafts
    ADD COLUMN league_id bigint REFERENCES public.leagues(id) ON DELETE CASCADE;
ALTER TABLE public.drafts
    ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE public.drafts
    ADD CONSTRAINT unique_league_draft UNIQUE (league_id, name);
CREATE INDEX idx_drafts_league_id ON public.drafts (league_id);

-- ============================================================
-- 8. picks (repoint team_key -> team_id, picked_by -> uuid, add the
--    primary key that was dropped in 20240816212518 and never restored)
-- ============================================================
CREATE TABLE public.picks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    draft_id integer NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
    team_id bigint NOT NULL REFERENCES public.teams(id),
    player_id integer REFERENCES public.players(id),
    pick_number integer NOT NULL,
    round_number integer NOT NULL,
    total_pick_number integer NOT NULL,
    is_keeper boolean DEFAULT false,
    is_picked boolean DEFAULT false,
    picked_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (draft_id, pick_number, round_number),
    UNIQUE (draft_id, player_id),
    UNIQUE (draft_id, total_pick_number)
);

COMMENT ON COLUMN public.picks.picked_by IS 'The auth.users id of whoever made the pick (team owner or commissioner).';

CREATE INDEX idx_picks_draft_id ON public.picks (draft_id);
CREATE INDEX idx_picks_player_id ON public.picks (player_id);
CREATE INDEX idx_picks_team_id ON public.picks (team_id);

ALTER TABLE public.picks REPLICA IDENTITY FULL;

CREATE TRIGGER update_picks_modtime
    BEFORE UPDATE ON public.picks
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.picks;

-- ============================================================
-- 9. players_with_adp view, remapped to the new players columns
-- ============================================================
CREATE VIEW public.players_with_adp AS
SELECT
    p.id,
    p.sleeper_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.team,
    p.position,
    p.fantasy_positions,
    p.status,
    p.injury_status,
    p.number,
    p.headshot_url,
    pa.adp,
    pa.adp_formatted,
    pa.source_id,
    pa.draft_id,
    COALESCE(dp.is_picked, false) AS is_picked,
    dp.percent_drafted
FROM public.players p
LEFT JOIN public.player_adp pa ON p.id = pa.player_id
LEFT JOIN public.draft_players dp ON p.id = dp.player_id AND dp.draft_id = pa.draft_id;

-- ============================================================
-- 10. RPC signature updates
-- ============================================================
DROP FUNCTION IF EXISTS public.create_draft_with_picks(text, text, integer, integer, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_draft_with_picks(
    p_league_id bigint,
    p_name text,
    p_rounds integer,
    p_total_picks integer,
    p_draft_order jsonb,
    p_status text,
    p_ordered_teams jsonb
) RETURNS TABLE(created_draft_id integer, debug_info text) AS $$
DECLARE
    v_draft_id INTEGER;
    v_num_teams INTEGER;
    v_total_pick INTEGER;
    v_debug TEXT := '';
BEGIN
    v_debug := v_debug || 'Starting function. ';

    INSERT INTO drafts (league_id, name, rounds, total_picks, draft_order, status, current_pick)
    VALUES (p_league_id, p_name, p_rounds, p_total_picks, p_draft_order, p_status, 1)
    ON CONFLICT (league_id, name)
    DO UPDATE SET
        rounds = EXCLUDED.rounds,
        total_picks = EXCLUDED.total_picks,
        draft_order = EXCLUDED.draft_order,
        status = EXCLUDED.status,
        current_pick = 1
    RETURNING id INTO v_draft_id;

    v_debug := v_debug || 'Draft ID: ' || v_draft_id || '. ';

    IF v_draft_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create or update draft';
    END IF;

    v_num_teams := jsonb_array_length(p_ordered_teams);

    v_debug := v_debug || 'Inserting new picks. ';
    INSERT INTO picks (draft_id, team_id, pick_number, round_number, total_pick_number)
    SELECT
        v_draft_id,
        ((p_ordered_teams->
            CASE
                WHEN (gs_round.round % 2 = 0) THEN (v_num_teams - gs_pick.pick)::int
                ELSE (gs_pick.pick - 1)::int
            END
        )::jsonb->>'team_id')::bigint,
        gs_pick.pick,
        gs_round.round,
        ((gs_round.round - 1) * v_num_teams) + gs_pick.pick
    FROM
        generate_series(1, p_rounds) AS gs_round(round),
        generate_series(1, v_num_teams) AS gs_pick(pick)
    ON CONFLICT (draft_id, total_pick_number) DO UPDATE SET
        team_id = EXCLUDED.team_id,
        pick_number = EXCLUDED.pick_number,
        round_number = EXCLUDED.round_number;

    GET DIAGNOSTICS v_total_pick = ROW_COUNT;
    v_debug := v_debug || 'Inserted or updated ' || v_total_pick || ' picks. ';

    IF v_total_pick = 0 THEN
        RAISE EXCEPTION 'No picks were inserted or updated';
    END IF;

    v_debug := v_debug || 'Function completed successfully. ';

    RETURN QUERY SELECT v_draft_id, v_debug;
EXCEPTION WHEN OTHERS THEN
    v_debug := v_debug || 'Error: ' || SQLERRM || '. ';
    RAISE EXCEPTION 'Error in create_draft_with_picks: %', v_debug;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_draft_with_picks(bigint, text, integer, integer, jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_draft_with_picks(bigint, text, integer, integer, jsonb, text, jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.submit_draft_pick(integer, integer, integer, text);

CREATE OR REPLACE FUNCTION public.submit_draft_pick(
    p_draft_id integer,
    p_pick_id integer,
    p_player_id integer,
    p_picked_by uuid
) RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.submit_draft_pick(integer, integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_draft_pick(integer, integer, integer, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_draft(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_draft(integer) TO service_role;

-- ============================================================
-- 11. Table grants. No Yahoo-era anon access carries forward — every
--     page in the app requires a signed-in Supabase Auth user, so `anon`
--     gets nothing. RLS policies (added once the app is verified working
--     end-to-end) further restrict what `authenticated` can do per row.
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leagues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.picks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.draft_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_adp TO authenticated;
GRANT SELECT ON public.players TO authenticated;
GRANT SELECT ON public.players_with_adp TO authenticated;

GRANT ALL ON public.leagues TO service_role;
GRANT ALL ON public.league_settings TO service_role;
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.team_members TO service_role;
GRANT ALL ON public.drafts TO service_role;
GRANT ALL ON public.picks TO service_role;
GRANT ALL ON public.draft_players TO service_role;
GRANT ALL ON public.player_adp TO service_role;
GRANT ALL ON public.players TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
