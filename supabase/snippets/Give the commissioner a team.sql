INSERT INTO public.team_members (team_id, user_id)
SELECT 1, id FROM public.profiles WHERE email = 'donnie@dmellis.com';