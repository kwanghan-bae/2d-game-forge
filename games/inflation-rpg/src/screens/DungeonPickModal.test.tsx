import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DungeonPickModal } from './DungeonPickModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';
import { EMPTY_COMPASS_OWNED } from '../data/compass';

describe('DungeonPickModal', () => {
  beforeEach(() => {
    useGameStore.setState({ run: { ...INITIAL_RUN }, meta: { ...INITIAL_META } });
  });

  it('shows pick result with picked dungeon and 입장 button', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-result')).toBeInTheDocument();
    expect(screen.getByTestId('pick-enter')).toBeInTheDocument();
  });

  it('does not show free-select button when no compass owned', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.queryByTestId('pick-free-mode')).not.toBeInTheDocument();
  });

  it('shows free-select button when omni owned', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, omni: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-free-mode')).toBeInTheDocument();
  });

  it('clicking 입장 calls onClose + setScreen(class-select)', () => {
    let closed = false;
    render(<DungeonPickModal onClose={() => { closed = true; }} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-enter')); });
    expect(closed).toBe(true);
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('toggling free-mode reveals dungeon cards (only enabled when canFreeSelect)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, forest_second: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-free-mode')); });
    expect(screen.getByTestId('free-card-plains')).toBeDisabled();
    expect(screen.getByTestId('free-card-forest')).not.toBeDisabled();
    expect(screen.getByTestId('free-card-mountains')).toBeDisabled();
  });

  it('clicking 취소 resets run.currentDungeonId + onClose', () => {
    let closed = false;
    render(<DungeonPickModal onClose={() => { closed = true; }} />);
    expect(useGameStore.getState().run.currentDungeonId).not.toBeNull();
    act(() => { fireEvent.click(screen.getByTestId('pick-cancel')); });
    expect(closed).toBe(true);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
  });

  it('weight badge shown for random pick', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-weight')).toBeInTheDocument();
  });

  it('weight badge hidden after free pick', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, omni: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-free-mode')); });
    act(() => { fireEvent.click(screen.getByTestId('free-card-mountains')); });
    expect(screen.queryByTestId('pick-weight')).not.toBeInTheDocument();
    expect(screen.getByText(/자유 선택 완료/)).toBeInTheDocument();
  });
});

describe('Phase Realms — locked dungeons in free-select mode', () => {
  beforeEach(() => {
    useGameStore.setState({ run: { ...INITIAL_RUN }, meta: { ...INITIAL_META } });
  });

  it('shows locked dungeons grayed with tier hint at ascTier=0', async () => {
    // ascTier=0: only plains/forest/mountains are unlocked; sea/volcano/underworld/heaven/chaos locked
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascTier: 0,
        compassOwned: { ...EMPTY_COMPASS_OWNED, omni: true },
      },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-free-mode')); });

    // Starter dungeons should be enabled (omni owned + unlocked)
    expect(screen.getByTestId('free-card-plains')).not.toBeDisabled();
    expect(screen.getByTestId('free-card-forest')).not.toBeDisabled();
    expect(screen.getByTestId('free-card-mountains')).not.toBeDisabled();

    // Locked dungeons should be disabled
    expect(screen.getByTestId('free-card-sea')).toBeDisabled();
    expect(screen.getByTestId('free-card-volcano')).toBeDisabled();
    expect(screen.getByTestId('free-card-chaos')).toBeDisabled();

    // Tier hints should appear for locked asc-tier dungeons
    expect(screen.getByTestId('free-card-hint-sea')).toBeInTheDocument();
    expect(screen.getByTestId('free-card-hint-volcano')).toBeInTheDocument();
    expect(screen.getByTestId('free-card-hint-chaos')).toBeInTheDocument();
    expect(screen.getByText(/Tier 1 도달 시 해제/)).toBeInTheDocument();
    expect(screen.getByText(/Tier 12 도달 시 해제/)).toBeInTheDocument();
  });

  it('shows all 8 dungeons enabled at ascTier=12', async () => {
    // ascTier=12: all 8 dungeons unlocked; omni gives free-select to all
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascTier: 12,
        compassOwned: { ...EMPTY_COMPASS_OWNED, omni: true },
      },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-free-mode')); });

    // All 8 dungeon buttons should be enabled
    const dungeonIds = ['plains', 'forest', 'mountains', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];
    for (const id of dungeonIds) {
      expect(screen.getByTestId(`free-card-${id}`)).not.toBeDisabled();
    }

    // No tier hints since all are unlocked
    expect(screen.queryByTestId('free-card-hint-sea')).not.toBeInTheDocument();
    expect(screen.queryByTestId('free-card-hint-chaos')).not.toBeInTheDocument();
  });
});
