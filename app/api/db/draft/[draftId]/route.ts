// ./app/api/draft/[draftId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(request: NextRequest, { params }: { params: { draftId: string } }) {
  const { draftId } = params;

  try {
    // Fetch draft data
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    // Fetch picks for this draft, including team data
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        teams:team_key (
          name
        )
      `)
      .eq('draft_id', draftId)
      .order('total_pick_number', { ascending: true });

    if (picksError) throw picksError;

    // Combine draft data with picks
    const draftWithPicks = {
      ...draft,
      picks: picks
    };

    console.log('Fetched draft data:', draftWithPicks);  // Add this line for debugging

    return NextResponse.json(draftWithPicks);
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}