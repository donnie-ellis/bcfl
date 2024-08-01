// ./components/CreateDraftDialog.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LeagueSettings, Team } from '@/lib/types';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableProps } from 'react-beautiful-dnd';
import TeamCard from './TeamCard';
import { Loader2 } from 'lucide-react';
import { POST } from '@/app/api/auth/logout/route';

interface CreateDraftDialogProps {
  leagueKey: string;
  teams: Team[];
  leagueSettings: LeagueSettings | null;
  onDraftCreated: (newDrafts: any[]) => void;
}
const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) {
    return null;
  }
  return <Droppable {...props}>{children}</Droppable>;
};

const CreateDraftDialog: React.FC<CreateDraftDialogProps> = ({ leagueKey, teams, onDraftCreated, leagueSettings }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [orderedTeams, setOrderedTeams] = useState<Team[]>([]);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setOrderedTeams(teams);
  }, [teams]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(orderedTeams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderedTeams(items);
  };

const handleCreateDraft = async () => {
    if (!draftName.trim()) {
      alert('Please enter a draft name');
      return;
    }

    setIsCreatingDraft(true);
    try {
      const managerResponse = await fetch(`api/yahoo/league/${leagueKey}/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!managerResponse.ok) {
        throw new Error('Failed to update managers');
      }
      const response = await fetch('/api/db/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueKey,
          draftName,
          orderedTeams: orderedTeams.map(team => team.team_key),
          leagueSettings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create draft');
      }

      const { draftId, importJobId } = await response.json();

      // Start polling for import progress
      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`/api/db/importJob/${importJobId}`);
        const { status, progress } = await progressResponse.json();
        setImportProgress(progress);

        if (status === 'complete') {
          clearInterval(pollInterval);
          setIsCreatingDraft(false);
          setIsDialogOpen(false);
          setDraftName(''); // Clear the draft name input
          // Fetch the updated list of drafts for the league
          const draftsResponse = await fetch(`/api/db/league/${leagueKey}/drafts`);
          if (draftsResponse.ok) {
            const updatedDrafts = await draftsResponse.json();
            onDraftCreated(updatedDrafts);
          } else {
            console.error('Failed to fetch updated drafts');
          }
          // Redirect to the new draft page
          router.push(`/draft/${draftId}`);
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create draft:', error);
      setIsCreatingDraft(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDraftName(''); // Clear the draft name input when closing the dialog
    }
    setIsDialogOpen(open);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline">Create a new draft</Button>
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="teams">
              {(provided: DroppableProvided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {orderedTeams.map((team, index) => (
                    <Draggable key={team.team_key} draggableId={team.team_key} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-2 bg-gray-100 rounded flex items-center"
                        >
                          <span className="mr-2">{index + 1}.</span>
                          <div className="flex-grow">
                            <TeamCard team={team} />
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </StrictModeDroppable>
          </DragDropContext>
          <Button onClick={handleCreateDraft} className="mt-4 w-full" disabled={isCreatingDraft}>
            {isCreatingDraft ? 'Creating Draft...' : 'Create Draft'}
          </Button>
        </div>
        {isCreatingDraft && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-50">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mb-2 mx-auto" />
              <p>Creating draft and importing players...</p>
              <Progress value={importProgress} className="w-full mt-2" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateDraftDialog;