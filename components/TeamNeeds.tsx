// ./components/TeamNeeds.tsx
import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { LeagueSettings, Pick, Player } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import PlayerCard from '@/components/PlayerCard';

interface TeamNeedsProps {
  leagueSettings: LeagueSettings;
  draftId: string;
  teamKey: string;
}

interface PositionNeed {
  position: string;
  needed: number;
  filled: number;
  players: Player[];
}

const TeamNeeds: React.FC<TeamNeedsProps> = ({ leagueSettings, draftId, teamKey }) => {
  const [positionNeeds, setPositionNeeds] = useState<PositionNeed[]>([]);
  const supabase = useSupabaseClient();

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
        .eq('is_picked', true)
        .order('total_pick_number', { ascending: true });

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
          filled: 0,
          players: []
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
              positionNeed.players.push(pick.player);
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
                flexNeed.players.push(pick.player);
                break;
              } else if (flexNeed.position === 'W/R' && 
                         (eligiblePositions.includes('WR') || eligiblePositions.includes('RB'))) {
                flexNeed.filled++;
                flexNeed.players.push(pick.player);
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
    if (remaining <= 0) return 'bg-green-500';
    if (remaining === 1) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-wrap justify-between">
      {positionNeeds.map((need) => (
        <HoverCard key={need.position}>
          <HoverCardTrigger>
            <div className="cursor-pointer flex-grow basis-0 min-w-[80px] m-1">
              <Badge
                variant="outline"
                className={`flex items-center justify-between p-2 ${getSeverityColor(need.needed, need.filled)} w-full`}
              >
                <span className="font-bold text-xs">{need.position}</span>
                <span className="text-xs">{need.filled}/{need.needed}</span>
              </Badge>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <h3 className="font-semibold mb-2">{need.position} Players</h3>
            <div className="space-y-2">
              {need.players.length > 0 ? (
                need.players.map((player) => (
                  <PlayerCard
                    key={player.player_key}
                    player={player}
                    isDrafted={true}
                    onClick={() => {}}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500">No players drafted for this position yet.</p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  );
};

export default TeamNeeds;