 // ./app/dashboard/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ChevronDown, Trash2, Settings } from "lucide-react";
import Link from 'next/link';
import Profile from '@/components/Profile';
import AppHeader from '@/components/AppHeader';
import CreateDraftDialog from '@/components/CreateDraftDialog';
import { League } from '@/lib/types/league.types';
import { Team, getTeamLogoUrl } from '@/lib/types/team.types';
import { LeagueSettings, parseRosterPositions, parseStatCategories } from '@/lib/types/league-settings.types';
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
  const [league, setLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCommissioner, setIsCommissioner] = useState<boolean>(false);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    const loadLeague = async () => {
      setIsLoading(true);
      try {
        const leagueResponse = await fetch('/api/db/league');
        if (!leagueResponse.ok) {
          throw new Error('Failed to fetch league');
        }
        const leagueData: League = await leagueResponse.json();
        setLeague(leagueData);

        const [commissionerResponse, teamsResponse, settingsResponse, draftsResponse] = await Promise.all([
          fetch(`/api/db/league/${leagueData.id}/isCommissioner`),
          fetch(`/api/db/league/${leagueData.id}/teams`),
          fetch(`/api/db/league/${leagueData.id}/settings`),
          fetch(`/api/db/league/${leagueData.id}/drafts`),
        ]);

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
        console.error("Failed to fetch league data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeague();
  }, []);

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
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => handleDraftClick(draft.id.toString())}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle size="sm">{draft.name}</CardTitle>
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

  const renderTeamList = (teams: Team[]) => (
    <Table>
      <TableBody>
        {teams.map((team) => {
          const logoUrl = getTeamLogoUrl(team);

          return (
            <TableRow key={team.id}>
              <TableCell className="flex items-center space-x-2">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={`${team.name} logo`}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-xs">{team.name.charAt(0)}</span>
                        </div>
                      )}
                      <span>{team.name}</span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <h3 className="font-semibold mb-2">Team Manager</h3>
                    <div className="space-y-2">
                      {(team.members || []).map((member, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <img
                            src={member.avatar_url || ''}
                            alt={member.display_name || member.email}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="font-semibold">{member.display_name || member.email}</p>
                            <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                      ))}
                      {(!team.members || team.members.length === 0) && (
                        <p className="text-sm text-muted-foreground">No manager assigned</p>
                      )}
                    </div>
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
              <span className="ml-2 text-sm text-muted-foreground">({pos.roster_position.position_type})</span>
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
    <>
      <AppHeader
        left={<span className="font-bold truncate">Dashboard</span>}
        right={
          <>
            {isCommissioner && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  League Settings
                </Link>
              </Button>
            )}
            <Profile />
          </>
        }
      />
      <div className="container mx-auto p-4">
      {isLoading || !league ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              {league.logo_url && (
                <img
                  src={league.logo_url}
                  alt={league.name}
                  className="w-16 h-16 rounded"
                />
              )}
              <CardTitle>{league.name}</CardTitle>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Drafts</h2>
                {isCommissioner && (
                  <CreateDraftDialog
                    leagueId={league.id}
                    teams={teams}
                    onDraftCreated={(updatedDrafts: Draft[]) => {
                      setDrafts(updatedDrafts);
                      toast.success("Draft created successfully");
                    }}
                    leagueSettings={leagueSettings}
                  />
                )}
              </div>
              <div className="space-y-3">
                {renderDraftCards()}
              </div>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle size="sm">League Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Number of Teams:</strong> <Badge>{league.num_teams ?? teams.length}</Badge></p>
                    {leagueSettings?.scoring_type && (
                      <p><strong>Scoring Type:</strong> <Badge>{leagueSettings.scoring_type}</Badge></p>
                    )}
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle size="sm">League Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {leagueSettings ? (
                    <div className="space-y-2">
                      <p><strong>Draft Type:</strong> <Badge>{leagueSettings.draft_type}</Badge></p>
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
                    <p>
                      No league settings configured yet.
                      {isCommissioner && (
                        <> <Link href="/dashboard/settings" className="underline">Set them up</Link>.</>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default DashboardPage;
