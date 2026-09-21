"use client";
import { useState } from "react";
import { Sun, Moon, LogOut, RotateCcw, UserCog } from "lucide-react";
import { NAV_ITEMS } from "@/lib/domains";
import type { PublicUser } from "@/lib/auth";
import type { LifeOSState } from "@/lib/types";
import AccountDialogs, { type AccountDialog } from "@/components/layout/AccountDialogs";

export default function NavRail({
  view, setView, dark, setDark, user, state, onLogOut, onClearData, onUserUpdate,
}: {
  view: string; setView: (v: string) => void; dark: boolean; setDark: (fn: (d: boolean) => boolean) => void;
  user: PublicUser; state: LifeOSState; onLogOut: () => void; onClearData: () => void; onUserUpdate: (user: PublicUser) => void;
}) {
  const [dialog, setDialog] = useState<AccountDialog>(null);

  return (
    <div className="hidden md:flex flex-col justify-between w-[190px] flex-shrink-0 py-6 px-4 border-r hairline h-screen sticky top-0">
      <div>
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="font-display text-[13px]" style={{ color: "var(--accent-ink)" }}>C</span>
          </div>
          <span className="font-display text-[15px]">Catalyst</span>
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
        <button onClick={() => setDialog("account")}
          className="row-hover w-full text-left px-2.5 py-2 rounded-lg mb-1">
          <div className="text-xs font-medium truncate">{user.username || user.name}</div>
          <div className="text-[10px] text-faint truncate">{user.email}</div>
        </button>
        <button onClick={() => setDialog("account")} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <UserCog size={14} /> Manage account
        </button>
        <button onClick={() => setDark((d) => !d)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? "Light mode" : "Dark mode"}
        </button>
        <button onClick={() => setDialog("clear")} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <RotateCcw size={14} /> Clear data
        </button>
        <button onClick={() => setDialog("logout")} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <LogOut size={14} /> Log out
        </button>
      </div>

      <AccountDialogs dialog={dialog} onClose={() => setDialog(null)} user={user} state={state}
        onClearData={onClearData} onLogOut={onLogOut} onUserUpdate={onUserUpdate} />
    </div>
  );
}