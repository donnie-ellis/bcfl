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
      }, async (payload) => {
        const updatedPick = payload.new as Pick;
        if (updatedPick.is_picked) {
          await mutatePicks();
          await mutateDraft();
          notifyPickMade(updatedPick);
          updatePicksAndDraft();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, mutatePicks, mutateDraft, notifyPickMade, updatePicksAndDraft]);

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
      await mutatePicks();
      await mutateDraft();
      updatePicksAndDraft();
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
      return (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={leagueData} draft={memoizedDraft as Draft} />
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
        {/* Desktop View */}
        <div className="hidden md:flex w-full h-[calc(100vh-64px)]">
          <div className="w-1/4 overflow-hidden flex flex-col">
            <PlayersList
              draftId={draftId}
              onPlayerSelect={setSelectedPlayer}
              draft={memoizedDraft as Draft}
            />
          </div>
          
          <div className="w-1/2 h-full overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow">
              <div className="p-4 space-y-4">
                <DraftStatus
                  draft={memoizedDraft as Draft}
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
                  picks={memoizedDraft?.picks}
                  teamKey={team.team_key}
                  teamName={team.name}
                />
              </div>
            </ScrollArea>
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
                draft={memoizedDraft as Draft}
              />
            </TabsContent>
            <TabsContent value="draft" className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <DraftStatus
                    draft={memoizedDraft as Draft}
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
                    picks={memoizedDraft?.picks}
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