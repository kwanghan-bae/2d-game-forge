import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Town } from './Town';

describe('Town — Phase Compass UI', () => {
  it('shows single 던전 입장 button', () => {
    render(<Town />);
    expect(screen.getByTestId('town-enter-dungeon')).toBeInTheDocument();
  });

  it('does not render town-dungeon-<id> grid testids (legacy removed)', () => {
    render(<Town />);
    expect(screen.queryByTestId('town-dungeon-plains')).not.toBeInTheDocument();
    expect(screen.queryByTestId('town-dungeon-forest')).not.toBeInTheDocument();
    expect(screen.queryByTestId('town-dungeon-mountains')).not.toBeInTheDocument();
  });

  it('still shows town facility buttons (보물고 / 차원 제단 / 직업소)', () => {
    render(<Town />);
    expect(screen.getByTestId('town-relics')).toBeInTheDocument();
    expect(screen.getByTestId('town-ascension-altar')).toBeInTheDocument();
    expect(screen.getByTestId('town-skill-progression')).toBeInTheDocument();
  });
});
