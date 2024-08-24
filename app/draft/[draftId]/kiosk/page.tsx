// ./app/draft/[draftId]/kiosk/page.tsx
'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import TeamNeeds from '@/components/TeamNeeds';
import { parseTeamLogos, possesiveTitle } from '@/lib/types/team.types';
import { AnimatePresence, motion } from 'framer-motion';

type MemoizedDraft = Omit<Draft, 'picks'> & { picks: PickWithPlayerAndTeam[] };

const fetcher = (url: string) => fetch(url).then(res => res.json());

const KioskPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();
  const [isPickSubmitting, setIsPickSubmitting] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithADP | null>(null);

  const { data: draftData, mutate: mutateDraft } = useSWR<Draft>(`/api/db/draft/${draftId}`, fetcher);
  const { data: picksData, mutate: mutatePicks } = useSWR<Pick[]>(
    draftData ? `/api/db/draft/${draftId}/picks` : null,
    fetcher
  );
  const { data: leagueData } = useSWR<League>(draftData ? `/api/db/league/${draftData.league_id}` : null, fetcher);
  const { data: leagueSettings } = useSWR<LeagueSettings>(draftData ? `/api/db/league/${draftData.league_id}/settings` : null, fetcher);
  const { data: teams } = useSWR<Team[]>(draftData ? `/api/yahoo/league/${draftData.league_id}/teams` : null, fetcher);
  const { data: players } = useSWR<Player[]>(`/api/db/league/${draftData?.league_id}/players`, fetcher);
  const [currentPick, setCurrentPick] = useState<PickWithPlayerAndTeam | null>(null);
  const [picks, setPicks] = useState<PickWithPlayerAndTeam[]>([]);
  const isLoading = !draftData || !leagueData || !leagueSettings || !teams || !players || !currentPick;

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

    setPicks(updatedPicks);

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

  const handlePlayerSelect = async (player: PlayerWithADP) => {
    if (player && player === selectedPlayer) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  }

  const handleSubmitPick = async () => {
    setIsPickSubmitting(true);
    if (!currentPick || !draftData || !selectedPlayer) {
      toast.error("Unable to submit pick. Please select a player and try again.");
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
          playerId: selectedPlayer.id
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to submit pick');
      }

      // Update SWR cache
      mutatePicks();
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    } finally {
      setIsPickSubmitting(false);
    }
  };


  const memoizedDraft = useMemo<MemoizedDraft | undefined>(() => {
    if (draftData && picks.length > 0) {
      return {
        ...draftData,
        picks: picks
      };
    }
    return undefined;
  }, [draftData, picks]);

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
    if (currentPick && teams) {
      return teams.find(team => team.team_key === currentPick.team_key);
    }
    return undefined;
  }, [currentPick, teams]);

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
    <div className="flex flex-col h-screen">
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
            <Progress value={draftProgress} className="flex-grow mr-4" />
            <span className="text-sm font-medium">
              Pick {memoizedDraft?.current_pick} of {memoizedDraft?.total_picks}
            </span>
          </div>
        </div>
      </div>

      {/* Left Column */}
      <div className="flex-grow overflow-hidden flex">
        <div className="w-1/4 p-4">
          {memoizedDraft && currentPick && (
            <DraftedPlayers
              picks={memoizedDraft.picks}
              teamKey={currentPick.team_key}
              teamName={teams ? teams.find(team => team.team_key === currentPick.team_key)?.name : ''}
            />
          )}
        </div>

        {/* Center Column */}
        <div className="w-1/2 p-4 flex flex-col space-y-4">
          {currentPick && leagueSettings && teams && memoizedDraft && currentTeam && (
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={getTeamLogoUrl(currentTeam.team_logos)} alt={currentTeam.name} />
                    <AvatarFallback>{currentTeam.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
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
              <CardContent className="flex-grow overflow-hidden space-y-4">
                <TeamNeeds
                  draft={memoizedDraft}
                  teamKey={currentTeam.team_key}
                  leagueSettings={leagueSettings}
                  teams={teams}
                />
              </CardContent>
            </Card>
          )}
          {selectedPlayer && (
            <AnimatePresence>
              <motion.div
                key="playerSelected"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.2 }}
                className='space-y-4'
              >
                <PlayerDetails player={selectedPlayer} />
                <SubmitPickButton
                  isCurrentUserPick={true}
                  selectedPlayer={selectedPlayer}
                  currentPick={currentPick}
                  onSubmitPick={handleSubmitPick}
                  isPickSubmitting={isPickSubmitting}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Right Column */}
        <div className="w-1/4 pr-2">
          {memoizedDraft && (
            <PlayersList
              draftId={draftId}
              onPlayerSelect={handlePlayerSelect}
              draft={memoizedDraft}
              selectedPlayer={selectedPlayer}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskPage;