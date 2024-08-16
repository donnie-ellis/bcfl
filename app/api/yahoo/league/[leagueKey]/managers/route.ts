// ./app/api/yahoo/league/[leagueKey]/managers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerAuthSession } from "@/auth";
import { requestYahoo } from '@/lib/yahoo';
import { ManagerData } from '@/lib/yahoo.types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const session = await getServerAuthSession();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leagueKey } = params;

  try {
    // Fetch managers data from Yahoo
    const data = await requestYahoo(`league/${leagueKey}/teams`);
    const teams = data.fantasy_content.league[1].teams;

    const managersData: ManagerData[] = [];

    for (const key in teams) {
      if (key !== 'count') {
        const team = teams[key].team[0];
        const teamKey = team.find((item: any) => item.team_key)?.team_key;
        const managers = team.find((item: any) => item.managers)?.managers;

        if (managers) {
          managers.forEach((managerData: any) => {
            const manager = managerData.manager;
            managersData.push({
              manager: {
                manager_id: manager.manager_id,
                nickname: manager.nickname,
                guid: manager.guid,
                is_commissioner: manager.is_commissioner === '1',
                email: manager.email,
                image_url: manager.image_url,
                felo_score: manager.felo_score,
                felo_tier: manager.felo_tier
              },
              relationship: {
                manager_guid: manager.guid,
                team_key: teamKey,
                league_key: leagueKey
              }
            });
          });
        }
      }
    }

    return NextResponse.json(managersData);
  } catch (error) {
    console.error('Failed to fetch managers:', error);
    return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 });
  }
}

// POST
// TODO: This is not used anymore I think.  Get rid of it if not.
export async function POST(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const session = await getServerAuthSession();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leagueKey } = params;

  try {
    // Fetch managers data from Yahoo
    const data = await requestYahoo(`league/${leagueKey}/teams`);
    const teams = data.fantasy_content.league[1].teams;

    const managersData: ManagerData[] = [];

    for (const key in teams) {
      if (key !== 'count') {
        const team = teams[key].team[0];
        const teamKey = team.find((item: any) => item.team_key)?.team_key;
        const managers = team.find((item: any) => item.managers)?.managers;

        if (managers) {
          managers.forEach((managerData: any) => {
            const manager = managerData.manager;
            managersData.push({
              manager: {
                manager_id: manager.manager_id,
                nickname: manager.nickname,
                guid: manager.guid,
                is_commissioner: manager.is_commissioner === '1',
                email: manager.email,
                image_url: manager.image_url,
                felo_score: manager.felo_score,
                felo_tier: manager.felo_tier
              },
              relationship: {
                manager_guid: manager.guid,
                team_key: teamKey,
                league_key: leagueKey
              }
            });
          });
        }
      }
    }

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
    console.error('Failed to update managers:', error);
    return NextResponse.json({ error: 'Failed to update managers' }, { status: 500 });
  }
}