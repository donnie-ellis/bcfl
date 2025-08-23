// app/api/db/draft/[draftId]/timer/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';
import { getServerAuthSession } from '@/auth';
import TimerManager from '@/lib/TimerManager';

const supabase = getServerSupabaseClient();

export default async function POST(request: NextRequest, { params }: {params: { draftId: string } }) {
    const draftId = params.draftId;

      // Get the current user's session
      const session = await getServerAuthSession();
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    
      const userGuid = session.user.id;
    
      try {
        // Fetch the draft and league information
        const { data: draft, error: draftError } = await supabase
          .from('drafts')
          .select('league_id')
          .eq('id', parseInt(draftId))
          .single();
    
        if (draftError) throw draftError;

        const { data: manager, error } = await supabase
            .from('managers')
            .select('is_commissioner')
            .eq('guid', userGuid)
            .contains('league_keys', [draft.league_id])
            .single();

        if (error) {
            console.error('Error checking commissioner status:', error);
            return false;
        }
        if (!manager || !manager.is_commissioner) {
            return NextResponse.json({ error: 'You are not authorized to manage the timer' }, { status: 403 });
        }
        const timerManager = new TimerManager(supabase);
        const result = await timerManager.pauseTimer(draftId, userGuid);
        return NextResponse.json({ status: 204 });
    } catch (error) {
        console.error('Error pausing timer:', error);
        return NextResponse.json({ error: 'Failed to pause timer' }, { status: 500 });
    }
}