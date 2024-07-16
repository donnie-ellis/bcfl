'use server'
import { getServerAuthSession } from "@/auth"
import { createClient } from '@supabase/supabase-js'
import { LeagueDetails, Team, Teams } from '@/lib/types'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function getValidAccessToken() {
  const session = await getServerAuthSession();
  
  console.log("getValidAccessToken - session:", JSON.stringify(session, null, 2));

  if (!session || !session.user) {
    console.error("No active session or user");
    throw new Error("No active session. Please sign in.");
  }

  if (!session.user.id) {
    console.error("User ID is undefined in the session");
    throw new Error("Invalid user session. Please sign in again.");
  }

  const userId = session.user.id;
  console.log("User ID:", userId);

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

// Gets league details
export async function fetchLeague(leagueKey: string = process.env.YAHOO_LEAGUE_ID!) {
  const path = `league/${leagueKey}`;
  const data = await requestYahoo(path);
  const leagueDetails: LeagueDetails = data.fantasy_content.league[0]
  return leagueDetails;
}

export async function fetchTeams(leagueKey: string = process.env.YAHOO_LEAGUE_ID!) {
  const path = `league/${leagueKey}/teams`;

  const teamsData: Teams = {
    league_key: leagueKey,
    teams: []
  };

  try {
    const data = await requestYahoo(path)

    const leagueTeamsData = data.fantasy_content.league[1].teams;
    for (const key in leagueTeamsData) {
      if (key !== 'count') {
        const teamData = leagueTeamsData[key].team[0];
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
                team.team_logos = item[key];
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
                  is_commissioner: managerData.manager.is_commissioner,
                  email: managerData.manager.email,
                  image_url: managerData.manager.image_url
                }));
                break;
            }
          }
        });
        teamsData.teams.push(team);
      }
    }


    return teamsData;
  } catch (error) {
    console.error('Error fetching league teams:', error);
    throw error;
  }
}

export async function parseTeamData(data: any): Promise<Team[]> {
  console.log('Raw data:', JSON.stringify(data, null, 2));

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

  console.log('Parsed teams:', JSON.stringify(teams, null, 2));
  return teams;
}
