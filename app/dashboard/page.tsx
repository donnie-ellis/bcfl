// ./app/dashboard/page.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { ChevronDown, ChevronUp } from "lucide-react";
import Profile from '@/components/Profile';
import LeagueList from '@/components/LeagueList';
import CreateDraftDialog from '@/components/CreateDraftDialog';
import { League, Team, LeagueSettings } from '@/lib/types';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState("leagues");
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLeagueDataLoading, setIsLeagueDataLoading] = useState(false);

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

  const handleLeagueClick = async (league: League) => {
    setSelectedLeague(league);
    setActiveTab("drafts");
    setIsLeagueDataLoading(true);

    try {
      const [teamResponse, commissionerResponse, teamsResponse, settingsResponse, draftsResponse] = await Promise.all([
        fetch(`/api/yahoo/teamsForPlayer/${league.league_key}`),
        fetch(`/api/yahoo/isCommissioner/${league.league_key}`),
        fetch(`/api/yahoo/teams/${league.league_key}`),
        fetch(`/api/yahoo/leagueSettings/${league.league_key}`),
        fetch(`/api/yahoo/drafts/${league.league_key}`)
      ]);

      if (teamResponse.ok) {
        const teamData: Team = await teamResponse.json();
        setTeam(teamData);
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
        const draftsData = await draftsResponse.json();
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

  const renderDraftCards = () => {
    if (drafts.length === 0) {
      return <p>No drafts created yet.</p>;
    }

    return drafts.map((draft) => (
      <Card key={draft.id} className="mb-4">
        <CardHeader>
          <CardTitle>{draft.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Start Time: {new Date(draft.created_at).toLocaleString()}</p>
          <p>Last Update: {new Date(draft.updated_at).toLocaleString()}</p>
          <p>Current Pick: Team {draft.current_pick}</p>
          <p>Picks Left: {draft.total_picks - draft.current_pick}</p>
          <Progress 
            value={(draft.current_pick / draft.total_picks) * 100} 
            className="mt-2"
          />
        </CardContent>
      </Card>
    ));
  };

  const renderManagerInfo = (managers: Manager[]) => (
    <div className="space-y-2">
      {managers.map((manager, index) => (
        <div key={index} className="flex items-center space-x-2">
          <img
            src={manager.image_url}
            alt={manager.nickname}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="font-semibold">{manager.nickname}</p>
            <p className="text-sm text-gray-500">
              {manager.felo_tier} (Score: {manager.felo_score})
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTeamList = (teams: Team[]) => (
    <Table>
      <TableBody>
        {teams.map((team) => {
          const logo = team.team_logos?.find(l => l.size === 'large') || team.team_logos?.[0];
          
          return (
            <TableRow key={team.team_key}>
              <TableCell className="flex items-center space-x-2">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      {logo ? (
                        <img 
                          src={logo.url} 
                          alt={`${team.name} logo`} 
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs">{team.name.charAt(0)}</span>
                        </div>
                      )}
                      <span>{team.name}</span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <h3 className="font-semibold mb-2">Team Managers</h3>
                    {renderManagerInfo(team.managers)}
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
  const renderRosterPositions = (positions: any[]) => (
    <ul className="space-y-1">
      {positions.map((pos, index) => (
        <li key={index}>
          <Badge variant="outline">{pos.position}</Badge>
          <span className="ml-2">{pos.count}</span>
        </li>
      ))}
    </ul>
  );

  const renderStatCategories = (categories: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((cat, index) => {
          let displayValue = 'N/A';
          if (cat.value !== null) {
            if (cat.name.toLowerCase().includes('yards') || cat.name.toLowerCase().includes('yds')) {
              // For yard-based categories
              displayValue = `${Math.round(1 / cat.value)} "${cat.display_name}" = 1 point`;
            } else {
              // For other categories
              displayValue = Math.round(cat.value).toString();
            }
          }
          return (
            <TableRow key={index}>
              <TableCell>{cat.display_name}</TableCell>
              <TableCell>{displayValue}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

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
              <Card>
                <CardHeader className="flex flex-row items-center space-x-4">
                  {selectedLeague.logo_url && (
                    <img 
                      src={selectedLeague.logo_url} 
                      alt={selectedLeague.name} 
                      className="w-16 h-16 rounded"
                    />
                  )}
                  <CardTitle>{selectedLeague.name}</CardTitle>
                </CardHeader>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Existing Drafts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLeagueDataLoading ? (
                        <Skeleton className="h-40 w-full" />
                      ) : (
                        renderDraftCards()
                      )}
                    </CardContent>
                  </Card>
                  
                  {isCommissioner && (
                    <CreateDraftDialog 
                      leagueKey={selectedLeague.league_key} 
                      teams={teams} 
                      onDraftCreated={(updatedDrafts) => setDrafts(updatedDrafts)}
                    />
                  )}
                </div>
                
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>League Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLeagueDataLoading ? (
                        <Skeleton className="h-40 w-full" />
                      ) : (
                        <div className="space-y-2">
                          <p><strong>Number of Teams:</strong> <Badge>{selectedLeague.num_teams}</Badge></p>
                          <p><strong>League Type:</strong> <Badge>{selectedLeague.league_type}</Badge></p>
                          <p><strong>Scoring Type:</strong> <Badge>{selectedLeague.scoring_type}</Badge></p>
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" className="flex items-center justify-between w-full">
                                <span>Teams</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {renderTeamList(teams)}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>League Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLeagueDataLoading ? (
                        <Skeleton className="h-40 w-full" />
                      ) : leagueSettings ? (
                        <div className="space-y-2">
                          <p><strong>Draft Type:</strong> <Badge>{leagueSettings.draft_type}</Badge></p>
                          <p><strong>Scoring Type:</strong> <Badge>{leagueSettings.scoring_type}</Badge></p>
                          <p><strong>Uses Playoff:</strong> <Badge>{leagueSettings.uses_playoff ? 'Yes' : 'No'}</Badge></p>
                          <p><strong>Waiver Rule:</strong> <Badge>{leagueSettings.waiver_rule}</Badge></p>
                          <p><strong>Uses FAAB:</strong> <Badge>{leagueSettings.uses_faab ? 'Yes' : 'No'}</Badge></p>
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" className="flex items-center justify-between w-full">
                                <span>Roster Positions</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {renderRosterPositions(leagueSettings.roster_positions)}
                            </CollapsibleContent>
                          </Collapsible>
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" className="flex items-center justify-between w-full">
                                <span>Scoring Categories</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {renderStatCategories(leagueSettings.stat_categories)}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ) : (
                        <p>No league settings available.</p>
                      )}
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