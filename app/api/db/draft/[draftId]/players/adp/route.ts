// ./app/api/db/draft/[draftId]/players/adp/route.ts

import { NextRequest, NextResponse, after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getServerSupabaseAdminClient } from '@/lib/serverSupabaseClient';
import { isCommissioner } from '@/lib/auth/authz';
import { Database } from '@/lib/types/database.types';

// fantasyfootballcalculator.com's position codes don't all match the DB's
// Sleeper-derived `position` values (e.g. kicker is "PK" there, "K" here).
// Without this, every kicker (and any other aliased position) fails the
// exact position filter below and silently ends up with no ADP match.
const ADP_POSITION_ALIASES: Record<string, string> = {
  PK: 'K',
};

// POST
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { scoringType, numTeams } = await request.json();
  const supabase = await createClient();

  // Check if the user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if the user is a commissioner
  if (!(await isCommissioner(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
  }

  const jobId = uuidv4();
  const adminSupabase = getServerSupabaseAdminClient();

  await adminSupabase.from('import_jobs').insert({
    id: jobId,
    status: 'in_progress',
    progress: 0
  });

  // Matching every ADP player against the players table is a lot of
  // sequential round trips and can take minutes, especially against a slow
  // local Postgres. Do it in the background via after() (same pattern as
  // the Sleeper player import in app/api/db/draft/route.ts) instead of
  // holding the request open for the whole run, so a slow environment or
  // a request/proxy timeout can't silently truncate the job partway
  // through with no error recorded.
  after(() =>
    runAdpImport(adminSupabase, jobId, draftId, scoringType, numTeams).catch(error => {
      console.error('Error updating ADP:', error);
    })
  );

  return NextResponse.json({ jobId, message: 'ADP update job started' });
}

async function runAdpImport(
  supabase: SupabaseClient<Database>,
  jobId: string,
  draftId: string,
  scoringType: string,
  numTeams: number
) {
  try {
    const currentYear = new Date().getFullYear();
    const adpUrl = `https://fantasyfootballcalculator.com/api/v1/adp/${scoringType}?teams=${numTeams}&year=${currentYear}&position=all`;

    const response = await fetch(adpUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ADP data: ${response.statusText}`);
    }
    const adpData = await response.json();

    const totalPlayers = adpData.players.length;
    for (let i = 0; i < totalPlayers; i++) {
      const player = adpData.players[i];

      // Isolate each player's match/upsert so one bad row (a transient DB
      // hiccup, an unexpected null field, etc.) can't abort the whole job
      // and leave every later player permanently unmatched.
      try {
        await matchAndUpsertPlayer(supabase, player, draftId);
      } catch (playerError) {
        console.error(`Error matching ADP for ${player.name}:`, playerError);
      }

      const progress = Math.round((i + 1) / totalPlayers * 100);
      await supabase
        .from('import_jobs')
        .update({ progress })
        .eq('id', jobId);
    }

    await supabase
      .from('import_jobs')
      .update({ status: 'complete', progress: 100 })
      .eq('id', jobId);
  } catch (error) {
    console.error('Error updating ADP:', error);
    // Without this the job stays 'in_progress' forever and the client-side
    // poller (DraftHeader.tsx) spins indefinitely instead of surfacing a
    // retryable error.
    await supabase
      .from('import_jobs')
      .update({ status: 'error' })
      .eq('id', jobId);
    throw error;
  }
}

async function matchAndUpsertPlayer(
  supabase: SupabaseClient<Database>,
  player: any,
  draftId: string
) {
  const position = ADP_POSITION_ALIASES[player.position] ?? player.position;

  // Find player using a more robust search
  const { data: players, error: playerError } = await supabase
    .from('players')
    .select('id, full_name, first_name, last_name, position, team')
    .or(`full_name.ilike.%${player.name}%,first_name.ilike.%${player.name.split(' ')[0]}%,last_name.ilike.%${player.name.split(' ').slice(-1)[0]}%`)
    .eq('position', position);

  if (playerError) throw playerError;

  let matchedPlayer = null;

  if (players && players.length > 0) {
    // Try to find an exact match first
    matchedPlayer = players.find(p =>
      p.full_name?.toLowerCase() === player.name.toLowerCase() &&
      p.team === player.team
    );

    // If no exact match, use a scoring system
    if (!matchedPlayer) {
      const scoredPlayers = players.map(p => ({
        ...p,
        score: calculateMatchScore(p, player, position)
      }));

      scoredPlayers.sort((a, b) => b.score - a.score);
      matchedPlayer = scoredPlayers[0];
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
}

function calculateMatchScore(dbPlayer: any, adpPlayer: any, normalizedPosition: string): number {
  let score = 0;

  // Full name exact match (case-insensitive)
  if (dbPlayer.full_name?.toLowerCase() === adpPlayer.name.toLowerCase()) {
    score += 10;
  }

  // First name match
  if (dbPlayer.first_name?.toLowerCase() === adpPlayer.name.split(' ')[0].toLowerCase()) {
    score += 3;
  }

  // Last name match
  if (dbPlayer.last_name?.toLowerCase() === adpPlayer.name.split(' ').slice(-1)[0].toLowerCase()) {
    score += 3;
  }

  // Position match
  if (dbPlayer.position === normalizedPosition) {
    score += 2;
  }

  // Team match
  if (dbPlayer.team === adpPlayer.team) {
    score += 2;
  }

  return score;
}
