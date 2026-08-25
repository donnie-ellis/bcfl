// ./app/api/db/league/[leagueId]/isCommissioner/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner } from '@/lib/auth/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ isCommissioner: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const commissioner = await isCommissioner(supabase, user.id);
    return NextResponse.json({ isCommissioner: commissioner });
  } catch (error) {
    console.error('Error checking commissioner status:', error);
    return NextResponse.json({ isCommissioner: false, error: 'Failed to check commissioner status' }, { status: 500 });
  }
}
