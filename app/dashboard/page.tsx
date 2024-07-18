// ./app/dashboard/page.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Profile from '@/components/Profile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LeagueList from '@/components/LeagueList';
import TeamCard from '@/components/TeamCard';
import TeamOrder from '@/components/TeamOrder';
import LeagueSettingsCard from '@/components/LeagueSettingsCard';
import { League, Team, LeagueSettings } from '@/lib/types';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState("leagues");
  const [selectedLeagueKey, setSelectedLeagueKey] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<Team>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    const loadLeagues = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/yahoo/leagues');
        if (!response.ok) {
          throw new Error('Failed to fetch leagues');
        }
        const fetchedLeagues = await response.json();
        setLeagues(fetchedLeagues);
      } catch (error) {
        console.error("Failed to fetch leagues:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeagues();
  }, []);

  const handleLeagueClick = async (leagueKey: string) => {
    setSelectedLeagueKey(leagueKey);
    setActiveTab("drafts");
    setIsTeamsLoading(true);
    setIsSettingsLoading(true);

    try {
      const teamResponse = await fetch(`/api/yahoo/teamsForPlayer/${leagueKey}`);
      if (teamResponse.ok) {
        const teamData: Team = await teamResponse.json();
        setTeam(teamData);
      }
      const commissionerResponse = await fetch(`/api/yahoo/isCommissioner/${leagueKey}`);
      if (commissionerResponse.ok) {
        const { isCommissioner } = await commissionerResponse.json();
        setIsCommissioner(isCommissioner);
      }
      const teamsResponse = await fetch(`/api/yahoo/teams/${leagueKey}`);
      if (teamsResponse.ok) {
        const teamsData: Team[] = await teamsResponse.json();
        setTeams(teamsData);
      }
      const settingsResponse = await fetch(`/api/yahoo/leagueSettings/${leagueKey}`);
      if (settingsResponse.ok) {
        const settingsData: LeagueSettings = await settingsResponse.json();
        setLeagueSettings(settingsData);
      }
      const draftsResponse = await fetch(`/api/yahoo/drafts/${leagueKey}`);
      if (draftsResponse.ok) {
        const draftsData = await draftsResponse.json();
        setDrafts(draftsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsTeamsLoading(false);
      setIsSettingsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "leagues") {
      setSelectedLeagueKey(null);
      setIsCommissioner(false);
      setLeagueSettings(null);
    }
    setActiveTab(value);
  };

  const handleCreateDraft = async (orderedTeams: Team[]) => {
    setIsCreatingDraft(true);
    try {
      const response = await fetch('/api/yahoo/createDraft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueKey: selectedLeagueKey,
          draftName,
          orderedTeams: orderedTeams // Sending the full team objects
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create draft');
      }

      const { draftId, importJobId } = await response.json();
      setIsDialogOpen(false);
      setDraftName(''); // Clear the draft name input

      // Start polling for import progress
      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`/api/yahoo/createDraft?jobId=${importJobId}`);
        const { status, progress } = await progressResponse.json();
        setImportProgress(progress);

        if (status === 'complete') {
          clearInterval(pollInterval);
          setIsCreatingDraft(false);
          // Refresh drafts list
          const draftsResponse = await fetch(`/api/yahoo/drafts/${selectedLeagueKey}`);
          if (draftsResponse.ok) {
            const draftsData = await draftsResponse.json();
            setDrafts(draftsData);
          }
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create draft:', error);
      alert(error.message); // Display the error message to the user
      setIsCreatingDraft(false);
    }
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
          <TabsTrigger value="drafts" disabled={!selectedLeagueKey}>
            Drafts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leagues">
          {isLoading ? (
            <p className="text-center text-gray-500 mt-4">Loading leagues...</p>
          ) : (
            <LeagueList leagues={leagues} onLeagueClick={handleLeagueClick} />
          )}
        </TabsContent>
        <TabsContent value="drafts">
          {selectedLeagueKey ? (
            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">Drafts for League</h2>
              <p>Selected League Key: {selectedLeagueKey}</p>
              {team && <TeamCard team={team} />}
              <LeagueSettingsCard settings={leagueSettings} isLoading={isSettingsLoading} />
              {isCommissioner && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="mt-4" 
                      disabled={isTeamsLoading || teams.length === 0 || isCreatingDraft}
                    >
                      {isTeamsLoading ? 'Loading teams...' : 'Create a draft'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Create Draft Order</DialogTitle>
                      <DialogDescription>
                        Drag and drop teams to set the draft order.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[calc(80vh-120px)] overflow-y-auto pr-4">
                      <Input
                        placeholder="Draft Name"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="mb-4"
                      />
                      <TeamOrder teams={teams} onSubmit={handleCreateDraft} />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {isCreatingDraft && (
                <div className="mt-4">
                  <p>Creating draft and importing players...</p>
                  <Progress value={importProgress} className="w-full mt-2" />
                </div>
              )}
              <h3 className="text-xl font-bold mt-8 mb-4">Existing Drafts</h3>
              {drafts.length > 0 ? (
                <ul>
                  {drafts.map((draft) => (
                    <li key={draft.id} className="mb-2">
                      <span className="font-semibold">{draft.name}</span> - {draft.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No drafts created yet.</p>
              )}
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
