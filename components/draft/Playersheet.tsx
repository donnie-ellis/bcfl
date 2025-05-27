// ./components/draft/Playersheet.tsx
// This component provides a bottom sheet for making picks on mobile devices.
// It includes a button to open the sheet, player details, and a submit button for picks.
// The sheet is designed to be used in a mobile-friendly layout, allowing users to make their picks easily.
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerDetails from "@/components/draft/common/PlayerDetails";
import SubmitPickButton from "@/components/draft/common/SubmitPicksButton";
import { PickWithPlayerAndTeam, PlayerWithADP } from '@/lib/types';

interface PlayersheetProps {
    isCurrentUserPick: boolean;
    selectedPlayer: PlayerWithADP | null; // Replace with actual player type
    currentPick: PickWithPlayerAndTeam | null; // Replace with actual pick type
    handleSubmitPick: () => void;
    isPickSubmitting: boolean;
}
const Playersheet: React.FC<PlayersheetProps> = ({
    isCurrentUserPick,
    selectedPlayer,
    currentPick,
    handleSubmitPick,
    isPickSubmitting
}) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent side="bottom" className="h-[50vh] flex flex-col md:hidden">
                <SheetHeader>
                    <SheetTitle>Make your pick</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-grow">
                    <div className="p-4 space-y-4">
                        <SubmitPickButton
                            isCurrentUserPick={isCurrentUserPick}
                            selectedPlayer={selectedPlayer}
                            currentPick={currentPick}
                            onSubmitPick={handleSubmitPick}
                            isPickSubmitting={isPickSubmitting}
                        />
                        <PlayerDetails
                            player={selectedPlayer}
                        />
                    </div>
                </ScrollArea>
            </SheetContent>

            {/* Floating action button for small screens */}
            <SheetTrigger asChild>
                <Button
                    size="icon"
                    className="fixed right-4 bottom-4 rounded-full shadow-lg md:hidden"
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
        </Sheet>
    );
}
export default Playersheet;
