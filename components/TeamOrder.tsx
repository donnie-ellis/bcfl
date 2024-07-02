import React from 'react';
import { DragDropContext, Droppable, Draggable, DroppableProvided } from 'react-beautiful-dnd';
import TeamCard from './TeamCard';
import { Team } from '@/lib/types';

interface TeamListProps {
  teams: Team[];
  onSubmit: (orderedTeams: Team[]) => void;
}

const TeamList: React.FC<TeamListProps> = ({ teams, onSubmit }) => {
  const [orderedTeams, setOrderedTeams] = React.useState<Team[]>(teams);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const newTeams = Array.from(orderedTeams);
    const [reorderedItem] = newTeams.splice(result.source.index, 1);
    newTeams.splice(result.destination.index, 0, reorderedItem);
    setOrderedTeams(newTeams);
  };

  const handleSubmit = () => {
    onSubmit(orderedTeams);
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="teams">
          {(provided: DroppableProvided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {orderedTeams.map((team, index) => (
                <Draggable key={team.id} draggableId={team.id.toString()} index={index}>
                  {(provided: DroppableProvided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <TeamCard team={team} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button onClick={handleSubmit}>Submit Order</button>
    </>
  );
};