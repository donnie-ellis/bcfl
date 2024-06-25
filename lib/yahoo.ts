import { getServerAuthSession } from "@/auth"

async function getValidAccessToken() {
  const session = await getServerAuthSession();

  if (session?.error === "RefreshAccessTokenError") {
    throw new Error("Your login has expired. Please sign in again.")
  }
  return session?.accessToken
}

export async function fetchLeagues() {
  try {
    const accessToken = await getValidAccessToken()
    const response = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=nfl;seasons=2024/leagues?format=json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return JSON.stringify(data.fantasy_content.users.user)
  } catch (error) {
    console.error('Error fetching leagues:', error)
    throw error
  }
}

export async function fetchTeam(leagueKey: string) {
  try {
    const accessToken = await getValidAccessToken()
    const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${leagueKey}/roster?format=json`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const team = data.fantasy_content.team[0]
    const roster = data.fantasy_content.team[1].roster
    return { team, roster }
  } catch (error) {
    console.error('Error fetching team:', error)
    throw error
  }
}