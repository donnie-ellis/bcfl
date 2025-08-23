// ./app/draft/[draftId]/kiosk/page.tsx
'use client'

import React, { useReducer, useCallback, useMemo, useEffect } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, PlayerWithADP } from '@/lib/types/';
import { Pick, Player, Team } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import PositionNeeds from '@/components/draft/kiosk/PostionNeeds';
import KioskHeader from '@/components/draft/kiosk/KioskHeader';
import KioskTeamStatus from '@/components/draft/kiosk/KioskTeamStatus';
import KioskPlayerSelection from '@/components/draft/kiosk/KioskPlayerSelection';

type MemoizedDraft = Omit<Draft, 'picks'> & { picks: PickWithPlayerAndTeam[] };

// Define the state interface
interface KioskPageState {
  isPickSubmitting: boolean;
  selectedPlayer: PlayerWithADP | null;
  currentPick: PickWithPlayerAndTeam | null;
  picks: PickWithPlayerAndTeam[];
  isOvertime: boolean;
}

// Define action types
type KioskPageAction =
  | { type: 'SET_IS_PICK_SUBMITTING'; payload: boolean }
  | { type: 'SET_SELECTED_PLAYER'; payload: PlayerWithADP | null }
  | { type: 'SET_CURRENT_PICK'; payload: PickWithPlayerAndTeam | null }
  | { type: 'SET_PICKS'; payload: PickWithPlayerAndTeam[] }
  | { type: 'SET_IS_OVERTIME'; payload: boolean }
  | { type: 'UPDATE_PICKS_AND_DRAFT'; payload: { picks: PickWithPlayerAndTeam[]; currentPick: PickWithPlayerAndTeam | null } }
  | { type: 'RESET_AFTER_PICK' };

// Initial state
const initialState: KioskPageState = {
  isPickSubmitting: false,
  selectedPlayer: null,
  currentPick: null,
  picks: [],
  isOvertime: false,
};

// Reducer function
const kioskPageReducer = (state: KioskPageState, action: KioskPageAction): KioskPageState => {
  switch (action.type) {
    case 'SET_IS_PICK_SUBMITTING':
      return { ...state, isPickSubmitting: action.payload };
    case 'SET_SELECTED_PLAYER':
      return { ...state, selectedPlayer: action.payload };
    case 'SET_CURRENT_PICK':
      return { ...state, currentPick: action.payload };
    case 'SET_PICKS':
      return { ...state, picks: action.payload };
    case 'SET_IS_OVERTIME':
      return { ...state, isOvertime: action.payload };
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
    default:
      return state;
  }
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

const KioskPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [state, dispatch] = useReducer(kioskPageReducer, initialState);

  const { data: draftData, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: picksData, mutate: mutatePicks } = useSWR<Pick[]>(
    draftData ? `/api/db/draft/${draftId}/picks` : null,
    fetcher
  );
  const { data: leagueData } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams } = useSWR<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: players } = useSWR<Player[]>(`/api/db/league/${draftData?.league_id}/players`, fetcher);
  
  const isLoading = !draftData || !leagueData || !leagueSettings || !teams || !players || !state.currentPick;

  // Calculate team needs based on league settings and current picks
  const calculateTeamNeeds = useCallback((teamKey: string, leagueSettings: LeagueSettings, picks: PickWithPlayerAndTeam[]) => {
    if (!leagueSettings?.roster_positions) return [];

    // This is a simplified calculation - you'd implement the full logic from your TeamNeeds component
    const teamPicks = picks.filter(pick => pick.team_key === teamKey && pick.is_picked);
    
    // Example position needs - replace with actual calculation from your TeamNeeds component
    return [
      { position: "QB", needed: Math.max(0, 1 - teamPicks.filter(p => p.player?.display_position === "QB").length), have: teamPicks.filter(p => p.player?.display_position === "QB").length, total: 1 },
      { position: "RB", needed: Math.max(0, 2 - teamPicks.filter(p => p.player?.display_position === "RB").length), have: teamPicks.filter(p => p.player?.display_position === "RB").length, total: 2 },
      { position: "WR", needed: Math.max(0, 3 - teamPicks.filter(p => p.player?.display_position === "WR").length), have: teamPicks.filter(p => p.player?.display_position === "WR").length, total: 3 },
      { position: "TE", needed: Math.max(0, 1 - teamPicks.filter(p => p.player?.display_position === "TE").length), have: teamPicks.filter(p => p.player?.display_position === "TE").length, total: 1 },
      { position: "K", needed: Math.max(0, 1 - teamPicks.filter(p => p.player?.display_position === "K").length), have: teamPicks.filter(p => p.player?.display_position === "K").length, total: 1 },
      { position: "DEF", needed: Math.max(0, 1 - teamPicks.filter(p => p.player?.display_position === "DEF").length), have: teamPicks.filter(p => p.player?.display_position === "DEF").length, total: 1 },
    ];
  }, []);

  const updatePicksAndDraft = useCallback(() => {
    if (!draftData || !picksData || !players || !teams) return;

    const updatedPicks: PickWithPlayerAndTeam[] = picksData.map(pick => ({
      ...pick,
      player: pick.player_id ? players.find(p => p.id === pick.player_id) || null : null,
      team: teams.find(t => t.team_key === pick.team_key) ?? {} as Team
    }));

    const updatedCurrentPick = updatedPicks.find(p => !p.is_picked) || null;

    // Batch all state updates together
    unstable_batchedUpdates(() => {
      dispatch({
        type: 'UPDATE_PICKS_AND_DRAFT',
        payload: {
          picks: updatedPicks,
          currentPick: updatedCurrentPick,
        }
      });

      // Update SWR cache if current pick changed
      if (updatedCurrentPick && draftData.current_pick !== updatedCurrentPick.total_pick_number) {
        mutateDraft({ ...draftData, current_pick: updatedCurrentPick.total_pick_number }, false);
      }
    });
  }, [draftData, picksData, players, teams, mutateDraft]);

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

  // Timer expire callback to set overtime state
  const handleTimerExpire = useCallback(() => {
    dispatch({ type: 'SET_IS_OVERTIME', payload: true });
  }, []);

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
          // Reset overtime state when pick is made
          dispatch({ type: 'SET_IS_OVERTIME', payload: false });
          
          // Batch the SWR mutation with the notification
          unstable_batchedUpdates(() => {
            mutatePicks();
            notifyPickMade(updatedPick);
          });
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to picks updates for draft:', draftId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to picks updates:', status);
        }
      });

    return () => {
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, mutatePicks, notifyPickMade]);

  useEffect(() => {
    updatePicksAndDraft();
  }, [updatePicksAndDraft, picksData]);

  const handlePlayerSelect = async (player: PlayerWithADP) => {
    if (player && player === state.selectedPlayer) {
      dispatch({ type: 'SET_SELECTED_PLAYER', payload: null });
    } else {
      dispatch({ type: 'SET_SELECTED_PLAYER', payload: player });
    }
  }

  const handleSubmitPick = async () => {
    dispatch({ type: 'SET_IS_PICK_SUBMITTING', payload: true });
    
    if (!state.currentPick || !draftData || !state.selectedPlayer) {
      toast.error("Unable to submit pick. Please select a player and try again.");
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
          playerId: state.selectedPlayer.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit pick');
      }

      // Reset overtime and selection state
      unstable_batchedUpdates(() => {
        dispatch({ type: 'RESET_AFTER_PICK' });
        dispatch({ type: 'SET_IS_OVERTIME', payload: false });
        mutatePicks();
      });
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
      dispatch({ type: 'SET_IS_PICK_SUBMITTING', payload: false });
    }
  };

  const memoizedDraft = useMemo<MemoizedDraft | undefined>(() => {
    if (draftData && state.picks.length > 0) {
      return {
        ...draftData,
        picks: state.picks
      };
    }
    return undefined;
  }, [draftData, state.picks]);

  useEffect(() => {
    if (memoizedDraft && memoizedDraft.status === 'completed') {
      router.push(`/draft/${draftId}/board`);
    }
  }, [memoizedDraft, draftId, router]);

  const currentTeam = useMemo(() => {
    if (state.currentPick && teams) {
      return teams.find(team => team.team_key === state.currentPick!.team_key);
    }
    return undefined;
  }, [state.currentPick, teams]);

  const remainingPicks = useMemo(() => {
    if (currentTeam && memoizedDraft) {
      return memoizedDraft.picks.filter(pick => pick.team_key === currentTeam.team_key && !pick.is_picked).length;
    }
    return 0;
  }, [currentTeam, memoizedDraft]);

  const teamNeeds = useMemo(() => {
    if (currentTeam && leagueSettings && state.picks.length > 0) {
      return calculateTeamNeeds(currentTeam.team_key, leagueSettings, state.picks);
    }
    return [];
  }, [currentTeam, leagueSettings, state.picks, calculateTeamNeeds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (memoizedDraft?.status === 'completed') {
    return (
      <Alert>
        <AlertTitle>Draft Completed</AlertTitle>
        <AlertDescription>
          The draft has been completed. You will be redirected to the draft board shortly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-screen bg-gradient-to-br from-background via-muted/30 to-background",
      "min-h-screen transition-all duration-300",
      state.isOvertime && "ring-8 ring-red-500 ring-opacity-60 shadow-2xl shadow-red-500/30"
    )}>
      {/* Header */}
      {leagueData && memoizedDraft && teams && (
        <KioskHeader 
          league={leagueData} 
          draft={memoizedDraft} 
          teams={teams}
          leagueSettings={leagueSettings}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Left Column - Current Team's Picks */}
        <div className="w-1/4 border-r-2 bg-card/30">
          {memoizedDraft && state.currentPick && currentTeam && (
            <DraftedPlayers
              picks={memoizedDraft.picks}
              teamKey={state.currentPick.team_key}
              teamName={currentTeam.name}
              currentPick={memoizedDraft.current_pick}
              className="h-full"
            />
          )}
        </div>

        {/* Center Column - Main Draft Interface */}
        <div className="w-1/2 flex flex-col min-h-0">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Team Status Card */}
              {currentTeam && (
                <KioskTeamStatus
                  team={currentTeam}
                  remainingPicks={remainingPicks}
                  draftId={parseInt(draftId)}
                  picks={state.picks}
                  isOvertime={state.isOvertime}
                  pickDuration={draftData.pick_seconds ? draftData.pick_seconds : undefined}
                />
              )}

              {/* Position Needs Card */}
              {teamNeeds.length > 0 && (
                <Card className="border-2 shadow-lg">
                  <CardContent className="pt-6">
                    <PositionNeeds 
                      needs={teamNeeds}
                      size="lg"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Player Selection Section */}
              <KioskPlayerSelection
                selectedPlayer={state.selectedPlayer}
                isSubmitting={state.isPickSubmitting}
                onSubmitPick={handleSubmitPick}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Available Players */}
        <div className="w-1/4 border-l-2 bg-card/30">
          {memoizedDraft && (
            <div className="h-full">
              <PlayersList
                draftId={draftId}
                onPlayerSelect={handlePlayerSelect}
                draft={memoizedDraft}
                selectedPlayer={state.selectedPlayer}
                className="h-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskPage;