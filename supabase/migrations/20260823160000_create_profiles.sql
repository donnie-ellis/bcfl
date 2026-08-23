-- Supabase Auth replaces NextAuth/Yahoo identity. This table carries the
-- app-level profile (role, display info) keyed on auth.users, populated
-- automatically whenever a new auth user is created (magic-link sign-in or
-- commissioner invite both go through auth.users insert).

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    role text NOT NULL DEFAULT 'manager' CHECK (role IN ('commissioner', 'manager')),
    invited_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'App-level profile for each Supabase Auth user: role (commissioner/manager) and display info.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url, invited_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'display_name',
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.invited_at
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
