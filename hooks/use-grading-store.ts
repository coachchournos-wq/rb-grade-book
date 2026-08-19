"use client";

import { useCallback, useEffect, useState } from "react";
import { Game, GradingData, PlayGrade, Player } from "@/lib/types";

const KEY = "rb-grading-data-v1";
const EMPTY: GradingData = { games: [], players: [], grades: [], plays: [] };

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useGradingStore() {
  const [data, setData] = useState<GradingData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GradingData;
        // Migrate old records where Ball Security was a 0-3 score
        const grades: PlayGrade[] = (parsed.grades ?? []).map((g) => {
          const legacy = g as PlayGrade & { scores: Record<string, unknown> };
          if (legacy.fumble === undefined) {
            const bs = legacy.scores?.ballSecurity;
            const { ballSecurity: _drop, ...rest } = legacy.scores ?? {};
            return {
              ...legacy,
              scores: rest as PlayGrade["scores"],
              fumble: bs === 0, // old "0" on Ball Security counts as a fumble
            };
          }
          return g;
        });
        const plays =
          parsed.plays && parsed.plays.length > 0
            ? parsed.plays
            : Array.from(new Set(grades.map((g) => g.playName.trim()).filter(Boolean)));
        setData({
          games: parsed.games ?? [],
          players: parsed.players ?? [],
          grades,
          plays,
        });
      }
    } catch {
      // corrupted storage — start fresh
    }
    setLoaded(true);
  }, []);

  const update = useCallback((fn: (d: GradingData) => GradingData) => {
    setData((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage full — ignore
      }
      return next;
    });
  }, []);

  const addGame = useCallback(
    (opponent: string, date: string) => {
      const game: Game = { id: makeId(), opponent: opponent.trim(), date };
      update((d) => ({ ...d, games: [...d.games, game] }));
      return game;
    },
    [update]
  );

  const removeGame = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        games: d.games.filter((g) => g.id !== id),
        grades: d.grades.filter((g) => g.gameId !== id),
      }));
    },
    [update]
  );

  const addPlayer = useCallback(
    (name: string, number: string) => {
      const player: Player = { id: makeId(), name: name.trim(), number: number.trim() };
      update((d) => ({ ...d, players: [...d.players, player] }));
      return player;
    },
    [update]
  );

  const removePlayer = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        players: d.players.filter((p) => p.id !== id),
        grades: d.grades.filter((g) => g.playerId !== id),
      }));
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
      update((d) => ({
        ...d,
        grades: [...d.grades, full],
        plays: d.plays.includes(full.playName) ? d.plays : [...d.plays, full.playName],
      }));
      return full;
    },
    [update]
  );

  const removeGrade = useCallback(
    (id: string) => {
      update((d) => ({ ...d, grades: d.grades.filter((g) => g.id !== id) }));
    },
    [update]
  );

  const addPlay = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      update((d) => (d.plays.includes(clean) ? d : { ...d, plays: [...d.plays, clean] }));
    },
    [update]
  );

  const removePlay = useCallback(
    (name: string) => {
      update((d) => ({ ...d, plays: d.plays.filter((p) => p !== name) }));
    },
    [update]
  );

  const importData = useCallback(
    (incoming: GradingData) => {
      update(() => ({
        ...incoming,
        plays:
          incoming.plays && incoming.plays.length > 0
            ? incoming.plays
            : Array.from(
                new Set((incoming.grades ?? []).map((g) => g.playName.trim()).filter(Boolean))
              ),
      }));
    },
    [update]
  );

  return {
    ...data,
    loaded,
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
