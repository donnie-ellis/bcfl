import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner } from '@/lib/auth/authz';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { pickId, isKeeper } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!(await isCommissioner(supabase, user.id))) {
      return NextResponse.json({ error: 'Unauthorized to change keeper status' }, { status: 403 });
    }

    // Update the pick's keeper status
    const { error: updateError } = await supabase
      .from('picks')
      .update({ is_keeper: isKeeper })
      .eq('id', pickId)
      .eq('draft_id', parseInt(draftId));

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Keeper status updated successfully' });
  } catch (error) {
    console.error('Error updating keeper status:', error);
    return NextResponse.json({ error: 'Failed to update keeper status', details: error }, { status: 500 });
  }
}
