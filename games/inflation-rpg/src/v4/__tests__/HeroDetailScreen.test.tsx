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

  it('shows critical chance granted by a talisman in the equipment card', () => {
    const save = createInitialV4Save(125);
    const hero = {
      ...save.run.hero,
      equipmentIds: ['v4_spirit_talisman'],
      equipmentLevels: { v4_spirit_talisman: 2 },
    };

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

    expect(screen.getByText(/치명타 \+6%/)).toBeInTheDocument();
  });

  it('blocks V3 hero import while an expedition is active', () => {
    const save = createInitialV4Save(126);

    render(
      <HeroDetailScreen
        hero={save.run.hero}
        gold={100}
        expeditionActive
        onBack={vi.fn()}
        onImportLegacy={vi.fn()}
        onRejuvenate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '원정 귀환 후 V3 영웅 가져오기' })).toBeDisabled();
  });

  it('moves focus to the hero heading when the screen opens', () => {
    const save = createInitialV4Save(127);

    render(
      <HeroDetailScreen
        hero={save.run.hero}
        gold={100}
        expeditionActive={false}
        onBack={vi.fn()}
        onImportLegacy={vi.fn()}
        onRejuvenate={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: save.run.hero.name })).toHaveFocus();
  });

  it('does not expose non-finite hero or equipment values', () => {
    const save = createInitialV4Save(128);
    const hero = {
      ...save.run.hero,
      age: Number.NaN,
      level: Number.POSITIVE_INFINITY,
      hp: Number.POSITIVE_INFINITY,
      hpMax: Number.NaN,
      atk: Number.POSITIVE_INFINITY,
      def: Number.NaN,
      critRateBase: Number.POSITIVE_INFINITY,
      actionCount: Number.NaN,
      rejuvenationCount: Number.POSITIVE_INFINITY,
      equipmentIds: ['v4_iron_sword'],
      equipmentLevels: { v4_iron_sword: Number.POSITIVE_INFINITY },
    };

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

    const main = screen.getByRole('main');
    expect(main.textContent).not.toContain('Infinity');
    expect(main.textContent).not.toContain('NaN');
  });

  it('does not expose negative hero values from an in-memory malformed snapshot', () => {
    const save = createInitialV4Save(129);
    const hero = {
      ...save.run.hero,
      hp: -50,
      hpMax: -100,
      atk: -3,
      def: -2,
      actionCount: -1,
      rejuvenationCount: -4,
      equipmentIds: ['v4_iron_sword'],
      equipmentLevels: { v4_iron_sword: -2 },
    };

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

    const main = screen.getByRole('main');
    expect(main.textContent).not.toContain('HP -');
    expect(main.textContent).not.toContain('공격력-');
    expect(main.textContent).not.toContain('방어력-');
    expect(main.textContent).not.toContain('행동 기록 -');
  });

  it('caps an unsafe hero age before rendering the detail header', () => {
    const save = createInitialV4Save(130);
    const hero = { ...save.run.hero, age: Number.MAX_SAFE_INTEGER + 1 };

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

    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('9,007,199,254,740,991세');
    expect(main.textContent).not.toContain('9,007,199,254,740,992세');
  });
});
