import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SagaScreen } from '../screens/SagaScreen';
import type { SagaEntry } from '../types';

describe('V4 saga screen', () => {
  it('moves focus to the saga heading when the screen opens', () => {
    render(<SagaScreen entries={[]} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '영원의 사가' })).toHaveFocus();
  });

  it('keeps the saga readable when an in-memory entry has malformed text fields', () => {
    const malformed = {
      id: 'saga-malformed',
      kind: 'milestone',
      createdAt: Date.now(),
      title: { unexpected: true },
      text: ['unexpected'],
    } as unknown as SagaEntry;

    expect(() => render(<SagaScreen entries={[malformed]} onBack={vi.fn()} />)).not.toThrow();
    expect(screen.getByText('기록 확인 필요')).toBeInTheDocument();
    expect(screen.getByText('내용을 확인할 수 없습니다.')).toBeInTheDocument();
  });
});
