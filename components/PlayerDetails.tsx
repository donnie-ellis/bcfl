// ./components/PlayerDetails.tsx
import React from 'react';
import { PlayerWithADP } from '@/lib/types/';
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

  const formatStatus = (statusAbbr: string | null): string => {
    if (!statusAbbr) return "Active";
    switch (statusAbbr) {
      case "D":
        return "Doubtful";
      case "IR":
        return "Injured Reserve"
      case "NA":
        return "Inactive"
      case "NFI-A":
        return "Non Football Injury"
      case "PUP-P":
        return "Physically Unable to Perform"
      case "PUP-R":
        return "Physically Unable to Perform"
      case "Q":
        return "Questionable"
      case "SUSP":
        return "Suspended"
      default:
        return "Active"
    }
  }

  const getSeverityColor = (status: string | null): string => {
    if (!status) return "bg-green-400";
    switch (status) {
      case "":
        return "bg-green-400 hover:bg-green-400";
      case "Q":
        return "bg-yellow-400 hover:bg-yellow-400"
      case "D":
        return "bg-yellow-400 hover:bg-yellow-400"
      default:
        return "bg-red-400 hover: bg-red-400"
    }
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="flex flex-row items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={player.headshot_url as string} alt={player.full_name || 'NA'} />
          <AvatarFallback>{player.full_name || 'NA'.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-2xl">{player.full_name}</CardTitle>
          <p className="text-sm text-gray-500">{player.editorial_team_full_name}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Position</h3>
          <div className="flex flex-wrap gap-2">
            {player.eligible_positions ? player.eligible_positions.map((position, index) => (
              <Badge key={index} variant="secondary">{position}</Badge>
            )) : ''}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Stats</h3>
          <ul className="space-y-1">
            <li><strong>Uniform Number:</strong> {player.uniform_number || 'N/A'}</li>
            <li><strong>Bye Week:</strong> {formatByeWeeks(player.bye_weeks)}</li>
            <li><strong>Status:</strong> <Badge className={`${getSeverityColor(player.status)}`}>{formatStatus(player.status)}</Badge></li>
            <li><strong>ADP:</strong> {player.adp_formatted}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerDetails;