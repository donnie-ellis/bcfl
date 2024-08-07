import React from 'react';
import { Draft, LeagueSettings, Team, Pick, Player } from '@/lib/types';
import DraftSquare from "@/components/DraftSquare"
import { Skeleton } from "@/components/ui/skeleton";

interface RoundSquaresProps {
  draft: Draft & { picks: (Pick & { player: Player | null, team: Team | null })[] };
  leagueSettings: LeagueSettings | null;
  currentRoundOnly?: boolean;
  onSquareHover?: (pick: Pick & { player: Player | null, team: Team | null }) => React.ReactNode;
  teams: Team[] | null;
  isLoading?: boolean;
}

const RoundSquares: React.FC<RoundSquaresProps> = ({ 
  draft, 
  leagueSettings, 
  currentRoundOnly = false, 
  onSquareHover,
  teams,
  isLoading 
}) => {
  if (isLoading || !draft || !leagueSettings || !teams) {
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

  const picksPerRound = draft.picks.length / draft.rounds;
  const currentRound = Math.ceil(draft.current_pick / picksPerRound);

  const picksToDisplay = currentRoundOnly
    ? draft.picks.filter(pick => pick.round_number === currentRound)
    : draft.picks;

  return (
    <div className="flex justify-between w-full">
      {picksToDisplay.map((pick) => {
        const team = teams.find(t => t.team_key === pick.team_key);
        return (
          <div key={pick.id} className="flex-1 px-1">
            <DraftSquare
              pick={{...pick, team}}
              isCurrentPick={pick.total_pick_number === draft.current_pick}
              onSquareHover={onSquareHover}
            />
          </div>
        );
      })}
    </div>
  );
};

export default RoundSquares;