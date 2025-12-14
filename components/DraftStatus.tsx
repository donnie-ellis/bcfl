// ./components/DraftStatus.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Draft, LeagueSettings, Team, Player, Pick, possesiveTitle } from '@/lib/types/';
import TeamCard from '@/components/TeamCard';
import PlayerCard from '@/components/PlayerCard';
import { Badge } from '@/components/ui/badge';
import DraftTimer from '@/components/DraftTimer';
import AveragePickTime from './AveragePickTime';
import { ChevronDown, ChevronUp, Clock, TrendingUp, Users, Target } from 'lucide-react';

interface DraftStatusProps {
  draft: Draft | null;
  leagueSettings: LeagueSettings | null;
  teams: Team[];
  team: Team;
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings, teams, team }) => {
  const [isRecentPicksOpen, setIsRecentPicksOpen] = useState(false);

  if (!draft || !leagueSettings) {
    return <DraftStatusSkeleton />;
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
  const picksUntilNextTeamPick = draft.picks.slice(currentPick - 1).findIndex(pick => pick.team_key === team.team_key);
  const isCurrentUserPick = currentTeam?.team_key === team.team_key;
  const isOnDeck = picksUntilNextTeamPick === 1;

  // Recent picks data
  const recentPicks = draft.picks
    .slice(Math.max(0, currentPick - 6), currentPick - 1)
    .filter(pick => pick.is_picked)
    .reverse();

  return (
    <div className="space-y-4">
      {/* Primary Status Card */}
      <Card className={`${isCurrentUserPick ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 
                        isOnDeck ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 
                        'border-muted'} transition-colors duration-300`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl">
              Round {round}, Pick {pickInRound}
            </CardTitle>
            {isCurrentUserPick && (
              <Badge variant="success" className="animate-pulse">
                <Target className="w-3 h-3 mr-1" />
                Your Pick!
              </Badge>
            )}
            {isOnDeck && !isCurrentUserPick && (
              <Badge variant="warn">
                <Clock className="w-3 h-3 mr-1" />
                On Deck
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Pick Team */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 font-medium">Current Pick:</p>
            <TeamCard team={currentTeam} />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Draft Progress</span>
              <span className="text-sm text-muted-foreground">
                {currentPick - 1} of {draft.total_picks}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Timer and Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                <span className="text-sm font-medium">Pick Timer</span>
              </div>
              <DraftTimer
                draftId={draft.id}
                onTimerExpire={() => {}}
              />
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4 mr-1 text-muted-foreground" />
                <span className="text-sm font-medium">Avg Time</span>
              </div>
              <AveragePickTime
                picks={draft.picks}
                teamKey={currentTeam!.team_key}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Team Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Users className="w-5 h-5 mr-2" />
            {team.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Next pick in:</p>
              <div className="text-2xl font-bold">
                {picksUntilNextTeamPick === -1 ? 
                  <Badge variant="outline">Draft Complete</Badge> :
                  picksUntilNextTeamPick === 0 ? 
                  <Badge variant="success">Now!</Badge> :
                  `${picksUntilNextTeamPick} pick${picksUntilNextTeamPick !== 1 ? 's' : ''}`
                }
              </div>
            </div>
            {nextTeam && nextTeam !== currentTeam && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Next up:</p>
                <div className="max-w-32">
                  <TeamCard team={nextTeam} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - Collapsible */}
      <Collapsible open={isRecentPicksOpen} onOpenChange={setIsRecentPicksOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Picks</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{recentPicks.length}</Badge>
                  {isRecentPicksOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {recentPicks.length > 0 ? (
                <div className="space-y-2">
                  {recentPicks.map((pick) => {
                    const pickTeam = teams.find(t => t.team_key === pick.team_key);
                    return (
                      <div key={pick.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          #{pick.total_pick_number}
                        </Badge>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          {pick.player ? (
                            <div className="space-y-1">
                              <p className="font-medium text-sm truncate">
                                {pick.player.full_name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="truncate">{pick.player.editorial_team_abbr}</span>
                                <span>•</span>
                                <span>{pick.player.display_position}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No player selected</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-muted-foreground truncate max-w-16 sm:max-w-20">
                            {pickTeam?.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No recent picks to show
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

// Loading skeleton component
const DraftStatusSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="flex items-center space-x-2 p-2 bg-secondary rounded-md">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  </div>
);

export default DraftStatus;