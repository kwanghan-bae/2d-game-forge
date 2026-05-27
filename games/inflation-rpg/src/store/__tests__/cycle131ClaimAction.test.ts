// Cycle 131 — N5 manual claim 액션 단위 테스트.
// PRD: docs/superpowers/evolution/cycle-131-prd.md F1.1 ~ F1.9 중 cycle129 회귀
// 갱신본이 다루지 않는 좁은 케이스 (locked/unknown-id/immutable invariant) 만.

import { describe, expect, it, beforeEach } from 'vitest';
import { useGameStore, INITIAL_META } from '../gameStore';
import { INITIAL_ACHIEVEMENTS } from '../../data/achievementsTypes';
import type { CycleSaga, SagaEvent, SagaEventType } from '../../saga/SagaTypes';

const NOW = 1_700_000_000_000;

function mkSaga(): CycleSaga {
  return {
    cycleId: 'cycle131-' + Math.random().toString(36).slice(2, 8),
    endedAtMs: NOW,
    hero: {
      name: 'TestHero',
      seed: 42,
      finalAge: 70,
      finalJob: 'wanderer',
      finalLevel: 0,
      finalPersonality: {} as never,
      cause: '자연사',
    },
    chapters: [{ name: 'youth' as never, events: [] }],
    highlightEvents: [],
    finalLevel: 0,
    finalAge: 70,
    finalRealm: '',
    deathCause: '자연사',
    finishedAt: NOW,
  };
}

function mkEvent(type: SagaEventType, payload: Record<string, unknown>): SagaEvent {
  return { age: 10, type, narrativeText: '', payload };
}

function resetStore(): void {
  useGameStore.setState({
    meta: { ...INITIAL_META, achievements: INITIAL_ACHIEVEMENTS, tokens: 0, tokensRedeemed: 0, seasonStartedAt: 0 },
  });
}

describe('Cycle 131 — claimAchievement 좁은 케이스', () => {
  beforeEach(() => resetStore());

  /** F1.3 — locked claim 차단 (completed === false) */
  it('F1.3 locked claim 차단 → not-completed reason / state 변경 0', () => {
    const before = useGameStore.getState().meta;
    const r = useGameStore.getState().claimAchievement('realm-conquest-6', NOW);
    expect(r).toEqual({ ok: false, reason: 'not-completed' });
    const after = useGameStore.getState().meta;
    expect(after.tokens).toBe(before.tokens);
    expect(after.achievements.byId['realm-conquest-6'].claimedAt).toBeUndefined();
    expect(after.achievements.byId['realm-conquest-6'].completed).toBe(false);
  });

  /** F1.4 — unknown id 차단 */
  it('F1.4 unknown id 차단 → unknown-id reason / throw 0 / state 변경 0', () => {
    const before = useGameStore.getState().meta;
    // ALL_ACHIEVEMENT_IDS 에 없는 임의의 string. AchievementId 타입 우회.
    const r = useGameStore.getState().claimAchievement('not-a-real-id' as never, NOW);
    expect(r).toEqual({ ok: false, reason: 'unknown-id' });
    expect(useGameStore.getState().meta).toBe(before);
  });

  /** F1.2 — idempotent: completed + claimedAt 있는 entry 에 재 claim → already-claimed */
  it('F1.2 already-claimed → 두 번째 claim 은 reject + tokens / claimedAt 변동 0', () => {
    // 6 realm conquest 발생시키고 1 회 claim → 두 번째 claim
    const conquestEvents: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    const saga = mkSaga();
    saga.chapters = [{ name: 'youth' as never, events: conquestEvents }];
    useGameStore.getState().evaluateAndGrantAchievements(saga, NOW);

    const r1 = useGameStore.getState().claimAchievement('realm-conquest-6', NOW);
    expect(r1).toEqual({ ok: true, tokenDelta: 2 });
    const tokens1 = useGameStore.getState().meta.tokens;
    const claimedAt1 = useGameStore.getState().meta.achievements.byId['realm-conquest-6'].claimedAt;

    const r2 = useGameStore.getState().claimAchievement('realm-conquest-6', NOW + 1000);
    expect(r2).toEqual({ ok: false, reason: 'already-claimed' });
    expect(useGameStore.getState().meta.tokens).toBe(tokens1);
    expect(useGameStore.getState().meta.achievements.byId['realm-conquest-6'].claimedAt).toBe(claimedAt1);
  });

  /** F1.9 — immutable invariant: claim 후 achievements 객체 reference 변경 */
  it('F1.9 immutable — claim 후 achievements / byId reference 변경, 다른 entry 는 reference 보존', () => {
    const conquestEvents: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    const saga = mkSaga();
    saga.chapters = [{ name: 'youth' as never, events: conquestEvents }];
    useGameStore.getState().evaluateAndGrantAchievements(saga, NOW);

    const beforeAch = useGameStore.getState().meta.achievements;
    const beforeOther = beforeAch.byId['lv-10m-in-3-cycles'];

    useGameStore.getState().claimAchievement('realm-conquest-6', NOW);

    const afterAch = useGameStore.getState().meta.achievements;
    expect(afterAch).not.toBe(beforeAch);
    expect(afterAch.byId).not.toBe(beforeAch.byId);
    // 변경되지 않은 entry 는 reference 보존
    expect(afterAch.byId['lv-10m-in-3-cycles']).toBe(beforeOther);
    // 변경된 entry 는 새 reference
    expect(afterAch.byId['realm-conquest-6']).not.toBe(beforeAch.byId['realm-conquest-6']);
  });

  /** F1.1 (discriminator 보완) — evaluator 만 호출 시 tokens delta = 0 */
  it('F1.1 discriminator — evaluator 만 호출 시 tokens delta = 0 (cycle 130 까지의 auto-grant 부재)', () => {
    const before = useGameStore.getState().meta.tokens;
    const conquestEvents: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    const saga = mkSaga();
    saga.chapters = [{ name: 'youth' as never, events: conquestEvents }];
    useGameStore.getState().evaluateAndGrantAchievements(saga, NOW);
    expect(useGameStore.getState().meta.tokens).toBe(before);
    expect(useGameStore.getState().meta.achievements.byId['realm-conquest-6'].completed).toBe(true);
    expect(useGameStore.getState().meta.achievements.byId['realm-conquest-6'].claimedAt).toBeUndefined();
  });
});
