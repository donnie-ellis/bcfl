// ./app/draft/[draftId]/board/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { League, Draft, LeagueSettings, Team, Pick, Player } from '@/lib/types';
import DraftHeader from '@/components/DraftHeader';
import RoundSquares from '@/components/RoundSquares';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DraftBoardPage: React.FC = () => {
  const params = useParams();
  const draftId = params.draftId as string;
  const supabase = useSupabaseClient();

  const [league, setLeague] = useState<League | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);

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

      const [leagueResponse, settingsResponse] = await Promise.all([
        fetch(`/api/db/league/${leagueKey}`),
        fetch(`/api/db/league/${leagueKey}/settings`),
      ]);

      if (!leagueResponse.ok || !settingsResponse.ok) {
        throw new Error('Error fetching data');
      }
      
      const [leagueData, settingsData] = await Promise.all([
        leagueResponse.json(),
        settingsResponse.json(),
      ]);

      setLeague(leagueData);
      setLeagueSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch draft data. Please try again.");
    }
  }, [supabase, draftId]);

  useEffect(() => {
    fetchDraftData();

    const subscription = supabase
      ?.channel('draft_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'picks', 
        filter: `draft_id=eq.${draftId}` 
      }, () => {
        fetchDraftData();
      })
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, draftId, fetchDraftData]);

  if (!league || !draft || !leagueSettings) {
    return <div>Loading...</div>;
  }

  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-screen">
      <DraftHeader league={league} draft={draft} />
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-8">
          {rounds.map((round) => (
          <Card key={round}>
            <CardHeader>
              <CardTitle>
                Round {round}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoundSquares
                    draft={{
                    ...draft,
                    picks: draft.picks.filter(
                        (pick) => pick.round_number === round
                    ),
                    }}
                    leagueSettings={leagueSettings}
                    currentRoundOnly={false}
                />
            </CardContent>
          </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DraftBoardPage;