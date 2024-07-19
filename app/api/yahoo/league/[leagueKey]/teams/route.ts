// GET /api/yahoo/league/[leagueKey]/teams
// Required fields in query: leagueKey
import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo, parseTeamData } from '@/lib/yahoo';
import { Team } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: { leagueKey: string } }) {
  const leagueKey = params.leagueKey;
  const path = `league/${leagueKey}/teams`;

  try {
    const data = await requestYahoo(path);
    const teams: Team[] = await parseTeamData(data);
    
    if (teams.length === 0) {
      console.error('No teams parsed from the data');
      return NextResponse.json({ error: 'No teams found' }, { status: 404 });
    }
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to fetch or parse teams:', error);
    return NextResponse.json({ error: 'Failed to fetch league teams' }, { status: 500 });
  }
}
