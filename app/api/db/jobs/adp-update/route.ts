// ./app/api/db/jobs/adp-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  const { jobId } = await request.json();

  try {
    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    const { draftId, leagueId, scoringType, numTeams } = job.metadata;

    // Update job status
    await supabase
      .from('import_jobs')
      .update({ status: 'in_progress' })
      .eq('id', jobId);

    // Fetch ADP data
    const currentYear = new Date().getFullYear();
    const adpUrl = `https://fantasyfootballcalculator.com/api/v1/adp/${scoringType}?teams=${numTeams}&year=${currentYear}&position=all`;
    const response = await fetch(adpUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ADP data: ${response.statusText}`);
    }
    const adpData = await response.json();

    // Process and update ADP data
    const totalPlayers = adpData.players.length;
    for (let i = 0; i < totalPlayers; i++) {
      const player = adpData.players[i];
      
      // Find player
      const { data: players, error: playerError } = await supabase
        .from('players')
        .select('id, full_name, first_name, last_name, display_position, editorial_team_abbr')
        .or(`full_name.ilike.%${player.name}%,first_name.ilike.%${player.name.split(' ')[0]}%,last_name.ilike.%${player.name.split(' ').slice(-1)[0]}%`)
        .eq('display_position', player.position);

      if (playerError) throw playerError;

      let matchedPlayer = players.find(p => 
        p.full_name.toLowerCase() === player.name.toLowerCase() &&
        p.editorial_team_abbr === player.team
      ) || players[0];

      if (matchedPlayer) {
        // Upsert ADP data
        const { error: upsertError } = await supabase
          .from('player_adp')
          .upsert({
            player_id: matchedPlayer.id,
            draft_id: draftId,
            source_id: player.player_id,
            adp: player.adp,
            adp_formatted: player.adp_formatted
          }, {
            onConflict: 'player_id,draft_id,source_id',
          });

        if (upsertError) {
          console.error('Error upserting ADP data:', upsertError);
        }
      }

      // Update progress
      const progress = Math.round((i + 1) / totalPlayers * 100);
      await supabase
        .from('import_jobs')
        .update({ progress })
        .eq('id', jobId);
    }

    // Mark job as complete
    await supabase
      .from('import_jobs')
      .update({ status: 'complete', progress: 100 })
      .eq('id', jobId);

    const nextResponse = NextResponse.json({ message: 'ADP update completed successfully' });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return nextResponse
  
  } catch (error) {
    console.error('Error updating ADP:', error);
    await supabase
      .from('import_jobs')
      .update({ status: 'error', progress: 0 })
      .eq('id', jobId);
      const errorResponse = NextResponse.json({ error: 'Failed to update ADP' }, { status: 500 });
      errorResponse.headers.set('Cache-Control', 'no-store, max-age=0');
      return errorResponse;
  }
}
export const dynamic = 'force-dynamic';
