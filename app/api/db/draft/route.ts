// ./app/api/db/draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers, getJobStatus } from '@/lib/playersImport';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

const supabase = getServerSupabaseClient();

// POST
export async function POST(request: NextRequest) {
  const body: {
    leagueKey: string;
    draftName: string;
    rounds: number;
    totalPicks: number;
    draftOrder: string;
    orderedTeams: string;
    status: string;
    useTimer?: boolean;
    pickSeconds?: number;
  } = await request.json();

  const { 
    leagueKey, 
    draftName, 
    rounds, 
    totalPicks, 
    draftOrder, 
    orderedTeams, 
    status,
    useTimer = false,
    pickSeconds = 90
  } = body;

  if (!leagueKey || !draftName || !rounds || !totalPicks || !draftOrder || !orderedTeams || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate timer settings if timer is enabled
  if (useTimer) {
    if (!pickSeconds || pickSeconds < 10 || pickSeconds > 600) {
      return NextResponse.json({ 
        error: 'Pick seconds must be between 10 and 600 when timer is enabled' 
      }, { status: 400 });
    }
  }

  try {
    const parsedDraftOrder = JSON.parse(draftOrder);
    const parsedOrderedTeams = JSON.parse(orderedTeams);

    // First, create the draft with basic information
    const { data: draftData, error: draftError } = await supabase
      .from('drafts')
      .insert({
        league_id: leagueKey,
        name: draftName,
        rounds,
        total_picks: totalPicks,
        draft_order: parsedDraftOrder,
        status,
        current_pick: 1,
        use_timer: useTimer,
        is_paused: true, // Always start paused
        pick_seconds: useTimer ? pickSeconds : 90 // Default to 90 even if timer disabled
      })
      .select('id')
      .single();

    if (draftError) throw draftError;

    if (!draftData || !draftData.id) {
      throw new Error('No draft ID returned from insert');
    }

    const draftId = draftData.id;

    // Now create the picks using the existing function
    const { data: picksData, error: picksError } = await supabase.rpc('create_draft_with_picks', {
      p_league_id: leagueKey,
      p_name: draftName,
      p_rounds: rounds,
      p_total_picks: totalPicks,
      p_draft_order: parsedDraftOrder,
      p_status: status,
      p_ordered_teams: parsedOrderedTeams,
    });

    if (picksError) {
      // If picks creation fails, clean up the draft
      await supabase.from('drafts').delete().eq('id', draftId);
      throw picksError;
    }

    // Update the draft with timer settings (the create_draft_with_picks function may have overwritten them)
    const { error: updateError } = await supabase
      .from('drafts')
      .update({
        use_timer: useTimer,
        is_paused: true, // Always start paused
        pick_seconds: useTimer ? pickSeconds : 90
      })
      .eq('id', draftId);

    if (updateError) {
      console.error('Error updating draft timer settings:', updateError);
      // Don't fail the entire operation for this
    }

    // Start the player import process
    const importJobId = uuidv4();
    importPlayers(leagueKey, importJobId).catch(error => {
      console.error('Error during player import:', error);
    });

    return NextResponse.json({ 
      draftId: draftId, 
      importJobId: importJobId,
      message: 'Draft created successfully',
      timerEnabled: useTimer,
      pickSeconds: useTimer ? pickSeconds : null
    });
  } catch (error: any) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ 
      error: 'Failed to create draft', 
      details: error.message || String(error)
    }, { status: 500 });
  }
}

// Alias PUT to POST for consistency
export const PUT = POST;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
  }

  try {
    const jobStatus = await getJobStatus(jobId);
    return NextResponse.json(jobStatus);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { leagueKey, jobId, continuationToken } = await request.json();

  if (!leagueKey || !jobId || continuationToken === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await importPlayers(leagueKey, jobId);
    return NextResponse.json({ message: 'Import resumed successfully' });
  } catch (error) {
    console.error('Error resuming import:', error);
    return NextResponse.json({ error: 'Failed to resume import' }, { status: 500 });
  }
}