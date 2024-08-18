// ./components/TeamNeeds.tsx
import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings } from '@/lib/types/league-settings.types';
import { Pick, Player } from '@/lib/types/';
import { Badge } from "@/components/ui/badge";
import { Json } from '@/lib/types/database.types';

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

interface RosterPosition {
  position: string;
  count: number;
}

const TeamNeeds: React.FC<TeamNeedsProps> = ({ leagueSettings, draftId, teamKey }) => {
  const [positionNeeds, setPositionNeeds] = useState<PositionNeed[]>([]);
  const supabase = useSupabaseClient();

  const parseRosterPositions = (rosterPositions: Json): RosterPosition[] => {
    if (Array.isArray(rosterPositions)) {
      return rosterPositions.reduce((acc: RosterPosition[], item) => {
        if (
          typeof item === 'object' &&
          item !== null &&
          'roster_position' in item &&
          typeof item.roster_position === 'object' &&
          item.roster_position !== null &&
          'position' in item.roster_position &&
          'count' in item.roster_position &&
          typeof item.roster_position.position === 'string' &&
          typeof item.roster_position.count === 'number'
        ) {
          acc.push({
            position: item.roster_position.position,
            count: item.roster_position.count
          });
        }
        return acc;
      }, []);
    }
    return [];
  };

  useEffect(() => {
    if (!supabase || !teamKey) return;

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

      updatePositionNeeds(picks as (Pick & { player: Player | null })[]);
    };

    const updatePositionNeeds = (picks: (Pick & { player: Player | null })[]) => {
      const rosterPositions = parseRosterPositions(leagueSettings.roster_positions);
      const needs: PositionNeed[] = rosterPositions
        .filter(pos => !['BN', 'IR'].includes(pos.position))
        .map(pos => ({
          position: pos.position,
          needed: pos.count,
          filled: 0
        }));

      const flexPositions = ['W/R/T', 'W/R'];
      const regularPositions = needs.filter(need => !flexPositions.includes(need.position));
      const flexNeeds = needs.filter(need => flexPositions.includes(need.position));

      picks.forEach(pick => {
        if (pick.player && pick.player.eligible_positions) {
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