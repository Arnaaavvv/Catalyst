"use client";
import { Search, Flame } from "lucide-react";
import { accountStreak } from "@/lib/derived";
import type { LifeOSState } from "@/lib/types";

export default function TopBar({ state, onQuickAdd }: { state: LifeOSState; onQuickAdd: () => void }) {
  const streak = accountStreak(state);
  return (
    <div className="hidden md:flex items-center justify-end gap-3 px-8 pt-5">
      <button onClick={onQuickAdd} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hairline border text-dim">
        <Search size={12} /> Quick add <span className="kbd">Ctrl + K</span>
      </button>
      {streak > 0 && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hairline border font-mono"
          style={{ color: "var(--accent)" }}
          title={`${streak}-day tracking streak — logged something every day for the last ${streak} day${streak === 1 ? "" : "s"}`}
        >
          <Flame size={12} /> {streak}
        </div>
      )}
    </div>
  );
}