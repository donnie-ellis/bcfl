// ./components/TeamLogo.tsx
import React from 'react';
import { Team } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { parseTeamLogos, TeamLogo as TeamLogoType } from '@/lib/types/team.types';

interface TeamLogoProps {
    teamKey: string;
    teams: Team[];
    className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ teamKey, teams, className = 'h-10 w-10' }) => {
    const team = teams.find(t => t.team_key === teamKey);
    
    if (!team) {
        return (
            <Avatar className={className}>
                <AvatarFallback>?</AvatarFallback>
            </Avatar>
        );
    }

    return (
        <Avatar className={className}>
            <AvatarImage src={team.team_logos ? team.team_logos[0].url : ''} alt={team.name} />
            <AvatarFallback>{team.name[0]}</AvatarFallback>
        </Avatar>
    );
};