// ./components/DraftedPlayers.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pick, possesiveTitle } from '@/lib/types/';
import PlayerCard from './PlayerCard';
import { Separator } from '@/components/ui/separator';

interface DraftedPlayersProps {
  picks: Pick[] | undefined;
  teamKey: string;
  teamName: string | undefined;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = React.memo(({ 
  picks,
  teamKey,
  teamName,
}) => {

  if (!picks) throw Error('Picks are not present');

  const teamPicks = useMemo(() => {
    return picks
      .filter(pick => pick.team_key === teamKey)
      .sort((a, b) => a.total_pick_number - b.total_pick_number);
  }, [picks, teamKey]);


  const PlaceholderCard = () => (
    <Card className='mb-2 cursor-pointer hover:bg-gray-100 transition-all opacity-50'>
      <CardContent className="p-3 flex items-center space-x-3">
        <div className="flex-grow">
          <p className="font-semibold">Not yet selected</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <h2 className='text-2xl font-bold'>
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
                {pick.player ? <PlayerCard player={pick.player} isDrafted={false} onClick={() => {}} /> : <PlaceholderCard />}
              </div>
            ))}
        </div>
       </ScrollArea>
    </>
  );
});

DraftedPlayers.displayName = 'DraftedPlayers';

export default DraftedPlayers;