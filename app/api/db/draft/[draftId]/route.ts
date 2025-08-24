// ./app/api/draft/[draftId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from "@/auth";
import { requestYahoo } from '@/lib/yahoo';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

const supabase = getServerSupabaseClient();

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
      .eq('id', parseInt(draftId))
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
      .eq('draft_id', parseInt(draftId))
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

// PUT
export async function PUT(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  // Get the current user's session
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userGuid = session.user.id;
  const { draftId } = params;

  try {
    const body = await request.json();
    const { name, use_timer, pick_seconds, status } = body;

    // Fetch the draft and league information
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('league_id')
      .eq('id', parseInt(draftId))
      .single();

    if (draftError) throw draftError;

    // Check if the user is a commissioner
    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('is_commissioner')
      .eq('guid', userGuid)
      .contains('league_keys', [draft.league_id])
      .single();

    if (managerError) {
      console.error('Error checking commissioner status:', managerError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    if (!manager || !manager.is_commissioner) {
      return NextResponse.json({ error: 'Unauthorized. Commissioner access required.' }, { status: 403 });
    }

    // Validate input
    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Draft name cannot be empty' }, { status: 400 });
    }

    if (use_timer && pick_seconds !== undefined && (pick_seconds < 10 || pick_seconds > 600)) {
      return NextResponse.json({ 
        error: 'Pick seconds must be between 10 and 600 when timer is enabled' 
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (use_timer !== undefined) {
      updateData.use_timer = use_timer;
      // If disabling timer, set it to paused
      if (!use_timer) {
        updateData.is_paused = true;
      }
    }
    
    if (pick_seconds !== undefined) {
      updateData.pick_seconds = pick_seconds;
    }
    
    if (status !== undefined) {
      updateData.status = status;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the draft
    const { data: updatedDraft, error: updateError } = await supabase
      .from('drafts')
      .update(updateData)
      .eq('id', parseInt(draftId))
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedDraft, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json({ 
      error: 'Failed to update draft', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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