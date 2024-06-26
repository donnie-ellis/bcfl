import PlayerList from "@/components/PlayerList"
import { fetchLeagePlayers } from "@/lib/yahoo"

export default async function Dashboard() {
    const playerList = await fetchLeagePlayers()
    return(
        <>
            <PlayerList players={playerList.players} />
        </>
    )
}