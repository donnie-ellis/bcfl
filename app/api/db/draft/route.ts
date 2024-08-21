// ./app/api/db/draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers, getJobStatus } from '@/lib/playersImport';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

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
  } = await request.json();

  const { leagueKey, draftName, rounds, totalPicks, draftOrder, orderedTeams, status } = body;

  if (!leagueKey || !draftName || !rounds || !totalPicks || !draftOrder || !orderedTeams || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const parsedDraftOrder = JSON.parse(draftOrder);
    const parsedOrderedTeams = JSON.parse(orderedTeams);

    const { data, error } = await supabase.rpc('create_draft_with_picks', {
      p_league_id: leagueKey,
      p_name: draftName,
      p_rounds: rounds,
      p_total_picks: totalPicks,
      p_draft_order: parsedDraftOrder,
      p_status: status,
      p_ordered_teams: parsedOrderedTeams,
    });

    if (error) throw error;

    if (!data || data.length === 0 || !data[0].created_draft_id) {
      throw new Error('No draft ID returned');
    }

    const draftId = data[0].created_draft_id;

    // Start the player import process here
    const importJobId = uuidv4();
    importPlayers(leagueKey, importJobId).catch(error => {
      console.error('Error during player import:', error);
      // You might want to update the job status to 'error' here as well
    });

    return NextResponse.json({ 
      draftId: draftId, 
      importJobId: importJobId,
      message: 'Draft created successfully',
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
