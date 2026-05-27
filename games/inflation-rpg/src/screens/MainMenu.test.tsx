import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('MainMenu (V1a)', () => {
  it('renders game title', () => {
    render(<MainMenu />);
    expect(screen.getByText(/조선 인플레이션 RPG/)).toBeInTheDocument();
  });

  it('사이클 시작 navigates to cycle-prep-v2', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByTestId('btn-start-cycle'));
    expect(useGameStore.getState().screen).toBe('cycle-prep-v2');
  });

  it('shows saga count indicator (default 0)', () => {
    render(<MainMenu />);
    expect(screen.getByTestId('saga-count').textContent).toMatch(/0/);
  });

  it('saga count reflects sagaHistory length', () => {
    // Use minimal saga-shaped objects — component only reads .length
    useGameStore.setState((s) => ({ meta: { ...s.meta, sagaHistory: [{} as never, {} as never] } }));
    render(<MainMenu />);
    expect(screen.getByTestId('saga-count').textContent).toMatch(/2/);
  });

  it('용사 갤러리 button is disabled', () => {
    render(<MainMenu />);
    const btn = screen.getByTestId('btn-saga-gallery');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('설정 button is disabled', () => {
    render(<MainMenu />);
    const btn = screen.getByTestId('btn-settings');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  /** Cycle 158 — claimable > 0 시 도전과제 버튼에 pulse dot 노출 (ui-ux-designer #1). */
  describe('Cycle 158 — 도전과제 pulse dot', () => {
    it('claimable === 0 일 때 pulse dot 부재', () => {
      render(<MainMenu />);
      expect(screen.queryByTestId('mm-claim-pulse-dot')).toBeNull();
    });

    it('claimable > 0 일 때 pulse dot 노출', () => {
      // 첫 번째 도전과제를 completed 상태로 force (claimable = completed && !claimedAt).
      useGameStore.setState((s) => ({
        meta: {
          ...s.meta,
          achievements: {
            ...s.meta.achievements,
            byId: {
              ...s.meta.achievements.byId,
              'lv-10m-in-3-cycles': {
                ...s.meta.achievements.byId['lv-10m-in-3-cycles'],
                completed: true,
                claimedAt: undefined,
              },
            },
          },
        },
      }));
      render(<MainMenu />);
      expect(screen.getByTestId('mm-claim-pulse-dot')).toBeInTheDocument();
    });
  });
});
