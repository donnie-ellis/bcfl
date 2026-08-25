// ./lib/playersImport.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';
import { fetchAllSleeperPlayers } from '@/lib/sleeperPlayers';
import { PlayerInsert } from '@/lib/types/player.types';

const BATCH_SIZE = process.env.DB_IMPORT_BATCH_SIZE ? parseInt(process.env.DB_IMPORT_BATCH_SIZE) : 100;

export async function importPlayers(
  supabase: SupabaseClient<Database>,
  jobId?: string
): Promise<void> {
  try {
    if (jobId) await updateJobStatus(supabase, jobId, 'in_progress', 0);

    const players = await fetchAllSleeperPlayers();
    console.log(`Fetched ${players.length} players from Sleeper`);

    await importPlayerBatch(supabase, players, jobId);

    if (jobId) await updateJobStatus(supabase, jobId, 'complete', players.length);

    console.log(`Successfully imported/updated ${players.length} players.`);
  } catch (error) {
    console.error('Error in player import:', error);
    if (jobId) await updateJobStatus(supabase, jobId, 'error', 0);
    throw error;
  }
}

async function importPlayerBatch(
  supabase: SupabaseClient<Database>,
  players: PlayerInsert[],
  jobId: string | undefined
) {
  const playersToInsert = players.map(player => ({
    ...player,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < playersToInsert.length; i += BATCH_SIZE) {
    const batch = playersToInsert.slice(i, i + BATCH_SIZE);
    const { error: playersError } = await supabase
      .from('players')
      .upsert(batch, { onConflict: 'sleeper_id' });

    if (playersError) {
      console.error('Error upserting players:', playersError);
      if (jobId) await updateJobStatus(supabase, jobId, 'error', i);
      throw new Error('Failed to upsert players');
    }

    const currentImportedCount = i + batch.length;
    if (jobId) await updateJobStatus(supabase, jobId, 'in_progress', currentImportedCount);
    console.log(`Imported ${currentImportedCount} players`);
  }
}

async function updateJobStatus(
  supabase: SupabaseClient<Database>,
  jobId: string,
  status: 'in_progress' | 'complete' | 'error',
  progress: number
) {
  try {
    const { error } = await supabase
      .from('import_jobs')
      .upsert({ id: jobId, status, progress }, { onConflict: 'id' });

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
