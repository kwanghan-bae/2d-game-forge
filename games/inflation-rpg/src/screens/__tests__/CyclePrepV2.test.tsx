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

  it('cancel button triggers onCancel', () => {
    const onCancel = vi.fn();
    render(<CyclePrepV2 onStart={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('btn-prep-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
