import React from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlayerFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedPositions: string[];
  setSelectedPositions: React.Dispatch<React.SetStateAction<string[]>>;
  hideSelected: boolean;
  setHideSelected: (hide: boolean) => void;
  positions: string[];
}

const PlayerFilters: React.FC<PlayerFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedPositions,
  setSelectedPositions,
  hideSelected,
  setHideSelected,
  positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'], // Default positions for demo
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePositionToggle = (position: string) => {
    setSelectedPositions(prev =>
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleAllPositions = () => {
    setSelectedPositions([]);
  };

  const hasActiveFilters = searchTerm || selectedPositions.length > 0 || hideSelected;

  return (
    <div className="w-full bg-background border-muted border rounded-lg shadow-sm overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 hover:bg-muted/50 transition-colors duration-1000 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {[
                    searchTerm && 'name',
                    selectedPositions.length > 0 && 'position',
                    hideSelected && 'status'
                  ].filter(Boolean).length}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="p-4 pt-0 space-y-4 border-t border-muted/100">
            
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Player Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by player name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 h-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Position Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Position</label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedPositions.length === 0 ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors duration-200 px-3 py-1"
                  onClick={handleAllPositions}
                >
                  All Positions
                </Badge>

                {positions.map((position) => (
                  <Badge
                    key={position}
                    variant={selectedPositions.includes(position) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors duration-200 px-3 py-1"
                    onClick={() => handlePositionToggle(position)}
                  >
                    {position}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Draft Status Toggle */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Draft Status</label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Hide Selected Players</span>
                  <span className="text-xs text-muted-foreground">Only show available players</span>
                </div>
                <Switch
                  id="hide-selected"
                  checked={hideSelected}
                  onCheckedChange={setHideSelected}
                />
              </div>
            </div>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <div className="pt-2 border-t border-muted">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedPositions([]);
                    setHideSelected(false);
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PlayerFilters;