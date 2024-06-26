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
    is_commissioner: string;
    email: string;
    image_url: string;
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
    roster_adds: {
      coverage_type: string;
      coverage_value: number;
      value: number;
    };
    league_scoring_type: string;
    draft_position: number;
    has_draft_grade: boolean;
    managers: Manager[];
    // Add any other team properties you need
  }

  export interface Teams {
    league_key: string;
    teams: Team[];
  }

  