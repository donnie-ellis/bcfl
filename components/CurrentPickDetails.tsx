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
import PlayerList from '@/components/PlayersList';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { Team, Pick, Player, LeagueSettings, Draft } from '@/lib/types';
import TeamNeeds from './TeamNeeds';

interface CurrentPickDetailsProps {
  currentTeam: Team;
  currentPick: Pick;
  previousPick: Pick & { player: Player } | null;
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
  const [teamPreviousPick, setTeamPreviousPick] = useState<Pick & { player: Player } | null>(null);
  const [previousFivePicks, setPreviousFivePicks] = useState<(Pick & { player: Player | null })[]>([]);

  useEffect(() => {
    // Find the previous pick for the current team
    const picks = draft.picks || [];
    const teamPicks = picks.filter(pick => pick.team_key === currentTeam?.team_key && pick.is_picked && pick.player);
    const previousTeamPick = teamPicks
      .filter(pick => pick.total_pick_number < currentPick.total_pick_number)
      .sort((a, b) => b.total_pick_number - a.total_pick_number)[0];
    
    setTeamPreviousPick(previousTeamPick as Pick & { player: Player } | null);

    // Find the previous 5 picks (excluding the immediate previous pick)
    const allPreviousPicks = teamPicks
      .filter(pick => pick.total_pick_number < currentPick.total_pick_number)
      .sort((a, b) => b.total_pick_number - a.total_pick_number);

    setPreviousFivePicks(allPreviousPicks.slice(1, 6) as (Pick & { player: Player | null })[]);
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

  const setTitle = (name: string) => {
    if (name?.endsWith('s')) {
      return name + "'";
    } else {
      return name + "'s";
    };
  };

  const remainingPicks = draft.picks.filter(pick => pick.team_key === currentTeam?.team_key && !pick.is_picked).length

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={currentTeam?.team_logos[0].url} alt={currentTeam?.name} />
            <AvatarFallback>{currentTeam?.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className='text-2xl font-bold'>{setTitle(currentTeam?.name) + ' draft summary'}</h2>
            <div className='flex space-x-2 text-sm'>
              {currentTeam?.managers.map((manager, index) => (
                <span key={index} className="flex items-center space-x-2">
                  <span>{manager.nickname}</span>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={manager.image_url} alt={manager.nickname} />
                    <AvatarFallback>{manager.nickname[0]}</AvatarFallback>
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
              teamKey={currentTeam?.team_key}
              leagueSettings={leagueSettings}
            />
            <div>
              <h3 className="font-semibold mb-2">Previous Team Pick:</h3>
              {teamPreviousPick && teamPreviousPick.player ? (
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
                        pick.player && (
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
                      <PlayerList
                        leagueKey={leagueKey}
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