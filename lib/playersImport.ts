// ./lib/playersImport.ts
import { getServerSupabaseClient } from './serverSupabaseClient';
import { fetchAllPlayers, fetchPlayerDetails } from '@/lib/yahoo';
import { PlayerInsert, Player } from '@/lib/types/';

const BATCH_SIZE = 100;

export async function importPlayers(leagueKey: string, jobId?: string): Promise<void> {
  const supabase = getServerSupabaseClient();
  try {
    if (jobId) await updateJobStatus(jobId, 'in_progress', 0);

    let start = 0;
    let allPlayers: Player[] = [];
    let totalImported = 0;

    while (true) {
      const { players, nextStart } = await fetchAllPlayers(leagueKey, start);
      allPlayers = allPlayers.concat(players);

      if (players.length > 0) {
        await importPlayerBatch(players, jobId, totalImported, allPlayers.length);
        totalImported += players.length;
      }

      if (nextStart === null) {
        break;
      }
      start = nextStart;

      if (jobId) {
        await updateJobStatus(jobId, 'in_progress', Math.floor((totalImported / allPlayers.length) * 100));
      }
    }

    if (jobId) await updateJobStatus(jobId, 'complete', 100);

    console.log(`Successfully imported/updated ${allPlayers.length} players.`);
    await recordSuccessfulImport(leagueKey, allPlayers.length);

  } catch (error) {
    console.error('Error in player import:', error);
    if (jobId) await updateJobStatus(jobId, 'error', 0);
    throw error;
  }
}


async function importPlayerBatch(players: Player[], jobId: string | undefined, importedCount: number, totalPlayers: number) {
  const supabase = getServerSupabaseClient();
  const playersToInsert: PlayerInsert[] = players.map(player => ({
    player_key: player.player_key,
    player_id: player.player_id.toString(),
    full_name: player.full_name,
    first_name: player.first_name,
    last_name: player.last_name,
    editorial_team_abbr: player.editorial_team_abbr,
    display_position: player.display_position,
    position_type: player.position_type,
    eligible_positions: player.eligible_positions,
    status: player.status,
    editorial_player_key: player.editorial_player_key,
    editorial_team_key: player.editorial_team_key,
    editorial_team_full_name: player.editorial_team_full_name,
    bye_weeks: player.bye_weeks,
    uniform_number: player.uniform_number,
    image_url: player.image_url,
    is_undroppable: player.is_undroppable ? 'true' : 'false',
    headshot_url: player.headshot_url,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Upsert players in batches
  for (let i = 0; i < playersToInsert.length; i += BATCH_SIZE) {
    const batch = playersToInsert.slice(i, i + BATCH_SIZE);
    const { error: playersError } = await supabase
      .from('players')
      .upsert(batch, { onConflict: 'player_key' });

    if (playersError) {
      console.error('Error upserting players:', playersError);
      if (jobId) await updateJobStatus(jobId, 'error', Math.floor((importedCount / totalPlayers) * 100));
      throw new Error('Failed to upsert players');
    }

    const progress = Math.floor(((importedCount + i + batch.length) / totalPlayers) * 100);
    if (jobId) await updateJobStatus(jobId, 'in_progress', progress);
    console.log(`Imported ${importedCount + i + batch.length} of ${totalPlayers} players (${progress}%)`);
  }
}

async function recordSuccessfulImport(leagueKey: string, playerCount: number) {
  const supabase = getServerSupabaseClient();
  try {
    await supabase.from('player_import_history').insert({
      league_key: leagueKey,
      player_count: playerCount,
      import_date: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to record successful import:', error);
  }
}

async function updateJobStatus(jobId: string, status: 'in_progress' | 'complete' | 'error', progress: number, continuationToken?: number | null) {
  const supabase = getServerSupabaseClient();
  try {
    const updateData: any = { id: jobId, status, progress };
    if (continuationToken !== undefined) {
      updateData.metadata = { continuationToken };
    }

    const { error } = await supabase
      .from('import_jobs')
      .upsert(updateData, { onConflict: 'id' });

    if (error) {
      console.error('Error updating job status:', error);
    }
  } catch (error) {
    console.error('Unexpected error updating job status:', error);
  }
}

export async function getJobStatus(jobId: string) {
  const supabase = getServerSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('status, progress, metadata')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching job status:', error);
    return null;
  }
}

export async function resumeImport(leagueKey: string, jobId: string, continuationToken: number) {
  await importPlayers(leagueKey, jobId);
}