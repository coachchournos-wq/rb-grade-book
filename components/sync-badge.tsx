"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncStatus } from "@/hooks/use-grading-store";

export function SyncBadge({
  status,
  onRefresh,
}: {
  status: SyncStatus;
  onRefresh: () => void;
}) {
  const cfg =
    status === "synced"
      ? { dot: "bg-emerald-500", label: "Synced to team database" }
      : status === "syncing"
        ? { dot: "bg-amber-400 animate-pulse", label: "Syncing…" }
        : { dot: "bg-red-500", label: "Offline — saving on this device, will sync when back online" };

  return (
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <span className={cn("inline-block h-2 w-2 rounded-full", cfg.dot)} />
      {cfg.label}
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh from team database"
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100 hover:text-gray-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
