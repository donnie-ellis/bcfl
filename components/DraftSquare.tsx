
import React, { memo } from 'react';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreVertical } from "lucide-react";
import { getTeamLogoUrl, sizedTitle } from '@/lib/types/team.types';

interface DraftSquareProps {
  pick: PickWithPlayerAndTeam;
  isCurrentPick?: boolean;
  onSquareHover?: (pick: PickWithPlayerAndTeam) => React.ReactNode;
  isLoading?: boolean;
}

const DraftSquare: React.FC<DraftSquareProps> = memo(({ pick, isCurrentPick, onSquareHover, isLoading }) => {
  const teamLogoUrl = getTeamLogoUrl(pick.team);

  const actionsContent = onSquareHover ? onSquareHover(pick) : null;

  const Square = () => (
    <Card className={`relative w-full h-full ${isCurrentPick ? 'border-2 border-primary animate-pulse' : ''} hover:bg-muted`}>
      {actionsContent && (
        <div className="absolute top-1 right-1 rounded-full bg-muted/80 p-0.5 text-muted-foreground">
          <MoreVertical className="h-3 w-3" />
        </div>
      )}
      <CardContent className="p-2 h-full flex flex-col justify-between">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </>
        ) : (
          <>
            <div className="text-xs">
              <p className="font-bold">Pick {pick.pick_number}</p>
              <p className="truncate">{sizedTitle(pick.team?.name || '')}</p>
            </div>
            <div className="flex items-center justify-center grow">
              <Avatar className="h-12 w-12">
                {pick.is_picked ? (
                  <AvatarImage src={pick.player?.headshot_url || ''} alt={pick.player?.full_name || ''} />
                ) : (
                  <AvatarImage src={teamLogoUrl} alt={pick.team?.name} />
                )}
                <AvatarFallback>{pick.team?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center text-xs mt-1">
              {pick.player ? (
                <>
                  <div className="flex items-center justify-center space-x-1">
                    <p className="font-semibold truncate">{pick.player.full_name}</p>
                    {pick.is_keeper && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        K
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {pick.player.team} - {pick.player.position}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">-</p>
              )}
              <p className="text-gray-400">
                Overall: {pick.total_pick_number}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (actionsContent) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="block w-full h-full text-left">
            <Square />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-64 sm:w-72">
          {actionsContent}
        </PopoverContent>
      </Popover>
    );
  }

  return <Square />;
});

DraftSquare.displayName = 'DraftSquare';

export default DraftSquare;
