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

    const teamLogos: TeamLogoType[] = parseTeamLogos(team.team_logos);
    const logoUrl = teamLogos.length > 0 ? teamLogos[0].url : '';

    return (
        <Avatar className={className}>
            <AvatarImage src={logoUrl} alt={team.name} />
            <AvatarFallback>{team.name[0]}</AvatarFallback>
        </Avatar>
    );
};