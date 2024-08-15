// ./lib/types/pick.types.ts

import { Database } from '@/lib/types/database.types';
import { Player, Team } from '@/lib/types/'; // Assuming you have these types defined

// Base Pick type from Supabase
type BasePick = Database['public']['Tables']['picks']['Row'];

// Extended Pick type
export interface Pick extends BasePick {
  player: Player | null;
  team: Team | null;
}

// Pick Input type for creating or updating picks
export type PickInput = Database['public']['Tables']['picks']['Insert'];

// Pick Update type
export type PickUpdate = Database['public']['Tables']['picks']['Update'];

// DraftPlayer type from Supabase
export type DraftPlayer = Database['public']['Tables']['draft_players']['Row'];

// PlayerADP type from Supabase
export type PlayerADP = Database['public']['Tables']['player_adp']['Row'];

// Custom types for specific use cases
export interface PickWithPlayerAndTeam extends BasePick {
  player: Player;
  team: Team;
}

export interface PickSummary {
  id: number;
  round_number: number;
  pick_number: number;
  total_pick_number: number;
  player_name: string;
  team_name: string;
  position: string;
}

// Enum for pick status
export enum PickStatus {
  PENDING = 'pending',
  PICKED = 'picked',
  SKIPPED = 'skipped',
}

// Interface for pick submission
export interface PickSubmission {
  pickId: number;
  playerId: number;
  draftId: number;
}

// Interface for pick response after submission
export interface PickResponse {
  success: boolean;
  message: string;
  pick?: Pick;
}