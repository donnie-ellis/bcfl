// ./app/api/db/league/[leagueKey]/managers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ManagerData } from '@/lib/types';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

const supabase = getServerSupabaseClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueKey: string }> }
) {
  const { leagueKey } = await params;
  const managersData: ManagerData[] = await request.json();

  try {
    // Upsert managers
    for (const managerData of managersData) {
      const { error: managerError } = await supabase
        .from('managers')
        .upsert({
          guid: managerData.manager.guid,
          manager_id: managerData.manager.manager_id,
          nickname: managerData.manager.nickname,
          is_commissioner: managerData.manager.is_commissioner,
          email: managerData.manager.email,
          image_url: managerData.manager.image_url,
          felo_score: managerData.manager.felo_score,
          felo_tier: managerData.manager.felo_tier
        }, {
          onConflict: 'guid'
        });

      if (managerError) throw managerError;

      // Upsert manager_team_league relationship
      const { error: relationshipError } = await supabase
        .from('manager_team_league')
        .upsert({
          manager_guid: managerData.relationship.manager_guid,
          team_key: managerData.relationship.team_key,
          league_key: managerData.relationship.league_key
        }, {
          onConflict: 'manager_guid,team_key,league_key'
        });

      if (relationshipError) throw relationshipError;
    }

    return NextResponse.json({ message: 'Managers updated successfully' });
  } catch (error) {
    console.error('Error upserting managers:', error);
    return NextResponse.json({ error: 'Failed to upsert managers', details: error }, { status: 500 });
  }
}