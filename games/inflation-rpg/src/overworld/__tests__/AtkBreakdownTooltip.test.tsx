import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AtkBreakdownTooltip } from '../../components/AtkBreakdownTooltip';
import type { AtkBreakdownResult } from '../../components/AtkBreakdownLogic';

const mockResult: AtkBreakdownResult = {
  finalAtk: 450,
  flatAtk: 30,
  categories: [
    { name: 'core', value: 2.5, sign: 'positive', label: '기본 배율' },
    { name: 'condition', value: 1.0, sign: 'neutral', label: '상태 배율' },
    { name: 'gold', value: 0.8, sign: 'negative', label: '골드 배율' },
    { name: 'combat', value: 1.2, sign: 'positive', label: '전투 배율' },
    { name: 'progress', value: 1.5, sign: 'positive', label: '진행 배율' },
    { name: 'chain', value: 1.0, sign: 'neutral', label: '연쇄 배율' },
    { name: 'tradeoff', value: 1.0, sign: 'neutral', label: '트레이드오프' },
    { name: 'system', value: 1.0, sign: 'neutral', label: '시스템 배율' },
  ],
  capActive: false,
  totalMulsRaw: 3.6,
  totalMulsCapped: 3.6,
};

describe('AtkBreakdownTooltip', () => {
  it('renders nothing when breakdown is null', () => {
    const { container } = render(<AtkBreakdownTooltip breakdown={null} />);
    expect(container.textContent).toBe('');
  });

  it('displays final ATK value', () => {
    render(<AtkBreakdownTooltip breakdown={mockResult} />);
    expect(screen.getByText(/450/)).toBeDefined();
  });

  it('shows only non-neutral categories', () => {
    render(<AtkBreakdownTooltip breakdown={mockResult} />);
    expect(screen.getByText(/기본 배율/)).toBeDefined();
    expect(screen.getByText(/전투 배율/)).toBeDefined();
    expect(screen.getByText(/골드 배율/)).toBeDefined();
    expect(screen.queryByText(/연쇄 배율/)).toBeNull();
  });

  it('shows cap warning when active', () => {
    const capped = { ...mockResult, capActive: true, totalMulsRaw: 35, totalMulsCapped: 30 };
    render(<AtkBreakdownTooltip breakdown={capped} />);
    expect(screen.getByText(/CAP/i)).toBeDefined();
  });
});
