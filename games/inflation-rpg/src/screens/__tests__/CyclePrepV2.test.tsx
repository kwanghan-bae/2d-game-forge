import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CyclePrepV2 } from '../CyclePrepV2';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('CyclePrepV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('renders title + spawned hero preview + start button', () => {
    render(<CyclePrepV2 onStart={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('btn-prep-start')).toBeInTheDocument();
    expect(screen.getByTestId('btn-prep-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('spawned-hero-name')).toBeInTheDocument();
  });

  it('start button starts cycle and triggers onStart', () => {
    const onStart = vi.fn();
    render(<CyclePrepV2 onStart={onStart} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('btn-prep-start'));
    expect(onStart).toHaveBeenCalled();
    expect(useCycleStoreV2.getState().status).toBe('running');
  });

  it('dev test seed is used only when the host exposes test hooks', () => {
    const testWindow = window as unknown as {
      gameConfig?: { exposeTestHooks?: boolean };
      __inflation_rpg_test_seed__?: unknown;
    };
    const previousConfig = testWindow.gameConfig;
    const previousSeed = testWindow.__inflation_rpg_test_seed__;
    testWindow.gameConfig = { exposeTestHooks: true };
    testWindow.__inflation_rpg_test_seed__ = 1234;

    const { unmount } = render(<CyclePrepV2 onStart={() => {}} onCancel={() => {}} />);
    try {
      fireEvent.click(screen.getByTestId('btn-prep-start'));
      expect(useCycleStoreV2.getState().controller?.getSeed()).toBe(1234);
    } finally {
      unmount();
      testWindow.gameConfig = previousConfig;
      testWindow.__inflation_rpg_test_seed__ = previousSeed;
    }
  });

  it('cancel button triggers onCancel', () => {
    const onCancel = vi.fn();
    render(<CyclePrepV2 onStart={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('btn-prep-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
