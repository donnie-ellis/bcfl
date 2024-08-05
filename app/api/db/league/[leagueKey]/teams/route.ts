// ./app/api/db/league/[leagueKey]/teams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Team } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

function prepareTeamForUpsert(team: Team, leagueId: string) {
  return {
    league_id: leagueId,
    team_key: team.team_key,
    team_id: team.team_id,
    name: team.name,
    url: team.url,
    team_logos: team.team_logos,
    waiver_priority: team.waiver_priority ? parseInt(team.waiver_priority) : null,
    number_of_moves: team.number_of_moves,
    number_of_trades: team.number_of_trades,
    league_scoring_type: team.league_scoring_type,
    has_draft_grade: team.has_draft_grade,
    faab_balance: team.faab_balance,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueKey)

    if (error) throw error;


    return NextResponse.json(data as Team[]);
  } catch (error) {
    console.error('Error fetching league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;
  const teams: Team[] = await request.json();

  try {
    const teamsForUpsert = teams.map(team => prepareTeamForUpsert(team, leagueKey));
    const { data, error } = await supabase
      .from('teams')
      .upsert(teamsForUpsert, {
        onConflict: 'team_key',
        ignoreDuplicates: false
      });

    if (error) throw error;

    return NextResponse.json({ message: 'Teams upserted successfully', data });
  } catch (error) {
    console.error('Error upserting teams:', error);
    return NextResponse.json({ error: 'Failed to upsert teams' }, { status: 500 });
  }
}
