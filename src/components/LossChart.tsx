import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LossChartProps {
  trainLoss: number[];
  valLoss: (number | null)[];
  className?: string;
}

const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 30;

export function LossChart({ trainLoss, valLoss, className }: LossChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Render the SVG at the container's real pixel size so it fills any aspect
  // ratio without letterboxing (1 viewBox unit = 1px).
  const [size, setSize] = useState({ w: 640, h: 260 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 1 && r.height > 1) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative h-full w-full", className)}>
      {trainLoss.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <HeptagramIcon className="size-8 opacity-30" />
          <p className="text-sm">No training data yet</p>
        </div>
      ) : (
        <Plot trainLoss={trainLoss} valLoss={valLoss} w={size.w} h={size.h} />
      )}
    </div>
  );
}

function Plot({
  trainLoss,
  valLoss,
  w,
  h,
}: {
  trainLoss: number[];
  valLoss: (number | null)[];
  w: number;
  h: number;
}) {
  const IW = Math.max(w - PAD_L - PAD_R, 1);
  const IH = Math.max(h - PAD_T - PAD_B, 1);
  const N = trainLoss.length;

  // Downsample the train line so the SVG stays light after thousands of
  // high-frequency points; x uses the original index so the shape is preserved
  // and the (full-resolution) val points stay aligned.
  const MAX_POINTS = 800;
  const stride = Math.max(1, Math.ceil(N / MAX_POINTS));
  const trainSeries: Array<[number, number]> = [];
  for (let i = 0; i < N; i += stride) trainSeries.push([i, trainLoss[i]]);
  if (N > 0 && trainSeries[trainSeries.length - 1]?.[0] !== N - 1) {
    trainSeries.push([N - 1, trainLoss[N - 1]]);
  }

  const valPoints = valLoss
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);

  const ys = [...trainSeries.map(([, v]) => v), ...valPoints.map((p) => p.v)];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 0.001;

  const px = (i: number) => PAD_L + (i / Math.max(N - 1, 1)) * IW;
  const py = (v: number) => PAD_T + (1 - (v - minY) / range) * IH;

  const trainPath = trainSeries
    .map(([i, v], k) => `${k === 0 ? "M" : "L"} ${px(i).toFixed(1)},${py(v).toFixed(1)}`)
    .join(" ");

  const trainArea = [
    ...trainSeries.map(
      ([i, v], k) => `${k === 0 ? "M" : "L"} ${px(i).toFixed(1)},${py(v).toFixed(1)}`,
    ),
    `L ${px(N - 1).toFixed(1)},${(PAD_T + IH).toFixed(1)}`,
    `L ${PAD_L.toFixed(1)},${(PAD_T + IH).toFixed(1)} Z`,
  ].join(" ");

  const valPath =
    valPoints.length > 1
      ? valPoints
          .map(({ v, i }, idx) => `${idx === 0 ? "M" : "L"} ${px(i).toFixed(1)},${py(v).toFixed(1)}`)
          .join(" ")
      : "";

  // Limit tick count so labels never crowd regardless of chart height.
  // Minimum 20px between tick centres avoids overlap at any aspect ratio.
  const maxTicks = Math.max(1, Math.floor(IH / 20));
  const yTicks = Math.min(4, maxTicks);
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minY + (i / yTicks) * range;
    return { label: v.toFixed(3), y: PAD_T + (1 - i / yTicks) * IH };
  });

  const lastTrain = trainLoss[N - 1];
  const lastVal = valPoints.at(-1);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-label="Training loss chart"
    >
      <defs>
        <linearGradient id="blm-train-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map(({ y }, i) => (
        <line
          key={i}
          x1={PAD_L}
          y1={y}
          x2={w - PAD_R}
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.06"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {yLabels.map(({ label, y }, i) => (
        <text
          key={i}
          x={PAD_L - 6}
          y={y}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="11"
          fill="currentColor"
          fillOpacity="0.4"
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
      ))}

      {/* X-axis labels */}
      <text
        x={PAD_L}
        y={h - 8}
        fontSize="11"
        fill="currentColor"
        fillOpacity="0.4"
        fontFamily="JetBrains Mono, monospace"
      >
        step 0
      </text>
      <text
        x={w - PAD_R}
        y={h - 8}
        fontSize="11"
        textAnchor="end"
        fill="currentColor"
        fillOpacity="0.4"
        fontFamily="JetBrains Mono, monospace"
      >
        {N - 1}
      </text>

      {/* Gradient area under train loss */}
      <path d={trainArea} fill="url(#blm-train-fill)" />

      {/* Val loss line (dashed) */}
      {valPath && (
        <path
          d={valPath}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.55"
        />
      )}

      {/* Train loss line */}
      <path
        d={trainPath}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End-point dots */}
      <circle cx={px(N - 1)} cy={py(lastTrain)} r="3.5" fill="var(--brand)" />
      {lastVal && (
        <circle
          cx={px(lastVal.i)}
          cy={py(lastVal.v)}
          r="3"
          fill="var(--muted-foreground)"
          opacity="0.55"
        />
      )}

      {/* Legend */}
      <line x1={PAD_L} y1={PAD_T - 6} x2={PAD_L + 16} y2={PAD_T - 6} stroke="var(--brand)" strokeWidth="2" />
      <text x={PAD_L + 21} y={PAD_T - 6} dominantBaseline="middle" fontSize="11" fill="var(--brand)" fillOpacity="0.85">
        train
      </text>
      {valPath && (
        <>
          <line
            x1={PAD_L + 58}
            y1={PAD_T - 6}
            x2={PAD_L + 74}
            y2={PAD_T - 6}
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            opacity="0.55"
          />
          <text
            x={PAD_L + 79}
            y={PAD_T - 6}
            dominantBaseline="middle"
            fontSize="11"
            fill="currentColor"
            fillOpacity="0.4"
          >
            val
          </text>
        </>
      )}
    </svg>
  );
}

function HeptagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.4" />
      <polygon
        points="50,12 87.1,58.5 33.5,84.2 20.3,26.3 79.7,26.3 66.5,84.2 12.9,58.5"
        stroke="currentColor"
        strokeWidth="2.8"
        fill="none"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
