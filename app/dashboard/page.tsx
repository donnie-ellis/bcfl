'use client'
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { League, Team } from '@/lib/types';

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
        console.log("Fetched teams:", teamsData);
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Failed to fetch team or teams data:", error);
    } finally {
      setIsTeamsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "leagues") {
      setSelectedLeagueKey(null);
      setIsCommissioner(false);
    }
    setActiveTab(value);
  };

  const handleCreateDraft = (orderedTeams: Team[]) => {
    console.log("League Key:", selectedLeagueKey);
    console.log("Draft Order:", orderedTeams.map(team => ({
      team_id: team.team_id,
      name: team.name,
      managers: team.managers.map(manager => manager.nickname)
    })));
    
    // Here you can add logic to send this data to your backend API
    // For example:
    // createDraftOrder(selectedLeagueKey, orderedTeams);

    setIsDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-4">
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
              {isCommissioner && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="mt-4" 
                      disabled={isTeamsLoading || teams.length === 0}
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
                      <TeamOrder teams={teams} onSubmit={handleCreateDraft} />
                    </div>
                  </DialogContent>
                </Dialog>
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