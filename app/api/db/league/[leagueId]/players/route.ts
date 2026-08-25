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
    // Fetch page 1 with an exact count, then fire the remaining pages in
    // parallel instead of awaiting them one at a time.
    const PAGE_SIZE = 1000;
    const selectQuery = `
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
        `;

    const { data: firstPage, count, error: firstError } = await supabase
      .from('players')
      .select(selectQuery, { count: 'exact' })
      .order('id', { ascending: true })
      .range(0, PAGE_SIZE - 1);

    if (firstError) throw firstError;

    const totalPages = Math.ceil((count ?? firstPage.length) / PAGE_SIZE);
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => {
        const from = (i + 1) * PAGE_SIZE;
        return supabase
          .from('players')
          .select(selectQuery)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
      })
    );

    let players: any[] = [...firstPage];
    for (const page of remainingPages) {
      if (page.error) throw page.error;
      players.push(...(page.data ?? []));
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
