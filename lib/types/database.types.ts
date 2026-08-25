export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
          league_id: number
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
          league_id: number
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
          league_id?: number
          name?: string
          rounds?: number
          status?: string | null
          total_picks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
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
          created_at: string
          draft_pick_time: number | null
          draft_time: string | null
          draft_type: string | null
          has_playoff_consolation_games: boolean | null
          id: number
          is_auction_draft: boolean | null
          league_id: number
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
          updated_at: string
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
          created_at?: string
          draft_pick_time?: number | null
          draft_time?: string | null
          draft_type?: string | null
          has_playoff_consolation_games?: boolean | null
          id?: never
          is_auction_draft?: boolean | null
          league_id: number
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
          updated_at?: string
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
          created_at?: string
          draft_pick_time?: number | null
          draft_time?: string | null
          draft_type?: string | null
          has_playoff_consolation_games?: boolean | null
          id?: never
          is_auction_draft?: boolean | null
          league_id?: number
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
          updated_at?: string
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
            foreignKeyName: "league_settings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          current_week: number | null
          id: number
          logo_url: string | null
          name: string
          num_teams: number | null
          season: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_week?: number | null
          id?: never
          logo_url?: string | null
          name: string
          num_teams?: number | null
          season?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_week?: number | null
          id?: never
          logo_url?: string | null
          name?: string
          num_teams?: number | null
          season?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      picks: {
        Row: {
          created_at: string
          draft_id: number
          id: number
          is_keeper: boolean | null
          is_picked: boolean | null
          pick_number: number
          picked_by: string | null
          player_id: number | null
          round_number: number
          team_id: number
          total_pick_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_id: number
          id?: never
          is_keeper?: boolean | null
          is_picked?: boolean | null
          pick_number: number
          picked_by?: string | null
          player_id?: number | null
          round_number: number
          team_id: number
          total_pick_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_id?: number
          id?: never
          is_keeper?: boolean | null
          is_picked?: boolean | null
          pick_number?: number
          picked_by?: string | null
          player_id?: number | null
          round_number?: number
          team_id?: number
          total_pick_number?: number
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
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
      players: {
        Row: {
          active: boolean | null
          age: number | null
          college: string | null
          created_at: string
          fantasy_positions: string[] | null
          first_name: string | null
          full_name: string | null
          headshot_url: string | null
          height: string | null
          id: number
          injury_status: string | null
          last_name: string | null
          number: number | null
          position: string | null
          search_rank: number | null
          sleeper_id: string
          status: string | null
          team: string | null
          updated_at: string
          weight: string | null
          years_exp: number | null
        }
        Insert: {
          active?: boolean | null
          age?: number | null
          college?: string | null
          created_at?: string
          fantasy_positions?: string[] | null
          first_name?: string | null
          full_name?: string | null
          headshot_url?: string | null
          height?: string | null
          id?: never
          injury_status?: string | null
          last_name?: string | null
          number?: number | null
          position?: string | null
          search_rank?: number | null
          sleeper_id: string
          status?: string | null
          team?: string | null
          updated_at?: string
          weight?: string | null
          years_exp?: number | null
        }
        Update: {
          active?: boolean | null
          age?: number | null
          college?: string | null
          created_at?: string
          fantasy_positions?: string[] | null
          first_name?: string | null
          full_name?: string | null
          headshot_url?: string | null
          height?: string | null
          id?: never
          injury_status?: string | null
          last_name?: string | null
          number?: number | null
          position?: string | null
          search_rank?: number | null
          sleeper_id?: string
          status?: string | null
          team?: string | null
          updated_at?: string
          weight?: string | null
          years_exp?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_at: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          invited_at?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: number
          role: string
          team_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          role?: string
          team_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          role?: string
          team_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          draft_position: number | null
          id: number
          league_id: number
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_position?: number | null
          id?: never
          league_id: number
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_position?: number | null
          id?: never
          league_id?: number
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      players_with_adp: {
        Row: {
          adp: number | null
          adp_formatted: string | null
          draft_id: number | null
          fantasy_positions: string[] | null
          first_name: string | null
          full_name: string | null
          headshot_url: string | null
          id: number | null
          injury_status: string | null
          is_picked: boolean | null
          last_name: string | null
          number: number | null
          percent_drafted: number | null
          position: string | null
          sleeper_id: string | null
          source_id: number | null
          status: string | null
          team: string | null
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
      begin_transaction: { Args: never; Returns: undefined }
      commit_transaction: { Args: never; Returns: undefined }
      create_draft_with_picks: {
        Args: {
          p_draft_order: Json
          p_league_id: number
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
      delete_draft: { Args: { p_draft_id: number }; Returns: undefined }
      remove_current_pick_column: { Args: never; Returns: undefined }
      rollback_transaction: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

