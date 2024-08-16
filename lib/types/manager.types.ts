// ./lib/types/manager.types.ts

import { Database } from '@/lib/types/database.types';

// Base Manager type from Supabase
type BaseManager = Database['public']['Tables']['managers']['Row'];

// Extended Manager type
export interface Manager extends BaseManager {
  // Add any additional properties here
}

// Manager Input type for creating or updating managers
export type ManagerInput = Database['public']['Tables']['managers']['Insert'];

// Manager Update type
export type ManagerUpdate = Database['public']['Tables']['managers']['Update'];

// Custom types for specific use cases
export interface ManagerSummary {
  id: number;
  nickname: string;
  email: string;
  is_commissioner: boolean;
}

export interface ManagerWithTeams extends Manager {
  teams: string[]; // Array of team keys
}

// Enum for manager roles
export enum ManagerRole {
  OWNER = 'owner',
  CO_OWNER = 'co_owner',
  COMMISSIONER = 'commissioner',
}

// Interface for manager search parameters
export interface ManagerSearchParams {
  nickname?: string;
  email?: string;
  is_commissioner?: boolean;
}

// Interface for manager statistics
export interface ManagerStats {
  manager_id: number;
  wins: number;
  losses: number;
  ties: number;
  championships: number;
}

export interface ManagerData {
  manager: Manager;
  relationship: {
    manager_guid: string;
    team_key: string;
    league_key: string;
  };
}
