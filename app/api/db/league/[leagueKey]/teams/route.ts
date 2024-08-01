// ./app/api/db/league/[leagueKey]/teams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Team } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueKey)

    if (error) throw error;


    return NextResponse.json(data as Team[]);
  } catch (error) {
    console.error('Error fetching league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}