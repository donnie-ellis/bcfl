// ./app/dashboard/page.tsx
// This is the main dashboard page for the application, which includes tabs for leagues and drafts.
// It fetches and displays leagues, allows users to select a league, and shows related drafts and settings.

'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

import { League, Team, LeagueSettings, Draft } from '@/lib/types';
import CreateDraftDialog from '@/components/CreateDraftDialog';
import DraftCardList from '@/components/DraftCardList';
import LeagueInfoCard from '@/components/LeagueInfoCard';
import LeagueList from '@/components/LeagueList';
import LeagueSettingsCard from '@/components/LeagueSettingsCard';
import LeagueHeaderCard from '@/components/LeagueHeaderCard';
import Profile from '@/components/Profile';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("leagues");
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCommissioner, setIsCommissioner] = useState<boolean>(false);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLeagueDataLoading, setIsLeagueDataLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadLeagues = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/yahoo/user/leagues');
        if (!response.ok) {
          throw new Error('Failed to fetch leagues');
        }
        const fetchedLeagues: League[] = await response.json();
        setLeagues(fetchedLeagues);
      } catch (error) {
        console.error("Failed to fetch leagues:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeagues();
  }, []);

  const handleLeagueClick = async (league: League) => {
    setSelectedLeague(league);
    setActiveTab("drafts");
    setIsLeagueDataLoading(true);

    try {
      const [teamResponse, commissionerResponse, teamsResponse, settingsResponse, draftsResponse] = await Promise.all([
        fetch(`/api/yahoo/user/league/${league.league_key}/team`),
        fetch(`/api/yahoo/user/league/${league.league_key}/isCommissioner`),
        fetch(`/api/yahoo/league/${league.league_key}/teams`),
        fetch(`/api/yahoo/league/${league.league_key}/leagueSettings`),
        fetch(`/api/db/league/${league.league_key}/drafts`)
      ]);

      if (teamResponse.ok) {
        const teamData: Team = await teamResponse.json();
      }

      if (commissionerResponse.ok) {
        const { isCommissioner } = await commissionerResponse.json();
        setIsCommissioner(isCommissioner);
      }
      if (teamsResponse.ok) {
        const teamsData: Team[] = await teamsResponse.json();
        setTeams(teamsData);
      }
      if (settingsResponse.ok) {
        const settingsData: LeagueSettings = await settingsResponse.json();
        setLeagueSettings(settingsData);
      }
      if (draftsResponse.ok) {
        const draftsData: Draft[] = await draftsResponse.json();
        setDrafts(draftsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLeagueDataLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "leagues") {
      setSelectedLeague(null);
      setIsCommissioner(false);
      setLeagueSettings(null);
    }
    setActiveTab(value);
  };

  const handleDeleteDraft = async (draftId: string) => {
    const toastId = toast.loading("Deleting draft...");
    try {
      const response = await fetch(`/api/db/draft/${draftId}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete draft');
      }
  
      setDrafts(drafts.filter(draft => draft.id.toString() !== draftId));
      toast.success("Draft deleted successfully", { id: toastId });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error("Failed to delete draft. Please try again.", { id: toastId });
    }
  };
  
  const handleDraftClick = (draftId: string) => {
    router.push(`/draft/${draftId}`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Profile />
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leagues">Leagues</TabsTrigger>
          <TabsTrigger value="drafts" disabled={!selectedLeague}>
            Drafts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leagues">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <LeagueList leagues={leagues} onLeagueClick={handleLeagueClick} />
          )}
        </TabsContent>
        <TabsContent value="drafts">
          {selectedLeague ? (
            <div className="space-y-4">
              <LeagueHeaderCard league={selectedLeague} />              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Drafts</CardTitle>
                    {isCommissioner && (
                      <CreateDraftDialog 
                        leagueKey={selectedLeague.league_key} 
                        teams={teams} 
                        onDraftCreated={(updatedDrafts: Draft[]) => {
                          setDrafts(updatedDrafts);
                          toast.success("Draft created successfully");
                        }}
                        leagueSettings={leagueSettings}
                      />
                    )}
                  </CardHeader>
                  <CardContent>
                    {isLeagueDataLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <DraftCardList 
                        drafts={drafts} 
                        isCommissioner={isCommissioner} 
                        handleDraftClick={handleDraftClick} 
                        handleDeleteDraft={handleDeleteDraft} />
                    )}
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <LeagueInfoCard 
                    selectedLeague={selectedLeague} 
                    teams={teams} 
                    isLoading={isLeagueDataLoading}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>League Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeagueSettingsCard leagueSettings={leagueSettings} isLeagueDataLoading={isLeagueDataLoading} />  
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-4">
              Please select a league first.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;
