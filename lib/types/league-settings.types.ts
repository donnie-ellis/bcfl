// ./lib/types/league-settings.types.ts

import { Database, Json } from './database.types';

// Base LeagueSettings type from Supabase
type BaseLeagueSettings = Database['public']['Tables']['league_settings']['Row'];

// Extended LeagueSettings type
export interface LeagueSettings extends Omit<BaseLeagueSettings, 'roster_positions' | 'stat_categories'> {
  roster_positions: Json;
  stat_categories: Json;
}

// LeagueSettings Input type for creating or updating league settings
export type LeagueSettingsInput = Database['public']['Tables']['league_settings']['Insert'];

// LeagueSettings Update type
export type LeagueSettingsUpdate = Database['public']['Tables']['league_settings']['Update'];

// Custom types for specific use cases
export interface RosterPosition {
  roster_position: {
    position: string;
    count: number;
    position_type?: string;
  };
}

export interface StatCategory {
  stat_id: number;
  name: string;
  display_name: string;
  sort_order: number;
  position_type: string;
  is_only_display_stat: boolean;
  value?: number;
}

// Type guard for roster positions
function isRosterPosition(value: unknown): value is RosterPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'roster_position' in value &&
    typeof value.roster_position === 'object' &&
    value.roster_position !== null &&
    'position' in value.roster_position &&
    'count' in value.roster_position &&
    typeof value.roster_position.position === 'string' &&
    typeof value.roster_position.count === 'number'
  );
}

// Type guard for stat categories
function isStatCategory(value: unknown): value is StatCategory {
  return (
    typeof value === 'object' &&
    value !== null &&
    'stat_id' in value &&
    'name' in value &&
    'display_name' in value &&
    'sort_order' in value &&
    'position_type' in value &&
    'is_only_display_stat' in value
  );
}

// Function to safely parse roster positions
export function parseRosterPositions(json: Json): RosterPosition[] {
  if (Array.isArray(json)) {
    return json.reduce((acc: RosterPosition[], item) => {
      if (isRosterPosition(item)) {
        acc.push(item);
      }
      return acc;
    }, []);
  }
  return [];
}

// Function to safely parse stat categories
export function parseStatCategories(json: Json): StatCategory[] {
  if (Array.isArray(json)) {
    return json.reduce((acc: StatCategory[], item) => {
      if (isStatCategory(item)) {
        acc.push(item);
      }
      return acc;
    }, []);
  }
  return [];
}

// Interface for league settings with parsed complex fields
export interface LeagueSettingsWithParsedFields extends Omit<LeagueSettings, 'roster_positions' | 'stat_categories'> {
  roster_positions: RosterPosition[];
  stat_categories: StatCategory[];
}

// Function to parse league settings
export function parseLeagueSettings(settings: LeagueSettings): LeagueSettingsWithParsedFields {
  return {
    ...settings,
    roster_positions: parseRosterPositions(settings.roster_positions),
    stat_categories: parseStatCategories(settings.stat_categories),
  };
}

// Enums for various league settings
export enum DraftType {
  SNAKE = 'snake',
  AUCTION = 'auction',
  LINEAR = 'linear',
}

export enum ScoringType {
  HEAD_TO_HEAD = 'head',
  ROTISSERIE = 'roto',
  POINTS = 'points',
}

export enum WaiverRule {
  CONTINUAL_ROLLING_LIST = 'continual',
  WEEKLY_ROLLING_LIST = 'weekly',
  FAAB = 'faab',
}

// Interface for league settings summary
export interface LeagueSettingsSummary {
  league_key: string;
  name: string;
  scoring_type: ScoringType;
  num_teams: number;
  draft_type: DraftType;
  waiver_rule: WaiverRule;
  uses_faab: boolean;
  trade_end_date: string | null;
}