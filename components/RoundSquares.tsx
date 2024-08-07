// ./components/RoundSquares.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Draft, LeagueSettings, Team, Pick, Player } from '@/lib/types';
import DraftSquare from "@/components/DraftSquare"
import { motion, AnimatePresence } from "framer-motion";

interface RoundSquaresProps {
  draft?: Draft & { picks: (Pick & { player: Player | null, team: Team | null })[] };
  leagueSettings?: LeagueSettings;
  currentRoundOnly?: boolean;
  onSquareHover?: (pick: Pick & { player: Player | null, team: Team | null }) => React.ReactNode;
  teams?: Team[];
}

const RoundSquares: React.FC<RoundSquaresProps> = React.memo(({ draft, leagueSettings, currentRoundOnly = false, onSquareHover, teams }) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [prevDraft, setPrevDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (draft) {
      const picksPerRound = draft.picks.length / draft.rounds;
      const newCurrentRound = Math.ceil(draft.current_pick / picksPerRound);
      
      if (newCurrentRound !== currentRound) {
        setCurrentRound(newCurrentRound);
      }
      
      setPrevDraft(draft);
    }
  }, [draft, currentRound]);

  const picksToDisplay = useMemo(() => {
    if (!draft) return [];
    const picks = currentRoundOnly
      ? draft.picks.filter(pick => pick.round_number === currentRound)
      : draft.picks;
    
    return picks.map(pick => ({
      ...pick,
      team: teams ? teams.find(team => team.team_key === pick.team_key) || null : null
    }));
  }, [draft, currentRoundOnly, currentRound, teams]);

  const hasRoundChanged = useMemo(() => {
    if (!prevDraft || !draft) return false;
    return Math.ceil(draft.current_pick / (draft.picks.length / draft.rounds)) !== 
      Math.ceil(prevDraft.current_pick / (prevDraft.picks.length / prevDraft.rounds));
  }, [draft, prevDraft]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentRound}
        initial={hasRoundChanged ? { x: "100%" } : false}
        animate={{ x: 0 }}
        exit={hasRoundChanged ? { x: "-100%" } : false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex justify-between w-full"
      >
        {picksToDisplay.map((pick) => (
          <MemoizedDraftSquare
            key={pick.id}
            pick={pick}
            isCurrentPick={pick.total_pick_number === draft?.current_pick}
            onSquareHover={onSquareHover}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
});

RoundSquares.displayName = 'RoundSquares';

const MemoizedDraftSquare = React.memo(
  ({ pick, isCurrentPick, onSquareHover }: { 
    pick: Pick & { player: Player | null, team: Team | null }, 
    isCurrentPick: boolean, 
    onSquareHover?: (pick: Pick & { player: Player | null, team: Team | null }) => React.ReactNode 
  }) => (
    <div className="flex-1 px-1">
      <DraftSquare
        pick={pick}
        isCurrentPick={isCurrentPick}
        onSquareHover={onSquareHover}
      />
    </div>
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.pick.player_id === nextProps.pick.player_id &&
      prevProps.isCurrentPick === nextProps.isCurrentPick &&
      prevProps.pick.team?.team_key === nextProps.pick.team?.team_key
    );
  }
);

MemoizedDraftSquare.displayName = 'MemoizedDraftSquare';

export default RoundSquares;