// ./components/DraftedPlayers.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings, Pick, Player } from '@/lib/types';
import PlayerCard from '@/components/PlayerCard';

interface DraftedPlayersProps {
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
  teamKey: string
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = ({ leagueKey, draftId, leagueSettings, teamKey }) => {
  const [draftedPlayers, setDraftedPlayers] = useState<(Pick & { player: Player })[]>([]);
  const supabase = useSupabaseClient();

  const fetchDraftedPlayers = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        player:players(*)
      `)
      .eq('draft_id', draftId)
      .eq('team_key', teamKey)
      .order('total_pick_number', { ascending: true });

    if (error) {
      console.error('Error fetching drafted players:', error);
    } else {
      setDraftedPlayers(data);
    }
  };

  useEffect(() => {
    fetchDraftedPlayers();

    const subscription = supabase?.channel('drafted_players')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId} AND team_key=eq.${teamKey}` 
      }, (payload) => {
        fetchDraftedPlayers();
      })
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [draftId, teamKey, supabase]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Drafted Players</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          {draftedPlayers.map((pick) => (
            <div key={pick.id} className="mb-4">
              <div className="font-semibold text-sm text-gray-500 mb-1">
                Round {pick.round_number}, Pick {pick.pick_number}
              </div>
              {pick.player ? (
                <PlayerCard
                  player={pick.player}
                  isDrafted={true}
                  onClick={() => {}} // No action on click for drafted players
                />
              ) : (
                <Card 
                  className='mb-2 cursor-pointer hover:bg-gray-100 transition-all opacity-50'
                >
                  <CardContent className="p-3 flex items-center space-x-3">
                    <div className="flex-grow">
                      <p className="font-semibold">Not yet selected</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DraftedPlayers;