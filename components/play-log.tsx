"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, Game, PlayGrade, Player, Score } from "@/lib/types";
import { fmtWithPct, gradeBand, playGrade } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAX_ROWS = 200;

function scoreChip(v: Score) {
  if (v === null || v === undefined)
    return <span className="inline-block w-8 rounded bg-gray-100 text-center text-xs font-semibold text-gray-400">N/A</span>;
  const cls =
    v === 3
      ? "bg-emerald-100 text-emerald-800"
      : v === 2
        ? "bg-amber-100 text-amber-800"
        : v === 1
          ? "bg-red-100 text-red-800"
          : "bg-red-700 text-white";
  return (
    <span className={cn("inline-block w-8 rounded text-center text-xs font-bold", cls)}>
      {v}
    </span>
  );
}

export function PlayLog({
  grades,
  games,
  players,
}: {
  grades: PlayGrade[];
  games: Game[];
  players: Player[];
}) {
  const [sort, setSort] = useState<"newest" | "best" | "worst">("newest");

  const rows = useMemo(() => {
    const withGrade = grades.map((g) => ({ g, grade: playGrade(g) }));
    const sorted = [...withGrade].sort((a, b) => {
      if (sort === "newest") return b.g.createdAt.localeCompare(a.g.createdAt);
      const av = a.grade ?? -1;
      const bv = b.grade ?? -1;
      return sort === "best" ? bv - av : (a.grade ?? 99) - (b.grade ?? 99);
    });
    return sorted;
  }, [grades, sort]);

  const gameName = (id: string) => {
    const g = games.find((x) => x.id === id);
    return g ? `vs ${g.opponent}` : "—";
  };
  const playerName = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p ? `#${p.number} ${p.name}` : "—";
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">
            Play-by-Play Log{" "}
            <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Play grade = average of that play&apos;s scored categories (N/A excluded), &minus;20% if a fumble occurred
          </p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="best">Best plays first</SelectItem>
            <SelectItem value="worst">Worst plays first</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No plays match the current filters.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Play</TableHead>
                {CATEGORIES.map((c) => (
                  <TableHead key={c.key} className="text-center">{c.short}</TableHead>
                ))}
                <TableHead className="text-center">Ball Sec</TableHead>
                <TableHead className="text-center font-bold">Play Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, MAX_ROWS).map(({ g, grade }) => {
                const band = gradeBand(grade);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {gameName(g.gameId)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {playerName(g.playerId)}
                    </TableCell>
                    <TableCell className="text-sm">{g.playName}</TableCell>
                    {CATEGORIES.map((c) => (
                      <TableCell key={c.key} className="text-center">
                        {scoreChip(g.scores[c.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {g.fumble ? (
                        <span className="inline-block rounded bg-red-700 px-1.5 text-xs font-bold text-white">
                          &#10003; FUM
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("whitespace-nowrap text-center font-black", band.text)}>
                      {fmtWithPct(grade)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {rows.length > MAX_ROWS && (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Showing first {MAX_ROWS} plays — narrow the filters or export CSV for the full list.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
