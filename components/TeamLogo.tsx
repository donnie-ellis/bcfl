// ./components/TeamLogo.tsx
import React from 'react';
import { Team } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getTeamLogoUrl } from '@/lib/types/team.types';

interface TeamLogoProps {
    teamId: number;
    teams: Team[];
    className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ teamId, teams, className = 'h-10 w-10' }) => {
    const team = teams.find(t => t.id === teamId);

    if (!team) {
        return (
            <Avatar className={className}>
                <AvatarFallback>?</AvatarFallback>
            </Avatar>
        );
    }

    const logoUrl = getTeamLogoUrl(team);

    return (
        <Avatar className={className}>
            <AvatarImage src={logoUrl} alt={team.name} />
            <AvatarFallback>{team.name[0]}</AvatarFallback>
        </Avatar>
    );
};
