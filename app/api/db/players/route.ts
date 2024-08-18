import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'No player IDs provided' }, { status: 400 });
  }

  const playerIds = ids.split(',').map(Number);

  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .in('id', playerIds);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}