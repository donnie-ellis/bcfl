// ./components/DraftStatus.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Draft, LeagueSettings, Team, Player, Pick, possesiveTitle } from '@/lib/types/';
import TeamCard from '@/components/TeamCard';
import PlayerCard from '@/components/PlayerCard';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from '@/components/ui/badge';
import RecentPicks from './RecentPicks';
import DraftTimer from '@/components/DraftTimer';

interface DraftStatusProps {
  draft: Draft | null;
  leagueSettings: LeagueSettings | null;
  teams: Team[];
  team: Team;
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings, teams, team }) => {
  if (!draft || !leagueSettings) {
    return (
      <Card className="">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48 mx-auto" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-[48%]">
                <Skeleton className="h-4 w-24 mb-1" />
                <TeamCard team={undefined} />
              </div>
              <div className="w-[48%]">
                <Skeleton className="h-4 w-24 mb-1" />
                <TeamCard team={undefined} />
              </div>
            </div>
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPick = draft.current_pick || 0;
  const totalTeams = teams.length;
  const round = Math.ceil(currentPick / totalTeams);
  const pickInRound = ((currentPick - 1) % totalTeams) + 1;

  const getCurrentTeam = (pickNumber: number) => 
    teams.find(team => team.team_key === draft.picks[pickNumber - 1]?.team_key);

  const currentTeam = getCurrentTeam(currentPick);
  const nextTeam = getCurrentTeam(currentPick + 1);

  const progress = (currentPick / draft.total_picks) * 100;

  const nextFivePicks = Array.from({ length: 5 }, (_, i) => getCurrentTeam(currentPick + i + 1));

  const lastPick: Pick | null = currentPick > 1 ? draft.picks[currentPick - 2] : null;
  const lastPickedPlayer: Player | null = lastPick?.player || null;
  const lastPickTeam: Team | undefined = lastPick ? teams.find(t => t.team_key === lastPick.team_key) : undefined;

  // Calculate picks until next pick for the provided team
  const picksUntilNextTeamPick = draft.picks.slice(currentPick - 1).findIndex(pick => pick.team_key === team.team_key);
  const picksUntilNextTeamPickDisplay = picksUntilNextTeamPick === -1 ? 'No more picks' : picksUntilNextTeamPick;

  return (
    <Card className={currentTeam === team ? "border-primary" : "border-muted"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-center">Round {round} Pick {pickInRound}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="w-[48%]">
              <p className="text-xs mb-1">Current Pick:</p>
              <TeamCard team={currentTeam} />
            </div>
            
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="w-[48%] cursor-pointer">
                  <p className="text-xs mb-1">Next Pick:</p>
                  <TeamCard team={nextTeam} />
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-2">
                <p className="font-bold text-sm mb-2">Next 5 Picks:</p>
                <div className="space-y-1">
                  {nextFivePicks.map((team, index) => (
                    <TeamCard key={index} team={team} />
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          <p className="text-center text-sm font-semibold">
            Pick {currentPick} of {draft.total_picks}
          </p>
          <Progress value={progress} className="w-full" />
          <DraftTimer
            draftId={draft.id}
            onTimerExpire={() => {}}
          />

          <div className="text-center">
            <p className="text-sm font-semibold">{possesiveTitle(team.name)} next pick:</p>
            <div className="text-lg">
              {picksUntilNextTeamPickDisplay === 0 ? 
                <Badge className='cursor-default' variant={'success'}>On the clock</Badge>
                : picksUntilNextTeamPickDisplay === 1 ?
                <Badge className="cursor-default" variant={'warn'}>On deck</Badge>
                : <Badge className="cursor-default" variant={'default'}>{picksUntilNextTeamPick}</Badge>
              }
            </div>
          </div>
          <h3 className="text-lg font-semibold text-center mt-4">Previous Picks</h3>
          {lastPickedPlayer && lastPickTeam ? (
            <div>
              <p className="text-xs mb-1">Last Picked Player ({lastPickTeam.name}):</p>
              <PlayerCard
                player={lastPickedPlayer}
                isDrafted={true}
                onClick={() => {}}
              />
            </div>
          ) : (
            <p className="text-sm text-center">No players picked yet</p>
          )}
          <RecentPicks draft={draft} />
        </div>
      </CardContent>
    </Card>
  );
};

export default DraftStatus;