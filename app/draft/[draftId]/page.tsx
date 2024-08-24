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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Menu } from "lucide-react";
import { motion } from 'framer-motion';

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
        <div className="hidden md:flex w-full h-[calc(100vh-64px)]">

          {/* Left Column */}
          <div className="w-1/4 overflow-hidden flex flex-col">
            <PlayersList
              draftId={draftId}
              onPlayerSelect={handlePlayerSelectMd}
              draft={memoizedDraft}
              selectedPlayer={selectedPlayer}
            />
          </div>
          
          {/* Middle Column */}
          <div className="w-1/2 h-full overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow">
              <div className="p-4 space-y-4">
                <DraftStatus
                  draft={memoizedDraft}
                  leagueSettings={leagueSettings}
                  teams={teams}
                  team={team}
                />
                {selectedPlayer && (
                  <motion.div
                    key="playerSelected"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 1, y: 100 }}
                    transition={{ duration: 0.2 }}
                    className='space-y-4'
                  >
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
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column */}
          <div className="w-1/4 overflow-hidden flex flex-col p-4">
            <DraftedPlayers
              picks={memoizedDraft.picks}
              teamKey={team.team_key}
              teamName={team.name}
            />
          </div>
        </div>

        {/* Small screen layout */}
        <div className="md:hidden flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="team">My Team</TabsTrigger>
            </TabsList>
            <TabsContent value="players" className="flex-grow overflow-hidden">
              <PlayersList
                draftId={draftId}
                onPlayerSelect={handlePlayerSelect}
                draft={memoizedDraft}
                selectedPlayer={selectedPlayer}
              />
            </TabsContent>
            <TabsContent value="draft" className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <DraftStatus
                    draft={memoizedDraft}
                    leagueSettings={leagueSettings}
                    teams={teams}
                    team={team}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="team" className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <DraftedPlayers
                    picks={memoizedDraft.picks}
                    teamKey={team.team_key}
                    teamName={team.name}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sheet for small screens */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[50vh] flex flex-col md:hidden">
          <SheetHeader>
            <SheetTitle>Make your pick</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <div className="p-4 space-y-4">
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
          </ScrollArea>
        </SheetContent>
        
        {/* Floating action button for small screens */}
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed right-4 bottom-4 rounded-full shadow-lg md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
      </Sheet>
    </div>
  );
};

export default DraftPage;