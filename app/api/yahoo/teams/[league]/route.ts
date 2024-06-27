// GET /api/yahoo/teams
// Required fields in query: leagueKey
import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo, parseTeamData } from '@/lib/yahoo';
import { Team } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: { league: string } }) {
  const leagueKey = params.league;
  const path = `league/${leagueKey}/teams`;

  try {
    const data = await requestYahoo(path)
    const teams: Team[] = await parseTeamData(data.fantasy_content.league[1].teams);
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json({ error: 'Failed to fetch league teams' }, { status: 500 });
  }
}
