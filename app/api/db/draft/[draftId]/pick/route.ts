// ./app/api/db/draft/[draftId]/pick/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';
import { getServerAuthSession } from "@/auth";

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
      .select(`*`)
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


// POST
export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const supabase = getServerSupabaseClient();
  const { draftId } = params;
  const { pickId, playerId } = await request.json();

  // Get the current user's session
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userGuid = session.user.id;

  try {
    // Fetch the pick and related team information
    const { data: pick, error: pickError } = await supabase
      .from('picks')
      .select(`
        id,
        team_key,
        drafts!picks_draft_id_fkey (
          league_id
        )
      `)
      .eq('id', pickId)
      .single();

    if (pickError) throw pickError;

    // Check if the user is authorized to make this pick
    const isAuthorized = await checkUserAuthorization(supabase, userGuid, pick.team_key, pick.drafts.league_id);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized to make this pick' }, { status: 403 });
    }

    // Call the submit_draft_pick function
    const { data, error } = await supabase.rpc('submit_draft_pick', {
      p_draft_id: parseInt(draftId),
      p_pick_id: pickId,
      p_player_id: playerId,
      p_picked_by: userGuid
    });

    if (error) throw error;

    if (!data.success) {
      return NextResponse.json({ error: data.message }, { status: 500 });
    }

    return NextResponse.json({ message: data.message });
  } catch (error) {
    console.error('Error submitting pick:', error);
    return NextResponse.json({ error: 'Failed to submit pick', details: error }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const supabase = getServerSupabaseClient();
  const { draftId } = params;
  const { pickId } = await request.json();

  // Get the current user's session
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userGuid = session.user.id;

  try {
    // Fetch the draft and league information
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('league_id')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    // Check if the user is a commissioner
    const isCommissioner = await checkCommissionerStatus(supabase, userGuid, draft.league_id);
    if (!isCommissioner) {
      return NextResponse.json({ error: 'Unauthorized to delete this pick' }, { status: 403 });
    }

    // Fetch the pick to be deleted
    const { data: pick, error: pickError } = await supabase
      .from('picks')
      .select('player_id')
      .eq('id', pickId)
      .eq('draft_id', draftId)
      .single();

    if (pickError) throw pickError;

    // Start a transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) throw transactionError;

    try {
      // Clear the pick
      const { error: clearPickError } = await supabase
        .from('picks')
        .update({ player_id: null, is_picked: false, picked_by: null })
        .eq('id', pickId)
        .eq('draft_id', draftId);

      if (clearPickError) throw clearPickError;

      // Update the draft_players table
      if (pick.player_id) {
        const { error: draftPlayerError } = await supabase
          .from('draft_players')
          .update({ is_picked: false })
          .eq('draft_id', draftId)
          .eq('player_id', pick.player_id);

        if (draftPlayerError) throw draftPlayerError;
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;

      return NextResponse.json({ message: 'Pick deleted successfully' });
    } catch (error) {
      // Rollback the transaction if any error occurs
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting pick:', error);
    return NextResponse.json({ error: 'Failed to delete pick', details: error }, { status: 500 });
  }
}

async function checkUserAuthorization(supabase, userGuid: string, teamKey: string, leagueKey: string): Promise<boolean> {
  // Check if the user is the team owner
  const { data: teamOwner, error: teamError } = await supabase
    .from('manager_team_league')
    .select('manager_guid')
    .eq('team_key', teamKey)
    .eq('league_key', leagueKey)
    .single();

  if (teamError) {
    console.error('Error checking team ownership:', teamError);
    return false;
  }

  if (teamOwner && teamOwner.manager_guid === userGuid) {
    return true;
  }

  // Check if the user is a commissioner
  return await checkCommissionerStatus(supabase, userGuid, leagueKey);
}

async function checkCommissionerStatus(supabase, userGuid: string, leagueKey: string): Promise<boolean> {
  const { data: manager, error } = await supabase
    .from('managers')
    .select('is_commissioner')
    .eq('guid', userGuid)
    .contains('league_keys', [leagueKey])
    .single();

  if (error) {
    console.error('Error checking commissioner status:', error);
    return false;
  }

  return manager?.is_commissioner || false;
}