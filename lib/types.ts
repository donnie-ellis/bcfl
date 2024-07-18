// ./lib/types.ts

export interface Player {
    player_key: string;
    player_id: string;
    name: {
      full: string;
      first: string;
      last: string;
    };
    editorial_team_abbr: string;
    display_position: string;
    position_type: string;
    eligible_positions: string[];
    status: string;
    editorial_player_key: string;
    editorial_team_key: string;
    editorial_team_full_name: string;
    bye_weeks: string[];
    uniform_number: string;
    image_url: string;
    headshot: string;
    headshot_size: string;
    average_pick: number;
    average_round: number;
    percent_drafted: number;
    average_cost: number;
    draft_positions: {
      min: number;
      max: number;
      average: number;
    }  
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
  
  export interface Manager {
    manager_id: string;
    nickname: string;
    guid: string;
    is_commissioner: boolean;
    email: string;
    image_url: string;
    is_current_login: boolean;
    felo_score?: string;
    felo_tier?: string;
  }

  export interface TeamLogo {
    size: string;
    url: string;
  }

  export interface Team {
    team_key: string;
    team_id: string;
    name: string;
    url: string;
    team_logos: { size: string; url: string }[];
    waiver_priority: number;
    number_of_moves: number;
    number_of_trades: number;
    league_scoring_type: string;
    draft_position: number;
    has_draft_grade: boolean;
    managers: Manager[];
    is_owned_by_current_login?: boolean;
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
    roster_positions: {
      position: string;
      position_type: string;
      count: number;
      is_starting_position: boolean;
    }[];
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
