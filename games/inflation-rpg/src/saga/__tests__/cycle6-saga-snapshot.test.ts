/**
 * Cycle 6 P1 — sagaHistory[] 항목의 flat snapshot field 보장.
 *
 * 정찰 finding: 누적 사가 4건 항목의 finalLevel / finalAge / finalRealm /
 * deathCause / finishedAt 가 모두 undefined. UI 가 단일 카드에 LV / age /
 * realm / cause 를 보여주려면 flat field 필요.
 *
 * Fix: SagaRecorder.finalize() 가 `finalRealm` opts 를 받고, CycleSaga 에
 * top-level alias 5 종 채워서 반환. CycleControllerV2.finalize() 는
 * controller 의 currentRealmId 를 넘긴다.
 *
 * PRD §51 명시: 기존 cycle 5 이전 stale item 은 retroactive migration 안 함 →
 * type 에서 5 field 를 optional 로 유지. 신규 cycle 종료 후 sagaHistory 의
 * 마지막 item 만 본 테스트 범위.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';
import { CycleControllerV2 } from '../../overworld/CycleControllerV2';
import { SagaRecorder } from '../SagaRecorder';

beforeEach(() => {
  useGameStore.setState({ run: INITIAL_RUN, meta: INITIAL_META });
  useCycleStoreV2.getState().reset();
});

describe('cycle-6 P1 — sagaHistory snapshot flat fields', () => {
  it('SagaRecorder.finalize() 가 flat snapshot 5 field 를 모두 채운다', () => {
    const rec = new SagaRecorder('홍길동', 7);
    const before = Date.now();
    const saga = rec.finalize({
      finalAge: 75,
      finalJob: '무사',
      finalLevel: 999,
      finalPersonality: { moral: 1, prudent: 0, heroic: 2, merciful: 0, pious: 1 },
      cause: '전사',
      finalRealm: 'sea',
    });
    const after = Date.now();

    // PRD 수용 c — 5 flat field 모두 정의됨
    expect(saga.finalLevel).toBe(999);
    expect(saga.finalAge).toBe(75);
    expect(saga.finalRealm).toBe('sea');
    expect(saga.deathCause).toBe('전사');
    expect(saga.finishedAt).toBeGreaterThanOrEqual(before);
    expect(saga.finishedAt).toBeLessThanOrEqual(after);

    // 기존 nested 형도 그대로 (backwards-compat)
    expect(saga.hero.finalAge).toBe(75);
    expect(saga.hero.finalJob).toBe('무사');
    expect(saga.hero.finalLevel).toBe(999);
    expect(saga.hero.cause).toBe('전사');

    // endedAtMs === finishedAt — 1ms drift 방지 (한 번의 Date.now() 캡처)
    expect(saga.endedAtMs).toBe(saga.finishedAt);
  });

  it('endCycle("자연사") 직후 sagaHistory 의 마지막 item 이 5 field 모두 채워짐 (PRD 수용 c)', () => {
    // PRD 수용 c 의 직접 실행:
    //   finalLevel === store.hero.level (cleared 전 값)
    //   finalAge === store.hero.age
    //   finalRealm === 'base' (cycle 5 fix 적용 전 currentRealmId)
    //   deathCause === '자연사'
    //   finishedAt === Date.now() ± 1s
    useCycleStoreV2.getState().start({
      seed: 12345,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    const ctrl = useCycleStoreV2.getState().controller!;
    expect(ctrl).not.toBeNull();
    // hero state 진전 — handleArrival 몇 번 (level/age 변동)
    for (let i = 0; i < 10; i++) {
      ctrl.handleArrival('enemy', `enemy_${i}`);
    }
    const heroBefore = ctrl.getHero();
    const levelBefore = heroBefore.level;
    const ageBefore = heroBefore.age;
    const realmBefore = ctrl.getCurrentRealmId() ?? 'base';

    const before = Date.now();
    useCycleStoreV2.getState().endCycle('자연사');
    const after = Date.now();

    const history = useGameStore.getState().meta.sagaHistory;
    expect(history.length).toBeGreaterThan(0);
    const last = history[history.length - 1]!;

    // PRD 수용 c 항목별
    expect(last.finalLevel).toBe(levelBefore);
    expect(last.finalAge).toBe(ageBefore);
    expect(last.finalRealm).toBe(realmBefore); // 'base' (start 이전 default)
    expect(last.deathCause).toBe('자연사');
    expect(last.finishedAt).toBeGreaterThanOrEqual(before);
    expect(last.finishedAt).toBeLessThanOrEqual(after);
  });

  it('endCycle("전사") + currentRealmId="sea" 시 finalRealm="sea" 로 기록된다', () => {
    // realm 전환 후 죽음 — finalRealm 이 'base' 가 아닌 실제 사망 지점.
    useCycleStoreV2.getState().start({
      seed: 99,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    const ctrl = useCycleStoreV2.getState().controller!;
    // 직접 currentRealmId 를 'sea' 로 설정 (실제 게임에선 boss kill + exit transition).
    ctrl.setCurrentRealmId('sea');
    useGameStore.getState().setCurrentRealm('sea');

    useCycleStoreV2.getState().endCycle('전사');

    const history = useGameStore.getState().meta.sagaHistory;
    const last = history[history.length - 1]!;
    expect(last.finalRealm).toBe('sea');
    expect(last.deathCause).toBe('전사');
  });

  it('flat field 는 nested hero.finalXxx 와 항상 동일 값 (single source of truth)', () => {
    useCycleStoreV2.getState().start({
      seed: 7777,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    const ctrl = useCycleStoreV2.getState().controller!;
    for (let i = 0; i < 5; i++) {
      ctrl.handleArrival('enemy', `enemy_${i}`);
    }
    useCycleStoreV2.getState().endCycle('자연사');

    const history = useGameStore.getState().meta.sagaHistory;
    const last = history[history.length - 1]!;
    expect(last.finalLevel).toBe(last.hero.finalLevel);
    expect(last.finalAge).toBe(last.hero.finalAge);
    expect(last.deathCause).toBe(last.hero.cause);
    expect(last.finishedAt).toBe(last.endedAtMs);
  });

  // 회귀 가드 — cycle-5 fix 의 stale realm reset 이 saga finalize 이전에
  // 일어나지 않아야 함. endCycle 의 순서: finalize → append → run reset.
  it('cycle-5 회귀 가드: finalize 가 run.currentRealmId reset 보다 먼저 실행되어 finalRealm 이 실제 사망 시점 realm 으로 기록', () => {
    useCycleStoreV2.getState().start({
      seed: 5555,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    const ctrl = useCycleStoreV2.getState().controller!;
    ctrl.setCurrentRealmId('volcano');
    useGameStore.setState(s => ({ ...s, run: { ...s.run, currentRealmId: 'volcano' } }));

    useCycleStoreV2.getState().endCycle('전사');

    // saga 의 finalRealm 은 'volcano' (사망 직전)
    const last = useGameStore.getState().meta.sagaHistory.at(-1)!;
    expect(last.finalRealm).toBe('volcano');
    // run.currentRealmId 는 cycle-5 F1 fix 로 'base' 로 reset 됨
    expect(useGameStore.getState().run.currentRealmId).toBe('base');
  });
});
