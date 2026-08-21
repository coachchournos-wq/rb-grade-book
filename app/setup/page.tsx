"use client";

import { useRef, useState } from "react";
import { useGradingStore } from "@/hooks/use-grading-store";
import { SyncBadge } from "@/components/sync-badge";
import { GradingData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash, Plus, Download, Upload, Zap, X } from "lucide-react";

export default function SetupPage() {
  const store = useGradingStore();
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [newPlay, setNewPlay] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function addGame() {
    if (!opponent.trim() || !date) return;
    store.addGame(opponent, date);
    setOpponent("");
    setDate("");
  }

  function addPlayer() {
    if (!playerName.trim()) return;
    store.addPlayer(playerName, playerNumber);
    setPlayerName("");
    setPlayerNumber("");
  }


  function loadSampleData() {
    if (
      (store.games.length || store.players.length) &&
      !window.confirm("This replaces current data with sample data. Continue?")
    )
      return;
    const games = [
      { id: "g1", opponent: "Sky View", date: "2026-08-14" },
      { id: "g2", opponent: "Ridgeline", date: "2026-08-21" },
      { id: "g3", opponent: "Green Canyon", date: "2026-08-28" },
    ];
    const players = [
      { id: "p1", name: "J. Thompson", number: "22" },
      { id: "p2", name: "C. Munns", number: "34" },
      { id: "p3", name: "T. Fonnesbeck", number: "5" },
    ];
    const samplePlays = [
      "Power Right",
      "Power Left",
      "Counter Trey",
      "Iso Weak",
      "Toss Sweep",
      "Zone Read",
    ];
    const cats = ["firstManMiss", "finishForward", "blocking"] as const;
    const grades = [] as import("@/lib/types").PlayGrade[];
    let n = 0;
    games.forEach((g, gi) => {
      players.forEach((p, pi) => {
        for (let i = 0; i < 6; i++) {
          const scores = {} as Record<(typeof cats)[number], 0 | 1 | 2 | 3 | null>;
          cats.forEach((c, ci) => {
            const r = (gi * 7 + pi * 5 + i * 3 + ci) % 10;
            scores[c] = r === 0 ? null : r === 1 ? 0 : r < 4 ? 1 : r < 7 ? 2 : 3;
          });
          grades.push({
            id: "s" + n++,
            gameId: g.id,
            playerId: p.id,
            playName: samplePlays[i % samplePlays.length],
            scores,
            fumble: (gi * 7 + pi * 5 + i * 3) % 13 === 4,
            createdAt: new Date().toISOString(),
          });
        }
      });
    });
    store.importData({ games, players, grades, plays: samplePlays });
  }

  function addPlayToBook() {
    if (!newPlay.trim()) return;
    store.addPlay(newPlay);
    setNewPlay("");
  }

  function exportBackup() {
    const payload: GradingData = {
      games: store.games,
      players: store.players,
      grades: store.grades,
      plays: store.plays,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rb-grades-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as GradingData;
        if (!parsed.games || !parsed.players || !parsed.grades) throw new Error("bad file");
        if (
          window.confirm(
            "Importing replaces ALL current data with the backup file. Continue?"
          )
        ) {
          store.importData(parsed);
        }
      } catch {
        window.alert("That file doesn't look like a valid backup.");
      }
    };
    reader.readAsText(file);
  }

  if (!store.loaded) return null;

  return (
    <div className="space-y-6">
      <SyncBadge status={store.syncStatus} onRefresh={store.refresh} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Games <Badge variant="secondary" className="ml-1">{store.games.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Opponent</Label>
                <Input
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="e.g. Sky View"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <Button onClick={addGame} className="bg-[#C8102E] hover:bg-[#A00D25]">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <Separator />
            {store.games.length === 0 ? (
              <p className="text-sm text-muted-foreground">No games yet.</p>
            ) : (
              <ul className="divide-y">
                {[...store.games]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((g) => {
                    const count = store.grades.filter((gr) => gr.gameId === g.id).length;
                    return (
                      <li key={g.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-semibold">vs {g.opponent}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.date} · {count} plays graded
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete game"
                          onClick={() => {
                            if (
                              count === 0 ||
                              window.confirm(
                                `Delete vs ${g.opponent} and its ${count} graded plays?`
                              )
                            )
                              store.removeGame(g.id);
                          }}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Running Backs{" "}
              <Badge variant="secondary" className="ml-1">{store.players.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="w-full space-y-1.5 sm:w-20">
                <Label>#</Label>
                <Input
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value)}
                  placeholder="22"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Player name"
                />
              </div>
              <Button onClick={addPlayer} className="bg-[#C8102E] hover:bg-[#A00D25]">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <Separator />
            {store.players.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players yet.</p>
            ) : (
              <ul className="divide-y">
                {store.players.map((p) => {
                  const count = store.grades.filter((gr) => gr.playerId === p.id).length;
                  return (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-semibold">
                          #{p.number} {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{count} plays graded</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete player"
                        onClick={() => {
                          if (
                            count === 0 ||
                            window.confirm(
                              `Delete #${p.number} ${p.name} and their ${count} graded plays?`
                            )
                          )
                            store.removePlayer(p.id);
                        }}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Playbook{" "}
            <Badge variant="secondary" className="ml-1">{store.plays.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Plays are added here automatically when you grade them. You can also pre-load your
            playbook. Removing a play doesn&apos;t delete any grades.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Play name</Label>
              <Input
                value={newPlay}
                onChange={(e) => setNewPlay(e.target.value)}
                placeholder="e.g. Power Right"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPlayToBook();
                }}
              />
            </div>
            <Button onClick={addPlayToBook} className="bg-[#C8102E] hover:bg-[#A00D25]">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          {store.plays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plays yet — grade a play or add them here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...store.plays]
                .sort((a, b) => a.localeCompare(b))
                .map((name) => {
                  const count = store.grades.filter((g) => g.playName === name).length;
                  return (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-3 pr-1.5 text-sm font-medium"
                    >
                      {name}
                      <span className="text-xs text-muted-foreground">({count})</span>
                      <button
                        type="button"
                        aria-label={`Remove ${name} from playbook`}
                        onClick={() => store.removePlay(name)}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-[#C8102E]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup &amp; Restore</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={exportBackup}>
            <Download className="mr-2 h-4 w-4" /> Download backup (JSON)
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Restore from backup
          </Button>
          <Button variant="outline" onClick={loadSampleData}>
            <Zap className="mr-2 h-4 w-4" /> Load sample data
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
          <p className="self-center text-xs text-muted-foreground">
            Data now syncs to the shared team database automatically. Backups are still handy for
            season archives.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
