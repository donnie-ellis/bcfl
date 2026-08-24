import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProps } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import TeamCard from './TeamCard';
import { Team } from '@/lib/types/';
import { GripVertical } from 'lucide-react';

interface TeamOrderProps {
  teams: Team[];
  onSubmit: (orderedTeams: Team[]) => void;
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

const TeamOrder: React.FC<TeamOrderProps> = ({ teams, onSubmit }) => {
  const [orderedTeams, setOrderedTeams] = useState<Team[]>([]);

  useEffect(() => {
    setOrderedTeams(teams);
  }, [teams]);

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(orderedTeams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedTeams(items);
  };

  const handleSubmit = () => {
    onSubmit(orderedTeams);
  };

  return (
    <div className="flex flex-col h-full">
      <DragDropContext onDragEnd={onDragEnd}>
        <StrictModeDroppable droppableId="teams-list">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 w-full"
            >
              {orderedTeams.map((team, index) => (
                <Draggable key={team.id} draggableId={team.id.toString()} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center relative"
                    >
                      <div className="w-10 shrink-0 flex items-center justify-center font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div
                        className={`flex items-center bg-card border rounded-lg shadow-xs grow ${
                          snapshot.isDragging ? 'shadow-md' : ''
                        }`}
                        style={{
                          transform: snapshot.isDragging ? 'rotate(2deg)' : 'rotate(0)',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <div className="grow p-2 overflow-hidden">
                          <TeamCard team={team} />
                        </div>
                        <div
                          {...provided.dragHandleProps}
                          className="flex items-center justify-center w-10 h-full bg-muted rounded-r-lg cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical size={20} className="text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
      <Button onClick={handleSubmit} className="mt-4">Submit Order</Button>
    </div>
  );
};

export default TeamOrder;