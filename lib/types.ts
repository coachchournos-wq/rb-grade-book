export type Score = 0 | 1 | 2 | 3 | null; // null = N/A

// Graded categories (0-3 scale). Ball Security is tracked separately as a fumble checkmark.
export const CATEGORIES = [
  { key: "firstManMiss", label: "Make First Man Miss", short: "1st Man Miss", color: "#C8102E" },
  { key: "finishForward", label: "Finish Forward", short: "Finish Fwd", color: "#1D6FB8" },
  { key: "blocking", label: "Blocking", short: "Blocking", color: "#E5A83B" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

// Each fumble checkmark deducts 20% from the overall score (multiplied per fumble)
export const FUMBLE_PENALTY = 0.2;

export interface Game {
  id: string;
  opponent: string;
  date: string; // yyyy-mm-dd
}

export interface Player {
  id: string;
  name: string;
  number: string;
}

export interface PlayGrade {
  id: string;
  gameId: string;
  playerId: string;
  playName: string;
  scores: Record<CategoryKey, Score>;
  fumble: boolean; // Ball Security checkmark = fumble on this play
  createdAt: string;
}

export interface GradingData {
  games: Game[];
  players: Player[];
  grades: PlayGrade[];
  plays: string[]; // playbook — remembered play names
}
