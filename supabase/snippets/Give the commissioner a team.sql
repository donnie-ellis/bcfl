INSERT INTO public.team_members (team_id, user_id)
SELECT 5, id FROM public.profiles WHERE email = 'donnie@dmellis.com';