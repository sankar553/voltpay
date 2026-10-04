"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export type UsagePoint = { label: string; units: number };

// Geometry in SVG user units. Width follows the container (1 unit = 1px) so text never shrinks.
const H = 280;
const M = { t: 28, r: 12, b: 34, l: 46 };

function niceStep(max: number, ticks = 4) {
  const raw = max / ticks;
  return [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find((s) => s >= raw) ?? 10000;
}

/** Column with a 4px rounded data-end and a square baseline. */
function barPath(x: number, yTop: number, w: number, base: number) {
  const r = Math.min(4, (base - yTop) / 2, w / 2);
  return `M${x},${base}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${base}Z`;
}

const fmt = (n: number) => n.toLocaleString("en-IN");

export function UsageChart({ points }: { points: UsagePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [W, setW] = useState(640);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [asTable]);

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No usage data yet.</p>;
  }

  const max = Math.max(...points.map((p) => p.units), 1);
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  const innerW = W - M.l - M.r;
  const innerH = H - M.t - M.b;
  const base = M.t + innerH;
  const slot = innerW / points.length;
  const barW = Math.min(24, slot * 0.5);
  const y = (v: number) => base - (v / top) * innerH;
  const cx = (i: number) => M.l + slot * i + slot / 2;
  const last = points.length - 1;

  return (
    <figure className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-sm font-medium">Monthly consumption (kWh)</figcaption>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
        >
          {asTable ? "Show chart" : "Show table"}
        </Button>
      </div>

      {asTable ? (
        <div className="relative overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Month</th>
                <th className="px-4 py-2 text-right font-medium">Units (kWh)</th>
                <th className="px-4 py-2 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {points.map((p, i) => {
                const prev = points[i - 1]?.units;
                const change = prev ? Math.round(((p.units - prev) / prev) * 1000) / 10 : null;
                return (
                  <tr key={p.label}>
                    <td className="px-4 py-2">{p.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(p.units)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                      {change === null ? "—" : `${change > 0 ? "+" : ""}${change}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={box} className="relative" onPointerLeave={() => setActive(null)}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full"
            role="group"
            aria-label="Monthly consumption in kWh"
          >
            {/* recessive hairline grid + y ticks */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={M.l}
                  x2={W - M.r}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={M.l - 8}
                  y={y(t)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="var(--muted-foreground)"
                >
                  {fmt(t)}
                </text>
              </g>
            ))}

            {points.map((p, i) => (
              <g
                key={p.label}
                tabIndex={0}
                role="img"
                aria-label={`${p.label}: ${fmt(p.units)} kWh`}
                className="outline-none"
                onPointerEnter={() => setActive(i)}
                onPointerMove={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {/* generous hit target: the whole slot, full height */}
                <rect x={M.l + slot * i} y={M.t} width={slot} height={innerH} fill="transparent" />
                <path
                  d={barPath(cx(i) - barW / 2, y(p.units), barW, base)}
                  fill={active === i ? "var(--chart-1-hover)" : "var(--chart-1)"}
                />
                <text
                  x={cx(i)}
                  y={base + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--muted-foreground)"
                >
                  {p.label.split(" ")[0]}
                </text>
              </g>
            ))}

            {/* selective direct label: only the latest month */}
            {active === null && (
              <text
                x={cx(last)}
                y={y(points[last].units) - 8}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {fmt(points[last].units)}
              </text>
            )}
          </svg>

          {active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border bg-card px-3 py-2 text-xs shadow-md"
              style={{
                left: `${Math.min(88, Math.max(12, (cx(active) / W) * 100))}%`,
                top: `calc(${(y(points[active].units) / H) * 100}% - 10px)`,
              }}
            >
              <p className="text-base font-semibold text-foreground tabular-nums">
                {fmt(points[active].units)} kWh
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-3 rounded"
                  style={{ background: "var(--chart-1)" }}
                />
                {points[active].label}
              </p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
