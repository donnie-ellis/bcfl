// ./app/draft/[draftId]/kiosk/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import Profile from '@/components/Profile';
import { League, Draft, LeagueSettings, Player, Team, Pick } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import RoundSquares from '@/components/RoundSquares';
import DraftList from '@/components/DraftList';
import { toast } from "sonner";

const KioskPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [league, setLeague] = useState<League | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPick, setCurrentPick] = useState<Pick | null>(null);
  const [isMounted, setIsMounted] = useState(true);

  const fetchDraftData = async () => {
    if (!supabase || !isMounted) return;
  
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
  
      if (isMounted) {
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
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (isMounted) {
        toast.error("Failed to fetch draft data. Please try again.");
      }
    }
  };  
  
  useEffect(() => {
    setIsMounted(true);

    const fetchData = async () => {
      if (!supabase || !isMounted) return;

      try {
        await fetchDraftData();
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          toast.error("Failed to fetch draft data. Please try again.");
        }
      }
    };

    if (draftId && supabase) {
      fetchData();

      const draftSubscription = supabase
        .channel('draft_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drafts', 
          filter: `id=eq.${draftId}` 
        }, (payload) => {
          if (isMounted) {
            setDraft(prevDraft => ({ ...prevDraft, ...payload.new }));
            fetchData();
          }
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
          if (isMounted) {
            fetchData();
          }
        })
        .subscribe();

      return () => {
        setIsMounted(false);
        supabase.removeChannel(draftSubscription);
        supabase.removeChannel(picksSubscription);
      };
    }
  }, [draftId, supabase]);

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  const currentTeamKey = currentPick ? currentPick.team_key : '';

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

      <div className="flex-grow overflow-hidden">
        {draft && currentTeamKey && (
          <DraftList
            draft={draft}
            currentTeamKey={currentTeamKey}
          />
        )}
      </div>
    </div>
  );
};

export default KioskPage;