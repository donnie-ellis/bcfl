// ./components/TeamCard.tsx
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Team, TeamLogo } from '@/lib/types/team.types';
import { Json } from '@/lib/types/database.types';

interface TeamProps {
  team: Team | undefined;
}

const TeamCard: React.FC<TeamProps> = ({ team }) => {
  if (!team) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-secondary rounded-md">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  const getTeamLogoUrl = (teamLogos: Json): string => {
    const parsedLogos = parseTeamLogos(teamLogos);
    return parsedLogos && parsedLogos.length > 0 ? parsedLogos[0].url : '';
  };

  const parseTeamLogos = (json: Json): TeamLogo[] | null => {
    if (Array.isArray(json) && json.every(isTeamLogoLike)) {
      return json.map(logo => ({
        size: logo.size,
        url: logo.url
      }));
    }
    return null;
  };

  function isTeamLogoLike(value: Json): value is { size: string; url: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'size' in value &&
      'url' in value &&
      typeof value.size === 'string' &&
      typeof value.url === 'string'
    );
  }

  return (
    <div className="flex items-center space-x-2 p-2 bg-secondary rounded-md">
      <Avatar className="h-8 w-8">
        <AvatarImage src={team.team_logos[0].url} alt={`${team.name} logo`} />
        <AvatarFallback>{team.name[0]}</AvatarFallback>
      </Avatar>
      <div className="overflow-hidden">
        <p className="font-semibold text-sm truncate">{team.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {team.managers && team.managers.length > 0 ? team.managers[0].nickname : 'No manager'}
        </p>
      </div>
    </div>
  );
};

export default TeamCard;