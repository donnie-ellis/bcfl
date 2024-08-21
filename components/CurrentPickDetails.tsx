// ./components/CurrentPickDetails.tsx
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Draft, 
  Team, 
  Pick, 
  LeagueSettings, 
  Manager, 
  possesiveTitle } from '@/lib/types';
import TeamNeeds from '@/components/TeamNeeds'
import { Json } from '@/lib/types/database.types';

interface CurrentPickDetailsProps {
  currentTeam: Team | undefined;
  currentPick: Pick;
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
  draft: Draft;
}

const CurrentPickDetails: React.FC<CurrentPickDetailsProps> = ({
  currentTeam,
  currentPick,
  leagueKey,
  draftId,
  leagueSettings,
  draft
}) => {
  const getTeamLogoUrl = (teamLogos: Json): string => {
    if (Array.isArray(teamLogos) && teamLogos.length > 0 && typeof teamLogos[0] === 'object' && teamLogos[0] !== null) {
      return (teamLogos[0] as { url?: string }).url || '';
    }
    return '';
  };

  const remainingPicks = currentTeam 
    ? draft.picks.filter(pick => pick.team_key === currentTeam.team_key && !pick.is_picked).length
    : 0;

  if (!currentTeam) {
    return <div>Loading team details...</div>;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getTeamLogoUrl(currentTeam.team_logos)} alt={currentTeam.name} />
            <AvatarFallback>{currentTeam.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <div className="flex justify-between items-center">
              <h2 className='text-2xl font-bold'>{possesiveTitle(currentTeam.name)} draft summary</h2>
              <div className="text-right">
                <p className="text-sm font-semibold">Remaining Picks</p>
                <p className="text-2xl font-bold">{remainingPicks}</p>
              </div>
            </div>
            <div className='flex space-x-2 text-sm'>
              {currentTeam.managers?.map((manager: Manager, index: number) => (
                <span key={index} className="flex items-center space-x-2">
                  <span>{manager.nickname ?? 'Unknown'}</span>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={manager.image_url as string} alt={manager.nickname ?? 'Unknown'} />
                    <AvatarFallback>{(manager.nickname ?? 'U')[0]}</AvatarFallback>
                  </Avatar>
                </span>
              ))}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            <TeamNeeds
              draftId={draftId}
              teamKey={currentTeam.team_key}
              leagueSettings={leagueSettings}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CurrentPickDetails;