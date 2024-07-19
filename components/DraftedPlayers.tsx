// ./components/DraftedPlayers.tsx
import React, { useState, useEffect } from 'react';
import { Player, LeagueSettings } from '@/lib/types';

interface DraftedPlayersProps {
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = ({ leagueKey, draftId, leagueSettings }) => {
  const [draftedPlayers, setDraftedPlayers] = useState<Player[]>([]);

  useEffect(() => {
    fetchDraftedPlayers();
  }, [leagueKey, draftId]);

  const fetchDraftedPlayers = async () => {
    try {
      const response = await fetch(`/api/yahoo/draftedPlayers/${leagueKey}/${draftId}`);
      const data = await response.json();
      setDraftedPlayers(data);
    } catch (error) {
      console.error('Error fetching drafted players:', error);
    }
  };

  const renderRosterSlot = (position: string) => {
    const player = draftedPlayers.find(p => p.display_position === position);
    return (
      <tr key={position}>
        <td className="border px-4 py-2">{position}</td>
        <td className="border px-4 py-2">
          {player ? player.full_name : '-'}
        </td>
      </tr>
    );
  };

  const renderBenchSlots = () => {
    const benchPlayers = draftedPlayers.filter(p => !leagueSettings.roster_positions.map(rp => rp.position).includes(p.display_position));
    return benchPlayers.map((player, index) => (
      <tr key={`BN-${index}`}>
        <td className="border px-4 py-2">BN</td>
        <td className="border px-4 py-2">{player.full_name}</td>
      </tr>
    ));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Drafted Players</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th className="border px-4 py-2">Position</th>
            <th className="border px-4 py-2">Player</th>
          </tr>
        </thead>
        <tbody>
          {leagueSettings.roster_positions.map(rp => renderRosterSlot(rp.position))}
          {renderBenchSlots()}
        </tbody>
      </table>
    </div>
  );
};

export default DraftedPlayers;