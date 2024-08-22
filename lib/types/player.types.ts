// ./lib/types/player.types.ts

import { Database } from '@/lib/types/database.types';
import { Json } from '@/lib/types/database.types';

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

// PlayerInsert type for inserting players into Supabase
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];

// PlayerWithADP type from Supabase view
export type PlayerWithADP = Database['public']['Views']['players_with_adp']['Row'];

// Custom types for specific use cases
export interface PlayerSummary {
  id: number;
  full_name: string;
  position: string;
  team: string;
  bye_week: string;
  adp: number | null;
}

export interface PlayerStats {
  player_id: number;
  season: number;
  stats: Json;
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

// Interface for player ranking
export interface PlayerRanking {
  player_id: number;
  rank: number;
  tier?: number;
}

// Interface for draft analysis
export interface DraftAnalysis {
  average_pick: number;
  average_round: number;
  percent_drafted: number;
  average_cost?: number;
}

// Type guard to check if a Json value conforms to DraftAnalysis structure
function isDraftAnalysisLike(value: Json): value is { [K in keyof DraftAnalysis]: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'average_pick' in value &&
    'average_round' in value &&
    'percent_drafted' in value &&
    typeof value.average_pick === 'number' &&
    typeof value.average_round === 'number' &&
    typeof value.percent_drafted === 'number'
  );
}

// Function to safely parse draft analysis from Json
export function parseDraftAnalysis(json: Json): DraftAnalysis | null {
  if (isDraftAnalysisLike(json)) {
    return {
      average_pick: json.average_pick,
      average_round: json.average_round,
      percent_drafted: json.percent_drafted,
      average_cost: json.average_cost,
    };
  }
  return null;
}

// Function to parse the status information
export const formatStatus = (statusAbbr: string | null): string => {
  if (!statusAbbr) return "Active";
  switch (statusAbbr) {
    case "D": return "Doubtful";
    case "IR": return "Injured Reserve";
    case "NA": return "Inactive";
    case "NFI-A": return "Non Football Injury";
    case "PUP-P": return "Physically Unable to Perform";
    case "PUP-R": return "Physically Unable to Perform";
    case "Q": return "Questionable";
    case "SUSP": return "Suspended";
    default: return "Active";
  }
}


// Interface for player with parsed draft analysis
export interface PlayerWithParsedDraftAnalysis extends Omit<Player, 'draft_analysis'> {
  draft_analysis: DraftAnalysis | null;
}

// Function to parse player with draft analysis
export function parsePlayerWithDraftAnalysis(player: Player): PlayerWithParsedDraftAnalysis {
  return {
    ...player,
    draft_analysis: parseDraftAnalysis(player.draft_analysis),
  };
}

// Interface for player comparison
export interface PlayerComparison {
  player1: Player;
  player2: Player;
  comparisonStats: {
    [key: string]: {
      player1Value: number;
      player2Value: number;
      difference: number;
    };
  };
}