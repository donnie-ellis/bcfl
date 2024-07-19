// ./components/PlayersList.tsx
import React, { useState, useEffect } from 'react';
import { Player } from '@/lib/types';

interface PlayersListProps {
  leagueKey: string;
  draftId: string;
  onPlayerSelect: (player: Player) => void;
}

const PlayersList: React.FC<PlayersListProps> = ({ leagueKey, draftId, onPlayerSelect }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDrafted, setShowDrafted] = useState<boolean>(true);

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`/api/db/league/${leagueKey}/players?draftId=${draftId}`);
      const data = await response.json();
      setPlayers(data);
      setFilteredPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };
  
  const filterPlayers = () => {
    let filtered = players;

    if (positionFilter !== 'All') {
      filtered = filtered.filter(player => player.eligible_positions.includes(positionFilter));
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



  return (
    <div className="h-screen overflow-y-auto">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="All">All Positions</option>
          <option value="QB">QB</option>
          <option value="RB">RB</option>
          <option value="WR">WR</option>
          <option value="TE">TE</option>
          <option value="K">K</option>
          <option value="DEF">DEF</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showDrafted}
            onChange={() => setShowDrafted(!showDrafted)}
            className="mr-2"
          />
          Show Drafted Players
        </label>
      </div>
      <div className="space-y-2">
        {filteredPlayers.map(player => (
          <div
            key={player.player_key}
            className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-100"
            onClick={() => onPlayerSelect(player)}
          >
            <img
              src={player.headshot_url || '/default-player.png'}
              alt={player.full_name}
              className="w-12 h-12 rounded-full mr-4"
            />
            <div>
              <p className="font-semibold">{player.full_name}</p>
              <p className="text-sm text-gray-600">{player.editorial_team_abbr} - {player.display_position}</p>
              <p className="text-sm text-gray-500">ADP: {player.average_draft_position}</p>
            </div>
            {player.is_drafted && (
              <span className="ml-auto text-sm text-red-500">Drafted</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayersList;