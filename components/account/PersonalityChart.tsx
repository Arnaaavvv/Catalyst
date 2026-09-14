"use client";
import type { PersonalitySlice } from "@/lib/personality";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export default function PersonalityChart({ slices }: { slices: PersonalitySlice[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 90;
  const rInner = 54;
  const gapDeg = 2.5; // small visual gap between slices, not a real data property

  let cumulative = 0;
  const segments = slices.map((s) => {
    const sweep = s.fraction * 360;
    const start = cumulative + gapDeg / 2;
    const end = cumulative + sweep - gapDeg / 2;
    cumulative += sweep;
    return { ...s, start, end: Math.max(start, end) };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {segments.map((s) => (
          <path key={s.key} d={donutSlicePath(cx, cy, rOuter, rInner, s.start, s.end)} fill={s.color} opacity="0.9" />
        ))}
        <text x={cx} y={cy - 3} textAnchor="middle" fontFamily="Fraunces" fontSize="13" fill="var(--ink)">Personality</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="8" fill="var(--ink-faint)" letterSpacing="0.5">FROM YOUR DATA</text>
      </svg>
      <div className="flex-1 min-w-[180px] space-y-3">
        {slices.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className="dot" style={{ background: s.color }} /> {s.label}
              </span>
              <span className="font-mono text-[11px] text-faint">{s.pct}%</span>
            </div>
            <p className="text-[10px] text-faint leading-snug">{s.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}