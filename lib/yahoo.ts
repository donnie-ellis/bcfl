'use server'
import { getServerAuthSession } from "@/auth"
import {
  Player,
  League,
  LeaguePlayers,
  LeagueDetails,
  Manager,
  Team,
  Teams
} from "@/lib/types"
import { xml2json } from "xml-js";

export async function getValidAccessToken() {
  const session = await getServerAuthSession();

  if (session?.error === "RefreshAccessTokenError") {
    throw new Error("Your login has expired. Please sign in again.")
  }
  return session?.accessToken
}

// Helper function to make the requests.
// path: eveything after v2. Don't add ?format=json
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

export async function parseTeamData(data: any) {
  const teams: any[] = Object.values(data).filter(t => Array.isArray(t));

  return teams.map((teamArray: any[]) => {
    const team = teamArray[0];
    const teamObj: { [key: string]: any } = {};
    team.forEach((item: any) => {
      if (typeof item === 'object' && item !== null) {
        Object.assign(teamObj, item);
      }
    });

    return {
      draft_position: teamObj.draft_position,
      team_key: teamObj.team_key,
      team_id: teamObj.team_id,
      name: teamObj.name,
      is_owned_by_current_login: teamObj.is_owned_by_current_login,
      url: teamObj.url,
      team_logos: teamObj.team_logos.map((logo: any) => ({
        size: logo.team_logo.size,
        url: logo.team_logo.url
      })),
      waiver_priority: teamObj.waiver_priority,
      faab_balance: teamObj.faab_balance,
      number_of_moves: teamObj.number_of_moves,
      number_of_trades: teamObj.number_of_trades,
      league_scoring_type: teamObj.league_scoring_type,
      has_draft_grade: teamObj.has_draft_grade,
      managers: teamObj.managers.map((manager: any) => manager.manager)
    };
  });
}
