// ./lib/auth/authz.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';

type TypedClient = SupabaseClient<Database>;

export async function isCommissioner(supabase: TypedClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  return data.role === 'commissioner';
}

export async function ownsTeam(supabase: TypedClient, userId: string, teamId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}
