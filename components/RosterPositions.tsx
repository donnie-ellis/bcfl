// ./components/RosterPositions.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Json, parseRosterPositions } from '@/lib/types';

const RosterPositions: React.FC<{ positions: Json }> = ({ positions }) => {
const parsedPositions = parseRosterPositions(positions);
    return (
    <ul className="space-y-1">
        {parsedPositions.map((pos, index) => (
            <li key={index}>
                <Badge variant="outline">{pos.roster_position.position}</Badge>
                <span className="ml-2">{pos.roster_position.count}</span>
                {pos.roster_position.position_type && (
                    <span className="ml-2 text-sm text-gray-500">({pos.roster_position.position_type})</span>
                )}
            </li>
        ))}
    </ul>
    );
};

export default RosterPositions;
