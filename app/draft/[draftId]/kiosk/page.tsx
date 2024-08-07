'use client'
// ./app/draft/[draftId]/kiosk/page.tsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, Player, Team, Pick } from '@/lib/types';
import RoundSquares from '@/components/RoundSquares';
import CurrentPickDetails from '@/components/CurrentPickDetails';
import { toast } from "sonner";
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftHeader from '@/components/DraftHeader';
import useSWR from 'swr';
import { debounce } from 'lodash';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const KioskPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();
  const [isPickSubmitting, setIsPickSubmitting] = useState<boolean>(false);
  const lastUpdateTimestampRef = useRef<number>(Date.now());

  const setLastUpdateTimestamp = useCallback(() => {
    lastUpdateTimestampRef.current = Date.now();
  }, []);

  const debouncedSetLastUpdateTimestamp = useMemo(
    () => debounce(setLastUpdateTimestamp, 500),
    [setLastUpdateTimestamp]
  );

  const { data: draftData, error: draftError, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher, { refreshInterval: 5000 });
  const { data: leagueData, error: leagueError } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings, error: settingsError } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams, error: teamsError } = useSWR<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: currentPick, error: currentPickError, mutate: mutateCurrentPick } = useSWR<Pick>(`/api/db/draft/${draftId}/pick`, fetcher, { refreshInterval: 5000 });
  
  const { data: playerData, error: playerError } = useSWR<Player[]>(
    draftData ? `/api/db/players?ids=${draftData.picks.map(pick => pick.player_id).filter(Boolean).join(',')}` : null,
    fetcher
  );

  const isLoading = !draftData || !leagueData || !leagueSettings || !teams || !currentPick || !playerData;

  const memoizedDraft = useMemo(() => {
    if (draftData && playerData && teams) {
      const playerMap = new Map(playerData.map(player => [player.id, player]));
      const teamMap = new Map(teams.map(team => [team.team_key, team]));
      return {
        ...draftData,
        picks: draftData.picks.map(pick => ({
          ...pick,
          player: pick.player_id ? playerMap.get(pick.player_id) || null : null,
          team: teamMap.get(pick.team_key) || null
        }))
      };
    }
    return draftData;
  }, [draftData, playerData, teams]);

  const memoizedPicks = useMemo(() => memoizedDraft?.picks || [], [memoizedDraft?.picks]);

  React.useEffect(() => {
    if (draftId && supabase) {
      const draftSubscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, (payload) => {
          mutateDraft((prevDraft) => prevDraft ? {
            ...prevDraft,
            current_pick: payload.new.current_pick,
            status: payload.new.status
          } : prevDraft);
          debouncedSetLastUpdateTimestamp();
        })
        .subscribe();

      const picksSubscription = supabase
        .channel('picks_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, (payload) => {
          mutateDraft((prevDraft) => prevDraft ? {
            ...prevDraft,
            picks: prevDraft.picks.map(pick => 
              pick.id === payload.new.id ? { ...pick, ...payload.new } : pick
            )
          } : prevDraft);
          mutateCurrentPick();
          debouncedSetLastUpdateTimestamp();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(draftSubscription);
        supabase.removeChannel(picksSubscription);
      };
    }
  }, [draftId, supabase, debouncedSetLastUpdateTimestamp, mutateDraft, mutateCurrentPick]);

  const handleSubmitPick = async (player: Player) => {
    setIsPickSubmitting(true);
    if (!currentPick || !memoizedDraft) {
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
          playerId: player.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit pick');
      }

      toast.success(`${player.full_name} has been drafted!`);
      mutateDraft();
      mutateCurrentPick();
      debouncedSetLastUpdateTimestamp();
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    } finally {
      setIsPickSubmitting(false);
    }
  };

  const MemoizedDraftedPlayers = useMemo(() => (
    memoizedDraft && leagueSettings && currentPick ? (
      <DraftedPlayers
        draftId={draftId}
        picks={memoizedPicks}
        leagueSettings={leagueSettings}
        teamKey={currentPick.team_key}
        lastUpdateTimestamp={lastUpdateTimestampRef.current}
      />
    ) : null
  ), [memoizedDraft, leagueSettings, currentPick, draftId, memoizedPicks]);

  if (draftError || leagueError || settingsError || teamsError || currentPickError || playerError) {
    return <div>Error loading draft data. Please try again.</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {leagueData && memoizedDraft && (
        <DraftHeader league={leagueData} draft={memoizedDraft} />
      )}
      <div className="flex-none w-full">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Current Round</h2>
          <RoundSquares
            draft={memoizedDraft}
            leagueSettings={leagueSettings}
            currentRoundOnly={true}
            isLoading={isLoading}
            teams={teams}
          />
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex">
        <div className="w-1/2 p-4">
          {MemoizedDraftedPlayers}
        </div>
        <div className="w-1/2 p-4">
          {currentPick && leagueSettings && teams && (
            <CurrentPickDetails
              currentTeam={teams.find(team => team.team_key === currentPick.team_key) || null}
              currentPick={currentPick}
              previousPick={memoizedPicks.find(pick => pick.total_pick_number === memoizedDraft?.current_pick - 1) as Pick & { player: Player } | null}
              leagueKey={leagueData?.league_key || ''}
              draftId={draftId}
              leagueSettings={leagueSettings}
              onSubmitPick={handleSubmitPick}
              isPickSubmitting={isPickSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskPage;