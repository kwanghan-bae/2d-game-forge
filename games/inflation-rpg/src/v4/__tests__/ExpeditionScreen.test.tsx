import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialV4Save } from '../save';
import { startExpedition } from '../domain';
import { ExpeditionScreen } from '../screens/ExpeditionScreen';
import type { ExpeditionResult, V4SaveEnvelope } from '../types';

function renderResult(result: ExpeditionResult) {
  const save = createInitialV4Save(101);
  save.run.lastExpeditionResult = result;
  const props = {
    save,
    now: save.updatedAt,
    onStart: vi.fn(),
    onConfirm: vi.fn(),
    onConfirmUnlock: vi.fn(),
    onRefresh: vi.fn(),
    onIntervention: vi.fn(),
    onBack: vi.fn(),
  } satisfies React.ComponentProps<typeof ExpeditionScreen>;
  return render(<ExpeditionScreen {...props} />);
}

function baseResult(overrides: Partial<ExpeditionResult> = {}): ExpeditionResult {
  return {
    id: 'result-1',
    realmId: 'joseon_plains',
    outcome: 'victory',
    completedAt: 1_000,
    reward: { gold: 55, materials: 4 },
    heroPower: 180,
    recommendedPower: 150,
    turns: 5,
    totalDamageDealt: 220,
    totalDamageTaken: 18,
    heroRemainingHp: 120,
    weaknessKR: '공격력',
    recommendedFacilityId: 'blacksmith',
    recommendedEquipmentId: null,
    retryAfterSeconds: 20,
    ...overrides,
  };
}

describe('V4 expedition result screen', () => {
  it('renders Korean resource labels instead of storage keys', () => {
    renderResult(baseResult());

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('금화 +55');
    expect(result).toHaveTextContent('재료 +4');
    expect(result.textContent).not.toContain('gold +55');
    expect(result.textContent).not.toContain('materials +4');
  });

  it('renders the Korean name of a recommended equipment item', () => {
    renderResult(baseResult({
      outcome: 'defeat',
      recommendedEquipmentId: 'v4_guardian_armor',
    }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('추천 장비 · 수호 갑옷');
    expect(result.textContent).not.toContain('v4_guardian_armor');
  });

  it('does not present a fully fatigued guide as ready for dispatch', () => {
    const save = createInitialV4Save(102);
    save.meta.agents = save.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: 100 }
      : agent);
    const onStart = vi.fn();
    const props = {
      save,
      now: save.updatedAt,
      onStart,
      onConfirm: vi.fn(),
      onConfirmUnlock: vi.fn(),
      onRefresh: vi.fn(),
      onIntervention: vi.fn(),
      onBack: vi.fn(),
    } satisfies React.ComponentProps<typeof ExpeditionScreen>;
    render(<ExpeditionScreen {...props} />);

    const plains = screen.getByRole('heading', { name: /조선 평야/ }).closest('article');
    expect(plains).not.toBeNull();
    if (!plains) return;
    const guideButton = within(plains).getByRole('button', { name: '길잡이 휴식 필요' });
    expect(guideButton).toBeDisabled();
    fireEvent.click(within(plains).getByRole('button', { name: '혼자 출발' }));
    expect(onStart).toHaveBeenCalledWith('joseon_plains', null);
  });

  it('keeps active expedition progress finite when its clock data is malformed', () => {
    const initial = createInitialV4Save(103);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    const props = {
      save: started.save,
      now: Number.NaN,
      onStart: vi.fn(),
      onConfirm: vi.fn(),
      onConfirmUnlock: vi.fn(),
      onRefresh: vi.fn(),
      onIntervention: vi.fn(),
      onBack: vi.fn(),
    } satisfies React.ComponentProps<typeof ExpeditionScreen>;

    const { container } = render(<ExpeditionScreen {...props} />);
    const progress = container.querySelector('.v4-progress span');
    expect(progress).toHaveStyle({ width: '0%' });
    const active = screen.getByTestId('v4-active-expedition');
    expect(active.textContent).not.toContain('NaN');
    expect(active.textContent).not.toContain('Infinity');
  });
});
