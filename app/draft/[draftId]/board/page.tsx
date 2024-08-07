// ./app/draft/[draftId]/board/page.tsx
'use client'

import React, { useState, useCallback, useMemo } from 'react';
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
import useSWRImmutable from 'swr/immutable';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftBoardPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPick, setCurrentPick] = useState<Pick | null>(null);

  const { data: draft, error: draftError, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher, { refreshInterval: 5000 });
  const { data: league, error: leagueError } = useSWRImmutable<League>(draft ? `/api/db/league/${draft.league_id}` : null, fetcher);
  const { data: leagueSettings, error: settingsError } = useSWRImmutable<LeagueSettings>(draft ? `/api/db/league/${draft.league_id}/settings` : null, fetcher);
  const { data: isCommissioner, error: commissionerError } = useSWRImmutable<{ isCommissioner: boolean }>(draft ? `/api/db/league/${draft.league_id}/isCommissioner` : null, fetcher);
  const { data: teams, error: teamsError } = useSWRImmutable<Team[]>(draft ? `/api/yahoo/league/${draft.league_id}/teams` : null, fetcher);

  const { data: picks, error: picksError, mutate: mutatePicks } = useSWR<(Pick & { player: Player | null, team: Team | null })[]>(
    draft ? `/api/db/draft/${draftId}/picks` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const memoizedDraft = useMemo(() => draft && picks ? { ...draft, picks } : null, [draft, picks]);

  const handleSquareHover = useCallback((pick: Pick & { player: Player | null, team: Team }) => {
    if (!isCommissioner?.isCommissioner) return null;

    return (
      <div className="space-y-2">
        <h3 className="font-semibold">Commissioner Actions</h3>
        {pick.player ? (
          <Button variant="destructive" onClick={() => handleDeletePick(pick)}>Delete Pick</Button>
        ) : (
          <Button onClick={() => {
            setCurrentPick(pick);
            setIsSheetOpen(true);
          }}>Set Pick</Button>
        )}
      </div>
    );
  }, [isCommissioner]);

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
      mutatePicks();
    } catch (error) {
      console.error('Error deleting pick:', error);
      toast.error("Failed to delete pick. Please try again.");
    }
  };

  const handleSetPick = async () => {
    if (!currentPick || !selectedPlayer) return;

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
        throw new Error('Failed to set pick');
      }
      toast.success(`Pick set successfully: ${selectedPlayer.full_name}`);
      setIsSheetOpen(false);
      setSelectedPlayer(null);
      setCurrentPick(null);
      mutatePicks();
    } catch (error) {
      console.error('Error setting pick:', error);
      toast.error("Failed to set pick. Please try again.");
    }
  };

  React.useEffect(() => {
    if (supabase) {
      const subscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, () => {
          mutatePicks();
          mutateDraft();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [supabase, draftId, mutatePicks, mutateDraft]);

  if (draftError || leagueError || settingsError || commissionerError || teamsError || picksError) {
    return <div>Error loading draft data. Please try again.</div>;
  }

  if (!memoizedDraft || !league || !leagueSettings || !isCommissioner || !teams || !picks) {
    return <div>Loading...</div>;
  }

  const rounds = Array.from({ length: memoizedDraft.rounds }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={league} draft={memoizedDraft} />
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
                    ...memoizedDraft,
                    picks: memoizedDraft.picks.filter(
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
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>{currentPick?.team ? 'Set Pick for ' + currentPick.team.name : 'Set Pick'}</SheetTitle>
          </SheetHeader>
          <div className="flex-grow flex flex-col overflow-hidden mt-4">
            <div className="flex-grow overflow-hidden">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <PlayersList
                  leagueKey={memoizedDraft.league_id}
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
                  currentPick={currentPick}
                  onSubmitPick={handleSetPick}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DraftBoardPage;