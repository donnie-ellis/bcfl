// ./app/api/db/leagueSettings/[leagueKey]/route.ts
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

    // Ensure roster_positions is properly parsed
    if (typeof data.roster_positions === 'string') {
      data.roster_positions = JSON.parse(data.roster_positions);
    }

    return NextResponse.json(data as LeagueSettings);
  } catch (error) {
    console.error('Error fetching league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}