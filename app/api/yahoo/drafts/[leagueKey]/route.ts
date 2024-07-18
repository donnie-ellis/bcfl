// ./app/api/yahoo/drafts/[leagueKey]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from "@/auth";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(request: NextRequest, { params }: { params: { leagueKey: string } }) {
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueKey } = params;

  try {
    const { data: drafts, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('league_id', leagueKey)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(drafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}