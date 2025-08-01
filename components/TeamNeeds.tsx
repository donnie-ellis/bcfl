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
import { Button } from '@/components/ui/button';

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
    if (remaining <= 0) return 'bg-success hover:bg-success/90 text-success-foreground hover:text-success-foreground transition-colors duration-200 cursor-default data-[state=open]:bg-success/50';
    if (remaining === 1) return "bg-warn hover:bg-warn/90 text-warn-foreground hover:text-warn-foreground transition-colors duration-200 cursor-default data-[state=open]:bg-warn/50";
    return "bg-destructive hover:bg-destructive/90 text-destructive-foreground hover:text-destructive-foreground transition-colors duration-200 cursor-default data-[state=open]:bg-destructive/50";
  };

  return (
    <Table className="w-full min-w-0">
      <TableHeader>
        <TableRow>
          {positionNeeds.map((need) => (
            <TableHead key={need.position} className="text-center text-muted-foreground p-1 text-xs">
              {need.position}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          {positionNeeds.map((need) => (
            <TableCell key={need.position} className="p-0 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    className={`w-full rounded-none h-full p-2 ${getSeverityColor(need.needed, need.filled)} transition-colors duration-200 cursor-pointer`}
                  >
                    <span className="font-medium text-xs">
                      {need.filled}/{need.needed}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="min-w-0">
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