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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

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

  const updatePicksAndDraft = useCallback(() => {
    if (!draftData || !picksData || !players || !teams) return;

    const updatedPicks: PickWithPlayerAndTeam[] = picksData.map(pick => ({
      ...pick,
      player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
      team: teams.find(t => t.team_key === pick.team_key) ?? {} as Team
    }));

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

  const handlePlayerSelect = useCallback((player: PlayerWithADP) => {
    setSelectedPlayer(player);
    setIsSheetOpen(true);
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

      setSelectedPlayer(null);
      mutatePicks();
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    } finally {
      setIsPickSubmitting(false);
    }
  };

  const memoizedDraft = useMemo(() => {
    if (draftData && picksData) {
      return {
        ...draftData,
        picks: picksData
      };
    }
    return undefined;
  }, [draftData, picksData]);

  if (!draftData || !leagueData || !leagueSettings || !teams || !team || !players || !picksData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={leagueData} draft={draftData} />
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
        {/* Desktop View */}
        <div className="hidden md:flex w-full h-[calc(100vh-64px)]">
          <div className="w-1/4 h-full overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow">
              <div className="p-4">
                <PlayersList
                  draftId={draftId}
                  onPlayerSelect={handlePlayerSelect}
                  draft={memoizedDraft as Draft}
                />
              </div>
            </ScrollArea>
          </div>
          
          <div className="w-1/2 h-full overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow">
              <div className="p-4 space-y-4">
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
            </ScrollArea>
          </div>

          <div className="w-1/4 h-full overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow">
              <div className="p-4">
                <DraftedPlayers
                  picks={draftData.picks}
                  teamKey={team.team_key}
                  teamName={team.name}
                />
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex-grow flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="team">My Team</TabsTrigger>
            </TabsList>
            <TabsContent value="players" className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <PlayersList
                    draftId={draftId}
                    onPlayerSelect={handlePlayerSelect}
                    draft={memoizedDraft as Draft}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="draft" className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
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
              </ScrollArea>
            </TabsContent>
            <TabsContent value="team" className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <DraftedPlayers
                    picks={draftData.picks}
                    teamKey={team.team_key}
                    teamName={team.name}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Floating action button for mobile */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed right-4 bottom-20 md:hidden rounded-full shadow-lg"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[50vh]">
          <ScrollArea className="h-full">
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
      </Sheet>
    </div>
  );
};

export default DraftPage;