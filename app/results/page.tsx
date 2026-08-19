"use client";

import { useMemo, useState } from "react";
import { useGradingStore } from "@/hooks/use-grading-store";
import { CATEGORIES, CategoryKey } from "@/lib/types";
import {
  buildPlayerStats,
  categoryAverage,
  distribution,
  dominantRepPct,
  fmt,
  fmtPct,
  fmtWithPct,
  pctOf3,
  fumbleCount,
  gradeBand,
  overallAverage,
  playGrade,
  winningRepPct,
} from "@/lib/stats";
import { DistRow, ScoreDistributionChart } from "@/components/score-distribution";
import { PlayLog } from "@/components/play-log";
import {
  BarDatum,
  GradeBarChart,
  SCARLET,
  TrendChart,
  TrendDatum,
} from "@/components/results-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResultsPage() {
  const store = useGradingStore();
  const [gameFilter, setGameFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryKey>("all");

  const sortedGames = useMemo(
    () => [...store.games].sort((a, b) => a.date.localeCompare(b.date)),
    [store.games]
  );

  // Grades matching game + player filters
  const filtered = useMemo(
    () =>
      store.grades.filter(
        (g) =>
          (gameFilter === "all" || g.gameId === gameFilter) &&
          (playerFilter === "all" || g.playerId === playerFilter)
      ),
    [store.grades, gameFilter, playerFilter]
  );

  const visiblePlayers = useMemo(
    () => store.players.filter((p) => playerFilter === "all" || p.id === playerFilter),
    [store.players, playerFilter]
  );

  const playerStats = useMemo(
    () => buildPlayerStats(visiblePlayers, filtered),
    [visiblePlayers, filtered]
  );

  const catInfo = CATEGORIES.find((c) => c.key === categoryFilter);
  const metricLabel = catInfo ? catInfo.label : "Overall (fumble-adjusted)";

  const metricFor = (grades: typeof filtered): number | null =>
    categoryFilter === "all"
      ? overallAverage(grades)
      : categoryAverage(grades, categoryFilter).avg;

  const groupGrade = metricFor(filtered);
  const groupBand = gradeBand(groupGrade);

  const totalFumbles = fumbleCount(filtered);
  const winPct = winningRepPct(filtered, catInfo?.key);
  const domPct = dominantRepPct(filtered, catInfo?.key);

  const playsWithGrade = filtered
    .map((g) => ({ g, grade: playGrade(g) }))
    .filter((x): x is { g: (typeof filtered)[number]; grade: number } => x.grade !== null);
  const bestPlay = playsWithGrade.reduce(
    (a, b) => (b.grade > (a?.grade ?? -1) ? b : a),
    null as (typeof playsWithGrade)[number] | null
  );
  const worstPlay = playsWithGrade.reduce(
    (a, b) => (b.grade < (a?.grade ?? 99) ? b : a),
    null as (typeof playsWithGrade)[number] | null
  );
  const playLabel = (x: { g: { playerId: string; playName: string } } | null) => {
    if (!x) return "—";
    const p = store.players.find((pl) => pl.id === x.g.playerId);
    return `${x.g.playName} (${p ? "#" + p.number + " " + p.name : "?"})`;
  };

  const distRows: DistRow[] = (catInfo ? [catInfo] : [...CATEGORIES]).map((c) => {
    const d = distribution(filtered, c.key);
    return { name: c.short, zeros: d.zeros, ones: d.ones, twos: d.twos, threes: d.threes, na: d.na };
  });

  // Chart 1: per-player grade for the selected metric
  const playerBars: BarDatum[] = playerStats
    .map((s) => {
      const pg = filtered.filter((g) => g.playerId === s.playerId);
      const stat =
        categoryFilter === "all"
          ? { avg: s.overall, count: s.plays }
          : s.perCategory[categoryFilter];
      return {
        name: `#${s.number} ${s.name}`,
        value: pg.length ? stat.avg : null,
        count: categoryFilter === "all" ? s.plays : stat.count,
        color: catInfo?.color ?? SCARLET,
      };
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));

  // Chart 2: group average per category
  const categoryBars: BarDatum[] = CATEGORIES.map((c) => {
    const stat = categoryAverage(filtered, c.key);
    return { name: c.short, value: stat.avg, count: stat.count, color: c.color };
  });

  // Chart 3: trend by game (ignores the game filter so you can see the season)
  const selectedPlayer = store.players.find((p) => p.id === playerFilter);
  const trendData: TrendDatum[] = sortedGames.map((game) => {
    const gg = store.grades.filter((g) => g.gameId === game.id);
    const pg = selectedPlayer ? gg.filter((g) => g.playerId === selectedPlayer.id) : [];
    return {
      game: `${game.opponent}`,
      group: metricFor(gg),
      player: selectedPlayer ? metricFor(pg) : undefined,
    };
  });

  function exportCsv() {
    const header = [
      "Game",
      "Date",
      "Player",
      "Number",
      "Play",
      ...CATEGORIES.map((c) => c.label),
      "Fumble",
      "Graded At",
    ];
    const rows = store.grades.map((g) => {
      const game = store.games.find((gm) => gm.id === g.gameId);
      const player = store.players.find((p) => p.id === g.playerId);
      return [
        game ? `vs ${game.opponent}` : "",
        game?.date ?? "",
        player?.name ?? "",
        player?.number ?? "",
        g.playName,
        ...CATEGORIES.map((c) => (g.scores[c.key] === null ? "N/A" : String(g.scores[c.key]))),
        g.fumble ? "YES" : "",
        g.createdAt,
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rb-grades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!store.loaded) return null;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label>Game</Label>
            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All games</SelectItem>
                {sortedGames.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    vs {g.opponent} ({g.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label>Player</Label>
            <Select value={playerFilter} onValueChange={setPlayerFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All players (group)</SelectItem>
                {store.players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.number} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label>Category</Label>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as "all" | CategoryKey)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Overall (fumble-adjusted)</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className={cn(groupBand.bg)}>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {playerFilter === "all" ? "Group Grade" : "Player Grade"} — {metricLabel}
            </p>
            <p className={cn("text-3xl font-black", groupBand.text)}>
              {fmt(groupGrade)}
              {groupGrade !== null && (
                <span className="ml-2 text-xl font-bold opacity-80">
                  {Math.round(pctOf3(groupGrade) as number)}%
                </span>
              )}
            </p>
            <p className={cn("text-sm font-semibold", groupBand.text)}>{groupBand.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plays Graded (filtered)
            </p>
            <p className="text-3xl font-black text-gray-900">{filtered.length}</p>
            <p className={totalFumbles > 0 ? "text-sm font-semibold text-red-700" : "text-sm text-muted-foreground"}>
              {totalFumbles} fumble{totalFumbles === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Top Player — {catInfo ? catInfo.short : "Overall"}
            </p>
            <p className="truncate text-3xl font-black text-gray-900">
              {playerBars.find((b) => b.value !== null)?.name ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {fmtWithPct(playerBars.find((b) => b.value !== null)?.value ?? null)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rep-level stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Winning Rep % (2+)
            </p>
            <p className="text-3xl font-black text-gray-900">{fmtPct(winPct)}</p>
            <p className="text-sm text-muted-foreground">{metricLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dominant Rep % (3s)
            </p>
            <p className="text-3xl font-black text-gray-900">{fmtPct(domPct)}</p>
            <p className="text-sm text-muted-foreground">{metricLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Best Play
            </p>
            <p className="truncate text-lg font-black text-emerald-700">{playLabel(bestPlay)}</p>
            <p className="text-sm text-muted-foreground">
              Play grade {fmtWithPct(bestPlay?.grade ?? null)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Toughest Play
            </p>
            <p className="truncate text-lg font-black text-red-700">{playLabel(worstPlay)}</p>
            <p className="text-sm text-muted-foreground">
              Play grade {fmtWithPct(worstPlay?.grade ?? null)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GradeBarChart
          title={`Player Grades — ${catInfo ? catInfo.label : "Overall"}`}
          subtitle="0–3 scale · dashed line = 2.00 standard · overall deducts 20% per fumble"
          data={playerBars}
        />
        <GradeBarChart
          title="Group Average by Category"
          subtitle="Across all filtered plays"
          data={categoryBars}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScoreDistributionChart
          title="Rep Score Distribution"
          subtitle="Share of scored reps graded 1 / 2 / 3 (N/A excluded)"
          data={distRows}
        />
        <TrendChart
          title={`Game-by-Game Trend — ${catInfo ? catInfo.label : "Overall"}`}
          subtitle="Season view (all games, regardless of game filter)"
          data={trendData}
          playerName={selectedPlayer ? `#${selectedPlayer.number} ${selectedPlayer.name}` : undefined}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Grade Table — Player × Category</CardTitle>
          <p className="text-xs text-muted-foreground">
            Average grade with rep count in parentheses. N/A reps don&apos;t count against a player. Overall deducts 20% per fumble. Win % = reps graded 2+. Consistency = play-grade spread (lower is steadier).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                {CATEGORIES.map((c) => (
                  <TableHead key={c.key} className="text-center">
                    {c.short}
                  </TableHead>
                ))}
                <TableHead className="text-center">Fumbles</TableHead>
                <TableHead className="text-center font-bold">Overall</TableHead>
                <TableHead className="text-center">Win %</TableHead>
                <TableHead className="text-center">3 %</TableHead>
                <TableHead className="text-center">Consistency</TableHead>
                <TableHead className="text-center">Plays</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No players match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                playerStats.map((s) => (
                  <TableRow key={s.playerId}>
                    <TableCell className="font-semibold">
                      #{s.number} {s.name}
                    </TableCell>
                    {CATEGORIES.map((c) => {
                      const st = s.perCategory[c.key];
                      const band = gradeBand(st.avg);
                      return (
                        <TableCell
                          key={c.key}
                          className={cn("text-center", band.bg, band.text)}
                        >
                          <span className="font-bold">{fmt(st.avg)}</span>{" "}
                          <span className="text-xs opacity-70">({st.count})</span>
                        </TableCell>
                      );
                    })}
                    <TableCell
                      className={cn(
                        "text-center font-bold",
                        s.fumbles > 0 ? "text-red-700" : "text-muted-foreground"
                      )}
                    >
                      {s.fumbles}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center text-base font-black",
                        gradeBand(s.overall).text
                      )}
                    >
                      {fmt(s.overall)}
                      {s.overall !== null && (
                        <span className="ml-1 text-xs font-semibold opacity-70">
                          ({Math.round(pctOf3(s.overall) as number)}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{fmtPct(s.winningPct)}</TableCell>
                    <TableCell className="text-center">{fmtPct(s.dominantPct)}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {s.stdDev === null ? "—" : "±" + s.stdDev.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">{s.plays}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Play-by-play log */}
      <PlayLog grades={filtered} games={store.games} players={store.players} />
    </div>
  );
}
