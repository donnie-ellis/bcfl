// ./components/DraftStatus.tsx
import React from 'react';
import { Draft, LeagueSettings, Pick } from '@/lib/types';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

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

  const getNextPicks = (count: number): Pick[] => {
    return draft.picks?.slice(draft.current_pick, draft.current_pick + count) || [];
  };

  const currentPick = getCurrentPick();
  const nextPicks = getNextPicks(5);

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
          <HoverCard>
            <HoverCardTrigger asChild>
              <p className="cursor-pointer underline">{nextPicks[0]?.teams?.name || 'Unknown'}</p>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <h3 className="text-lg font-semibold mb-2">Next 5 Drafters</h3>
              <ol className="list-decimal list-inside">
                {nextPicks.map((pick, index) => (
                  <li key={index} className="mb-1">
                    {pick.teams?.name || 'Unknown'} 
                    <span className="text-sm text-gray-500 ml-2">
                      (Round {Math.ceil(pick.total_pick_number / leagueSettings.max_teams)}, 
                      Pick {((pick.total_pick_number - 1) % leagueSettings.max_teams) + 1})
                    </span>
                  </li>
                ))}
              </ol>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
    </div>
  );
};

export default DraftStatus;