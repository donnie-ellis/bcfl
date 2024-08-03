'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import Profile from '@/components/Profile';
import { League, Draft, LeagueSettings, Player, Team, Pick } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import RoundSquares from '@/components/RoundSquares';
import DraftList from '@/components/DraftList';
import CurrentPickDetails from '@/components/CurrentPickDetails';
import { toast } from "sonner";
import { RealtimeChannel } from '@supabase/supabase-js';

const KioskPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [league, setLeague] = useState<League | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPick, setCurrentPick] = useState<Pick | null>(null);

  const fetchDraftData = useCallback(async () => {
    if (!supabase) return;

    try {
      // Step 1: Fetch draft data
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (draftError) throw draftError;

      // Step 2: Fetch picks data
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          *,
          player:players (*),
          team:teams (*)
        `)
        .eq('draft_id', draftId)
        .order('total_pick_number', { ascending: true });

      if (picksError) throw picksError;

      setDraft({ ...draftData, picks: picksData });

      const leagueKey = draftData.league_id;

      const [leagueResponse, settingsResponse, teamsResponse, currentPickResponse] = await Promise.all([
        fetch(`/api/db/league/${leagueKey}`),
        fetch(`/api/db/league/${leagueKey}/settings`),
        fetch(`/api/yahoo/league/${leagueKey}/teams`),
        fetch(`/api/db/draft/${draftId}/pick`)
      ]);

      if (!leagueResponse.ok || !settingsResponse.ok || !teamsResponse.ok || !currentPickResponse.ok) {
        throw new Error('Error fetching data');
      }
      
      const [leagueData, settingsData, teamsData, currentPickData] = await Promise.all([
        leagueResponse.json(),
        settingsResponse.json(),
        teamsResponse.json(),
        currentPickResponse.json()
      ]);

      setLeague(leagueData);
      setLeagueSettings(settingsData);
      setTeams(teamsData);
      setCurrentPick(currentPickData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch draft data. Please try again.");
    }
  }, [supabase, draftId]);

  useEffect(() => {
    fetchDraftData();

    let draftSubscription: RealtimeChannel;
    let picksSubscription: RealtimeChannel;

    if (supabase) {
      draftSubscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, (payload) => {
          setDraft(prevDraft => ({ ...prevDraft, ...payload.new }));
          fetchDraftData();
        })
        .subscribe();

      picksSubscription = supabase
        .channel('picks_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'picks', 
          filter: `draft_id=eq.${draftId}` 
        }, () => {
          fetchDraftData();
        })
        .subscribe();
    }

    return () => {
      if (supabase) {
        supabase.removeChannel(draftSubscription);
        supabase.removeChannel(picksSubscription);
      }
    };
  }, [supabase, draftId, fetchDraftData]);

  const handleSubmitPick = async (player: Player) => {
    if (!currentPick || !draft) {
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
          playerId: player.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit pick');
      }

      toast.success(`${player.full_name} has been drafted!`);
      fetchDraftData(); // Refetch data to update the draft state
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
    }
  };

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  const currentTeamKey = currentPick ? currentPick.team_key : '';
  const currentTeam = teams.find(team => team.team_key === currentTeamKey);
  const previousPick = draft.picks.find(pick => pick.total_pick_number === draft.current_pick - 1);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 bg-background">
        <h1 className="text-2xl font-bold flex gap-4">
          <Avatar className='h-12 w-12'>
            <AvatarFallback>{league?.name}</AvatarFallback>
            <AvatarImage src={league?.logo_url} alt={league?.name} />
          </Avatar>
          {`${league?.name} ${draft?.name} Draft - Kiosk Mode`}
        </h1>
        <Profile />
      </div>

      <div className="flex-none w-full">
        {draft && leagueSettings && (
          <RoundSquares
            draft={draft}
            leagueSettings={leagueSettings}
          />
        )}
      </div>

      <div className="flex-grow overflow-hidden flex">
        <div className="w-1/2 p-4">
          {draft && currentTeamKey && (
            <DraftList
              draft={draft}
              currentTeamKey={currentTeamKey}
            />
          )}
        </div>
        <div className="w-1/2 p-4">
          {currentTeam && currentPick && (
            <CurrentPickDetails
              currentTeam={currentTeam}
              currentPick={currentPick}
              previousPick={previousPick as Pick & { player: Player } | null}
              leagueKey={league.league_key}
              draftId={draftId}
              leagueSettings={leagueSettings}
              onSubmitPick={handleSubmitPick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskPage;