import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { StatDeltaPopup } from '../../components/StatDeltaPopup';
import type { StatDeltaEntry } from '../../components/StatDeltaPopupLogic';

describe('StatDeltaPopup', () => {
  it('renders nothing when entries is empty', () => {
    const { container } = render(<StatDeltaPopup entries={[]} />);
    expect(container.textContent).toBe('');
  });

  it('renders +exp entry with green color', () => {
    const entries: StatDeltaEntry[] = [{ stat: 'exp', value: 150, sign: '+' }];
    render(<StatDeltaPopup entries={entries} />);
    const el = screen.getByText('+150 EXP');
    expect(el).toBeDefined();
    expect(el.style.color).toContain('green');
  });

  it('renders -level entry with red color', () => {
    const entries: StatDeltaEntry[] = [{ stat: 'level', value: 3, sign: '-' }];
    render(<StatDeltaPopup entries={entries} />);
    const el = screen.getByText('-3 LV');
    expect(el).toBeDefined();
    expect(el.style.color).toContain('red');
  });

  it('renders crit entry with gold color', () => {
    const entries: StatDeltaEntry[] = [{ stat: 'crit', value: 5, sign: '+', isCrit: true }];
    render(<StatDeltaPopup entries={entries} />);
    const el = screen.getByText('+5 CRIT');
    expect(el).toBeDefined();
    expect(el.style.color).toContain('gold');
  });

  it('renders multiple entries stacked', () => {
    const entries: StatDeltaEntry[] = [
      { stat: 'exp', value: 100, sign: '+' },
      { stat: 'gold', value: 500, sign: '+' },
    ];
    render(<StatDeltaPopup entries={entries} />);
    expect(screen.getByText('+100 EXP')).toBeDefined();
    expect(screen.getByText('+500 GOLD')).toBeDefined();
  });
});
