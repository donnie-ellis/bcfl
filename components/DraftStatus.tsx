// ./components/DraftStatus.tsx
import React from 'react';
import { Draft, LeagueSettings, Pick } from '@/lib/types';

interface DraftStatusProps {
  draft: Draft;
  leagueSettings: LeagueSettings;
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings }) => {
  console.log('Draft in DraftStatus:', draft);  // Debugging log
  console.log('LeagueSettings in DraftStatus:', leagueSettings);  // Debugging log

  const currentRound = Math.ceil(draft.current_pick / leagueSettings.max_teams);
  const currentPickInRound = ((draft.current_pick - 1) % leagueSettings.max_teams) + 1;

  const getCurrentPick = (): Pick | undefined => {
    return draft.picks?.find(pick => pick.total_pick_number === draft.current_pick);
  };

  const getNextPick = (): Pick | undefined => {
    return draft.picks?.find(pick => pick.total_pick_number === draft.current_pick + 1);
  };

  const currentPick = getCurrentPick();
  const nextPick = getNextPick();

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
          <p className="font-medium">Current Pick:</p>
          <p>{draft.current_pick} of {draft.total_picks}</p>
        </div>
        <div>
          <p className="font-medium">Current Drafter:</p>
          <p>{currentPick?.teams?.name || 'Unknown'}</p>
        </div>
        <div>
          <p className="font-medium">Next Drafter:</p>
          <p>{nextPick?.teams?.name || 'Unknown'}</p>
        </div>
      </div>
    </div>
  );
};

export default DraftStatus;