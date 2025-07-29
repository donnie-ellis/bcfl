import { EnhancedPlayerWithADP, Player, PlayerWithADP } from '@/lib/types';
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProps } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ListMinus, MoveDown, MoveUp, Trash2 } from 'lucide-react';
import { toast } from "sonner";

// Union type for all possible player types in the queue
type QueuePlayer = Player | PlayerWithADP | EnhancedPlayerWithADP;

interface DraftQueueProps {
    queue: QueuePlayer[];
    setQueue: React.Dispatch<React.SetStateAction<QueuePlayer[]>>;
    managerId?: string;
    onPlayerDrafted?: (player: QueuePlayer, managerId: string) => void;
    onPlayerClick?: (player: PlayerWithADP) => void;
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

export default function DraftQueue({ queue, setQueue, managerId, onPlayerDrafted, onPlayerClick }: DraftQueueProps) {

    const removeFromQueue = (playerId: number | string): void => {
        setQueue(prev => prev.filter(p => p.id !== playerId));
        toast.warning(`Removed player from queue`);
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
        toast.warning("Cleared draft queue");
    };

    // React Beautiful DND handler
    const handleOnDragEnd = (result: DropResult): void => {
        if (!result.destination) return;

        const items = Array.from(queue);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setQueue(items);
    };

    return (
        <div className="draft-queue">
            <div className="flex p-4 w-full">
                <h3 className='text-2xl'>Draft Queue <span className='text-muted-foreground text-sm'>({queue.length})</span></h3>
                <div className="ml-auto">
                    <Button 
                        onClick={clearQueue} 
                        variant={"destructive"}
                        size={"sm"}
                    >
                       <Trash2 className="w-4 h-4 mr-2" />Clear Queue
                    </Button>
                </div>
            </div>

            <div className='p-4'>
            {queue.length === 0 ? (
                <div className="empty-queue">
                    <p>No players in queue</p>
                    <small>Use the + button on player cards to add them</small>
                </div>
            ) : (
                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <StrictModeDroppable droppableId="queue">
                        {(provided, snapshot) => (
                            <div
                                className={`queue-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {queue.map((player, index) => (
                                    <Draggable key={player.id} draggableId={player.id!.toString()} index={index}>
                                        {(provided, snapshot) => (
                                            <Card 
                                                ref={provided.innerRef} 
                                                {...provided.draggableProps} 
                                                className={`flex ${snapshot.isDragging ? 'shadow-md' : ''} w-full border my-1 cursor-default hover:bg-accent`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Only call onPlayerClick if the player is PlayerWithADP compatible
                                                    if (onPlayerClick && 'adp' in player) {
                                                        onPlayerClick(player as PlayerWithADP);
                                                    }
                                                }}
                                            >
                                                
                                                <CardContent className="p-3 flex items-center space-x-3 w-full">
                                                    <span className="text-muted-foreground text-2xl mr-4 cursor-grab" {...provided.dragHandleProps}>⋮⋮</span>
                                                    <Avatar className="h-8 w-8 rounded-full mr-3">
                                                        <AvatarImage src={player.headshot_url as string} alt={player.full_name || 'N/A'} />
                                                        <AvatarFallback>{(player.full_name || 'NA').split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                    </Avatar>

                                                    <div className="">
                                                        <span className="text-md">{player.full_name}</span>
                                                        <span className="text-muted-foreground text-xs uppercase"> ({player.editorial_team_abbr})</span>
                                                        <span className="text-muted-foreground text-sm uppercase"> - {player.display_position}</span>
                                                    </div>

                                                    <div className="flex ml-auto space-x-1">
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveUp(index);
                                                            }}
                                                            disabled={index === 0}
                                                            variant={"secondary"}
                                                            size="icon"
                                                            title="Move up in queue"
                                                            className="hover:bg-secondary/40 hover:shadow"
                                                        >
                                                            <MoveUp className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveDown(index);
                                                            }}
                                                            disabled={index === queue.length - 1}
                                                            variant={"secondary"}
                                                            size="icon"
                                                            title="Move down in queue"
                                                            className="hover:bg-secondary/40 hover:shadow"
                                                        >
                                                            <MoveDown className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if(player.id) {
                                                                    removeFromQueue(player.id);
                                                                }
                                                            }}
                                                            className="hover:bg-destructive/40 hover:shadow"
                                                            title="Remove from queue"
                                                            variant={"secondary"}
                                                            size="icon"
                                                        >
                                                            <ListMinus className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </StrictModeDroppable>
                </DragDropContext>
            )}
            </div>
        </div>
    );
}
