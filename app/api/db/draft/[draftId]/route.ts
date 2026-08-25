// ./app/api/db/draft/[draftId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner } from '@/lib/auth/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET
export async function GET(request: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const supabase = await createClient();

  try {
    // Fetch draft data
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', parseInt(draftId))
      .single();

    if (draftError) throw draftError;

    // Fetch picks for this draft, including team data
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        teams:team_id (
          name
        )
      `)
      .eq('draft_id', parseInt(draftId))
      .order('total_pick_number', { ascending: true });

    if (picksError) throw picksError;

    // Combine draft data with picks
    const draftWithPicks = {
      ...draft,
      picks: picks
    };

    return NextResponse.json(draftWithPicks, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  try {
    const { error } = await supabase.rpc('delete_draft', { p_draft_id: parseInt(draftId) });

    if (error) throw error;

    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
