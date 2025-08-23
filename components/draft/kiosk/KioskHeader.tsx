// ./components/draft/kiosk/KioskHeader.tsx
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { League, Draft, Team } from '@/lib/types/';
import RoundSquares from '@/components/RoundSquares';
import { LeagueSettings } from '@/lib/types';

interface KioskHeaderProps {
  league: League;
  draft: Draft;
  teams: Team[];
  leagueSettings: LeagueSettings | null;
  className?: string;
}

const KioskHeader: React.FC<KioskHeaderProps> = ({ 
  league, 
  draft, 
  teams, 
  leagueSettings,
  className = "" 
}) => {
    if (!draft || !draft.current_pick) return null;

  const currentRound = Math.ceil(draft.current_pick / teams.length);
  const currentRoundPicks = Math.min(teams.length, draft.total_picks - (currentRound - 1) * teams.length);
  const picksInCurrentRound = Math.max(0, draft.current_pick - (currentRound - 1) * teams.length);
  const roundProgress = (picksInCurrentRound / currentRoundPicks) * 100;

  return (
    <div className={`flex-none border-b-2 bg-card/50 backdrop-blur-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border-2">
              <AvatarImage src={league.logo_url ? league.logo_url : undefined} alt={league.name} />
              <AvatarFallback className="text-lg">{league.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{league.name}</h1>
              <p className="text-sm text-muted-foreground">{draft.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {draft.status ? draft.status.toUpperCase() : ""}
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Round {currentRound}</h2>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Overall Progress</div>
              <div className="text-lg font-bold">{draft.current_pick - 1} of {draft.total_picks}</div>
            </div>
          </div>
          
          <RoundSquares
            currentRound={currentRound}
            draft={draft}
            teams={teams}
            leagueSettings={leagueSettings}
            currentRoundOnly={true}
          />
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Round Progress</span>
              <span>{picksInCurrentRound} of {currentRoundPicks}</span>
            </div>
            <Progress value={roundProgress} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskHeader;