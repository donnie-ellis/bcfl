-- These objects were built for an in-app draft countdown timer feature from
-- an earlier iteration of the app (2025-08-22/23), before the Yahoo removal
-- rebuild. The feature's migrations were later deleted from the repo without
-- being reverted on the remote database, leaving these tables/functions/view
-- live but unreferenced by any code on main (verified via grep across
-- app/lib/components and cross-checking pg_proc source for internal calls).
-- begin_transaction/commit_transaction/rollback_transaction were manual
-- transaction-control helpers written only for submit_draft_pick_with_timing.
-- This also left a same-era overload of create_draft_with_picks (text
-- p_league_id, plus p_use_timer/p_pick_seconds) that PostgREST can no
-- longer disambiguate from the current bigint 7-arg version, causing
-- "Could not choose the best candidate function" on every draft creation.

DROP VIEW IF EXISTS public.latest_draft_timer_state;

DROP FUNCTION IF EXISTS public.create_draft_with_picks(text, text, integer, integer, jsonb, text, jsonb, boolean, integer);

DROP FUNCTION IF EXISTS public.get_current_timer_state(integer);
DROP FUNCTION IF EXISTS public.record_pick_timing();
DROP FUNCTION IF EXISTS public.submit_draft_pick_with_timing(integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.begin_transaction();
DROP FUNCTION IF EXISTS public.commit_transaction();
DROP FUNCTION IF EXISTS public.rollback_transaction();
DROP FUNCTION IF EXISTS public.remove_current_pick_column();

DROP TABLE IF EXISTS public.draft_timer_events;
