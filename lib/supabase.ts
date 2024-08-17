// ./lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { League, Team } from '@/lib/types';
import { Database } from '@/lib/types/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function ensureLeagueExists(leagueKey: string, leagueData: Partial<League>, teams: Team[]) {
  // Convert leagueData to match the expected types
  const leagueInsert: Database['public']['Tables']['leagues']['Insert'] = {
    league_key: leagueKey,
    league_id: leagueData.league_id ?? '',
    name: leagueData.name ?? '',
    url: leagueData.url ?? null,
    logo_url: leagueData.logo_url ?? null,
    draft_status: leagueData.draft_status ?? null,
    num_teams: leagueData.num_teams ?? null,
    league_update_timestamp: leagueData.league_update_timestamp ? new Date(leagueData.league_update_timestamp).toISOString() : null,
    scoring_type: leagueData.scoring_type ?? null,
    current_week: leagueData.current_week ?? null,
    start_week: leagueData.start_week ?? null,
    end_week: leagueData.end_week ?? null,
    is_finished: leagueData.is_finished ?? null,
    league_type: leagueData.league_type ?? null,
    renew: leagueData.renew ?? null,
    renewed: leagueData.renewed ?? null,
    game_code: leagueData.game_code ?? null,
    is_cash_league: leagueData.is_cash_league ?? null,
    is_plus_league: leagueData.is_plus_league ?? null,
    is_pro_league: leagueData.is_pro_league ?? null,
    season: leagueData.season ?? null,
    start_date: leagueData.start_date ?? null,
    end_date: leagueData.end_date ?? null,
    weekly_deadline: leagueData.weekly_deadline ?? null,
    felo_tier: leagueData.felo_tier ? leagueData.felo_tier.toString() : null,
  };

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .upsert(leagueInsert, { 
      onConflict: 'league_key',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (leagueError) throw leagueError;

  // Ensure teams exist
  const teamUpserts: Database['public']['Tables']['teams']['Insert'][] = teams.map(team => ({
    team_key: team.team_key,
    league_id: leagueKey,
    name: team.name,
    team_id: team.team_id,
    url: team.url ?? null,
    team_logos: team.team_logos,
    waiver_priority: team.waiver_priority ? team.waiver_priority.toString() : null,
    number_of_moves: team.number_of_moves ?? null,
    number_of_trades: team.number_of_trades ?? null,
    league_scoring_type: team.league_scoring_type ?? null,
    has_draft_grade: team.has_draft_grade ?? null,
    faab_balance: team.faab_balance ? team.faab_balance.toString() : null,
    created_at: null,
    updated_at: null,
    draft_position: null,
    roster_adds: null,
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