// ./components/DraftedPlayers.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings, Pick, Player } from '@/lib/types';
import PlayerCard from '@/components/PlayerCard';
import { Skeleton } from "@/components/ui/skeleton";

interface DraftedPlayersProps {
  draftId: string;
  picks: Pick[];
  leagueSettings: LeagueSettings;
  teamKey: string;
  lastUpdateTimestamp: number;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = React.memo(({ 
  draftId,
  picks,
  leagueSettings, 
  teamKey,
  lastUpdateTimestamp
}) => {
  const [playerDetails, setPlayerDetails] = useState<Record<string, Player>>({});
  const [loadingPlayerIds, setLoadingPlayerIds] = useState<number[]>([]);
  const supabase = useSupabaseClient();

  const teamPicks = useMemo(() => {
    return picks
      .filter(pick => pick.team_key === teamKey)
      .sort((a, b) => a.total_pick_number - b.total_pick_number);
  }, [picks, teamKey]);

  const fetchPlayerDetails = useCallback(async (playerIds: number[]) => {
    if (!supabase || playerIds.length === 0) return;

    setLoadingPlayerIds(playerIds);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds);

      if (error) throw error;

      const newPlayerMap = data.reduce((acc, player) => {
        acc[player.id] = player;
        return acc;
      }, {} as Record<string, Player>);

      setPlayerDetails(prevDetails => ({...prevDetails, ...newPlayerMap}));
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setLoadingPlayerIds([]);
    }
  }, [supabase]);

  useEffect(() => {
    const newPlayerIds = teamPicks
      .filter(pick => pick.player_id && !playerDetails[pick.player_id])
      .map(pick => pick.player_id as number);

    if (newPlayerIds.length > 0) {
      fetchPlayerDetails(newPlayerIds);
    }
  }, [teamPicks, playerDetails, fetchPlayerDetails]);

  const PlayerCardSkeleton = () => (
    <Card className="mb-2">
      <CardContent className="p-3 flex items-center space-x-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-grow space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-6" />
      </CardContent>
    </Card>
  );

  const PlaceholderCard = () => (
    <Card className='mb-2 cursor-pointer hover:bg-gray-100 transition-all opacity-50'>
      <CardContent className="p-3 flex items-center space-x-3">
        <div className="flex-grow">
          <p className="font-semibold">Not yet selected</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderPickCard = useCallback((pick: Pick) => {
    if (!pick.is_picked) {
      return <PlaceholderCard />;
    }

    if (!pick.player_id) {
      return (
        <Card className='mb-2 cursor-pointer hover:bg-gray-100 transition-all opacity-50'>
          <CardContent className="p-3 flex items-center space-x-3">
            <div className="flex-grow">
              <p className="font-semibold">Player data not available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (loadingPlayerIds.includes(pick.player_id)) {
      return <PlayerCardSkeleton />;
    }

    const player = playerDetails[pick.player_id];
    if (player) {
      return (
        <PlayerCard
          player={player}
          isDrafted={true}
          onClick={() => {}}
        />
      );
    }

    return <PlayerCardSkeleton />;
  }, [playerDetails, loadingPlayerIds]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Team Picks</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          {teamPicks.map((pick) => (
            <div key={pick.id} className="mb-4">
              <div className="font-semibold text-sm text-gray-500 mb-1">
                Round {pick.round_number}, Pick {pick.pick_number} (Overall: {pick.total_pick_number})
              </div>
              {renderPickCard(pick)}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

DraftedPlayers.displayName = 'DraftedPlayers';

export default DraftedPlayers;