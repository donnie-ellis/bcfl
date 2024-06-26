'use client'
import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Button } from "@/components/ui/button";
import { Player } from '@/lib/types';

interface PlayerListProps {
    players: Player[];
}

type SortKey = 'name' | 'team' | 'position';

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
    const [sortedPlayers, setSortedPlayers] = useState<Player[]>(players);
    const [sortConfig, setSortConfig] = useState<{
        key: SortKey;
        direction: 'ascending' | 'descending';
    } | null>(null);

    const sortBy = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        const sorted = [...sortedPlayers].sort((a, b) => {
            if (key === 'name') {
                return a.name.full.localeCompare(b.name.full);
            } else if (key === 'team') {
                return (a.editorial_team_abbr || '').localeCompare(b.editorial_team_abbr || '');
            } else {
                return (getPlayerPosition(a).localeCompare(getPlayerPosition(b)));
            }
        });
        if (direction === 'descending') {
            sorted.reverse();
        }
        setSortedPlayers(sorted);
        setSortConfig({ key, direction });
    };

    const getPlayerPosition = (player: Player) => {
        return player.display_position || player.eligible_positions?.[0] || 'N/A';
    };

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Button variant="ghost" onClick={() => sortBy('name')}>
                                Name {sortConfig?.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                            </Button>
                        </TableHead>
                        <TableHead>
                            Image
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => sortBy('team')}>
                                Team {sortConfig?.key === 'team' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => sortBy('position')}>
                                Position {sortConfig?.key === 'position' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                            </Button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedPlayers.map((player) => (
                        <TableRow key={player.player_key}>
                            <TableCell>{player.name.full}</TableCell>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={player.headshot} />
                                    <AvatarFallback>{player.display_position}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell>{player.editorial_team_abbr || 'N/A'}</TableCell>
                            <TableCell>{getPlayerPosition(player)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default PlayerList;