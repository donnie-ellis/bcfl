-- import_jobs tracks progress for the Sleeper player import and the
-- fantasyfootballcalculator ADP import (lib/playersImport.ts, app/api/db/
-- draft/[draftId]/players/adp/route.ts, app/api/cron/updatePlayers). It was
-- missed by the 20260823180000_enable_rls.sql sweep. Bulk player imports run
-- through the service-role admin client (bypasses RLS); the only path that
-- writes as the calling user is the ADP route, which already gates on
-- isCommissioner() at the app layer -- so this mirrors the
-- leagues/league_settings/player_adp read-any/write-commissioner pattern.

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_jobs_select ON public.import_jobs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY import_jobs_write ON public.import_jobs FOR ALL
  TO authenticated USING (public.is_commissioner()) WITH CHECK (public.is_commissioner());

REVOKE ALL ON TABLE public.import_jobs FROM anon;
