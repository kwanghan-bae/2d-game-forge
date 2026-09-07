import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { startExpedition, startFacilityTask } from '../domain';
import { V4_DAILY_REWARDED_LIMIT } from '../monetization';
import { createInitialV4Save } from '../save';
import { TownHubScreen } from '../screens/TownHubScreen';

function renderHub(overrides: Partial<React.ComponentProps<typeof TownHubScreen>> = {}) {
  const save = overrides.save ?? createInitialV4Save(95);
  const props: React.ComponentProps<typeof TownHubScreen> = {
    save,
    now: save.createdAt,
    onPolicyChange: vi.fn(),
    onStartTask: vi.fn(),
    onCancelTask: vi.fn(),
    onRestAgent: vi.fn(),
    onRefresh: vi.fn(),
    onUpgrade: vi.fn(),
    onNavigate: vi.fn(),
    onIntervention: vi.fn(),
    monetizationAvailable: false,
    adFree: false,
    adsToday: 0,
    onInterventionCharge: vi.fn(),
    onBuyAdFree: vi.fn(),
    ...overrides,
  };
  return { ...render(<TownHubScreen {...props} />), props };
}

describe('V4 town hub support assignment', () => {
  it('keeps a facility startable without its specialist when that agent is busy', () => {
    const save = createInitialV4Save(96);
    save.meta.agents = save.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, activeTaskId: 'other-task' }
      : agent);
    const { props } = renderHub({ save });
    const blacksmith = screen.getByText('대장간').closest('article');
    expect(blacksmith).not.toBeNull();
    if (!blacksmith) return;

    const start = within(blacksmith).getByRole('button', { name: '작업 시작' });
    expect(start).toBeEnabled();
    expect(blacksmith).toHaveTextContent('지원 담당자 없이 기본 방식으로 시작');
    fireEvent.click(start);

    expect(props.onStartTask).toHaveBeenCalledWith('blacksmith', null);
  });

  it('assigns an idle specialist automatically for the improved task economy', () => {
    const { props } = renderHub();
    const blacksmith = screen.getByText('대장간').closest('article');
    expect(blacksmith).not.toBeNull();
    if (!blacksmith) return;

    fireEvent.click(within(blacksmith).getByRole('button', { name: '작업 시작' }));

    expect(props.onStartTask).toHaveBeenCalledWith('blacksmith', 'blacksmith');
  });

  it('exposes the selected sponsor policy to assistive technology', () => {
    renderHub();

    expect(screen.getByRole('button', { name: '공격 우선' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '안전 비축' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('surfaces the closest objective beside the hero before the facility list', () => {
    renderHub();

    const objective = screen.getByTestId('v4-top-objective');
    const hero = screen.getByTestId('v4-town-hub').querySelector('.v4-hero-card');
    expect(objective).toHaveAttribute('aria-label', '가장 가까운 목표');
    expect(objective).toHaveTextContent('다음 목표');
    expect(objective).toHaveTextContent('조선 평야에서 승리하면 깊은 숲이 열립니다.');
    expect(hero).not.toBeNull();
    expect(hero!.compareDocumentPosition(objective) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('moves focus to the hero heading when the town opens', () => {
    const save = createInitialV4Save(106);
    renderHub({ save });

    expect(screen.getByRole('heading', { name: save.run.hero.name })).toHaveFocus();
  });

  it('explains that a policy change during an expedition applies to the next departure', () => {
    const initial = createInitialV4Save(103);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    renderHub({ save: started.save });

    const policyPanel = screen.getByRole('heading', { name: '후원 정책' }).parentElement;
    expect(policyPanel).not.toBeNull();
    expect(policyPanel).toHaveTextContent('다음 원정부터 적용됩니다');
  });

  it('renders equipment output names instead of internal ids', () => {
    renderHub();

    const town = screen.getByTestId('v4-town-hub');
    expect(town).toHaveTextContent('장비 마을의 철검');
    expect(town.textContent).not.toContain('v4_iron_sword');
  });

  it('labels the next blacksmith task with the newly unlocked equipment', () => {
    const save = createInitialV4Save(104);
    save.meta.facilities.blacksmith.level = 3;
    save.run.hero.equipmentIds = ['v4_iron_sword'];
    save.run.hero.equipmentLevels = { v4_iron_sword: 1 };
    renderHub({ save });

    const blacksmith = screen.getByText('대장간').closest('article');
    expect(blacksmith).not.toBeNull();
    if (!blacksmith) return;
    expect(blacksmith).toHaveTextContent('다음: 수호 갑옷 제작');
  });

  it('updates the closest objective as realms are unlocked', () => {
    const save = createInitialV4Save(97);
    save.meta.unlockedRealms = ['joseon_plains', 'deep_forest'];
    renderHub({ save });

    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('깊은 숲에서 승리하면 저승이 열립니다.');
  });

  it('prioritizes a defeat recovery plan over the next Realm unlock prompt', () => {
    const save = createInitialV4Save(97);
    save.run.lastExpeditionResult = {
      id: 'defeat-objective',
      realmId: 'joseon_plains',
      outcome: 'defeat',
      completedAt: save.createdAt,
      reward: {},
      heroPower: 90,
      recommendedPower: 120,
      turns: 8,
      totalDamageDealt: 80,
      totalDamageTaken: 120,
      heroRemainingHp: 0,
      weaknessKR: '전투력이 부족했습니다. 대장간에서 장비를 준비하세요.',
      recommendedFacilityId: 'blacksmith',
      recommendedEquipmentId: 'v4_iron_sword',
      retryAfterSeconds: 45,
    };
    renderHub({ save });

    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('재도전을 준비하세요.');
    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('대장간에서 장비를 준비하세요.');
    expect(screen.getByText('가장 가까운 목표').parentElement).not.toHaveTextContent('세요.을');
  });

  it('explains that a pending next Realm record must be confirmed before another expedition', () => {
    const save = createInitialV4Save(102);
    save.run.lastExpeditionResult = {
      id: 'pending-unlock-objective',
      realmId: 'joseon_plains',
      outcome: 'victory',
      completedAt: save.createdAt,
      reward: { gold: 55 },
      heroPower: 220,
      recommendedPower: 120,
      turns: 8,
      totalDamageDealt: 500,
      totalDamageTaken: 40,
      heroRemainingHp: 960,
      weaknessKR: '다음 Realm의 준비를 점검하세요.',
      recommendedFacilityId: 'blacksmith',
      recommendedEquipmentId: null,
      retryAfterSeconds: 0,
    };
    renderHub({ save });

    const objective = screen.getByText('가장 가까운 목표').parentElement;
    expect(objective).toHaveTextContent('깊은 숲 기록을 먼저 확정하세요.');
    expect(objective).not.toHaveTextContent('조선 평야에서 승리하면');
  });

  it('points to the active expedition instead of repeating an outdated unlock goal', () => {
    const save = createInitialV4Save(98);
    save.run.expedition = {
      id: 'objective-expedition',
      realmId: 'joseon_plains',
      policy: 'aggression',
      assignedAgentId: null,
      startedAt: save.createdAt,
      completesAt: save.createdAt + 30_000,
      status: 'traveling',
      encounterIndex: 0,
    };
    renderHub({ save });

    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('원정이 진행 중입니다.');
  });

  it('keeps the hub readable when a malformed result has an unknown Realm id', () => {
    const save = createInitialV4Save(103);
    save.run.lastExpeditionResult = {
      id: 'unknown-realm-result',
      realmId: 'lost_realm' as never,
      outcome: 'defeat',
      completedAt: save.createdAt,
      reward: {},
      heroPower: 90,
      recommendedPower: 120,
      turns: 8,
      totalDamageDealt: 80,
      totalDamageTaken: 120,
      heroRemainingHp: 0,
      weaknessKR: '기록되지 않은 전투 결과입니다.',
      recommendedFacilityId: 'blacksmith',
      recommendedEquipmentId: null,
      retryAfterSeconds: 45,
    };

    expect(() => renderHub({ save })).not.toThrow();
    const objective = screen.getByText('가장 가까운 목표').parentElement;
    expect(objective).toHaveTextContent('기록되지 않은 Realm 재도전을 준비하세요.');
    expect(objective).not.toHaveTextContent('세요.을');
  });

  it('falls back when a defeat result has malformed weakness text', () => {
    const save = createInitialV4Save(104);
    save.run.lastExpeditionResult = {
      id: 'malformed-weakness-result',
      realmId: 'joseon_plains',
      outcome: 'defeat',
      completedAt: save.createdAt,
      reward: {},
      heroPower: 90,
      recommendedPower: 120,
      turns: 8,
      totalDamageDealt: 80,
      totalDamageTaken: 120,
      heroRemainingHp: 0,
      weaknessKR: undefined as never,
      recommendedFacilityId: 'blacksmith',
      recommendedEquipmentId: null,
      retryAfterSeconds: 45,
    };

    expect(() => renderHub({ save })).not.toThrow();
    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('원정 결과의 준비 정보를 확인하세요.');
  });

  it('does not expose an infinite remaining time for malformed facility clocks', () => {
    const initial = createInitialV4Save(99);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = Number.POSITIVE_INFINITY;

    renderHub({ save: started.save, now: started.save.createdAt });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;
    expect(temple.textContent).not.toContain('Infinity');
    expect(temple.textContent).not.toContain('NaN');
  });

  it('disables intervention charging when the safety reserve is already full', () => {
    const save = createInitialV4Save(100);
    save.run.interventionCharges = 3;
    renderHub({ save, monetizationAvailable: true });

    const benefits = screen.getByRole('heading', { name: /후원 혜택/ }).closest('section');
    expect(benefits).not.toBeNull();
    if (!benefits) return;
    const charge = within(benefits).getByRole('button', { name: '개입 충전 가득 참' });
    expect(charge).toBeDisabled();
  });

  it('disables instant facility completion after the daily ad limit', () => {
    const initial = createInitialV4Save(101);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    renderHub({ save: started.save, monetizationAvailable: true, adsToday: V4_DAILY_REWARDED_LIMIT, onInstantTask: vi.fn() });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;
    expect(within(temple).getByRole('button', { name: '광고 즉시 완료' })).toBeDisabled();
  });

  it('disables cancellation after a facility task is due for settlement', () => {
    const initial = createInitialV4Save(102);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    renderHub({ save: started.save, now: started.task.completesAt });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;
    expect(within(temple).getByRole('button', { name: '취소' })).toBeDisabled();
  });

  it('does not offer an ad to instantly finish a task that is already due', () => {
    const initial = createInitialV4Save(103);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    renderHub({ save: started.save, now: started.task.completesAt, monetizationAvailable: true, onInstantTask: vi.fn() });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;
    expect(within(temple).getByRole('button', { name: '광고 즉시 완료' })).toBeDisabled();
  });
});
