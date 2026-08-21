// Cloud sync layer — Supabase REST (shared team database)
import { Game, GradingData, PlayGrade, Player } from "./types";

const BASE = "https://wzjihsksbortxgjjachl.supabase.co/rest/v1";
const KEY = "sb_publishable_X01kZx0eKkR4qJhnLAvz0w_zDKdPKX3"; // publishable (client-safe) key

const HEADERS: Record<string, string> = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Cloud request failed (${res.status})`);
  return res;
}

interface GradeRow {
  id: string;
  game_id: string;
  player_id: string;
  play_name: string;
  scores: PlayGrade["scores"];
  fumble: boolean;
  created_at: string;
}

function toGrade(r: GradeRow): PlayGrade {
  return {
    id: r.id,
    gameId: r.game_id,
    playerId: r.player_id,
    playName: r.play_name,
    scores: r.scores,
    fumble: r.fumble,
    createdAt: r.created_at,
  };
}

function toRow(g: PlayGrade): GradeRow {
  return {
    id: g.id,
    game_id: g.gameId,
    player_id: g.playerId,
    play_name: g.playName,
    scores: g.scores,
    fumble: g.fumble,
    created_at: g.createdAt,
  };
}

export async function cloudFetchAll(): Promise<GradingData> {
  const [games, players, plays, grades] = await Promise.all([
    rest("games?select=*").then((r) => r.json() as Promise<Game[]>),
    rest("players?select=*").then((r) => r.json() as Promise<Player[]>),
    rest("plays?select=name").then((r) => r.json() as Promise<{ name: string }[]>),
    rest("grades?select=*").then((r) => r.json() as Promise<GradeRow[]>),
  ]);
  return {
    games,
    players,
    plays: plays.map((p) => p.name),
    grades: grades.map(toGrade),
  };
}

// A single queued operation — applied in order when the connection is back
export interface CloudOp {
  method: "POST" | "DELETE";
  path: string; // e.g. "games" or "games?id=eq.abc"
  body?: unknown;
}

export async function applyOp(op: CloudOp): Promise<void> {
  await rest(op.path, {
    method: op.method,
    headers: op.method === "POST" ? { Prefer: "resolution=merge-duplicates" } : {},
    body: op.body === undefined ? undefined : JSON.stringify(op.body),
  });
}

export const ops = {
  upsertGame: (g: Game): CloudOp => ({ method: "POST", path: "games?on_conflict=id", body: g }),
  deleteGame: (id: string): CloudOp => ({ method: "DELETE", path: `games?id=eq.${encodeURIComponent(id)}` }),
  deleteGradesForGame: (id: string): CloudOp => ({ method: "DELETE", path: `grades?game_id=eq.${encodeURIComponent(id)}` }),
  upsertPlayer: (p: Player): CloudOp => ({ method: "POST", path: "players?on_conflict=id", body: p }),
  deletePlayer: (id: string): CloudOp => ({ method: "DELETE", path: `players?id=eq.${encodeURIComponent(id)}` }),
  deleteGradesForPlayer: (id: string): CloudOp => ({ method: "DELETE", path: `grades?player_id=eq.${encodeURIComponent(id)}` }),
  upsertGrade: (g: PlayGrade): CloudOp => ({ method: "POST", path: "grades?on_conflict=id", body: toRow(g) }),
  deleteGrade: (id: string): CloudOp => ({ method: "DELETE", path: `grades?id=eq.${encodeURIComponent(id)}` }),
  upsertPlay: (name: string): CloudOp => ({ method: "POST", path: "plays?on_conflict=name", body: { name } }),
  deletePlay: (name: string): CloudOp => ({ method: "DELETE", path: `plays?name=eq.${encodeURIComponent(name)}` }),
};

// Replace the entire cloud dataset (used for restore-from-backup / sample data)
export function replaceAllOps(data: GradingData): CloudOp[] {
  return [
    { method: "DELETE", path: "grades?id=neq.__none__" },
    { method: "DELETE", path: "games?id=neq.__none__" },
    { method: "DELETE", path: "players?id=neq.__none__" },
    { method: "DELETE", path: "plays?name=neq.__none__" },
    ...data.games.map(ops.upsertGame),
    ...data.players.map(ops.upsertPlayer),
    ...data.plays.map(ops.upsertPlay),
    ...data.grades.map(ops.upsertGrade),
  ];
}

// Seed the cloud from local data (first-time migration)
export function seedOps(data: GradingData): CloudOp[] {
  return [
    ...data.games.map(ops.upsertGame),
    ...data.players.map(ops.upsertPlayer),
    ...data.plays.map(ops.upsertPlay),
    ...data.grades.map(ops.upsertGrade),
  ];
}
