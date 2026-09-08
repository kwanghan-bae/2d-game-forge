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
    adFreePurchasePending: false,
    instantTaskPendingFacilities: [],
    interventionChargePending: false,
    onInterventionCharge: vi.fn(),
    onBuyAdFree: vi.fn(),
    ...overrides,
  };
  return { ...render(<TownHubScreen {...props} />), props };
}

describe('V4 town hub support assignment', () => {
  it('describes recovery and archive effects without promising unsupported effects', () => {
    renderHub();

    const recovery = screen.getByText('회복당').closest('article');
    const archive = screen.getByText('기록관').closest('article');
    expect(recovery).not.toBeNull();
    expect(archive).not.toBeNull();
    expect(recovery).toHaveTextContent('HP를 완전히 회복');
    expect(recovery).not.toHaveTextContent('피로');
    expect(archive).toHaveTextContent('사가');
    expect(archive).toHaveTextContent('균열석');
    expect(archive).not.toHaveTextContent('영구 해금');
  });

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

  it('shows each support agent trait so the player can choose the right assignment', () => {
    renderHub();

    const panel = screen.getByRole('heading', { name: '지원 에이전트' }).closest('section');
    expect(panel).not.toBeNull();
    if (!panel) return;

    expect(panel).toHaveTextContent('정밀 제작');
    expect(panel).toHaveTextContent('안전한 축원');
    expect(panel).toHaveTextContent('위험 경로 감지');
  });

  it('uses static support-agent metadata when an in-memory card is tampered', () => {
    const save = createInitialV4Save(113);
    save.meta.agents = save.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, nameKR: 'internal_agent_name', roleKR: 'internal_role', trait: 'internal_trait' }
      : agent);

    renderHub({ save });

    const panel = screen.getByRole('heading', { name: '지원 에이전트' }).closest('section');
    expect(panel).not.toBeNull();
    if (!panel) return;
    expect(panel).toHaveTextContent('대장장이 담철');
    expect(panel).toHaveTextContent('정밀 제작');
    expect(panel.textContent).not.toContain('internal_agent_name');
    expect(panel.textContent).not.toContain('internal_role');
    expect(panel.textContent).not.toContain('internal_trait');
  });

  it('disables agent rest when the persisted fatigue is malformed', () => {
    const save = createInitialV4Save(114);
    save.meta.agents = save.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: Number.NaN }
      : agent);

    renderHub({ save });

    const agent = screen.getByText('대장장이').closest('.v4-agent') as HTMLElement | null;
    expect(agent).not.toBeNull();
    if (!agent) return;
    expect(agent).toHaveTextContent('에이전트 정보 확인 필요');
    expect(within(agent).getByRole('button', { name: '휴식' })).toBeDisabled();
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

  it('keeps an unknown active expedition policy readable', () => {
    const initial = createInitialV4Save(128);
    const started = startExpedition(initial, 'joseon_plains', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.policy = 'constructor' as never;

    renderHub({ save: started.save });

    const policyPanel = screen.getByRole('heading', { name: '후원 정책' }).parentElement;
    expect(policyPanel).toHaveTextContent('정책 확인 필요');
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

  it('shows the next facility upgrade cost in the card instead of hiding it in accessibility text', () => {
    renderHub();

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;

    expect(temple).toHaveTextContent('강화 비용 · 금화 80 · 재료 4');
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

  it('prioritizes an awaiting expedition confirmation in the closest objective', () => {
    const save = createInitialV4Save(107);
    save.run.expedition = {
      id: 'objective-awaiting-confirmation',
      realmId: 'deep_forest',
      policy: 'aggression',
      assignedAgentId: null,
      startedAt: save.createdAt,
      completesAt: save.createdAt + 30_000,
      status: 'awaiting_confirmation',
      encounterIndex: 2,
    };

    renderHub({ save });

    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('원정 결과 확인이 필요합니다.');
    expect(screen.getByText('가장 가까운 목표').parentElement).toHaveTextContent('원정 화면에서 귀환을 확정하세요.');
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

  it('normalizes malformed hero and agent numbers before rendering the hub', () => {
    const save = createInitialV4Save(105);
    save.run.hero.age = Number.NaN;
    save.run.hero.level = Number.POSITIVE_INFINITY;
    save.run.hero.hp = Number.NaN;
    save.run.hero.hpMax = Number.POSITIVE_INFINITY;
    save.run.hero.atk = -25;
    save.run.hero.def = Number.POSITIVE_INFINITY;
    save.run.interventionCharges = Number.NaN;
    save.meta.agents = save.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, level: Number.NaN, trust: Number.POSITIVE_INFINITY, fatigue: -10 }
      : agent);

    expect(() => renderHub({ save })).not.toThrow();

    const town = screen.getByTestId('v4-town-hub');
    expect(town.textContent).not.toContain('NaN');
    expect(town.textContent).not.toContain('Infinity');
    expect(town.textContent).not.toContain('∞');
    expect(town.textContent).not.toContain('-25');
    expect(within(town).getByRole('button', { name: '즉시 회복' })).toBeDisabled();
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

  it('uses the canonical facility label when an active task type is malformed', () => {
    const initial = createInitialV4Save(112);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    started.save.meta.tasks[started.task.id].type = 'internal_task_key';
    renderHub({ save: started.save });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;
    expect(temple).toHaveTextContent('기도를 올리기');
    expect(temple.textContent).not.toContain('internal_task_key');
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

  it('disables the ad-free purchase button while the store request is pending', () => {
    const save = createInitialV4Save(109);
    renderHub({ save, monetizationAvailable: true, adFreePurchasePending: true });

    const benefits = screen.getByRole('heading', { name: /후원 혜택/ }).closest('section');
    expect(benefits).not.toBeNull();
    if (!benefits) return;

    expect(within(benefits).getByRole('button', { name: '구매 처리 중' })).toBeDisabled();
  });

  it('shows the instant-task provider state and blocks task mutations while pending', () => {
    const initial = createInitialV4Save(110);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    renderHub({ save: started.save, monetizationAvailable: true, onInstantTask: vi.fn(), instantTaskPendingFacilities: ['temple'] });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;

    expect(within(temple).getByRole('button', { name: '광고 처리 중' })).toBeDisabled();
    expect(within(temple).getByRole('button', { name: '진행 확인' })).toBeDisabled();
    expect(within(temple).getByRole('button', { name: '취소' })).toBeDisabled();
  });

  it('shows the intervention reward state while the provider is pending', () => {
    const save = createInitialV4Save(111);
    renderHub({ save, monetizationAvailable: true, interventionChargePending: true });

    const benefits = screen.getByRole('heading', { name: /후원 혜택/ }).closest('section');
    expect(benefits).not.toBeNull();
    if (!benefits) return;

    expect(within(benefits).getByRole('button', { name: '충전 처리 중' })).toBeDisabled();
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

  it('disables facility upgrades while that facility has active work', () => {
    const initial = createInitialV4Save(120);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    renderHub({ save: started.save });

    const temple = screen.getByText('신전').closest('article');
    expect(temple).not.toBeNull();
    if (!temple) return;
    expect(within(temple).getByRole('button', { name: /신전 강화/ })).toBeDisabled();
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
