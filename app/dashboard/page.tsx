'use client'
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeagueList from '@/components/LeagueList';
import TeamCard from '@/components/TeamCard';
import { League, Team } from '@/lib/types';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState("leagues");
  const [selectedLeagueKey, setSelectedLeagueKey] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<Team>();

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
        // Optionally, set an error state here
      } finally {
        setIsLoading(false);
      }
    };
    loadLeagues();
  }, []);

  const handleLeagueClick = async (leagueKey: string) => {
    setSelectedLeagueKey(leagueKey);
    setActiveTab("drafts");

    const response = await fetch(`/api/yahoo/teamsForPlayer/${leagueKey}`);
    if (response.ok) {
        const team: Team = await response.json();
        setTeam(team);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "leagues") {
      setSelectedLeagueKey(null);
    }
    setActiveTab(value);
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