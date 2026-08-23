// ./app/api/admin/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSupabaseAdminClient } from '@/lib/serverSupabaseClient';
import { isCommissioner } from '@/lib/auth/authz';

// Commissioner invites a manager by email. Supabase Auth's admin invite
// creates the auth.users row (which the handle_new_user trigger turns into
// a profiles row) and emails a magic link that signs them in directly.
// If a teamId is given, the invited user is immediately linked as that
// team's owner.
export async function POST(request: NextRequest) {
  const { email, teamId } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  const admin = getServerSupabaseAdminClient();

  try {
    const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm?next=/dashboard`;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (error) throw error;

    if (teamId && data.user) {
      const { error: memberError } = await admin
        .from('team_members')
        .insert({ team_id: teamId, user_id: data.user.id });

      if (memberError) throw memberError;
    }

    return NextResponse.json({ message: 'Invite sent successfully' });
  } catch (error: any) {
    console.error('Error inviting manager:', error);
    return NextResponse.json({ error: 'Failed to send invite', details: error.message || String(error) }, { status: 500 });
  }
}
