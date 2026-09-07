import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SagaScreen } from '../screens/SagaScreen';

describe('V4 saga screen', () => {
  it('moves focus to the saga heading when the screen opens', () => {
    render(<SagaScreen entries={[]} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '영원의 사가' })).toHaveFocus();
  });
});
