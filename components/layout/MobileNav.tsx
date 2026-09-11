"use client";
import { NAV_ITEMS } from "@/lib/domains";

export default function MobileNav({ view, setView }: { view: string; setView: (v: string) => void }) {
  return (
    <div className="md:hidden flex overflow-x-auto nav-scroll gap-1 px-3 py-2 border-b hairline sticky top-0 z-30" style={{ background: "var(--bg)" }}>
      {NAV_ITEMS.map((item) => (
        <button key={item.id} onClick={() => setView(item.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs flex-shrink-0"
          style={{ background: view === item.id ? "var(--accent)" : "var(--surface-2)", color: view === item.id ? "var(--accent-ink)" : "var(--ink-dim)" }}>
          <item.icon size={12} /> {item.label}
        </button>
      ))}
    </div>
  );
}
