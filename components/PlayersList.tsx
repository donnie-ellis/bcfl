// ./components/PlayersList.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { Player } from '@/lib/types';

interface PlayersListProps {
  leagueKey: string;
  draftId: string;
  onPlayerSelect: (player: Player) => void;
}

const PlayersList: React.FC<PlayersListProps> = ({ leagueKey, draftId, onPlayerSelect }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('rank', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
      } else {
        setPlayers(data);
      }
    };

    if (supabase) {
      fetchPlayers();

      const subscription = supabase
        .channel('drafted_players')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'draft_players', 
          filter: `draft_id=eq.${draftId}` 
        }, (payload) => {
          setPlayers(prevPlayers => 
            prevPlayers.map(player => 
              player.id === payload.new.player_id 
                ? { ...player, is_drafted: true } 
                : player
            )
          );
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [draftId, supabase]);

  const filteredPlayers = players.filter(player => 
    !player.is_drafted &&
    (player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     player.display_position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Players</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.map((player) => (
              <TableRow 
                key={player.id} 
                onClick={() => onPlayerSelect(player)}
                className="cursor-pointer hover:bg-gray-100"
              >
                <TableCell>{player.rank}</TableCell>
                <TableCell>{player.full_name}</TableCell>
                <TableCell>{player.display_position}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PlayersList;