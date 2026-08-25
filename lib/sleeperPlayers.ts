// ./lib/sleeperPlayers.ts
import { PlayerInsert } from '@/lib/types/player.types';

const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

interface SleeperPlayer {
  player_id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  position?: string | null;
  fantasy_positions?: string[] | null;
  team?: string | null;
  status?: string | null;
  injury_status?: string | null;
  number?: number | null;
  age?: number | null;
  years_exp?: number | null;
  college?: string | null;
  height?: string | null;
  weight?: string | null;
  active?: boolean | null;
  search_rank?: number | null;
}

export function mapSleeperPlayerToInsert(p: SleeperPlayer): PlayerInsert {
  return {
    sleeper_id: p.player_id,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    full_name: p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(' ') || null),
    position: p.position ?? null,
    fantasy_positions: p.fantasy_positions ?? null,
    team: p.team ?? null,
    status: p.status ?? null,
    injury_status: p.injury_status ?? null,
    number: p.number ?? null,
    age: p.age ?? null,
    years_exp: p.years_exp ?? null,
    college: p.college ?? null,
    height: p.height ?? null,
    weight: p.weight ?? null,
    active: p.active ?? null,
    search_rank: p.search_rank ?? null,
    headshot_url: `https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`,
  };
}

// Fetches Sleeper's full NFL player dump (one bulk call, no pagination) and
// filters it down to active, roster-relevant fantasy positions.
export async function fetchAllSleeperPlayers(): Promise<PlayerInsert[]> {
  const response = await fetch(SLEEPER_PLAYERS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Sleeper players: ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, SleeperPlayer>;

  return Object.values(data)
    .filter(p => p.active && p.position && FANTASY_POSITIONS.has(p.position))
    .map(mapSleeperPlayerToInsert);
}
