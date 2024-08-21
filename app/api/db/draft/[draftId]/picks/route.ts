// ./app/api/db/draft/[draftId]/picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;
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

    return NextResponse.json(data, 
      { 
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
  } catch (error) {
    console.error('Error fetching picks:', error);
    return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
  }
}