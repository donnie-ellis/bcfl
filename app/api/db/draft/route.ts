// ./app/api/db/draft/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestYahoo } from '@/lib/yahoo';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers, getJobStatus } from '@/lib/playersImport';
import { League, LeagueSettings } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  const { leagueKey, draftName, orderedTeams, leagueSettings } = await request.json();

  try {
    // Fetch league data from Yahoo
    const leagueData = await requestYahoo(`league/${leagueKey}`);
    const league = leagueData.fantasy_content.league[0] as League;

    // Fetch league settings from Yahoo
    const settingsData = await requestYahoo(`league/${leagueKey}/settings`);
    const leagueSettings = settingsData.fantasy_content.league[1].settings[0] as LeagueSettings;

    // Upsert league data
    const { data: upsertedLeague, error: leagueError } = await supabase
      .from('leagues')
      .upsert({
        league_key: league.league_key,
        league_id: league.league_id,
        name: league.name,
        url: league.url,
        draft_status: league.draft_status,
        num_teams: league.num_teams,
        league_update_timestamp: league.league_update_timestamp,
        scoring_type: league.scoring_type,
        current_week: league.current_week,
        end_week: league.end_week,
        is_finished: league.is_finished,
        logo_url: league.logo_url,
        short_invitation_url: league.short_invitation_url,
        league_type: league.league_type,
        renew: league.renew,
        renewed: league.renewed,
        game_code: league.game_code,
        is_cash_league: league.is_cash_league,
        is_plus_league: league.is_plus_league,
        is_pro_league: league.is_pro_league,
        season: league.season,
        start_date: league.start_date,
        start_week: league.start_week,
        felo_tier: league.felo_tier,
        end_date: league.end_date,
        weekly_deadline: league.weekly_deadline
      }, { onConflict: 'league_key' })
      .select()
      .single();

    if (leagueError) throw leagueError;

    // // Upsert league settings
    // const { error: settingsError } = await supabase
    //   .from('league_settings')
    //   .upsert({
    //     league_key: league.league_key,
    //     draft_type: leagueSettings.draft_type,
    //     is_auction_draft: leagueSettings.is_auction_draft,
    //     scoring_type: leagueSettings.scoring_type,
    //     persistent_url: leagueSettings.persistent_url,
    //     uses_playoff: leagueSettings.uses_playoff,
    //     has_playoff_consolation_games: leagueSettings.has_playoff_consolation_games,
    //     playoff_start_week: leagueSettings.playoff_start_week,
    //     uses_playoff_reseeding: leagueSettings.uses_playoff_reseeding,
    //     uses_lock_eliminated_teams: leagueSettings.uses_lock_eliminated_teams,
    //     num_playoff_teams: leagueSettings.num_playoff_teams,
    //     num_playoff_consolation_teams: leagueSettings.num_playoff_consolation_teams,
    //     waiver_type: leagueSettings.waiver_type,
    //     waiver_rule: leagueSettings.waiver_rule,
    //     uses_faab: leagueSettings.uses_faab,
    //     draft_time: leagueSettings.draft_time,
    //     draft_pick_time: leagueSettings.draft_pick_time,
    //     post_draft_players: leagueSettings.post_draft_players,
    //     max_teams: leagueSettings.max_teams,
    //     waiver_time: leagueSettings.waiver_time,
    //     trade_end_date: leagueSettings.trade_end_date,
    //     trade_ratify_type: leagueSettings.trade_ratify_type,
    //     trade_reject_time: leagueSettings.trade_reject_time,
    //     player_pool: leagueSettings.player_pool,
    //     cant_cut_list: leagueSettings.cant_cut_list,
    //     roster_positions: JSON.stringify(leagueSettings.roster_positions),
    //     stat_categories: JSON.stringify(leagueSettings.stat_categories),
    //     uses_fractional_points: leagueSettings.uses_fractional_points,
    //     uses_negative_points: leagueSettings.uses_negative_points
    //   }, { onConflict: 'league_key' })
    //   .select()
    //   .single();

    // if (settingsError) throw settingsError;

    const rosterPositions = leagueSettings.roster_positions;
    // Calculate total roster spots, excluding IR spots
    const rounds = Object.values(rosterPositions).reduce((total, positionData: any) => {
      if (positionData.roster_position && positionData.roster_position.position !== 'IR') {
        return total + parseInt(positionData.roster_position.count, 10);
      }
      return total;
    }, 0);

    const totalPicks = rounds * orderedTeams.length;

    // Ensure orderedTeams is an array of objects with team_key properties
    const draftOrder = orderedTeams.map(teamKey => ({ team_key: teamKey }));

    // Create draft
    const { data, error } = await supabase
      .rpc('create_draft_with_picks', {
        p_league_id: leagueKey,
        p_name: draftName,
        p_rounds: rounds,
        p_total_picks: totalPicks,
        p_draft_order: JSON.stringify(draftOrder),
        p_status: 'pending',
        p_ordered_teams: draftOrder
      });

    if (error) throw error;

    const draftId = data[0];

    // Start the player import process
    const importJobId = uuidv4();
    importPlayers(leagueKey, importJobId).catch(console.error);

    return NextResponse.json({ draftId, importJobId });
  } catch (error) {
    console.error('Failed to create draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}