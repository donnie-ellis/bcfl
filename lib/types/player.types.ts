// ./lib/types/player.types.ts

import { Database } from '@/lib/types/database.types';

// Base Player type from Supabase
type BasePlayer = Database['public']['Tables']['players']['Row'];

// Player Input type for creating or updating players
export type PlayerInput = Database['public']['Tables']['players']['Insert'];

// Player Update type
export type PlayerUpdate = Database['public']['Tables']['players']['Update'];

// Extended Player type
export interface Player extends BasePlayer {
  adp?: number;
  adp_formatted?: string;
  is_drafted?: boolean;
  average_draft_position?: number;
}

// PlayerInsert type for inserting players into Supabase (from the Sleeper import)
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];

// PlayerWithADP type from Supabase view
export type PlayerWithADP = Database['public']['Views']['players_with_adp']['Row'];

export interface EnhancedPlayerWithADP extends PlayerWithADP {
  is_drafted: boolean;
}

// Custom types for specific use cases
export interface PlayerSummary {
  id: number;
  full_name: string | null;
  position: string | null;
  team: string | null;
  adp: number | null;
}

// Enum for player positions
export enum PlayerPosition {
  QB = 'QB',
  RB = 'RB',
  WR = 'WR',
  TE = 'TE',
  K = 'K',
  DEF = 'DEF',
}

// Interface for player search parameters
export interface PlayerSearchParams {
  name?: string;
  position?: PlayerPosition;
  team?: string;
  draftedStatus?: 'drafted' | 'undrafted' | 'all';
}

// Function to format a player's Sleeper status/injury_status for display.
// Sleeper's own status field is already a readable word (Active, Inactive,
// Injured Reserve, etc); this mostly guards against null/empty values and
// normalizes a couple of common short codes for injury_status.
export const formatStatus = (status: string | null): string => {
  if (!status) return 'Active';
  switch (status) {
    case 'Questionable': return 'Questionable';
    case 'Doubtful': return 'Doubtful';
    case 'Out': return 'Out';
    case 'IR': return 'Injured Reserve';
    case 'PUP': return 'Physically Unable to Perform';
    case 'Sus': return 'Suspended';
    default: return status;
  }
}
