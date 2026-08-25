// ./app/draft/[draftId]/board/page.tsx

'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { League, Draft, LeagueSettings, Team, Pick, Player, PickWithPlayerAndTeam, PlayerWithADP } from '@/lib/types/';
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
import { Switch } from "@/components/ui/switch";
import { PopoverClose } from "@/components/ui/popover";
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-media-query';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftBoardPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useMemo(() => createClient(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithADP | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPick, setCurrentPick] = useState<PickWithPlayerAndTeam | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>("1");
  const isMobile = useIsMobile();

  const { data: draftData, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: picksData, mutate: mutatePicks } = useSWR<PickWithPlayerAndTeam[]>(
    draftData ? `/api/db/draft/${draftId}/picks` : null,
    fetcher
  );
  const { data: league } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: isCommissioner } = useSWR<{ isCommissioner: boolean }>(draftData ? `/api/db/league/${draftData.league_id}/isCommissioner` : null, fetcher);
  const { data: teams } = useSWR<Team[]>(draftData ? `/api/db/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: players } = useSWR<Player[]>(draftData ? `/api/db/league/${draftData.league_id}/players` : null, fetcher);
  const roundRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (draftData && draftData.current_pick) {
      const currentRound = Math.ceil(draftData.current_pick / (draftData.total_picks / draftData.rounds));
      setSelectedRound(currentRound.toString());
      if (!isMobile && roundRefs.current[currentRound - 1]) {
        roundRefs.current[currentRound - 1]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [draftData, isMobile]);

  const updatePicksAndDraft = useCallback(() => {
    if (!draftData || !picksData || !players || !teams) return;

    const updatedPicks: PickWithPlayerAndTeam[] = picksData.map(pick => ({
      ...pick,
      player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
      team: teams.find(t => t.id === pick.team_id) || null
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
      const team = teams?.find(t => t.id === updatedPick.team_id);

      if (player && team) {
        toast.success(
          `${team.name} drafted ${player.full_name}`,
          {
            description: `${player.team} - ${player.position}`,
            duration: 5000,
          }
        );
      }
    }
  }, [players, teams]);

  // Tracks the last picks we've rendered/notified on, so we can detect picks
  // that were made while the realtime socket was dead (mobile browsers kill
  // the websocket when the tab is backgrounded or the screen locks).
  const picksDataRef = useRef<PickWithPlayerAndTeam[]>([]);
  useEffect(() => {
    picksDataRef.current = picksData ?? [];
  }, [picksData]);

  const refreshPicks = useCallback(async () => {
    if (!draftId) return;

    try {
      const latestPicks: Pick[] = await fetch(`/api/db/draft/${draftId}/picks`).then(res => res.json());

      const previouslyPicked = new Set(
        picksDataRef.current.filter(p => p.is_picked).map(p => p.id)
      );
      const newlyMadePicks = latestPicks
        .filter(p => p.is_picked && !previouslyPicked.has(p.id))
        .sort((a, b) => a.total_pick_number - b.total_pick_number);

      newlyMadePicks.forEach(notifyPickMade);

      mutatePicks(latestPicks as PickWithPlayerAndTeam[], false);
    } catch (error) {
      console.error('Error refreshing picks:', error);
    }
  }, [draftId, notifyPickMade, mutatePicks]);

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
          refreshPicks();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, refreshPicks]);

  // Mobile browsers suspend the realtime websocket while the tab is
  // backgrounded or the screen is locked, so picks made during that window
  // never arrive as events. Reconcile against the server whenever the tab
  // becomes visible/focused again so those picks still get announced.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshPicks();
      }
    };

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', refreshPicks);

    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', refreshPicks);
    };
  }, [refreshPicks]);

  useEffect(() => {
    updatePicksAndDraft();
  }, [updatePicksAndDraft, picksData]);

  const setRoundRef = useCallback((el: HTMLDivElement | null, index: number) => {
    roundRefs.current[index] = el;
  }, []);

  const memoizedDraft = useMemo(() => {
    if (draftData && picksData && players && teams) {
      const updatedPicks: PickWithPlayerAndTeam[] = picksData.map(pick => ({
        ...pick,
        player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
        team: teams.find(t => t.id === pick.team_id) || null
      }));
      return { ...draftData, picks: updatedPicks };
    }
    return null;
  }, [draftData, picksData, players, teams]);

  const handleSquareHover = useCallback((pick: PickWithPlayerAndTeam) => {
    if (!isCommissioner?.isCommissioner) return null;

    const handleKeeperChange = async (checked: boolean) => {
      try {
        const response = await fetch(`/api/db/draft/${draftId}/pick/setKeeper`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pickId: pick.id, isKeeper: checked }),
        });

        if (!response.ok) {
          throw new Error('Failed to update keeper status');
        }

        toast.success(`Keeper status ${checked ? 'set' : 'unset'} successfully`);

        // Update the local state immediately
        mutatePicks((currentPicks) =>
          currentPicks?.map(p =>
            p.id === pick.id ? { ...p, is_keeper: checked } : p
          )
        );
      } catch (error) {
        console.error('Error updating keeper status:', error);
        toast.error("Failed to update keeper status. Please try again.");
      }
    };

    return (
      <div className="space-y-2">
        <h3 className="font-semibold">Commissioner Actions</h3>
        {pick.player && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={pick.is_keeper || false}
              onCheckedChange={handleKeeperChange}
              id={`keeper-switch-${pick.id}`}
            />
            <label htmlFor={`keeper-switch-${pick.id}`}>Keeper</label>
          </div>
        )}
        {pick.player ? (
          <PopoverClose asChild>
            <Button size="lg" variant="destructive" onClick={() => handleDeletePick(pick)}>Delete Pick</Button>
          </PopoverClose>
        ) : (
          <PopoverClose asChild>
            <Button size="lg" onClick={() => {
              setCurrentPick(pick);
              setIsSheetOpen(true);
            }}>Set Pick</Button>
          </PopoverClose>
        )}
      </div>
    );
  }, [isCommissioner, draftId, mutatePicks]);

  const handleDeletePick = async (pick: PickWithPlayerAndTeam) => {
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
      mutatePicks(); // Update the local state
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
      setIsSheetOpen(false);
      setSelectedPlayer(null);
      mutatePicks(); // Update the local state
    } catch (error) {
      console.error('Error setting pick:', error);
      toast.error("Failed to set pick. Please try again.");
    }
  };

  const MemoizedDraftHeader = useMemo(() => {
    if (!league || !memoizedDraft) return null;
    return <DraftHeader league={league} draft={memoizedDraft} />;
  }, [league, memoizedDraft]);

  if (!memoizedDraft || !league || !leagueSettings || !isCommissioner || !teams || !players) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const rounds = Array.from({ length: memoizedDraft.rounds }, (_, i) => i + 1);

  const handleRoundChange = (round: string) => {
    setSelectedRound(round);
    if (!isMobile && roundRefs.current[parseInt(round) - 1]) {
      roundRefs.current[parseInt(round) - 1]?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const roundSelector = (
    <div className="p-4">
      <Select
        value={selectedRound}
        onValueChange={handleRoundChange}
      >
        <SelectTrigger className="w-[180px] h-11">
          <SelectValue placeholder="Select round" />
        </SelectTrigger>
        <SelectContent>
          {rounds.map((round) => (
            <SelectItem key={round} value={round.toString()}>
              Round {round}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Mobile shows only the selected round; desktop stacks every round with scroll-into-view refs.
  const roundsContent = isMobile ? (
    <Card>
      <CardHeader>
        <CardTitle>Round {selectedRound}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <RoundSquares
          draft={{
            ...memoizedDraft,
            picks: memoizedDraft.picks.filter(
              (pick: PickWithPlayerAndTeam) => pick.round_number === parseInt(selectedRound)
            ),
          }}
          leagueSettings={leagueSettings}
          currentRoundOnly={false}
          onSquareHover={handleSquareHover}
          teams={teams}
          currentRound={parseInt(selectedRound)}
        />
      </CardContent>
    </Card>
  ) : (
    rounds.map((round, index) => (
      <Card key={round} ref={(el) => setRoundRef(el, index)}>
        <CardHeader>
          <CardTitle>Round {round}</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <RoundSquares
            draft={{
              ...memoizedDraft,
              picks: memoizedDraft.picks.filter(
                (pick: PickWithPlayerAndTeam) => pick.round_number === round
              ),
            }}
            leagueSettings={leagueSettings}
            currentRoundOnly={false}
            onSquareHover={handleSquareHover}
            teams={teams}
            currentRound={round}
          />
        </CardContent>
      </Card>
    ))
  );

  if (memoizedDraft.status === 'completed') {
    return (
      <div className="flex flex-col h-screen">
        {MemoizedDraftHeader}
        <Alert className="mx-4 my-4 max-w-[calc(100%-2rem)]">
          <AlertTitle className="grow text-center mx-2">Draft Completed</AlertTitle>
          <AlertDescription className="text-center mt-2 grow">
            The draft has been completed. You can review the final draft results below.
          </AlertDescription>
        </Alert>
        {roundSelector}
        <ScrollArea className="grow">
          <div className="p-4 space-y-8">
            {roundsContent}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/50">
      {MemoizedDraftHeader}
      {roundSelector}
      <ScrollArea className="grow">
        <div className="p-4 space-y-8">
          {roundsContent}
        </div>
      </ScrollArea>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
          <SheetHeader className="shrink-0">
            <SheetTitle>{currentPick?.team ? 'Set Pick for ' + currentPick.team.name : 'Set Pick'}</SheetTitle>
          </SheetHeader>
          <div className="grow flex flex-col overflow-hidden mt-4">
            <div className="grow overflow-hidden">
              <PlayersList
                draftId={draftId}
                onPlayerSelect={setSelectedPlayer}
                draft={memoizedDraft}
                selectedPlayer={null}
              />
            </div>
            {selectedPlayer && (
              <div className="shrink-0 mt-4">
                <PlayerCard
                  player={selectedPlayer}
                  isDrafted={false}
                  onClick={() => { }}
                />
                <SubmitPickButton
                  isCurrentUserPick={true}
                  selectedPlayer={selectedPlayer}
                  currentPick={currentPick}
                  onSubmitPick={handleSetPick}
                  isPickSubmitting={false}
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