// ./components/PlayersList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { Player } from '@/lib/types';
import PlayerFilters from './PlayerFilters';
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/PlayerCard';

interface PlayersListProps {
  leagueKey: string;
  draftId: string;
  onPlayerSelect: (player: Player) => void;
}

const PlayersList: React.FC<PlayersListProps> = ({ leagueKey, draftId, onPlayerSelect }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftedPlayerIds, setDraftedPlayerIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [hideSelected, setHideSelected] = useState(false);
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!supabase) return;

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('rank', { ascending: true });

      if (playersError) {
        console.error('Error fetching players:', playersError);
      } else {
        setPlayers(playersData);
      }

      // Fetch drafted players
      const { data: draftedData, error: draftedError } = await supabase
        .from('draft_players')
        .select('player_id')
        .eq('draft_id', draftId)
        .eq('is_picked', true);

      if (draftedError) {
        console.error('Error fetching drafted players:', draftedError);
      } else {
        setDraftedPlayerIds(draftedData.map(item => item.player_id));
      }
    };

    if (supabase) {
      fetchPlayers();

      const subscription = supabase
        .channel('drafted_players')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'draft_players', 
          filter: `draft_id=eq.${draftId}` 
        }, (payload) => {
          setDraftedPlayerIds(prev => [...prev, payload.new.player_id]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [draftId, supabase]);

  const positions = useMemo(() => {
    const allPositions = players.flatMap(player => player.eligible_positions);
    return Array.from(new Set(allPositions)).filter(pos => pos !== 'IR' && pos !== 'BN');
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
  }, [players, searchTerm, selectedPositions, hideSelected, draftedPlayerIds]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-3">
        <CardTitle>Available Players</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow p-0">
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
          <div className="space-y-2 py-2">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isDrafted={draftedPlayerIds.includes(player.id)}
                onClick={() => onPlayerSelect(player)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PlayersList;