// ./components/RoundSquares.tsx

import React from 'react';
import { Draft, LeagueSettings, Team, Pick, Player } from '@/lib/types';
import DraftSquare from "@/components/DraftSquare"
interface RoundSquaresProps {
  draft: Draft & { picks: (Pick & { player: Player | null, team: Team })[] };
  leagueSettings: LeagueSettings;
}

const RoundSquares: React.FC<RoundSquaresProps> = ({ draft, leagueSettings }) => {
  const picksPerRound = draft.picks.length / draft.rounds;
  const currentRound = Math.ceil(draft.current_pick / picksPerRound);

  return (
    <div className="p-4 w-full">
      <h2 className="text-2xl font-bold mb-4">Round {currentRound}</h2>
      <div className="flex justify-between w-full">
        {draft.picks
          .slice((currentRound - 1) * picksPerRound, currentRound * picksPerRound)
          .map((pick) => (
            <DraftSquare
              key={pick.id}
              pick={pick}
              isCurrentPick={pick.total_pick_number === draft.current_pick}
            />
          ))}
      </div>
    </div>
  );
};

export default RoundSquares;