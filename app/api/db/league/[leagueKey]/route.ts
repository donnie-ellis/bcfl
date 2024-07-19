// ./app/api/db/league/[leagueKey]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { League } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

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

export async function POST(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;
  const body: Partial<League> = await request.json();

  try {
    const { data, error } = await supabase
      .from('leagues')
      .upsert({
        league_key: leagueKey,
        ...body
      }, {
        onConflict: 'league_key'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error upserting league data:', error);
    return NextResponse.json({ error: 'Failed to upsert league data' }, { status: 500 });
  }
}

// Alias PUT to POST for consistency
export const PUT = POST;