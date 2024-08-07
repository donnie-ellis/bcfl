// ./components/PlayersList.tsx
'use client'

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Player, Draft } from '@/lib/types';
import PlayerFilters from './PlayerFilters';
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/PlayerCard';
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from 'swr';

interface PlayersListProps {
  leagueKey: string;
  draftId: string;
  draft: Draft | undefined;
  onPlayerSelect: (player: Player) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PlayersList: React.FC<PlayersListProps> = ({ leagueKey, draftId, draft, onPlayerSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [hideSelected, setHideSelected] = useState(true);

  const { data: playersData, error: playersError } = useSWR<Player[]>(
    `/api/db/league/${leagueKey}/players?draftId=${draftId}`,
    fetcher
  );

  const players = useMemo(() => playersData || [], [playersData]);
  
  const draftedPlayerIds = useMemo(() => 
    draft.picks.filter(pick => pick.is_picked).map(pick => pick.player_id),
    [draft.picks]
  );
  const positions = useMemo(() => {
    const allPositions = players.flatMap(player => player.eligible_positions);
    return Array.from(new Set(allPositions)).filter(pos => pos !== 'IR' && pos !== 'BN' && pos !== 'W/R/T');
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            player.display_position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = selectedPositions.length === 0 || 
                              player.eligible_positions.some(pos => selectedPositions.includes(pos));
      const isSelected = draftedPlayerIds.includes(player.id);
      const matchesHideSelected = !hideSelected || !isSelected;

      return matchesSearch && matchesPosition && matchesHideSelected;
    });
  }, [players, draftedPlayerIds, searchTerm, selectedPositions, hideSelected]);

  const handlePlayerClick = (player: Player) => {
    if (!draftedPlayerIds.includes(player.id)) {
      onPlayerSelect(player);
    }
  };

  if (playersError) return <div>Error loading players</div>;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-3">
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow p-0 h-full overflow-hidden">
        <div className="py-2">
          <PlayerFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedPositions={selectedPositions}
            setSelectedPositions={setSelectedPositions}
            hideSelected={hideSelected}
            setHideSelected={setHideSelected}
            positions={positions}
          />
        </div>
        <ScrollArea className="flex-grow px-4">
          <AnimatePresence>
            {!players.length ? (
              Array.from({ length: 10 }).map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Skeleton className="h-20 w-full mb-2" />
                </motion.div>
              ))
            ) : (
              filteredPlayers.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <PlayerCard
                    player={player}
                    isDrafted={draftedPlayerIds.includes(player.id)}
                    onClick={() => handlePlayerClick(player)}
                    fadeDrafted={true}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PlayersList;