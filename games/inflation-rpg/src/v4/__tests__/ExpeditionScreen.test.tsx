import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialV4Save } from '../save';
import { getExpeditionSuccessChance, startExpedition } from '../domain';
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
  it('shows the expected reward before the player dispatches an expedition', () => {
    const save = createInitialV4Save(100);
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

    render(<ExpeditionScreen {...props} />);

    const plains = screen.getByRole('heading', { name: /조선 평야/ }).closest('article');
    expect(plains).not.toBeNull();
    if (!plains) return;
    expect(plains).toHaveTextContent('예상 보상 · 금화 +55 · 재료 +4');
    expect(plains).toHaveTextContent('기본 경로 80초');
  });

  it('blocks both departure paths when the Realm preparation cost is unavailable', () => {
    const save = createInitialV4Save(108);
    save.meta.currencies.spirit = 0;
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

    render(<ExpeditionScreen {...props} />);

    const plains = screen.getByRole('heading', { name: /조선 평야/ }).closest('article');
    expect(plains).not.toBeNull();
    if (!plains) return;
    expect(plains).toHaveTextContent('출발 비용 부족 · 신력 12 필요');
    expect(within(plains).getAllByRole('button', { name: '재화 부족' })).toHaveLength(2);
    expect(within(plains).getAllByRole('button', { name: '재화 부족' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('moves focus to the expedition heading when the screen opens', () => {
    const save = createInitialV4Save(107);
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

    render(<ExpeditionScreen {...props} />);

    expect(screen.getByRole('heading', { name: '원정소' })).toHaveFocus();
  });

  it('renders Korean resource labels instead of storage keys', () => {
    renderResult(baseResult());

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('금화 +55');
    expect(result).toHaveTextContent('재료 +4');
    expect(result.textContent).not.toContain('gold +55');
    expect(result.textContent).not.toContain('materials +4');
  });

  it('shows the departure policy while an expedition is active', () => {
    const save = createInitialV4Save(102);
    const started = startExpedition(save, 'joseon_plains', save.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.policy = 'hoarding';

    render(<ExpeditionScreen
      save={started.save}
      now={started.save.createdAt}
      onStart={vi.fn()}
      onConfirm={vi.fn()}
      onConfirmUnlock={vi.fn()}
      onRefresh={vi.fn()}
      onIntervention={vi.fn()}
      onBack={vi.fn()}
    />);

    expect(screen.getByText(/정책:/)).toHaveTextContent('공격 우선');
    expect(screen.getByText(/정책:/)).not.toHaveTextContent('안전 비축');
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

  it('explains the no-reward outcome instead of leaving an empty victory card', () => {
    renderResult(baseResult({ reward: {} }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('획득 보상 · 없음');
    expect(result).toHaveTextContent('사가에 원정 기록을 남겼습니다');
    expect(result.textContent).not.toContain('다음 시설 작업으로 준비하세요');
  });

  it('keeps the result card readable when the reward payload is malformed', () => {
    expect(() => renderResult(baseResult({ reward: null as never }))).not.toThrow();

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('획득 보상 · 없음');
    expect(result).toHaveTextContent('사가에 원정 기록을 남겼습니다');
  });

  it('shows that a defeat preserves permanent resources and displays every preparation cost', () => {
    const save = createInitialV4Save(104);
    save.meta.unlockedRealms.push('deep_forest');
    save.run.lastExpeditionResult = baseResult({
      realmId: 'deep_forest',
      outcome: 'defeat',
      reward: {},
      recommendedFacilityId: 'training',
    });
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

    render(<ExpeditionScreen {...props} />);

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('영구 자산은 보존되었습니다');
    const forest = screen.getByRole('heading', { name: /깊은 숲/ }).closest('article');
    expect(forest).not.toBeNull();
    if (!forest) return;
    expect(forest).toHaveTextContent('준비 비용 · 신력 25 · 재료 1');
  });

  it('keeps the result screen readable when a malformed Realm id is supplied', () => {
    expect(() => renderResult(baseResult({ realmId: 'lost_realm' as never }))).not.toThrow();
    expect(screen.getByTestId('v4-expedition-result')).toHaveTextContent('기록되지 않은 Realm');
  });

  it('does not expose non-finite result stats or malformed preparation text', () => {
    renderResult(baseResult({
      outcome: 'defeat',
      heroPower: Number.POSITIVE_INFINITY,
      recommendedPower: Number.NaN,
      turns: Number.NaN,
      totalDamageTaken: Number.POSITIVE_INFINITY,
      successChance: Number.NaN,
      encountersCleared: Number.NaN,
      totalEncounterCount: Number.POSITIVE_INFINITY,
      retryAfterSeconds: Number.NaN,
      weaknessKR: undefined as never,
    }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result.textContent).not.toContain('Infinity');
    expect(result.textContent).not.toContain('NaN');
    expect(result).toHaveTextContent('원정 결과의 준비 정보를 확인하세요.');
  });

  it('does not present negative result stats as player-facing values', () => {
    renderResult(baseResult({
      outcome: 'defeat',
      heroPower: -5,
      recommendedPower: -1,
      turns: -2,
      totalDamageTaken: -3,
    }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent(/전투력\s*0/);
    expect(result).toHaveTextContent(/\/ 권장\s*0/);
    expect(result).toHaveTextContent(/전투\s*0턴/);
    expect(result).toHaveTextContent('받은 피해 0');
    expect(result.textContent).not.toContain('-5');
    expect(result.textContent).not.toContain('-1');
    expect(result.textContent).not.toContain('-2');
    expect(result.textContent).not.toContain('-3');
  });

  it('normalizes fractional and unsafe reward values before rendering', () => {
    renderResult(baseResult({
      reward: { gold: 1.9, materials: Number.MAX_SAFE_INTEGER + 1, spirit: -5 },
    }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('금화 +1');
    expect(result).toHaveTextContent('재료 +9,007,199,254,740,991');
    expect(result.textContent).not.toContain('1.9');
    expect(result.textContent).not.toContain('9,007,199,254,740,992');
    expect(result.textContent).not.toContain('-5');
  });

  it('caps an unsafe retry estimate before rendering it', () => {
    renderResult(baseResult({
      outcome: 'defeat',
      retryAfterSeconds: Number.MAX_SAFE_INTEGER + 1,
    }));

    const result = screen.getByTestId('v4-expedition-result');
    expect(result).toHaveTextContent('예상 재도전 9,007,199,254,740,991초');
    expect(result.textContent).not.toContain('9,007,199,254,740,992');
  });

  it('does not crash when an active expedition contains an inherited Realm key', () => {
    const save = createInitialV4Save(105);
    save.run.expedition = {
      id: 'malformed-active-realm',
      realmId: 'constructor' as never,
      policy: 'aggression',
      assignedAgentId: null,
      startedAt: save.createdAt,
      completesAt: save.createdAt + 30_000,
      status: 'traveling',
      encounterIndex: 0,
    };
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

    expect(() => render(<ExpeditionScreen {...props} />)).not.toThrow();
    expect(screen.getByTestId('v4-active-expedition')).toHaveTextContent('기록되지 않은 Realm');
  });

  it('uses generic confirmation wording when a risky route is parked before its boss stage', () => {
    const initial = createInitialV4Save(106);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.status = 'awaiting_confirmation';
    started.save.run.expedition!.encounterIndex = 0;
    const props = {
      save: started.save,
      now: started.save.updatedAt,
      onStart: vi.fn(),
      onConfirm: vi.fn(),
      onConfirmUnlock: vi.fn(),
      onRefresh: vi.fn(),
      onIntervention: vi.fn(),
      onBack: vi.fn(),
    } satisfies React.ComponentProps<typeof ExpeditionScreen>;

    render(<ExpeditionScreen {...props} />);

    const active = screen.getByTestId('v4-active-expedition');
    expect(active).toHaveTextContent('원정 결과와 보상을 확인한 뒤 귀환을 확정하세요');
    expect(within(active).getByRole('button', { name: '원정 결과 확인' })).toBeInTheDocument();
    expect(within(active).queryByRole('button', { name: '보스 결과 확인' })).toBeNull();
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
    expect(plains).toHaveTextContent(`보스 예상 승률 ${Math.round(getExpeditionSuccessChance(save, 'joseon_plains', 2, null) * 100)}%`);
    fireEvent.click(within(plains).getByRole('button', { name: '혼자 출발' }));
    expect(onStart).toHaveBeenCalledWith('joseon_plains', null);
  });

  it('does not describe a missing guide as busy when guide assignment is unavailable', () => {
    const save = createInitialV4Save(109);
    save.meta.agents = save.meta.agents.filter((agent) => agent.id !== 'guide');
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

    render(<ExpeditionScreen {...props} />);

    const plains = screen.getByRole('heading', { name: /조선 평야/ }).closest('article');
    expect(plains).not.toBeNull();
    if (!plains) return;
    expect(within(plains).getByRole('button', { name: '길잡이 정보 확인 필요' })).toBeDisabled();
    expect(plains).not.toHaveTextContent('길잡이 사용 중');
  });

  it('does not present malformed guide fatigue as an available assignment', () => {
    const save = createInitialV4Save(110);
    save.meta.agents = save.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: Number.NaN }
      : agent);
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

    render(<ExpeditionScreen {...props} />);

    const plains = screen.getByRole('heading', { name: /조선 평야/ }).closest('article');
    expect(plains).not.toBeNull();
    if (!plains) return;
    expect(within(plains).getByRole('button', { name: '길잡이 정보 확인 필요' })).toBeDisabled();
    expect(plains).not.toHaveTextContent('길잡이와 출발');
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
