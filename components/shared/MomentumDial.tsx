"use client";
import { MOMENTUM_META } from "@/lib/derived";
import type { MomentumState } from "@/lib/types";

// An instrument-panel gauge, not a progress bar — needle position encodes
// accelerating / steady / recovering / stalled.
export default function MomentumDial({
  state,
  color = "var(--ink)",
  size = 54,
}: {
  state: MomentumState;
  color?: string;
  size?: number;
}) {
  const meta = MOMENTUM_META[state] || MOMENTUM_META.steady;
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const toRad = (deg: number) => ((180 - deg) * Math.PI) / 180;
  const needleAngle = toRad(meta.angle);
  const nx = cx + r * 0.72 * Math.cos(needleAngle);
  const ny = cy - r * 0.72 * Math.sin(needleAngle);
  const arcPoints = [-110, -20, 45, 135].map((deg) => {
    const a = toRad(deg);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  });
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
        {arcPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="var(--ink-faint)" />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3.2" fill={color} />
      </svg>
      <span className="font-mono text-[10px] text-dim tracking-wide">{meta.label}</span>
    </div>
  );
}
