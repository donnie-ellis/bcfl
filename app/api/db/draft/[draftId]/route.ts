// ./app/api/draft/[draftId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerAuthSession } from "@/auth";
import { requestYahoo } from '@/lib/yahoo';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

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

    console.log('Fetched draft data:', draftWithPicks);  // Add this line for debugging

    return NextResponse.json(draftWithPicks);
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const draftId = parseInt(params.draftId, 10);

  if (isNaN(draftId)) {
    return NextResponse.json({ error: 'Invalid draft ID' }, { status: 400 });
  }

  // Check if the user is logged in
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch the draft to get the league key
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('league_id')
      .eq('id', draftId)
      .single();

    if (draftError) {
      console.error('Error fetching draft:', draftError);
      if (draftError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Error fetching draft' }, { status: 500 });
    }

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Check if the user is a commissioner of the league
    const leagueKey = draft.league_id;
    const isCommissioner = await checkCommissioner(leagueKey);

    if (!isCommissioner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Proceed with draft deletion
    const { error } = await supabase.rpc('delete_draft', { p_draft_id: draftId });

    if (error) {
      console.error('Error deleting draft:', error);
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to delete draft', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Unexpected error deleting draft:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}

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