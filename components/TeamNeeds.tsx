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
    if (!supabase) return;

    const fetchTeamPicks = async () => {
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
        .filter(pos => !['BN', 'IR'].includes(pos.roster_position.position))
        .map(pos => ({
          position: pos.roster_position.position,
          needed: pos.roster_position.count,
          filled: 0
        }));

      const flexPositions = ['W/R/T', 'W/R'];
      const regularPositions = needs.filter(need => !flexPositions.includes(need.position));
      const flexNeeds = needs.filter(need => flexPositions.includes(need.position));

      picks.forEach(pick => {
        if (pick.player) {
          const eligiblePositions = pick.player.eligible_positions;
          let positionFilled = false;

          // First, try to fill regular positions
          for (const position of eligiblePositions) {
            const positionNeed = regularPositions.find(need => need.position === position);
            if (positionNeed && positionNeed.filled < positionNeed.needed) {
              positionNeed.filled++;
              positionFilled = true;
              break;
            }
          }

          // If no regular position was filled, try to fill flex positions
          if (!positionFilled) {
            for (const flexNeed of flexNeeds) {
              if (flexNeed.position === 'W/R/T' && 
                  (eligiblePositions.includes('WR') || eligiblePositions.includes('RB') || eligiblePositions.includes('TE')) && 
                  flexNeed.filled < flexNeed.needed) {
                flexNeed.filled++;
                break;
              } else if (flexNeed.position === 'W/R' && 
                         (eligiblePositions.includes('WR') || eligiblePositions.includes('RB')) && 
                         flexNeed.filled < flexNeed.needed) {
                flexNeed.filled++;
                break;
              }
            }
          }
        }
      });

      setPositionNeeds([...regularPositions, ...flexNeeds]);
    };

    fetchTeamPicks();

    const subscription = supabase
      .channel('team_needs')
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
    <div className="flex flex-wrap gap-2">
      {positionNeeds.map((need) => (
        <Badge
          key={need.position}
          variant="outline"
          className={`flex items-center justify-between p-2 ${getSeverityColor(need.needed, need.filled)} flex-grow basis-0 min-w-[80px]`}
        >
          <span className="font-bold text-xs">{need.position}</span>
          <span className="text-xs">{need.filled}/{need.needed}</span>
        </Badge>
      ))}
    </div>
  );
};

export default TeamNeeds;