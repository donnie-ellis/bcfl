// GET /api/yahoo/isCommissioner/[leagueKey]
import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo } from '@/lib/yahoo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueKey: string }> }
) {
  const { leagueKey } = await params;

  try {
    const path = `league/${leagueKey}/teams`;
    const data = await requestYahoo(path);
    const teams = data.fantasy_content.league[1].teams;

    let isCommissioner = false;

    for (const key in teams) {
      if (key !== 'count') {
        const team = teams[key].team[0];
        const managers = team.find((item: any) => item.managers)?.managers;

        if (managers) {
          const currentUserManager = managers.find((manager: any) => 
            manager.manager.is_current_login === '1'
          );

          if (currentUserManager && currentUserManager.manager.is_commissioner === '1') {
            isCommissioner = true;
            break;
          }
        }
      }
    }

    return NextResponse.json({ isCommissioner });
  } catch (error) {
    console.error('Failed to check commissioner status:', error);
    return NextResponse.json({ error: 'Failed to check commissioner status' }, { status: 500 });
  }
}