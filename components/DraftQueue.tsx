import { EnhancedPlayerWithADP, Player, PlayerWithADP } from '@/lib/types';
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface DraftQueueProps {
  queue: Player[] | PlayerWithADP[] | EnhancedPlayerWithADP[];
  setQueue: React.Dispatch<React.SetStateAction<Player[]>>;
  managerId: string;
  onPlayerDrafted?: (player: Player, managerId: string) => void;
}

export default function DraftQueue({ queue, setQueue, managerId, onPlayerDrafted }: DraftQueueProps) {

  // Remove addToQueue since parent will handle adding
  // const addToQueue = (player: Player): void => {
  //   if (!queue.find(p => p.id === player.id)) {
  //     setQueue(prev => [...prev, player]);
  //   }
  // };

  const removeFromQueue = (playerId: number | string): void => {
    setQueue(prev => prev.filter(p => p.id !== playerId));
  };

  const moveUp = (index: number): void => {
    if (index > 0) {
      setQueue(prev => {
        const newQueue = [...prev];
        [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
        return newQueue;
      });
    }
  };

  const moveDown = (index: number): void => {
    if (index < queue.length - 1) {
      setQueue(prev => {
        const newQueue = [...prev];
        [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
        return newQueue;
      });
    }
  };

  const clearQueue = (): void => {
    setQueue([]);
  };

  const draftNext = (): void => {
    if (queue.length > 0) {
      const playerToDraft = queue[0];
      setQueue(prev => prev.slice(1));
      onPlayerDrafted?.(playerToDraft, managerId);
    }
  };

  // React Beautiful DND handler
  const handleOnDragEnd = (result: DropResult): void => {
    if (!result.destination) return;

    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQueue(items);
  };

  // No longer need to expose addToQueue since parent handles it
  // // Expose the addToQueue function so parent components can use it
  // // React.useImperativeHandle(ref, () => ({
  // //   addToQueue
  // // }));

  return (
    <div className="draft-queue">
      <div className="queue-header">
        <h3>Draft Queue ({queue.length})</h3>
        <div className="queue-actions">
          <button 
            onClick={draftNext} 
            disabled={queue.length === 0}
            className="btn-primary"
          >
            Draft Next
          </button>
          <button onClick={clearQueue} className="btn-secondary">
            Clear All
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty-queue">
          <p>No players in queue</p>
          <small>Use the + button on player cards to add them</small>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="queue">
            {(provided, snapshot) => (
              <div
                className={`queue-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {queue.map((player, index) => (
                  <Draggable key={player.id} draggableId={player.id.toString()} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`queue-item ${snapshot.isDragging ? 'dragging' : ''}`}
                      >
                        <div 
                          className="drag-handle"
                          {...provided.dragHandleProps}
                        >
                          ⋮⋮
                        </div>
                        
                        <div className="queue-position">
                          {index + 1}
                        </div>
                        
                        <div className="player-info">
                          <span className="player-name">{player.full_name}</span>
                          <span className="player-position">{player.primary_position}</span>
                          <span className="player-team">{player.editorial_team_abbr}</span>
                        </div>

                        <div className="queue-controls">
                          <button 
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="btn-icon"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button 
                            onClick={() => moveDown(index)}
                            disabled={index === queue.length - 1}
                            className="btn-icon"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button 
                            onClick={() => removeFromQueue(player.id)}
                            className="btn-icon btn-danger"
                            title="Remove from queue"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}