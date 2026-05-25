/**
 * Cycle 111 F2 — InflationCurveChart inline SVG component tests.
 *
 *  C5 empty / single-point / multi-sample shape
 *  C6 polyline coordinate sanity (within plot area)
 *  C7 milestone marker count vs maxLevel
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { InflationCurveChart } from '../InflationCurveChart';
import type { LevelSnapshot } from '../../overworld/levelHistory';

function makeSamples(n: number, maxLevel: number): LevelSnapshot[] {
  // Geometric ramp from level 1 → maxLevel across n samples.
  const samples: LevelSnapshot[] = [];
  const ratio = Math.pow(Math.max(maxLevel, 2), 1 / Math.max(1, n - 1));
  for (let i = 0; i < n; i++) {
    samples.push({
      arrivalIndex: i,
      level: Math.max(1, Math.round(Math.pow(ratio, i))),
      age: 5 + i,
    });
  }
  return samples;
}

describe('InflationCurveChart (cycle 111 F2)', () => {
  it('renders empty state when history is empty (C5)', () => {
    const { container, getByTestId } = render(<InflationCurveChart history={[]} />);
    expect(getByTestId('inflation-curve-chart')).toBeInTheDocument();
    expect(getByTestId('inflation-curve-empty')).toBeInTheDocument();
    // No polyline when empty.
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('renders single-point as circle when history.length === 1 (C5)', () => {
    const { container, getByTestId, queryByTestId } = render(
      <InflationCurveChart history={[{ arrivalIndex: 0, level: 100, age: 5 }]} />,
    );
    expect(getByTestId('inflation-curve-chart')).toBeInTheDocument();
    expect(queryByTestId('inflation-curve-polyline')).toBeNull();
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('renders polyline when history.length >= 2 (C5)', () => {
    const samples = makeSamples(10, 1_000);
    const { getByTestId } = render(<InflationCurveChart history={samples} />);
    expect(getByTestId('inflation-curve-polyline')).toBeInTheDocument();
  });

  it('polyline coordinates fit inside plot area (C6)', () => {
    const width = 280;
    const height = 160;
    const samples = makeSamples(60, 1_000_000);
    const { getByTestId } = render(
      <InflationCurveChart history={samples} width={width} height={height} />,
    );
    const polyline = getByTestId('inflation-curve-polyline');
    const points = polyline.getAttribute('points')!;
    const coords = points.split(/\s+/).map(pair => pair.split(',').map(Number));
    expect(coords.length).toBe(60);
    // padding: { top: 8, right: 8, bottom: 24, left: 32 }
    for (const [x, y] of coords) {
      expect(x).toBeGreaterThanOrEqual(32);
      expect(x).toBeLessThanOrEqual(width - 8);
      expect(y).toBeGreaterThanOrEqual(8);
      expect(y).toBeLessThanOrEqual(height - 24);
    }
  });

  it('milestone marker count matches visible thresholds (C7)', () => {
    // maxLevel = 500 → log10(500) ≈ 2.7. yMax = max(2, 2.7) = 2.7.
    // Markers below 10^2.7 = lv 100 only → 1 marker.
    const samples = [
      { arrivalIndex: 0, level: 1, age: 5 },
      { arrivalIndex: 10, level: 500, age: 15 },
    ];
    const { container } = render(<InflationCurveChart history={samples} />);
    // Each marker = 1 <line> + 1 <text> wrapped in <g>. Count <line>s with
    // strokeDasharray attribute.
    const dashedLines = container.querySelectorAll('line[stroke-dasharray]');
    expect(dashedLines.length).toBe(1);
  });

  it('milestone marker count for high maxLevel (lv 1M → 5 markers: 100, 1k, 10k, 100k, 1M)', () => {
    const samples = [
      { arrivalIndex: 0, level: 1, age: 5 },
      { arrivalIndex: 100, level: 1_000_000, age: 70 },
    ];
    const { container } = render(<InflationCurveChart history={samples} />);
    const dashedLines = container.querySelectorAll('line[stroke-dasharray]');
    expect(dashedLines.length).toBe(5);
  });

  it('respects custom width and height', () => {
    const { getByTestId } = render(
      <InflationCurveChart history={[]} width={400} height={300} />,
    );
    const svg = getByTestId('inflation-curve-chart');
    expect(svg.getAttribute('width')).toBe('400');
    expect(svg.getAttribute('height')).toBe('300');
  });

  it('defends against level=0 with Math.max clamp', () => {
    // Game invariant prevents level=0, but defensive math.max(1, level) means
    // polyline still renders without NaN.
    const samples = [
      { arrivalIndex: 0, level: 0, age: 5 }, // pathological
      { arrivalIndex: 5, level: 10, age: 10 },
    ];
    const { getByTestId } = render(<InflationCurveChart history={samples} />);
    const polyline = getByTestId('inflation-curve-polyline');
    const points = polyline.getAttribute('points')!;
    // No NaN in any coordinate.
    expect(points).not.toContain('NaN');
  });
});
