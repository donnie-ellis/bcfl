// ./components/DraftSquare.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Team, Pick, Player } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface DraftSquareProps {
  pick: Pick & { player: Player | null, team: Team | null };
  isCurrentPick: boolean;
  onSquareHover?: (pick: Pick & { player: Player | null, team: Team | null }) => React.ReactNode;
}

const DraftSquare: React.FC<DraftSquareProps> = React.memo(({ pick, isCurrentPick, onSquareHover }) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    setShouldAnimate(true);
    const timer = setTimeout(() => setShouldAnimate(false), 300);
    return () => clearTimeout(timer);
  }, [pick.player_id]);

  const Square = useMemo(() => (
    <motion.div
      animate={shouldAnimate ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <Card className={`w-full h-full ${isCurrentPick ? 'border-2 border-blue-500' : ''}`}>
        <CardContent className="p-2 h-full flex flex-col justify-between">
          <div className="text-xs">
            <p className="font-bold">Pick {pick.pick_number}</p>
            {pick.team ? (
              <p className="truncate">{pick.team.name}</p>
            ) : (
              <Skeleton className="h-4 w-20" />
            )}
          </div>
          <div className="flex items-center justify-center flex-grow">
            <Avatar className="h-12 w-12">
              {pick.player ? (
                <AvatarImage src={pick.player.headshot_url || pick.player.image_url} alt={pick.player.full_name} />
              ) : pick.team ? (
                <AvatarImage src={pick.team.team_logos[0]?.url} alt={pick.team.name} />
              ) : (
                <AvatarFallback>?</AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="text-center text-xs mt-1">
            {pick.player ? (
              <p className="font-semibold truncate">{pick.player.full_name}</p>
            ) : pick.team ? (
              <p className="text-gray-500">{pick.team.name} to pick</p>
            ) : (
              <Skeleton className="h-4 w-24 mx-auto" />
            )}
            <p className="text-gray-400">Overall: {pick.total_pick_number}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  ), [pick, isCurrentPick, shouldAnimate]);

  if (onSquareHover) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div>{Square}</div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          {onSquareHover(pick)}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return Square;
}, (prevProps, nextProps) => {
  return (
    prevProps.pick.player_id === nextProps.pick.player_id &&
    prevProps.isCurrentPick === nextProps.isCurrentPick &&
    prevProps.pick.team?.team_key === nextProps.pick.team?.team_key
  );
});

DraftSquare.displayName = 'DraftSquare';

export default DraftSquare;