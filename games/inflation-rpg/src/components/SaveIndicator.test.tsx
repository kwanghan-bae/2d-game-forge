import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SaveIndicator } from './SaveIndicator';
import { useGameStore } from '../store/gameStore';

describe('SaveIndicator', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows "Saved" text after debounce on state change', () => {
    const { container } = render(<SaveIndicator />);
    expect(container.textContent).toBe('');

    act(() => {
      useGameStore.setState({ screen: 'main_menu' });
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(container.textContent).toContain('Saved');
  });

  it('hides after 1.2s display time', () => {
    const { container } = render(<SaveIndicator />);

    act(() => {
      useGameStore.setState({ screen: 'main_menu' });
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(container.textContent).toContain('Saved');

    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(container.textContent).toBe('');
  });
});
