// ./lib/types.ts

export interface Player {
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
  o_rank?: number; // Overall rank
  psr_rank?: number; // Position rank
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
}

  export interface LeaguePlayers {
    league_key: string;
    players: Player[];
  }

  export interface LeagueDetails {
    league_key: string;
    league_id: string;
    name: string;
    url: string;
    draft_status: string;
    num_teams: number;
    edit_key: string;
    weekly_deadline: string;
    league_update_timestamp: string;
    scoring_type: string;
    league_type: string;
    renew: string;
    renewed: string;
    start_date: string;
    end_date: string;
    current_week: number;
    start_week: string;
    end_week: string;
    game_code: string;
    season: string;
  }
  
// ./lib/types.ts

export interface TeamLogo {
  size: string;
  url: string;
}

export interface RosterPosition {
  roster_position: {
    position: string;
    position_type?: string;
    count: number;
    is_starting_position: boolean;
  };
}

export interface LeagueSettings {
  // ... other fields ...
  roster_positions: RosterPosition[];
  // ... other fields ...
}
export interface Manager {
  manager_id: string;
  nickname: string;
  guid: string;
  is_commissioner: boolean;
  is_current_login: boolean;
  email?: string;
  image_url: string;
  felo_score?: string;
  felo_tier?: string;
}

export interface Team {
  team_key: string;
  team_id: string;
  name: string;
  is_owned_by_current_login: boolean;
  url: string;
  team_logos: TeamLogo[];
  waiver_priority: string;
  faab_balance: string;
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
}

  export interface Teams {
    league_key: string;
    teams: Team[];
  }

  export interface League {
    league_key: string;
    league_id: string;
    name: string;
    url?: string;
    draft_status?: string;
    num_teams: number;
    league_update_timestamp: string;
    scoring_type: string;
    current_week: number;
    end_week: number;
    is_finished: boolean;
    logo_url: string;
    short_invitation_url: string;
    league_type: string;
    renew: string;
    renewed: string;
    game_code: string;
    is_cash_league: boolean;
    is_plus_league: boolean;
    is_pro_league: boolean;
    season: number;
    start_date: string;
    start_week: number;
    felo_tier: string;
    end_date: string;
    weekly_deadline: string;
  }

  export interface LeagueSettings {
    draft_type: string;
    is_auction_draft: boolean;
    scoring_type: string;
    persistent_url: string;
    uses_playoff: boolean;
    has_playoff_consolation_games: boolean;
    playoff_start_week: number;
    uses_playoff_reseeding: boolean;
    uses_lock_eliminated_teams: boolean;
    num_playoff_teams: number;
    num_playoff_consolation_teams: number;
    waiver_type: string;
    waiver_rule: string;
    uses_faab: boolean;
    draft_time: string;
    draft_pick_time: number;
    post_draft_players: string;
    max_teams: number;
    waiver_time: number;
    trade_end_date: string;
    trade_ratify_type: string;
    trade_reject_time: number;
    player_pool: string;
    cant_cut_list: string;
    roster_positions: RosterPosition[];
    stat_categories: {
      stat_id: number;
      name: string;
      display_name: string;
      sort_order: string;
      position_type: string;
      stat_position_types: string[];
      is_only_display_stat: boolean;
      value: number | null;
    }[];
    uses_fractional_points: boolean;
    uses_negative_points: boolean;
  }
  export interface Draft {
    id: string;
    league_id: string;
    name: string;
    rounds: number;
    total_picks: number;
    current_pick: number;
    status: string;
    draft_order: any;  // You might want to define a more specific type for this
    created_at: string;
    updated_at: string;
    picks?: Pick[];
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
    teams?: {
      name: string;
    };
  }
  
