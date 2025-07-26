// ./components/PlayerDetails.tsx
import React from 'react';
import { PlayerWithADP, formatStatus } from '@/lib/types/';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PlayerDetailsProps {
  player: PlayerWithADP | null;
}

const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player }) => {
  if (!player) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-center text-gray-500">Select a player to view details</p>
        </CardContent>
      </Card>
    );
  }

  // Helper function to format bye weeks
  const formatByeWeeks = (byeWeeks: any): string => {
    if (!byeWeeks || byeWeeks.length === 0) return 'N/A';
    return byeWeeks.join(', ');
  };

  const getSeverityColor = (status: string | null): string => {
    if (!status) return "bg-green-400";
    switch (status) {
      case "": return "bg-green-400 hover:bg-green-400";
      case "Q":
      case "D": return "bg-yellow-400 hover:bg-yellow-400";
      default: return "bg-red-400 hover:bg-red-400";
    }
  }

  return (
    <Card className="">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={player.headshot_url as string} alt={player.full_name || 'NA'} />
            <AvatarFallback>{player.full_name || 'NA'.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="grow">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-2xl">{player.full_name}</CardTitle>
              <Badge className={`${getSeverityColor(player.status)}`}>{formatStatus(player.status)}</Badge>
            </div>
            <p className="text-sm text-gray-500">{player.editorial_team_full_name}</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {player.eligible_positions ? player.eligible_positions.map((position, index) => (
              <Badge key={index} variant="secondary">{position}</Badge>
            )) : ''}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="grow">
            <strong>Bye Week:</strong> {formatByeWeeks(player.bye_weeks)}
          </div>
          <div className="grow">
            <strong>ADP:</strong> {player.adp_formatted}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerDetails;