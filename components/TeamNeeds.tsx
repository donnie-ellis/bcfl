// ./components/TeamNeeds.tsx
import React, { useMemo } from 'react';
import { LeagueSettings, Draft, Pick, Player, Team, RosterPosition, parseRosterPositions } from '@/lib/types/';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamNeedsProps {
  leagueSettings: LeagueSettings;
  draft: Draft;
  teamKey: string;
  teams: Team[];
}

interface PositionNeed {
  position: string;
  needed: number;
  filled: number;
  players: { name: string; position: string }[];
  isFlex: boolean;
}

const TeamNeeds: React.FC<TeamNeedsProps> = ({ leagueSettings, draft, teamKey, teams }) => {
  const positionNeeds = useMemo(() => {
    const flexPositions = ['W/R/T', 'W/R', 'Q/W/R/T'];
    const rosterPositions = parseRosterPositions(leagueSettings.roster_positions);
    
    const needs: PositionNeed[] = rosterPositions
    .filter((pos: RosterPosition) => !['BN', 'IR'].includes(pos.roster_position.position))
    .map((pos: RosterPosition) => ({
      position: pos.roster_position.position,
      needed: pos.roster_position.count,
      filled: 0,
      players: [],
      isFlex: flexPositions.includes(pos.roster_position.position)
    }));
    
    const teamPicks = draft.picks.filter(pick => pick.team_key === teamKey && pick.is_picked && pick.player_id !== null);

    teamPicks.forEach((pick: Pick) => { 
      const player = pick.player as Player | undefined;
      if (!player) return;

      const eligiblePositions = player.eligible_positions || [];
      const remainingEligiblePositions = [...eligiblePositions]; // Keep this immutable for flex checks

      // First, count the player for their primary position
      for (const position of eligiblePositions) {
        const positionNeed = needs.find(need => need.position === position);
        if (positionNeed) {
          positionNeed.filled++;
          positionNeed.players.push({ name: player.full_name, position: player.display_position as string });
          break; // Stop after assigning to the first eligible primary position
        }
      }

      // Then, count the player for a flex position based on remaining eligible positions
      for (const flexNeed of needs.filter(need => need.isFlex)) {
        if (
          (flexNeed.position === 'W/R/T' && 
           (remainingEligiblePositions.includes('WR') || remainingEligiblePositions.includes('RB') || remainingEligiblePositions.includes('TE'))) ||
          (flexNeed.position === 'W/R' && 
           (remainingEligiblePositions.includes('WR') || remainingEligiblePositions.includes('RB'))) ||
          (flexNeed.position === 'Q/W/R/T' &&
           (remainingEligiblePositions.includes('QB') || remainingEligiblePositions.includes('WR') || 
            remainingEligiblePositions.includes('RB') || remainingEligiblePositions.includes('TE')))
        ) {
          // Ensure the player's primary position has already met its minimum requirement
          const primaryPosition = eligiblePositions.find(pos => {
            const positionNeed = needs.find(need => need.position === pos);
            return positionNeed && positionNeed.filled > positionNeed.needed; // Allow flex if primary is overfilled
          });

          if (primaryPosition) {
            flexNeed.filled++;
            flexNeed.players.push({ name: player.full_name, position: player.display_position as string });
            break; // Stop after assigning to the first eligible flex position
          }
        }
      }
    });

    return needs;
  }, [leagueSettings, draft, teamKey]);

  const getSeverityColor = (needed: number, filled: number) => {
    const remaining = needed - filled;
    if (remaining <= 0) return 'bg-green-100 dark:bg-green-900';
    if (remaining === 1) return 'bg-yellow-100 dark:bg-yellow-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {positionNeeds.map((need) => (
            <TableHead key={need.position} className="text-center p-2">
              {need.position}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          {positionNeeds.map((need) => (
            <TableCell key={need.position} className="p-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className={`w-full h-full p-2 ${getSeverityColor(need.needed, need.filled)} hover:opacity-80 transition-opacity`}
                  >
                    <span className="font-bold">
                      {need.filled}/{need.needed}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="space-y-2">
                    <h3 className="font-bold">{need.position} Players:</h3>
                    {need.players.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1">
                        {need.players.map((player, index) => (
                          <li key={index}>
                            {player.name}
                            {need.isFlex && ` - ${player.position}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No players drafted yet</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default TeamNeeds;