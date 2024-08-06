// ./app/draft/[draftId]/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import PlayersList from '@/components/PlayersList';
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftStatus from '@/components/DraftStatus';
import PlayerDetails from '@/components/PlayerDetails';
import { League, Draft, LeagueSettings, Player, Team, Pick } from '@/lib/types';
import SubmitPickButton from '@/components/SubmitPicksButton';
import { toast } from "sonner";
import DraftHeader from '@/components/DraftHeader';

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
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [isPickSubmitting, setIsPickSubmitting] = useState(false);
  
  const fetchDraftData = useCallback(async () => {
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

      if (!leagueResponse.ok || !settingsResponse.ok || !teamsResponse.ok || !teamResponse.ok || !currentPickResponse.ok) {
        throw new Error('Error fetching data');
      }
      
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
  }, [supabase, draftId]);

  useEffect(() => {
    if (draftId && supabase) {
      fetchDraftData();

      async () => {
      const commissionerResponse = await fetch(`/api/yahoo/isCommissioner/${league?.league_key}`);
      const commissionerData = await commissionerResponse.json();
      setIsCommissioner(commissionerData.isCommissioner);
    }

      const draftSubscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, (payload) => {
          setDraft(prevDraft => ({ ...prevDraft, ...payload.new }));
          fetchDraftData(); // Refetch all data to ensure consistency
        })
        .subscribe();

      const picksSubscription = supabase
        .channel('picks_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, () => {
          fetchDraftData(); // Refetch all data to ensure consistency
        })
        .subscribe();

      return () => {
        supabase.removeChannel(draftSubscription);
        supabase.removeChannel(picksSubscription);
      };
    }
  }, [draftId, supabase, fetchDraftData]);

  const isCurrentUserPick = currentPick?.team_key === team?.team_key;

  const handleSubmitPick = async () => {
    setIsPickSubmitting(true);
    if (!selectedPlayer || !currentPick || !draft) {
      toast.error("Unable to submit pick. Please try again.");
      setIsPickSubmitting(false);
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
      setIsPickSubmitting(false);
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
      setIsPickSubmitting(false);
    }
  };

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={league} draft={draft} />
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/4 p-2 overflow-hidden flex flex-col">
          <PlayersList
            leagueKey={draft?.league_id || ''}
            draftId={draftId}
            onPlayerSelect={setSelectedPlayer}
          />
        </div>
        
        <div className="w-1/2 p-2 overflow-auto flex flex-col gap-y-4">
          <DraftStatus
            draft={draft}
            leagueSettings={leagueSettings}
            teams={teams}
            team={team}
          />
          <SubmitPickButton
            isCurrentUserPick={isCurrentUserPick}
            selectedPlayer={selectedPlayer}
            currentPick={currentPick}
            onSubmitPick={handleSubmitPick}
            isPickSubmitting={isPickSubmitting}
          />
          <PlayerDetails 
            player={selectedPlayer} 
          />
        </div>

        <div className="w-1/4 p-2 overflow-hidden flex flex-col">
          <DraftedPlayers
            leagueKey={draft?.league_id || ''}
            draftId={draftId}
            leagueSettings={leagueSettings}
            teamKey={team?.team_key}
          />
        </div>
      </div>
    </div>
  );
};

export default DraftPage;