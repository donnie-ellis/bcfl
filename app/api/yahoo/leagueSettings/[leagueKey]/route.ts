import { NextRequest, NextResponse } from 'next/server';
import { requestYahoo, parseLeagueSettings } from '@/lib/yahoo';

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueKey: string } }
) {
  const { leagueKey } = params;

  try {
    const path = `league/${leagueKey}/settings`;
    const data = await requestYahoo(path);
    const settings = await parseLeagueSettings(data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch league settings:', error);
    return NextResponse.json({ error: 'Failed to fetch league settings' }, { status: 500 });
  }
}
