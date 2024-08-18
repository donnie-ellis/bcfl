// ./app/api/db/league/[leagueKey]/isCommissioner/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';
import { getServerAuthSession } from "@/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const supabase = getServerSupabaseClient();
  const { leagueKey } = params;

  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ isCommissioner: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userGuid = session.user.id;

  try {
    const { data: manager, error } = await supabase
      .from('managers')
      .select('is_commissioner')
      .eq('guid', userGuid)
      .contains('league_keys', [leagueKey])
      .single();

    if (error) throw error;

    return NextResponse.json({ isCommissioner: manager?.is_commissioner || false });
  } catch (error) {
    console.error('Error checking commissioner status:', error);
    return NextResponse.json({ isCommissioner: false, error: 'Failed to check commissioner status' }, { status: 500 });
  }
}