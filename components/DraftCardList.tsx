// ./components/DraftCardList.tsx
// This component displays a list of drafts with their details and allows commissioners to delete drafts.
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { Trash2 } from "lucide-react";

import { Draft } from "@/lib/types";

interface DraftCardListProps {
    drafts: Draft[];
    isCommissioner: boolean;
    handleDraftClick: (draftId: string) => void;
    handleDeleteDraft: (draftId: string) => void;
}

const DraftCardList: React.FC<DraftCardListProps> = ({
    drafts,
    isCommissioner,
    handleDraftClick,
    handleDeleteDraft
}) => {
    if (drafts.length === 0) {
        return <p className="text-gray-500">No drafts available.</p>;
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
}

export default DraftCardList;
