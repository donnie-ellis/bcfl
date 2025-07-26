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
import { AnimatePresence, motion } from 'framer-motion';

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full bg-muted px-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-secondary">
        <span>Filters</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
      <AnimatePresence>
      <motion.div 
        className="px-4 py-2 space-y-2"
        key="filterContent"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.2 }}
      >
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
          <motion.div key="all" whileTap={{ scale: 0.85 }}>
            <Badge
              variant={selectedPositions.length === 0 ? "default" : "outline"}
              className="cursor-pointer"
              onClick={handleAllPositions}
            >
              All
            </Badge>

          </motion.div>
          {positions.map((position) => (
            <motion.div key={position} whileTap={{ scale: 0.85 }}>
              <Badge
                key={position}
                variant={selectedPositions.includes(position) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handlePositionToggle(position)}
              >
                {position}
              </Badge>
            </motion.div>
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
        </motion.div></AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PlayerFilters;
