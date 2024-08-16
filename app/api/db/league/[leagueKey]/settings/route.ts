// ./app/api/db/league/[leagueKey]/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LeagueSettings } from '@/lib/types';
import { Database } from '@/lib/types/database.types';

const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;
  const body: LeagueSettings = await request.json();

  try {
    // Prepare the data for upsert
    const upsertData = {
      league_key: leagueKey,
      draft_type: body.draft_type,
      is_auction_draft: body.is_auction_draft,
      scoring_type: body.scoring_type,
      persistent_url: body.persistent_url,
      uses_playoff: body.uses_playoff,
      has_playoff_consolation_games: body.has_playoff_consolation_games,
      playoff_start_week: body.playoff_start_week,
      uses_playoff_reseeding: body.uses_playoff_reseeding,
      uses_lock_eliminated_teams: body.uses_lock_eliminated_teams,
      num_playoff_teams: body.num_playoff_teams,
      num_playoff_consolation_teams: body.num_playoff_consolation_teams,
      waiver_type: body.waiver_type,
      waiver_rule: body.waiver_rule,
      uses_faab: body.uses_faab,
      draft_time: body.draft_time,
      draft_pick_time: body.draft_pick_time,
      post_draft_players: body.post_draft_players,
      max_teams: body.max_teams,
      waiver_time: body.waiver_time,
      trade_end_date: body.trade_end_date,
      trade_ratify_type: body.trade_ratify_type,
      trade_reject_time: body.trade_reject_time,
      player_pool: body.player_pool,
      cant_cut_list: body.cant_cut_list,
      roster_positions: JSON.stringify(body.roster_positions),
      stat_categories: JSON.stringify(body.stat_categories),
      uses_fractional_points: body.uses_fractional_points,
      uses_negative_points: body.uses_negative_points
    };

    const { data, error } = await supabase
      .from('league_settings')
      .upsert(upsertData, {
        onConflict: 'league_key',
      });

    if (error) throw error;

    return NextResponse.json({ message: 'League settings updated successfully' });
  } catch (error) {
    console.error('Error upserting league settings:', error);
    return NextResponse.json({ error: 'Failed to upsert league settings', details: error }, { status: 500 });
  }
}

export const PUT = POST;