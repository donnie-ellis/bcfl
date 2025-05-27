// ./components/RoundSquares.tsx

import React, { useMemo } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import DraftSquare from "@/components/draft/common/DraftSquare"
import { 
  Draft, 
  LeagueSettings, 
  Team, 
  PickWithPlayerAndTeam 
} from '@/lib/types/';

interface RoundSquaresProps {
  draft: Draft & { picks: PickWithPlayerAndTeam[] };
  leagueSettings: LeagueSettings | null;
  currentRoundOnly?: boolean;
  onSquareHover?: (pick: PickWithPlayerAndTeam) => React.ReactNode;
  teams: Team[] | null;
  isLoading?: boolean;
  currentRound: number;
}

const RoundSquares: React.FC<RoundSquaresProps> = React.memo(({ 
  draft, 
  leagueSettings, 
  currentRoundOnly = false, 
  onSquareHover,
  teams,
  isLoading,
  currentRound
}) => {
  const picksToDisplay = useMemo(() => {
    if (!draft || !leagueSettings || !teams) return [];

    return currentRoundOnly
      ? draft.picks.filter(pick => pick.round_number === currentRound)
      : draft.picks;
  }, [draft, leagueSettings, teams, currentRoundOnly, currentRound]);

  if (!draft || !leagueSettings || !teams) {
    return (
      <div className="flex justify-between w-full">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="flex-1 px-1">
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between w-full">
      {picksToDisplay.map((pick) => (
        <div key={pick.id} className="w-full sm:w-auto sm:flex-1 px-1 mb-2 sm:mb-0">
          <DraftSquare
            pick={pick as PickWithPlayerAndTeam}
            isCurrentPick={pick.total_pick_number === draft.current_pick}
            onSquareHover={onSquareHover}
            isLoading={isLoading}
          />
        </div>
      ))}
    </div>
  );
});

RoundSquares.displayName = 'RoundSquares';

export default RoundSquares;