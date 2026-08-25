// ./app/api/db/draft/route.ts
import { NextRequest, NextResponse, after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers, getJobStatus } from '@/lib/playersImport';
import { createClient } from '@/lib/supabase/server';
import { getServerSupabaseAdminClient } from '@/lib/serverSupabaseClient';
import { isCommissioner } from '@/lib/auth/authz';

// The player import kicked off below runs after the response is sent;
// 60s is the max Vercel allows a function to stay alive on the Hobby plan.
export const maxDuration = 60;

// POST
export async function POST(request: NextRequest) {
  const body: {
    leagueId: number;
    draftName: string;
    rounds: number;
    totalPicks: number;
    draftOrder: string;
    orderedTeams: string;
    status: string;
  } = await request.json();

  const { leagueId, draftName, rounds, totalPicks, draftOrder, orderedTeams, status } = body;

  if (!leagueId || !draftName || !rounds || !totalPicks || !draftOrder || !orderedTeams || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  try {
    const parsedDraftOrder = JSON.parse(draftOrder);
    const parsedOrderedTeams = JSON.parse(orderedTeams);

    const { data, error } = await supabase.rpc('create_draft_with_picks', {
      p_league_id: leagueId,
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

    // Start the player import process here. Uses the admin client since
    // the players table is service-role-write-only (Sleeper import is a
    // global, privileged bulk operation, not scoped to this user's RLS
    // access).
    const importJobId = uuidv4();
    const adminSupabase = getServerSupabaseAdminClient();
    after(() =>
      importPlayers(adminSupabase, importJobId).catch(error => {
        console.error('Error during player import:', error);
      })
    );

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

  const supabase = await createClient();

  try {
    const jobStatus = await getJobStatus(supabase, jobId);
    return NextResponse.json(jobStatus);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
}
