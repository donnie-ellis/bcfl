// ./components/RecentPicks.tsx
import { Draft, Pick, Player, Team } from '@/lib/types';
import React from 'react';
import { TeamLogo } from './TeamLogo';

interface RecentPicksProps {
    draft: Draft | null;
}

const RecentPicks: React.FC<RecentPicksProps> = ({ draft }) => {
    if (!draft || !draft.current_pick) {
        return null;
    }
    const playerInfo = (player: Player | null) =>{
        if (!player) return 'Player not available';
        return player.full_name + 
        ' (' + player.editorial_team_abbr + ') - ' +
        player.display_position;
    }
    const teamInfo = (team: Team | null) => {
        if (!team) return 'Team not available';
        return team.name;
    }
    return (
        <ul>
            {draft.picks
            .slice(draft.current_pick - 11, draft.current_pick - 2)
            .sort((a, b) => b.pick_number - a.pick_number)
            .map((pick: Pick) => (
                <li key={pick.pick_number} className="flex items-center justify-between p-2 border-b">
                    <span>{playerInfo(pick.player)}</span>
                    <span className="text-sm text-muted-foreground">{teamInfo(pick.team)}</span>
                </li>
            ))}
        </ul>
    )
}
export default RecentPicks;
