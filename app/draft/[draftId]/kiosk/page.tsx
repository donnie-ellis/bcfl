// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftStatus from '@/components/DraftStatus';
import PlayerDetails from '@/components/PlayerDetails';
import { League, Draft, LeagueSettings, Player, Team, Pick } from '@/lib/types';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { toast } from "sonner";
import DraftHeader from '@/components/DraftHeader';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { debounce } from 'lodash';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPickSubmitting, setIsPickSubmitting] = useState(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());

  const { data: draftData, error: draftError } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher, { refreshInterval: 0 });
  const { data: leagueData, error: leagueError } = useSWRImmutable<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings, error: settingsError } = useSWRImmutable<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams, error: teamsError } = useSWRImmutable<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: team, error: teamError } = useSWRImmutable<Team>(draftData ? `/api/yahoo/user/league/${draftData.league_id}/team` : null, fetcher);
  const { data: currentPick, error: currentPickError } = useSWR<Pick>(`/api/db/draft/${draftId}/pick`, fetcher, { refreshInterval: 0 });

  const debouncedSetLastUpdateTimestamp = useCallback(
    debounce(() => setLastUpdateTimestamp(Date.now()), 500),
    []
  );

  const memoizedDraft = useMemo(() => draftData, [draftData]);
  const memoizedPicks = useMemo(() => memoizedDraft?.picks || [], [memoizedDraft?.picks]);

  useEffect(() => {
    if (draftId && supabase) {
      const draftSubscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, (payload) => {
          // Update only necessary fields
          if (draftData) {
            Object.assign(draftData, {
              current_pick: payload.new.current_pick,
              status: payload.new.status
            });
          }
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
          if (draftData) {
            draftData.picks = draftData.picks.map(pick => 
              pick.id === payload.new.id ? { ...pick, ...payload.new } : pick
            );
          }
          debouncedSetLastUpdateTimestamp();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(draftSubscription);
        supabase.removeChannel(picksSubscription);
      };
    }
  }, [draftId, supabase, debouncedSetLastUpdateTimestamp, draftData]);

  useEffect(() => {
    if (memoizedDraft && memoizedDraft.status === 'completed') {
      router.push(`/draft/${draftId}/board`);
    }
  }, [memoizedDraft, draftId, router]);

  const handlePlayerSelect = useCallback((player: Player) => {
    setSelectedPlayer(player);
  }, []);

  const isCurrentUserPick = currentPick?.team_key === team?.team_key;

  const handleSubmitPick = async () => {
    setIsPickSubmitting(true);
    if (!selectedPlayer || !currentPick || !draftData) {
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
          playerId: selectedPlayer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit pick');
      }

      toast.success(`You've drafted ${selectedPlayer.full_name}!`);

      setSelectedPlayer(null);
      debouncedSetLastUpdateTimestamp();
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    } finally {
      setIsPickSubmitting(false);
    }
  };

  const MemoizedPlayersList = useMemo(() => (
    <PlayersList
      leagueKey={memoizedDraft?.league_id || ''}
      draft={memoizedDraft}
      draftId={draftId}
      onPlayerSelect={handlePlayerSelect}
    />
  ), [memoizedDraft, draftId, handlePlayerSelect]);

  const MemoizedDraftedPlayers = useMemo(() => (
    draftData && leagueSettings && team && (
      <DraftedPlayers
        picks={memoizedPicks}
        teamKey={team.team_key}
        teamName={teams?.find(team => team.team_key === team.team_key)?.name}
      />
    )
  ), [draftData, leagueSettings, team, memoizedPicks, teams]);

  if (draftError || leagueError || settingsError || teamsError || teamError || currentPickError) {
    return <div>Error loading draft data. Please try again.</div>;
  }

  if (!draftData || !leagueData || !leagueSettings || !teams || !team || !currentPick) {
    return <div>Loading...</div>;
  }

  if (draftData.status === 'completed') {
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
      <DraftHeader league={leagueData} draft={draftData} />
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/4 p-2 overflow-hidden flex flex-col">
          {MemoizedPlayersList}
        </div>
        
        <div className="w-1/2 p-2 overflow-auto flex flex-col gap-y-4">
          <DraftStatus
            draft={draftData}
            leagueSettings={leagueSettings}
            teams={teams}
            team={team}
          />
          <SubmitPickButton
            isCurrentUserPick={isCurrentUserPick}
            selectedPlayer={selectedPlayer}
            currentPick={currentPick}
            onSubmitPick={handleSubmitPick}
            isPickSubmitting={isPickSubmitting}
          />
          <PlayerDetails 
            player={selectedPlayer} 
          />
        </div>

        <div className="w-1/4 p-2 overflow-hidden flex flex-col">
          {MemoizedDraftedPlayers}
        </div>
      </div>
    </div>
  );
};

export default DraftPage;