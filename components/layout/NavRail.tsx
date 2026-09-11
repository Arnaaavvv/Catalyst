"use client";
import { Sun, Moon, LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/domains";
import type { PublicUser } from "@/lib/auth";

export default function NavRail({
  view, setView, dark, setDark, user, onLogOut,
}: {
  view: string; setView: (v: string) => void; dark: boolean; setDark: (fn: (d: boolean) => boolean) => void;
  user: PublicUser; onLogOut: () => void;
}) {
  return (
    <div className="hidden md:flex flex-col justify-between w-[190px] flex-shrink-0 py-6 px-4 border-r hairline h-screen sticky top-0">
      <div>
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="font-display text-[13px]" style={{ color: "var(--accent-ink)" }}>L</span>
          </div>
          <span className="font-display text-[15px]">Life OS</span>
        </div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`rail-btn ${view === item.id ? "active" : ""} w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] row-hover`}
              style={{ color: view === item.id ? "var(--ink)" : "var(--ink-dim)", fontWeight: view === item.id ? 600 : 400 }}>
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        <div className="px-2.5 py-2 mb-1">
          <div className="text-xs font-medium truncate">{user.name}</div>
          <div className="text-[10px] text-faint truncate">{user.email}</div>
        </div>
        <button onClick={() => setDark((d) => !d)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? "Light mode" : "Dark mode"}
        </button>
        <button onClick={onLogOut} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}
