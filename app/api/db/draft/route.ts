// ./app/api/db/draft/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestYahoo } from '@/lib/yahoo';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers } from '@/lib/playersImport';
import { League, LeagueSettings } from '@/lib/types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  const { leagueKey, draftName, orderedTeams } = await request.json();

  try {
    // Fetch league data from Yahoo
    const leagueData = await requestYahoo(`league/${leagueKey}`);
    const leagueFromYahoo = leagueData.fantasy_content.league[0] as League;

    // Fetch league settings from Yahoo
    const settingsData = await requestYahoo(`league/${leagueKey}/settings`);
    const leagueSettingsFromYahoo = settingsData.fantasy_content.league[1].settings[0] as LeagueSettings;

    // Define the fields that exist in the leagues table
    const leagueFields = [
      'league_key', 'league_id', 'name', 'url', 'logo_url', 'draft_status', 
      'num_teams', 'weekly_deadline', 'league_update_timestamp', 'scoring_type', 
      'league_type', 'renew', 'renewed', 'short_invitation_url', 'is_pro_league',
      'is_cash_league', 'current_week', 'start_week', 'start_date', 'end_week', 
      'end_date', 'game_code', 'season'
    ];

    // Define the fields that exist in the league_settings table
    const leagueSettingsFields = [
      'league_key', 'draft_type', 'is_auction_draft', 'scoring_type', 
      'persistent_url', 'uses_playoff', 'has_playoff_consolation_games', 
      'playoff_start_week', 'uses_playoff_reseeding', 'uses_lock_eliminated_teams',
      'num_playoff_teams', 'num_playoff_consolation_teams', 'waiver_type', 
      'waiver_rule', 'uses_faab', 'draft_time', 'draft_pick_time', 
      'post_draft_players', 'max_teams', 'waiver_time', 'trade_end_date', 
      'trade_ratify_type', 'trade_reject_time', 'player_pool', 'cant_cut_list', 
      'roster_positions', 'stat_categories', 'uses_fractional_points', 
      'uses_negative_points'
    ];

    // Create objects with only the fields that exist in the respective tables
    const leagueToUpsert = leagueFields.reduce((acc, field) => {
      if (field in leagueFromYahoo) {
        acc[field] = leagueFromYahoo[field];
      }
      return acc;
    }, {} as Partial<League>);

    const leagueSettingsToUpsert = leagueSettingsFields.reduce((acc, field) => {
      if (field in leagueSettingsFromYahoo) {
        acc[field] = leagueSettingsFromYahoo[field];
      }
      return acc;
    }, {} as Partial<LeagueSettings>);

    // Upsert league data
    const { error: leagueError } = await supabase
      .from('leagues')
      .upsert(leagueToUpsert, { onConflict: 'league_key' });

    if (leagueError) throw leagueError;

    // Manual upsert for league settings
    const { data: existingSettings, error: fetchError } = await supabase
      .from('league_settings')
      .select('*')
      .eq('league_key', leagueKey)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
      throw fetchError;
    }

    let settingsError;
    if (existingSettings) {
      // Update existing settings
      const { error } = await supabase
        .from('league_settings')
        .update(leagueSettingsToUpsert)
        .eq('league_key', leagueKey);
      settingsError = error;
    } else {
      // Insert new settings
      const { error } = await supabase
        .from('league_settings')
        .insert({ ...leagueSettingsToUpsert, league_key: leagueKey });
      settingsError = error;
    }

    if (settingsError) throw settingsError;

    const rosterPositions = leagueSettingsFromYahoo.roster_positions;
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

    const draftId = data[0].created_draft_id;

    // Start the player import process
    const importJobId = uuidv4();
    importPlayers(leagueKey, importJobId).catch(console.error);

    return NextResponse.json({ draftId, importJobId });
  } catch (error) {
    console.error('Failed to create draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}