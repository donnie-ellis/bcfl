// GET /api/yahoo/teams/league
// Required fields in query: leagueKey, teamKey
import { NextRequest, NextResponse } from 'next/server';
import { Team } from '@/lib/types';
import { requestYahoo } from '@/lib/yahoo';

export async function GET(request: NextRequest, { params }: { params: { league: string } }) {
  const leagueKey = params.league;
  const path = `users;use_login=1/games;game_keys=nfl/teams`;
  try {
    const data = await requestYahoo(path);
    const teams: Team[] = [];
    const teamsData = data.fantasy_content.users[0].user[1].games[0].game[1].teams;;
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
        teams.push(team);
      }
    }
    let teamOut: Team = {};
    teams.forEach((team) => {
      const parsedKey = team.team_key.split('.');
      const parsedLeague = leagueKey.split('.');
      if (parsedKey[2] === parsedLeague[2]) {
        teamOut = team;
      }
    })
    return NextResponse.json(teamOut);
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json({ error: 'Failed to fetch league teams' }, { status: 500 });
  }
}
