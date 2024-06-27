// GET /api/yahoo/teams/league
// Required fields in query: leagueKey, teamKey
import { NextRequest, NextResponse } from 'next/server';
import { Team } from '@/lib/types';
import { requestYahoo, parseTeamData } from '@/lib/yahoo';

export async function GET(request: NextRequest, { params }: { params: { league: string } }) {
  const leagueKey = params.league;
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
