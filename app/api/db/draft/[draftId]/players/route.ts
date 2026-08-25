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
    const PAGE_SIZE = 1000;
    const data: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error } = await supabase
        .from('players')
        .select(`
          *,
          player_adp:player_adp(adp, adp_formatted, source_id, draft_id),
          draft_players:draft_players(is_picked, percent_drafted)
        `)
        .eq('player_adp.draft_id', parseInt(draftId))
        .eq('draft_players.draft_id', parseInt(draftId))
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      data.push(...page);
      if (page.length < PAGE_SIZE) break;
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