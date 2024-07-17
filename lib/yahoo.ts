'use server'
import { getServerAuthSession } from "@/auth"
import { createClient } from '@supabase/supabase-js'
import { LeagueDetails, LeagueSettings, Team, Teams } from '@/lib/types'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function getValidAccessToken() {
  const session = await getServerAuthSession();
  
  if (!session || !session.user) {
    console.error("No active session or user");
    throw new Error("No active session. Please sign in.");
  }

  if (!session.user.id) {
    console.error("User ID is undefined in the session");
    throw new Error("Invalid user session. Please sign in again.");
  }

  const userId = session.user.id;

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError) {
      console.error("Error fetching session data:", sessionError);
      throw new Error("Failed to retrieve session data.");
    }

    if (!sessionData) {
      console.error("No session data found for user:", userId);
      throw new Error("No valid session found. Please sign in again.");
    }

    const now = new Date();
    const expiresAt = new Date(sessionData.expires_at);

    if (now > expiresAt) {
      // Token has expired, we need to refresh it
      console.log("Token expired, refreshing...");
      try {
        const refreshedToken = await refreshAccessToken(userId);
        return refreshedToken;
      } catch (error) {
        console.error("Error refreshing token:", error);
        throw new Error("Your session has expired. Please sign in again.");
      }
    }

    return sessionData.access_token;
  } catch (error) {
    console.error("Unexpected error in getValidAccessToken:", error);
    throw new Error("An unexpected error occurred. Please try again.");
  }
}

async function refreshAccessToken(userId: string) {
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select('refresh_token')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (sessionError || !sessionData) {
    throw new Error("Failed to retrieve refresh token.");
  }

  const response = await fetch(
    "https://api.login.yahoo.com/oauth2/get_token",
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.YAHOO_CLIENT_ID!,
        client_secret: process.env.YAHOO_CLIENT_SECRET!,
        refresh_token: sessionData.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const refreshedTokens = await response.json();

  // Update token in database
  const { error: updateError } = await supabase
    .from('sessions')
    .update({
      access_token: refreshedTokens.access_token,
      refresh_token: refreshedTokens.refresh_token ?? sessionData.refresh_token,
      expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error("Error updating session:", updateError);
    throw new Error("Failed to update session with refreshed token.");
  }

  return refreshedTokens.access_token;
}

// Helper function to make the requests.
// path: everything after v2. Don't add ?format=json
// Updated requestYahoo function with logging
export async function requestYahoo(path: string) {
  const accessToken = await getValidAccessToken();
  const baseUrl = 'https://fantasysports.yahooapis.com/fantasy/v2'
  const url = `${baseUrl}/${path}?format=json`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const data = await response.json();
  
  return data;
}

export async function parseTeamData(data: any): Promise<Team[]> {
  if (!data || !data.fantasy_content || !data.fantasy_content.league || !data.fantasy_content.league[1].teams) {
    console.error('Invalid data structure');
    return [];
  }

  const teamsData = data.fantasy_content.league[1].teams;
  const teams: Team[] = [];

  for (const key in teamsData) {
    if (key !== 'count') {
      const teamData = teamsData[key].team[0];
      const team: Team = {
        team_key: '',
        team_id: '',
        name: '',
        url: '',
        team_logos: [],
        waiver_priority: 0,
        number_of_moves: 0,
        number_of_trades: 0,
        league_scoring_type: '',
        draft_position: 0,
        has_draft_grade: false,
        managers: []
      };

      teamData.forEach((item: any) => {
        if (typeof item === 'object') {
          const key = Object.keys(item)[0];
          switch (key) {
            case 'team_key':
              team.team_key = item[key];
              break;
            case 'team_id':
              team.team_id = item[key];
              break;
            case 'name':
              team.name = item[key];
              break;
            case 'url':
              team.url = item[key];
              break;
            case 'team_logos':
              team.team_logos = item[key].map((logo: any) => ({
                size: logo.size,
                url: logo.url
              }));
              break;
            case 'waiver_priority':
              team.waiver_priority = parseInt(item[key]);
              break;
            case 'number_of_moves':
              team.number_of_moves = parseInt(item[key]);
              break;
            case 'number_of_trades':
              team.number_of_trades = parseInt(item[key]);
              break;
            case 'league_scoring_type':
              team.league_scoring_type = item[key];
              break;
            case 'draft_position':
              team.draft_position = parseInt(item[key]);
              break;
            case 'has_draft_grade':
              team.has_draft_grade = item[key] === '1';
              break;
            case 'managers':
              team.managers = item[key].map((managerData: any) => ({
                manager_id: managerData.manager.manager_id,
                nickname: managerData.manager.nickname,
                guid: managerData.manager.guid,
                is_commissioner: managerData.manager.is_commissioner === '1',
                email: managerData.manager.email,
                image_url: managerData.manager.image_url
              }));
              break;
          }
        }
      });

      teams.push(team);
    }
  }

  return teams;
}

export async function parseLeagueSettings(data: any): Promise<LeagueSettings> {
  const settings = data.fantasy_content.league[1].settings[0];
  
  // Helper function to find a specific stat by stat_id
  const findStat = (statId: number) => {
    return settings.stat_modifiers.stats.find((stat: any) => stat.stat.stat_id === statId);
  };

  return {
    draft_type: settings.draft_type,
    is_auction_draft: settings.is_auction_draft === '1',
    scoring_type: settings.scoring_type,
    persistent_url: settings.persistent_url,
    uses_playoff: settings.uses_playoff === '1',
    has_playoff_consolation_games: settings.has_playoff_consolation_games === '1',
    playoff_start_week: parseInt(settings.playoff_start_week),
    uses_playoff_reseeding: settings.uses_playoff_reseeding === '1',
    uses_lock_eliminated_teams: settings.uses_lock_eliminated_teams === '1',
    num_playoff_teams: parseInt(settings.num_playoff_teams),
    num_playoff_consolation_teams: parseInt(settings.num_playoff_consolation_teams),
    waiver_type: settings.waiver_type,
    waiver_rule: settings.waiver_rule,
    uses_faab: settings.uses_faab === '1',
    draft_time: settings.draft_time,
    draft_pick_time: parseInt(settings.draft_pick_time),
    post_draft_players: settings.post_draft_players,
    max_teams: parseInt(settings.max_teams),
    waiver_time: parseInt(settings.waiver_time),
    trade_end_date: settings.trade_end_date,
    trade_ratify_type: settings.trade_ratify_type,
    trade_reject_time: parseInt(settings.trade_reject_time),
    player_pool: settings.player_pool,
    cant_cut_list: settings.cant_cut_list,
    roster_positions: Object.values(settings.roster_positions).map((pos: any) => ({
      position: pos.roster_position.position,
      position_type: pos.roster_position.position_type,
      count: parseInt(pos.roster_position.count),
      is_starting_position: pos.roster_position.is_starting_position === '1'
    })),
    stat_categories: settings.stat_categories.stats.map((stat: any) => {
      const statModifier = findStat(parseInt(stat.stat.stat_id));
      return {
        stat_id: parseInt(stat.stat.stat_id),
        name: stat.stat.name,
        display_name: stat.stat.display_name,
        sort_order: stat.stat.sort_order,
        position_type: stat.stat.position_type,
        stat_position_types: stat.stat.stat_position_types ? 
          stat.stat.stat_position_types.map((spt: any) => spt.stat_position_type.position_type) : 
          [],
        is_only_display_stat: stat.stat.is_only_display_stat === '1',
        value: statModifier ? parseFloat(statModifier.stat.value) : null
      };
    }),
    uses_fractional_points: settings.uses_fractional_points === '1',
    uses_negative_points: settings.uses_negative_points === '1'
  };
}
