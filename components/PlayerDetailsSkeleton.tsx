// ./components/PlayerDetailsSkeleton.tsx
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface PlayerDetailsSkeletonProps {
    currentPickNumber?: number | null;
    pickNumber?: number | null;
}

/** Placeholder for a future pick. Not a loading state (it can sit here for 90+ picks), so it's a static compact row rather than an animated skeleton. */
const PlayerDetailsSkeleton: React.FC<PlayerDetailsSkeletonProps> = ({
    currentPickNumber = null,
    pickNumber = null
}) => {
  const untilPickNumber = currentPickNumber !== null && pickNumber !== null ? pickNumber - currentPickNumber : null;
  const isNow = untilPickNumber === 0;
  const isNext = untilPickNumber === 1;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <span className="text-sm text-muted-foreground">Not yet picked</span>
      {untilPickNumber !== null && (
        <Badge
          className="shrink-0 cursor-default"
          variant={isNow ? 'success' : isNext ? 'warn' : 'secondary'}
        >
          {isNow ? 'On the clock' : isNext ? 'On deck' : `${untilPickNumber} picks away`}
        </Badge>
      )}
    </div>
  );
};

export default PlayerDetailsSkeleton;