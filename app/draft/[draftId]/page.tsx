// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Profile from '@/components/Profile';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftStatus from '@/components/DraftStatus';
import PlayerDetails from '@/components/PlayerDetails';
import { League, Draft, LeagueSettings, Player, Team } from '@/lib/types';

const DraftPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;

  const [league, setLeague] = useState<League | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (draftId) {
      fetchDraftData();
    }
  }, [draftId]);

  const fetchDraftData = async () => {
    try {
      const draftResponse = await fetch(`/api/db/draft/${draftId}`);
      const draftData = await draftResponse.json();
      setDraft(draftData);

      const leagueKey = draftData.league_id;

      const [leagueResponse, settingsResponse, teamsResponse] = await Promise.all([
        fetch(`/api/db/league/${leagueKey}`),
        fetch(`/api/db/league/${leagueKey}/settings`),
        fetch(`/api/yahoo/league/${leagueKey}/teams`)
      ]);

      const [leagueData, settingsData, teamsData] = await Promise.all([
        leagueResponse.json(),
        settingsResponse.json(),
        teamsResponse.json()
      ]);

      setLeague(leagueData);
      setLeagueSettings(settingsData);
      setTeams(teamsData);

      // Update draft picks with full team objects
      const updatedPicks = draftData.picks.map((pick: any) => ({
        ...pick,
        team: teamsData.find((team: Team) => team.team_key === pick.team_key)
      }));
      setDraft({...draftData, picks: updatedPicks});

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (draftId) {
      fetchDraftData();
    }
  }, [draftId]);

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{`${league.name} ${draft.name} Draft`}</h1>
        <Profile />
      </div>

      <div className="flex space-x-4">
        <div className="w-1/4">
          <PlayersList
            leagueKey={draft.league_id}
            draftId={draftId}
            onPlayerSelect={setSelectedPlayer}
          />
        </div>

        <div className="w-1/2">
          <DraftStatus
            draft={draft}
            leagueSettings={leagueSettings}
            teams={teams}
          />
          <PlayerDetails 
            player={selectedPlayer} 
          />
        </div>
          {/* Add other middle components here */}

        <div className="w-1/4">
          <DraftedPlayers
            leagueKey={draft.league_id}
            draftId={draftId}
            leagueSettings={leagueSettings}
          />
        </div>
      </div>
    </div>
  );
};

export default DraftPage;