import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Team } from '@/lib/types';

interface TeamProps {
  team: Team | undefined;
}

const TeamCard: React.FC<TeamProps> = ({ team }) => {
  if (!team) {
    return (
      <>
        <p>Loading. . .</p>
      </>
    )
  } else {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center space-x-2 pb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={team.team_logos[0].url} alt={`${team.name} logo`} />
            <AvatarFallback>{team.name}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{team.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{team.managers[0].nickname}</p>
          </div>
        </CardHeader>
      </Card>
    );
  };
}
export default TeamCard;