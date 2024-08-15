// ./app/draft/[draftId]/kiosk/page.tsx
'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings } from '@/lib/types/';
import { Pick, Player, Team } from '@/lib/types/';
import { PickWithPlayerAndTeam } from '@/lib/types/pick.types';
import RoundSquares from '@/components/RoundSquares';
import CurrentPickDetails from '@/components/CurrentPickDetails';
import { toast } from "sonner";
import DraftedPlayers from '@/components/DraftedPlayers';
import DraftHeader from '@/components/DraftHeader';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type MemoizedDraft = Omit<Draft, 'picks'> & { picks: PickWithPlayerAndTeam[] };

const KioskPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();
  const [isPickSubmitting, setIsPickSubmitting] = useState<boolean>(false);

  const [draftData, setDraftData] = useState<Draft | null>(null);
  const [leagueData, setLeagueData] = useState<League | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [currentPick, setCurrentPick] = useState<Pick | null>(null);
  const [playerData, setPlayerData] = useState<Player[] | null>(null);

  const isLoading = !draftData || !leagueData || !leagueSettings || !teams || !currentPick || !playerData;

  const fetchInitialData = useCallback(async () => {
    if (!supabase || !draftId) {
      console.error('Supabase client or draftId not available');
      toast.error('Unable to initialize data fetching');
      return;
    }
  
    try {
      console.log('Fetching draft data...');
      const { data: draft, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draftId)
        .single();
      
      if (draftError) throw draftError;
      console.log('Draft data:', draft);
  
      // Fetch picks separately
      console.log('Fetching picks data...');
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          *,
          player:players(*),
          team:teams(*)
        `)
        .eq('draft_id', draftId)
        .order('total_pick_number', { ascending: true });
  
      if (picksError) throw picksError;
      console.log('Picks data:', picksData);
  
      // Combine draft data with picks
      const draftWithPicks: Draft = {
        ...draft,
        picks: picksData
      };
      setDraftData(draftWithPicks);
  
      console.log('Fetching related data...');
      const [leagueResponse, settingsResponse, teamsResponse, currentPickResponse, playersResponse] = await Promise.all([
        supabase.from('leagues').select('*').eq('league_key', draft.league_id).single(),
        supabase.from('league_settings').select('*').eq('league_key', draft.league_id).single(),
        supabase.from('teams').select('*').eq('league_id', draft.league_id),
        supabase.from('picks').select('*').eq('draft_id', draftId).eq('total_pick_number', draft.current_pick).single(),
        supabase.from('players').select('*')
      ]);
  
      console.log('League data:', leagueResponse.data);
      console.log('Settings data:', settingsResponse.data);
      console.log('Teams data:', teamsResponse.data);
      console.log('Current pick data:', currentPickResponse.data);
      console.log('Players data:', playersResponse.data);
  
      if (leagueResponse.data) setLeagueData(leagueResponse.data);
      if (settingsResponse.data) setLeagueSettings(settingsResponse.data);
      if (teamsResponse.data) setTeams(teamsResponse.data);
      if (currentPickResponse.data) setCurrentPick(currentPickResponse.data);
      if (playersResponse.data) setPlayerData(playersResponse.data);
  
      if (leagueResponse.error) console.error('League error:', leagueResponse.error);
      if (settingsResponse.error) console.error('Settings error:', settingsResponse.error);
      if (teamsResponse.error) console.error('Teams error:', teamsResponse.error);
      if (currentPickResponse.error) console.error('Current pick error:', currentPickResponse.error);
      if (playersResponse.error) console.error('Players error:', playersResponse.error);
  
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load draft data. Please try refreshing the page.');
    }
  }, [supabase, draftId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!supabase || !draftId) return;

    const draftSubscription = supabase
  .channel(`draft_${draftId}`)
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'drafts', 
    filter: `id=eq.${draftId}` 
  }, async (payload) => {
    setDraftData((prevDraft) => prevDraft ? { ...prevDraft, ...payload.new } : null);

    // If the current_pick has changed, fetch the new current pick
    if (payload.new.current_pick !== draftData?.current_pick) {
      const { data: newCurrentPick, error } = await supabase
        .from('picks')
        .select('*')
        .eq('draft_id', draftId)
        .eq('total_pick_number', payload.new.current_pick)
        .single();

      if (error) {
        console.error('Error fetching new current pick:', error);
      } else {
        setCurrentPick(newCurrentPick);
      }
    }
  })
  .subscribe();

  const picksSubscription = supabase
  .channel(`picks_${draftId}`)
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'picks', 
    filter: `draft_id=eq.${draftId}` 
  }, async (payload) => {
    // Fetch the updated pick with player and team information
    const { data: updatedPick, error } = await supabase
      .from('picks')
      .select(`
        *,
        player:players(*),
        team:teams(*)
      `)
      .eq('id', payload.new.id)
      .single();

    if (error) {
      console.error('Error fetching updated pick:', error);
      return;
    }

    setDraftData((prevDraft) => {
      if (!prevDraft) return prevDraft;
      const updatedPicks = prevDraft.picks.map(pick => 
        pick.id === updatedPick.id ? updatedPick : pick
      );
      return { ...prevDraft, picks: updatedPicks };
    });

    if (updatedPick.total_pick_number === draftData?.current_pick) {
      setCurrentPick(updatedPick);
    }
  })
  .subscribe();

    return () => {
      supabase.removeChannel(draftSubscription);
      supabase.removeChannel(picksSubscription);
    };
  }, [supabase, draftId, draftData]);

  const memoizedDraft = useMemo<MemoizedDraft | undefined>(() => {
    if (draftData && playerData && teams) {
      return {
        ...draftData,
        picks: draftData.picks.map(pick => ({
          ...pick,
          player: pick.player || null,
          team: pick.team || null
        })) as PickWithPlayerAndTeam[]
      };
    }
    return undefined;
  }, [draftData, playerData, teams]);

  const memoizedPicks = useMemo<PickWithPlayerAndTeam[]>(() => memoizedDraft?.picks || [], [memoizedDraft?.picks]);

  useEffect(() => {
    if (memoizedDraft && memoizedDraft.status === 'completed') {
      router.push(`/draft/${draftId}/board`);
    }
  }, [memoizedDraft, draftId, router]);

  const handleSubmitPick = async (player: Player) => {
    if (!supabase) throw Error('Supabase is not initialized');
    setIsPickSubmitting(true);
    if (!currentPick || !memoizedDraft) {
      toast.error("Unable to submit pick. Please try again.");
      setIsPickSubmitting(false);
      return;
    }
  
    try {
      // Start a transaction
      const { error: beginError } = await supabase.rpc('begin_transaction');
      if (beginError) throw beginError;
  
      // Update the pick
      const { data: updatedPick, error: pickError } = await supabase
        .from('picks')
        .update({ 
          player_id: player.id, 
          is_picked: true 
        })
        .eq('id', currentPick.id)
        .select()
        .single();
  
      if (pickError) throw pickError;
  
      // Calculate the next pick number
      const nextPickNumber = memoizedDraft.current_pick || 0 + 1;
  
      // Update the draft's current_pick
      const { error: draftError } = await supabase
        .from('drafts')
        .update({ current_pick: nextPickNumber })
        .eq('id', memoizedDraft.id);
  
      if (draftError) throw draftError;
  
      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;
  
      toast.success(`${player.full_name} has been drafted!`);
  
      // Update local state
      setDraftData(prevDraft => {
        if (!prevDraft) return prevDraft;
        return {
          ...prevDraft,
          current_pick: nextPickNumber,
          picks: prevDraft.picks.map(pick => 
            pick.id === updatedPick.id ? updatedPick : pick
          )
        };
      });
  
      // Fetch the next pick
      const { data: nextPick, error: nextPickError } = await supabase
        .from('picks')
        .select('*')
        .eq('draft_id', memoizedDraft.id)
        .eq('total_pick_number', nextPickNumber)
        .single();
  
      if (nextPickError) throw nextPickError;
  
      setCurrentPick(nextPick);
  
    } catch (error) {
      console.error('Error submitting pick:', error);
      toast.error("Failed to submit pick. Please try again.");
      // Rollback the transaction if there was an error
      await supabase.rpc('rollback_transaction');
    } finally {
      setIsPickSubmitting(false);
    }
  };

  const MemoizedDraftedPlayers = useMemo(() => (
    memoizedDraft && leagueSettings && currentPick ? (
      <DraftedPlayers
        picks={memoizedPicks}
        teamKey={currentPick.team_key}
        teamName={teams?.find(team => team.team_key === currentPick.team_key)?.name}
      />
    ) : null
  ), [memoizedDraft, leagueSettings, currentPick, memoizedPicks, teams]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (memoizedDraft?.status === 'completed') {
    return (
      <Alert>
        <AlertTitle>Draft Completed</AlertTitle>
        <AlertDescription>
          The draft has been completed. You will be redirected to the draft board shortly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {leagueData && memoizedDraft && (
        <DraftHeader league={leagueData} draft={memoizedDraft} />
      )}
      <div className="flex-none w-full">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Current Round</h2>
          {memoizedDraft && leagueSettings && teams && (
            <RoundSquares
              draft={memoizedDraft}
              leagueSettings={leagueSettings}
              currentRoundOnly={true}
              isLoading={isLoading}
              teams={teams}
            />
          )}
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex">
        <div className="w-1/2 p-4">
          {MemoizedDraftedPlayers}
        </div>
        <div className="w-1/2 p-4">
          {currentPick && leagueSettings && teams && memoizedDraft && (
            <CurrentPickDetails
              currentTeam={teams.find(team => team.team_key === currentPick.team_key)}
              currentPick={currentPick}
              previousPick={memoizedPicks.find(pick => pick.total_pick_number === (memoizedDraft.current_pick || 0) - 1) || null}
              leagueKey={leagueData?.league_key || ''}
              draftId={draftId}
              leagueSettings={leagueSettings}
              onSubmitPick={handleSubmitPick}
              isPickSubmitting={isPickSubmitting}
              draft={memoizedDraft}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskPage;