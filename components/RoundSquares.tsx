// ./components/RoundSquares.tsx
import React from 'react';
import { Draft, LeagueSettings, Team, Pick, Player } from '@/lib/types';
import DraftSquare from "@/components/DraftSquare"

interface RoundSquaresProps {
  draft: Draft & { picks: (Pick & { player: Player | null, team: Team })[] };
  leagueSettings: LeagueSettings;
  currentRoundOnly?: boolean;
}

const RoundSquares: React.FC<RoundSquaresProps> = ({ draft, leagueSettings, currentRoundOnly = false }) => {
  const picksPerRound = draft.picks.length / draft.rounds;
  const currentRound = Math.ceil(draft.current_pick / picksPerRound);

  const picksToDisplay = currentRoundOnly
    ? draft.picks.filter(pick => pick.round_number === currentRound)
    : draft.picks;

  return (
    <div className="flex justify-between w-full">
      {picksToDisplay.map((pick) => (
        <div key={pick.id} className="flex-1 px-1">
          <DraftSquare
            pick={pick}
            isCurrentPick={pick.total_pick_number === draft.current_pick}
          />
        </div>
      ))}
    </div>
  );
};

export default RoundSquares;