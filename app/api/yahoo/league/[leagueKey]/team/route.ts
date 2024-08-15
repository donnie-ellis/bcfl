// ./app/api/yahoo/user/league/[leagueKey]/team/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from "@/auth";
import { requestYahoo, parseTeamData } from '@/lib/yahoo';
import { Team } from '@/lib/yahoo.types';

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const session = await getServerAuthSession();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leagueKey } = params;

  try {
    console.debug('In the try block')
    const path = `league/${leagueKey}/teams`;
    const data = await requestYahoo(path);
    const teams = await parseTeamData(data.fantasy_content.league[1].teams);

    if (Array.isArray(teams)) {
      // Find the team owned by the current user
      const userTeam = teams.find(team => team.is_owned_by_current_login);

      if (!userTeam) {
        return NextResponse.json({ error: 'User team not found in this league' }, { status: 404 });
      }

      return NextResponse.json(userTeam);
    } else {
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to fetch user team:', error);
    return NextResponse.json({ error: 'Failed to fetch user team' }, { status: 500 });
  }
}
