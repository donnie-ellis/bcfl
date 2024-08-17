// ./lib/types/league.types.ts

import { Database } from '@/lib/types/database.types';
import { Json } from '@/lib/types/database.types';

// Base League type from Supabase
type BaseLeague = Database['public']['Tables']['leagues']['Row'];

// Extended League type
export interface League extends BaseLeague {
  // Add any additional properties here if needed
}

// League Input type for creating or updating leagues
export type LeagueInput = Database['public']['Tables']['leagues']['Insert'];

// League Update type
export type LeagueUpdate = Database['public']['Tables']['leagues']['Update'];

// Custom types for specific use cases
export interface LeagueSummary {
  league_key: string;
  name: string;
  scoring_type: string;
  num_teams: number;
  current_week: number;
  start_week: number;
  end_week: number;
}

export interface LeagueWithTeams extends League {
  teams: string[]; // Array of team keys
}

// Enum for league status
export enum LeagueStatus {
  PRE_DRAFT = 'pre_draft',
  DRAFTING = 'drafting',
  POST_DRAFT = 'post_draft',
  IN_SEASON = 'in_season',
  POST_SEASON = 'post_season',
  COMPLETED = 'completed'
}

// Interface for league search parameters
export interface LeagueSearchParams {
  name?: string;
  scoring_type?: string;
  season?: number;
}

// Function to safely parse league logo URL
export function parseLeagueLogoUrl(json: Json): string | null {
  if (typeof json === 'string') {
    return json;
  }
  return null;
}

// Interface for league with parsed logo URL
export interface LeagueWithParsedLogo extends Omit<League, 'logo_url'> {
  logo_url: string | null;
}

// Function to parse league with logo
export function parseLeagueWithLogo(league: League): LeagueWithParsedLogo {
  return {
    ...league,
    logo_url: parseLeagueLogoUrl(league.logo_url),
  };
}

// Interface for league statistics
export interface LeagueStats {
  league_key: string;
  total_points_scored: number;
  average_points_per_team: number;
  highest_scoring_team: string;
  lowest_scoring_team: string;
}