'use client'
import React from 'react';
import { League } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from 'lucide-react';

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
      <a href={league.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:underline">
        League URL <ExternalLink className="ml-1 w-4 h-4" />
      </a>
      <img src={league.logo_url} alt={league.name} className="mx-auto" />
      <span>Scoring Type: 
        <Badge 
          variant="secondary">
            {league.scoring_type === 'head' ? 'Head-to-Head' : 'Rotisserie'}
          </Badge>
        </span>
      <span>Number of Teams: 
        <Badge
          variant="secondary"
        >
          {league.num_teams}
        </Badge>
      </span>
      <span>Draft Status: 
        <Badge 
          variant={league.draft_status === 'predraft' ? "secondary" : "default"}
        >
          {league.draft_status === 'predraft' ? 'Pre-Draft' : league.draft_status}
        </Badge>
      </span>
    </CardContent>
  </Card>
);

export default LeagueCard;