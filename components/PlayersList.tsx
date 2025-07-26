// ./components/PlayersList.tsx
'use client'

import React, { useState, useMemo, useCallback } from 'react';
import { PlayerWithADP, Draft, Pick, EnhancedPlayerWithADP } from '@/lib/types/';
import PlayerFilters from './PlayerFilters';
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/PlayerCard';
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from 'swr';
import { Separator } from './ui/separator';

interface PlayersListProps {
  draftId: string;
  onPlayerSelect: (player: PlayerWithADP) => void;
  draft: Draft;
  selectedPlayer: PlayerWithADP | null;
  className?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PlayersList: React.FC<PlayersListProps> = React.memo(({ draftId, onPlayerSelect, draft, selectedPlayer, className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [hideSelected, setHideSelected] = useState(true);

  const { data: playersData, error: playersError } = useSWR<PlayerWithADP[]>(
    `/api/db/draft/${draftId}/players`,
    fetcher,
    { 
      revalidateOnFocus: false, 
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

  const players: EnhancedPlayerWithADP[] = useMemo(() => {
    if (!playersData || !draft.picks) return [];

    const draftedPlayerIds = new Set(draft.picks.filter(pick => pick.player_id).map(pick => pick.player_id));

    return playersData.map(player => ({
      ...player,
      is_drafted: draftedPlayerIds.has(player.id)
    }));
  }, [playersData, draft.picks]);

  const positions = useMemo(() => {
    const allPositions = players.flatMap(player => player.eligible_positions || []);
    return Array.from(new Set(allPositions)).filter(pos => pos !== 'IR' && pos !== 'BN' && pos !== 'W/R/T');
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter(player => {
        const matchesSearch = (player.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (player.display_position || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPosition = selectedPositions.length === 0 ||
          (player.eligible_positions && player.eligible_positions.some(pos => selectedPositions.includes(pos)));
        const matchesHideSelected = !hideSelected || !player.is_drafted;

        return matchesSearch && matchesPosition && matchesHideSelected;
      })
      .sort((a, b) => {
        const adpA = a.adp !== null ? a.adp : Infinity;
        const adpB = b.adp !== null ? b.adp : Infinity;
        return adpA - adpB;
      });
  }, [players, searchTerm, selectedPositions, hideSelected]);

  const handlePlayerClick = useCallback((player: EnhancedPlayerWithADP) => {
    if (!player.is_drafted) {
      onPlayerSelect(player);
    }
  }, [onPlayerSelect]);

  if (playersError) return <div>Error loading data</div>;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-shrink-0">
        <h2 className='text-2xl ml-4 py-2 font-bold text-primary text-center'>Players</h2>
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
      </div>
      <Separator className='ml-4' />
      <ScrollArea className="flex-grow">
        <div className="p-4 pr-3">
          <AnimatePresence>
            {!playersData ? (
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
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  whileTap={{ scale: 0.85}}
                >
                  <PlayerCard
                    player={player}
                    isDrafted={player.is_drafted}
                    onClick={() => handlePlayerClick(player)}
                    fadeDrafted={true}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
});

PlayersList.displayName = 'PlayersList';

export default PlayersList;