"use client";

import { cn } from "@/lib/utils";
import { Score } from "@/lib/types";

interface ScorePickerProps {
  label: string;
  color: string;
  value: Score | undefined; // undefined = not yet chosen
  onChange: (value: Score) => void;
}

const OPTIONS: { value: Score; label: string }[] = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: null, label: "N/A" },
];

export function ScorePicker({ label, color, value, onChange }: ScorePickerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {OPTIONS.map((opt) => {
          const selected = value !== undefined && value === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "h-11 min-w-[2.6rem] rounded-lg border-2 text-base font-bold transition-colors",
                selected
                  ? "border-[#C8102E] bg-[#C8102E] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#C8102E] hover:text-[#C8102E]"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
