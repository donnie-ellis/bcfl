// ./app/draft/[draftId]/kiosk/page.tsx
'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, PlayerWithADP } from '@/lib/types/';
import { Pick, Player, Team } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import RoundSquares from '@/components/RoundSquares';
import CurrentPickDetails from '@/components/CurrentPickDetails';
import { toast } from "sonner";
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftHeader from '@/components/DraftHeader';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useSWR from 'swr';

type MemoizedDraft = Omit<Draft, 'picks'> & { picks: PickWithPlayerAndTeam[] };

const fetcher = (url: string) => fetch(url).then(res => res.json());
export const fetchCache = 'force-no-store';

const KioskPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();
  const [isPickSubmitting, setIsPickSubmitting] = useState<boolean>(false);

  const { data: draftData, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: picksData, mutate: mutatePicks } = useSWR<Pick[]>(
    draftData ? `/api/db/draft/${draftId}/picks` : null,
    fetcher
  );  const { data: leagueData } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams } = useSWR<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: players } = useSWR<Player[]>(`/api/db/league/${draftData?.league_id}/players`, fetcher);
  const [currentPick, setCurrentPick] = useState<PickWithPlayerAndTeam | null>(null);
  const [picks, setPicks] = useState<PickWithPlayerAndTeam[]>([]);

  const isLoading = !draftData || !leagueData || !leagueSettings || !teams || !players || !currentPick;
  
  const updatePicksAndDraft = useCallback(() => {
    if (!draftData || !picksData || !players || !teams) return;
  
    const updatedPicks: PickWithPlayerAndTeam[] = picksData.map(pick => ({
      ...pick,
      player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
      team: teams.find(t => t.team_key === pick.team_key) ?? {} as Team
    }));
  
    setPicks(updatedPicks);
  
    const updatedCurrentPick = updatedPicks.find(p => !p.is_picked) || null;
    setCurrentPick(updatedCurrentPick);
  
    if (updatedCurrentPick && draftData.current_pick !== updatedCurrentPick.total_pick_number) {
      mutateDraft({ ...draftData, current_pick: updatedCurrentPick.total_pick_number }, false);
    }
  }, [draftData, picksData, players, teams, mutateDraft]);

  const notifyPickMade = useCallback((updatedPick: Pick) => {
    if (updatedPick.is_picked && updatedPick.player_id) {
      const player = players?.find(p => p.id === updatedPick.player_id);
      const team = teams?.find(t => t.team_key === updatedPick.team_key);
      
      if (player && team) {
        toast.success(
          `${team.name} drafted ${player.full_name}`,
          {
            description: `${player.editorial_team_full_name} - ${player.display_position}`,
            duration: 5000,
          }
        );
      }
    }
  }, [players, teams]);

  useEffect(() => {
    if (!supabase || !draftId) return;

    const picksSubscription = supabase
      .channel(`picks_${draftId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId}` 
      }, (payload) => {
        const updatedPick = payload.new as Pick;
        if (updatedPick.is_picked) {
          mutatePicks();
          notifyPickMade(updatedPick);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, mutatePicks, notifyPickMade]);

useEffect(() => {
  updatePicksAndDraft();
}, [updatePicksAndDraft, picksData]);

const handleSubmitPick = async (player: PlayerWithADP) => {
  setIsPickSubmitting(true);
  if (!currentPick || !draftData) {
    toast.error("Unable to submit pick. Please try again.");
    setIsPickSubmitting(false);
    return;
  }

  try {
    const response = await fetch(`/api/db/draft/${draftId}/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pickId: currentPick.id,
        playerId: player.id
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to submit pick');
    }
    
    // Update SWR cache
    mutatePicks();
  } catch (error) {
    console.error('Error submitting pick:', error);
    toast.error("Failed to submit pick. Please try again.");
  } finally {
    setIsPickSubmitting(false);
  }
};

  const memoizedDraft = useMemo<MemoizedDraft | undefined>(() => {
    if (draftData && picks.length > 0) {
      return {
        ...draftData,
        picks: picks
      };
    }
    return undefined;
  }, [draftData, picks]);

  const currentRound = useMemo(() => {
    if (memoizedDraft && memoizedDraft.current_pick && teams) {
      return Math.ceil(memoizedDraft.current_pick / teams.length);
    }
    return 1;
  }, [memoizedDraft, teams]);

  useEffect(() => {
    if (memoizedDraft && memoizedDraft.status === 'completed') {
      router.push(`/draft/${draftId}/board`);
    }
  }, [memoizedDraft, draftId, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (memoizedDraft?.status === 'completed') {
    return (
      <Alert>
        <AlertTitle>Draft Completed</AlertTitle>
        <AlertDescription>
          The draft has been completed. You will be redirected to the draft board shortly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {leagueData && memoizedDraft && (
        <DraftHeader league={leagueData} draft={memoizedDraft} />
      )}
      <div className="flex-none w-full">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Round {currentRound}</h2>
          {memoizedDraft && leagueSettings && teams && (
            <RoundSquares
              draft={memoizedDraft}
              leagueSettings={leagueSettings}
              currentRoundOnly={true}
              isLoading={isLoading}
              teams={teams}
              currentRound={currentRound}
            />
          )}
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex">
        <div className="w-1/2 p-4">
          {memoizedDraft && currentPick && (
            <DraftedPlayers
              picks={memoizedDraft.picks}
              teamKey={currentPick.team_key}
              teamName={teams ? teams.find(team => team.team_key === currentPick.team_key)?.name: ''}
            />
          )}
        </div>
        <div className="w-1/2 p-4">
          {currentPick && leagueSettings && teams && memoizedDraft && (
            <CurrentPickDetails
              currentTeam={teams.find(team => team.team_key === currentPick.team_key)}
              currentPick={currentPick}
              previousPick={memoizedDraft.picks.find(pick => 
                memoizedDraft.current_pick !== null && 
                pick.total_pick_number === (memoizedDraft.current_pick - 1)
              ) || null}
              leagueKey={leagueData?.league_key || ''}
              draftId={draftId}
              leagueSettings={leagueSettings}
              onSubmitPick={handleSubmitPick}
              isPickSubmitting={isPickSubmitting}
              draft={memoizedDraft}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskPage;