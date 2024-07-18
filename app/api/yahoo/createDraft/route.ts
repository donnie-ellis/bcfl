// ./app/api/yahoo/createDraft/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from "@/auth";
import { createClient } from '@supabase/supabase-js';
import { requestYahoo, parseTeamData, parseLeagueSettings } from '@/lib/yahoo';
import { LeagueSettings, Team } from '@/lib/types';
import { ensureLeagueExists } from '@/lib/supabase';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// ./app/api/yahoo/createDraft/route.ts

export async function POST(request: NextRequest) {
    const session = await getServerAuthSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  
    const { leagueKey, draftName, orderedTeams } = await request.json();
  
    try {
      // Check if a draft with the same name already exists for this league
      const { data: existingDraft, error: existingDraftError } = await supabase
        .from('drafts')
        .select('id')
        .eq('league_id', leagueKey)
        .eq('name', draftName)
        .single();
  
      if (existingDraftError && existingDraftError.code !== 'PGRST116') {
        throw existingDraftError;
      }
  
      if (existingDraft) {
        return NextResponse.json({ error: 'A draft with this name already exists for this league. Please choose a unique name.' }, { status: 400 });
      }
  
      // Fetch league settings
      const settingsData = await requestYahoo(`league/${leagueKey}/settings`);
      const leagueSettings: LeagueSettings = await parseLeagueSettings(settingsData);
  
      // Ensure the league exists in our database
      await ensureLeagueExists(leagueKey, {
        league_id: leagueKey.split('.').pop() || '',
        name: leagueSettings.name || 'Unknown League',
        num_teams: orderedTeams.length,
        // Add other league properties as needed
      }, orderedTeams);
  
      // Calculate total rounds
      const totalRounds = leagueSettings.roster_positions.reduce((sum, pos) => 
        pos.position !== 'IR' ? sum + pos.count : sum, 0);
  
      const numTeams = orderedTeams.length;
  
      // Prepare ordered teams data
      const orderedTeamsData = orderedTeams.map(team => ({
        team_key: team.team_key,
        name: team.name,
        managers: team.managers.map(manager => manager.nickname)
      }));
  
      const { data, error } = await supabase.rpc('create_draft_with_picks', {
        p_league_id: leagueKey,
        p_name: draftName,
        p_rounds: totalRounds,
        p_total_picks: totalRounds * numTeams,
        p_draft_order: orderedTeamsData,
        p_status: 'pending',
        p_ordered_teams: orderedTeamsData
      });
  
      if (error) throw error;
  
      if (!data || data.length === 0) {
        throw new Error('No data returned from create_draft_with_picks');
      }
  
      const newDraftId = data[0].created_draft_id;
  
      // Start player import process
      const importJobId = await startPlayerImport(leagueKey, newDraftId);
  
      return NextResponse.json({ draftId: newDraftId, importJobId });
    } catch (error) {
      console.error('Error creating draft:', error);
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
  }
  
  // ... rest of the file remains the same
async function startPlayerImport(leagueKey: string, draftId: number) {
  // In a real implementation, you would start a background job here
  // For this example, we'll just return a mock job ID
  return `import_${leagueKey}_${draftId}`;
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  // In a real implementation, you would check the status of the background job
  // For this example, we'll just return a mock progress
  const progress = Math.floor(Math.random() * 100);
  const status = progress === 100 ? 'complete' : 'in_progress';

  return NextResponse.json({ jobId, status, progress });
}