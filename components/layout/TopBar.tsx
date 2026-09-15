"use client";
import { Search } from "lucide-react";

export default function TopBar({ onQuickAdd }: { onQuickAdd: () => void }) {
  return (
    <div className="hidden md:flex items-center justify-end gap-3 px-8 pt-5">
      <button onClick={onQuickAdd} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hairline border text-dim">
        <Search size={12} /> Quick add <span className="kbd">Ctrl + K</span>
      </button>
    </div>
  );
}
