// ./app/api/db/draft/[draftId]/pick/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const supabase = getServerSupabaseClient();
  const { draftId } = params;

  try {
    // Fetch the current pick for the draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('current_pick')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    const { data: currentPick, error: pickError } = await supabase
      .from('picks')
      .select(`
        id,
        draft_id,
        player_id,
        pick_number,
        round_number,
        total_pick_number,
        is_keeper,
        is_picked,
        team_key,
        teams (name)
      `)
      .eq('draft_id', draftId)
      .eq('total_pick_number', draft.current_pick)
      .single();

    if (pickError) throw pickError;

    return NextResponse.json(currentPick);
  } catch (error) {
    console.error('Error fetching current pick:', error);
    return NextResponse.json({ error: 'Failed to fetch current pick' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const supabase = getServerSupabaseClient();
  const { draftId } = params;
  const { pickId, playerId } = await request.json();

  try {
    // Start a transaction
    const { data, error } = await supabase.rpc('submit_draft_pick', {
      p_draft_id: draftId,
      p_pick_id: pickId,
      p_player_id: playerId
    });

    if (error) throw error;

    return NextResponse.json({ message: 'Pick submitted successfully' });
  } catch (error) {
    console.error('Error submitting pick:', error);
    return NextResponse.json({ error: 'Failed to submit pick' }, { status: 500 });
  }
}