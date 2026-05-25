/**
 * Cycle 111 F2 — Inflation Curve Chart (inline SVG, no external lib).
 *
 * Renders an adaptive-decimated level history as a 60-segment polyline with:
 *  - log10 Y axis (level 1 .. 1G coverage)
 *  - 8 milestone tier horizontal dashed lines (10^2 .. 10^9)
 *  - linear X axis (arrival index, 3 tick labels)
 *  - empty / single-point graceful fallback
 *
 * NO external dependency — recharts / chart.js / d3 import 0 (R2 boundary).
 * Static SVG (no animation, no interactivity) — cycle 111 scope; tooltip /
 * zoom / multi-line overlay deferred to cycle 112+ backlog.
 *
 * Color tokens via CSS custom properties (milestones.ts cssVarName convention)
 * with raw-hex fallback so the chart still renders when CSS vars aren't loaded
 * (jsdom test environment).
 */

import { MILESTONE_PRESETS } from '../data/milestones';
import type { LevelSnapshot } from '../overworld/levelHistory';

interface Props {
  history: readonly LevelSnapshot[];
  width?: number;
  height?: number;
}

const PADDING = { top: 8, right: 8, bottom: 24, left: 32 } as const;

/** Y-axis floor of log10(level). Even short cycles (death @ age 11, maxLevel ~50)
 *  get a chart that reaches lv 100 minimum so the first milestone marker is
 *  visible — otherwise yMax === yMin === 0 and the chart collapses. */
const Y_MAX_LOG_FLOOR = 2;

/** Tier-color fallback when CSS custom properties aren't loaded (jsdom).
 *  Mirrors the inflation-marker palette of cycle 106 VFX (warm → hot gradient). */
const TIER_FALLBACK_COLORS = [
  '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b',
  '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d',
] as const;

/** Format level for milestone marker label. 100 → "100", 1k, 10k, 100k, 1M, ... */
function formatLevel(level: number): string {
  if (level >= 1_000_000_000) return `${level / 1_000_000_000}G`;
  if (level >= 1_000_000) return `${level / 1_000_000}M`;
  if (level >= 1_000) return `${level / 1_000}k`;
  return String(level);
}

export function InflationCurveChart({
  history,
  width = 280,
  height = 160,
}: Props) {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  // Empty state.
  if (history.length === 0) {
    return (
      <svg
        data-testid="inflation-curve-chart"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ background: '#0f172a', borderRadius: 4 }}
      >
        <text
          data-testid="inflation-curve-empty"
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
        >
          데이터 없음
        </text>
      </svg>
    );
  }

  // Scale extents.
  const maxLevel = history.reduce((m, s) => Math.max(m, s.level), 1);
  const lastArrivalIndex = history[history.length - 1]!.arrivalIndex;
  const xMax = Math.max(1, lastArrivalIndex);
  const yMin = 0; // = log10(1), hero.level starts at 1
  const yMax = Math.max(Y_MAX_LOG_FLOOR, Math.log10(Math.max(1, maxLevel)));

  const xPx = (arrivalIndex: number) =>
    PADDING.left + (arrivalIndex / xMax) * plotW;
  const yPx = (level: number) => {
    const safeLevel = Math.max(1, level);
    const norm = (Math.log10(safeLevel) - yMin) / (yMax - yMin);
    return PADDING.top + plotH * (1 - norm);
  };

  // Polyline points (only when 2+ samples).
  const points = history
    .map(s => `${xPx(s.arrivalIndex).toFixed(2)},${yPx(s.level).toFixed(2)}`)
    .join(' ');

  // Milestone markers — render only those below yMax cap.
  const visibleMarkers = MILESTONE_PRESETS.filter(
    p => Math.log10(p.thresholdLv) <= yMax,
  );

  return (
    <svg
      data-testid="inflation-curve-chart"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ background: '#0f172a', borderRadius: 4 }}
    >
      {/* Plot frame */}
      <rect
        x={PADDING.left}
        y={PADDING.top}
        width={plotW}
        height={plotH}
        fill="none"
        stroke="#1e293b"
        strokeWidth={1}
      />

      {/* Milestone tier horizontal dashed lines + labels */}
      {visibleMarkers.map(preset => {
        const y = yPx(preset.thresholdLv);
        const fallback = TIER_FALLBACK_COLORS[preset.tier - 1] ?? '#fbbf24';
        const color = `var(${preset.cssVarName}, ${fallback})`;
        return (
          <g key={preset.tier} opacity={0.45}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + plotW}
              y2={y}
              stroke={color}
              strokeWidth={0.75}
              strokeDasharray="2 2"
            />
            <text
              x={PADDING.left - 2}
              y={y + 2}
              textAnchor="end"
              fill={color}
              fontSize={7}
            >
              {formatLevel(preset.thresholdLv)}
            </text>
          </g>
        );
      })}

      {/* Polyline (≥ 2 samples) or single point */}
      {history.length === 1 ? (
        <circle
          cx={xPx(history[0]!.arrivalIndex)}
          cy={yPx(history[0]!.level)}
          r={3}
          fill="var(--color-accent-gold, #fbbf24)"
        />
      ) : (
        <polyline
          data-testid="inflation-curve-polyline"
          points={points}
          stroke="var(--color-accent-gold, #fbbf24)"
          strokeWidth={1.5}
          fill="none"
        />
      )}

      {/* X axis labels (3 ticks: 0 / mid / max) */}
      <text x={PADDING.left} y={height - 4} fill="#64748b" fontSize={8}>
        0
      </text>
      <text
        x={PADDING.left + plotW / 2}
        y={height - 4}
        textAnchor="middle"
        fill="#64748b"
        fontSize={8}
      >
        {Math.floor(xMax / 2)}
      </text>
      <text
        x={PADDING.left + plotW}
        y={height - 4}
        textAnchor="end"
        fill="#64748b"
        fontSize={8}
      >
        {xMax}
      </text>
      <text
        x={PADDING.left + plotW / 2}
        y={height - 14}
        textAnchor="middle"
        fill="#475569"
        fontSize={7}
      >
        도착 횟수
      </text>

      {/* Y axis label (rotated) */}
      <text
        x={-(height / 2)}
        y={10}
        transform={`rotate(-90, 10, ${height / 2})`}
        textAnchor="middle"
        fill="#475569"
        fontSize={7}
      >
        레벨 (log)
      </text>
    </svg>
  );
}
