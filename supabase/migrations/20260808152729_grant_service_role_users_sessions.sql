-- The initial users/sessions migration never granted table privileges.
-- service_role bypasses RLS but still needs its own GRANTs, so NextAuth's
-- server-side callbacks (auth.ts, lib/yahoo.ts) were failing with
-- "permission denied for table users" / "sessions".
-- anon/authenticated are intentionally excluded: sessions stores Yahoo
-- access/refresh tokens and must only ever be touched by trusted server code.
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.sessions TO service_role;
