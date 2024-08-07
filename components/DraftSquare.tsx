// ./components/DraftSquare.tsx
import React from 'react';
import { Team, Pick, Player } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";

interface DraftSquareProps {
  pick?: Pick & { player: Player | null, team: Team | null };
  isCurrentPick?: boolean;
  onSquareHover?: (pick: Pick & { player: Player | null, team: Team | null }) => React.ReactNode;
  isLoading?: boolean;
}

const DraftSquare: React.FC<DraftSquareProps> = ({ pick, isCurrentPick, onSquareHover, isLoading }) => {
  const Square = () => (
    <Card className={`w-full h-full ${isCurrentPick ? 'border-2 border-blue-500' : ''}`}>
      <CardContent className="p-2 h-full flex flex-col justify-between">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </>
        ) : pick ? (
          <>
            <div className="text-xs">
              <p className="font-bold">Pick {pick.pick_number}</p>
              <p className="truncate">{pick.team?.name || 'Unknown Team'}</p>
            </div>
            <div className="flex items-center justify-center flex-grow">
              <Avatar className="h-12 w-12">
                {pick.player ? (
                  <AvatarImage src={pick.player.headshot_url || pick.player.image_url} alt={pick.player.full_name} />
                ) : (
                  <AvatarImage src={pick.team?.team_logos[0]?.url} alt={pick.team?.name} />
                )}
                <AvatarFallback>{pick.team?.name[0] || '?'}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center text-xs mt-1">
              {pick.player ? (
                <p className="font-semibold truncate">{pick.player.full_name}</p>
              ) : (
                <p className="text-gray-500">Not picked</p>
              )}
              <p className="text-gray-400">Overall: {pick.total_pick_number}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No pick data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (onSquareHover && pick) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div><Square /></div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          {onSquareHover(pick)}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return <Square />;
};

export default DraftSquare;