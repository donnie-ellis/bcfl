// ./app/api/db/league/[leagueId]/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LeagueSettingsInput } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner } from '@/lib/auth/authz';

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('league_settings')
      .select('*')
      .eq('league_id', parseInt(leagueId))
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}

// POST
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const body: Omit<LeagueSettingsInput, 'league_id'> = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  try {
    const upsertData: LeagueSettingsInput = {
      ...body,
      league_id: parseInt(leagueId),
    };

    const { error } = await supabase
      .from('league_settings')
      .upsert(upsertData, {
        onConflict: 'league_id',
      });

    if (error) throw error;

    return NextResponse.json({ message: 'League settings updated successfully' });
  } catch (error) {
    console.error('Error upserting league settings:', error);
    return NextResponse.json({ error: 'Failed to upsert league settings', details: error }, { status: 500 });
  }
}

// PUT
export const PUT = POST;
