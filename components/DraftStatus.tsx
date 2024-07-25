// ./components/DraftStatus.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Draft, LeagueSettings, Team } from '@/lib/types';

interface DraftStatusProps {
  draft: Draft;
  leagueSettings: LeagueSettings;
  teams: Team[];
}

const DraftStatus: React.FC<DraftStatusProps> = ({ draft, leagueSettings, teams }) => {
  const currentTeam = teams.find(team => team.team_key === draft.picks[draft.current_pick - 1]?.team_key);
  const nextTeam = teams.find(team => team.team_key === draft.picks[draft.current_pick]?.team_key);

  const progress = (draft.current_pick / draft.total_picks) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p><strong>Current Pick:</strong> {draft.current_pick} of {draft.total_picks}</p>
          <p><strong>Current Team:</strong> {currentTeam?.name || 'Loading...'}</p>
          <p><strong>Next Team:</strong> {nextTeam?.name || 'Loading...'}</p>
          <p><strong>Round:</strong> {Math.ceil(draft.current_pick / teams.length)}</p>
          <Progress value={progress} className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default DraftStatus;