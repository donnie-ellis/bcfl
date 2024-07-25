// ./lib/supabase.ts
import { getServerSupabaseClient } from './serverSupabaseClient';
import { League, Team } from '@/lib/types';

export async function ensureLeagueExists(leagueKey: string, leagueData: Partial<League>, teams: Team[]) {
  const supabase = getServerSupabaseClient();
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .upsert({ 
      league_key: leagueKey,
      ...leagueData
    }, { 
      onConflict: 'league_key',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (leagueError) throw leagueError;

  // Ensure teams exist
  const teamUpserts = teams.map(team => ({
    team_key: team.team_key,
    league_id: leagueKey,
    name: team.name,
    team_id: team.team_id,
    // Add other team properties as needed
  }));

  const { error: teamsError } = await supabase
    .from('teams')
    .upsert(teamUpserts, {
      onConflict: 'team_key',
      ignoreDuplicates: false
    });

  if (teamsError) throw teamsError;

  return league;
}