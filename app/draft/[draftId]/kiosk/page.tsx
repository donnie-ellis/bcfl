// ./app/draft/[draftId]/kiosk/page.tsx
'use client'

import React, { useReducer, useCallback, useMemo, useEffect } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, PlayerWithADP, Json } from '@/lib/types/';
import { Pick, Player, Team } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import RoundSquares from '@/components/RoundSquares';
import { toast } from "sonner";
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftHeader from '@/components/DraftHeader';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PlayersList from '@/components/PlayersList';
import PlayerDetails from '@/components/PlayerDetails';
import SubmitPickButton from '@/components/SubmitPicksButton';
import useSWR from 'swr';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import TeamNeeds from '@/components/TeamNeeds';
import { parseTeamLogos, possesiveTitle } from '@/lib/types/team.types';
import TeamBreakdown from '@/components/TeamBreakdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import DraftTimer from '@/components/DraftTimer';
import AveragePickTime from '@/components/AveragePickTime';

type MemoizedDraft = Omit<Draft, 'picks'> & { picks: PickWithPlayerAndTeam[] };

// Define the state interface
interface KioskPageState {
  isPickSubmitting: boolean;
  selectedPlayer: PlayerWithADP | null;
  currentPick: PickWithPlayerAndTeam | null;
  picks: PickWithPlayerAndTeam[];
}

// Define action types
type KioskPageAction =
  | { type: 'SET_IS_PICK_SUBMITTING'; payload: boolean }
  | { type: 'SET_SELECTED_PLAYER'; payload: PlayerWithADP | null }
  | { type: 'SET_CURRENT_PICK'; payload: PickWithPlayerAndTeam | null }
  | { type: 'SET_PICKS'; payload: PickWithPlayerAndTeam[] }
  | { type: 'UPDATE_PICKS_AND_DRAFT'; payload: { picks: PickWithPlayerAndTeam[]; currentPick: PickWithPlayerAndTeam | null } }
  | { type: 'RESET_AFTER_PICK' };

// Initial state
const initialState: KioskPageState = {
  isPickSubmitting: false,
  selectedPlayer: null,
  currentPick: null,
  picks: [],
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

  const getTeamLogoUrl = (teamLogos: Json): string => {
    const parsedLogos = parseTeamLogos(teamLogos);
    return parsedLogos && parsedLogos.length > 0 ? parsedLogos[0].url : '';
  };

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

      // Batch the reset and SWR mutation
      unstable_batchedUpdates(() => {
        dispatch({ type: 'RESET_AFTER_PICK' });
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

  const currentRound = useMemo(() => {
    if (memoizedDraft && memoizedDraft.current_pick && teams) {
      return Math.ceil(memoizedDraft.current_pick / teams.length);
    }
    return 1;
  }, [memoizedDraft, teams]);

  const draftProgress = useMemo(() => {
    if (memoizedDraft) {
      const pickedCount = memoizedDraft.picks.filter(pick => pick.is_picked).length;
      return (pickedCount / memoizedDraft.total_picks) * 100;
    }
    return 0;
  }, [memoizedDraft]);

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

  if (isLoading && memoizedDraft?.status === 'completed') {
    return (
      <Alert>
        <AlertTitle>Draft Completed</AlertTitle>
        <AlertDescription>
          The draft has been completed. You will be redirected to the draft board shortly.
        </AlertDescription>
      </Alert>
    );
  } else if (isLoading) {
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  };

  return (
    <div className="flex flex-col h-screen bg-muted/50">
      {leagueData && memoizedDraft && (
        <DraftHeader league={leagueData} draft={memoizedDraft} />
      )}
      <div className="flex-none w-full">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Round {currentRound}</h2>
          {memoizedDraft && leagueSettings && teams && (
            <RoundSquares
              draft={memoizedDraft}
              leagueSettings={leagueSettings}
              currentRoundOnly={true}
              isLoading={isLoading}
              teams={teams}
              currentRound={currentRound}
            />
          )}
          <div className="mt-4 flex items-center">
            <Progress value={draftProgress} className="grow mr-4" />
            <span className="text-sm font-medium">
              Pick {memoizedDraft?.current_pick} of {memoizedDraft?.total_picks}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grow overflow-hidden flex">
        {/* Left Column */}
        <div className="w-1/4 flex flex-col">
          {memoizedDraft && state.currentPick && (
            <div className="flex-1 min-h-0">
              <DraftedPlayers
                picks={memoizedDraft.picks}
                teamKey={state.currentPick.team_key}
                teamName={teams ? teams.find(team => team.team_key === state.currentPick!.team_key)?.name : ''}
                currentPick={memoizedDraft.current_pick}
                className="pl-4 h-full"
              />
            </div>
          )}
        </div>

        {/* Center Column */}
        <div className="w-1/2 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {state.currentPick && leagueSettings && teams && memoizedDraft && currentTeam && (
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={getTeamLogoUrl(currentTeam.team_logos)} alt={currentTeam.name} />
                        <AvatarFallback>{currentTeam.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="grow">
                        <div className="flex justify-between items-center">
                          <h2 className='text-2xl font-bold'>{possesiveTitle(currentTeam.name)} draft summary</h2>
                          <div className="text-right">
                            <p className="text-sm font-semibold">Remaining Picks</p>
                            <p className="text-2xl font-bold">{remainingPicks}</p>
                          </div>
                        </div>
                        <div className='flex space-x-2 text-sm'>
                          {currentTeam.managers?.map((manager, index) => (
                            <span key={index} className="flex items-center space-x-2">
                              <span>{manager.nickname ?? 'Unknown'}</span>
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={manager.image_url as string} alt={manager.nickname ?? 'Unknown'} />
                                <AvatarFallback>{(manager.nickname ?? 'U')[0]}</AvatarFallback>
                              </Avatar>
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DraftTimer
                      draftId={memoizedDraft.id}
                    />
                    <AveragePickTime
                      picks={memoizedDraft.picks}
                      teamKey={currentTeam.team_key}
                    />
                    <TeamNeeds
                      draft={memoizedDraft}
                      teamKey={currentTeam.team_key}
                      leagueSettings={leagueSettings}
                      teams={teams}
                    />
                    <TeamBreakdown
                      leagueSettings={leagueSettings}
                      draft={memoizedDraft}
                      teamKey={currentTeam.team_key}
                      teams={teams}
                      />
                  </CardContent>
                </Card>
              )}
              <div className="p-4">
                <h2 className="text-2xl font-semibold mb-6 text-right">
                  {!state.selectedPlayer 
                    ? 
                    <>
                      <span>Select a player to proceed</span>
                      <span className="text-primary ml-4">→</span>
                    </>
                    : `Ready to draft ${state.selectedPlayer?.full_name}?`}
                  </h2>
                <div className={`flex columns-2 gap-6 transition-all duration-500 ${state.selectedPlayer ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"} overflow-hidden`}>
                  <PlayerDetails player={state.selectedPlayer} />
                  <SubmitPickButton
                    isCurrentUserPick={true}
                    selectedPlayer={state.selectedPlayer}
                    currentPick={state.currentPick}
                    onSubmitPick={handleSubmitPick}
                    isPickSubmitting={state.isPickSubmitting}
                    className='scale-95 hover:scale-100 transition-transform duration-300 ease-in-out'
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Column */}
        <div className="w-1/4 pr-2 flex flex-col">
          {memoizedDraft && (
            <div className="flex-1 min-h-0">
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