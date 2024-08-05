// ./components/DraftStatus.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Draft, LeagueSettings, Team } from '@/lib/types';
import TeamCard from '@/components/TeamCard';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface DraftStatusProps {
  draft: Draft | null;
  leagueSettings: LeagueSettings | null;
  teams: Team[];
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings, teams }) => {
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

  const currentPick = draft.current_pick;
  const totalTeams = teams.length;
  const round = Math.ceil(currentPick / totalTeams);
  const pickInRound = ((currentPick - 1) % totalTeams) + 1;

  const getCurrentTeam = (pickNumber: number) => 
    teams.find(team => team.team_key === draft.picks[pickNumber - 1]?.team_key);

  const currentTeam = getCurrentTeam(currentPick);
  const nextTeam = getCurrentTeam(currentPick + 1);

  const progress = (currentPick / draft.total_picks) * 100;

  const nextFivePicks = Array.from({ length: 5 }, (_, i) => getCurrentTeam(currentPick + i + 1));

  return (
    <Card className="">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default DraftStatus;