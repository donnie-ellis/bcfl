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
  className?: string;
}

const SubmitPickButton: React.FC<SubmitPickButtonProps> = ({
  isCurrentUserPick,
  selectedPlayer,
  currentPick,
  onSubmitPick,
  isPickSubmitting,
  className,
}) => {
  const isDisabled = !isCurrentUserPick || !selectedPlayer || !currentPick || selectedPlayer.is_picked || isPickSubmitting;
  const buttonText = !isCurrentUserPick
    ? 'Waiting for your turn...'
    : isPickSubmitting
      ? (
        <>
          <Loader2 className="animate-spin" /> ...drafting {selectedPlayer?.full_name}
        </>
      )
      : selectedPlayer
        ? 'Draft ' + selectedPlayer?.full_name
        : 'Select a player to draft'
  return (
    <Button
      onClick={onSubmitPick}
      disabled={isDisabled}
      className={`w-full ${isDisabled ? 'bg-primary/25 text-primary-foreground/25' : 'bg-primary text-primary-foreground'} ${isPickSubmitting && 'border-primary'} ${className}`}
    >
      {buttonText}
    </Button>
  );
};

export default SubmitPickButton;