// ./app/api/yahoo/league/[leagueKey]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo } from '@/lib/yahoo';
import { League } from '@/lib/yahoo.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueKey: string }> }
) {
  const { leagueKey } = await params;

  try {
    const data = await requestYahoo(`league/${leagueKey}`);
    const leagueData = data.fantasy_content.league[0];

    const league: League = {
      league_key: leagueData.league_key,
      league_id: leagueData.league_id,
      name: leagueData.name,
      url: leagueData.url || '',
      draft_status: leagueData.draft_status || '',
      num_teams: leagueData.num_teams,
      league_update_timestamp: new Date(leagueData.league_update_timestamp * 1000).toISOString(),
      scoring_type: leagueData.scoring_type,
      current_week: leagueData.current_week,
      end_week: leagueData.end_week,
      is_finished: leagueData.is_finished === '1',
      logo_url: leagueData.logo_url || '',
      short_invitation_url: leagueData.short_invitation_url || '',
      league_type: leagueData.league_type,
      renew: leagueData.renew,
      renewed: leagueData.renewed,
      game_code: leagueData.game_code,
      is_cash_league: leagueData.is_cash_league === '1',
      is_pro_league: leagueData.is_pro_league === '1',
      season: parseInt(leagueData.season),
      start_date: leagueData.start_date,
      start_week: parseInt(leagueData.start_week),
      end_date: leagueData.end_date,
      weekly_deadline: leagueData.weekly_deadline
    };

    return NextResponse.json(league);
  } catch (error) {
    console.error('Failed to fetch league data:', error);
    return NextResponse.json({ error: 'Failed to fetch league data' }, { status: 500 });
  }
}