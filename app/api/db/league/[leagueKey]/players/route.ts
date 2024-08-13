// ./app/api/db/league/[leagueKey]/players/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;
  const { searchParams } = new URL(request.url);
  const draftId = searchParams.get('draftId');

  try {
    // Fetch players from the database
    let { data: players, error } = await supabase
      .from('players')
      .select(`
        id,
        player_key,
        player_id,
        full_name,
        first_name,
        last_name,
        editorial_team_abbr,
        display_position,
        position_type,
        eligible_positions,
        status,
        editorial_player_key,
        editorial_team_key,
        editorial_team_full_name,
        bye_weeks,
        uniform_number,
        image_url,
        is_undroppable,
        headshot_url
      `);

    if (error) throw error;
    if (!players) throw Error('No players returned');

    // If a draft ID is provided, fetch draft-specific information
    if (draftId) {
      const { data: draftPlayers, error: draftError } = await supabase
        .from('draft_players')
        .select('player_id, is_picked, average_pick, average_round, percent_drafted')
        .eq('draft_id', draftId);

      if (draftError) throw draftError;

      // Create a map for quick lookup
      const draftPlayersMap = new Map(draftPlayers.map(dp => [dp.player_id, dp]));

      // Merge draft information with player information
      players = players.map(player => {
        const draftInfo = draftPlayersMap.get(player.id);
        return {
          ...player,
          is_drafted: draftInfo ? draftInfo.is_picked : false,
          average_draft_position: draftInfo ? draftInfo.average_pick : null,
          average_round: draftInfo ? draftInfo.average_round : null,
          percent_drafted: draftInfo ? draftInfo.percent_drafted : null,
        };
      });
    }

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}