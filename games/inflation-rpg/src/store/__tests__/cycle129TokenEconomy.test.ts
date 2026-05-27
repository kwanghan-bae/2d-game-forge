// Cycle 129 — N5 Live Ops mega-phase: redeemTokens + evaluateAndGrantAchievements
// integration tests.
//
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F3.1, F3.2, F3.3,
// F1.9, F1.10, EDGE.6.
//
// **scope**: store action 단위 integration (vitest 안에서 useGameStore 직접 호출).

import { describe, expect, it, beforeEach } from 'vitest';
import { useGameStore, INITIAL_META } from '../gameStore';
import { INITIAL_ACHIEVEMENTS } from '../../data/achievementsTypes';
import type { AchievementId } from '../../data/achievementsTypes';
import type { CycleSaga, DeathCause, SagaEvent, SagaEventType } from '../../saga/SagaTypes';

const NOW = 1_700_000_000_000;

function mkSaga(opts: {
  finalLevel?: number;
  finalAge?: number;
  finalRealm?: string;
  deathCause?: DeathCause;
  events?: SagaEvent[];
} = {}): CycleSaga {
  const events = opts.events ?? [];
  return {
    cycleId: 'integ-test-' + Math.random().toString(36).slice(2, 8),
    endedAtMs: NOW,
    hero: {
      name: 'TestHero',
      seed: 42,
      finalAge: opts.finalAge ?? 70,
      finalJob: 'wanderer',
      finalLevel: opts.finalLevel ?? 0,
      finalPersonality: {} as never,
      cause: opts.deathCause ?? '자연사',
    },
    chapters: [{ name: 'youth' as never, events }],
    highlightEvents: [],
    finalLevel: opts.finalLevel ?? 0,
    finalAge: opts.finalAge ?? 70,
    finalRealm: opts.finalRealm ?? '',
    deathCause: opts.deathCause ?? '자연사',
    finishedAt: NOW,
  };
}

function mkEvent(type: SagaEventType, payload: Record<string, unknown>): SagaEvent {
  return { age: 10, type, narrativeText: '', payload };
}

/** clean store state — INITIAL_META 로 reset. */
function resetStore(): void {
  useGameStore.setState({
    meta: { ...INITIAL_META, achievements: INITIAL_ACHIEVEMENTS, tokens: 0, tokensRedeemed: 0, seasonStartedAt: 0 },
  });
}

describe('Cycle 129 — F3 redeemTokens (cycle 151 ratio 10:1 → 5:1)', () => {
  beforeEach(() => resetStore());

  /** F3.2 — 환전 비율: 5 token → 1 crackStone (cycle 151) */
  it('F3.2 10 token → 2 crackStone 환전 — 잔액 차감 + crackStones 증가', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, tokens: 25, crackStones: 0 } }));
    const r = useGameStore.getState().redeemTokens(10);
    expect(r).toEqual({ ok: true, tokenDelta: -10, crackDelta: 2 });
    const m = useGameStore.getState().meta;
    expect(m.tokens).toBe(15);
    expect(m.crackStones).toBe(2);
    expect(m.tokensRedeemed).toBe(10);
  });

  it('F3.2 20 token → 4 crackStone 환전 — multi-step', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, tokens: 25, crackStones: 5 } }));
    const r = useGameStore.getState().redeemTokens(20);
    expect(r).toEqual({ ok: true, tokenDelta: -20, crackDelta: 4 });
    const m = useGameStore.getState().meta;
    expect(m.tokens).toBe(5);
    expect(m.crackStones).toBe(9);
    expect(m.tokensRedeemed).toBe(20);
  });

  /** F3.3 — 잔액 부족: 5 미만이면 insufficient (cycle 151) */
  it('F3.3 잔액 부족 (4) → ok:false insufficient + meta 무변동', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, tokens: 4, crackStones: 0, tokensRedeemed: 0 } }));
    const r = useGameStore.getState().redeemTokens(5);
    expect(r).toEqual({ ok: false, reason: 'insufficient' });
    const m = useGameStore.getState().meta;
    expect(m.tokens).toBe(4);
    expect(m.crackStones).toBe(0);
    expect(m.tokensRedeemed).toBe(0);
  });

  /** invalid 가드 — non-integer / 0 / negative */
  it('invalid 가드 — 0/negative/non-integer/NaN → ok:false invalid', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, tokens: 100 } }));
    expect(useGameStore.getState().redeemTokens(0)).toEqual({ ok: false, reason: 'invalid' });
    expect(useGameStore.getState().redeemTokens(-10)).toEqual({ ok: false, reason: 'invalid' });
    expect(useGameStore.getState().redeemTokens(NaN)).toEqual({ ok: false, reason: 'invalid' });
    expect(useGameStore.getState().redeemTokens(3.5)).toEqual({ ok: false, reason: 'invalid' });
    // 잔액 무변동
    expect(useGameStore.getState().meta.tokens).toBe(100);
  });

  /** 5 미만 → insufficient (crackDelta = 0 reject) — cycle 151 */
  it('3 token 호출 → ok:false insufficient (5 미만 환전 불가)', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, tokens: 100 } }));
    const r = useGameStore.getState().redeemTokens(3);
    expect(r).toEqual({ ok: false, reason: 'insufficient' });
    expect(useGameStore.getState().meta.tokens).toBe(100);
  });
});

describe('Cycle 129 — F1 evaluateAndGrantAchievements + Cycle 131 manual claim', () => {
  beforeEach(() => resetStore());

  /** F3.1 — achievement 완료 → evaluator 만 / claim 후 token 누적 (cycle 131 분리) */
  it('F3.1 realm-conquest-6 완료 → evaluator 직후 tokens=0 / claim 후 tokens=2', () => {
    const conquestEvents: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    useGameStore.getState().evaluateAndGrantAchievements(
      mkSaga({ events: conquestEvents }),
      NOW,
    );
    // Cycle 131: evaluator 만 호출됐을 때 tokens delta = 0, claimedAt = undefined.
    const m1 = useGameStore.getState().meta;
    expect(m1.tokens).toBe(0);
    expect(m1.achievements.byId['realm-conquest-6'].completed).toBe(true);
    expect(m1.achievements.byId['realm-conquest-6'].claimedAt).toBeUndefined();

    // claim 호출 → tokens += 2 + claimedAt set.
    const r = useGameStore.getState().claimAchievement('realm-conquest-6', NOW);
    expect(r).toEqual({ ok: true, tokenDelta: 2 });
    const m2 = useGameStore.getState().meta;
    expect(m2.tokens).toBe(2);
    expect(m2.achievements.byId['realm-conquest-6'].claimedAt).toBe(NOW);
  });

  /** F1.8 — 중복 evaluator 호출 시 byId 안정 + claim 후 다시 호출해도 grant 0 */
  it('F1.8 중복 evaluator + claim → 두 번째 evaluator 호출은 grant 0', () => {
    const conquestEvents: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    useGameStore.getState().evaluateAndGrantAchievements(mkSaga({ events: conquestEvents }), NOW);
    useGameStore.getState().claimAchievement('realm-conquest-6', NOW);
    const claimedAt1 = useGameStore.getState().meta.achievements.byId['realm-conquest-6'].claimedAt;
    const tokensAfterClaim = useGameStore.getState().meta.tokens;

    // 다시 같은 saga emit — evaluator 만 호출됨, claimedAt 무변동, tokens 무변동.
    useGameStore.getState().evaluateAndGrantAchievements(mkSaga({ events: conquestEvents }), NOW + 9999);
    const m2 = useGameStore.getState().meta;
    expect(m2.tokens).toBe(tokensAfterClaim);
    expect(m2.achievements.byId['realm-conquest-6'].claimedAt).toBe(claimedAt1);
  });

  /** EDGE.6 — 5 starter 각자 completed → 각자 claim 호출 후 총 tokens=13 */
  it('EDGE.6 5 starter 완료 + claim — 총 tokens += 13', () => {
    // 1. lv-10m-in-3-cycles → 3 cycle 모두 10M+ → reward=1
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().evaluateAndGrantAchievements(
        mkSaga({ finalLevel: 10_000_000 }),
        NOW + i,
      );
    }
    expect(useGameStore.getState().claimAchievement('lv-10m-in-3-cycles', NOW + 1).ok).toBe(true);
    expect(useGameStore.getState().meta.tokens).toBe(1);

    // 2. npc-collect-4 → 4 unique npc → reward=2
    useGameStore.getState().evaluateAndGrantAchievements(
      mkSaga({
        events: [
          mkEvent('npcEncounter', { npcInstanceId: 'a', kind: 'mentor' }),
          mkEvent('npcEncounter', { npcInstanceId: 'b', kind: 'rival' }),
          mkEvent('npcEncounter', { npcInstanceId: 'c', kind: 'mentor' }),
          mkEvent('npcEncounter', { npcInstanceId: 'd', kind: 'mentor' }),
        ],
      }),
      NOW + 10,
    );
    expect(useGameStore.getState().claimAchievement('npc-collect-4-uniques', NOW + 10).ok).toBe(true);
    expect(useGameStore.getState().meta.tokens).toBe(1 + 2);

    // 3. realm-conquest-6 → 6 realm → reward=2
    useGameStore.getState().evaluateAndGrantAchievements(
      mkSaga({
        events: [
          mkEvent('realmEnter', { from: 'base', to: 'plains' }),
          mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
          mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
          mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
          mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
          mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
        ],
      }),
      NOW + 20,
    );
    expect(useGameStore.getState().claimAchievement('realm-conquest-6', NOW + 20).ok).toBe(true);
    expect(useGameStore.getState().meta.tokens).toBe(1 + 2 + 2);

    // 4. aging-master-10 → volcano 자연사 10 회 → reward=3
    for (let i = 0; i < 10; i++) {
      useGameStore.getState().evaluateAndGrantAchievements(
        mkSaga({ deathCause: '자연사', finalRealm: 'volcano' }),
        NOW + 100 + i,
      );
    }
    expect(useGameStore.getState().claimAchievement('aging-master-10', NOW + 200).ok).toBe(true);
    expect(useGameStore.getState().meta.tokens).toBe(1 + 2 + 2 + 3);

    // 5. inflation-flash-100x → ×100 jump 3 회 → reward=5
    useGameStore.getState().evaluateAndGrantAchievements(
      mkSaga({
        events: [
          mkEvent('levelUp', { oldLevel: 1, newLevel: 100 }),
          mkEvent('levelUp', { oldLevel: 100, newLevel: 10_000 }),
          mkEvent('levelUp', { oldLevel: 10_000, newLevel: 2_000_000 }),
        ],
      }),
      NOW + 200,
    );
    expect(useGameStore.getState().claimAchievement('inflation-flash-100x', NOW + 201).ok).toBe(true);
    expect(useGameStore.getState().meta.tokens).toBe(13);

    // 모든 5 starter 가 completed + claimedAt 기록.
    const m = useGameStore.getState().meta;
    const ids: AchievementId[] = [
      'lv-10m-in-3-cycles',
      'npc-collect-4-uniques',
      'realm-conquest-6',
      'aging-master-10',
      'inflation-flash-100x',
    ];
    for (const id of ids) {
      expect(m.achievements.byId[id].completed, `${id} should be completed`).toBe(true);
      expect(m.achievements.byId[id].claimedAt, `${id} should have claimedAt`).toBeDefined();
    }
  });

  /** 미완 saga → 진행도만 갱신, tokens 무변동 */
  it('미완 saga → tokens 무변동, achievements.progress 만 갱신', () => {
    useGameStore.getState().evaluateAndGrantAchievements(
      mkSaga({ finalLevel: 5_000_000 }),  // 5M < 10M threshold
      NOW,
    );
    const m = useGameStore.getState().meta;
    expect(m.tokens).toBe(0);
    expect(m.achievements.byId['lv-10m-in-3-cycles'].progress).toBe(0);
    expect(m.achievements.byId['lv-10m-in-3-cycles'].completed).toBe(false);
  });

  /** Cycle end → claim → redeemTokens 환전 통합 (cycle 131 분리, cycle 151 ratio) */
  it('evaluator + claim + redeemTokens 통합: realm-conquest-6 완료 → claim → 2 token / 환전 insufficient', () => {
    const events: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    useGameStore.getState().evaluateAndGrantAchievements(mkSaga({ events }), NOW);
    expect(useGameStore.getState().meta.tokens).toBe(0);
    useGameStore.getState().claimAchievement('realm-conquest-6', NOW);
    expect(useGameStore.getState().meta.tokens).toBe(2);
    // 2 token 으로 환전 시도 → 5 미만 → insufficient (cycle 151)
    const r = useGameStore.getState().redeemTokens(5);
    expect(r).toEqual({ ok: false, reason: 'insufficient' });
  });
});
