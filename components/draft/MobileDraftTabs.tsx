// ./components/draft/MobileDraftTabs.tsx
// This component provides a mobile-friendly tabbed interface for the draft, allowing users to switch between players, draft status, and their team.
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlayersList from "@/components/draft/common/PlayersList";
import DraftStatus from "@/components/draft/DraftStatus";
import DraftedPlayers from "@/components/draft/common/DraftedPlayers";

interface MobileDraftTabsProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    draftId: string;
    handlePlayerSelect: (player: any) => void;
    memoizedDraft: any;
    selectedPlayer: any;
    leagueSettings: any;
    teams: any[];
    team: any;
}

const MobileDraftTabs: React.FC<MobileDraftTabsProps> = ({
    activeTab,
    setActiveTab,
    draftId,
    handlePlayerSelect,
    memoizedDraft,
    selectedPlayer,
    leagueSettings,
    teams,
    team,
}) => {
    return (
        <div className="md:hidden flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                    <TabsTrigger value="players">Players</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="team">My Team</TabsTrigger>
                </TabsList>
                <TabsContent value="players" className="flex-grow overflow-hidden">
                    <PlayersList
                        draftId={draftId}
                        onPlayerSelect={handlePlayerSelect}
                        draft={memoizedDraft}
                        selectedPlayer={selectedPlayer}
                    />
                </TabsContent>
                <TabsContent value="draft" className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                            <DraftStatus
                                draft={memoizedDraft}
                                leagueSettings={leagueSettings}
                                teams={teams}
                                team={team}
                            />
                        </div>
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="team" className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            <DraftedPlayers
                                picks={memoizedDraft.picks}
                                teamKey={team.team_key}
                                teamName={team.name}
                            />
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default MobileDraftTabs;
