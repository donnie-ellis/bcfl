export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      draft_players: {
        Row: {
          average_cost: number | null
          average_pick: number | null
          average_round: number | null
          created_at: string | null
          draft_id: number | null
          draft_positions: Json | null
          id: number
          is_picked: boolean | null
          percent_drafted: number | null
          player_id: number | null
          updated_at: string | null
        }
        Insert: {
          average_cost?: number | null
          average_pick?: number | null
          average_round?: number | null
          created_at?: string | null
          draft_id?: number | null
          draft_positions?: Json | null
          id?: number
          is_picked?: boolean | null
          percent_drafted?: number | null
          player_id?: number | null
          updated_at?: string | null
        }
        Update: {
          average_cost?: number | null
          average_pick?: number | null
          average_round?: number | null
          created_at?: string | null
          draft_id?: number | null
          draft_positions?: Json | null
          id?: number
          is_picked?: boolean | null
          percent_drafted?: number | null
          player_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_players_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_with_adp"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          created_at: string | null
          current_pick: number | null
          draft_order: Json | null
          id: number
          league_id: string | null
          name: string
          rounds: number
          status: string | null
          total_picks: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_pick?: number | null
          draft_order?: Json | null
          id?: number
          league_id?: string | null
          name: string
          rounds: number
          status?: string | null
          total_picks: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_pick?: number | null
          draft_order?: Json | null
          id?: number
          league_id?: string | null
          name?: string
          rounds?: number
          status?: string | null
          total_picks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_league_key_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["league_key"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          progress: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          metadata?: Json | null
          progress: number
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      league_settings: {
        Row: {
          cant_cut_list: string | null
          created_at: string | null
          draft_pick_time: number | null
          draft_time: string | null
          draft_type: string | null
          has_playoff_consolation_games: boolean | null
          id: number
          is_auction_draft: boolean | null
          league_key: string
          max_teams: number | null
          num_playoff_consolation_teams: number | null
          num_playoff_teams: number | null
          persistent_url: string | null
          player_pool: string | null
          playoff_start_week: number | null
          post_draft_players: string | null
          roster_positions: Json | null
          scoring_type: string | null
          stat_categories: Json | null
          trade_end_date: string | null
          trade_ratify_type: string | null
          trade_reject_time: number | null
          updated_at: string | null
          uses_faab: boolean | null
          uses_fractional_points: boolean | null
          uses_lock_eliminated_teams: boolean | null
          uses_negative_points: boolean | null
          uses_playoff: boolean | null
          uses_playoff_reseeding: boolean | null
          waiver_rule: string | null
          waiver_time: number | null
          waiver_type: string | null
        }
        Insert: {
          cant_cut_list?: string | null
          created_at?: string | null
          draft_pick_time?: number | null
          draft_time?: string | null
          draft_type?: string | null
          has_playoff_consolation_games?: boolean | null
          id?: number
          is_auction_draft?: boolean | null
          league_key: string
          max_teams?: number | null
          num_playoff_consolation_teams?: number | null
          num_playoff_teams?: number | null
          persistent_url?: string | null
          player_pool?: string | null
          playoff_start_week?: number | null
          post_draft_players?: string | null
          roster_positions?: Json | null
          scoring_type?: string | null
          stat_categories?: Json | null
          trade_end_date?: string | null
          trade_ratify_type?: string | null
          trade_reject_time?: number | null
          updated_at?: string | null
          uses_faab?: boolean | null
          uses_fractional_points?: boolean | null
          uses_lock_eliminated_teams?: boolean | null
          uses_negative_points?: boolean | null
          uses_playoff?: boolean | null
          uses_playoff_reseeding?: boolean | null
          waiver_rule?: string | null
          waiver_time?: number | null
          waiver_type?: string | null
        }
        Update: {
          cant_cut_list?: string | null
          created_at?: string | null
          draft_pick_time?: number | null
          draft_time?: string | null
          draft_type?: string | null
          has_playoff_consolation_games?: boolean | null
          id?: number
          is_auction_draft?: boolean | null
          league_key?: string
          max_teams?: number | null
          num_playoff_consolation_teams?: number | null
          num_playoff_teams?: number | null
          persistent_url?: string | null
          player_pool?: string | null
          playoff_start_week?: number | null
          post_draft_players?: string | null
          roster_positions?: Json | null
          scoring_type?: string | null
          stat_categories?: Json | null
          trade_end_date?: string | null
          trade_ratify_type?: string | null
          trade_reject_time?: number | null
          updated_at?: string | null
          uses_faab?: boolean | null
          uses_fractional_points?: boolean | null
          uses_lock_eliminated_teams?: boolean | null
          uses_negative_points?: boolean | null
          uses_playoff?: boolean | null
          uses_playoff_reseeding?: boolean | null
          waiver_rule?: string | null
          waiver_time?: number | null
          waiver_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_settings_league_key_fkey"
            columns: ["league_key"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["league_key"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string | null
          current_week: number | null
          draft_status: string | null
          end_date: string | null
          end_week: number | null
          felo_tier: string | null
          game_code: string | null
          id: number
          is_cash_league: boolean | null
          is_finished: boolean | null
          is_plus_league: boolean | null
          is_pro_league: boolean | null
          league_id: string
          league_key: string
          league_type: string | null
          league_update_timestamp: string | null
          logo_url: string | null
          name: string
          num_teams: number | null
          renew: string | null
          renewed: string | null
          scoring_type: string | null
          season: number | null
          short_invitation_url: string | null
          start_date: string | null
          start_week: number | null
          updated_at: string | null
          url: string | null
          weekly_deadline: string | null
        }
        Insert: {
          created_at?: string | null
          current_week?: number | null
          draft_status?: string | null
          end_date?: string | null
          end_week?: number | null
          felo_tier?: string | null
          game_code?: string | null
          id?: number
          is_cash_league?: boolean | null
          is_finished?: boolean | null
          is_plus_league?: boolean | null
          is_pro_league?: boolean | null
          league_id: string
          league_key: string
          league_type?: string | null
          league_update_timestamp?: string | null
          logo_url?: string | null
          name: string
          num_teams?: number | null
          renew?: string | null
          renewed?: string | null
          scoring_type?: string | null
          season?: number | null
          short_invitation_url?: string | null
          start_date?: string | null
          start_week?: number | null
          updated_at?: string | null
          url?: string | null
          weekly_deadline?: string | null
        }
        Update: {
          created_at?: string | null
          current_week?: number | null
          draft_status?: string | null
          end_date?: string | null
          end_week?: number | null
          felo_tier?: string | null
          game_code?: string | null
          id?: number
          is_cash_league?: boolean | null
          is_finished?: boolean | null
          is_plus_league?: boolean | null
          is_pro_league?: boolean | null
          league_id?: string
          league_key?: string
          league_type?: string | null
          league_update_timestamp?: string | null
          logo_url?: string | null
          name?: string
          num_teams?: number | null
          renew?: string | null
          renewed?: string | null
          scoring_type?: string | null
          season?: number | null
          short_invitation_url?: string | null
          start_date?: string | null
          start_week?: number | null
          updated_at?: string | null
          url?: string | null
          weekly_deadline?: string | null
        }
        Relationships: []
      }
      manager_team_league: {
        Row: {
          id: number
          league_key: string
          manager_guid: string
          team_key: string
        }
        Insert: {
          id?: number
          league_key: string
          manager_guid: string
          team_key: string
        }
        Update: {
          id?: number
          league_key?: string
          manager_guid?: string
          team_key?: string
        }
        Relationships: []
      }
      managers: {
        Row: {
          created_at: string | null
          email: string | null
          felo_score: string | null
          felo_tier: string | null
          guid: string | null
          id: number
          image_url: string | null
          is_commissioner: boolean | null
          is_current_login: boolean | null
          league_keys: string[] | null
          manager_id: string
          nickname: string | null
          team_keys: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          felo_score?: string | null
          felo_tier?: string | null
          guid?: string | null
          id?: number
          image_url?: string | null
          is_commissioner?: boolean | null
          is_current_login?: boolean | null
          league_keys?: string[] | null
          manager_id: string
          nickname?: string | null
          team_keys?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          felo_score?: string | null
          felo_tier?: string | null
          guid?: string | null
          id?: number
          image_url?: string | null
          is_commissioner?: boolean | null
          is_current_login?: boolean | null
          league_keys?: string[] | null
          manager_id?: string
          nickname?: string | null
          team_keys?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      picks: {
        Row: {
          created_at: string | null
          draft_id: number
          id: number
          is_keeper: boolean | null
          is_picked: boolean | null
          pick_number: number
          picked_by: string | null
          player_id: number | null
          round_number: number
          team_key: string
          total_pick_number: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          draft_id: number
          id?: number
          is_keeper?: boolean | null
          is_picked?: boolean | null
          pick_number: number
          picked_by?: string | null
          player_id?: number | null
          round_number: number
          team_key: string
          total_pick_number: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          draft_id?: number
          id?: number
          is_keeper?: boolean | null
          is_picked?: boolean | null
          pick_number?: number
          picked_by?: string | null
          player_id?: number | null
          round_number?: number
          team_key?: string
          total_pick_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_picks_draft"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_with_adp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_team_key_fkey"
            columns: ["team_key"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_key"]
          },
        ]
      }
      player_adp: {
        Row: {
          adp: number | null
          adp_formatted: string | null
          created_at: string | null
          draft_id: number | null
          id: number
          player_id: number
          source_id: number | null
          updated_at: string | null
        }
        Insert: {
          adp?: number | null
          adp_formatted?: string | null
          created_at?: string | null
          draft_id?: number | null
          id?: number
          player_id: number
          source_id?: number | null
          updated_at?: string | null
        }
        Update: {
          adp?: number | null
          adp_formatted?: string | null
          created_at?: string | null
          draft_id?: number | null
          id?: number
          player_id?: number
          source_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_adp_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_adp_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_adp_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_with_adp"
            referencedColumns: ["id"]
          },
        ]
      }
      player_import_history: {
        Row: {
          created_at: string | null
          id: number
          import_date: string
          league_key: string
          player_count: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          import_date: string
          league_key: string
          player_count: number
        }
        Update: {
          created_at?: string | null
          id?: number
          import_date?: string
          league_key?: string
          player_count?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          ascii_first_name: string | null
          ascii_last_name: string | null
          bye_weeks: string[] | null
          created_at: string | null
          display_position: string | null
          draft_analysis: Json | null
          editorial_player_key: string | null
          editorial_team_abbr: string | null
          editorial_team_full_name: string | null
          editorial_team_key: string | null
          editorial_team_url: string | null
          eligible_positions: string[] | null
          eligible_positions_to_add: string[] | null
          first_name: string
          full_name: string
          has_player_notes: boolean | null
          headshot_size: string | null
          headshot_url: string | null
          id: number
          image_url: string | null
          injury_note: string | null
          is_keeper: Json | null
          is_undroppable: string | null
          last_name: string
          league_ownership: Json | null
          notes: string | null
          o_rank: number | null
          on_disabled_list: boolean | null
          ownership: Json | null
          percent_owned: number | null
          percent_started: number | null
          player_advanced_stats: Json | null
          player_id: string
          player_key: string
          player_notes_last_timestamp: string | null
          player_points: Json | null
          player_stats: Json | null
          position_type: string | null
          preseason_rank: number | null
          primary_position: string | null
          psr_rank: number | null
          rank: number | null
          season_stats: Json | null
          selected_position: string | null
          status: string | null
          status_full: string | null
          uniform_number: string | null
          updated_at: string | null
          url: string | null
          weekly_stats: Json | null
        }
        Insert: {
          ascii_first_name?: string | null
          ascii_last_name?: string | null
          bye_weeks?: string[] | null
          created_at?: string | null
          display_position?: string | null
          draft_analysis?: Json | null
          editorial_player_key?: string | null
          editorial_team_abbr?: string | null
          editorial_team_full_name?: string | null
          editorial_team_key?: string | null
          editorial_team_url?: string | null
          eligible_positions?: string[] | null
          eligible_positions_to_add?: string[] | null
          first_name: string
          full_name: string
          has_player_notes?: boolean | null
          headshot_size?: string | null
          headshot_url?: string | null
          id?: number
          image_url?: string | null
          injury_note?: string | null
          is_keeper?: Json | null
          is_undroppable?: string | null
          last_name: string
          league_ownership?: Json | null
          notes?: string | null
          o_rank?: number | null
          on_disabled_list?: boolean | null
          ownership?: Json | null
          percent_owned?: number | null
          percent_started?: number | null
          player_advanced_stats?: Json | null
          player_id: string
          player_key: string
          player_notes_last_timestamp?: string | null
          player_points?: Json | null
          player_stats?: Json | null
          position_type?: string | null
          preseason_rank?: number | null
          primary_position?: string | null
          psr_rank?: number | null
          rank?: number | null
          season_stats?: Json | null
          selected_position?: string | null
          status?: string | null
          status_full?: string | null
          uniform_number?: string | null
          updated_at?: string | null
          url?: string | null
          weekly_stats?: Json | null
        }
        Update: {
          ascii_first_name?: string | null
          ascii_last_name?: string | null
          bye_weeks?: string[] | null
          created_at?: string | null
          display_position?: string | null
          draft_analysis?: Json | null
          editorial_player_key?: string | null
          editorial_team_abbr?: string | null
          editorial_team_full_name?: string | null
          editorial_team_key?: string | null
          editorial_team_url?: string | null
          eligible_positions?: string[] | null
          eligible_positions_to_add?: string[] | null
          first_name?: string
          full_name?: string
          has_player_notes?: boolean | null
          headshot_size?: string | null
          headshot_url?: string | null
          id?: number
          image_url?: string | null
          injury_note?: string | null
          is_keeper?: Json | null
          is_undroppable?: string | null
          last_name?: string
          league_ownership?: Json | null
          notes?: string | null
          o_rank?: number | null
          on_disabled_list?: boolean | null
          ownership?: Json | null
          percent_owned?: number | null
          percent_started?: number | null
          player_advanced_stats?: Json | null
          player_id?: string
          player_key?: string
          player_notes_last_timestamp?: string | null
          player_points?: Json | null
          player_stats?: Json | null
          position_type?: string | null
          preseason_rank?: number | null
          primary_position?: string | null
          psr_rank?: number | null
          rank?: number | null
          season_stats?: Json | null
          selected_position?: string | null
          status?: string | null
          status_full?: string | null
          uniform_number?: string | null
          updated_at?: string | null
          url?: string | null
          weekly_stats?: Json | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          league_key: string | null
          refresh_token: string
          team_key: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          league_key?: string | null
          refresh_token: string
          team_key?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          league_key?: string | null
          refresh_token?: string
          team_key?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          draft_position: number | null
          faab_balance: string | null
          has_draft_grade: boolean | null
          league_id: string | null
          league_scoring_type: string | null
          name: string
          number_of_moves: number | null
          number_of_trades: number | null
          roster_adds: Json | null
          team_id: string
          team_key: string
          team_logos: Json | null
          updated_at: string | null
          url: string | null
          waiver_priority: string | null
        }
        Insert: {
          created_at?: string | null
          draft_position?: number | null
          faab_balance?: string | null
          has_draft_grade?: boolean | null
          league_id?: string | null
          league_scoring_type?: string | null
          name: string
          number_of_moves?: number | null
          number_of_trades?: number | null
          roster_adds?: Json | null
          team_id: string
          team_key: string
          team_logos?: Json | null
          updated_at?: string | null
          url?: string | null
          waiver_priority?: string | null
        }
        Update: {
          created_at?: string | null
          draft_position?: number | null
          faab_balance?: string | null
          has_draft_grade?: boolean | null
          league_id?: string | null
          league_scoring_type?: string | null
          name?: string
          number_of_moves?: number | null
          number_of_trades?: number | null
          roster_adds?: Json | null
          team_id?: string
          team_key?: string
          team_logos?: Json | null
          updated_at?: string | null
          url?: string | null
          waiver_priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_key_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["league_key"]
          },
        ]
      }
      users: {
        Row: {
          email: string
          id: string
          image: string | null
          name: string | null
        }
        Insert: {
          email: string
          id?: string
          image?: string | null
          name?: string | null
        }
        Update: {
          email?: string
          id?: string
          image?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      players_with_adp: {
        Row: {
          adp: number | null
          adp_formatted: string | null
          bye_weeks: string[] | null
          display_position: string | null
          draft_id: number | null
          editorial_player_key: string | null
          editorial_team_abbr: string | null
          editorial_team_full_name: string | null
          editorial_team_key: string | null
          eligible_positions: string[] | null
          first_name: string | null
          full_name: string | null
          headshot_url: string | null
          id: number | null
          is_picked: boolean | null
          last_name: string | null
          percent_drafted: number | null
          player_key: string | null
          position_type: string | null
          source_id: number | null
          status: string | null
          uniform_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_adp_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_draft_with_picks: {
        Args: {
          p_draft_order: Json
          p_league_id: string
          p_name: string
          p_ordered_teams: Json
          p_rounds: number
          p_status: string
          p_total_picks: number
        }
        Returns: {
          created_draft_id: number
          debug_info: string
        }[]
      }
      delete_draft: {
        Args: { p_draft_id: number }
        Returns: undefined
      }
      get_player_with_adp: {
        Args:
          | { p_draft_id: number; p_player_id: number }
          | { p_player_id: number }
        Returns: {
          adp: number
          adp_formatted: string
          full_name: string
          id: number
          player_key: string
          source_id: number
        }[]
      }
      remove_current_pick_column: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      submit_draft_pick: {
        Args: {
          p_draft_id: number
          p_pick_id: number
          p_picked_by: string
          p_player_id: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
