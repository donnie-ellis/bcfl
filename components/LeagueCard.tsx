'use client'
import React from 'react';
import { League } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from 'lucide-react';

interface LeagueCardProps {
  league: League;
  onLeagueClick?: (league_key: string) => void;
}

const LeagueCard: React.FC<LeagueCardProps> = ({ league, onLeagueClick }) => (
  <Card 
    className="w-full max-w-md cursor-pointer hover:shadow-lg transition-shadow"
    onClick={() => onLeagueClick && onLeagueClick(String(league.league_key))}
  >
    <CardHeader>
      <CardTitle className="text-2xl font-bold">{league.name}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <a href={league.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:underline">
        League URL <ExternalLink className="ml-1 w-4 h-4" />
      </a>
      <img src={league.logo_url} alt={league.name} className="mx-auto" />
      <p>Scoring Type: 
        <Badge 
          variant="secondary">
            {league.scoring_type === 'head' ? 'Head-to-Head' : 'Rotisserie'}
          </Badge>
        </p>
      <p>Number of Teams: 
        <Badge
          variant="secondary"
        >
          {league.num_teams}
        </Badge>
      </p>
      <p>Draft Status: 
        <Badge 
          variant={league.draft_status === 'predraft' ? "secondary" : "default"}
        >
          {league.draft_status === 'predraft' ? 'Pre-Draft' : league.draft_status}
        </Badge>
      </p>
    </CardContent>
  </Card>
);

export default LeagueCard;