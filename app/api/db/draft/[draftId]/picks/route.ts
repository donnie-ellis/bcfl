// ./app/api/db/draft/[draftId]/picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;
  console.log('Looking up picks from supabase for draftId: ', draftId)
  try {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        player:players(*)
      `)
      .eq('draft_id', draftId)
      .order('total_pick_number', { ascending: true });

    if (error) throw error;
    console.log('Data returned: ', data)

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching picks:', error);
    return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
  }
}