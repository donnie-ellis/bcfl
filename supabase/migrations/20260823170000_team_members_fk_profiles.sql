-- PostgREST can only embed related rows across an actual foreign key. The
-- teams API needs to embed each team_member's profile (display_name/email/
-- avatar_url), but team_members.user_id pointed at auth.users, which has no
-- FK path to public.profiles for PostgREST to discover. Repoint it at
-- profiles(id) instead -- every auth.users row already gets a profiles row
-- via handle_new_user(), so this preserves the same integrity guarantee.

ALTER TABLE public.team_members
    DROP CONSTRAINT team_members_user_id_fkey;

ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
