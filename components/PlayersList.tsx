// ./components/PlayersList.tsx
'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { PlayerWithADP, Draft, Pick } from '@/lib/types/';
import PlayerFilters from './PlayerFilters';
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/PlayerCard';
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from 'swr';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { Separator } from './ui/separator';

interface PlayersListProps {
  draftId: string;
  onPlayerSelect: (player: PlayerWithADP) => void;
  draft: Draft;
  selectedPlayer: PlayerWithADP | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface EnhancedPlayerWithADP extends PlayerWithADP {
  is_drafted?: boolean;
}

const PlayersList: React.FC<PlayersListProps> = React.memo(({ draftId, onPlayerSelect, draft }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [hideSelected, setHideSelected] = useState(true);
  const supabase = useSupabaseClient();

  const { data: playersData, error: playersError, mutate: mutatePlayers } = useSWR<PlayerWithADP[]>(
    `/api/db/draft/${draftId}/players`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const { data: picksData, error: picksError, mutate: mutatePicks } = useSWR<Pick[]>(
    `/api/db/draft/${draftId}/picks`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  useEffect(() => {
    if (supabase && draftId) {
      const subscription = supabase
        .channel('picks_updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'picks',
          filter: `draft_id=eq.${draftId}`
        }, () => {
          mutatePicks();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [supabase, draftId, mutatePicks]);

  const players: EnhancedPlayerWithADP[] = useMemo(() => {
    if (!playersData || !picksData) return [];

    const draftedPlayerIds = new Set(picksData.filter(pick => pick.player_id).map(pick => pick.player_id));

    return playersData.map(player => ({
      ...player,
      is_drafted: draftedPlayerIds.has(player.id)
    }));
  }, [playersData, picksData]);

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

  if (playersError || picksError) return <div>Error loading data</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
      <h2 className='text-2xl ml-4 py-2 font-bold'>Players</h2>
        <div className="px-4 py-2">
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
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  whileTap={{ scale: 0.85}}
                >
                  <PlayerCard
                    player={player}
                    isDrafted={player.is_drafted || false}
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