// ./components/SubmitPickButton.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Pick, PlayerWithADP } from '@/lib/types/';

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
      className={`w-full ${isDisabled ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600'}`}
    >
      {buttonText}
    </Button>
  );
};

export default SubmitPickButton;