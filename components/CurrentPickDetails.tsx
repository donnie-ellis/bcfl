// ./components/CurrentPickDetails.tsx
import React, { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PlayerCard from '@/components/PlayerCard';
import PlayersList from '@/components/PlayersList';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { Draft } from '@/lib/types/draft.types';
import { Team } from '@/lib/types/team.types';
import { Pick } from '@/lib/types/pick.types';
import { Player } from '@/lib/types/player.types';
import { LeagueSettings } from '@/lib/types/league-settings.types';
import { Manager } from '@/lib/types/manager.types';
import TeamNeeds from '@/components/TeamNeeds'
import { Json } from '@/lib/types/database.types';

interface CurrentPickDetailsProps {
  currentTeam: Team | undefined;
  currentPick: Pick;
  previousPick: Pick | null;
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
  onSubmitPick: (player: Player) => void;
  isPickSubmitting?: boolean;
  draft: Draft;
}

const CurrentPickDetails: React.FC<CurrentPickDetailsProps> = ({
  currentTeam,
  currentPick,
  previousPick,
  leagueKey,
  draftId,
  leagueSettings,
  onSubmitPick,
  isPickSubmitting = false,
  draft
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [teamPreviousPick, setTeamPreviousPick] = useState<Pick | null>(null);
  const [previousFivePicks, setPreviousFivePicks] = useState<Pick[]>([]);

  useEffect(() => {
    if (!currentTeam) return;

    const teamPicks = draft.picks
      .filter(pick => pick.team_key === currentTeam.team_key && pick.is_picked);

    const previousTeamPick = teamPicks
      .filter(pick => pick.total_pick_number < currentPick.total_pick_number)
      .sort((a, b) => b.total_pick_number - a.total_pick_number)[0];
    
    setTeamPreviousPick(previousTeamPick || null);

    const allPreviousPicks = teamPicks
      .filter(pick => pick.total_pick_number < currentPick.total_pick_number)
      .sort((a, b) => b.total_pick_number - a.total_pick_number);

    setPreviousFivePicks(allPreviousPicks.slice(1, 6));
  }, [currentTeam, currentPick, draft.picks]);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleSubmitPick = () => {
    if (selectedPlayer) {
      onSubmitPick(selectedPlayer);
      setIsSheetOpen(false);
      setSelectedPlayer(null);
    }
  };

  const setTitle = (name: string | undefined) => {
    if (!name) return '';
    return name.endsWith('s') ? name + "'" : name + "'s";
  };

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
          <div>
            <h2 className='text-2xl font-bold'>{setTitle(currentTeam.name) + ' draft summary'}</h2>
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
            <div>
              <h3 className="font-semibold mb-2">Previous Team Pick:</h3>
              {teamPreviousPick && 'player' in teamPreviousPick && teamPreviousPick.player ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <PlayerCard
                          player={teamPreviousPick.player}
                          isDrafted={true}
                          onClick={() => {}}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" className="w-64">
                      <h4 className="font-semibold mb-2">Previous 5 Picks:</h4>
                      {previousFivePicks.map((pick) => (
                        'player' in pick && pick.player && (
                          <div key={pick.id} className="mb-2">
                            <p className="text-sm">{pick.player.full_name} - {pick.player.editorial_team_full_name}</p>
                            <p className="text-xs text-gray-500">Round {pick.round_number}, Pick {pick.pick_number}</p>
                          </div>
                        )
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="text-gray-500">No previous picks for this team</div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Remaining Picks:</h3>
              <p>{remainingPicks}</p>
            </div>
            
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button className="w-full">Make Selection</Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <div className="mt-4 h-full flex flex-col">
                  <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-[calc(100vh-200px)]">
                      <PlayersList
                        draftId={draftId}
                        onPlayerSelect={handlePlayerSelect}
                        draft={draft}
                      />
                    </ScrollArea>
                  </div>
                  <AnimatePresence>
                    {selectedPlayer && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-4"
                      >
                        <PlayerCard
                          player={selectedPlayer}
                          isDrafted={false}
                          onClick={() => {}}
                        />
                        <SubmitPickButton
                          isCurrentUserPick={true}
                          selectedPlayer={selectedPlayer}
                          currentPick={currentPick}
                          onSubmitPick={handleSubmitPick}
                          isPickSubmitting={isPickSubmitting}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CurrentPickDetails;