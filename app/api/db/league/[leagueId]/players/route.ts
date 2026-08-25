// ./app/api/db/league/[leagueId]/players/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const draftId = searchParams.get('draftId');
  const supabase = await createClient();

  try {
    // Supabase's PostgREST caps any unranged query at db.max_rows (1000),
    // silently truncating the players table (3200+ rows). Page through
    // with .range() so the full roster comes back regardless of size.
    const PAGE_SIZE = 1000;
    let players: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error } = await supabase
        .from('players')
        .select(`
          id,
          sleeper_id,
          full_name,
          first_name,
          last_name,
          team,
          position,
          fantasy_positions,
          status,
          injury_status,
          number,
          active,
          search_rank,
          headshot_url
        `)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      players.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    // If a draft ID is provided, fetch draft-specific information
    if (draftId) {
      const { data: draftPlayers, error: draftError } = await supabase
        .from('draft_players')
        .select('player_id, is_picked, average_pick, average_round, percent_drafted')
        .eq('draft_id', parseInt(draftId));

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
