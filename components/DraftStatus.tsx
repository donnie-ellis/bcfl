// ./components/DraftStatus.tsx
import React from 'react';
import { Draft, LeagueSettings, Pick, Team } from '@/lib/types';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface DraftStatusProps {
  draft: Draft;
  leagueSettings: LeagueSettings;
  teams: Team[];
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings, teams }) => {
  const currentRound = Math.ceil(draft.current_pick / leagueSettings.max_teams);
  const currentPickInRound = ((draft.current_pick - 1) % leagueSettings.max_teams) + 1;

  const getCurrentPick = (): Pick | undefined => {
    return draft.picks?.find(pick => pick.total_pick_number === draft.current_pick);
  };

  const getLastPick = (): Pick | undefined => {
    return draft.picks?.find(pick => pick.total_pick_number === draft.current_pick - 1);
  };

  const getNextPicks = (count: number): Pick[] => {
    return draft.picks?.slice(draft.current_pick, draft.current_pick + count) || [];
  };

  const currentPick = getCurrentPick();
  const lastPick = getLastPick();
  const nextPicks = getNextPicks(5);

  const TeamLogo: React.FC<{ teamKey: string }> = ({ teamKey }) => {
    const team = teams.find(t => t.team_key === teamKey);
    return (
      <Avatar className="h-10 w-10">
        <AvatarImage src={team?.team_logos[0]?.url} alt={team?.name} />
        <AvatarFallback>{team?.name[0]}</AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Round/Pick</h2>
          <p className="text-xl">{currentRound}/{currentPickInRound}</p>
        </div>
        <div className="flex items-center space-x-2">
          {currentPick && <TeamLogo teamKey={currentPick.team_key} />}
          <div>
            <p className="font-medium">Currently Drafting</p>
            <p>{teams.find(t => t.team_key === currentPick?.team_key)?.name || 'Unknown'}</p>
          </div>
        </div>
      </div>

      {lastPick && (
        <Card>
          <CardHeader>
            <CardTitle>Last Pick</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center space-x-2">
            <TeamLogo teamKey={lastPick.team_key} />
            <div>
              <p className="font-medium">{teams.find(t => t.team_key === lastPick.team_key)?.name}</p>
              <p>{lastPick.player?.full_name} ({lastPick.player?.editorial_team_abbr} - {lastPick.player?.display_position})</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">On Deck</h3>
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="flex items-center space-x-2 cursor-pointer">
              {nextPicks[0] && <TeamLogo teamKey={nextPicks[0].team_key} />}
              <div>
                <p className="font-medium">{teams.find(t => t.team_key === nextPicks[0]?.team_key)?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">
                  Round {Math.ceil(nextPicks[0]?.total_pick_number / leagueSettings.max_teams)}, 
                  Pick {((nextPicks[0]?.total_pick_number - 1) % leagueSettings.max_teams) + 1}
                </p>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <h3 className="text-lg font-semibold mb-2">Next 5 Picks</h3>
            <ol className="space-y-2">
              {nextPicks.map((pick, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <TeamLogo teamKey={pick.team_key} />
                  <div>
                    <p className="font-medium">{teams.find(t => t.team_key === pick.team_key)?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">
                      Round {Math.ceil(pick.total_pick_number / leagueSettings.max_teams)}, 
                      Pick {((pick.total_pick_number - 1) % leagueSettings.max_teams) + 1}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </HoverCardContent>
        </HoverCard>
      </div>
    </div>
  );
};

export default DraftStatus;