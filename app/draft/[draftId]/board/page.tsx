// ./app/draft/[draftId]/board/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, Team, Pick, Player } from '@/lib/types';
import DraftHeader from '@/components/DraftHeader';
import RoundSquares from '@/components/RoundSquares';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import PlayersList from '@/components/PlayersList';
import SubmitPickButton from '@/components/SubmitPicksButton';
import PlayerCard from '@/components/PlayerCard';
import useSWR from 'swr';

const DraftBoardPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [league, setLeague] = useState<League | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [teams, setTeams] = useState<Team[] | null>(null);

  const fetchDraftData = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (draftError) throw draftError;

      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          *,
          player:players (*),
          team:teams (*)
        `)
        .eq('draft_id', draftId)
        .order('total_pick_number', { ascending: true });

      if (picksError) throw picksError;

      setDraft({ ...draftData, picks: picksData });

      const leagueKey = draftData.league_id;

      const [leagueResponse, settingsResponse, commissionerResponse, teamsResponse] = await Promise.all([
        fetch(`/api/db/league/${leagueKey}`),
        fetch(`/api/db/league/${leagueKey}/settings`),
        fetch(`/api/db/league/${leagueKey}/isCommissioner`),
        fetch(`/api/yahoo/league/${leagueKey}/teams`)
      ]);

      if (!leagueResponse.ok || !settingsResponse.ok || !commissionerResponse.ok || !teamsResponse.ok) {
        throw new Error('Error fetching data');
      }
      
      const [leagueData, settingsData, commissionerData, teamsData] = await Promise.all([
        leagueResponse.json(),
        settingsResponse.json(),
        commissionerResponse.json(),
        teamsResponse.json()
      ]);

      setLeague(leagueData);
      setLeagueSettings(settingsData);
      setIsCommissioner(commissionerData.isCommissioner);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch draft data. Please try again.");
    }
  }, [supabase, draftId]);

  useEffect(() => {
    fetchDraftData();

    const subscription = supabase
      ?.channel('draft_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId}` 
      }, () => {
        fetchDraftData();
      })
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, draftId, fetchDraftData]);

  const handleSquareHover = useCallback((pick: Pick & { player: Player | null, team: Team }) => {
    if (!isCommissioner) return null;

    return (
      <div className="space-y-2">
        <h3 className="font-semibold">Commissioner Actions</h3>
        {pick.player ? (
          <Button variant="destructive" onClick={() => handleDeletePick(pick)}>Delete Pick</Button>
        ) : (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button onClick={() => setIsSheetOpen(true)}>Set Pick</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
              <SheetHeader className="flex-shrink-0">
                <SheetTitle>{pick.team ? 'Set Pick for ' + pick.team.name : 'loading...'}</SheetTitle>
              </SheetHeader>
              <div className="flex-grow flex flex-col overflow-hidden mt-4">
                <div className="flex-grow overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <PlayersList
                      leagueKey={draft?.league_id || ''}
                      draftId={draftId}
                      onPlayerSelect={setSelectedPlayer}
                    />
                  </ScrollArea>
                </div>
                {selectedPlayer && (
                  <div className="flex-shrink-0 mt-4">
                    <PlayerCard
                      player={selectedPlayer}
                      isDrafted={false}
                      onClick={() => {}}
                    />
                    <SubmitPickButton
                      isCurrentUserPick={true}
                      selectedPlayer={selectedPlayer}
                      currentPick={pick}
                      onSubmitPick={() => handleSetPick(pick, selectedPlayer)}
                    />
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }, [isCommissioner, isSheetOpen, draft, draftId, selectedPlayer]);

  const handleDeletePick = async (pick: Pick) => {
    try {
      const response = await fetch(`/api/db/draft/${draftId}/pick`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pickId: pick.id }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete pick');
      }
      toast.success("Pick deleted successfully");
      fetchDraftData(); // Refresh the draft data
    } catch (error) {
      console.error('Error deleting pick:', error);
      toast.error("Failed to delete pick. Please try again.");
    }
  };

  const handleSetPick = async (pick: Pick, player: Player) => {
    try {
      const response = await fetch(`/api/db/draft/${draftId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickId: pick.id,
          playerId: player.id,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to set pick');
      }
      toast.success(`Pick set successfully: ${player.full_name}`);
      setIsSheetOpen(false);
      setSelectedPlayer(null);
      fetchDraftData(); // Refresh the draft data
    } catch (error) {
      console.error('Error setting pick:', error);
      toast.error("Failed to set pick. Please try again.");
    }
  };

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={league} draft={draft} />
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-8">
          {rounds.map((round) => (
            <Card key={round}>
              <CardHeader>
                <CardTitle>Round {round}</CardTitle>
              </CardHeader>
              <CardContent>
                <RoundSquares
                  draft={{
                    ...draft,
                    picks: draft.picks.filter(
                      (pick) => pick.round_number === round
                    ),
                  }}
                  leagueSettings={leagueSettings}
                  currentRoundOnly={false}
                  onSquareHover={handleSquareHover}
                  teams={teams}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DraftBoardPage;