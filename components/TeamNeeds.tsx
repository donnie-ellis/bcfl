// ./components/TeamNeeds.tsx
import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings } from '@/lib/types/league-settings.types';
import { Pick, Player } from '@/lib/types/';
import { Badge } from "@/components/ui/badge";
import { Json } from '@/lib/types/database.types';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface TeamNeedsProps {
  leagueSettings: LeagueSettings;
  draftId: string;
  teamKey: string;
}

interface PositionNeed {
  position: string;
  needed: number;
  filled: number;
  players: string[];
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
          filled: 0,
          players: []
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
              positionNeed.players.push(pick.player.full_name);
              positionFilled = true;
              break;
            }
          }

          // If no regular position was filled, try to fill flex positions
          if (!positionFilled) {
            for (const flexNeed of flexNeeds) {
              if (flexNeed.position === 'W/R/T' && 
                  (eligiblePositions.includes('WR') || eligiblePositions.includes('RB') || eligiblePositions.includes('TE'))) {
                flexNeed.filled++;
                flexNeed.players.push(pick.player.full_name);
                break;
              } else if (flexNeed.position === 'W/R' && 
                         (eligiblePositions.includes('WR') || eligiblePositions.includes('RB'))) {
                flexNeed.filled++;
                flexNeed.players.push(pick.player.full_name);
                break;
              } else if (flexNeed.position === 'Q/W/R/T' &&
                        (eligiblePositions.includes('QB') || eligiblePositions.includes('WR') || 
                          eligiblePositions.includes('RB') || eligiblePositions.includes('TE'))) {
                            flexNeed.filled++;
                            flexNeed.players.push(pick.player.first_name);
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
    if (remaining === 0) return 'bg-green-400';
    if (remaining === 1) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <TooltipProvider>
        {positionNeeds.map((need) => (
          <Tooltip key={need.position}>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <Badge
                  variant="secondary"
                  className={`flex items-center justify-between p-2 ${getSeverityColor(need.needed, need.filled)} max-w-[100px]`}
                >
                  <span className="font-bold text-xs mr-2">{need.position}</span>
                  <span className="text-xs">{need.filled}/{need.needed}</span>
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">{need.position} Players:</p>
              {need.players.length > 0 ? (
                <ul className="list-disc pl-4">
                  {need.players.map((player, index) => (
                    <li key={index}>{player}</li>
                  ))}
                </ul>
              ) : (
                <p>No players drafted yet</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};

export default TeamNeeds;