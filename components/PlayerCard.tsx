// ./components/PlayerCard.tsx
import React from 'react';
import { PlayerWithADP, Player } from '@/lib/types/player.types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface PlayerCardProps {
  player: PlayerWithADP | Player;
  isDrafted: boolean | undefined;
  onClick: () => void;
  fadeDrafted?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isDrafted, onClick, fadeDrafted = false }) => {
  const cardClasses = `
    mb-2 cursor-pointer transition-all
    ${isDrafted ? (fadeDrafted ? 'opacity-50' : '') : 'hover:bg-accent'}
    ${isDrafted ? 'cursor-not-allowed' : 'cursor-pointer'}
  `;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={cardClasses}
            onClick={isDrafted ? undefined : onClick}
          >
            <CardContent className="p-3 flex items-center space-x-3">
              <Avatar className="h-12 w-12 rounded">
                <AvatarImage src={player.headshot_url as string} alt={player.full_name || 'N/A'} />
                <AvatarFallback>{player.full_name || 'NA'.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <p className="font-semibold">{player.full_name}</p>
                <p className="text-sm">
                  <span className="font-medium text-primary">{player.display_position}</span>
                  {player.editorial_team_full_name && (
                    <> - <span className="text-muted-foreground">{player.editorial_team_full_name}</span></>
                  )}
                </p>
              </div>
              {isDrafted && (
                <Badge variant="destructive" className="ml-2">
                  Drafted
                </Badge>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="w-64">
          <div className="space-y-2">
            <p><strong>Position:</strong> {player.display_position}</p>
            <p><strong>Team:</strong> {player.editorial_team_full_name}</p>
            {player.bye_weeks && <p><strong>Bye Week:</strong> {player.bye_weeks}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlayerCard;