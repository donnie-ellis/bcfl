// ./components/DraftedPlayers.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pick, possesiveTitle } from '@/lib/types/';
import { Separator } from '@/components/ui/separator';
import PlayerDetails from '@/components/PlayerDetails';
import PlayerDetailsSkeleton from './PlayerDetailsSkeleton';

interface DraftedPlayersProps {
  picks: Pick[] | undefined;
  teamKey: string;
  teamName: string | undefined;
  currentPick?: number | null;
  className?: string;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = React.memo(({
  picks,
  teamKey,
  teamName,
  currentPick,
  className
}) => {

  if (!picks) throw Error('Picks are not present');

  const teamPicks = useMemo(() => {
    return picks
      .filter(pick => pick.team_key === teamKey)
      .sort((a, b) => a.total_pick_number - b.total_pick_number);
  }, [picks, teamKey]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <h2 className='text-2xl font-bold text-center'>
        {teamName ? possesiveTitle(teamName) + ' team' : 'Team'}
      </h2>
      <Separator className='mt-2' />
      <ScrollArea className="h-full">
        <div className='pr-3'>
          {teamPicks.map((pick) => (
            <div key={pick.id} className="mb-4">
              <div className="font-semibold text-sm text-gray-500 mb-1">
                Round {pick.round_number}, Pick {pick.pick_number} (Overall: {pick.total_pick_number})
              </div>
              {pick.player ? <PlayerDetails player={pick.player} /> : <PlayerDetailsSkeleton pickNumber={pick.total_pick_number} currentPickNumber={currentPick} />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

DraftedPlayers.displayName = 'DraftedPlayers';

export default DraftedPlayers;