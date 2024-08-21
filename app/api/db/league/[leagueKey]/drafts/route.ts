// ./app/api/db/league/[leagueKey]/drafts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('league_id', leagueKey);

    if (error) throw error;
    return NextResponse.json(data, 
      {
        headers: {
        'Cache-Control': 'no-store, max-age=0',
        }
      });

  } catch (error) {
    console.error('Error fetching drafts for league:', error);
    const errorResponse = NextResponse.json({ error: 'Failed to fetch drafts for league' }, { status: 500 });
    errorResponse.headers.set('Cache-Control', 'no-store, max-age=0');
    return errorResponse;
  }
}