// ./app/api/db/league/[leagueId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LeagueUpdate } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner } from '@/lib/auth/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', parseInt(leagueId))
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
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const body: LeagueUpdate = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from('leagues')
      .update(body)
      .eq('id', parseInt(leagueId))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating league data:', error);
    return NextResponse.json({ error: 'Failed to update league data' }, { status: 500 });
  }
}

// Alias PUT to POST for consistency
export const PUT = POST;
