import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeagueSettings } from '@/lib/types';

interface LeagueSettingsCardProps {
  settings: LeagueSettings | null;
  isLoading: boolean;
}

const LeagueSettingsCard: React.FC<LeagueSettingsCardProps> = ({ settings, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle><Skeleton className="h-8 w-3/4" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>League Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p><strong>Draft Type:</strong> {settings.draft_type}</p>
        <p><strong>Scoring Type:</strong> {settings.scoring_type}</p>
        <p><strong>Max Teams:</strong> {settings.max_teams}</p>
        <p><strong>Waiver Rule:</strong> {settings.waiver_rule}</p>
        <p><strong>Trade End Date:</strong> {settings.trade_end_date}</p>
        <p><strong>Playoff Teams:</strong> {settings.num_playoff_teams}</p>
        <p><strong>Uses Fractional Points:</strong> {settings.uses_fractional_points ? 'Yes' : 'No'}</p>
        <p><strong>Uses Negative Points:</strong> {settings.uses_negative_points ? 'Yes' : 'No'}</p>
        <p><strong>Roster Positions:</strong></p>
        <ul className="list-disc list-inside">
          {settings.roster_positions.map((pos, index) => (
            <li key={index}>
              {pos.position} ({pos.position_type}): {pos.count} 
              {pos.is_starting_position ? ' (Starting)' : ''}
            </li>
          ))}
        </ul>
        <p><strong>Stat Categories:</strong></p>
        <ul className="list-disc list-inside">
          {settings.stat_categories.map((stat, index) => (
            <li key={index}>
              {stat.display_name} ({stat.position_type})
              {stat.value !== null && ` - Value: ${stat.value}`}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default LeagueSettingsCard;
