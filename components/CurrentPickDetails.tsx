import React, { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import PlayerCard from '@/components/PlayerCard';
import PlayerList from '@/components/PlayersList';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { Team, Pick, Player, LeagueSettings } from '@/lib/types';
import TeamNeeds from './TeamNeeds';

interface CurrentPickDetailsProps {
  currentTeam: Team;
  currentPick: Pick;
  previousPick: Pick & { player: Player } | null;
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
  onSubmitPick: (player: Player) => void;
  isPickSubmitting?: boolean
}

const CurrentPickDetails: React.FC<CurrentPickDetailsProps> = ({
  currentTeam,
  currentPick,
  previousPick,
  leagueKey,
  draftId,
  leagueSettings,
  onSubmitPick,
  isPickSubmitting = false
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [teamPreviousPick, setTeamPreviousPick] = useState<Pick & { player: Player } | null>(null);

  useEffect(() => {
    // Find the previous pick for the current team
    const picks = currentPick.draft?.picks || [];
    const teamPicks = picks.filter(pick => pick.team_key === currentTeam.team_key);
    const previousTeamPick = teamPicks
      .filter(pick => pick.total_pick_number < currentPick.total_pick_number)
      .sort((a, b) => b.total_pick_number - a.total_pick_number)[0];
    
    setTeamPreviousPick(previousTeamPick as Pick & { player: Player } | null);
  }, [currentTeam, currentPick]);

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentTeam.team_logos[0].url} alt={currentTeam.name} />
            <AvatarFallback>{currentTeam.name[0]}</AvatarFallback>
          </Avatar>
          <span>{currentTeam.name}</span>
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
              <h3 className="font-semibold mb-2">Managers:</h3>
              <ul>
                {currentTeam.managers.map((manager, index) => (
                  <li key={index}>{manager.nickname}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Previous Pick:</h3>
              {teamPreviousPick ? (
                <PlayerCard
                  player={teamPreviousPick.player}
                  isDrafted={true}
                  onClick={() => {}}
                />
              ) : (
                <div className="text-gray-500">No previous picks for this team</div>
              )}
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