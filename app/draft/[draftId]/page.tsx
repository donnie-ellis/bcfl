// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import Profile from '@/components/Profile';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftStatus from '@/components/DraftStatus';
import PlayerDetails from '@/components/PlayerDetails';
import { League, Draft, LeagueSettings, Player, Team, Pick } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import SubmitPickButton from '@/components/SubmitPicksButton';
import { toast } from "sonner";

const DraftPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [league, setLeague] = useState<League | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [currentPick, setCurrentPick] = useState<Pick | null>(null);

  const fetchDraftData = async () => {
    if (!supabase) return;

    try {
      const draftResponse = await fetch(`/api/db/draft/${draftId}`);
      const draftData = await draftResponse.json();
      setDraft(draftData);

      const leagueKey = draftData.league_id;

      const [leagueResponse, settingsResponse, teamsResponse, teamResponse, currentPickResponse] = await Promise.all([
        fetch(`/api/db/league/${leagueKey}`),
        fetch(`/api/db/league/${leagueKey}/settings`),
        fetch(`/api/yahoo/league/${leagueKey}/teams`),
        fetch(`/api/yahoo/user/league/${leagueKey}/team`),
        fetch(`/api/db/draft/${draftId}/pick`)
      ]);

      const [leagueData, settingsData, teamsData, teamData, currentPickData] = await Promise.all([
        leagueResponse.json(),
        settingsResponse.json(),
        teamsResponse.json(),
        teamResponse.json(),
        currentPickResponse.json()
      ]);

      setLeague(leagueData);
      setLeagueSettings(settingsData);
      setTeams(teamsData);
      setTeam(teamData);
      setCurrentPick(currentPickData);

      // Update draft picks with full team objects
      const updatedPicks = draftData.picks.map((pick: any) => ({
        ...pick,
        team: teamsData.find((team: Team) => team.team_key === pick.team_key)
      }));
      setDraft({...draftData, picks: updatedPicks});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch draft data. Please try again.");
    }
  };

  useEffect(() => {
    if (draftId && supabase) {
      fetchDraftData();

      // Subscribe to draft changes
      const draftSubscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, (payload) => {
          setDraft(prevDraft => ({ ...prevDraft, ...payload.new }));
        })
        .subscribe();

      // Subscribe to pick changes
      const picksSubscription = supabase
        .channel('picks_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, (payload) => {
          setCurrentPick(payload.new as Pick);
          fetchDraftData(); // Refetch all data to ensure consistency
        })
        .subscribe();

      return () => {
        supabase.removeChannel(draftSubscription);
        supabase.removeChannel(picksSubscription);
      };
    }
  }, [draftId, supabase]);

  const isCurrentUserPick = currentPick?.team_key === team?.team_key;

  const handleSubmitPick = async () => {
    if (!selectedPlayer || !currentPick || !draft) {
      toast.error("Unable to submit pick. Please try again.");
      return;
    }

    try {
      const response = await fetch(`/api/db/draft/${draftId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickId: currentPick.id,
          playerId: selectedPlayer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit pick');
      }

      toast.success(`You've drafted ${selectedPlayer.full_name}!`);

      setSelectedPlayer(null);
      fetchDraftData(); // Refetch data to update the draft state
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    }
  };

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex gap-4">
          <Avatar className='h-12 w-12'>
            <AvatarFallback>{league.name}</AvatarFallback>
            <AvatarImage src={league.logo_url} alt={league.name} />
          </Avatar>
          {`${league.name} ${draft.name} Draft`}
        </h1>
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
        
        <div className="w-1/2 space-y-4">
          <DraftStatus
            draft={draft}
            leagueSettings={leagueSettings}
            teams={teams}
          />
          <SubmitPickButton
            isCurrentUserPick={isCurrentUserPick}
            selectedPlayer={selectedPlayer}
            currentPick={currentPick}
            onSubmitPick={handleSubmitPick}
          />
          <PlayerDetails 
            player={selectedPlayer} 
          />
        </div>

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