// ./lib/yahoo.ts

'use server'
import { getServerAuthSession } from "@/auth"
import { createClient } from '@supabase/supabase-js'
import {LeagueSettings, Team, Manager } from '@/lib/yahoo.types'
import { Json, PlayerInsert } from "./types"

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
        waiver_priority: '',
        faab_balance: '',
        number_of_moves: 0,
        number_of_trades: 0,
        roster_adds: {
          coverage_type: '',
          coverage_value: 0,
          value: ''
        },
        league_scoring_type: '',
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
                size: logo.team_logo.size,
                url: logo.team_logo.url
              }));
              break;
            case 'waiver_priority':
              team.waiver_priority = item[key];
              break;
            case 'faab_balance':
              team.faab_balance = item[key];
              break;
            case 'number_of_moves':
              team.number_of_moves = parseInt(item[key]);
              break;
            case 'number_of_trades':
              team.number_of_trades = parseInt(item[key]);
              break;
            case 'roster_adds':
              team.roster_adds = {
                coverage_type: item[key].coverage_type,
                coverage_value: parseInt(item[key].coverage_value),
                value: item[key].value
              };
              break;
            case 'league_scoring_type':
              team.league_scoring_type = item[key];
              break;
            case 'has_draft_grade':
              team.has_draft_grade = item[key] === 1;
              break;
            case 'managers':
              team.managers = item[key].map((managerData: any) => ({
                manager_id: managerData.manager.manager_id,
                nickname: managerData.manager.nickname,
                guid: managerData.manager.guid,
                is_commissioner: managerData.manager.is_commissioner === '1',
                is_current_login: managerData.manager.is_current_login === '1',
                email: managerData.manager.email,
                image_url: managerData.manager.image_url,
                felo_score: managerData.manager.felo_score,
                felo_tier: managerData.manager.felo_tier
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
    roster_positions: settings.roster_positions.map((position: any) => ({
      roster_position: {
        position: position.roster_position.position,
        position_type: position.roster_position.position_type || '',
        count: parseInt(position.roster_position.count),
        is_starting_position: position.roster_position.is_starting_position === 1
      }
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

export async function parsePlayerData(playerData: any[]): Promise<PlayerInsert> {
  const player: Omit<PlayerInsert, 'created_at' | 'updated_at'> = {
    player_key: '',
    player_id: '',
    full_name: '',
    first_name: '',
    last_name: '',
    ascii_first_name: '',
    ascii_last_name: '',
    editorial_team_abbr: '',
    editorial_team_full_name: '',
    editorial_team_key: '',
    editorial_team_url: '',
    display_position: '',
    position_type: '',
    primary_position: '',
    eligible_positions: [],
    eligible_positions_to_add: [],
    status: '',
    status_full: '',
    on_disabled_list: false,
    injury_note: '',
    is_undroppable: '',
    has_player_notes: false,
    player_notes_last_timestamp: null,
    editorial_player_key: '',
    uniform_number: '',
    image_url: '',
    headshot_url: '',
    headshot_size: '',
    is_keeper: null,
    percent_owned: null,
    percent_started: null,
    draft_analysis: null,
    player_stats: null,
    player_advanced_stats: null,
    player_points: null,
    season_stats: null,
    selected_position: '',
    weekly_stats: null,
    league_ownership: null,
    bye_weeks: [],
    preseason_rank: null,
    rank: null,
    o_rank: null,
    psr_rank: null,
    ownership: null,
    notes: '',
    url: ''
  };

  const playerMap: { [key: string]: (value: any) => void } = {
    player_key: (value) => player.player_key = value,
    player_id: (value) => player.player_id = value,
    editorial_team_abbr: (value) => player.editorial_team_abbr = value,
    editorial_team_full_name: (value) => player.editorial_team_full_name = value,
    editorial_team_key: (value) => player.editorial_team_key = value,
    editorial_team_url: (value) => player.editorial_team_url = value,
    display_position: (value) => player.display_position = value,
    position_type: (value) => player.position_type = value,
    primary_position: (value) => player.primary_position = value,
    status: (value) => player.status = value,
    status_full: (value) => player.status_full = value,
    injury_note: (value) => player.injury_note = value,
    uniform_number: (value) => player.uniform_number = value,
    image_url: (value) => player.image_url = value,
    editorial_player_key: (value) => player.editorial_player_key = value,
    url: (value) => player.url = value,
    notes: (value) => player.notes = value,
    name: (value) => {
      player.full_name = value.full;
      player.first_name = value.first;
      player.last_name = value.last;
      player.ascii_first_name = value.ascii_first;
      player.ascii_last_name = value.ascii_last;
    },
    eligible_positions: (value) => player.eligible_positions = value.map((pos: any) => pos.position),
    eligible_positions_to_add: (value) => player.eligible_positions_to_add = value.map((pos: any) => pos.position),
    bye_weeks: (value) => player.bye_weeks = [value.week],
    player_notes_last_timestamp: (value) => player.player_notes_last_timestamp = value ? new Date(parseInt(value) * 1000).toISOString() : null,
    is_undroppable: (value) => player.is_undroppable = value,
    has_player_notes: (value) => player.has_player_notes = value === 1,
    headshot: (value) => {
      player.headshot_url = value.url;
      player.headshot_size = value.size;
    },
    is_keeper: (value) => player.is_keeper = value as Json,
    player_stats: (value) => player.player_stats = value as Json,
    player_advanced_stats: (value) => player.player_advanced_stats = value as Json,
    player_points: (value) => player.player_points = value as Json,
    season_stats: (value) => player.season_stats = value as Json,
    weekly_stats: (value) => player.weekly_stats = value as Json,
    league_ownership: (value) => player.league_ownership = value as Json,
    ownership: (value) => player.ownership = value as Json,
  };

  playerData.forEach(item => {
    if (typeof item === 'object') {
      const key = Object.keys(item)[0];
      if (key in playerMap) {
        playerMap[key](item[key]);
      }
    }
  });

  return player;
}

export async function fetchAllPlayers(leagueKey: string, start: number = 0, count: number = 25): Promise<{ players: PlayerInsert[], nextStart: number | null }> {
  console.log(`Fetching players starting from index ${start} and requesting ${count} players`);
  const playersData = await requestYahoo(`league/${leagueKey}/players;start=${start};count=${count};sort=AR`);
  const players = playersData.fantasy_content.league[1].players;
  
  if (!players || players.count === 0) {
    return { players: [], nextStart: null };
  }
  const parsedPlayers: PlayerInsert[] = [];
  for (const key in players) {
    if (key !== 'count') {
      const playerData = players[key].player[0];
      try {
        const player = await parsePlayerData(playerData);
        parsedPlayers.push(player);
      } catch (error) {
        console.error(`Error parsing player data:`, error);
        console.log('Problematic player data:', JSON.stringify(playerData, null, 2));
      }
    }
  }

  
  // If we fetched less than the requested count, we've reached the end
  const nextStart = parsedPlayers.length < count ? null : start + count;
  return { players: parsedPlayers, nextStart };
}

export async function fetchPlayerDetails(leagueKey: string, playerKey: string): Promise<PlayerInsert> {
  const path = `league/${leagueKey}/players;player_keys=${playerKey}/stats`;
  const data = await requestYahoo(path);
  
  const playerData = data.fantasy_content.league[1].players[0].player[0];
  const player = await parsePlayerData(playerData);
  
  // Extract additional information
  playerData.forEach((item: any) => {
    if (typeof item === 'object') {
      const key = Object.keys(item)[0];
      switch (key) {
        case 'status':
          player.status = item[key];
          break;
        case 'injury_note':
          player.injury_note = item[key];
          break;
        case 'percent_started':
          player.percent_started = parseFloat(item[key]);
          break;
        case 'percent_owned':
          player.percent_owned = parseFloat(item[key]);
          break;
        case 'has_player_notes':
          player.has_player_notes = item[key] === '1';
          break;
      }
    }
  });

  return player;
}

export async function parseUserTeamData(data: any): Promise<Team | null> {
  try {
    const teamData = data.fantasy_content.users[0].user[1].games[0].game[1].teams[0].team[0];
    
    const team: Team = {
      team_key: teamData.find((item: any) => item.team_key)?.team_key || '',
      team_id: teamData.find((item: any) => item.team_id)?.team_id || '',
      name: teamData.find((item: any) => item.name)?.name || '',
      url: teamData.find((item: any) => item.url)?.url || '',
      team_logos: teamData.find((item: any) => item.team_logos)?.team_logos.map((logo: any) => ({
        size: logo.team_logo.size,
        url: logo.team_logo.url
      })) || [],
      waiver_priority: Number(teamData.find((item: any) => item.waiver_priority)?.waiver_priority || 0).toString(),
      number_of_moves: Number(teamData.find((item: any) => item.number_of_moves)?.number_of_moves || 0),
      number_of_trades: Number(teamData.find((item: any) => item.number_of_trades)?.number_of_trades || 0),
      roster_adds: teamData.find((item: any) => item.roster_adds)?.roster_adds || {
        coverage_type: '',
        coverage_value: 0,
        value: ''
      },
      league_scoring_type: teamData.find((item: any) => item.league_scoring_type)?.league_scoring_type || '',
      has_draft_grade: teamData.find((item: any) => item.has_draft_grade)?.has_draft_grade === 1,
      faab_balance: Number(teamData.find((item: any) => item.faab_balance)?.faab_balance || 0).toString(),
      managers: teamData.find((item: any) => item.managers)?.managers.map((managerData: any): Manager => ({
        manager_id: managerData.manager.manager_id,
        nickname: managerData.manager.nickname,
        guid: managerData.manager.guid,
        is_commissioner: managerData.manager.is_commissioner === '1',
        email: managerData.manager.email || undefined,
        image_url: managerData.manager.image_url,
        felo_score: managerData.manager.felo_score,
        felo_tier: managerData.manager.felo_tier
      })) || [],
      is_owned_by_current_login: teamData.find((item: any) => item.is_owned_by_current_login)?.is_owned_by_current_login === 1
    };

    return team;
  } catch (error) {
    console.error('Error parsing user team data:', error);
    return null;
  }
}
