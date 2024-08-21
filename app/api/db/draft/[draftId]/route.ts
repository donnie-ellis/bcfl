// ./app/api/draft/[draftId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { getServerAuthSession } from "@/auth";
import { requestYahoo } from '@/lib/yahoo';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET
export async function GET(request: NextRequest, { params }: { params: { draftId: string } }) {
  const { draftId } = params;

  try {
    // Fetch draft data
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    // Fetch picks for this draft, including team data
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        teams:team_key (
          name
        )
      `)
      .eq('draft_id', draftId)
      .order('total_pick_number', { ascending: true });

    if (picksError) throw picksError;

    // Combine draft data with picks
    const draftWithPicks = {
      ...draft,
      picks: picks
    };

    return NextResponse.json(draftWithPicks, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;

  // Check if the user is authenticated
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.rpc('delete_draft', { p_draft_id: parseInt(draftId) });

    if (error) throw error;

    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}

// TODO: Move this to a yahoo api call
// Helper function to verify if the calling user is a commissioner
async function checkCommissioner(leagueKey: string): Promise<boolean> {
  try {
    const path = `league/${leagueKey}/teams`;
    const data = await requestYahoo(path);
    const teams = data.fantasy_content.league[1].teams;

    for (const key in teams) {
      if (key !== 'count') {
        const team = teams[key].team[0];
        const managers = team.find((item: any) => item.managers)?.managers;

        if (managers) {
          const currentUserManager = managers.find((manager: any) => 
            manager.manager.is_current_login === '1'
          );

          if (currentUserManager && currentUserManager.manager.is_commissioner === '1') {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking commissioner status:', error);
    return false;
  }
}