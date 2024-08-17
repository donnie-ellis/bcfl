// ./lib/playersImport.ts
import { getServerSupabaseClient } from './serverSupabaseClient';
import { fetchAllPlayers, fetchPlayerDetails } from '@/lib/yahoo';
import { PlayerInsert, Player } from '@/lib/types/';

export async function importPlayers(leagueKey: string, jobId?: string): Promise<void> {
  const supabase = getServerSupabaseClient();
  try {
    if (jobId) await updateJobStatus(jobId, 'in_progress', 0);

    console.log('Starting to fetch players...');
    const allPlayers = await fetchAllPlayers(leagueKey);
    const totalPlayers = allPlayers.length;

    console.log(`Fetched ${totalPlayers} players. Starting database import...`);

    // Upsert players in batches to avoid overwhelming the database
    const batchSize = 100;
    let importedCount = 0;
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);
      const playersToInsert: PlayerInsert[] = batch.map(player => ({
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
        is_undroppable: player.is_undroppable ? 'true' : 'false', // Convert boolean to string
        headshot_url: player.headshot_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Add any other fields that are required by your Supabase schema
        // If a field is optional in Supabase but not present in the player object, you can omit it
      }));

      const { error: playersError } = await supabase
        .from('players')
        .upsert(playersToInsert, { onConflict: 'player_key' });

      if (playersError) {
        console.error('Error upserting players:', playersError);
        if (jobId) await updateJobStatus(jobId, 'error', Math.floor((importedCount / totalPlayers) * 100));
        throw new Error('Failed to upsert players');
      }

      importedCount += batch.length;
      const progress = Math.floor((importedCount / totalPlayers) * 100);
      if (jobId) await updateJobStatus(jobId, 'in_progress', progress);
      console.log(`Imported ${importedCount} of ${totalPlayers} players (${progress}%)`);
    }

    if (jobId) await updateJobStatus(jobId, 'complete', 100);

    console.log(`Successfully imported/updated ${totalPlayers} players.`);

    // Optional: Record the successful import in a separate table
    await recordSuccessfulImport(leagueKey, totalPlayers);

  } catch (error) {
    console.error('Error in player import:', error);
    if (jobId) await updateJobStatus(jobId, 'error', 0);
    throw error; // Re-throw the error for the caller to handle
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
    // Don't throw here, as this is a non-critical operation
  }
}
async function updateJobStatus(jobId: string, status: 'in_progress' | 'complete' | 'error', progress: number) {
  const supabase = getServerSupabaseClient();
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

export async function getJobStatus(jobId: string) {
  const supabase = getServerSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('status, progress')
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