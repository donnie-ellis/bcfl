 // ./app/dashboard/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { ChevronDown, Trash2 } from "lucide-react";
import Profile from '@/components/Profile';
import LeagueList from '@/components/LeagueList';
import CreateDraftDialog from '@/components/CreateDraftDialog';
import { League } from '@/lib/types/league.types';
import { Team, TeamLogo, parseTeamLogos } from '@/lib/types/team.types';
import { LeagueSettings, parseRosterPositions, parseStatCategories, RosterPosition, StatCategory } from '@/lib/types/league-settings.types';
import { Manager } from '@/lib/types/manager.types';
import { Draft } from '@/lib/types/draft.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Json } from '@/lib/types/database.types';
import { toast } from 'sonner';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("leagues");
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [team, setTeam] = useState<Team | null>(null);
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

  const renderDraftCards = () => {
    if (drafts.length === 0) {
      return <p>No drafts created yet.</p>;
    }

    return drafts.map((draft) => (
      <Card 
        key={draft.id} 
        className="mb-4 cursor-pointer transition-shadow hover:shadow-lg"
        onClick={() => handleDraftClick(draft.id.toString())}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{draft.name}</CardTitle>
          {isCommissioner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete this draft?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the draft and all related data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteDraft(draft.id.toString())}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          <p>Start Time: {draft.created_at ? new Date(draft.created_at).toLocaleString() : 'N/A'}</p>
          <p>Last Update: {draft.updated_at ? new Date(draft.updated_at).toLocaleString() : 'N/A'}</p>
          <p>Current Pick: Team {draft.current_pick || 'N/A'}</p>
          <p>Picks Left: {draft.total_picks - (draft.current_pick || 0)}</p>
          <Progress 
            value={((draft.current_pick || 0) / draft.total_picks) * 100} 
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
            src={manager.image_url || ''}
            alt={manager.nickname || ''}
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
          const logos: TeamLogo[] = parseTeamLogos(team.team_logos);
          const logo = logos.find(l => l.size === 'large') || logos[0];
          
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
                    {renderManagerInfo(team.managers || [])}
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
  
  const renderRosterPositions = (positions: Json) => {
    const parsedPositions = parseRosterPositions(positions);
    return (
      <ul className="space-y-1">
        {parsedPositions.map((pos, index) => (
          <li key={index}>
            <Badge variant="outline">{pos.roster_position.position}</Badge>
            <span className="ml-2">{pos.roster_position.count}</span>
            {pos.roster_position.position_type && (
              <span className="ml-2 text-sm text-gray-500">({pos.roster_position.position_type})</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const renderStatCategories = (categories: Json) => {
    const parsedCategories = parseStatCategories(categories);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedCategories.map((cat, index) => {
            let displayValue = 'N/A';
            if (cat.value !== null && cat.value !== undefined) {
              if (cat.name.toLowerCase().includes('yards') || cat.name.toLowerCase().includes('yds')) {
                displayValue = `${Math.round(1 / cat.value)} "${cat.display_name}" = 1 point`;
              } else {
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
                      renderDraftCards()
                    )}
                  </CardContent>
                </Card>
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