"use client";
import { useState } from "react";
import { Menu, Sun, Moon, LogOut, RotateCcw, UserCog, X, type LucideIcon } from "lucide-react";
import { NAV_ITEMS } from "@/lib/domains";
import type { PublicUser } from "@/lib/auth";
import type { LifeOSState } from "@/lib/types";
import Portal from "@/components/shared/Portal";
import AccountDialogs, { type AccountDialog } from "@/components/layout/AccountDialogs";

// Eight sections don't fit a thumb-reach tab bar. The four used most stay one
// tap away; the rest sit under "More", next to the account actions the desktop
// rail keeps in its footer (which don't exist anywhere else on a phone).
const PRIMARY_IDS = ["today", "tasks", "habits", "goals"];
const primary = PRIMARY_IDS.flatMap((id) => NAV_ITEMS.filter((i) => i.id === id));
const secondary = NAV_ITEMS.filter((i) => !PRIMARY_IDS.includes(i.id));

function Tab({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined}
      className="relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px]"
      style={{ color: active ? "var(--accent)" : "var(--ink-dim)", fontWeight: active ? 600 : 400 }}>
      {active && <span className="absolute top-0 h-[2px] w-8 rounded-b" style={{ background: "var(--accent)" }} />}
      <Icon size={18} />
      {label}
    </button>
  );
}

function SheetAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="row-hover w-full flex items-center gap-3 px-2.5 py-3 rounded-lg text-sm text-dim">
      <Icon size={15} /> {label}
    </button>
  );
}

export default function MobileNav({
  view, setView, dark, setDark, user, state, onLogOut, onClearData, onUserUpdate,
}: {
  view: string; setView: (v: string) => void; dark: boolean; setDark: (fn: (d: boolean) => boolean) => void;
  user: PublicUser; state: LifeOSState; onLogOut: () => void; onClearData: () => void; onUserUpdate: (user: PublicUser) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [dialog, setDialog] = useState<AccountDialog>(null);

  const openDialog = (d: AccountDialog) => { setMoreOpen(false); setDialog(d); };

  return (
    <>
      <nav aria-label="Sections" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t hairline"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex" style={{ height: "var(--tabbar-h)" }}>
          {primary.map((item) => (
            <Tab key={item.id} icon={item.icon} label={item.label} active={view === item.id} onClick={() => setView(item.id)} />
          ))}
          <Tab icon={Menu} label="More" active={moreOpen || secondary.some((i) => i.id === view)} onClick={() => setMoreOpen(true)} />
        </div>
      </nav>

      {moreOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }}
            onMouseDown={() => setMoreOpen(false)}>
            <div className="sheet-panel surface w-full rounded-t-2xl px-4 pt-3 max-h-[85dvh] overflow-y-auto"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -12px 40px rgba(0,0,0,0.25)" }}
              onMouseDown={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-9 rounded-full" style={{ background: "var(--line-strong)" }} />

              <div className="grid grid-cols-2 gap-2 mb-3">
                {secondary.map((item) => {
                  const active = view === item.id;
                  return (
                    <button key={item.id} onClick={() => { setView(item.id); setMoreOpen(false); }}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm"
                      style={{ background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "var(--accent-ink)" : "var(--ink)", fontWeight: active ? 600 : 400 }}>
                      <item.icon size={15} /> {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="border-t hairline pt-2">
                <div className="flex items-center justify-between gap-3 px-2.5 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{user.username || user.name}</div>
                    <div className="text-[10px] text-faint truncate">{user.email}</div>
                  </div>
                  <button onClick={() => setMoreOpen(false)} className="icon-btn -mr-2 text-faint" aria-label="Close"><X size={16} /></button>
                </div>
                <SheetAction icon={UserCog} label="Manage account" onClick={() => openDialog("account")} />
                <SheetAction icon={dark ? Sun : Moon} label={dark ? "Light mode" : "Dark mode"} onClick={() => setDark((d) => !d)} />
                <SheetAction icon={RotateCcw} label="Clear data" onClick={() => openDialog("clear")} />
                <SheetAction icon={LogOut} label="Log out" onClick={() => openDialog("logout")} />
              </div>
            </div>
          </div>
        </Portal>
      )}

      <AccountDialogs dialog={dialog} onClose={() => setDialog(null)} user={user} state={state}
        onClearData={onClearData} onLogOut={onLogOut} onUserUpdate={onUserUpdate} />
    </>
  );
}