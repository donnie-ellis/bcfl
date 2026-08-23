'use client'
import React from 'react';
import { League } from '@/lib/types/';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeagueCardProps {
  league: League;
  onLeagueClick?: (league: League) => void;
}

const LeagueCard: React.FC<LeagueCardProps> = ({ league, onLeagueClick }) => (
  <Card
    className="w-full max-w-md cursor-pointer hover:shadow-lg transition-shadow"
    onClick={() => onLeagueClick && onLeagueClick(league)}
  >
    <CardHeader>
      <CardTitle className="text-2xl font-bold">{league.name}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {league.logo_url && <img src={league.logo_url} alt={league.name} className="mx-auto" />}
      <span>Season:
        <Badge variant="secondary">
          {league.season ?? 'N/A'}
        </Badge>
      </span>
      <span>Number of Teams:
        <Badge
          variant="secondary"
        >
          {league.num_teams ?? 'N/A'}
        </Badge>
      </span>
    </CardContent>
  </Card>
);

export default LeagueCard;
