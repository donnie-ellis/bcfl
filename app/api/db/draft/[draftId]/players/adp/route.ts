// ./app/api/db/draft/[draftId]/players/adp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getServerAuthSession } from "@/auth";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// POST
export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;
  const { leagueId, scoringType, numTeams } = await request.json();

  // Check if the user is authenticated
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if the user is a commissioner for this league
    const { data: isCommissioner, error: commissionerError } = await supabase
      .from('managers')
      .select('is_commissioner')
      .eq('guid', session.user.id)
      .contains('league_keys', [leagueId])
      .single();

    if (commissionerError) throw commissionerError;

    if (!isCommissioner || !isCommissioner.is_commissioner) {
      return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
    }
    // Get current year
    const currentYear = new Date().getFullYear();

    // Construct ADP API URL
    const adpUrl = `https://fantasyfootballcalculator.com/api/v1/adp/${scoringType}?teams=${numTeams}&year=${currentYear}&position=all`;
    
    // Create a job to track progress
    const jobId = uuidv4();
    await supabase.from('import_jobs').insert({
      id: jobId,
      status: 'in_progress',
      progress: 0
    });

    // Fetch ADP data
    const response = await fetch(adpUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ADP data: ${response.statusText}`);
    }
    const adpData = await response.json();
    
    // Update player_adp table
    const totalPlayers = adpData.players.length;
    for (let i = 0; i < totalPlayers; i++) {
      const player = adpData.players[i];
      
      // Find player using a more forgiving search
      const { data: players, error: playerError } = await supabase
        .from('players')
        .select('id, full_name, first_name, last_name, display_position, editorial_team_abbr')
        .or(`full_name.ilike.%${player.name}%,first_name.ilike.%${player.name.split(' ')[0]}%,last_name.ilike.%${player.name.split(' ').slice(-1)[0]}%`)
        .eq('display_position', player.position);

      if (playerError) throw playerError;

      let matchedPlayer = null;

      if (players && players.length > 0) {
        // Try to find an exact match first
        matchedPlayer = players.find(p => 
          p.full_name.toLowerCase() === player.name.toLowerCase() &&
          p.editorial_team_abbr === player.team
        );

        // If no exact match, use the first result
        if (!matchedPlayer) {
          matchedPlayer = players[0];
        }
      }

      if (matchedPlayer) {
        // Upsert ADP data
        const { error: upsertError } = await supabase
          .from('player_adp')
          .upsert({
            player_id: matchedPlayer.id,
            draft_id: parseInt(draftId),
            source_id: player.player_id,
            adp: player.adp,
            adp_formatted: player.adp_formatted
          }, {
            onConflict: 'player_id,draft_id,source_id',
          });

        if (upsertError) {
          console.error('Error upserting ADP data:', upsertError);
        }
      } else {
        console.warn(`No matching player found for: ${player.name} (${player.position}, ${player.team})`);
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

    return NextResponse.json({ jobId, message: 'ADP update job started' });
  } catch (error) {
    console.error('Error updating ADP:', error);
    return NextResponse.json({ error: 'Failed to update ADP' }, { status: 500 });
  }
}
