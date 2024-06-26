import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TeamProps {
  name: string;
  managerNickname: string;
  logoUrl: string;
}

const TeamCard: React.FC<TeamProps> = ({ name, managerNickname, logoUrl }) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <Avatar className="h-16 w-16">
          <AvatarImage src={logoUrl} alt={`${name} logo`} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{name}</CardTitle>
          <p className="text-sm text-muted-foreground">{managerNickname}</p>
        </div>
      </CardHeader>
    </Card>
  );
};

export default TeamCard;