// ./components/PlayerCard.tsx
import React, { ComponentProps, useRef } from 'react';
import { PlayerWithADP, Player, formatStatus, EnhancedPlayerWithADP } from '@/lib/types/player.types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from './ui/button';
import { ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftQueueRef {
  addToQueue: (player: Player) => void;
}

interface PlayerCardProps {
  player: PlayerWithADP | Player;
  isDrafted: boolean | undefined;
  onClick: () => void;
  fadeDrafted?: boolean;
  onAddToQueue?: (player: Player | PlayerWithADP | EnhancedPlayerWithADP) => void;
  selectedPlayer?: Player | PlayerWithADP | EnhancedPlayerWithADP | null;
  /** Drop border/shadow/background so this reads as inline content instead of a nested card, e.g. when already inside another Card. */
  flat?: boolean;
}

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

const getSeverityColor = (status: string | null): BadgeVariant => {
  if (!status) return "success";
  switch (status) {
    case "": return "success";
    case "Q": return "warn";
    case "D": return "warn";
    default: return "destructive";
  }
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isDrafted, onClick, fadeDrafted = false, onAddToQueue, selectedPlayer, flat = false }) => {

  const queueRef = useRef<DraftQueueRef>(null);

  const cardClasses = `
    mb-2 cursor-pointer transition-all duration-300
    ${flat ? 'border-0 shadow-none bg-transparent' : ''}
    ${isDrafted ? (fadeDrafted ? 'opacity-50' : '') : 'hover:bg-accent'}
    ${isDrafted ? 'cursor-not-allowed' : 'cursor-pointer'}
  `;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`${cardClasses} ${selectedPlayer && selectedPlayer.id === player.id ? 'bg-secondary border-primary' : ''}`}
            onClick={isDrafted ? undefined : onClick}
          >
            <CardContent className={cn("p-3 flex items-center space-x-3", flat && "p-0")}>
              <Avatar className="h-12 w-12 rounded">
                <AvatarImage src={player.headshot_url as string} alt={player.full_name || 'N/A'} />
                <AvatarFallback>{player.full_name || 'NA'.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="grow">
                <p className="font-semibold">{player.full_name}</p>
                <p className="text-sm">
                  <span className="font-medium text-primary">{player.position}</span>
                  {player.team && (
                    <> - <span className="text-muted-foreground">{player.team}</span></>
                  )}
                </p>
              </div>
              {isDrafted && (
                <Badge variant="destructive" className="ml-2">
                  Drafted
                </Badge>
              )}
              {onAddToQueue && !isDrafted && (
                <Button
                  variant={"secondary"}
                  size={"icon"}
                  className="hover:bg-secondary/40 hover:shadow"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToQueue(player);
                  }}
                >
                  <ListPlus className="w-4 h-4" />
                </Button>
              )}

            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="w-64">
          <div className="space-y-2">
            <p><strong>Position:</strong> {player.position}</p>
            <p><strong>Team:</strong> {player.team}</p>
            <div className="flex items-center gap-1"><strong>Status:</strong> <Badge variant={getSeverityColor(player.status)}>{formatStatus(player.status)}</Badge></div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlayerCard;