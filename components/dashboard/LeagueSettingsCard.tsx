// ./components/LeagueSettingsCard.tsx
// This component displays league settings with collapsible sections for roster positions and scoring categories.
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import RosterPositions from "@/components/dashboard/RosterPositions";
import StatCategories from "@/components/dashboard/StatCategories";
import { LeagueSettings } from "@/lib/types";

const LeagueSettingsCard: React.FC<{ leagueSettings: LeagueSettings | null, isLeagueDataLoading: boolean }> = ({ leagueSettings, isLeagueDataLoading }) => {
    return (
        isLeagueDataLoading ? (
            <Skeleton className="h-48 w-full" />
        ) : leagueSettings ? (
            <div className="space-y-2">
                <p><strong>Draft Type:</strong> <Badge>{leagueSettings.draft_type}</Badge></p>
                <p><strong>Scoring Type:</strong> <Badge>{leagueSettings.scoring_type}</Badge></p>
                <p><strong>Uses Playoff:</strong> <Badge>{leagueSettings.uses_playoff ? 'Yes' : 'No'}</Badge></p>
                <p><strong>Waiver Rule:</strong> <Badge>{leagueSettings.waiver_rule}</Badge></p>
                <p><strong>Uses FAAB:</strong> <Badge>{leagueSettings.uses_faab ? 'Yes' : 'No'}</Badge></p>
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full">
                            <span>Roster Positions</span>
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <RosterPositions positions={leagueSettings.roster_positions} />
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
                        <StatCategories categories={leagueSettings.stat_categories} />
                    </CollapsibleContent>
                </Collapsible>
            </div>
        ) : (
            <p className="text-gray-500">No league settings available.</p>
        )
    );
};

export default LeagueSettingsCard;
