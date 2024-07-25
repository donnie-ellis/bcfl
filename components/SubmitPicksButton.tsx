// ./components/SubmitPickButton.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Player, Pick } from '@/lib/types';

interface SubmitPickButtonProps {
  isCurrentUserPick: boolean;
  selectedPlayer: Player | null;
  currentPick: Pick | null;
  onSubmitPick: () => void;
}

const SubmitPickButton: React.FC<SubmitPickButtonProps> = ({
  isCurrentUserPick,
  selectedPlayer,
  currentPick,
  onSubmitPick,
}) => {
  const isDisabled = !isCurrentUserPick || !selectedPlayer || !currentPick || selectedPlayer.is_drafted;

  return (
    <Button
      onClick={onSubmitPick}
      disabled={isDisabled}
      className={`w-full ${isDisabled ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600'}`}
    >
      Submit Pick
    </Button>
  );
};

export default SubmitPickButton;