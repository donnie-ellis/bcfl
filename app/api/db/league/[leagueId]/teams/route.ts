// ./app/api/db/league/[leagueId]/teams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TeamInput } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { isCommissioner } from '@/lib/auth/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*, team_members(user_id, role, profiles(display_name, email, avatar_url))')
      .eq('league_id', parseInt(leagueId));

    if (error) throw error;

    const withMembers = teams.map(({ team_members, ...team }) => ({
      ...team,
      members: team_members.map((tm: any) => ({
        user_id: tm.user_id,
        role: tm.role,
        display_name: tm.profiles?.display_name ?? null,
        email: tm.profiles?.email,
        avatar_url: tm.profiles?.avatar_url ?? null,
      })),
    }));

    return NextResponse.json(withMembers);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// Commissioner creates/updates teams directly (no more Yahoo sync).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const teams: (Partial<TeamInput> & { name: string })[] = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  try {
    const teamsForUpsert: TeamInput[] = teams.map(team => ({
      ...team,
      league_id: parseInt(leagueId),
    }));

    const { data, error } = await supabase
      .from('teams')
      .upsert(teamsForUpsert)
      .select();

    if (error) throw error;

    return NextResponse.json({ message: 'Teams saved successfully', data });
  } catch (error) {
    console.error('Error upserting teams:', error);
    return NextResponse.json({ error: 'Failed to upsert teams' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const { teamId } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  try {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('league_id', parseInt(leagueId));

    if (error) throw error;

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
