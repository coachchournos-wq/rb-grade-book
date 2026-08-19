"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Rep-score status colors: 1 = loss, 2 = solid, 3 = dominant
const SCORE_COLORS = { zero: "#7F1D1D", one: "#C8102E", two: "#E5A83B", three: "#2E7D32" };

export interface DistRow {
  name: string;
  zeros: number;
  ones: number;
  twos: number;
  threes: number;
  na: number;
}

export function ScoreDistributionChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: DistRow[];
}) {
  const rows = data
    .map((r) => {
      const scored = r.zeros + r.ones + r.twos + r.threes;
      return {
        ...r,
        scored,
        p0: scored ? (r.zeros / scored) * 100 : 0,
        p1: scored ? (r.ones / scored) * 100 : 0,
        p2: scored ? (r.twos / scored) * 100 : 0,
        p3: scored ? (r.threes / scored) * 100 : 0,
      };
    })
    .filter((r) => r.scored > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No graded reps match the current filters.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 52)}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <Tooltip
                formatter={(v: number, name, item) => {
                  const r = item.payload as DistRow & { scored: number };
                  const count =
                    name === "Graded 0"
                      ? r.zeros
                      : name === "Graded 1"
                        ? r.ones
                        : name === "Graded 2"
                          ? r.twos
                          : r.threes;
                  return [`${Math.round(v)}% (${count} of ${r.scored} reps)`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="p0" name="Graded 0" stackId="s" fill={SCORE_COLORS.zero} barSize={22} stroke="#ffffff" strokeWidth={2} />
              <Bar dataKey="p1" name="Graded 1" stackId="s" fill={SCORE_COLORS.one} barSize={22} stroke="#ffffff" strokeWidth={2} />
              <Bar dataKey="p2" name="Graded 2" stackId="s" fill={SCORE_COLORS.two} barSize={22} stroke="#ffffff" strokeWidth={2} />
              <Bar dataKey="p3" name="Graded 3" stackId="s" fill={SCORE_COLORS.three} barSize={22} stroke="#ffffff" strokeWidth={2} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
