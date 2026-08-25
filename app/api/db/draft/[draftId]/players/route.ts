// ./app/api/db/draft/[draftId]/players/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }>}
) {
  const { draftId } = await params;
  const supabase = await createClient();

  try {
    // Supabase's PostgREST caps any unranged query at db.max_rows (1000),
    // silently truncating the players table (3200+ rows). Page through
    // with .range() so the full roster comes back regardless of size.
    // Fetch page 1 with an exact count, then fire the remaining pages in
    // parallel instead of awaiting them one at a time.
    const PAGE_SIZE = 1000;
    const selectQuery = `
          *,
          player_adp:player_adp(adp, adp_formatted, source_id, draft_id),
          draft_players:draft_players(is_picked, percent_drafted)
        `;

    const { data: firstPage, count, error: firstError } = await supabase
      .from('players')
      .select(selectQuery, { count: 'exact' })
      .eq('player_adp.draft_id', parseInt(draftId))
      .eq('draft_players.draft_id', parseInt(draftId))
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
          .eq('player_adp.draft_id', parseInt(draftId))
          .eq('draft_players.draft_id', parseInt(draftId))
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
      })
    );

    const data: any[] = [...firstPage];
    for (const page of remainingPages) {
      if (page.error) throw page.error;
      data.push(...(page.data ?? []));
    }

    // Transform the data to match the expected format
    const players = data.map(player => ({
      ...player,
      adp: player.player_adp?.[0]?.adp || null,
      adp_formatted: player.player_adp?.[0]?.adp_formatted || null,
      source_id: player.player_adp?.[0]?.source_id || null,
      draft_id: player.player_adp?.[0]?.draft_id || null,
      is_picked: player.draft_players?.[0]?.is_picked || false,
      percent_drafted: player.draft_players?.[0]?.percent_drafted || null,
    }));

    return NextResponse.json(players, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}