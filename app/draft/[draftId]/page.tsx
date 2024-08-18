// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftStatus from '@/components/DraftStatus';
import PlayerDetails from '@/components/PlayerDetails';
import { League, Draft, LeagueSettings, Player, Team, Pick, PlayerWithADP } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { toast } from "sonner";
import DraftHeader from '@/components/DraftHeader';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithADP | null>(null);
  const [isPickSubmitting, setIsPickSubmitting] = useState(false);
  const [picks, setPicks] = useState<PickWithPlayerAndTeam[]>([]);
  const [currentPick, setCurrentPick] = useState<PickWithPlayerAndTeam | null>(null);

  const { data: draftData, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: leagueData } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams } = useSWR<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: team } = useSWR<Team>(draftData ? `/api/yahoo/user/league/${draftData.league_id}/team` : null, fetcher);
  const { data: players } = useSWR<Player[]>(draftData ? `/api/db/league/${draftData.league_id}/players` : null, fetcher);

  useEffect(() => {
    if (draftData && players && teams && supabase) {
      const fetchPicks = async () => {
        const { data: picksData, error } = await supabase
          .from('picks')
          .select('*')
          .eq('draft_id', draftId)
          .order('total_pick_number', { ascending: true });

        if (error) {
          console.error('Error fetching picks:', error);
          return;
        }

        const picksWithDetails: PickWithPlayerAndTeam[] = picksData.map(pick => ({
          ...pick,
          player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
          team: teams.find(t => t.team_key === pick.team_key) || null
        }));

        setPicks(picksWithDetails);

        const currentPickData = picksWithDetails.find(p => p.total_pick_number === draftData.current_pick) || null;
        setCurrentPick(currentPickData);
      };

      fetchPicks();
    }
  }, [draftData, players, teams, draftId, supabase]);

  useEffect(() => {
    if (!supabase || !draftId || !players || !teams || !draftData) return;

    const picksSubscription = supabase
      .channel(`picks_${draftId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId}` 
      }, async (payload) => {
        const updatedPick = payload.new as Pick;

        setPicks(prevPicks => prevPicks.map(pick => 
          pick.id === updatedPick.id 
            ? {
                ...pick,
                ...updatedPick,
                player: players.find(p => p.id === updatedPick.player_id) || null,
                team: teams.find(t => t.team_key === updatedPick.team_key) || null
              } as PickWithPlayerAndTeam  // Type assertion here
            : pick
        ));
        
        // Update current pick and draft data
        if (updatedPick.is_picked && draftData.current_pick !== null) {
          const nextPickNumber = draftData.current_pick + 1;
          const nextPick = picks.find(p => p.total_pick_number === nextPickNumber) || null;
          setCurrentPick(nextPick);
          mutateDraft({ ...draftData, current_pick: nextPickNumber }, false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, draftData, players, teams, picks, mutateDraft]);

  const handlePlayerSelect = useCallback((player: PlayerWithADP) => {
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
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    } finally {
      setIsPickSubmitting(false);
    }
  };

  const memoizedDraft = useMemo(() => {
    if (draftData && picks.length > 0) {
      return {
        ...draftData,
        picks: picks
      };
    }
    return undefined;
  }, [draftData, picks]);

  if (!draftData || !leagueData || !leagueSettings || !teams || !team || !players || !currentPick) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={leagueData} draft={draftData} />
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/4 p-2 overflow-hidden flex flex-col">
          <PlayersList
            draftId={draftId}
            onPlayerSelect={handlePlayerSelect}
            draft={memoizedDraft as Draft}
          />
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
          <DraftedPlayers
            picks={picks}
            teamKey={team.team_key}
            teamName={team.name}
          />
        </div>
      </div>
    </div>
  );
};

export default DraftPage;