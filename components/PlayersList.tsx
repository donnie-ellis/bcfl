// ./components/PlayersList.tsx
import React, { useState, useEffect } from 'react';
import { Player } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface PlayersListProps {
  leagueKey: string;
  draftId: string;
  onPlayerSelect: (player: Player) => void;
}

const positionOptions = [
  { value: 'All', label: 'All' },
  { value: 'QB', label: 'QB' },
  { value: 'RB', label: 'RB' },
  { value: 'WR', label: 'WR' },
  { value: 'TE', label: 'TE' },
  { value: 'K', label: 'K' },
  { value: 'DEF', label: 'DEF' },
];

const PlayersList: React.FC<PlayersListProps> = ({ leagueKey, draftId, onPlayerSelect }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDrafted, setShowDrafted] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const fetchPlayers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/db/league/${leagueKey}/players?draftId=${draftId}`);
      const data = await response.json();
      setPlayers(data);
      setFilteredPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterPlayers = () => {
    let filtered = players;

    if (positionFilter.length > 0 && !positionFilter.includes('All')) {
      filtered = filtered.filter(player => 
        player.eligible_positions.some(position => positionFilter.includes(position))
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!showDrafted) {
      filtered = filtered.filter(player => !player.is_drafted);
    }

    setFilteredPlayers(filtered);
  };

  useEffect(() => {
    fetchPlayers();
  }, [leagueKey, draftId]);
  
  useEffect(() => {
    filterPlayers();
  }, [players, positionFilter, searchTerm, showDrafted]);

  const togglePosition = (position: string) => {
    if (position === 'All') {
      setPositionFilter([]); // Clear all selections
    } else {
      setPositionFilter(prev => {
        const newFilter = prev.filter(p => p !== 'All'); // Remove 'All' if present
        if (newFilter.includes(position)) {
          return newFilter.filter(p => p !== position);
        } else {
          return [...newFilter, position];
        }
      });
    }
  };

  const isPositionSelected = (position: string) => {
    if (position === 'All') {
      return positionFilter.length === 0;
    }
    return positionFilter.includes(position);
  };

  return (
    <div className="h-screen overflow-y-auto p-4">
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full mb-4">
            {isFilterOpen ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Filters
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show Filters
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 mb-4">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <p className="mb-2 font-medium">Positions:</p>
              <div className="flex flex-wrap gap-2">
                {positionOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={isPositionSelected(option.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePosition(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-drafted"
                checked={showDrafted}
                onCheckedChange={setShowDrafted}
              />
              <Label htmlFor="show-drafted">Show Drafted Players</Label>
            </div>
          </div>
          <Separator className="my-4" />
        </CollapsibleContent>
      </Collapsible>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlayers.map(player => (
            <div
              key={player.player_key}
              className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-100"
              onClick={() => onPlayerSelect(player)}
            >
              <Avatar className="h-12 w-12 mr-4">
                <AvatarImage src={player.headshot_url} alt={player.full_name} />
                <AvatarFallback>{player.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{player.full_name}</p>
                <p className="text-sm text-gray-600">{player.editorial_team_abbr} - {player.display_position}</p>
              </div>
              {player.is_drafted && (
                <span className="ml-auto text-sm text-red-500">Drafted</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayersList;