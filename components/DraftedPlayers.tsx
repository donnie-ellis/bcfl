// ./components/DraftedPlayers.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeagueSettings, Draft, Pick, RosterPosition, Team } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogo } from '@/components/TeamLogo';

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
  const { data: session } = useSession();
  const [rosterSlots, setRosterSlots] = useState<RosterSlot[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch(`/api/yahoo/league/${leagueKey}/teams`);
      const data = await response.json();
      setTeams(data);
      
      // Set default selected team to the current user's team
      const userTeam = data.find((team: Team) => team.managers.some(manager => manager.is_current_login));
      if (userTeam) {
        setSelectedTeam(userTeam.team_key);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, [leagueKey]);

  const fetchPicks = useCallback(async () => {
    try {
      const response = await fetch(`/api/db/draft/${draftId}/picks`);
      const data = await response.json();
      setPicks(data);
    } catch (error) {
      console.error('Error fetching picks:', error);
    }
  }, [draftId]);

  useEffect(() => {
    fetchTeams();
    fetchPicks();
  }, [fetchTeams, fetchPicks]);

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
    if (picks.length > 0 && rosterSlots.length > 0 && selectedTeam) {
      const teamPicks = picks.filter(pick => pick.team_key === selectedTeam);
      const updatedSlots = rosterSlots.map(slot => ({ ...slot, player: null }));
      
      teamPicks.forEach(pick => {
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
  }, [picks, selectedTeam]);

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
    <Card>
      <CardHeader>
        <div className="justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Drafted Players</h2>
          <Select
            value={selectedTeam || undefined}
            onValueChange={(value) => setSelectedTeam(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.team_key} value={team.team_key}>
                  <div className='flex'>
                    <TeamLogo teamKey={team.team_key} teams={teams} />
                    {team.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>      
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
      </CardContent>
    </Card>

  );
};

export default DraftedPlayers;