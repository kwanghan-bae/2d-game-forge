import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraitSelector } from '../TraitSelector';
import type { TraitId } from '../../cycle/traits';

const availableIds: TraitId[] = ['t_genius', 't_fragile', 't_challenge', 't_timid'];

describe('TraitSelector', () => {
  it('renders all available trait names', () => {
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={[]}
        maxSlots={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('천재')).toBeInTheDocument();
    expect(screen.getByText('허약함')).toBeInTheDocument();
    expect(screen.getByText('도전적')).toBeInTheDocument();
    expect(screen.getByText('소극적')).toBeInTheDocument();
  });

  it('shows slot count "선택: 0 / 3" by default', () => {
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={[]}
        maxSlots={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('trait-slot-count')).toHaveTextContent('0 / 3');
  });

  it('clicking an unselected trait adds it', () => {
    const onChange = vi.fn();
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={[]}
        maxSlots={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('trait-card-t_genius'));
    expect(onChange).toHaveBeenCalledWith(['t_genius']);
  });

  it('clicking a selected trait removes it', () => {
    const onChange = vi.fn();
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={['t_genius']}
        maxSlots={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('trait-card-t_genius'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('clicking an unselected trait when slots are full does NOT call onChange', () => {
    const onChange = vi.fn();
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={['t_genius', 't_fragile', 't_challenge']}
        maxSlots={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('trait-card-t_timid'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selected traits get a visual selected state (data-selected="true")', () => {
    render(
      <TraitSelector
        availableIds={availableIds}
        selectedIds={['t_genius']}
        maxSlots={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('trait-card-t_genius')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('trait-card-t_fragile')).toHaveAttribute('data-selected', 'false');
  });
});
