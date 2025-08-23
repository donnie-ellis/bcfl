// ./components/draft/kiosk/KioskTeamStatus.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Team as OriginalTeam } from '@/lib/types/';

// Extend or redefine Team type to include team_logos as an array
type Team = OriginalTeam & {
  team_logos?: { url: string }[];
};
import { cn } from '@/lib/utils';
import DraftTimer from '@/components/DraftTimer';
import AveragePickTime from '@/components/AveragePickTime';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import { pick } from 'lodash';

interface KioskTeamStatusProps {
  team: Team;
  remainingPicks: number;
  draftId: number;
  picks: PickWithPlayerAndTeam[];
  isOvertime?: boolean;
  className?: string;
  pickDuration?: number;
}

const KioskTeamStatus: React.FC<KioskTeamStatusProps> = ({
  team,
  remainingPicks,
  draftId,
  picks,
  isOvertime = false,
  className = "",
  pickDuration = 90
}) => {
  return (
    <Card className={cn("border-2 shadow-lg", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-3">
          <Avatar className="h-14 w-14 border-2 shadow-lg">
            <AvatarImage src={team.team_logos?.[0]?.url} alt={team.name} />
            <AvatarFallback className="text-lg">{team.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className='text-xl font-bold'>{team.name}</h2>
                <div className='flex items-center space-x-2 text-sm mt-1'>
                  {team.managers?.map((manager, index) => (
                    <span key={index} className="flex items-center space-x-1">
                      <span className="font-medium">{manager.nickname}</span>
                      <Avatar className="h-6 w-6 border">
                        <AvatarImage src={manager.image_url as string} alt={manager.nickname ?? 'Unknown'} />
                        <AvatarFallback className="text-xs">{(manager.nickname ?? 'U')[0]}</AvatarFallback>
                      </Avatar>
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted-foreground">Picks Left</p>
                <p className="text-3xl font-bold text-primary">{remainingPicks}</p>
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Unified Draft Status Bar */}
      <CardContent className="pt-0">
        <div className={cn(
          "bg-gradient-to-r from-muted/20 to-muted/40 rounded-xl p-4 border-2 transition-all duration-300",
          isOvertime && "from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800"
        )}>
          <div className="flex items-center justify-between">
            <DraftTimer 
              draftId={draftId}
              size="lg"
              showProgress={true}
              pickDuration={pickDuration}
            />
            <div className="h-16 w-px bg-border mx-4" />
            <AveragePickTime
              picks={picks}
              teamKey={team.team_key}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KioskTeamStatus;