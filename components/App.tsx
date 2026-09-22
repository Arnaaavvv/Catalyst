"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { getSessionUser, logOut, onAuthChange, type PublicUser } from "@/lib/auth";
import { useLifeOSStore } from "@/hooks/useLifeOSStore";
import AuthScreen from "@/components/auth/AuthScreen";
import NavRail from "@/components/layout/NavRail";
import MobileNav from "@/components/layout/MobileNav";
import TopBar from "@/components/layout/TopBar";
import CommandPalette from "@/components/quickadd/CommandPalette";
import { Loading } from "@/components/shared/Primitives";
import TodayView from "@/components/views/TodayView";
import HealthView from "@/components/views/HealthView";
import HabitsView from "@/components/views/HabitsView";
import GoalsView from "@/components/views/GoalsView";
import TasksView from "@/components/views/TasksView";
import AcademicsView from "@/components/views/AcademicsView";
import InsightsView from "@/components/views/InsightsView";
import TimelineView from "@/components/views/TimelineView";

const VIEWS: Record<string, React.ComponentType<any>> = {
  today: TodayView, health: HealthView, habits: HabitsView, goals: GoalsView,
  tasks: TasksView, academics: AcademicsView, insights: InsightsView, timeline: TimelineView,
};

export default function App() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined); // undefined = checking
  const [view, setView] = useState("today");
  const [dark, setDark] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // getSession() gives us the current session immediately on mount (it reads
  // from Supabase's own local storage, no network round-trip needed); the
  // onAuthChange subscription then keeps `user` in sync with anything that
  // happens afterward — token refresh, or signing out in another tab, both
  // update `user` here without a page reload.
  useEffect(() => {
    let active = true;
    getSessionUser().then((u) => {
      if (active) setUser(u);
    });
    const unsubscribe = onAuthChange((u) => {
      if (active) setUser(u);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // The blocking script in layout.tsx already applied the correct class to
  // <html> before paint — this just syncs React's state to match it, so the
  // toggle button reflects reality without touching the DOM a second time.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("catalyst:dark");
      if (stored !== null) setDark(stored === "1");
    } catch {
      /* ignore — falls back to the default */
    }
  }, []);

  // Applies on every *change* to `dark` — but skips its own first run, since
  // the mount-time value already matches the DOM (see above). Without that
  // guard this would re-apply the hardcoded default on mount before the sync
  // effect's setDark takes effect, causing a one-frame flash for anyone whose
  // stored preference differs from the default.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    document.documentElement.classList.toggle("dark", dark);
    try {
      window.localStorage.setItem("catalyst:dark", dark ? "1" : "0");
    } catch {
      /* localStorage unavailable — theme just won't persist across reloads */
    }
  }, [dark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading label="Checking session" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }

  return (
    <AuthedApp user={user} onUserUpdate={setUser} dark={dark} setDark={setDark} view={view} setView={setView}
      paletteOpen={paletteOpen} setPaletteOpen={setPaletteOpen} onLogOut={() => { setUser(null); void logOut(); }} />
  );
}

function AuthedApp({
  user, onUserUpdate, dark, setDark, view, setView, paletteOpen, setPaletteOpen, onLogOut,
}: {
  user: PublicUser; onUserUpdate: (user: PublicUser) => void; dark: boolean; setDark: (fn: (d: boolean) => boolean) => void;
  view: string; setView: (v: string) => void; paletteOpen: boolean; setPaletteOpen: (v: boolean) => void;
  onLogOut: () => void;
}) {
  const { state, status, loadError, saveError, actions, retry } = useLifeOSStore(user.id);
  const ViewComponent = VIEWS[view];

  // The bottom tab bar swaps whole pages while the window keeps its scroll
  // offset, so a new view would open halfway down. Desktop is left as it was.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) window.scrollTo(0, 0);
  }, [view]);

  // Check error before loading/!state: a load failure sets status to "error"
  // but never sets state, so state stays null — if the loading check ran
  // first, `!state` would always be true and this error branch (and its
  // "Try again" button) could never be reached, leaving a permanent spinner.
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="surface rounded-2xl p-6 max-w-sm text-center">
          <AlertCircle size={18} style={{ color: "var(--tasks)" }} className="mx-auto mb-3" />
          <h2 className="font-display text-lg mb-2">Couldn&apos;t load your data</h2>
          <p className="text-sm text-dim leading-relaxed mb-5">{loadError}</p>
          <button onClick={retry} className="btn-primary w-full py-2.5 rounded-lg text-sm">Try again</button>
        </div>
      </div>
    );
  }

  if (status === "loading" || !state) {
    return <div className="min-h-screen flex items-center justify-center"><Loading label="Loading your data" /></div>;
  }


  return (
    <>
      <div className="flex">
        <NavRail view={view} setView={setView} dark={dark} setDark={setDark} user={user} state={state} onLogOut={onLogOut} onClearData={actions.clearAllData} onUserUpdate={onUserUpdate} />
        <div className="flex-1 min-w-0">
          <TopBar onQuickAdd={() => setPaletteOpen(true)} />
          <div className="px-4 md:px-8 pt-5 md:pt-6 app-content max-w-[1080px]">
            <ViewComponent state={state} actions={actions} />
          </div>
        </div>
      </div>

      <MobileNav view={view} setView={setView} dark={dark} setDark={setDark} user={user} state={state}
        onLogOut={onLogOut} onClearData={actions.clearAllData} onUserUpdate={onUserUpdate} />

      <button onClick={() => setPaletteOpen(true)} aria-label="Quick add"
        className="md:hidden fixed mobile-fab right-5 rounded-full btn-primary flex items-center justify-center z-40"
        style={{ width: 52, height: 52, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
        <Plus size={22} />
      </button>

      {saveError && (
        <div className="fixed mobile-toast left-4 chip z-40" style={{ color: "var(--tasks)", background: "var(--surface)" }}>
          <AlertCircle size={11} /> Changes aren&apos;t saving right now
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} state={state} actions={actions} />
    </>
  );
}