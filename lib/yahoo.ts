import { getServerAuthSession } from "@/auth"
import {
  Player,
  LeaguePlayers,
  LeagueDetails,
  Manager,
  Team,
  Teams
} from "@/lib/types"

async function getValidAccessToken() {
  const session = await getServerAuthSession();

  if (session?.error === "RefreshAccessTokenError") {
    throw new Error("Your login has expired. Please sign in again.")
  }
  return session?.accessToken
}

// Helper function to make the requests.
// path: eveything after v2. Don't add ?format=json
async function requestYahoo(path: string) {
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

// Gets all leages a user is in
// Gets it but I haven't parsed it yet
export async function fetchLeagues() {
  try {
    const accessToken = await getValidAccessToken()
    const response = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=nfl;seasons=2024/leagues?format=json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return JSON.stringify(data.fantasy_content.users[0].user)
  } catch (error) {
    console.error('Error fetching leagues:', error)
    throw error
  }
}

// Gets all players in the league
// leageKey: optional league key. Will pull from env variable YAHOO_LEAGUE_ID if not overridden
export async function fetchLeagePlayers(leagueKey: string = process.env.YAHOO_LEAGUE_ID!) {
  const path = `league/${leagueKey}/players`;
  const leaguePlayers: LeaguePlayers = {
    league_key: leagueKey,
    players: []
  }
  let currentPage = 0;
  let totalPlayers = 0;
  const playersPerPage = 25; // Yahoo typically returns 25 players per page
  let hasMorePlayers = true;

  while (hasMorePlayers) {
    const start = currentPage * playersPerPage;
    const pagedPath = `${path};start=${start}`;
    const data = await requestYahoo(pagedPath);

    const playersData = data.fantasy_content.league[1].players;
    let playersInThisPage = 0

    for (const key in playersData) {
      if (key !== 'count') {
        playersInThisPage++
        const playerData = playersData[key].player[0];
        const player: Player = {
          player_key: '',
          player_id: '',
          name: { full: '', first: '', last: '' },
          editorial_team_abbr: '',
          display_position: '',
          position_type: '',
          eligible_positions: [],
          status: '',
          editorial_player_key: '',
          editorial_team_full_name: '',
          editorial_team_key: '',
          bye_weeks: [],
          uniform_number: '',
          image_url: '',
          headshot: '',
          headshot_size: ''
        };
        playerData.forEach((item: any) => {
          if (typeof item === 'object') {
            const key = Object.keys(item)[0];
            switch (key) {
              case 'player_key':
                player.player_key = item[key];
                break;
              case 'player_id':
                player.player_id = item[key];
                break;
              case 'name':
                player.name = item[key];
                break;
              case 'editorial_team_abbr':
                player.editorial_team_abbr = item[key];
                break;
              case 'display_position':
                player.display_position = item[key];
                break;
              case 'position_type':
                player.position_type = item[key];
                break;
              case 'eligible_positions':
                player.eligible_positions = item[key].map((pos: any) => pos.position);
                break;
              case 'status':
                player.status = item[key];
                break;
              case 'editorial_player_key':
                player.editorial_player_key = item[key];
                break;
              case 'editorial_team_key':
                player.editorial_team_key = item[key];
                break;
              case 'editorial_team_full_name':
                player.editorial_team_full_name = item[key];
                break;
              case 'bye_weeks':
                player.bye_weeks = item[key];
                break;
              case 'uniform_number':
                player.uniform_number = item[key];
                break;
              case 'headshot':
                player.image_url = item[key].image_url;
                player.headshot = item[key].url
                player.headshot_size = item[key].size
                break;
            }
          }
        });
        leaguePlayers.players.push(player);
      }
    }
    if (playersInThisPage < playersPerPage) {
      hasMorePlayers = false;
    }
    currentPage++
  }
  return leaguePlayers
}

// Gets leage details
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
          roster_adds: {
            coverage_type: '',
            coverage_value: 0,
            value: 0
          },
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
              case 'roster_adds':
                team.roster_adds = item[key];
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
