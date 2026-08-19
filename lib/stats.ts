import { CATEGORIES, CategoryKey, FUMBLE_PENALTY, Player, PlayGrade } from "./types";

export interface CatStat {
  avg: number | null;
  count: number;
}

export function categoryAverage(grades: PlayGrade[], cat: CategoryKey): CatStat {
  const vals = grades
    .map((g) => g.scores[cat])
    .filter((v): v is 0 | 1 | 2 | 3 => v !== null && v !== undefined);
  if (vals.length === 0) return { avg: null, count: 0 };
  return { avg: vals.reduce((a: number, b) => a + b, 0) / vals.length, count: vals.length };
}

export function fumbleCount(grades: PlayGrade[]): number {
  return grades.filter((g) => g.fumble).length;
}

// Each fumble multiplies the score by 0.8 (deducts 20% per checkmark)
export function applyFumblePenalty(base: number | null, fumbles: number): number | null {
  if (base === null) return null;
  return base * Math.pow(1 - FUMBLE_PENALTY, fumbles);
}

// Overall = equal-weight average of the graded category averages, then -20% per fumble
export function overallAverage(grades: PlayGrade[]): number | null {
  const cats = CATEGORIES.map((c) => categoryAverage(grades, c.key)).filter(
    (c) => c.avg !== null
  );
  if (cats.length === 0) return null;
  const base = cats.reduce((a, c) => a + (c.avg as number), 0) / cats.length;
  return applyFumblePenalty(base, fumbleCount(grades));
}

// Grade for a single play = average of its scored categories, -20% if a fumble occurred
export function playGrade(g: PlayGrade): number | null {
  const vals = CATEGORIES.map((c) => g.scores[c.key]).filter(
    (v): v is 0 | 1 | 2 | 3 => v !== null && v !== undefined
  );
  if (vals.length === 0) return null;
  const base = vals.reduce((a: number, b) => a + b, 0) / vals.length;
  return applyFumblePenalty(base, g.fumble ? 1 : 0);
}

// Distribution of individual rep scores (every graded category on every play = one rep)
export interface Distribution {
  zeros: number;
  ones: number;
  twos: number;
  threes: number;
  na: number;
  scored: number; // zeros + ones + twos + threes
}

export function distribution(grades: PlayGrade[], cat?: CategoryKey): Distribution {
  const d: Distribution = { zeros: 0, ones: 0, twos: 0, threes: 0, na: 0, scored: 0 };
  const keys = cat ? [cat] : CATEGORIES.map((c) => c.key);
  grades.forEach((g) => {
    keys.forEach((k) => {
      const v = g.scores[k];
      if (v === null || v === undefined) d.na++;
      else if (v === 0) d.zeros++;
      else if (v === 1) d.ones++;
      else if (v === 2) d.twos++;
      else d.threes++;
    });
  });
  d.scored = d.zeros + d.ones + d.twos + d.threes;
  return d;
}

// % of scored reps graded 2 or better
export function winningRepPct(grades: PlayGrade[], cat?: CategoryKey): number | null {
  const d = distribution(grades, cat);
  if (d.scored === 0) return null;
  return ((d.twos + d.threes) / d.scored) * 100;
}

// % of scored reps graded 3
export function dominantRepPct(grades: PlayGrade[], cat?: CategoryKey): number | null {
  const d = distribution(grades, cat);
  if (d.scored === 0) return null;
  return (d.threes / d.scored) * 100;
}

// Consistency: standard deviation of play grades (lower = steadier)
export function playGradeStdDev(grades: PlayGrade[]): number | null {
  const vals = grades.map(playGrade).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

export interface PlayerStats {
  playerId: string;
  name: string;
  number: string;
  perCategory: Record<CategoryKey, CatStat>;
  overall: number | null;
  plays: number;
  fumbles: number;
  winningPct: number | null;
  dominantPct: number | null;
  stdDev: number | null;
}

export function buildPlayerStats(players: Player[], grades: PlayGrade[]): PlayerStats[] {
  return players.map((p) => {
    const pg = grades.filter((g) => g.playerId === p.id);
    const perCategory = {} as Record<CategoryKey, CatStat>;
    CATEGORIES.forEach((c) => {
      perCategory[c.key] = categoryAverage(pg, c.key);
    });
    return {
      playerId: p.id,
      name: p.name,
      number: p.number,
      perCategory,
      overall: overallAverage(pg),
      plays: pg.length,
      fumbles: fumbleCount(pg),
      winningPct: winningRepPct(pg),
      dominantPct: dominantRepPct(pg),
      stdDev: playGradeStdDev(pg),
    };
  });
}

export function fmt(avg: number | null): string {
  return avg === null ? "—" : avg.toFixed(2);
}

// A 0-3 score expressed as a percent of the 3.00 max
export function pctOf3(avg: number | null): number | null {
  return avg === null ? null : (avg / 3) * 100;
}

// "2.15 (72%)" — numeric out of 3 plus percent
export function fmtWithPct(avg: number | null): string {
  if (avg === null) return "—";
  return `${avg.toFixed(2)} (${Math.round((avg / 3) * 100)}%)`;
}

export function fmtPct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)}%`;
}

export function gradeBand(avg: number | null): {
  label: string;
  text: string;
  bg: string;
} {
  if (avg === null) return { label: "No data", text: "text-gray-400", bg: "bg-gray-50" };
  if (avg >= 2.5) return { label: "Championship", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (avg >= 2.0) return { label: "Winning", text: "text-sky-700", bg: "bg-sky-50" };
  if (avg >= 1.5) return { label: "Developing", text: "text-amber-700", bg: "bg-amber-50" };
  return { label: "Needs Work", text: "text-red-700", bg: "bg-red-50" };
}
