/**
 * AstralAlchemyModal.test.tsx — C1064: AstralAlchemyModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AstralAlchemyModal } from '../AstralAlchemyModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { ALL_ELIXIRS } from '../../systems/astralAlchemy';

describe('C1064: AstralAlchemyModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 100000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 150,
        crackStones: 10,
        enhanceStones: 50,
        elixirDoses: {},
      },
    });
  });

  it('renders modal with title, 4 elixir cards, resource header, and close button', () => {
    const onClose = vi.fn();
    render(<AstralAlchemyModal onClose={onClose} />);

    expect(screen.getByTestId('alchemy-modal')).toBeDefined();
    expect(screen.getByText(/천상 성광 연금술 가마/)).toBeDefined();
    expect(screen.getByText(/별빛 파편: 150개/)).toBeDefined();
    expect(screen.getByText(/100,000G/)).toBeDefined();

    for (const id of ALL_ELIXIRS) {
      expect(screen.getByTestId(`elixir-card-${id}`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId('close-alchemy-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches between elixir craft tab and shard transmutation tab', () => {
    render(<AstralAlchemyModal onClose={() => {}} />);

    // Default tab is craft
    expect(screen.getByTestId('elixir-card-solar_pill')).toBeDefined();

    // Switch to transmute tab
    fireEvent.click(screen.getByTestId('tab-transmute-shards'));
    expect(screen.getByTestId('transmute-crack-1-btn')).toBeDefined();
    expect(screen.getByTestId('transmute-enhance-5-btn')).toBeDefined();

    // Switch back to craft tab
    fireEvent.click(screen.getByTestId('tab-craft-elixir'));
    expect(screen.getByTestId('elixir-card-solar_pill')).toBeDefined();
  });

  it('transmutes crack stones into starlight shards and updates store & feedback', () => {
    render(<AstralAlchemyModal onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('tab-transmute-shards'));

    // Transmute 1 crack stone (10 shards)
    const btn1 = screen.getByTestId('transmute-crack-1-btn');
    fireEvent.click(btn1);

    const state1 = useGameStore.getState();
    expect(state1.meta.crackStones).toBe(9);
    expect(state1.meta.starlightShards).toBe(160); // 150 + 10
    expect(screen.getByTestId('alchemy-feedback-banner').textContent).toContain('별빛 파편 +10개');

    // Transmute 5 crack stones (50 shards)
    const btn5 = screen.getByTestId('transmute-crack-5-btn');
    fireEvent.click(btn5);

    const state2 = useGameStore.getState();
    expect(state2.meta.crackStones).toBe(4);
    expect(state2.meta.starlightShards).toBe(210); // 160 + 50
    expect(screen.getByTestId('alchemy-feedback-banner').textContent).toContain('별빛 파편 +50개');
  });

  it('transmutes enhance stones into starlight shards', () => {
    render(<AstralAlchemyModal onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('tab-transmute-shards'));

    // Transmute 5 enhance stones (10 shards)
    const btn5 = screen.getByTestId('transmute-enhance-5-btn');
    fireEvent.click(btn5);

    const state1 = useGameStore.getState();
    expect(state1.meta.enhanceStones).toBe(45);
    expect(state1.meta.starlightShards).toBe(160); // 150 + 10

    // Transmute 25 enhance stones (50 shards)
    const btn25 = screen.getByTestId('transmute-enhance-25-btn');
    fireEvent.click(btn25);

    const state2 = useGameStore.getState();
    expect(state2.meta.enhanceStones).toBe(20);
    expect(state2.meta.starlightShards).toBe(210); // 160 + 50
  });

  it('crafts elixir, consumes shards and gold, increments dose and shows stat bonuses', () => {
    render(<AstralAlchemyModal onClose={() => {}} />);

    // solar_pill elixir: cost 50 shards, 10,000G
    const solarBtn = screen.getByTestId('craft-btn-solar_pill');
    expect(solarBtn).not.toBeDisabled();
    expect(solarBtn.textContent).toContain('연성 및 복용');

    fireEvent.click(solarBtn);

    const state = useGameStore.getState();
    expect(state.meta.starlightShards).toBe(100); // 150 - 50
    expect(state.run.goldThisRun).toBe(90000); // 100,000 - 10,000
    expect(state.meta.elixirDoses?.solar_pill).toBe(1);

    expect(screen.getByTestId('alchemy-feedback-banner').textContent).toContain('태양의 환약');

    // Total bonuses section updated (solar_pill gives +2% atk)
    const bonusPanel = screen.getByTestId('elixir-total-bonuses');
    expect(bonusPanel.textContent).toContain('공격력: +2%');
  });

  it('disables craft button when resources are insufficient', () => {
    useGameStore.setState({
      run: { ...INITIAL_RUN, goldThisRun: 100 },
      meta: { ...INITIAL_META, starlightShards: 5 },
    });

    render(<AstralAlchemyModal onClose={() => {}} />);

    const solarBtn = screen.getByTestId('craft-btn-solar_pill');
    expect(solarBtn).toBeDisabled();
    expect(solarBtn.textContent).toContain('재료 부족');
  });

  it('disables craft button when dose cap (10) is reached', () => {
    useGameStore.setState({
      run: { ...INITIAL_RUN, goldThisRun: 1000000 },
      meta: {
        ...INITIAL_META,
        starlightShards: 1000,
        elixirDoses: { solar_pill: 10 },
      },
    });

    render(<AstralAlchemyModal onClose={() => {}} />);

    const solarBtn = screen.getByTestId('craft-btn-solar_pill');
    expect(solarBtn).toBeDisabled();
    expect(solarBtn.textContent).toContain('한도 달성');
    expect(screen.getByTestId('elixir-card-solar_pill').textContent).toContain('MAX');
  });
});
