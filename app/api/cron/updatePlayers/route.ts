// ./app/api/cron/updatePlayers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { importPlayers } from '@/lib/playersImport'
import { getServerSupabaseAdminClient } from '@/lib/serverSupabaseClient'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServerSupabaseAdminClient();
    await importPlayers(supabase)
    return NextResponse.json({ message: 'Player update completed successfully' })
  } catch (error) {
    console.error('Failed to update players:', error)
    return NextResponse.json({ error: 'Failed to update players' }, { status: 500 })
  }
}
