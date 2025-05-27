// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import useSWR from 'swr';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import DesktopDraftLayout from '@/components/draft/DesktopDraftLayout';
import DraftHeader from '@/components/draft/common/DraftHeader';
import MobileDraftTabs from '@/components/draft/MobileDraftTabs';
import Playersheet from '@/components/draft/Playersheet';
import { 
  League, 
  Draft, 
  LeagueSettings, 
  Player, 
  Team, 
  Pick, 
  PickWithPlayerAndTeam, 
  PlayerWithADP 
} from '@/lib/types/';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithADP | null>(null);
  const [isPickSubmitting, setIsPickSubmitting] = useState(false);
  const [currentPick, setCurrentPick] = useState<PickWithPlayerAndTeam | null>(null);
  const [activeTab, setActiveTab] = useState<string>("draft");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [picks, setPicks] = useState<PickWithPlayerAndTeam[]>([]);

  const { data: draftData, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: picksData, mutate: mutatePicks } = useSWR<Pick[]>(
    draftData ? `/api/db/draft/${draftId}/picks` : null,
    fetcher
  );
  const { data: leagueData } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams } = useSWR<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: team } = useSWR<Team>(draftData ? `/api/yahoo/user/league/${draftData.league_id}/team` : null, fetcher);
  const { data: players } = useSWR<Player[]>(draftData ? `/api/db/league/${draftData.league_id}/players` : null, fetcher);

  const updatePicksAndDraft = useCallback((latestDraft: Draft, latestPicks: Pick[]) => {
    console.log('updatePicksAndDraft called');

    if (!latestDraft || !latestPicks || !players || !teams) {
      console.log('Missing required data, returning early');
      return;
    }

    const updatedPicks: PickWithPlayerAndTeam[] = latestPicks.map(pick => ({
      ...pick,
      player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
      team: teams.find(t => t.team_key === pick.team_key) ?? {} as Team
    }));

    console.log('Updated picks:', updatedPicks);
    setPicks(updatedPicks);

    const updatedCurrentPick = updatedPicks.find(p => !p.is_picked) || null;
    console.log('Updated Current Pick:', updatedCurrentPick);

    if (updatedCurrentPick && latestDraft.current_pick !== updatedCurrentPick.total_pick_number) {
      console.log('Updating draft data', { oldPick: latestDraft.current_pick, newPick: updatedCurrentPick.total_pick_number });
      mutateDraft({ ...latestDraft, current_pick: updatedCurrentPick.total_pick_number }, false);
    }

    setCurrentPick(updatedCurrentPick);
  }, [players, teams, mutateDraft]);

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
      }, async (payload) => {
        console.log('Websocket update received:', payload);
        const updatedPick = payload.new as Pick;
        if (updatedPick.is_picked) {
          notifyPickMade(updatedPick);
          // Fetch latest data
          const [latestDraft, latestPicks] = await Promise.all([
            fetch(`/api/db/draft/${draftId}`).then(res => res.json()),
            fetch(`/api/db/draft/${draftId}/picks`).then(res => res.json())
          ]);
          // Update SWR cache
          mutateDraft(latestDraft, false);
          mutatePicks(latestPicks, false);
          // Update local state
          updatePicksAndDraft(latestDraft, latestPicks);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, notifyPickMade, updatePicksAndDraft, mutateDraft, mutatePicks]);

  useEffect(() => {
    if (draftData && picksData && players && teams) {
      console.log('Calling updatePicksAndDraft from useEffect');
      updatePicksAndDraft(draftData, picksData);
    }
  }, [draftData, picksData, players, teams, updatePicksAndDraft]);

  const handlePlayerSelect = useCallback((player: PlayerWithADP) => {
    setSelectedPlayer(player);
    setIsSheetOpen(true);
  }, []);

  const handlePlayerSelectMd = async (player: PlayerWithADP) => {
    if (player && player === selectedPlayer) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  }

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

      setSelectedPlayer(null);
      // Fetch latest data
      const [latestDraft, latestPicks] = await Promise.all([
        fetch(`/api/db/draft/${draftId}`).then(res => res.json()),
        fetch(`/api/db/draft/${draftId}/picks`).then(res => res.json())
      ]);
      // Update SWR cache
      mutateDraft(latestDraft, false);
      mutatePicks(latestPicks, false);
      // Update local state
      updatePicksAndDraft(latestDraft, latestPicks);
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

  if (!memoizedDraft || !leagueData || !leagueSettings || !teams || !team || !players) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={leagueData} draft={memoizedDraft} />
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
        {/* Desktop View */}
        <DesktopDraftLayout
          draftId={draftId}
          handlePlayerSelectMd={handlePlayerSelectMd}
          memoizedDraft={memoizedDraft}
          selectedPlayer={selectedPlayer}
          isCurrentUserPick={isCurrentUserPick}
          currentPick={currentPick}
          handleSubmitPick={handleSubmitPick}
          isPickSubmitting={isPickSubmitting}
          leagueSettings={leagueSettings}
          teams={teams}
          team={team}
        />

        {/* Small screen layout */}
        <MobileDraftTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          draftId={draftId}
          handlePlayerSelect={handlePlayerSelect}
          memoizedDraft={memoizedDraft}
          selectedPlayer={selectedPlayer}
          leagueSettings={leagueSettings}
          teams={teams}
          team={team}
        />
      </div>

      {/* Sheet for small screens */}
      <Playersheet
        isCurrentUserPick={isCurrentUserPick}
        selectedPlayer={selectedPlayer}
        currentPick={currentPick}
        handleSubmitPick={handleSubmitPick}
        isPickSubmitting={isPickSubmitting}
      />
    </div>
  );
};

export default DraftPage;