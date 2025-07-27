// ./components/PlayerDetails.tsx
import React, { ComponentProps } from 'react';
import { Player, PlayerWithADP, formatStatus } from '@/lib/types/';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PlayerDetailsProps {
  player: PlayerWithADP | Player | null;
}

const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player }) => {
  if (!player) {
    return (
      <Card className="p-4 flex items-center justify-center min-h-[80px]">
        <p className="text-sm text-muted-foreground">Select a player to view details</p>
      </Card>
    );
  }

  type BadgeVariant = ComponentProps<typeof Badge>['variant'];

  // Helper function to format bye weeks
  const formatByeWeeks = (byeWeeks: any): string => {
    if (!byeWeeks || byeWeeks.length === 0) return 'N/A';
    return byeWeeks.join(', ');
  };

  const getSeverityColor = (status: string | null): BadgeVariant => {
    if (!status) return "success";
    switch (status) {
      case "": return "success";
      case "Q": return "warn";
      case "D": return "warn";
      default: return "destructive";
    }
  }

  return (
    <Card className="p-3 hover:bg-accent">
      <CardContent className="p-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 rounded">
            <AvatarImage src={player.headshot_url as string} alt={player.full_name || 'NA'} />
            <AvatarFallback className="text-xs">
              {player.full_name?.split(' ').map(n => n[0]).join('') || 'NA'}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{player.full_name}</h3>
              <Badge 
                variant={getSeverityColor(player.status)}
                className={`text-xs px-1.5 py-0.5 shrink-0 cursor-default`}
              >
                {formatStatus(player.status)}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="truncate">{player.editorial_team_full_name}</span>
              {player.eligible_positions && (
                <div className="flex gap-1">
                  {player.eligible_positions.slice(0, 3).map((position, index) => (
                    <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5 cursor-default">
                      {position}
                    </Badge>
                  ))}
                  {player.eligible_positions.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 cursor-default">
                      +{player.eligible_positions.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bye: {formatByeWeeks(player.bye_weeks)}</span>
              {player.adp_formatted && <span className="font-medium">ADP: {player.adp_formatted}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerDetails;