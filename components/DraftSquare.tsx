// ./components/DraftSquare.tsx

import React, { memo, useMemo } from 'react';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseTeamLogos, TeamLogo, sizedTitle } from '@/lib/types/team.types';

interface DraftSquareProps {
  pick: PickWithPlayerAndTeam;
  isCurrentPick?: boolean;
  onSquareHover?: (pick: PickWithPlayerAndTeam) => React.ReactNode;
  isLoading?: boolean;
}

const DraftSquare: React.FC<DraftSquareProps> = memo(({ pick, isCurrentPick, onSquareHover, isLoading }) => {
  const teamLogos: TeamLogo[] = useMemo(() => parseTeamLogos(pick.team?.team_logos || []), [pick.team?.team_logos]);
  const teamLogoUrl = useMemo(() => teamLogos.length > 0 ? teamLogos[0].url : '', [teamLogos]);

  const Square = () => (
    <Card className={`w-full h-full ${isCurrentPick ? 'border-2 border-primary animate-pulse' : ''} hover:bg-muted`}>
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
                  <AvatarImage src={pick.player?.headshot_url || pick.player?.image_url || ''} alt={pick.player?.full_name} />
                ) : (
                  <AvatarImage src={teamLogoUrl} alt={pick.team?.name} />
                )}
                <AvatarFallback>{pick.team?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center text-xs mt-1">
              {pick.player ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center space-x-1">
                        <p className="font-semibold truncate">{pick.player.full_name}</p>
                        {pick.is_keeper && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            K
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{pick.player.editorial_team_full_name}</p>
                      <p>{pick.player.display_position}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

  if (onSquareHover) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div><Square /></div>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="w-64">
            {onSquareHover(pick)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Square />;
});

DraftSquare.displayName = 'DraftSquare';

export default DraftSquare;
