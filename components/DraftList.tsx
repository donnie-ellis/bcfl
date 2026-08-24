// ./components/DraftList.tsx
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draft, Team, Pick, Player } from '@/lib/types/';
import PlayerCard from '@/components/PlayerCard';

interface DraftListProps {
  draft: Draft & { picks: (Pick & { player: Player | null, team: Team })[] };
  currentTeamId: number;
}

const DraftList: React.FC<DraftListProps> = ({ draft, currentTeamId }) => {
  const teamPicks = draft.picks.filter(pick => pick.team_id === currentTeamId);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {teamPicks.map((pick) => (
          <div key={pick.id} className="flex items-center space-x-4">
            <div className="w-16 text-right font-semibold">
              Round {pick.round_number}
            </div>
            {pick.player ? (
              <PlayerCard
                player={pick.player}
                isDrafted={true}
                onClick={() => {}}
              />
            ) : (
              <div className="grow bg-muted rounded-lg p-4">
                <p className="font-semibold">Pick {pick.total_pick_number} (Overall)</p>
                <p className="text-muted-foreground">Not yet selected</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default DraftList;