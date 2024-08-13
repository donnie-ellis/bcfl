// ./app/api/db/draft/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';
import { requestYahoo } from '@/lib/yahoo';
import { v4 as uuidv4 } from 'uuid';
import { importPlayers } from '@/lib/playersImport';
import { League, LeagueSettings } from '@/lib/types';
import { strict } from 'assert';

// Define a type that matches the structure Supabase is expecting
type LeagueUpsertRow = {
  created_at?: string | null;
  current_week?: number | null;
  draft_status?: string | null;
  end_date?: string | null;
  end_week?: number | null;
  felo_tier?: string | null;
  game_code?: string | null;
  is_cash_league?: boolean | null;
  is_finished?: boolean | null;
  is_plus_league?: boolean | null;
  is_pro_league?: boolean | null;
  league_id: string;
  league_key: string;
  league_type?: string | null;
  league_update_timestamp?: string | null;
  logo_url?: string | null;
  name: string;
  num_teams: number;
  renew?: string | null;
  renewed?: string | null;
  scoring_type: string;
  season?: number | null;
  short_invitation_url?: string | null;
  start_date?: string | null;
  start_week?: number | null;
  updated_at?: string | null;
  url?: string | null;
  weekly_deadline?: string | null;
};

export async function POST(request: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { leagueKey, draftName, orderedTeams }: { leagueKey: string; draftName: string; orderedTeams: string[] } = await request.json();

  try {
    // Fetch league data from Yahoo
    const leagueData = await requestYahoo(`league/${leagueKey}`);
    const leagueFromYahoo = leagueData.fantasy_content.league[0] as League;

    // Fetch league settings from Yahoo
    const settingsData = await requestYahoo(`league/${leagueKey}/settings`);
    const leagueSettingsFromYahoo = settingsData.fantasy_content.league[1].settings[0] as LeagueSettings;

    // Create an object that matches the LeagueUpsertRow type
    const leagueToUpsert: LeagueUpsertRow = {
      league_key: leagueFromYahoo.league_key,
      league_id: leagueFromYahoo.league_id,
      name: leagueFromYahoo.name,
      num_teams: leagueFromYahoo.num_teams,
      scoring_type: leagueFromYahoo.scoring_type,
      url: leagueFromYahoo.url || null,
      logo_url: leagueFromYahoo.logo_url || null,
      draft_status: leagueFromYahoo.draft_status || null,
      weekly_deadline: leagueFromYahoo.weekly_deadline || null,
      league_update_timestamp: leagueFromYahoo.league_update_timestamp || null,
      league_type: leagueFromYahoo.league_type || null,
      renew: leagueFromYahoo.renew || null,
      renewed: leagueFromYahoo.renewed || null,
      short_invitation_url: leagueFromYahoo.short_invitation_url || null,
      is_pro_league: leagueFromYahoo.is_pro_league || null,
      is_cash_league: leagueFromYahoo.is_cash_league || null,
      current_week: leagueFromYahoo.current_week || null,
      start_week: leagueFromYahoo.start_week || null,
      start_date: leagueFromYahoo.start_date || null,
      end_week: leagueFromYahoo.end_week || null,
      end_date: leagueFromYahoo.end_date || null,
      game_code: leagueFromYahoo.game_code || null,
      season: leagueFromYahoo.season || null,
    };

    // Upsert league data
    const { error: leagueError } = await supabase
      .from('leagues')
      .upsert(leagueToUpsert, { onConflict: 'league_key' });

    if (leagueError) throw leagueError;

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
    ] as const;

    const leagueSettingsToUpsert = leagueSettingsFields.reduce<Record<string, any>>((acc, field) => {
      if (field in leagueSettingsFromYahoo && leagueSettingsFromYahoo[field as keyof LeagueSettings] !== undefined) {
        acc[field] = leagueSettingsFromYahoo[field as keyof LeagueSettings];
      }
      return acc;
    }, {});

    // Manual upsert for league settings
    if (Object.keys(leagueSettingsToUpsert).length > 0) {
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
    } else {
      console.warn('No valid league settings data to upsert');
    }

    const rosterPositions = leagueSettingsFromYahoo.roster_positions;
    // Calculate total roster spots, excluding IR spots
    const rounds = Object.values(rosterPositions).reduce((total, positionData: any) => {
      if (positionData.roster_position && positionData.roster_position.position !== 'IR') {
        return total as number + parseInt(positionData.roster_position.count, 10);
      }
      return total;
    }, 0);

    const totalPicks = rounds as number * orderedTeams.length;

    // Ensure orderedTeams is an array of objects with team_key properties
    const draftOrder = orderedTeams.map((teamKey: string) => ({ team_key: teamKey }));
    
    // Create draft
    const { data, error } = await supabase
      .rpc('create_draft_with_picks', {
        p_league_id: leagueKey,
        p_name: draftName,
        p_rounds: rounds as number,
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