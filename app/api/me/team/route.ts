// ./app/api/me/team/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('team:teams(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(null);
    }

    return NextResponse.json(data.team);
  } catch (error) {
    console.error('Error fetching my team:', error);
    return NextResponse.json({ error: 'Failed to fetch my team' }, { status: 500 });
  }
}
