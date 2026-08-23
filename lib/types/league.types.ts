// ./lib/types/league.types.ts

import { Database } from '@/lib/types/database.types';

// Base League type from Supabase
type BaseLeague = Database['public']['Tables']['leagues']['Row'];

// Extended League type
export interface League extends BaseLeague {
  // Add any additional properties here if needed
}

// League Input type for creating or updating the league
export type LeagueInput = Database['public']['Tables']['leagues']['Insert'];

// League Update type
export type LeagueUpdate = Database['public']['Tables']['leagues']['Update'];
