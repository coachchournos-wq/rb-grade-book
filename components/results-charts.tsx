"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const SCARLET = "#C8102E";
export const NAVY = "#1D6FB8";

const AXIS = { fontSize: 12, fill: "#6b7280" };

function numFmt(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : Number(v).toFixed(2);
}

function pctFmt(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : `${Math.round((Number(v) / 3) * 100)}%`;
}

export interface BarDatum {
  name: string;
  value: number | null;
  count: number;
  color?: string;
}

export function GradeBarChart({
  title,
  subtitle,
  data,
  defaultColor = SCARLET,
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  defaultColor?: string;
}) {
  const plotted = data.filter((d) => d.value !== null);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {plotted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No graded plays match the current filters.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, plotted.length * 48)}>
            <BarChart data={plotted} layout="vertical" margin={{ left: 8, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={AXIS} />
              <YAxis type="category" dataKey="name" width={120} tick={AXIS} />
              <Tooltip
                formatter={(v: number, _n, item) => [
                  `${numFmt(v)} of 3 (${pctFmt(v)}) · ${(item.payload as BarDatum).count} reps`,
                  "Grade",
                ]}
              />
              <ReferenceLine x={2} stroke="#9ca3af" strokeDasharray="4 4" />
              <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]} fill={defaultColor}>
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => `${numFmt(v)} · ${pctFmt(v)}`}
                  style={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
                />
                {plotted.map((d, i) => (
                  <Cell key={i} fill={d.color ?? defaultColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export interface TrendDatum {
  game: string;
  group: number | null;
  player?: number | null;
}

export function TrendChart({
  title,
  subtitle,
  data,
  playerName,
}: {
  title: string;
  subtitle?: string;
  data: TrendDatum[];
  playerName?: string;
}) {
  const hasData = data.some((d) => d.group !== null || d.player !== null);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Grade plays across multiple games to see the trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ left: -16, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="game" tick={AXIS} />
              <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={AXIS} />
              <Tooltip formatter={(v: number) => `${numFmt(v)} (${pctFmt(v)})`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={2} stroke="#9ca3af" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="group"
                name="Group average"
                stroke={SCARLET}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
              {playerName && (
                <Line
                  type="monotone"
                  dataKey="player"
                  name={playerName}
                  stroke={NAVY}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 4 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
