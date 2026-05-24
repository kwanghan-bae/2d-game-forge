import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Phaser cannot run in test environments (no canvas/WebGL).
// Mock it so the dynamic import inside bootPhaser never touches real Phaser.
// Phaser 3 ESM has no default export — export named members directly.
vi.mock('phaser', () => ({
  AUTO: 0,
  Game: class {
    scene = { start: vi.fn() };
    destroy = vi.fn();
  },
  Scene: class { constructor(_key: string) {} },
}));

// Also mock OverworldScene to avoid transitive Phaser requires.
vi.mock('../../overworld/OverworldScene', () => ({
  OverworldScene: class {},
  GRID_W: 120,
  GRID_H: 12,
}));

import { OverworldRunner } from '../OverworldRunner';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('OverworldRunner', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  // V3-H B2: OverworldRunner now auto-starts a cycle on mount (idle state is
  // no longer a user-visible state). When mounted with no pre-existing cycle
  // the component calls start() and renders the HUD.
  it('auto-starts cycle and renders HUD on mount when idle', () => {
    render(<OverworldRunner onCycleEnd={() => {}} />);
    expect(screen.getByTestId('overworld-hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-name')).toBeInTheDocument();
  });

  it('renders HUD when status=running (pre-started)', () => {
    useCycleStoreV2.getState().start({
      seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100,
    });
    render(<OverworldRunner onCycleEnd={() => {}} />);
    expect(screen.getByTestId('overworld-hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-name')).toBeInTheDocument();
    expect(screen.getByTestId('hud-age')).toBeInTheDocument();
    expect(screen.getByTestId('hud-light')).toBeInTheDocument();
    expect(screen.getByTestId('hud-rejuvenation')).toBeInTheDocument();
    expect(screen.getByTestId('open-spend-modal')).toBeInTheDocument();
  });
});
