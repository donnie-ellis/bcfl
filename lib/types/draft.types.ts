// ./lib/types/draft.types.ts

import { Database } from '@/lib/types/database.types';
import { Pick } from './pick.types';
import { Team } from './team.types';
import { Json } from '@/lib/types/database.types';

// Base Draft type from Supabase
type BaseDraft = Database['public']['Tables']['drafts']['Row'];

// Extended Draft type
export interface Draft extends BaseDraft {
  picks: Pick[];
}

// Draft with extended picks
export interface DraftWithExtendedPicks extends Omit<Draft, 'picks'> {
  picks: Pick[];
}

// Draft Input type for creating or updating drafts
export type DraftInput = Database['public']['Tables']['drafts']['Insert'];

// Draft Update type
export type DraftUpdate = Database['public']['Tables']['drafts']['Update'];

// Custom types for specific use cases
export interface DraftSummary {
  id: number;
  name: string;
  league_id: string;
  status: string;
  current_pick: number;
  total_picks: number;
}

export interface DraftWithTeams extends Draft {
  teams: Team[];
}

// Enum for draft status
export enum DraftStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

// Interface for draft settings
export interface DraftSettings {
  draft_type: string;
  snake: boolean;
  time_per_pick: number;
  rounds: number;
}

// Type guard for draft order
export function isDraftOrder(value: Json): value is { [key: string]: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(v => typeof v === 'number')
  );
}

// Function to safely parse draft order
export function parseDraftOrder(json: Json): { [key: string]: number } | null {
  if (isDraftOrder(json)) {
    return json;
  }
  return null;
}