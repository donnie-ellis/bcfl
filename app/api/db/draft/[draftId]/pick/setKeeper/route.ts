import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';
import { getServerAuthSession } from "@/auth";
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const supabase = getServerSupabaseClient();
  const { draftId } = params;
  const { pickId, isKeeper } = await request.json();

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
    const isCommissioner = await checkCommissionerStatus(supabase, userGuid, draft.league_id as string);
    if (!isCommissioner) {
      return NextResponse.json({ error: 'Unauthorized to change keeper status' }, { status: 403 });
    }

    // Update the pick's keeper status
    const { error: updateError } = await supabase
      .from('picks')
      .update({ is_keeper: isKeeper })
      .eq('id', pickId)
      .eq('draft_id', draftId);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Keeper status updated successfully' });
  } catch (error) {
    console.error('Error updating keeper status:', error);
    return NextResponse.json({ error: 'Failed to update keeper status', details: error }, { status: 500 });
  }
}

async function checkCommissionerStatus(supabase: SupabaseClient<Database>, userGuid: string, leagueKey: string): Promise<boolean> {
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
