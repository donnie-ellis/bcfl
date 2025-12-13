// ./app/api/yahoo/league/[leagueKey]/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo, parseLeagueSettings } from '@/lib/yahoo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueKey: string }> }
) {
  const { leagueKey } = await params;

  try {
    const data = await requestYahoo(`league/${leagueKey}/settings`);
    const leagueSettings = await parseLeagueSettings(data);

    return NextResponse.json(leagueSettings);
  } catch (error) {
    console.error('Error fetching league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}