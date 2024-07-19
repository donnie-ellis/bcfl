// ./app/api/yahoo/createDraft/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo, parseTeamData } from '@/lib/yahoo';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers, getJobStatus } from '@/lib/playersImport';
import { League, Team } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  const { leagueKey, draftName, orderedTeams } = await request.json();

  try {
    // Fetch league data from Yahoo
    const leagueData = await requestYahoo(`league/${leagueKey}`);
    const league = leagueData.fantasy_content.league[0] as League;

    // Upsert league data
    const { data: upsertedLeague, error: leagueError } = await supabase
      .from('leagues')
      .upsert({
        league_key: league.league_key,
        league_id: league.league_id,
        name: league.name,
        url: league.url,
        logo_url: league.logo_url,
        draft_status: league.draft_status,
        num_teams: league.num_teams,
        weekly_deadline: league.weekly_deadline,
        league_update_timestamp: league.league_update_timestamp,
        scoring_type: league.scoring_type,
        league_type: league.league_type,
        renew: league.renew,
        renewed: league.renewed,
        short_invitation_url: league.short_invitation_url,
        is_pro_league: league.is_pro_league,
        is_cash_league: league.is_cash_league,
        current_week: league.current_week,
        start_week: league.start_week,
        start_date: league.start_date,
        end_week: league.end_week,
        end_date: league.end_date,
        game_code: league.game_code,
        season: league.season
      }, { onConflict: 'league_key' })
      .select()
      .single();

    if (leagueError) {
      console.error('Error upserting league:', leagueError);
      throw leagueError;
    }

    // Fetch league settings to get the roster positions
    const settingsData = await requestYahoo(`league/${leagueKey}/settings`);
    const rosterPositions = settingsData.fantasy_content.league[1].settings[0].roster_positions;

    // Calculate total roster spots, excluding IR spots
    const rounds = Object.values(rosterPositions).reduce((total, positionData: any) => {
      if (positionData.roster_position && positionData.roster_position.position !== 'IR') {
        return total + parseInt(positionData.roster_position.count, 10);
      }
      return total;
    }, 0);

    const totalPicks = rounds * orderedTeams.length;

    // Ensure orderedTeams is an array of objects with team_key properties
    const draftOrder = orderedTeams.map(teamKey => ({ team_key: teamKey }));

    // Call the createDraft function
    const { data, error } = await supabase
      .rpc('create_draft_with_picks', {
        p_league_id: leagueKey,
        p_name: draftName,
        p_rounds: rounds,
        p_total_picks: totalPicks,
        p_draft_order: JSON.stringify(draftOrder),
        p_status: 'pending',
        p_ordered_teams: draftOrder
      });

    if (error) {
      console.error('Supabase RPC error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No draft ID returned from createDraft function');
    }

    const draftId = data[0];

    // Start the player import process
    const importJobId = uuidv4();
    importPlayers(leagueKey, importJobId).catch(console.error); // Run in background

    return NextResponse.json({ draftId, importJobId });
  } catch (error) {
    console.error('Failed to create draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const jobStatus = await getJobStatus(jobId);
  if (!jobStatus) {
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }

  return NextResponse.json(jobStatus);
}