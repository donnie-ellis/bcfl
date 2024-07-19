// GET /api/yahoo/user/leagues
import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo } from '@/lib/yahoo';
import { League } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const currentYear = new Date().getFullYear();
    const path = `users;use_login=1/games;game_codes=nfl;seasons=${currentYear}/leagues`
    const data = await requestYahoo(path);
    const leaguesData = data.fantasy_content.users[0].user[1].games[0].game[1].leagues;
    const leagues: League[] = [];
    for (const key in leaguesData) {
      const leagueData = leaguesData[key].league;
      leagueData.forEach((item: any) => {
        const league: League = {
          league_key: item.league_key,
          league_id: item.league_id,
          name: item.name,
          url: item.url,
          draft_status: item.draft_status,
          num_teams: item.num_teams,
          league_update_timestamp: item.league_update_timestamp,
          scoring_type: item.scoring_type,
          current_week: item.current_week,
          end_week: item.end_week,
          is_finished: item.is_finished,
          start_week: item.start_week,
          start_date: item.start_date,
          end_date: item.end_date,
          is_cash_league: item.is_cash_league,
          is_plus_league: item.is_plus_league,
          is_pro_league: item.is_pro_league,
          game_code: item.game_code,
          league_type: item.league_type,
          renew: item.renew,
          renewed: item.renewed,
          short_invitation_url: item.short_invitation_url,
          logo_url: item.logo_url,
          weekly_deadline: item.weekly_deadline,
          season: item.season,
          felo_tier: item.felo_tier,
        };
        leagues.push(league);
      });
      return NextResponse.json(leagues);
    };
  } catch (error) {
    console.error('Failed to fetch leagues:', error);
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // If you need POST functionality, implement it here
  // For now, we'll just call the same function as GET
  return await GET(request);
}
