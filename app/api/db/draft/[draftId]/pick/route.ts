// ./app/api/db/draft/[draftId]/pick/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner, ownsTeam } from '@/lib/auth/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const supabase = await createClient();

  try {
    // Fetch the current pick for the draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('current_pick')
      .eq('id', parseInt(draftId))
      .single();

    if (draftError) throw draftError;

    const { data: currentPick, error: pickError } = await supabase
      .from('picks')
      .select(`*`)
      .eq('draft_id', parseInt(draftId))
      .eq('total_pick_number', draft.current_pick as number)
      .single();

    if (pickError) throw pickError;

    return NextResponse.json(currentPick, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching current pick:', error);
    return NextResponse.json({ error: 'Failed to fetch current pick' }, { status: 500 });
  }
}


// POST
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { pickId, playerId } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch the pick and its team
    const { data: pick, error: pickError } = await supabase
      .from('picks')
      .select('id, team_id')
      .eq('id', pickId)
      .single();

    if (pickError) throw pickError;

    // Check if the user is authorized to make this pick: either they own
    // the team on the clock, or they're the commissioner.
    const isAuthorized =
      (await ownsTeam(supabase, user.id, pick.team_id)) ||
      (await isCommissioner(supabase, user.id));

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized to make this pick' }, { status: 403 });
    }

    // Call the submit_draft_pick function
    const { error } = await supabase.rpc('submit_draft_pick', {
      p_draft_id: parseInt(draftId),
      p_pick_id: pickId,
      p_player_id: playerId,
      p_picked_by: user.id
    });

    if (error) throw error;

    // Fetch the updated pick data
    const { data: updatedPick, error: updatedPickError } = await supabase
      .from('picks')
      .select(`
        *,
        player:players(*),
        team:teams(*)
      `)
      .eq('id', pickId)
      .single();

    if (updatedPickError) throw updatedPickError;

    // Return the updated pick data
    return NextResponse.json({
      message: 'Pick submitted successfully',
      pick: updatedPick
    });

  } catch (error) {
    console.error('Error submitting pick:', error);
    return NextResponse.json({ error: 'Failed to submit pick', details: error }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { pickId } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if the user is a commissioner
    if (!(await isCommissioner(supabase, user.id))) {
      return NextResponse.json({ error: 'Unauthorized to clear this pick' }, { status: 403 });
    }

    // Fetch the pick to be cleared
    const { data: pick, error: pickError } = await supabase
      .from('picks')
      .select('player_id')
      .eq('id', pickId)
      .eq('draft_id', parseInt(draftId))
      .single();

    if (pickError) throw pickError;

    // Clear the pick
    const { error: clearPickError } = await supabase
      .from('picks')
      .update({ player_id: null, is_picked: false, picked_by: null, is_keeper: false })
      .eq('id', pickId)
      .eq('draft_id', parseInt(draftId));

    if (clearPickError) throw clearPickError;

    // Update the draft_players table if there was a player associated with the pick
    if (pick.player_id) {
      const { error: draftPlayerError } = await supabase
        .from('draft_players')
        .update({ is_picked: false })
        .eq('draft_id', parseInt(draftId))
        .eq('player_id', pick.player_id);

      if (draftPlayerError) throw draftPlayerError;
    }

    return NextResponse.json({ message: 'Pick cleared successfully' });
  } catch (error) {
    console.error('Error clearing pick:', error);
    return NextResponse.json({ error: 'Failed to clear pick', details: error }, { status: 500 });
  }
}
