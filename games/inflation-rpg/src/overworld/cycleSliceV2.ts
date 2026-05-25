import { create } from 'zustand';
import { CycleControllerV2, type CycleControllerV2Opts } from './CycleControllerV2';
import { SagaStorage } from '../saga/SagaStorage';
import type { CycleSaga, DeathCause } from '../saga/SagaTypes';
import { goldFromCycle } from '../meta/MetaProgression';
import { useGameStore } from '../store/gameStore';
import { rejuvenationCost } from '../hero/rejuvenation';
import { getRejuvDiscount, getDropChanceBonus, getAgingSpeedMul, getFieldDiffThreshold } from '../buff/buffEffects';
import { computeFieldDamping } from '../zone/fieldDamping';
import { fieldLevelAtColumn } from '../zone/zoneNavigation';
import { findRealm } from '../data/realms';
import { seasonBonus } from '../season/SeasonState';
import { pickStartingRealm, spawnColumnForRealm } from './realmRotation';
import { GRID_H } from './mapLayout';
import { applyEndCycleMeta } from './cycleSlice.helpers';

type Status = 'idle' | 'running' | 'ended';

interface CycleStoreV2State {
  status: Status;
  controller: CycleControllerV2 | null;
  lastSaga: CycleSaga | null;
  /** Gold awarded at the end of the most recent cycle. */
  lastGoldEarned: number;
  start: (opts: CycleControllerV2Opts) => void;
  /** Cycle-5 F3: optional cause forwarded into the controller before
   *  `finalize()`. Used by OverworldRunner when the scene emits
   *  `cycle_ended` with `cause: '무위'` (pathfinder candidates-exhausted)
   *  so the saga distinguishes a stuck-hero bug from peaceful '자연사'. */
  endCycle: (cause?: DeathCause) => void;
  rejuvenateHero: (years: number) => void;
  reset: () => void;
}

export const useCycleStoreV2 = create<CycleStoreV2State>((set, get) => ({
  status: 'idle',
  controller: null,
  lastSaga: null,
  lastGoldEarned: 0,
  start(opts) {
    // V3-H B2: resolve which hero snapshot to use.
    //  - opts.heroSnapshot === undefined → check run.heroSnapshot (auto-resume from save).
    //  - opts.heroSnapshot === null → explicitly start fresh (clear override from CyclePrepV2).
    //  - opts.heroSnapshot is a HeroSnapshot object → use it directly.
    const savedSnapshot = opts.heroSnapshot === undefined
      ? (useGameStore.getState().run.heroSnapshot ?? null)
      : opts.heroSnapshot;
    const ctrl = new CycleControllerV2({
      ...opts,
      heroSnapshot: savedSnapshot,
      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const state = useGameStore.getState();
        const meta = state.meta;
        const ctrl = useCycleStoreV2.getState().controller;
        const hero = ctrl?.getHero();
        const heroLv = hero?.level ?? 1;
        const heroCol = (hero as unknown as { gridX?: number })?.gridX ?? 0;
        const currentRealm = state.run.currentRealmId;
        const fieldLv = fieldLevelAtColumn(currentRealm, heroCol);
        const buff6 = getFieldDiffThreshold(meta);
        // V3-H F6: apply season bonuses — atkMul folded into damping, dropMul
        // applied to drop-chance bonus. dampingThresholdBonus added to buff6.
        const sBonus = seasonBonus(meta.season.current);
        return {
          dropChanceBonus: getDropChanceBonus(meta) * sBonus.dropMul,
          agingSpeedMul: getAgingSpeedMul(meta),
          damping: computeFieldDamping(heroLv, fieldLv, buff6 + sBonus.dampingThresholdBonus) * sBonus.atkMul,
        };
      }),
      onBossKill: opts.onBossKill ?? ((current) => {
        const state = useGameStore.getState();
        const realm = findRealm(current);
        if (realm.nextRealm && !state.meta.unlockedRealms.includes(realm.nextRealm)) {
          state.unlockRealm(realm.nextRealm);
          return realm.nextRealm;
        }
        return null;
      }),
    });
    // Cycle-15 — realm rotation. cycleSliceV2.endCycle() force-resets
    // run.currentRealmId='base' as a stale-realm guard (cycle-5 F1). Before
    // cycle-15 that meant every cycle started in base regardless of
    // unlockedRealms progress. Round-robin rotation reads unlockedRealms +
    // sagaHistory.length to pick the realm; hero.gridX is moved in lockstep
    // so pathfinder bounds match. Resuming an in-progress run (heroSnapshot
    // present) keeps the existing currentRealmId — the snapshot's gridX is
    // already inside that realm.
    const { meta: storeMeta, run: storeRun } = useGameStore.getState();
    let activeRealmId = storeRun.currentRealmId;
    if (savedSnapshot === null) {
      const cycleNumber = (storeMeta.sagaHistory ?? []).length;
      const rotated = pickStartingRealm(storeMeta.unlockedRealms, cycleNumber);
      const spawnCol = spawnColumnForRealm(rotated);
      const hero = ctrl.getHero();
      hero.gridX = spawnCol;
      hero.gridY = Math.floor(GRID_H / 2);
      if (rotated !== activeRealmId) {
        useGameStore.setState(s => ({ ...s, run: { ...s.run, currentRealmId: rotated } }));
        activeRealmId = rotated;
      }
    }
    ctrl.setCurrentRealmId(activeRealmId);
    ctrl.setUnlockedRealms(useGameStore.getState().meta.unlockedRealms);
    set({ status: 'running', controller: ctrl, lastSaga: null, lastGoldEarned: 0 });
  },
  endCycle(cause?: DeathCause) {
    const ctrl = get().controller;
    if (!ctrl) return;
    // Cycle-5 F3: if a cause was supplied (e.g. '무위' from candidates-
    // exhausted) push it into the controller before finalize so the saga
    // records the real reason. Falsy → controller default '자연사' stays.
    if (cause) ctrl.setEndCause(cause);
    const saga = ctrl.finalize();
    SagaStorage.append(saga);
    // Cycle 114 N3 — append HallEntry. flat metadata only (saga 본문은
    // sagaHistory[100] FIFO 에 있음, cycleId 로 lookup 가능). cap = 85
    // hard limit via hallCapacity top-N union dedup.
    useGameStore.getState().addHallEntry({
      id: saga.cycleId,
      cycleId: saga.cycleId,
      heroName: saga.hero.name,
      maxLevel: saga.finalLevel ?? 0,
      ageEnd: saga.finalAge ?? 0,
      cause: saga.deathCause ?? '자연사',
      realm: saga.finalRealm ?? '',
      finishedAt: saga.finishedAt ?? Date.now(),
    });
    // Cycle 129 N5 F1+F3 — evaluate achievements + auto-grant tokens.
    // addHallEntry 직후 호출 — saga 가 hall 에 영구 기록된 후 진행도 갱신.
    // PRD 의 트리거 invariant: token 발생 = achievement 진행도만, server / 광고 / IAP 0.
    useGameStore.getState().evaluateAndGrantAchievements(saga);
    // Award sponsorGold based on cycle performance. Counters come from the
    // controller's running tally, not an equipment.length approximation.
    const hero = ctrl.getHero();
    const stats = ctrl.getStats();
    const gold = goldFromCycle({
      maxLevel: hero.level,
      kills: stats.kills,
      bossKills: stats.bossKills,
      drops: stats.drops,
    });
    // Cycle 116 — organic crackStones supply. cycle 108 fate roll backlog
    // 회수. boss kill 당 1 stone, max 3/cycle. fate roll modal 활성화 +
    // ascension 비용 supply.
    const crackStoneReward = Math.min(stats.bossKills, 3);
    if (crackStoneReward > 0) {
      useGameStore.getState().gainCrackStones(crackStoneReward);
    }
    // Cycle-18 — sim/real parity. The pure transform (`applyEndCycleMeta`)
    // owns sponsorGold spend + stale-realm reset + npcs clear. Mirror in
    // `scripts/sim-cycle-v2.ts` calls the same helper so future changes
    // propagate to both paths automatically. See cycleSlice.helpers.ts.
    useGameStore.setState(s => applyEndCycleMeta(s, { gold }));
    set({ status: 'ended', lastSaga: saga, lastGoldEarned: gold });
  },
  rejuvenateHero(years) {
    const ctrl = get().controller;
    if (!ctrl) return;
    const hero = ctrl.getHero();
    const meta = useGameStore.getState().meta;
    const baseCost = rejuvenationCost(hero.age);
    const discount = getRejuvDiscount(meta);
    const cost = Math.ceil(baseCost * (1 - discount));
    const light = meta.light ?? 0;
    if (light < cost) return;
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, light: (s.meta.light ?? 0) - cost },
    }));
    hero.rejuvenate(years);
    ctrl.recordRejuvenation(years);
    useGameStore.getState().recordSagaRejuvenation();
  },
  reset() {
    set({ status: 'idle', controller: null, lastSaga: null, lastGoldEarned: 0 });
  },
}));
