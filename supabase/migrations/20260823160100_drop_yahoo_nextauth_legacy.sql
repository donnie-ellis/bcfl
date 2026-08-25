-- Drop the Yahoo/NextAuth-era identity tables. `public.users`/`public.sessions`
-- were a hand-rolled NextAuth token store, superseded by Supabase Auth's own
-- auth.users + public.profiles. `managers`/`manager_team_league` were the
-- Yahoo-GUID-based identity-linking layer, superseded by public.team_members
-- (added in the next migration). `player_import_history` was a Yahoo
-- league-keyed audit table with no equivalent needed for a global Sleeper
-- import.

DROP TRIGGER IF EXISTS manager_team_league_update ON public.manager_team_league;
DROP FUNCTION IF EXISTS public.update_manager_keys();

DROP TABLE IF EXISTS public.manager_team_league;
DROP TABLE IF EXISTS public.managers;
DROP TABLE IF EXISTS public.player_import_history;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.users;
