// ./app/api/cron/updatePlayers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { importPlayers } from '@/lib/playersImport'
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient'

const supabase = getServerSupabaseClient();

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueKey = process.env.YAHOO_LEAGUE_ID // Make sure to set this in your environment variables

  if (!leagueKey) {
    return NextResponse.json({ error: 'League key not set' }, { status: 500 })
  }

  try {
    await importPlayers(supabase, leagueKey)
    return NextResponse.json({ message: 'Player update completed successfully' })
  } catch (error) {
    console.error('Failed to update players:', error)
    return NextResponse.json({ error: 'Failed to update players' }, { status: 500 })
  }
}
