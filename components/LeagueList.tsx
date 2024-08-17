'use client'
import React from 'react';
import { League } from '@/lib/types/';
import LeagueCard from './LeagueCard';
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeagueListProps {
  leagues: League[];
  onLeagueClick?: (league: League) => void;
}

const LeagueList: React.FC<LeagueListProps> = ({ leagues, onLeagueClick }) => (
  <ScrollArea className="h-[calc(100vh-4rem)] w-full p-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {leagues.map((league) => (
        <LeagueCard 
          key={league.league_key} 
          league={league} 
          onLeagueClick={onLeagueClick}
        />
      ))}
    </div>
  </ScrollArea>
);

export default LeagueList;