// ./components/DraftStatus.tsx
import React from 'react';
import { Draft, LeagueSettings } from '@/lib/types';

interface DraftStatusProps {
  draft: Draft;
  leagueSettings: LeagueSettings;
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings }) => {
  const currentRound = Math.floor(draft.current_pick / leagueSettings.num_teams) + 1;
  const currentPickInRound = draft.current_pick % leagueSettings.num_teams || leagueSettings.num_teams;
  const picksUntilNextTurn = calculatePicksUntilNextTurn();

  function calculatePicksUntilNextTurn() {
    // Implement the logic to calculate picks until the current user's next turn
    // This will depend on the draft order and current pick
    // For now, we'll return a placeholder value
    return 5;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <h2 className="text-xl font-semibold mb-2">Draft Status</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-medium">Current Round:</p>
          <p>{currentRound}</p>
        </div>
        <div>
          <p className="font-medium">Current Pick in Round:</p>
          <p>{currentPickInRound}</p>
        </div>
        <div>
          <p className="font-medium">Picks Until Your Turn:</p>
          <p>{picksUntilNextTurn}</p>
        </div>
        <div>
          <p className="font-medium">Current Drafter:</p>
          <p>{draft.current_drafter_name}</p>
        </div>
        <div>
          <p className="font-medium">Next Drafter:</p>
          <p>{draft.next_drafter_name}</p>
        </div>
      </div>
    </div>
  );
};

export default DraftStatus;