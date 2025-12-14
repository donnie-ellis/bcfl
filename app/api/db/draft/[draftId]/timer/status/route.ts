// app/api/db/draft/[draftId]/timer/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from "@/lib/serverSupabaseClient";

const supabase = getServerSupabaseClient();

export async function GET(request: Request, { params }: {params: { draftId: string } }) {
  const { draftId } = params;

  const { data, error } = await supabase
    .from('drafts')
    .select('is_paused')
    .eq('id', draftId)
    .single();

  if (error) {
    console.error('Error fetching draft timer status:', error);
    return new NextResponse('Error fetching draft timer status', { status: 500 });
  }
  return new NextResponse(JSON.stringify(data), { status: 200 });
}
