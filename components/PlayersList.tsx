// ./components/PlayersList.tsx
'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PlayerWithADP, Draft, Pick, EnhancedPlayerWithADP, Player } from '@/lib/types/';
import PlayerFilters from './PlayerFilters';
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/PlayerCard';
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from 'swr';
import { useVirtualizer } from '@tanstack/react-virtual';

// Fixed row height (PlayerCard content + its own mb-2 spacing) used for
// virtualization. The card's content is uniform (fixed avatar size, two
// lines of text) so a constant row height is safe here.
const ROW_HEIGHT = 84;

interface PlayersListProps {
  draftId: string;
  onPlayerSelect: (player: PlayerWithADP) => void;
  draft: Draft;
  selectedPlayer: PlayerWithADP | null;
  className?: string;
  enableQueue?: boolean;
  onAddToQueue?: (player: PlayerWithADP | EnhancedPlayerWithADP | Player) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PlayersList: React.FC<PlayersListProps> = React.memo(({ draftId, onPlayerSelect, draft, selectedPlayer, className, enableQueue = false, onAddToQueue }) => {
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
    const allPositions = players.flatMap(player => player.fantasy_positions || []);
    return Array.from(new Set(allPositions)).filter((pos): pos is string => pos !== 'IR' && pos !== 'BN' && pos !== 'W/R/T');
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter(player => {
        const matchesSearch = (player.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (player.position || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPosition = selectedPositions.length === 0 ||
          (player.fantasy_positions && player.fantasy_positions.some(pos => selectedPositions.includes(pos)));
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

  // Radix's ScrollArea only forwards a ref to its Root, not the scrollable
  // Viewport inside it, so grab the viewport element (marked by Radix with
  // this data attribute) once it's mounted to hand to the virtualizer.
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-radix-scroll-area-viewport]'
    );
    if (viewport) setScrollElement(viewport);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredPlayers.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (playersError) return <div>Error loading data</div>;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="shrink-0">
        <h2 className='text-lg ml-4 py-2 font-semibold text-primary text-center'>Players</h2>
        <div className="p-2 pl-4">
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
      <ScrollArea className="grow" ref={scrollAreaRef}>
        <div className="p-4 pr-3">
            {!playersData ? (
              Array.from({ length: 10 }).map((_, index) => (
                <div className='rounded-lg bg-background h-20 w-full mb-2' key={index}>
                  <div className="flex items-center justify-between p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className='flex flex-col space-y-2 w-full ml-4'>
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const player = filteredPlayers[virtualRow.index];
                  return (
                    <div
                      key={player.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: ROW_HEIGHT,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <PlayerCard
                        player={player}
                        isDrafted={player.is_drafted}
                        onClick={() => handlePlayerClick(player)}
                        fadeDrafted={true}
                        onAddToQueue={onAddToQueue}
                        selectedPlayer={selectedPlayer}
                      />
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
});

PlayersList.displayName = 'PlayersList';

export default PlayersList;