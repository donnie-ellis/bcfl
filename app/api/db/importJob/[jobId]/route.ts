// ./app/api/db/importJob/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  try {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('status, progress')
      .eq('id', jobId)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching import job status:', error);
    return NextResponse.json({ error: 'Failed to fetch import job status' }, { status: 500 });
  }
}