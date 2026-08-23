// ./lib/types/team.types.ts

import { Database } from '@/lib/types/database.types';

// Base Team type from Supabase
type BaseTeam = Database['public']['Tables']['teams']['Row'];

// A team member (owner/co-owner) with their profile info, for display
export interface TeamMemberSummary {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  role: 'owner' | 'co_owner';
}

// Extended Team type
export interface Team extends BaseTeam {
  members?: TeamMemberSummary[];
}

// Team Input type for creating or updating teams
export type TeamInput = Database['public']['Tables']['teams']['Insert'];

// Team Update type
export type TeamUpdate = Database['public']['Tables']['teams']['Update'];

export interface TeamWithStats extends Team {
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
}

export const possesiveTitle = (name: string) => {
  if (name.endsWith('s')) {
    return name + "'";
  } else {
    return name + "'s";
  };
};

export const getTeamLogoUrl = (team: Pick<Team, 'logo_url'> | null | undefined): string => {
  return team?.logo_url || '';
};

export const sizedTitle = (name: string) => {
  if (name.trim().length >= 16) {
    return name.trim().substring(0, 12) + '...'
  }
  return name.trim()
}
