"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGradingStore } from "@/hooks/use-grading-store";
import { SyncBadge } from "@/components/sync-badge";
import { CATEGORIES, CategoryKey, Score } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScorePicker } from "@/components/score-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash, CheckCircle, AlertCircle } from "lucide-react";

type ScoreMap = Partial<Record<CategoryKey, Score>>;

export default function GradeEntryPage() {
  const store = useGradingStore();
  const [gameId, setGameId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playPick, setPlayPick] = useState(""); // selected playbook play, or "__new__"
  const [playName, setPlayName] = useState(""); // new play name input
  const [scores, setScores] = useState<ScoreMap>({});
  const [fumble, setFumble] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const game = store.games.find((g) => g.id === gameId);
  const player = store.players.find((p) => p.id === playerId);

  const gamePlays = useMemo(
    () =>
      store.grades
        .filter((g) => g.gameId === gameId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.grades, gameId]
  );

  const playbook = useMemo(
    () => [...store.plays].sort((a, b) => a.localeCompare(b)),
    [store.plays]
  );
  const usingNewPlay = playbook.length === 0 || playPick === "__new__";
  const chosenPlay = usingNewPlay ? playName.trim() : playPick;

  const allScored = CATEGORIES.every((c) => scores[c.key] !== undefined);

  function handleSave() {
    setError("");
    if (!gameId) return setError("Select a game first.");
    if (!playerId) return setError("Select a player.");
    if (!chosenPlay) return setError(usingNewPlay ? "Enter the play name." : "Pick a play.");
    if (!allScored) return setError("Score all 3 categories (use N/A if it doesn't apply).");

    store.addGrade({
      gameId,
      playerId,
      playName: chosenPlay,
      scores: {
        firstManMiss: scores.firstManMiss ?? null,
        finishForward: scores.finishForward ?? null,
        blocking: scores.blocking ?? null,
      },
      fumble,
    });
    setSavedMsg(`Saved: ${chosenPlay} — ${player?.name ?? ""}`);
    if (usingNewPlay) {
      setPlayPick(chosenPlay); // new play is now in the playbook — keep it selected
      setPlayName("");
    }
    setScores({});
    setFumble(false);
    setTimeout(() => setSavedMsg(""), 3000);
  }

  if (!store.loaded) return null;

  if (store.games.length === 0 || store.players.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-[#C8102E]" />
          <div>
            <p className="text-lg font-semibold">Set up your games and roster first</p>
            <p className="text-sm text-muted-foreground">
              Add at least one game and one running back before grading plays.
            </p>
          </div>
          <Button asChild className="bg-[#C8102E] hover:bg-[#A00D25]">
            <Link href="/setup">Go to Setup</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SyncBadge status={store.syncStatus} onRefresh={store.refresh} />
      <Card>
        <CardHeader>
          <CardTitle>Grade a Play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Game</Label>
              <Select value={gameId} onValueChange={setGameId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  {store.games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      vs {g.opponent} ({g.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Player</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {store.players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.number} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Play</Label>
              {playbook.length > 0 ? (
                <Select value={playPick} onValueChange={setPlayPick}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick from playbook" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ New play&hellip;</SelectItem>
                    {playbook.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {usingNewPlay && (
                <Input
                  value={playName}
                  onChange={(e) => setPlayName(e.target.value)}
                  placeholder="e.g. Power Right / Play 14"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <ScorePicker
                key={c.key}
                label={c.label}
                color={c.color}
                value={scores[c.key]}
                onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))}
              />
            ))}
            <div className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-gray-900" />
                <span className="text-sm font-semibold text-gray-800">
                  Ball Security{" "}
                  <span className="font-normal text-muted-foreground">
                    (fumble = &minus;20% overall)
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFumble(false)}
                  className={cn(
                    "h-11 min-w-[5rem] rounded-lg border-2 px-3 text-sm font-bold transition-colors",
                    !fumble
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-emerald-600 hover:text-emerald-700"
                  )}
                >
                  Clean
                </button>
                <button
                  type="button"
                  onClick={() => setFumble(true)}
                  className={cn(
                    "h-11 min-w-[5rem] rounded-lg border-2 px-3 text-sm font-bold transition-colors",
                    fumble
                      ? "border-red-700 bg-red-700 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-red-700 hover:text-red-700"
                  )}
                >
                  &#10003; Fumble
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          {savedMsg && (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle className="h-4 w-4" /> {savedMsg}
            </p>
          )}

          <Button
            onClick={handleSave}
            className="h-12 w-full bg-[#C8102E] text-base font-bold hover:bg-[#A00D25]"
          >
            Save Play Grade
          </Button>
        </CardContent>
      </Card>

      {gameId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Plays graded — vs {game?.opponent}{" "}
              <Badge variant="secondary" className="ml-2">
                {gamePlays.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gamePlays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plays graded yet for this game.</p>
            ) : (
              <ul className="divide-y">
                {gamePlays.map((g) => {
                  const p = store.players.find((pl) => pl.id === g.playerId);
                  return (
                    <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {g.playName}{" "}
                          <span className="font-normal text-muted-foreground">
                            — #{p?.number} {p?.name ?? "Unknown"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORIES.map(
                            (c) => `${c.short}: ${g.scores[c.key] ?? "N/A"}`
                          ).join("  ·  ")}
                          {g.fumble ? "  ·  ✓ FUMBLE" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => store.removeGrade(g.id)}
                        aria-label="Delete play grade"
                      >
                        <Trash className="h-4 w-4 text-gray-400" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
