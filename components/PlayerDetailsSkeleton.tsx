// ./components/PlayerDetailsSkeleton.tsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PlayerDetailsSkeletonProps {
    currentPickNumber?: number | null;
    pickNumber?: number | null;
}

const PlayerDetailsSkeleton: React.FC<PlayerDetailsSkeletonProps> = ({
    currentPickNumber = null,
    pickNumber = null
}) => {
    const isNow = currentPickNumber !== null && pickNumber !== null && (pickNumber - currentPickNumber) === 0;
    const untilPickNumber = currentPickNumber !== null && pickNumber !== null ? pickNumber - currentPickNumber : null;
  return (
    <Card className="p-3">
      <CardContent className="p-0">
        <div className="flex items-center gap-3">
          {/* Avatar Skeleton */}
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />

          {/* Main Content Skeleton */}
          <div className="flex-1 min-w-0">
            {/* Name and Status */}
            <div className="flex items-center gap-2 mb-1">
              { currentPickNumber && pickNumber ? 
               <> 
                    <h3 className="font-semibold text-sm">Turns until pick:</h3>
                    <Badge 
                      className={`bg-secondary text-primary text-xs px-1.5 py-0.5 shrink-0 ${isNow && 'bg-green-400'}`}>
                      {isNow ? 'Now' : untilPickNumber }
                    </Badge>
               </>
              :
              <>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </>
              }
            </div>
            
            {/* Team and Positions */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-8 rounded-full" />
                <Skeleton className="h-4 w-10 rounded-full" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
            </div>

            {/* Bye Week and ADP */}
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerDetailsSkeleton;