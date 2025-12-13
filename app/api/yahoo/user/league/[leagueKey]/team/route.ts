// ./app/api/yahoo/user/league/[leagueKey]/team/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from "@/auth";
import { requestYahoo, parseUserTeamData } from '@/lib/yahoo';
import { Team } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueKey: string }> }
) {
  const session = await getServerAuthSession();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leagueKey } = await params;

  try {
    const path = `users;use_login=1/games;game_keys=nfl/teams`;
    const data = await requestYahoo(path);
    const userTeam = await parseUserTeamData(data);

    if (!userTeam) {
      return NextResponse.json({ error: 'User team not found' }, { status: 404 });
    }

    // Check if the team belongs to the requested league
    if (!userTeam.team_key.startsWith(leagueKey)) {
      return NextResponse.json({ error: 'User team not found in this league' }, { status: 404 });
    }

    return NextResponse.json(userTeam);
  } catch (error) {
    console.error('Failed to fetch user team:', error);
    return NextResponse.json({ error: 'Failed to fetch user team' }, { status: 500 });
  }
}