// ./components/DraftedPlayers.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings, Pick, Player } from '@/lib/types';

interface DraftedPlayersProps {
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = ({ leagueKey, draftId, leagueSettings }) => {
  const [draftedPlayers, setDraftedPlayers] = useState<(Pick & { player: Player })[]>([]);
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchDraftedPlayers = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('picks')
        .select(`
          *,
          player:players(*)
        `)
        .eq('draft_id', draftId)
        .eq('is_picked', true)
        .order('total_pick_number', { ascending: true });

      if (error) {
        console.error('Error fetching drafted players:', error);
      } else {
        setDraftedPlayers(data);
      }
    };

    if (supabase) {
      fetchDraftedPlayers();

      const subscription = supabase
        .channel('drafted_players')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, (payload) => {
          fetchDraftedPlayers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [draftId, supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drafted Players</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pick</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draftedPlayers.map((pick) => (
              <TableRow key={pick.id}>
                <TableCell>{pick.total_pick_number}</TableCell>
                <TableCell>{pick.player?.full_name}</TableCell>
                <TableCell>{pick.player?.display_position}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DraftedPlayers;