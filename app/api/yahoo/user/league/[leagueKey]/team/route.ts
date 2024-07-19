// GET /api/yahoo/user/league/[leagueKey]/teams

import { NextRequest, NextResponse } from 'next/server';
import { Team } from '@/lib/types';
import { requestYahoo, parseTeamData } from '@/lib/yahoo';

export async function GET(request: NextRequest, { params }: { params: { leagueKey: string } }) {
  const leagueKey = params.leagueKey;
  const path = `users;use_login=1/games;game_keys=nfl/teams`;
  try {
    const data = await requestYahoo(path);
    const team: Team[] = await parseTeamData(data.fantasy_content.users[0].user[1].games[0].game[1].teams[0]) as Team[];

    return NextResponse.json(team[0]);
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json({ error: 'Failed to fetch league teams' }, { status: 500 });
  }
}
