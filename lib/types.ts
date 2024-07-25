// ./lib/types.ts

export interface Player {
  id: number;
  player_key: string;
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  editorial_team_abbr: string;
  display_position: string;
  position_type: string;
  eligible_positions: string[];
  status: string;
  editorial_player_key: string;
  editorial_team_key: string;
  editorial_team_full_name: string;
  bye_weeks: Array<{ week: string }> | null;
  uniform_number: string;
  image_url: string;
  injury_note: string;
  headshot_url: string;
  notes?: string;
  selected_position?: string;
  percent_started?: number;
  percent_owned?: number;
  has_player_notes: boolean;
  player_notes_last_timestamp?: Date;
  preseason_rank?: number;
  weekly_stats?: any;
  season_stats?: any;
  average_pick?: number;
  average_round?: number;
  percent_drafted?: number;
  status_full?: string;
  on_disabled_list?: boolean;
  is_undroppable?: boolean;
  player_stats?: any;
  player_advanced_stats?: any;
  player_points?: any;
  draft_analysis?: {
    average_pick?: number;
    average_round?: number;
    average_cost?: number;
    percent_drafted?: number;
  };
  league_ownership?: {
    owned_by_team_key?: string;
    ownership_type?: string;
  };
  rank?: number;
  o_rank?: number;
  psr_rank?: number;
  ownership?: {
    teams_owned?: number;
    leagues_owned?: number;
    leagues_total?: number;
    percent_owned?: number;
    value_month?: number;
    value_season?: number;
    value_14_days?: number;
    value_last_month?: number;
    value_to_date?: number;
  };
  is_drafted?: boolean;
}

export interface League {
  league_key: string;
  league_id: string;
  name: string;
  url?: string;
  logo_url: string;
  draft_status?: string;
  num_teams: number;
  league_update_timestamp: string;
  scoring_type: string;
  current_week: number;
  start_week: number;
  end_week: number;
  is_finished: boolean;
}

export interface LeagueSettings {
  draft_type: string;
  is_auction_draft: boolean;
  scoring_type: string;
  uses_playoff: boolean;
  playoff_start_week: number;
  uses_playoff_reseeding: boolean;
  uses_lock_eliminated_teams: boolean;
  num_playoff_teams: number;
  num_playoff_consolation_teams: number;
  has_playoff_consolation_games: boolean;
  uses_faab: boolean;
  waiver_type: string;
  waiver_rule: string;
  uses_fractional_points: boolean;
  uses_negative_points: boolean;
}

export interface Team {
  team_key: string;
  team_id: string;
  name: string;
  url: string;
  team_logos: Array<{ size: string; url: string }>;
  waiver_priority: number;
  number_of_moves: number;
  number_of_trades: number;
  roster_adds: {
    coverage_type: string;
    coverage_value: number;
    value: string;
  };
  league_scoring_type: string;
  has_draft_grade: boolean;
  managers: Array<{
    manager_id: string;
    nickname: string;
    guid: string;
    is_commissioner: boolean;
    email?: string;
    image_url: string;
  }>;
}

export interface Draft {
  id: string;
  league_id: string;
  name: string;
  rounds: number;
  total_picks: number;
  current_pick: number;
  status: string;
  draft_order: any;
  created_at: string;
  updated_at: string;
  picks: Pick[];
}

export interface Pick {
  id: string;
  draft_id: string;
  player_id: string | null;
  pick_number: number;
  round_number: number;
  total_pick_number: number;
  is_keeper: boolean;
  is_picked: boolean;
  team_key: string;
  created_at: string;
  updated_at: string;
  team?: {
    name: string;
  };
}