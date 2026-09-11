"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { getSessionUser, logOut, type PublicUser } from "@/lib/auth";
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

  useEffect(() => {
    setUser(getSessionUser());
  }, []);

  // The blocking script in layout.tsx already applied the correct class to
  // <html> before paint — this just syncs React's state to match it, so the
  // toggle button reflects reality without touching the DOM a second time.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("lifeos:dark");
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
      window.localStorage.setItem("lifeos:dark", dark ? "1" : "0");
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
    <AuthedApp user={user} dark={dark} setDark={setDark} view={view} setView={setView}
      paletteOpen={paletteOpen} setPaletteOpen={setPaletteOpen} onLogOut={() => { logOut(); setUser(null); }} />
  );
}

function AuthedApp({
  user, dark, setDark, view, setView, paletteOpen, setPaletteOpen, onLogOut,
}: {
  user: PublicUser; dark: boolean; setDark: (fn: (d: boolean) => boolean) => void;
  view: string; setView: (v: string) => void; paletteOpen: boolean; setPaletteOpen: (v: boolean) => void;
  onLogOut: () => void;
}) {
  const { state, loading, saveError, actions } = useLifeOSStore(user.id);
  const ViewComponent = VIEWS[view];

  if (loading || !state) {
    return <div className="min-h-screen flex items-center justify-center"><Loading label="Loading your data" /></div>;
  }

  return (
    <>
      <div className="flex">
        <NavRail view={view} setView={setView} dark={dark} setDark={setDark} user={user} onLogOut={onLogOut} />
        <div className="flex-1 min-w-0">
          <MobileNav view={view} setView={setView} />
          <TopBar onQuickAdd={() => setPaletteOpen(true)} />
          <div className="px-4 md:px-8 py-5 md:py-6 max-w-[1080px]">
            <ViewComponent state={state} actions={actions} />
          </div>
        </div>
      </div>

      <button onClick={() => setPaletteOpen(true)}
        className="md:hidden fixed bottom-5 right-5 rounded-full btn-primary flex items-center justify-center z-40"
        style={{ width: 52, height: 52, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
        <Plus size={22} />
      </button>

      {saveError && (
        <div className="fixed bottom-4 left-4 chip z-40" style={{ color: "var(--tasks)", background: "var(--surface)" }}>
          <AlertCircle size={11} /> Changes aren&apos;t saving right now
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} state={state} actions={actions} />
    </>
  );
}