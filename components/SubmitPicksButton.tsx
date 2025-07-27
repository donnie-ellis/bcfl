// ./components/SubmitPickButton.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Pick, PlayerWithADP } from '@/lib/types/';
import { Loader2 } from 'lucide-react';

interface SubmitPickButtonProps {
  isCurrentUserPick: boolean;
  selectedPlayer: PlayerWithADP | null;
  currentPick: Pick | null;
  onSubmitPick: () => void;
  isPickSubmitting: boolean;
}

const SubmitPickButton: React.FC<SubmitPickButtonProps> = ({
  isCurrentUserPick,
  selectedPlayer,
  currentPick,
  onSubmitPick,
  isPickSubmitting
}) => {
  const isDisabled = !isCurrentUserPick || !selectedPlayer || !currentPick || selectedPlayer.is_picked || isPickSubmitting;
  const buttonText = !isCurrentUserPick
    ? 'Waiting for your turn...'
    : isPickSubmitting
      ? (
        <>
          <Loader2 /> ...drafting {selectedPlayer?.full_name}
        </>
      )
      : selectedPlayer
        ? 'Draft ' + selectedPlayer?.full_name
        : 'Select a player to draft'
  return (
    <Button
      onClick={onSubmitPick}
      disabled={isDisabled}
      className={`w-full ${isDisabled ? 'bg-gray-300' : 'bg-success hover:bg-success/90 text-success-foreground hover:text-success-foreground'}`}
    >
      {buttonText}
    </Button>
  );
};

export default SubmitPickButton;