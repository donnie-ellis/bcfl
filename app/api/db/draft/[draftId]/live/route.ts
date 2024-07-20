// ./app/api/draft/[draftId]/live/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(request: NextRequest, { params }: { params: { draftId: string } }) {
  const draftId = params.draftId;

  const stream = new ReadableStream({
    start(controller) {
      const subscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, async (payload) => {
          const draft = payload.new;
          
          // Fetch current and next pick data
          const [currentPick, nextPick] = await Promise.all([
            supabase.from('picks').select('*, teams(*)').eq('draft_id', draftId).eq('total_pick_number', draft.current_pick).single(),
            supabase.from('picks').select('*, teams(*)').eq('draft_id', draftId).eq('total_pick_number', draft.current_pick + 1).single()
          ]);

          // Calculate picks until next turn
          const userPicks = await supabase
            .from('picks')
            .select('total_pick_number')
            .eq('draft_id', draftId)
            .eq('team_key', request.headers.get('X-Team-Key'))
            .gte('total_pick_number', draft.current_pick)
            .order('total_pick_number', { ascending: true })
            .limit(1);

          const picksUntilNextTurn = userPicks.data.length > 0 
            ? userPicks.data[0].total_pick_number - draft.current_pick 
            : null;

          const data = JSON.stringify({
            currentDrafter: currentPick.data.teams.name,
            nextDrafter: nextPick.data.teams.name,
            picksUntilNextTurn
          });

          controller.enqueue(`data: ${data}\n\n`);
        })
        .subscribe();

      request.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}