"use client";
export default function Sparkline({
  values,
  color,
  height = 40,
  filled = false,
}: {
  values: number[];
  color: string;
  height?: number;
  filled?: boolean;
}) {
  const w = 220;
  const max = Math.max(...values, 0.001);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i): [number, number] => [
    (i / (values.length - 1 || 1)) * w,
    height - ((v - min) / range) * (height - 6) - 3,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" height={height}>
      {filled && <path d={area} fill={color} opacity="0.08" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}
