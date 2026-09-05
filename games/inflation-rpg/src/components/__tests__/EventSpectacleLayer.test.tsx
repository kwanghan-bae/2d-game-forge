import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventSpectacleLayer, type SpectacleItem } from '../EventSpectacleLayer';

// Mock playSfx to avoid audio errors in jsdom
vi.mock('../../systems/sound', () => ({
  playSfx: vi.fn(),
}));

describe('EventSpectacleLayer — C1030', () => {
  it('renders boss_phase_shift spectacle banner with enrageAtkMul', () => {
    const queue: SpectacleItem[] = [
      { id: 'bps-1', kind: 'boss_phase_shift', enrageAtkMul: 1.5 },
    ];
    render(<EventSpectacleLayer queue={queue} onDone={() => {}} />);

    const banner = screen.getByTestId('spectacle-boss-phase-shift');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('BOSS PHASE 2');
    expect(banner.textContent).toContain('폭주 돌입');
    expect(banner.textContent).toContain('×1.5');
  });

  it('renders perk_revive spectacle banner', () => {
    const queue: SpectacleItem[] = [
      { id: 'pr-1', kind: 'perk_revive' },
    ];
    render(<EventSpectacleLayer queue={queue} onDone={() => {}} />);

    expect(screen.getByText(/불굴의 의지 발동/)).toBeInTheDocument();
  });
});
