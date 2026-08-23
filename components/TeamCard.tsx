// ./components/TeamCard.tsx
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Team, getTeamLogoUrl } from '@/lib/types/team.types';

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

  return (
    <div className="flex items-center space-x-2 p-2 bg-secondary rounded-md">
      <Avatar className="h-8 w-8">
        <AvatarImage src={getTeamLogoUrl(team)} alt={`${team.name} logo`} />
        <AvatarFallback>{team.name[0]}</AvatarFallback>
      </Avatar>
      <div className="overflow-hidden">
        <p className="font-semibold text-sm truncate">{team.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {team.members && team.members.length > 0 ? team.members[0].display_name || team.members[0].email : 'No manager'}
        </p>
      </div>
    </div>
  );
};

export default TeamCard;
