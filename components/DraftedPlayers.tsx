// ./components/DraftedPlayers.tsx
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LeagueSettings, Draft, Pick, RosterPosition } from '@/lib/types';

interface DraftedPlayersProps {
  leagueKey: string;
  draftId: string;
  leagueSettings: LeagueSettings | null;
}

interface RosterSlot {
  position: string;
  player: Pick | null;
}

const DraftedPlayers: React.FC<DraftedPlayersProps> = ({ leagueKey, draftId, leagueSettings }) => {
  const [rosterSlots, setRosterSlots] = useState<RosterSlot[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPicks = async () => {
      try {
        const response = await fetch(`/api/db/draft/${draftId}/picks`);
        const data = await response.json();
        setPicks(data);
      } catch (error) {
        console.error('Error fetching picks:', error);
      }
    };

    fetchPicks();
  }, [draftId]);

  useEffect(() => {
    if (leagueSettings && leagueSettings.roster_positions) {
      const slots: RosterSlot[] = [];
      leagueSettings.roster_positions.forEach((rosterPosition: RosterPosition) => {
        if (rosterPosition.roster_position.position !== 'IR') {
          for (let i = 0; i < rosterPosition.roster_position.count; i++) {
            slots.push({ position: rosterPosition.roster_position.position, player: null });
          }
        }
      });
      setRosterSlots(slots);
      setIsLoading(false);
    }
  }, [leagueSettings]);

  useEffect(() => {
    if (picks.length > 0 && rosterSlots.length > 0) {
      const updatedSlots = [...rosterSlots];
      picks.forEach(pick => {
        const playerPosition = pick.player?.display_position || '';
        let slotFound = false;

        // Try to fill in matching position
        for (let i = 0; i < updatedSlots.length; i++) {
          if (updatedSlots[i].position === playerPosition && !updatedSlots[i].player) {
            updatedSlots[i].player = pick;
            slotFound = true;
            break;
          }
        }

        // If no matching position, try to fill BN spot
        if (!slotFound) {
          for (let i = 0; i < updatedSlots.length; i++) {
            if (updatedSlots[i].position === 'BN' && !updatedSlots[i].player) {
              updatedSlots[i].player = pick;
              slotFound = true;
              break;
            }
          }
        }

        // If still no spot, fill first available spot
        if (!slotFound) {
          for (let i = 0; i < updatedSlots.length; i++) {
            if (!updatedSlots[i].player) {
              updatedSlots[i].player = pick;
              break;
            }
          }
        }
      });

      setRosterSlots(updatedSlots);
    }
  }, [picks, rosterSlots]);

  const renderSkeletonRows = () => {
    return Array(10).fill(null).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      </TableRow>
    ));
  };

  const shouldStrikeThrough = (slot: RosterSlot) => {
    if (!slot.player) return false;
    return slot.player.player?.display_position !== slot.position && slot.position !== 'BN';
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Your Drafted Players</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Position</TableHead>
            <TableHead>Player</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            renderSkeletonRows()
          ) : (
            rosterSlots.map((slot, index) => (
              <TableRow key={index}>
                <TableCell>
                  {shouldStrikeThrough(slot) ? (
                    <span className="line-through">{slot.position}</span>
                  ) : (
                    slot.position
                  )}
                </TableCell>
                <TableCell>
                  {slot.player ? (
                    <div>
                      <span>{slot.player.player?.full_name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({slot.player.player?.editorial_team_abbr} - {slot.player.player?.display_position})
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DraftedPlayers;