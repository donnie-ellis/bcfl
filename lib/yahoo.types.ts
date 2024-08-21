// ./lib/yahoo.types.ts

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
  weekly_deadline?: string;
  league_type?: string;
  renew?: string;
  renewed?: string;
  short_invitation_url?: string;
  is_pro_league?: boolean;
  is_cash_league?: boolean;
  start_date?: string;
  end_date?: string;
  game_code?: string;
  season?: number;
}

export interface LeagueSettings {
  draft_type: string;
  is_auction_draft: boolean;
  scoring_type: string;
  persistent_url?: string;
  uses_playoff: boolean;
  has_playoff_consolation_games?: boolean;
  playoff_start_week: number;
  uses_playoff_reseeding: boolean;
  uses_lock_eliminated_teams: boolean;
  num_playoff_teams: number;
  num_playoff_consolation_teams: number;
  waiver_type: string;
  waiver_rule: string;
  uses_faab: boolean;
  draft_time?: string;
  draft_pick_time?: number;
  post_draft_players?: string;
  max_teams?: number;
  waiver_time?: number;
  trade_end_date?: string;
  trade_ratify_type?: string;
  trade_reject_time?: number;
  player_pool?: string;
  cant_cut_list?: string;
  roster_positions: any;
  stat_categories: any;
  uses_fractional_points: boolean;
  uses_negative_points: boolean;
}

export interface Team {
  team_key: string;
  team_id: string;
  name: string;
  url: string;
  team_logos: Array<{ size: string; url: string }>;
  waiver_priority: string;
  number_of_moves: number;
  number_of_trades: number;
  roster_adds: {
    coverage_type: string;
    coverage_value: number;
    value: string;
  };
  league_scoring_type: string;
  has_draft_grade: boolean;
  managers: Manager[];
  faab_balance: string;
  is_owned_by_current_login?: boolean;
}

export interface Manager {
  manager_id: string;
  nickname: string;
  guid: string;
  is_commissioner: boolean;
  email?: string;
  image_url: string;
  felo_score: string;
  felo_tier: string;
}

export interface ManagerData {
  manager: Manager;
  relationship: {
    manager_guid: string;
    team_key: string;
    league_key: string;
  };
}