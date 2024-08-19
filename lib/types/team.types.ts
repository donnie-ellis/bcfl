// ./lib/types/team.types.ts

import { Database } from '@/lib/types/database.types';
import { Manager } from './manager.types';
import { Json } from '@/lib/types/database.types';

// Base Team type from Supabase
type BaseTeam = Database['public']['Tables']['teams']['Row'];

// Interface for team logo
export interface TeamLogo {
  size: string;
  url: string;
}

// Extended Team type
export interface Team extends Omit<BaseTeam, 'team_logos'> {
  managers?: Manager[];
  team_logos: Json;
}

// Team Input type for creating or updating teams
export type TeamInput = Database['public']['Tables']['teams']['Insert'];

// Team Update type
export type TeamUpdate = Database['public']['Tables']['teams']['Update'];

// Custom types for specific use cases
export interface TeamSummary {
  team_key: string;
  name: string;
  logo_url: string;
}

export interface TeamWithStats extends Team {
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
}

// Type guard to check if a Json value conforms to TeamLogo structure
function isTeamLogoLike(value: Json): value is { size: string; url: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'size' in value &&
    'url' in value &&
    typeof value.size === 'string' &&
    typeof value.url === 'string'
  );
}

// Function to safely parse team logos
export function parseTeamLogos(json: Json): TeamLogo[] {
  if (Array.isArray(json)) {
    return json.reduce((acc: TeamLogo[], item) => {
      if (item && typeof item === 'object' && 'size' in item && 'url' in item) {
        acc.push({
          size: String(item.size || ''),
          url: String(item.url || '')
        });
      }
      return acc;
    }, []);
  }
  return [];
}

// Enum for team status
export enum TeamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Interface for team search parameters
export interface TeamSearchParams {
  name?: string;
  manager_name?: string;
  league_id?: string;
}

// Function to parse team with logos
export function parseTeamWithLogos(team: BaseTeam): Team {
  return {
    ...team,
    team_logos: team.team_logos, // Don't parse here, keep it as Json
  };
}

export const possesiveTitle = (name: string) => {
  if (name.endsWith('s')) {
    return name + "'";
  } else {
    return name + "'s";
  };
};

export const sizedTitle = (name: string) => {
  if (name.trim().length >= 16) {
    return name.trim().substring(0, 12) + '...'
  }
  return name.trim()
}