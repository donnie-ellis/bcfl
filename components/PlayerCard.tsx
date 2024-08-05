// ./components/PlayerCard.tsx
import React from 'react';
import { Player } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PlayerCardProps {
  player: Player;
  isDrafted: boolean;
  fadeDrafted?: boolean;
  onClick: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isDrafted, fadeDrafted, onClick }) => {
  return (
    <Card 
      className={`mb-2 cursor-pointer group transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105 ${isDrafted && fadeDrafted ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center space-x-3 text-muted-foreground group-hover:text-foreground transition-colors duration-300">
        <Avatar className="h-12 w-12 rounded">
          <AvatarImage src={player.headshot_url || player.image_url} alt={player.full_name} />
          <AvatarFallback>{player.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <p className="font-semibold">{player.full_name}</p>
          <p className="text-sm">
            <span className="font-medium text-primary">{player.display_position}</span>
            {player.editorial_team_full_name && (
              <> - <span className="text-gray-500">{player.editorial_team_full_name}</span></>
            )}
          </p>
        </div>
        {player.rank && (
          <div className="text-sm font-medium">
            #{player.rank}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerCard;