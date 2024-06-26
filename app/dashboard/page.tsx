import PlayerList from "@/components/PlayerList"
import { fetchLeagePlayers, fetchTeams } from "@/lib/yahoo"
import TeamList from "@/components/TeamList"

export default async function Dashboard() {
    //const playerList = await fetchLeagePlayers()
    const teamList = await fetchTeams();
    return(
        <>
            {/* <PlayerList players={playerList.players} /> */}
            <TeamList teams={teamList.teams} />
        </>
    )
}