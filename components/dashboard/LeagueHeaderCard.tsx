// ./components/LeagueHeaderCard.tsx
// This component displays the league header with the logo and name.
import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { League } from "@/lib/types";

const LeagueHeaderCard: React.FC<{ league: League | null }> = ({ league }) => {
    return (
      league &&
        <Card>
                <CardHeader className="flex flex-row items-center space-x-4">
                  {league.logo_url && (
                    <img 
                      src={league.logo_url} 
                      alt={league.name} 
                      className="w-16 h-16 rounded"
                    />
                  )}
                  <CardTitle>{league.name}</CardTitle>
                </CardHeader>
              </Card>
    );
}

export default LeagueHeaderCard;
