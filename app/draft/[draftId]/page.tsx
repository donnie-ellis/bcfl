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
  const [activeTab, setActiveTab] = useState<string>("players");

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
    <div className="flex flex-col min-h-screen">
      <DraftHeader league={leagueData} draft={draftData} />
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/4 p-2 overflow-hidden flex flex-col order-2 md:order-1">
          <PlayersList
            draftId={draftId}
            onPlayerSelect={handlePlayerSelect}
            draft={memoizedDraft as Draft}
          />
        </div>
        
        <div className="w-full md:w-1/2 p-2 overflow-auto flex flex-col gap-y-4 order-1 md:order-2">
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

        <div className="w-full md:w-1/4 p-2 overflow-hidden flex flex-col order-3">
          <DraftedPlayers
            picks={draftData.picks}
            teamKey={team.team_key}
            teamName={team.name}
          />
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="team">My Team</TabsTrigger>
          </TabsList>
          <TabsContent value="players" className="h-[calc(100vh-12rem)]">
            <ScrollArea className="h-full">
              <PlayersList
                draftId={draftId}
                onPlayerSelect={handlePlayerSelect}
                draft={memoizedDraft as Draft}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="draft" className="h-[calc(100vh-12rem)]">
            <ScrollArea className="h-full">
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
            </ScrollArea>
          </TabsContent>
          <TabsContent value="team" className="h-[calc(100vh-12rem)]">
            <ScrollArea className="h-full">
              <DraftedPlayers
                picks={draftData.picks}
                teamKey={team.team_key}
                teamName={team.name}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating action button for mobile */}
      <Sheet>
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
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DraftPage;