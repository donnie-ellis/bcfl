// ./app/api/db/league/[leagueId]/drafts/route.ts

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('league_id', parseInt(leagueId));

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
