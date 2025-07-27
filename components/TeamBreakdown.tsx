// ./components/TeamBreakdown.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, AlertCircle } from "lucide-react";
import { Draft, LeagueSettings, Pick, Player, Team, RosterPosition, parseRosterPositions } from "@/lib/types";

interface TeamBreakdownProps {
    leagueSettings: LeagueSettings;
    draft: Draft;
    teamKey: string;
    teams: Team[];
}

interface PositionNeed {
    position: string;
    needed: number;
    filled: number;
    players: Player[];
    isFlex: boolean;
}

const TeamBreakdown: React.FC<TeamBreakdownProps> = ({ leagueSettings, draft, teamKey, teams }) => {
    const positionNeeds = useMemo(() => {
        const rosterPositions = parseRosterPositions(leagueSettings.roster_positions);
        
        const needs: PositionNeed[] = rosterPositions
        .filter((pos: RosterPosition) => !['BN', 'IR', 'W/R/T', 'W/R', 'Q/W/R/T'].includes(pos.roster_position.position))
        .map((pos: RosterPosition) => ({
          position: pos.roster_position.position,
          needed: pos.roster_position.count,
          filled: 0,
          players: [],
          isFlex: false, // You can implement flex logic if needed
        }));
        
        const teamPicks = draft.picks.filter(pick => pick.team_key === teamKey && pick.is_picked && pick.player_id !== null);
    
        teamPicks.forEach((pick: Pick) => { 
          const player = pick.player as Player | undefined;
          if (!player) return;
    
          const eligiblePositions = player.eligible_positions || [];
    
          for (const position of eligiblePositions) {
            const positionNeed = needs.find(need => need.position === position);
            if (positionNeed) {
              positionNeed.filled++;
              positionNeed.players.push(player)
              break;
            }
          }
        });

        return needs;
    }, [leagueSettings, draft, teamKey]);

    const getStatusIcon = (filled: number, needed: number) => {
        if (filled >= needed) return <CheckCircle className="h-4 w-4 text-success" />;
        return <AlertCircle className="h-4 w-4 text-warn" />;
    };


    const getCardBorderColor = (filled: number, needed: number) => {
        if (filled >= needed) return "border-success";
        if (filled > 0) return "border-warn";
        return "border-destructive";
    };

    return (
        <div className="flex flex-wrap gap-4 p-4">
            {positionNeeds.map((need) => (
                <Card 
                    key={need.position} 
                    className={`relative overflow-hidden transition-all hover:shadow-md min-w-[220px] flex-1 max-w-[300px] bg-background ${getCardBorderColor(need.filled, need.needed)}`}
                >
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold">{need.position}</CardTitle>
                            {getStatusIcon(need.filled, need.needed)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge 
                                variant={need.filled === need.needed ? "default" : "secondary"}
                                className={
                                    need.filled >= need.needed 
                                        ? "bg-success text-success-foreground border-success/50" 
                                        : need.filled > 0 
                                        ? "bg-warn text-warn-foreground border-warn/50"
                                        : "bg-destructive text-destructive-foreground border-destructive/50"
                                }
                            >
                                {need.filled}/{need.needed}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">                        
                        <div className="space-y-2 min-h-[60px]">
                            {need.players.length > 0 ? (
                                need.players.map((player, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate" title={player.full_name}>
                                            {player.full_name} ({player.editorial_team_abbr}) - {player.bye_weeks}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span className="text-sm">Need {need.needed}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default TeamBreakdown;