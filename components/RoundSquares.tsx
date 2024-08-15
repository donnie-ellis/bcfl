// ./components/RoundSquares.tsx
import React from 'react';
import { Draft, LeagueSettings, Team } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import DraftSquare from "@/components/DraftSquare"
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface RoundSquaresProps {
  draft: Draft & { picks: PickWithPlayerAndTeam[] };
  leagueSettings: LeagueSettings | null;
  currentRoundOnly?: boolean;
  onSquareHover?: (pick: PickWithPlayerAndTeam) => React.ReactNode;
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
  const currentRound = Math.ceil(draft.current_pick || 0 / picksPerRound);

  const picksToDisplay = currentRoundOnly
    ? draft.picks.filter(pick => pick.round_number === currentRound)
    : draft.picks;

  return (
    <div className="flex justify-between w-full">
      <AnimatePresence>
        {picksToDisplay.map((pick) => (
          <motion.div
            key={pick.id}
            className="flex-1 px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DraftSquare
              pick={pick as PickWithPlayerAndTeam}
              isCurrentPick={pick.total_pick_number === draft.current_pick}
              onSquareHover={onSquareHover}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RoundSquares;