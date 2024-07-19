// ./app/api/db/league/[leagueKey]/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LeagueSettings } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    const { data, error } = await supabase
      .from('league_settings')
      .select('*')
      .eq('league_key', leagueKey)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;
  const body: LeagueSettings = await request.json();

  try {
    const { data, error } = await supabase
      .from('league_settings')
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
    console.error('Error upserting league settings:', error);
    return NextResponse.json({ error: 'Failed to upsert league settings' }, { status: 500 });
  }
}

// Alias PUT to POST for consistency
export const PUT = POST;