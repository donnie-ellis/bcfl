import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import TeamList from "@/components/TeamList";
import { League } from "@/lib/types/league.types";
import { Team } from "@/lib/types/team.types";
import { Skeleton } from "@/components/ui/skeleton";

interface LeagueInfoCardProps {
  selectedLeague: League;
  teams: Team[];
  isLoading: boolean;
}

const LeagueInfoCard: React.FC<LeagueInfoCardProps> = ({
  selectedLeague,
  teams,
  isLoading,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>League Information</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-2">
          <p>
            <strong>Number of Teams:</strong>{" "}
            <Badge>{selectedLeague.num_teams}</Badge>
          </p>
          <p>
            <strong>League Type:</strong>{" "}
            <Badge>{selectedLeague.league_type}</Badge>
          </p>
          <p>
            <strong>Scoring Type:</strong>{" "}
            <Badge>{selectedLeague.scoring_type}</Badge>
          </p>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center justify-between w-full">
                <span>Teams</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <TeamList teams={teams} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </CardContent>
  </Card>
);

export default LeagueInfoCard;