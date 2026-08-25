// ./lib/types/manager.types.ts
//
// Yahoo-era "managers" (linked by GUID) are replaced by Supabase Auth
// profiles + team_members. A "manager" in the UI is now just a profile
// with role 'manager' (as opposed to 'commissioner').

import { Database } from '@/lib/types/database.types';

// Base Profile type from Supabase
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Profile Input type for creating or updating profiles
export type ProfileInput = Database['public']['Tables']['profiles']['Insert'];

// Profile Update type
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Base TeamMember type from Supabase
export type TeamMember = Database['public']['Tables']['team_members']['Row'];

// TeamMember Input type for creating or updating team_members
export type TeamMemberInput = Database['public']['Tables']['team_members']['Insert'];

export interface TeamMemberWithProfile extends TeamMember {
  profile: Profile;
}

export const isCommissioner = (profile: Pick<Profile, 'role'> | null | undefined): boolean =>
  profile?.role === 'commissioner';
