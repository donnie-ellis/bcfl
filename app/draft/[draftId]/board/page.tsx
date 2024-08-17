// ./app/draft/[draftId]/board/page.tsx
'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, Team, Pick, Player, PickWithPlayerAndTeam } from '@/lib/types/';
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
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftBoardPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPick, setCurrentPick] = useState<PickWithPlayerAndTeam | null>(null);
  const [picks, setPicks] = useState<PickWithPlayerAndTeam[]>([]);

  const { data: draft, error: draftError, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: league, error: leagueError } = useSWR<League>(draft ? `/api/db/league/${draft.league_id}` : null, fetcher);
  const { data: leagueSettings, error: settingsError } = useSWR<LeagueSettings>(draft ? `/api/db/league/${draft.league_id}/settings` : null, fetcher);
  const { data: isCommissioner, error: commissionerError } = useSWR<{ isCommissioner: boolean }>(draft ? `/api/db/league/${draft.league_id}/isCommissioner` : null, fetcher);
  const { data: teams, error: teamsError } = useSWR<Team[]>(draft ? `/api/yahoo/league/${draft.league_id}/teams` : null, fetcher);
  const { data: players, error: playersError } = useSWR<Player[]>(draft ? `/api/db/league/${draft.league_id}/players` : null, fetcher);

  useEffect(() => {
    if (draft && players && teams && supabase) {
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
  
        const picksWithDetails: PickWithPlayerAndTeam[] = picksData
          .map(pick => {
            const player = pick.player_id ? players.find(p => p.id === pick.player_id) || null : null;
            const team = teams.find(t => t.team_key === pick.team_key);
            
            if (team) {
              return {
                ...pick,
                player,
                team
              };
            }
            return null;
          })
          .filter((pick): pick is PickWithPlayerAndTeam => pick !== null);
  
        setPicks(picksWithDetails);
        setCurrentPick(picksWithDetails.find(p => p.total_pick_number === draft.current_pick) || null);
      };
  
      fetchPicks();
    }
  }, [draft, players, teams, draftId, supabase]);
  
  useEffect(() => {
    if (!supabase || !draftId || !players || !teams || !draft) return;
  
    const picksSubscription = supabase
      .channel(`picks_${draftId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId}` 
      }, async (payload) => {
        const updatedPick = payload.new as Pick;
        const player = updatedPick.player_id ? players.find(p => p.id === updatedPick.player_id) || null : null;
        const team = teams.find(t => t.team_key === updatedPick.team_key);
  
        if (team) {
          const updatedPickWithDetails: PickWithPlayerAndTeam = {
            ...updatedPick,
            player,
            team
          };
  
          setPicks(prevPicks => prevPicks.map(pick => 
            pick.id === updatedPick.id ? updatedPickWithDetails : pick
          ));
  
          if (updatedPick.is_picked && draft.current_pick !== null) {
            const nextPickNumber = draft.current_pick + 1;
            setCurrentPick(picks.find(p => p.total_pick_number === nextPickNumber) || null);
            mutateDraft({ ...draft, current_pick: nextPickNumber }, false);
          }
  
          if (updatedPick.is_picked && player) {
            toast.success(`${team.name} drafted ${player.full_name}`);
          }
        }
      })
      .subscribe();
  
    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, draft, players, teams, picks, mutateDraft]);

  const memoizedDraft = useMemo(() => {
    if (draft && picks.length > 0) {
      return { ...draft, picks };
    }
    return null;
  }, [draft, picks]);

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
        // The pick will be updated through the Supabase subscription
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
          <Button variant="destructive" onClick={() => handleDeletePick(pick)}>Delete Pick</Button>
        ) : (
          <Button onClick={() => {
            setCurrentPick(pick);
            setIsSheetOpen(true);
          }}>Set Pick</Button>
        )}
      </div>
    );
  }, [isCommissioner, draftId]);

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
      // The pick will be updated through the Supabase subscription
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
      // The pick will be updated through the Supabase subscription
    } catch (error) {
      console.error('Error setting pick:', error);
      toast.error("Failed to set pick. Please try again.");
    }
  };

  const MemoizedDraftHeader = useMemo(() => {
    if (!league || !memoizedDraft) return null;
    return <DraftHeader league={league} draft={memoizedDraft} />;
  }, [league, memoizedDraft]);

  if (draftError || leagueError || settingsError || teamsError || playersError) {
    return <div>Error loading draft data. Please try again.</div>;
  }

  if (!memoizedDraft || !league || !leagueSettings || !isCommissioner || !teams || !players) {
    return <div>Loading...</div>;
  }

  if (memoizedDraft.status === 'completed') {
    return (
      <div className="flex flex-col h-screen">
        {MemoizedDraftHeader}
        <Alert className="m-4">
          <AlertTitle>Draft Completed</AlertTitle>
          <AlertDescription>
            The draft has been completed. You can review the final draft results below.
          </AlertDescription>
        </Alert>
        <ScrollArea className="flex-grow">
          <div className="p-4 space-y-8">
            {Array.from({ length: memoizedDraft.rounds }, (_, i) => i + 1).map((round) => (
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
                    currentRound={round}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {MemoizedDraftHeader}
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-8">
          {Array.from({ length: memoizedDraft.rounds }, (_, i) => i + 1).map((round) => (
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
                  currentRound={round}
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
                  draftId={draftId}
                  onPlayerSelect={setSelectedPlayer}
                  draft={memoizedDraft}
                />
              </ScrollArea>
            </div>
            {selectedPlayer && (
              <div className="flex-shrink-0 mt-4">
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