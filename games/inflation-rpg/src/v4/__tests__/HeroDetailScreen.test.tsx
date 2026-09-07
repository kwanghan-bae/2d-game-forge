import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialV4Save } from '../save';
import { HeroDetailScreen } from '../screens/HeroDetailScreen';

describe('V4 hero detail screen', () => {
  it('shows the actual number of years available when the hero is near the minimum age', () => {
    const save = createInitialV4Save(124);
    const hero = { ...save.run.hero, age: 7 };

    render(
      <HeroDetailScreen
        hero={hero}
        gold={100}
        expeditionActive={false}
        onBack={vi.fn()}
        onImportLegacy={vi.fn()}
        onRejuvenate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /2년 회춘/ })).toBeEnabled();
    expect(screen.getByText(/현재 나이에 따라 금화 20가 필요/)).toBeInTheDocument();
  });
});
