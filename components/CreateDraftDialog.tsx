// ./components/CreateDraftDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Team } from '@/lib/types';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableProps } from 'react-beautiful-dnd';
import TeamCard from './TeamCard';

interface CreateDraftDialogProps {
  leagueKey: string;
  teams: Team[];
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


const CreateDraftDialog: React.FC<CreateDraftDialogProps> = ({ leagueKey, teams, onDraftCreated }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [orderedTeams, setOrderedTeams] = useState<Team[]>([]);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

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
      const response = await fetch('/api/yahoo/createDraft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueKey,
          draftName,
          orderedTeams: orderedTeams.map(team => team.team_key)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create draft');
      }

      const { draftId, importJobId } = await response.json();

      // Start polling for import progress
      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`/api/yahoo/createDraft?jobId=${importJobId}`);
        const { status, progress } = await progressResponse.json();
        setImportProgress(progress);

        if (status === 'complete') {
          clearInterval(pollInterval);
          setIsCreatingDraft(false);
          setIsDialogOpen(false);
          // Fetch the updated list of drafts for the league
          const draftsResponse = await fetch(`/api/yahoo/drafts/${leagueKey}`);
          if (draftsResponse.ok) {
            const updatedDrafts = await draftsResponse.json();
            onDraftCreated(updatedDrafts);
          } else {
            console.error('Failed to fetch updated drafts');
          }
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create draft:', error);
      alert(error.message);
      setIsCreatingDraft(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
        <div className="mt-4 max-h-[calc(80vh-120px)] overflow-y-auto pr-4">
          <Input
            placeholder="Draft Name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="mb-4"
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
          {isCreatingDraft && (
            <div className="mt-4">
              <p>Creating draft and importing players...</p>
              <Progress value={importProgress} className="w-full mt-2" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDraftDialog;