// ./components/TeamNeeds.tsx
import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings, Pick, Player } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamNeedsProps {
  leagueSettings: LeagueSettings;
  draftId: string;
  teamKey: string;
}

interface PositionNeed {
  position: string;
  needed: number;
  filled: number;
}

const TeamNeeds: React.FC<TeamNeedsProps> = ({ leagueSettings, draftId, teamKey }) => {
  const [positionNeeds, setPositionNeeds] = useState<PositionNeed[]>([]);
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchTeamPicks = async () => {
      if (!supabase) return;

      const { data: picks, error } = await supabase
        .from('picks')
        .select(`
          *,
          player:players(*)
        `)
        .eq('draft_id', draftId)
        .eq('team_key', teamKey)
        .eq('is_picked', true);

      if (error) {
        console.error('Error fetching team picks:', error);
        return;
      }

      updatePositionNeeds(picks);
    };

    const updatePositionNeeds = (picks: (Pick & { player: Player | null })[]) => {
      const needs: PositionNeed[] = leagueSettings.roster_positions
        .filter(pos => pos.roster_position.position !== 'BN' && pos.roster_position.position !== 'IR')
        .map(pos => ({
          position: pos.roster_position.position,
          needed: pos.roster_position.count,
          filled: 0
        }));

      picks.forEach(pick => {
        if (pick.player) {
          const positionNeed = needs.find(need => pick.player!.eligible_positions.includes(need.position));
          if (positionNeed) {
            positionNeed.filled = Math.min(positionNeed.filled + 1, positionNeed.needed);
          }
        }
      });

      setPositionNeeds(needs);
    };

    fetchTeamPicks();

    const subscription = supabase
      .channel('team_picks')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId} AND team_key=eq.${teamKey}` 
      }, () => {
        fetchTeamPicks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, draftId, teamKey, leagueSettings]);

  const getSeverityColor = (needed: number, filled: number) => {
    const remaining = needed - filled;
    if (remaining === 0) return 'bg-green-500';
    if (remaining === 1) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Team Needs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100%-2rem)] px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {positionNeeds.map((need) => (
              <Badge
                key={need.position}
                variant="outline"
                className={`flex items-center justify-between p-2 ${getSeverityColor(need.needed, need.filled)}`}
              >
                <span className="font-bold">{need.position}</span>
                <span>{need.filled}/{need.needed}</span>
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TeamNeeds;