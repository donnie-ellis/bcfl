// ./api/yahoo/league/[leagueKey]/managers.route.ts

import { NextResponse } from 'next/server';
import { requestYahoo, parseTeamData } from '@/lib/yahoo';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(
  request: Request,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    // Fetch league data from Yahoo
    const leagueData = await requestYahoo(`league/${leagueKey}/teams`);
    
    // Parse the team data, which includes manager information
    const teams = await parseTeamData(leagueData);

    // Extract managers and their relationships with teams
    const managersData = teams.flatMap(team => 
      team.managers.map(manager => ({
        manager: {
          manager_id: manager.manager_id,
          nickname: manager.nickname,
          guid: manager.guid,
          email: manager.email,
          image_url: manager.image_url,
          felo_score: manager.felo_score,
          felo_tier: manager.felo_tier,
          is_commissioner: manager.is_commissioner
        },
        relationship: {
          manager_guid: manager.guid,
          team_key: team.team_key,
          league_key: leagueKey,
        }
      }))
    );

    // Upsert managers
    const { error: managerError } = await supabase
      .from('managers')
      .upsert(
        managersData.map(m => m.manager),
        { onConflict: 'guid', ignoreDuplicates: false }
      );

    if (managerError) {
      console.error('Error upserting managers:', managerError);
      return NextResponse.json({ error: 'Failed to store managers' }, { status: 500 });
    }

    // Insert manager-team-league relationships
    const { error: relationshipError } = await supabase
      .from('manager_team_league')
      .upsert(
        managersData.map(m => m.relationship),
        { onConflict: ['manager_guid', 'team_key', 'league_key'], ignoreDuplicates: true }
      );

    if (relationshipError) {
      console.error('Error inserting manager-team-league relationships:', relationshipError);
      return NextResponse.json({ error: 'Failed to store manager-team-league relationships' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Managers and relationships stored successfully' });
  } catch (error) {
    console.error('Error fetching or processing league data:', error);
    return NextResponse.json({ error: 'Failed to fetch or process league data' }, { status: 500 });
  }
}