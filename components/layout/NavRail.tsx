"use client";
import { useState } from "react";
import { Sun, Moon, LogOut, RotateCcw, UserCog } from "lucide-react";
import { NAV_ITEMS } from "@/lib/domains";
import type { PublicUser } from "@/lib/auth";
import type { LifeOSState } from "@/lib/types";
import ConfirmModal from "@/components/shared/ConfirmModal";
import AccountPage from "@/components/account/AccountPage";

export default function NavRail({
  view, setView, dark, setDark, user, state, onLogOut, onClearData, onUserUpdate,
}: {
  view: string; setView: (v: string) => void; dark: boolean; setDark: (fn: (d: boolean) => boolean) => void;
  user: PublicUser; state: LifeOSState; onLogOut: () => void; onClearData: () => void; onUserUpdate: (user: PublicUser) => void;
}) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [manageAccountOpen, setManageAccountOpen] = useState(false);

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
        <button onClick={() => setManageAccountOpen(true)}
          className="row-hover w-full text-left px-2.5 py-2 rounded-lg mb-1">
          <div className="text-xs font-medium truncate">{user.username || user.name}</div>
          <div className="text-[10px] text-faint truncate">{user.email}</div>
        </button>
        <button onClick={() => setManageAccountOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <UserCog size={14} /> Manage account
        </button>
        <button onClick={() => setDark((d) => !d)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? "Light mode" : "Dark mode"}
        </button>
        <button onClick={() => setClearConfirmOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <RotateCcw size={14} /> Clear data
        </button>
        <button onClick={() => setLogoutConfirmOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-dim row-hover">
          <LogOut size={14} /> Log out
        </button>
      </div>

      {clearConfirmOpen && (
        <ConfirmModal
          title="Clear all data?"
          message="This permanently deletes every task, habit, goal, health log and academic record on this account including any example template data. This can't be undone."
          confirmLabel="Clear everything"
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => { onClearData(); setClearConfirmOpen(false); }}
        />
      )}

      {logoutConfirmOpen && (
        <ConfirmModal
          title="Log out?"
          message="You'll need to log back in to see your data again."
          confirmLabel="Log out"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => { setLogoutConfirmOpen(false); onLogOut(); }}
        />
      )}

      {manageAccountOpen && (
        <AccountPage user={user} state={state} onClose={() => setManageAccountOpen(false)} onUpdated={onUserUpdate} />
      )}
    </div>
  );
}