// ./components/DraftedPlayers.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings, Pick, Player } from '@/lib/types';
import { ScrollArea } from "@/components/ui/scroll-area";

interface DraftedPlayersProps {
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = ({ leagueKey, draftId, leagueSettings }) => {
  const [draftedPlayers, setDraftedPlayers] = useState<(Pick & { player: Player })[]>([]);
  const supabase = useSupabaseClient();

  const fetchDraftedPlayers = async () => {
    if (!supabase) return;

    console.log('Fetching drafted players...');
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        player:players(*),
        teams:team_key(name)
      `)
      .eq('draft_id', draftId)
      .eq('is_picked', true)
      .order('total_pick_number', { ascending: true });

    if (error) {
      console.error('Error fetching drafted players:', error);
    } else {
      console.log('Fetched drafted players:', data);
      setDraftedPlayers(data);
    }
  };

  useEffect(() => {
    if (supabase) {
      fetchDraftedPlayers();

      const subscription = supabase
        .channel('drafted_players')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, (payload) => {
          console.log('Received real-time update:', payload);
          fetchDraftedPlayers();
        })
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Unsubscribing from channel');
        subscription.unsubscribe();
      };
    }
  }, [draftId, supabase]);

  if (!supabase) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Drafted Players ({draftedPlayers.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pick</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftedPlayers.map((pick) => (
                <TableRow key={pick.id}>
                  <TableCell>{pick.total_pick_number}</TableCell>
                  <TableCell>{pick.teams?.name}</TableCell>
                  <TableCell>{pick.player?.full_name}</TableCell>
                  <TableCell>{pick.player?.display_position}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DraftedPlayers;