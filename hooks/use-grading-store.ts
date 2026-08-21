"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Game, GradingData, PlayGrade, Player } from "@/lib/types";
import { applyOp, cloudFetchAll, CloudOp, ops, replaceAllOps, seedOps } from "@/lib/cloud";

const KEY = "rb-grading-data-v1";
const QUEUE_KEY = "rb-grading-pending-ops-v1";
const EMPTY: GradingData = { games: [], players: [], grades: [], plays: [] };

export type SyncStatus = "syncing" | "synced" | "offline";

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readLocal(): GradingData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GradingData;
    // Migrate old records where Ball Security was a 0-3 score
    const grades: PlayGrade[] = (parsed.grades ?? []).map((g) => {
      const legacy = g as PlayGrade & { scores: Record<string, unknown> };
      if (legacy.fumble === undefined) {
        const bs = legacy.scores?.ballSecurity;
        const { ballSecurity: _drop, ...rest } = legacy.scores ?? {};
        return { ...legacy, scores: rest as PlayGrade["scores"], fumble: bs === 0 };
      }
      return g;
    });
    const plays =
      parsed.plays && parsed.plays.length > 0
        ? parsed.plays
        : Array.from(new Set(grades.map((g) => g.playName.trim()).filter(Boolean)));
    return { games: parsed.games ?? [], players: parsed.players ?? [], grades, plays };
  } catch {
    return null;
  }
}

function writeLocal(data: GradingData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full — ignore
  }
}

function readQueue(): CloudOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as CloudOp[];
  } catch {
    return [];
  }
}

function writeQueue(q: CloudOp[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export function useGradingStore() {
  const [data, setData] = useState<GradingData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const flushing = useRef(false);

  // Flush queued cloud ops in order; returns true if the queue is now empty
  const flushQueue = useCallback(async (): Promise<boolean> => {
    if (flushing.current) return readQueue().length === 0;
    flushing.current = true;
    try {
      let queue = readQueue();
      while (queue.length > 0) {
        await applyOp(queue[0]);
        queue = queue.slice(1);
        writeQueue(queue);
      }
      return true;
    } catch {
      return false;
    } finally {
      flushing.current = false;
    }
  }, []);

  const enqueue = useCallback(
    (newOps: CloudOp[]) => {
      writeQueue([...readQueue(), ...newOps]);
      setSyncStatus("syncing");
      flushQueue().then((ok) => setSyncStatus(ok ? "synced" : "offline"));
    },
    [flushQueue]
  );

  // Initial load: flush pending ops, pull cloud, seed cloud from local if cloud is empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal();
      try {
        const flushed = await flushQueue();
        if (!flushed) throw new Error("pending ops not flushed");
        const cloud = await cloudFetchAll();
        const cloudEmpty =
          cloud.games.length === 0 && cloud.players.length === 0 && cloud.grades.length === 0;
        if (cloudEmpty && local && (local.games.length || local.players.length || local.grades.length)) {
          // First-time migration: push this device's data up to the team database
          writeQueue(seedOps(local));
          const ok = await flushQueue();
          if (cancelled) return;
          setData(local);
          writeLocal(local);
          setSyncStatus(ok ? "synced" : "offline");
        } else {
          if (cancelled) return;
          setData(cloud);
          writeLocal(cloud);
          setSyncStatus("synced");
        }
      } catch {
        if (cancelled) return;
        if (local) setData(local);
        setSyncStatus("offline");
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [flushQueue]);

  const refresh = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const flushed = await flushQueue();
      if (!flushed) throw new Error("offline");
      const cloud = await cloudFetchAll();
      setData(cloud);
      writeLocal(cloud);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  }, [flushQueue]);

  const update = useCallback(
    (fn: (d: GradingData) => GradingData, cloudOps: CloudOp[]) => {
      setData((prev) => {
        const next = fn(prev);
        writeLocal(next);
        return next;
      });
      enqueue(cloudOps);
    },
    [enqueue]
  );

  const addGame = useCallback(
    (opponent: string, date: string) => {
      const game: Game = { id: makeId(), opponent: opponent.trim(), date };
      update((d) => ({ ...d, games: [...d.games, game] }), [ops.upsertGame(game)]);
      return game;
    },
    [update]
  );

  const removeGame = useCallback(
    (id: string) => {
      update(
        (d) => ({
          ...d,
          games: d.games.filter((g) => g.id !== id),
          grades: d.grades.filter((g) => g.gameId !== id),
        }),
        [ops.deleteGradesForGame(id), ops.deleteGame(id)]
      );
    },
    [update]
  );

  const addPlayer = useCallback(
    (name: string, number: string) => {
      const player: Player = { id: makeId(), name: name.trim(), number: number.trim() };
      update((d) => ({ ...d, players: [...d.players, player] }), [ops.upsertPlayer(player)]);
      return player;
    },
    [update]
  );

  const removePlayer = useCallback(
    (id: string) => {
      update(
        (d) => ({
          ...d,
          players: d.players.filter((p) => p.id !== id),
          grades: d.grades.filter((g) => g.playerId !== id),
        }),
        [ops.deleteGradesForPlayer(id), ops.deletePlayer(id)]
      );
    },
    [update]
  );

  const addGrade = useCallback(
    (grade: Omit<PlayGrade, "id" | "createdAt">) => {
      const full: PlayGrade = {
        ...grade,
        id: makeId(),
        createdAt: new Date().toISOString(),
      };
      const isNewPlay = full.playName.trim().length > 0;
      update(
        (d) => ({
          ...d,
          grades: [...d.grades, full],
          plays: d.plays.includes(full.playName) ? d.plays : [...d.plays, full.playName],
        }),
        isNewPlay ? [ops.upsertPlay(full.playName), ops.upsertGrade(full)] : [ops.upsertGrade(full)]
      );
      return full;
    },
    [update]
  );

  const removeGrade = useCallback(
    (id: string) => {
      update((d) => ({ ...d, grades: d.grades.filter((g) => g.id !== id) }), [
        ops.deleteGrade(id),
      ]);
    },
    [update]
  );

  const addPlay = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      update(
        (d) => (d.plays.includes(clean) ? d : { ...d, plays: [...d.plays, clean] }),
        [ops.upsertPlay(clean)]
      );
    },
    [update]
  );

  const removePlay = useCallback(
    (name: string) => {
      update((d) => ({ ...d, plays: d.plays.filter((p) => p !== name) }), [
        ops.deletePlay(name),
      ]);
    },
    [update]
  );

  const importData = useCallback(
    (incoming: GradingData) => {
      const normalized: GradingData = {
        ...incoming,
        plays:
          incoming.plays && incoming.plays.length > 0
            ? incoming.plays
            : Array.from(
                new Set((incoming.grades ?? []).map((g) => g.playName.trim()).filter(Boolean))
              ),
      };
      update(() => normalized, replaceAllOps(normalized));
    },
    [update]
  );

  return {
    ...data,
    loaded,
    syncStatus,
    refresh,
    addGame,
    removeGame,
    addPlayer,
    removePlayer,
    addGrade,
    removeGrade,
    addPlay,
    removePlay,
    importData,
  };
}
