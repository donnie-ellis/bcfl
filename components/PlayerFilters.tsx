// ./components/PlayerFilters.tsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlayerFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedPositions: string[];
  setSelectedPositions: (positions: string[]) => void;
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
  positions,
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-secondary">
        <span>Filters</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 py-2 space-y-2">
        <div className="relative">
          <Input
            placeholder="Player Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedPositions.length === 0 ? "default" : "outline"}
            className="cursor-pointer"
            onClick={handleAllPositions}
          >
            All
          </Badge>
          {positions.map((position) => (
            <Badge
              key={position}
              variant={selectedPositions.includes(position) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handlePositionToggle(position)}
            >
              {position}
            </Badge>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="hide-selected"
            checked={hideSelected}
            onCheckedChange={setHideSelected}
          />
          <label htmlFor="hide-selected">Hide selected players</label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PlayerFilters;