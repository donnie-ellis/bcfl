// ./app/api/draft/[draftId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

const supabase = getServerSupabaseClient();

export async function GET(request: NextRequest, { params }: { params: { draftId: string } }) {
  const draftId = params.draftId;

  try {
    // Fetch draft data
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*, teams(*)')
      .eq('id', parseInt(draftId))
      .single();

    if (draftError) throw draftError;

    if (draft.current_pick === null) throw new Error('Draft has not started yet');
    
    // Fetch current pick
    const { data: currentPick, error: pickError } = await supabase
      .from('picks')
      .select('*, teams(*)')
      .eq('draft_id', parseInt(draftId))
      .eq('total_pick_number', draft.current_pick)
      .single();

    if (pickError) throw pickError;

    // Fetch next pick
    const { data: nextPick, error: nextPickError } = await supabase
      .from('picks')
      .select('*, teams(*)')
      .eq('draft_id', parseInt(draftId))
      .eq('total_pick_number', draft.current_pick + 1)
      .single();

    if (nextPickError) throw nextPickError;

    // Calculate picks until next turn
    const { data: userPicks, error: userPicksError } = await supabase
      .from('picks')
      .select('total_pick_number')
      .eq('draft_id', parseInt(draftId))
      .eq('team_key', request.headers.get('X-Team-Key') || '')
      .gte('total_pick_number', draft.current_pick)
      .order('total_pick_number', { ascending: true })
      .limit(1);

    if (userPicksError) throw userPicksError;

    const picksUntilNextTurn = userPicks.length > 0 
      ? userPicks[0].total_pick_number - draft.current_pick
      : null;

    return NextResponse.json({
      currentDrafter: currentPick?.teams?.name,
      nextDrafter: nextPick?.teams?.name,
      picksUntilNextTurn
    });
  } catch (error) {
    console.error('Error fetching draft status:', error);
    return NextResponse.json({ error: 'Failed to fetch draft status' }, { status: 500 });
  }
}