// ./lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { League, Team } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function ensureLeagueExists(leagueKey: string, leagueData: Partial<League>, teams: Team[]) {
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