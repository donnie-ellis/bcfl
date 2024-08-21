// ./components/CreateDraftDialog.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LeagueSettings, parseRosterPositions, Team } from '@/lib/types/';
import { League, Manager } from '@/lib/yahoo.types';
import TeamCard from './TeamCard';
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { Reorder } from 'framer-motion';

interface CreateDraftDialogProps {
  leagueKey: string;
  teams: Team[];
  onDraftCreated: (drafts: any) => void;
  leagueSettings: LeagueSettings | null;
}

const CreateDraftDialog: React.FC<CreateDraftDialogProps> = ({ leagueKey, teams, onDraftCreated, leagueSettings }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [orderedTeams, setOrderedTeams] = useState<Team[]>([]);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [adpProgress, setAdpProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setOrderedTeams(teams);
  }, [teams]);

  const fetchYahooData = async () => {
    try {
      const [leagueResponse, settingsResponse, managersResponse] = await Promise.all([
        fetch(`/api/yahoo/league/${leagueKey}`),
        fetch(`/api/yahoo/league/${leagueKey}/leagueSettings`),
        fetch(`/api/yahoo/league/${leagueKey}/managers`)
      ]);

      if (!leagueResponse.ok || !settingsResponse.ok || !managersResponse.ok) {
        throw new Error('Failed to fetch Yahoo data');
      }

      const league: League = await leagueResponse.json();
      const fetchedLeagueSettings: LeagueSettings = await settingsResponse.json();
      const managers: Manager[] = await managersResponse.json();

      return { league, leagueSettings: fetchedLeagueSettings, managers };
    } catch (error) {
      console.error('Error fetching Yahoo data:', error);
      throw error;
    }
  };

  const upsertData = async (league: League, leagueSettings: LeagueSettings, managers: Manager[]) => {
    try {
      // Upsert league
      const leagueResponse = await fetch(`/api/db/league/${leagueKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(league)
      });

      if (!leagueResponse.ok) throw new Error('Failed to upsert league');

      // Upsert league settings
      const settingsResponse = await fetch(`/api/db/league/${leagueKey}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leagueSettings)
      });

      if (!settingsResponse.ok) throw new Error('Failed to upsert league settings');

      // Upsert managers
      const managersResponse = await fetch(`/api/db/league/${leagueKey}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(managers)
      });

      if (!managersResponse.ok) throw new Error('Failed to upsert managers');
      
      // Upsert teams
      const teamsResponse = await fetch(`/api/db/league/${leagueKey}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teams)
      });

      if (!teamsResponse.ok) throw new Error('Failed to upsert teams');

    } catch (error) {
      console.error('Error upserting data:', error);
      throw error;
    }
  };

  const handleCreateDraft = async () => {
    if (!draftName.trim()) {
      toast.error('Please enter a draft name');
      return;
    }

    setIsCreatingDraft(true);
    const toastId = toast.loading("Creating draft...");

    try {
      toast.loading("Fetching Yahoo data...", { id: toastId });
      const yahooData = await fetchYahooData();

      toast.loading("Upserting data...", { id: toastId });
      await upsertData(yahooData.league, yahooData.leagueSettings, yahooData.managers);

      const draftOrder = orderedTeams.reduce((acc, team, index) => {
        acc[team.team_key] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      const orderedTeamsJson = orderedTeams.map(team => ({
        team_key: team.team_key,
        name: team.name
      }));

      const defaultRosterSize = 15;
      let rosterSize = defaultRosterSize;

      if (yahooData.leagueSettings && yahooData.leagueSettings.roster_positions) {
        const parsedRosterPositions = parseRosterPositions(yahooData.leagueSettings.roster_positions);
        rosterSize = parsedRosterPositions.reduce((sum, pos) => sum + pos.roster_position.count, 0);
      }

      const rounds = rosterSize;
      const totalPicks = rosterSize * teams.length;

      toast.loading("Creating draft in database...", { id: toastId });
      const response = await fetch('/api/db/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: JSON.stringify({
          leagueKey,
          draftName,
          rounds,
          totalPicks,
          draftOrder: JSON.stringify(draftOrder),
          orderedTeams: JSON.stringify(orderedTeamsJson),
          status: 'pending'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create draft');
      }

      const { draftId, importJobId } = await response.json();

      if (!draftId) {
        throw new Error('No draft ID returned from server');
      }

      toast.success("Draft created successfully. Importing players...", { id: toastId });

      // Start polling for import progress
      await pollJobProgress(importJobId, toastId, 'Importing players');

      // Start ADP update
      await startAdpUpdate(draftId, toastId);

      // Finalize draft creation
      await finalizeDraftCreation(draftId, toastId);
    } catch (error) {
      console.error('Failed to create draft:', error);
      toast.error("Failed to create draft. Please try again.", { id: toastId });
      setIsCreatingDraft(false);
    }
  };

  const pollJobProgress = async (jobId: string, toastId: string | number, message: string) => {
    return new Promise<void>((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/db/importJob/${jobId}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            }
          });
          if (!response.ok) {
            throw new Error('Failed to fetch job progress');
          }
          const { status, progress } = await response.json();

          if (status === 'complete') {
            clearInterval(pollInterval);
            toast.success(`${message} completed. Imported ${progress} players.`, { id: toastId });
            resolve();
          } else if (status === 'error') {
            clearInterval(pollInterval);
            throw new Error(`${message} failed`);
          } else {
            toast.loading(`${message}... ${progress} players imported`, { id: toastId });
            if (message === 'Importing players') {
              setImportProgress(progress);
            } else if (message === 'Updating ADP') {
              setAdpProgress(progress);
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error(`Error during ${message}:`, error);
          reject(error);
        }
      }, 2000);
    });
  };

  const startAdpUpdate = async (draftId: number, toastId: string | number) => {
    try {
      if (!leagueSettings) throw Error('League settings not found');
      
      const scoringType = leagueSettings.stat_categories && 
        Array.isArray(leagueSettings.stat_categories) &&
        leagueSettings.stat_categories.some(cat => 
          typeof cat === 'object' && cat !== null && 
          'name' in cat && cat.name === 'Rec' && 
          'value' in cat && typeof cat.value === 'number' && cat.value > 0
        ) ? 'ppr' : 'standard';

      const adpResponse = await fetch(`/api/db/draft/${draftId}/players/adp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId: leagueKey,
          scoringType,
          numTeams: teams.length,
        }),
      });

      if (!adpResponse.ok) {
        throw new Error('Failed to start ADP update');
      }

      const { jobId } = await adpResponse.json();

      // Poll for job progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/db/importJob/${jobId}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            }
          });
          if (!progressResponse.ok) {
            throw new Error('Failed to fetch ADP update progress');
          }
          const { status, progress } = await progressResponse.json();

          if (status === 'complete') {
            clearInterval(pollInterval);
            toast.success("ADP update completed", { id: toastId });
            finalizeDraftCreation(draftId, toastId);
          } else if (status === 'error') {
            clearInterval(pollInterval);
            throw new Error('ADP update failed');
          } else {
            toast.loading(`Updating ADP... ${progress}%`, { id: toastId });
            setAdpProgress(progress);
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error('Error during ADP update:', error);
          toast.error("ADP update encountered an error. Proceeding without ADP.", { id: toastId });
          finalizeDraftCreation(draftId, toastId);
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to update ADP:', error);
      toast.error("Failed to update ADP. Proceeding without ADP.", { id: toastId });
      finalizeDraftCreation(draftId, toastId);
    }
  };

  const finalizeDraftCreation = async (draftId: number, toastId: string | number) => {
    setIsCreatingDraft(false);
    setIsDialogOpen(false);
    setDraftName('');
    try {
      const draftsResponse = await fetch(`/api/db/league/${leagueKey}/drafts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      if (draftsResponse.ok) {
        const updatedDrafts = await draftsResponse.json();
        onDraftCreated(updatedDrafts);
      } else {
        console.error('Failed to fetch updated drafts');
      }
      toast.success("Draft creation completed. Redirecting to draft page...", { id: toastId });
      router.push(`/draft/${draftId}`);
    } catch (error) {
      console.error('Error finalizing draft creation:', error);
      toast.error("Error occurred while finalizing draft. Please check the dashboard.", { id: toastId });
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDraftName('');
    }
    setIsDialogOpen(open);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isCreatingDraft}>Create a new draft</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Draft Order</DialogTitle>
          <DialogDescription>
            Enter a draft name and drag and drop teams to set the draft order.
          </DialogDescription>
        </DialogHeader>
        <div className={`mt-4 max-h-[calc(80vh-120px)] overflow-y-auto pr-4 ${isCreatingDraft ? 'pointer-events-none' : ''}`}>
          <Input
            placeholder="Draft Name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="mb-4"
            disabled={isCreatingDraft}
          />
          <Reorder.Group axis='y' values={orderedTeams} onReorder={setOrderedTeams}>
            <div className='space-y-2'>
              {orderedTeams.map((team) => (
                <Reorder.Item key={team.team_id} value={team}>
                  <TeamCard team={team} />
                </Reorder.Item>
              ))}
            </div>
          </Reorder.Group>
          <Button onClick={handleCreateDraft} className="mt-4 w-full" disabled={isCreatingDraft}>
            {isCreatingDraft ? 'Creating Draft...' : 'Create Draft'}
          </Button>
        </div>
        {isCreatingDraft && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 z-50">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mb-2 mx-auto" />
              <p>Creating draft and importing players...</p>
              <p>{importProgress} players imported</p>
              {importProgress > 0 && (
                <>
                  <p className="mt-2">Updating ADP data...</p>
                  <p>{adpProgress}% complete</p>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateDraftDialog;
