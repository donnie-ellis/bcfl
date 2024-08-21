// ./app/api/db/draft/[draftId]/players/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;

  try {
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        player_adp:player_adp(adp, adp_formatted, source_id, draft_id),
        draft_players:draft_players(is_picked, percent_drafted)
      `)
      .eq('player_adp.draft_id', draftId)
      .eq('draft_players.draft_id', draftId);

    if (error) throw error;

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