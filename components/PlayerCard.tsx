// ./components/PlayerCard.tsx
import React from 'react';
import { Player } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  player: Player;
  isDrafted: boolean;
  onClick: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isDrafted, onClick }) => {
  return (
    <Card 
      className={`mb-2 cursor-pointer hover:bg-gray-100 transition-all ${isDrafted ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold">{player.full_name}</p>
          <p className="text-sm text-gray-500">{player.editorial_team_full_name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{player.display_position}</Badge>
          <span className="text-sm font-medium">{player.rank ? '#' + player.rank : ''}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerCard;