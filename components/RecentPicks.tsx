// ./components/RecentPicks.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Draft, Pick, Team } from '@/lib/types';

interface RecentPicksProps {
  draft: Draft | null;
  teams?: Team[];
  className?: string;
}

const RecentPicks: React.FC<RecentPicksProps> = ({ draft, teams = [], className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!draft || !draft.current_pick) {
    return null;
  }

  // Get recent picks (last 5-6 picks that have been made)
  const currentPick = draft.current_pick || 0;
  const recentPicks = draft.picks
    .slice(Math.max(0, currentPick - 6), currentPick - 1)
    .filter(pick => pick.is_picked && pick.player)
    .reverse();

  if (recentPicks.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Picks</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{recentPicks.length}</Badge>
                {isOpen ? (
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default RecentPicks;