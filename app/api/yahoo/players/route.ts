// GET /api/yahoo/players
// Required query params: leagueKey
import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo } from '@/lib/yahoo';
import { LeaguePlayers, Player } from '@/lib/types';

type DraftAnalysis = {
    average_pick: number;
    average_round: number;
    percent_drafted: number;
    average_cost: number;
    draft_positions: {
      min: number;
      max: number;
      average: number;
    };
  };  

export async function GET(request: NextRequest, { params }: { params: { leagueKey: string } }) {
  const leagueKey = params.leagueKey;
  try {
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
            headshot_size: '',
            average_pick: 0,
            average_round: 0,
            percent_drafted: 0,
            average_cost: 0,
            draft_positions: {
              min: 0,
              max: 0,
              average: 0
            },
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
          const draftData = await fetchDraftAnaylis(leagueKey, player.player_key);
          player.average_pick = draftData.average_pick;
          player.average_round = draftData.average_round;
          player.average_cost = draftData.average_cost;
          player.percent_drafted = draftData.percent_drafted;
          player.draft_positions = draftData.draft_positions;
          leaguePlayers.players.push(player);
        }
      }
      if (playersInThisPage < playersPerPage) {
        hasMorePlayers = false;
      }
      currentPage++
    }
    return leaguePlayers  

} catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function fetchDraftAnaylis(leagueKey: string = process.env.YAHOO_LEAGUE_ID!, playerKey: string) {
    const path = `league/${leagueKey}/players;player_keys=${playerKey}/draft_analysis`;
    const data = await requestYahoo(path);
    const draftAnalysis: DraftAnalysis = {
      average_pick: 0,
      average_round: 0,
      percent_drafted: 0,
      average_cost: 0,
      draft_positions: {
        min: 0,
        max: 0,
        average: 0
      }
    };
  
    const draftData = data.fantasy_content.league[1].players[0].player[1].draft_analysis;
    draftData.forEach((item: any) => {
      if (typeof item === 'object') {
        const key = Object.keys(item)[0];
        switch (key) {
          case 'average_pick':
            draftAnalysis.average_pick = item[key];
            break;
          case 'average_round':
            draftAnalysis.average_round = item[key];
            break;
          case 'percent_drafted':
            draftAnalysis.percent_drafted = item[key];
            break;
          case 'average_cost':
            draftAnalysis.average_cost = item[key];
            break;
          case 'draft_positions':
            const draftPositions = item[key];
            break;
        }
      }
    });
    return draftAnalysis
  }
  