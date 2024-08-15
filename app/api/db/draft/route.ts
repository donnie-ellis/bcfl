// ./app/api/db/league/[leagueKey]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';
import { importPlayers } from '@/lib/playersImport';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// TODO: This isn't used or needed I think
// GET
export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('league_key', leagueKey)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching league data:', error);
    return NextResponse.json({ error: 'Failed to fetch league data' }, { status: 500 });
  }
}

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

    // Start the player import process here
    const importJobId = uuidv4();
    importPlayers(leagueKey, importJobId);

    return NextResponse.json({ 
      draftId: data[0].created_draft_id, 
      importJobId: importJobId,
      message: 'Draft created successfully' 
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}

// Alias PUT to POST for consistency
export const PUT = POST;