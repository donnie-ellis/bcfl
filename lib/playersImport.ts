// ./lib/playersImport.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';
import { fetchAllPlayers } from '@/lib/yahoo';
import { PlayerInsert } from '@/lib/types/';

const BATCH_SIZE = process.env.DB_IMPORT_BATCH_SIZE ? parseInt(process.env.DB_IMPORT_BATCH_SIZE) : 100;
const YAHOO_PLAYER_REQUEST_SIZE = process.env.YAHOO_PLAYER_REQUEST_SIZE ? parseInt(process.env.YAHOO_PLAYER_REQUEST_SIZE) : 25;

export async function importPlayers(
  supabase: SupabaseClient<Database>,
  leagueKey: string,
  jobId?: string
): Promise<void> {
  try {
    if (jobId) await updateJobStatus(supabase, jobId, 'in_progress', 0);

    let start = 0;
    let totalImported = 0;

    while (true) {
      const { players, nextStart } = await fetchAllPlayers(leagueKey, start, YAHOO_PLAYER_REQUEST_SIZE);
      console.log(`Received ${players.length} players, nextStart: ${nextStart}`);

      if (players.length > 0) {
        console.log(`Beginning import of ${players.length} players`);
        await importPlayerBatch(supabase, players, jobId, totalImported);
        totalImported += players.length;
        
        if (jobId) {
          console.log(`Updating job status: ${totalImported} players imported`);
          await updateJobStatus(supabase, jobId, 'in_progress', totalImported);
        }
        
        console.log(`Imported ${totalImported} players so far`);
      }

      if (nextStart === null) {
        console.log('No more players to fetch, breaking the loop');
        break;
      }
      start = nextStart;
    }

    if (jobId) {
      console.log(`Import complete, updating job status to complete`);
      await updateJobStatus(supabase, jobId, 'complete', totalImported);
    }

    console.log(`Successfully imported/updated ${totalImported} players.`);
    await recordSuccessfulImport(supabase, leagueKey, totalImported);

  } catch (error) {
    console.error('Error in player import:', error);
    if (jobId) await updateJobStatus(supabase, jobId, 'error', 0);
    throw error;
  }
}

async function importPlayerBatch(
  supabase: SupabaseClient<Database>,
  players: PlayerInsert[],
  jobId: string | undefined,
  importedCount: number
) {
  console.log('Importing players: ', players.length);
  const playersToInsert = players.map(player => {
    const { id, ...playerWithoutId } = player;
    return {
      ...playerWithoutId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  for (let i = 0; i < playersToInsert.length; i += BATCH_SIZE) {
    const batch = playersToInsert.slice(i, i + BATCH_SIZE);
    const { error: playersError } = await supabase
      .from('players')
      .upsert(batch, { onConflict: 'player_key' });

    if (playersError) {
      console.error('Error upserting players:', playersError);
      if (jobId) await updateJobStatus(supabase, jobId, 'error', importedCount + i);
      throw new Error('Failed to upsert players');
    }

    const currentImportedCount = importedCount + i + batch.length;
    if (jobId) await updateJobStatus(supabase, jobId, 'in_progress', currentImportedCount);
    console.log(`Imported ${currentImportedCount} players`);
  }
}

async function recordSuccessfulImport(
  supabase: SupabaseClient<Database>,
  leagueKey: string,
  playerCount: number
) {
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

async function updateJobStatus(
  supabase: SupabaseClient<Database>,
  jobId: string,
  status: 'in_progress' | 'complete' | 'error',
  progress: number,
  continuationToken?: number | null
) {
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

export async function getJobStatus(
  supabase: SupabaseClient<Database>,
  jobId: string
) {
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

export async function resumeImport(
  supabase: SupabaseClient<Database>,
  leagueKey: string,
  jobId: string,
  continuationToken: number
) {
  await importPlayers(supabase, leagueKey, jobId);
}
