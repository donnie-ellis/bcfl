// ./components/LeagueSettingsCard.tsx
// This component displays league settings with collapsible sections for roster positions and scoring categories.
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import RosterPositions from "@/components/RosterPositions";
import StatCategories from "@/components/StatCategories";
import { LeagueSettings } from "@/lib/types";

const LeagueSettingsCard: React.FC<{ settings: LeagueSettings | null, isLeagueDataLoading: boolean }> = ({ settings, isLeagueDataLoading }) => {
    return (
        isLeagueDataLoading ? (
            <Skeleton className="h-48 w-full" />
        ) : settings ? (
            <div className="space-y-2">
                <p><strong>Draft Type:</strong> <Badge>{settings.draft_type}</Badge></p>
                <p><strong>Scoring Type:</strong> <Badge>{settings.scoring_type}</Badge></p>
                <p><strong>Uses Playoff:</strong> <Badge>{settings.uses_playoff ? 'Yes' : 'No'}</Badge></p>
                <p><strong>Waiver Rule:</strong> <Badge>{settings.waiver_rule}</Badge></p>
                <p><strong>Uses FAAB:</strong> <Badge>{settings.uses_faab ? 'Yes' : 'No'}</Badge></p>
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full">
                            <span>Roster Positions</span>
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <RosterPositions positions={settings.roster_positions} />
                    </CollapsibleContent>
                </Collapsible>
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full">
                            <span>Scoring Categories</span>
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <StatCategories categories={settings.stat_categories} />
                    </CollapsibleContent>
                </Collapsible>
            </div>
        ) : (
            <p className="text-gray-500">No league settings available.</p>
        )
    );
};

export default LeagueSettingsCard;
