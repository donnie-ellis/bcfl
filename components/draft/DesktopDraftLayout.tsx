// ./components/draft/DesktopDraftLayout.tsx
// This component is designed to be used in a desktop layout for a fantasy football draft.
// It includes a left column for player selection, a middle column for draft status and player details, 

import React from "react"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import DraftStatus from "@/components/draft/DraftStatus"
import DraftedPlayers from "@/components/draft/common/DraftedPlayers"
import PlayerDetails from "@/components/draft/common/PlayerDetails"
import PlayersList from "@/components/draft/common/PlayersList"
import SubmitPickButton from "@/components/draft/common/SubmitPicksButton"

interface DesktopDraftLayoutProps {
    draftId: string;
    handlePlayerSelectMd: (player: any) => void;
    memoizedDraft: any;
    selectedPlayer: any;
    isCurrentUserPick: boolean;
    currentPick: any;
    handleSubmitPick: () => void;
    isPickSubmitting: boolean;
    leagueSettings: any;
    teams: any[];
    team: any;
}

const DesktopDraftLayout: React.FC<DesktopDraftLayoutProps> = ({
    draftId,
    handlePlayerSelectMd,
    memoizedDraft,
    selectedPlayer,
    isCurrentUserPick,
    currentPick,
    handleSubmitPick,
    isPickSubmitting,
    leagueSettings,
    teams,
    team,
}) => {

    return (
        <div className="hidden md:flex w-full h-[calc(100vh-64px)]">

            {/* Left Column */}
            <div className="w-1/4 overflow-hidden flex flex-col">
                <PlayersList
                    draftId={draftId}
                    onPlayerSelect={handlePlayerSelectMd}
                    draft={memoizedDraft}
                    selectedPlayer={selectedPlayer}
                />
            </div>

            {/* Middle Column */}
            <div className="w-1/2 h-full overflow-hidden flex flex-col">
                <ScrollArea className="flex-grow">
                    <div className="p-4 space-y-4">
                        <DraftStatus
                            draft={memoizedDraft}
                            leagueSettings={leagueSettings}
                            teams={teams}
                            team={team}
                        />
                        {selectedPlayer && (
                            <motion.div
                                key="playerSelected"
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 1, y: 100 }}
                                transition={{ duration: 0.2 }}
                                className='space-y-4'
                            >
                                <SubmitPickButton
                                    isCurrentUserPick={isCurrentUserPick}
                                    selectedPlayer={selectedPlayer}
                                    currentPick={currentPick}
                                    onSubmitPick={handleSubmitPick}
                                    isPickSubmitting={isPickSubmitting}
                                />
                                <PlayerDetails
                                    player={selectedPlayer}
                                />
                            </motion.div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Column */}
            <div className="w-1/4 overflow-hidden flex flex-col p-4">
                <DraftedPlayers
                    picks={memoizedDraft.picks}
                    teamKey={team.team_key}
                    teamName={team.name}
                />
            </div>
        </div>
    )
}

export default DesktopDraftLayout;
