import React from 'react';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';

interface AveragePickTimeProps {
  picks: PickWithPlayerAndTeam[];
  teamKey: string;
  className?: string;
}

const AveragePickTime: React.FC<AveragePickTimeProps> = ({
  picks,
  teamKey,
  className = ""
}) => {
  const calculateAveragePickTime = () => {
    // Filter picks for the specific team that have been made and have pick time data
    const teamPicks = picks.filter(pick => 
      pick.team_key === teamKey && 
      pick.is_picked && 
      pick.pick_time_seconds !== null && 
      pick.pick_time_seconds !== undefined
    );

    // If no picks with timing data, return null
    if (teamPicks.length === 0) {
      return null;
    }

    // Calculate average pick time
    const totalSeconds = teamPicks.reduce((sum, pick) => sum + (pick.pick_time_seconds || 0), 0);
    const averageSeconds = Math.round(totalSeconds / teamPicks.length);

    return averageSeconds;
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) {
      return '--:--';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const averagePickTime = calculateAveragePickTime();
  const teamPicksCount = picks.filter(pick => 
    pick.team_key === teamKey && 
    pick.is_picked && 
    pick.pick_time_seconds !== null && 
    pick.pick_time_seconds !== undefined
  ).length;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-2xl font-mono font-bold text-primary">
        {formatTime(averagePickTime)}
      </div>
      <div className="text-sm text-muted-foreground">
        Avg Pick Time
        {teamPicksCount > 0 && (
          <span className="ml-1">({teamPicksCount} pick{teamPicksCount !== 1 ? 's' : ''})</span>
        )}
      </div>
    </div>
  );
};

export default AveragePickTime;