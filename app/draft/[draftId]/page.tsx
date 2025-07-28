// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftStatus from '@/components/DraftStatus';
import PlayerDetails from '@/components/PlayerDetails';
import { League, Draft, LeagueSettings, Player, Team, Pick, PlayerWithADP, EnhancedPlayerWithADP } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { toast } from "sonner";
import DraftHeader from '@/components/DraftHeader';
import useSWR from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Menu, Plus } from "lucide-react";
import TeamNeeds from '@/components/TeamNeeds';
import DraftQueue from '@/components/DraftQueue';

// Union type for all possible player types in the queue
type QueuePlayer = Player | PlayerWithADP | EnhancedPlayerWithADP;

// Define the state interface
interface DraftPageState {
  selectedPlayer: PlayerWithADP | null;
  isPickSubmitting: boolean;
  currentPick: PickWithPlayerAndTeam | null;
  activeTab: string;
  isSheetOpen: boolean;
  picks: PickWithPlayerAndTeam[];
  queue: QueuePlayer[];
}

// Define action types
type DraftPageAction =
  | { type: 'SET_SELECTED_PLAYER'; payload: PlayerWithADP | null }
  | { type: 'SET_IS_PICK_SUBMITTING'; payload: boolean }
  | { type: 'SET_CURRENT_PICK'; payload: PickWithPlayerAndTeam | null }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_IS_SHEET_OPEN'; payload: boolean }
  | { type: 'SET_PICKS'; payload: PickWithPlayerAndTeam[] }
  | { type: 'SET_QUEUE'; payload: QueuePlayer[] }
  | { type: 'ADD_TO_QUEUE'; payload: QueuePlayer }
  | { type: 'UPDATE_PICKS_AND_DRAFT'; payload: { picks: PickWithPlayerAndTeam[]; currentPick: PickWithPlayerAndTeam | null } }
  | { type: 'RESET_AFTER_PICK' }
  | { type: 'REMOVE_DRAFTED_FROM_QUEUE'; payload: number | string };

// Initial state
const initialState: DraftPageState = {
  selectedPlayer: null,
  isPickSubmitting: false,
  currentPick: null,
  activeTab: "draft",
  isSheetOpen: false,
  picks: [],
  queue: [],
};

// Reducer function
const draftPageReducer = (state: DraftPageState, action: DraftPageAction): DraftPageState => {
  switch (action.type) {
    case 'SET_SELECTED_PLAYER':
      return { ...state, selectedPlayer: action.payload };
    case 'SET_IS_PICK_SUBMITTING':
      return { ...state, isPickSubmitting: action.payload };
    case 'SET_CURRENT_PICK':
      return { ...state, currentPick: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_IS_SHEET_OPEN':
      return { ...state, isSheetOpen: action.payload };
    case 'SET_PICKS':
      return { ...state, picks: action.payload };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload };
    case 'ADD_TO_QUEUE':
      if (state.queue.find(p => p.id === action.payload.id)) {
        return state;
      }
      return { ...state, queue: [...state.queue, action.payload] };
    case 'UPDATE_PICKS_AND_DRAFT':
      return {
        ...state,
        picks: action.payload.picks,
        currentPick: action.payload.currentPick,
      };
    case 'RESET_AFTER_PICK':
      return {
        ...state,
        selectedPlayer: null,
        isPickSubmitting: false,
      };
    case 'REMOVE_DRAFTED_FROM_QUEUE':
      return {
        ...state,
        queue: state.queue.filter(p => p.id !== action.payload)
      };
    default:
      return state;
  }
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DraftPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [state, dispatch] = useReducer(draftPageReducer, initialState);

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
    if (!latestDraft || !latestPicks || !players || !teams) {
      console.log('Missing required data, returning early');
      return;
    }

    const updatedPicks: PickWithPlayerAndTeam[] = latestPicks.map(pick => ({
      ...pick,
      player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
      team: teams.find(t => t.team_key === pick.team_key) ?? {} as Team
    }));

    const updatedCurrentPick = updatedPicks.find(p => !p.is_picked) || null;

    // Get drafted player IDs to remove from queue
    const draftedPlayerIds = updatedPicks
      .filter(pick => pick.is_picked && pick.player_id)
      .map(pick => pick.player_id as number | string);

    // Batch all state updates together
    unstable_batchedUpdates(() => {
      dispatch({
        type: 'UPDATE_PICKS_AND_DRAFT',
        payload: {
          picks: updatedPicks,
          currentPick: updatedCurrentPick,
        }
      });

      // Remove drafted players from queue
      draftedPlayerIds.forEach(playerId => {
        dispatch({ type: 'REMOVE_DRAFTED_FROM_QUEUE', payload: playerId });
      });

      // Update SWR cache if current pick changed
      if (updatedCurrentPick && latestDraft.current_pick !== updatedCurrentPick.total_pick_number) {
        mutateDraft({ ...latestDraft, current_pick: updatedCurrentPick.total_pick_number }, false);
      }
    });
  }, [players, teams, mutateDraft]);

  const notifyPickMade = useCallback((updatedPick: Pick) => {
    if (updatedPick.is_picked && updatedPick.player_id) {
      const player = players?.find(p => p.id === updatedPick.player_id);
      const team = teams?.find(t => t.team_key === updatedPick.team_key);

      if (player && team) {
        toast.success(
          `${team.name} has made pick #${updatedPick.total_pick_number}`,
          {
            description: `${player.full_name} (${player.editorial_team_abbr}) - ${player.display_position}`,
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
          notifyPickMade(updatedPick);
          // Fetch latest data
          const [latestDraft, latestPicks] = await Promise.all([
            fetch(`/api/db/draft/${draftId}`).then(res => res.json()),
            fetch(`/api/db/draft/${draftId}/picks`).then(res => res.json())
          ]);
          
          // Batch SWR cache updates and local state updates
          unstable_batchedUpdates(() => {
            mutateDraft(latestDraft, false);
            mutatePicks(latestPicks, false);
            updatePicksAndDraft(latestDraft, latestPicks);
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to picks updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to picks updates');
        }
      });

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, notifyPickMade, updatePicksAndDraft, mutateDraft, mutatePicks]);

  useEffect(() => {
    if (draftData && picksData && players && teams) {
      updatePicksAndDraft(draftData, picksData);
    }
  }, [draftData, picksData, players, teams, updatePicksAndDraft]);

  const handlePlayerSelect = useCallback((player: PlayerWithADP) => {
    unstable_batchedUpdates(() => {
      dispatch({ type: 'SET_SELECTED_PLAYER', payload: player });
      dispatch({ type: 'SET_IS_SHEET_OPEN', payload: true });
    });
  }, []);

  const handlePlayerSelectMd = async (player: PlayerWithADP) => {
    if (player && player === state.selectedPlayer) {
      dispatch({ type: 'SET_SELECTED_PLAYER', payload: null });
    } else {
      dispatch({ type: 'SET_SELECTED_PLAYER', payload: player });
    }
  }

  const isCurrentUserPick = state.currentPick?.team_key === team?.team_key;

  const handleSubmitPick = async () => {
    dispatch({ type: 'SET_IS_PICK_SUBMITTING', payload: true });
    
    if (!state.selectedPlayer || !state.currentPick || !draftData) {
      toast.error("Unable to submit pick. Please try again.");
      dispatch({ type: 'SET_IS_PICK_SUBMITTING', payload: false });
      return;
    }

    try {
      const response = await fetch(`/api/db/draft/${draftId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickId: state.currentPick.id,
          playerId: state.selectedPlayer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit pick');
      }

      // Fetch latest data
      const [latestDraft, latestPicks] = await Promise.all([
        fetch(`/api/db/draft/${draftId}`).then(res => res.json()),
        fetch(`/api/db/draft/${draftId}/picks`).then(res => res.json())
      ]);
      
      // Batch all updates together
      unstable_batchedUpdates(() => {
        dispatch({ type: 'RESET_AFTER_PICK' });
        mutateDraft(latestDraft, false);
        mutatePicks(latestPicks, false);
        updatePicksAndDraft(latestDraft, latestPicks);
      });
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
      dispatch({ type: 'SET_IS_PICK_SUBMITTING', payload: false });
    }
  };

  const addToQueue = (player: QueuePlayer) => {
    if (!state.queue.find(p => p.id === player.id)) {
      toast.success(`${player.full_name} has been added to your queue.`);
      dispatch({ type: 'ADD_TO_QUEUE', payload: player });
    }
  };

  const queueActions = {
    setQueue: (updater: QueuePlayer[] | ((prev: QueuePlayer[]) => QueuePlayer[])) => {
      if (typeof updater === 'function') {
        const newQueue = updater(state.queue);
        dispatch({ type: 'SET_QUEUE', payload: newQueue });
      } else {
        dispatch({ type: 'SET_QUEUE', payload: updater });
      }
    }
  };

  const memoizedDraft = useMemo(() => {
    if (draftData && state.picks.length > 0) {
      return {
        ...draftData,
        picks: state.picks
      };
    }
    return undefined;
  }, [draftData, state.picks]);

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
      <div className="grow overflow-hidden flex flex-col md:flex-row">
        {/* Desktop View */}
        <div className="hidden md:flex w-full h-[calc(100vh-64px)]">

          {/* Left Column */}
          <div className="w-1/4 overflow-hidden flex flex-col">
            <PlayersList
              draftId={draftId}
              onPlayerSelect={handlePlayerSelectMd}
              draft={memoizedDraft}
              selectedPlayer={state.selectedPlayer}
              className="md:bg-linear-to-l from-background to-muted/50"
              onAddToQueue={addToQueue}
            />
          </div>

          {/* Middle Column */}
          <div className="w-1/2 h-full overflow-hidden flex flex-col">
            <ScrollArea className="grow">
              <div className="p-4 space-y-4">
                <DraftStatus
                  draft={memoizedDraft}
                  leagueSettings={leagueSettings}
                  teams={teams}
                  team={team}
                />
              </div>
              <div className="p-4">
                <h2 className="text-2xl font-semibold mb-6">
                  {!state.selectedPlayer 
                    ? 
                    <>
                      <span className="text-primary mr-4">←</span> <span>Select a Player</span>
                    </>
                    : `Do you want to draft ${state.selectedPlayer.full_name}?`}
                </h2>
                <div className={`flex columns-2 gap-6 transition-all duration-500 ${state.selectedPlayer ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"} overflow-hidden`}>
                  <SubmitPickButton
                    isCurrentUserPick={isCurrentUserPick}
                    selectedPlayer={state.selectedPlayer}
                    currentPick={state.currentPick}
                    onSubmitPick={handleSubmitPick}
                    isPickSubmitting={state.isPickSubmitting}
                    className="scale-95 hover:scale-100 transition-transform duration-300 ease-in-out"
                  />
                  <PlayerDetails
                    player={state.selectedPlayer}
                  />
                </div>
              </div>
              <DraftQueue
                queue={state.queue}
                setQueue={queueActions.setQueue}
                managerId={team?.team_id}
                onPlayerClick={(player) => dispatch({ type: 'SET_SELECTED_PLAYER', payload: player })}
              />
            </ScrollArea>
          </div>

          {/* Right Column */}
          <div className="w-1/4 overflow-hidden flex flex-col">
            <div className="flex-shrink-0">
              <TeamNeeds
                teamKey={team?.team_key}
                leagueSettings={leagueSettings}
                draft={memoizedDraft}
                teams={teams}
              />
            </div>
            <div className="flex-1 min-h-0">
              <DraftedPlayers
                picks={memoizedDraft.picks}
                teamKey={team.team_key}
                teamName={team.name}
                currentPick={memoizedDraft.current_pick}
                className="md:bg-linear-to-r from-background to-muted/50 h-full"
              />
            </div>
          </div>
        </div>

        {/* Small screen layout */}
        <div className="md:hidden flex flex-col h-full">
          <Tabs value={state.activeTab} onValueChange={(tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="team">My Team</TabsTrigger>
            </TabsList>
            <TabsContent value="players" className="grow overflow-hidden">
              <PlayersList
                draftId={draftId}
                onPlayerSelect={handlePlayerSelect}
                draft={memoizedDraft}
                selectedPlayer={state.selectedPlayer}
                onAddToQueue={addToQueue}
              />
            </TabsContent>
            <TabsContent value="draft" className="grow overflow-hidden">
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
            <TabsContent value="team" className="grow overflow-hidden">
              <TeamNeeds
                teamKey={team?.team_key}
                leagueSettings={leagueSettings}
                draft={memoizedDraft}
                teams={teams}
              />
              <ScrollArea className="h-full">
                <div className="p-4">
                  <DraftedPlayers
                    picks={memoizedDraft.picks}
                    teamKey={team.team_key}
                    teamName={team.name}
                    currentPick={memoizedDraft.current_pick}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sheet for small screens */}
      <Sheet open={state.isSheetOpen} onOpenChange={(open) => dispatch({ type: 'SET_IS_SHEET_OPEN', payload: open })}>
        <SheetContent side="bottom" className="h-[50vh] flex flex-col md:hidden">
          <SheetHeader>
            <SheetTitle>Make your pick</SheetTitle>
          </SheetHeader>
          <ScrollArea className="grow">
            <div className="p-4 space-y-4">
              <SubmitPickButton
                isCurrentUserPick={isCurrentUserPick}
                selectedPlayer={state.selectedPlayer}
                currentPick={state.currentPick}
                onSubmitPick={handleSubmitPick}
                isPickSubmitting={state.isPickSubmitting}
              />
              {state.selectedPlayer ?
                <PlayerDetails
                  player={state.selectedPlayer}
                />
                :
                <div>
                  <h1>No player selected</h1>
                  <Button
                    onClick={() => { 
                      unstable_batchedUpdates(() => {
                        dispatch({ type: 'SET_ACTIVE_TAB', payload: "players" });
                        dispatch({ type: 'SET_IS_SHEET_OPEN', payload: false });
                      });
                    }}
                    variant="outline"
                    className='flex items-center justify-center w-full h-12'
                  >
                    Click to choose a player
                  </Button>
                </div>
              }
            </div>
            <div>
            <DraftQueue
                queue={state.queue}
                setQueue={queueActions.setQueue}
                managerId={team?.team_id}
                onPlayerClick={(player) => dispatch({ type: 'SET_SELECTED_PLAYER', payload: player })}
              />
            </div>
          </ScrollArea>
        </SheetContent>

        {/* Floating action button for small screens */}
        <SheetTrigger asChild>
          <Button
            size="icon"
            className={`fixed right-4 bottom-4 rounded-full shadow-lg md:hidden ${isCurrentUserPick ? 'animate-pulse ring-4 ring-success' : 'opacity-60 transition-opacity duration-300'}`}
          >
            <Plus className="h-8 w-8" />
          </Button>
        </SheetTrigger>
      </Sheet>
    </div>
  );
};

export default DraftPage;