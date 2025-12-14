import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

interface JobMetadata {
  draftId: number;
  leagueId: string;
  scoringType: string;
  numTeams: number;
}

interface AdpPlayer {
  name: string;
  position: string;
  team: string;
  player_id: number;
  adp: number;
  adp_formatted: string;
}

interface AdpResponse {
  players: AdpPlayer[];
}

function isJobMetadata(metadata: unknown): metadata is JobMetadata {
  return (
    metadata != null &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    'draftId' in metadata &&
    typeof metadata.draftId === 'number' &&
    'leagueId' in metadata &&
    typeof metadata.leagueId === 'string' &&
    'scoringType' in metadata &&
    typeof metadata.scoringType === 'string' &&
    'numTeams' in metadata &&
    typeof metadata.numTeams === 'number'
  );
}

const supabase = getServerSupabaseClient();

export async function POST(request: NextRequest) {
  const { jobId } = await request.json();

  try {
    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*, metadata')
      .eq('id', jobId)
      .single();

    if (jobError || !job) throw jobError || new Error('Job not found');

    // Validate metadata
    if (!isJobMetadata(job.metadata)) {
      throw new Error('Invalid metadata: expected an object with draftId, leagueId, scoringType, and numTeams');
    }

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
    const adpData = await response.json() as AdpResponse;

    // Process and update ADP data
    const totalPlayers = adpData.players.length;
    for (let i = 0; i < totalPlayers; i++) {
      const player = adpData.players[i];

      // Find player
      const { data: players, error: playerError } = await supabase
        .from('players')
        .select('id, full_name, first_name, last_name, display_position, editorial_team_abbr')
        .or(
          `full_name.ilike.%${player.name}%,first_name.ilike.%${player.name.split(' ')[0]}%,last_name.ilike.%${player.name.split(' ').slice(-1)[0]}%`
        )
        .eq('display_position', player.position);

      if (playerError) throw playerError;
      if (!players.length) {
        console.warn(`No player found for ${player.name}`);
        continue;
      }

      let matchedPlayer = players.find(
        (p) =>
          p.full_name.toLowerCase() === player.name.toLowerCase() &&
          p.editorial_team_abbr === player.team
      ) || players[0];

      // Upsert ADP data
      const { error: upsertError } = await supabase
        .from('player_adp')
        .upsert(
          {
            player_id: matchedPlayer.id,
            draft_id: draftId,
            source_id: Number(player.player_id),
            adp: Number(player.adp),
            adp_formatted: String(player.adp_formatted),
          },
          {
            onConflict: ['player_id', 'draft_id', 'source_id'] as unknown as string,
          }
        );

      if (upsertError) {
        console.error('Error upserting ADP data:', upsertError);
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
    nextResponse.headers.set('Cache-Control', 'no-store, max-age=0');
    return nextResponse;
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