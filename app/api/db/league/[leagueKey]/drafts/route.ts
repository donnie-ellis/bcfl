// ./app/api/db/league/[leagueKey]/drafts/route.ts

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

const supabase = getServerSupabaseClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueKey: string }> }
) {
  const { leagueKey } = await params;

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