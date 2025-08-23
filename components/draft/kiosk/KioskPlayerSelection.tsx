// ./components/draft/kiosk/KioskPlayerSelection.tsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { PlayerWithADP } from '@/lib/types/';
import { cn } from '@/lib/utils';

interface KioskPlayerSelectionProps {
  selectedPlayer: PlayerWithADP | null;
  isSubmitting: boolean;
  onSubmitPick: () => void;
  className?: string;
}

const KioskPlayerSelection: React.FC<KioskPlayerSelectionProps> = ({
  selectedPlayer,
  isSubmitting,
  onSubmitPick,
  className = ""
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {!selectedPlayer ? (
            <>
              <span>Select a player to proceed</span>
              <span className="text-primary ml-4">→</span>
            </>
          ) : (
            `Ready to draft ${selectedPlayer?.full_name}?`
          )}
        </h2>
      </div>

      <div className={cn(
        "flex gap-4 transition-all duration-500",
        selectedPlayer ? "translate-y-0 opacity-100" : "translate-y-4 opacity-60",
        "overflow-hidden"
      )}>
        {/* Player Details */}
        {selectedPlayer && (
          <Card className="flex-1 border-2 hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-card to-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Avatar className="h-14 w-14 border-2 shadow-lg">
                  <AvatarImage src={selectedPlayer.headshot_url as string} alt={selectedPlayer.full_name ? selectedPlayer.full_name : 'N/A'} />
                  <AvatarFallback className="text-base">
                    {selectedPlayer.full_name ?
                      selectedPlayer.full_name.split(' ').map(n => n[0]).join('') : 'N/A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedPlayer.full_name}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {selectedPlayer.editorial_team_abbr}
                      </Badge>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {selectedPlayer.display_position}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedPlayer.adp && (
                      <>
                        <div>
                          <p className="text-muted-foreground text-xs">Average Pick</p>
                          <p className="font-mono font-bold text-lg">{selectedPlayer.adp_formatted || selectedPlayer.adp}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Position Rank</p>
                          <p className="font-mono font-bold text-lg">#{selectedPlayer.adp}</p>
                        </div>
                      </>
                    )}
                    {selectedPlayer.eligible_positions && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs mb-1">Eligible Positions</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedPlayer.eligible_positions.map((position, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                              {position}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex-shrink-0">
          <Button
            onClick={onSubmitPick}
            disabled={!selectedPlayer || isSubmitting}
            size="lg"
            className={cn(
              "h-28 px-8 text-lg font-bold transition-all duration-200 shadow-lg",
              "hover:scale-105 active:scale-95 hover:shadow-xl",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
              "bg-gradient-to-r from-primary to-primary/80"
            )}
          >
            {isSubmitting ? (
              <div className="flex flex-col items-center space-y-1">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">SUBMITTING...</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-xl">DRAFT</div>
                <div className="text-xl">PLAYER</div>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KioskPlayerSelection;