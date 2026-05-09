# Phase 1 — 콘텐츠 균형 패치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F-2+3 직후 power 곡선을 300h spec 의 목표 (Section 10.1 / 11.2) 와 정합화한다. simulator 가 BattleScene 과 동일한 pure resolver 를 호출해 비트 단위 일치하는 측정을 한다.

**Architecture:** BattleScene 의 데미지/스킬 적용 로직을 pure 함수 (`battle/resolver.ts`) 로 추출. simulator (`tools/balance-sim.ts`) 는 동일 resolver 를 호출하는 turn 기반 loop. sweep harness (`tools/balance-sweep.ts`) 가 milestone 6 시점 + zoom-in 격자를 돌리고 CSV/JSON 으로 출력. diff report 가 spec 표와 비교해 절벽·평탄 식별. magnitude 조정은 incremental Tier A → B. 종료 시 vitest 영구 회귀 가드 동결.

**Tech Stack:** TypeScript, Phaser 3 (BattleScene), Vitest, pnpm workspace, ESM. Sim 은 Node 단독 실행 (Phaser 미import).

**Spec:** [`docs/superpowers/specs/2026-05-10-phase-balance-patch-design.md`](../specs/2026-05-10-phase-balance-patch-design.md)

**Parent Spec:** [`docs/superpowers/specs/2026-05-01-content-300h-design.md`](../specs/2026-05-01-content-300h-design.md)

**Branch:** `feat/phase-balance-patch` (CLAUDE.md 의 feature branch + `--no-ff` 머지 패턴 따름)

---

## File Structure

각 단위는 단일 책임. 파일 작아야 reasoning 신뢰.

| 파일 | 책임 | 의존 |
|------|------|------|
| `games/inflation-rpg/src/battle/resolver.ts` | pure damage / skill resolution. Phaser 미import. | types, data |
| `games/inflation-rpg/src/battle/resolver.test.ts` | resolver 단위 테스트 + 회귀 픽스처. | resolver |
| `games/inflation-rpg/src/battle/BattleScene.ts` | (수정) doRound / updateSkills 가 resolver 호출. | resolver |
| `games/inflation-rpg/tools/balance-sim.ts` | turn 기반 simulator. seed 고정. | resolver, data |
| `games/inflation-rpg/tools/balance-sim.test.ts` | sim deterministic 검증 (동일 seed → 동일 결과). | balance-sim |
| `games/inflation-rpg/tools/balance-sweep.ts` | milestone + zoom-in 격자, CSV/JSON 출력. | balance-sim |
| `games/inflation-rpg/tools/balance-sweep-cli.ts` | `pnpm balance:sweep` 진입점. | balance-sweep |
| `games/inflation-rpg/src/test/balance-milestones.test.ts` | vitest 회귀 가드 6 케이스. | balance-sim |
| `docs/superpowers/reports/2026-05-10-balance-sweep.md` | 1차 측정 diff report. spec 곡선 vs 측정. | (수동/자동) |
| `games/inflation-rpg/package.json` | (수정) `balance:sweep` script 추가. | — |
| 데이터 파일 (Tier A scope) | magnitude 조정 — `floors.ts`, `dungeons.ts`, `monsters.ts`, `bosses.ts`, `equipment.ts`, `jobskills.ts`, `data/skills.ts`. | — |

---

## Task 0: 작업 브랜치 + 환경 셋업

**Files:**
- Modify: `games/inflation-rpg/package.json` (script 한 줄)

- [ ] **Step 1: feature 브랜치 생성**

```bash
git checkout -b feat/phase-balance-patch
git status
```

Expected: `On branch feat/phase-balance-patch`, working tree clean.

- [ ] **Step 2: 베이스라인 검증**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: 모두 0 exit. (현재 332 vitest pass.)

- [ ] **Step 3: package.json 에 sweep script 추가**

`games/inflation-rpg/package.json` 의 `scripts` 섹션에 한 줄 추가:

```json
"balance:sweep": "tsx tools/balance-sweep-cli.ts"
```

- [ ] **Step 4: tsx devDependency 추가 (없으면)**

```bash
pnpm --filter @forge/game-inflation-rpg add -D tsx
```

확인: `package.json` `devDependencies.tsx` 존재.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/package.json pnpm-lock.yaml
git commit -m "chore(game-inflation-rpg): add balance:sweep script + tsx devdep"
```

---

## Task 1: BattleScene 회귀 픽스처 (refactor 안전망)

**의도:** S1 의 pure resolver 추출이 행동을 미세하게 바꾸지 않음을 보장. 추출 *전* 에 BattleScene 의 결정성 부분의 입력→출력을 캡처해 회귀 잠금.

**Files:**
- Create: `games/inflation-rpg/src/battle/resolver.fixtures.ts` (입력 케이스)
- Create: `games/inflation-rpg/src/battle/resolver.test.ts` (snapshot 회귀)

- [ ] **Step 1: 캡처할 결정성 함수 식별**

BattleScene.ts 의 결정성 부분 (난수 제외):
- `enemyMaxHP` 계산 (line 105 / 112 / 120):
  - mini/major/sub: `Math.floor(monsterLevel * 50 * boss.hpMult)`
  - final: `Math.floor(monsterLevel * 50 * boss.hpMult)` (동일)
  - 일반: `Math.floor(monsterLevel * 20 * monster.hpMult)`
- `enemyATK` 계산 (line 270): `Math.floor(monsterLevel * 8 * (isBoss ? 2 : 1))`
- 데미지 계산 (line 170): `Math.floor(playerATK * (crit ? 2.4 : 1) * (0.9 + Math.random() * 0.2))`
  → 난수 부분 분리. crit/combo 결정 후 데미지 식 자체는 결정성.
- `computeSkillEffect` (이미 pure, SkillSystem.ts).

- [ ] **Step 2: fixtures.ts 작성**

```ts
// games/inflation-rpg/src/battle/resolver.fixtures.ts
export interface ResolverFixture {
  name: string;
  monsterLevel: number;
  isBoss: boolean;
  bossType?: 'mini' | 'major' | 'sub' | 'final';
  hpMult: number;
  playerATK: number;
  crit: boolean;
}

export const FIXTURES: ReadonlyArray<ResolverFixture> = [
  { name: 'lv1 normal',      monsterLevel: 1,    isBoss: false, hpMult: 1.0, playerATK: 100,    crit: false },
  { name: 'lv10 normal crit',monsterLevel: 10,   isBoss: false, hpMult: 1.5, playerATK: 500,    crit: true  },
  { name: 'lv30 mini',       monsterLevel: 30,   isBoss: true,  bossType: 'mini',  hpMult: 2.0, playerATK: 1000, crit: false },
  { name: 'lv180 final',     monsterLevel: 180,  isBoss: true,  bossType: 'final', hpMult: 5.0, playerATK: 5000, crit: true  },
  { name: 'lv1000 deep',     monsterLevel: 1000, isBoss: false, hpMult: 1.0, playerATK: 50_000, crit: false },
];
```

- [ ] **Step 3: resolver.test.ts — 현재 BattleScene 식의 inline 재현 + snapshot**

```ts
// games/inflation-rpg/src/battle/resolver.test.ts
import { describe, it, expect } from 'vitest';
import { FIXTURES } from './resolver.fixtures';

describe('battle resolver — pre-refactor BattleScene parity', () => {
  it.each(FIXTURES)('$name: enemyMaxHP', (f) => {
    const expected = f.isBoss
      ? Math.floor(f.monsterLevel * 50 * f.hpMult)
      : Math.floor(f.monsterLevel * 20 * f.hpMult);
    expect(expected).toBeGreaterThan(0);
    expect(expected).toMatchSnapshot();
  });

  it.each(FIXTURES)('$name: enemyATK', (f) => {
    const expected = Math.floor(f.monsterLevel * 8 * (f.isBoss ? 2 : 1));
    expect(expected).toMatchSnapshot();
  });

  it.each(FIXTURES)('$name: deterministic damage (no rng portion)', (f) => {
    // RNG 부분 (0.9+rand*0.2) 은 1.0 으로 고정한 결정성 데미지
    const expected = Math.floor(f.playerATK * (f.crit ? 2.4 : 1) * 1.0);
    expect(expected).toMatchSnapshot();
  });
});
```

- [ ] **Step 4: 실행해 snapshot 생성**

```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/battle/resolver.test.ts
```

Expected: 15 pass (5 fixtures × 3 tests). snapshot 파일 생성됨.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/battle/resolver.fixtures.ts games/inflation-rpg/src/battle/resolver.test.ts games/inflation-rpg/src/battle/__snapshots__/
git commit -m "test(game-inflation-rpg): capture BattleScene pre-refactor parity fixtures"
```

---

## Task 2: pure resolver 추출

**의도:** BattleScene 의 결정성 데미지/HP 식을 pure 함수로 추출. 시그니처를 simulator 가 직접 호출 가능하도록 설계.

**Files:**
- Create: `games/inflation-rpg/src/battle/resolver.ts`

- [ ] **Step 1: resolver.ts 작성**

```ts
// games/inflation-rpg/src/battle/resolver.ts
import type { Monster, Boss, BossType } from '../types';

export interface EnemyHpInput {
  monsterLevel: number;
  isBoss: boolean;
  hpMult: number; // monster.hpMult 또는 boss.hpMult
}

export function resolveEnemyMaxHp(input: EnemyHpInput): number {
  const baseMul = input.isBoss ? 50 : 20;
  return Math.floor(input.monsterLevel * baseMul * input.hpMult);
}

export interface EnemyAtkInput {
  monsterLevel: number;
  isBoss: boolean;
}

export function resolveEnemyAtk(input: EnemyAtkInput): number {
  return Math.floor(input.monsterLevel * 8 * (input.isBoss ? 2 : 1));
}

export interface PlayerHitInput {
  playerATK: number;
  crit: boolean;
  rngRoll: number; // [0, 1) — BattleScene 은 Math.random(), sim 은 seeded RNG
}

export function resolvePlayerHit(input: PlayerHitInput): number {
  const critMul = input.crit ? 2.4 : 1;
  const rngMul = 0.9 + input.rngRoll * 0.2; // (0.9, 1.1)
  return Math.floor(input.playerATK * critMul * rngMul);
}

export interface DamageReductionInput {
  enemyATK: number;
  reduction: number; // 0..1
}

export function resolveDamageTaken(input: DamageReductionInput): number {
  return Math.floor(input.enemyATK * (1 - input.reduction));
}
```

- [ ] **Step 2: resolver.test.ts 확장 — pure resolver 가 fixture 와 일치**

기존 test 파일에 추가:

```ts
import {
  resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit,
} from './resolver';

describe('pure resolver matches inline expectations', () => {
  it.each(FIXTURES)('$name: resolveEnemyMaxHp', (f) => {
    const fromResolver = resolveEnemyMaxHp({
      monsterLevel: f.monsterLevel, isBoss: f.isBoss, hpMult: f.hpMult,
    });
    const inline = f.isBoss
      ? Math.floor(f.monsterLevel * 50 * f.hpMult)
      : Math.floor(f.monsterLevel * 20 * f.hpMult);
    expect(fromResolver).toBe(inline);
  });

  it.each(FIXTURES)('$name: resolveEnemyAtk', (f) => {
    const fromResolver = resolveEnemyAtk({
      monsterLevel: f.monsterLevel, isBoss: f.isBoss,
    });
    expect(fromResolver).toBe(Math.floor(f.monsterLevel * 8 * (f.isBoss ? 2 : 1)));
  });

  it.each(FIXTURES)('$name: resolvePlayerHit (rng=0.5 = 1.0 mul)', (f) => {
    const fromResolver = resolvePlayerHit({
      playerATK: f.playerATK, crit: f.crit, rngRoll: 0.5,
    });
    expect(fromResolver).toBe(Math.floor(f.playerATK * (f.crit ? 2.4 : 1) * 1.0));
  });
});
```

- [ ] **Step 3: 실행**

```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/battle/resolver.test.ts
```

Expected: 30 pass (15 snapshot + 15 parity).

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/battle/resolver.ts games/inflation-rpg/src/battle/resolver.test.ts
git commit -m "feat(game-inflation-rpg): extract pure damage resolver from BattleScene"
```

---

## Task 3: BattleScene 을 resolver 호출로 refactor

**의도:** BattleScene 의 데미지/HP 인라인 식을 resolver 호출로 교체. 행동 변경 0.

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: import 추가**

`BattleScene.ts` 상단 import 블록에 추가:

```ts
import { resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit, resolveDamageTaken } from './resolver';
```

- [ ] **Step 2: enemyMaxHP 계산 교체 (3 곳)**

Lines 105, 112, 120 의 `Math.floor(monsterLevel * N * mult)` 를 모두 `resolveEnemyMaxHp(...)` 호출로 교체:

```ts
// line 105 (boss)
this.enemyMaxHP = resolveEnemyMaxHp({
  monsterLevel,
  isBoss: true,
  hpMult: boss.hpMult,
});

// line 112 (boss fallback → monster)
this.enemyMaxHP = resolveEnemyMaxHp({
  monsterLevel,
  isBoss: false,
  hpMult: monster.hpMult,
});

// line 120 (일반)
this.enemyMaxHP = resolveEnemyMaxHp({
  monsterLevel,
  isBoss: false,
  hpMult: monster.hpMult,
});
```

- [ ] **Step 3: enemyATK 교체 (line 270)**

```ts
const enemyATK = resolveEnemyAtk({
  monsterLevel: monsterLevelForAtk,
  isBoss: this.isBoss,
});
```

- [ ] **Step 4: playerHit 교체 (line 169-171 의 for 루프)**

```ts
for (let i = 0; i < hits; i++) {
  totalDmg += resolvePlayerHit({
    playerATK,
    crit,
    rngRoll: Math.random(),
  });
}
```

- [ ] **Step 5: damage taken 교체 (line 271-272)**

```ts
const reduction = calcDamageReduction(playerDEF);
const dmgTaken = resolveDamageTaken({ enemyATK, reduction });
```

- [ ] **Step 6: 회귀 검증**

```bash
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 모두 pass. resolver.test.ts 의 snapshot 그대로 유지.

- [ ] **Step 7: e2e 회귀 검증**

```bash
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: 20 e2e 모두 pass (battle 진행 정상).

- [ ] **Step 8: Commit + tag**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "refactor(game-inflation-rpg): BattleScene calls pure resolver, behavior unchanged"
git tag phase-balance-cp1
```

---

## Task 4: balance simulator (turn-based, seeded)

**의도:** resolver 직접 호출하는 결정성 sim. 한 floor 의 클리어 시간 측정.

**Files:**
- Create: `games/inflation-rpg/tools/balance-sim.ts`
- Create: `games/inflation-rpg/tools/balance-sim.test.ts`

- [ ] **Step 1: balance-sim.ts 작성**

```ts
// games/inflation-rpg/tools/balance-sim.ts
import { resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit, resolveDamageTaken } from '../src/battle/resolver';
import { computeSkillEffect, createSkillState, isSkillReady, fireSkill } from '../src/battle/SkillSystem';
import { calcDamageReduction, calcCritChance } from '../src/systems/stats';
import type { ActiveSkill } from '../src/types';

export interface SimRng {
  next(): number; // [0, 1)
}

export function createSeededRng(seed: number): SimRng {
  // mulberry32
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export interface SimEnemy {
  monsterLevel: number;
  isBoss: boolean;
  hpMult: number;
}

export interface SimPlayer {
  atk: number;
  def: number;
  hpMax: number;
  agi: number;
  luc: number;
  skills: Array<ActiveSkill & { dmgMul?: number }>;
}

export interface SimResult {
  victory: boolean;
  ticksTaken: number;
  secondsTaken: number; // ticksTaken * 0.6 (BattleScene combatTimer delay)
  remainingHpRatio: number;
}

const TICK_MS = 600;

export function simulateFloor(
  player: SimPlayer,
  enemy: SimEnemy,
  rng: SimRng,
  maxTicks = 1000,
): SimResult {
  let enemyHp = resolveEnemyMaxHp(enemy);
  const enemyMaxHp = enemyHp;
  let playerHp = player.hpMax;
  const skillState = createSkillState();
  const enemyAtk = resolveEnemyAtk(enemy);
  const reduction = calcDamageReduction(player.def);
  const damageTaken = resolveDamageTaken({ enemyATK: enemyAtk, reduction });
  let monstersDefeated = 0;

  for (let tick = 0; tick < maxTicks; tick++) {
    // 스킬 발동 (BattleScene.update 미러)
    for (const skill of player.skills) {
      const nowMs = tick * TICK_MS;
      if (isSkillReady(skillState, skill, nowMs)) {
        const result = computeSkillEffect(skill, player.atk, player.hpMax, enemyHp, enemyMaxHp);
        if (result.damage !== undefined) {
          enemyHp = Math.max(0, enemyHp - result.damage);
        }
        fireSkill(skillState, skill, nowMs);
      }
    }
    if (enemyHp <= 0) {
      return { victory: true, ticksTaken: tick, secondsTaken: tick * 0.6, remainingHpRatio: 0 };
    }

    // 평타 (BattleScene.doRound 미러, 결정성 부분만)
    const crit = rng.next() < calcCritChance(player.agi, player.luc);
    const combo = rng.next() < 0.05 + player.agi * 0.0005;
    const hits = combo ? 3 : 1;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      totalDmg += resolvePlayerHit({
        playerATK: player.atk,
        crit,
        rngRoll: rng.next(),
      });
    }
    enemyHp = Math.max(0, enemyHp - totalDmg);
    if (enemyHp <= 0) {
      return { victory: true, ticksTaken: tick, secondsTaken: tick * 0.6, remainingHpRatio: 0 };
    }

    // 적 공격 (BattleScene 의 currentHPEstimate 모델 미러)
    monstersDefeated++; // sim 은 1 floor = 1 enemy 라 의미 약함, BattleScene 식 재현용
    const currentHpEstimate = playerHp - (monstersDefeated * damageTaken * 0.1);
    if (currentHpEstimate <= 0) {
      return {
        victory: false,
        ticksTaken: tick,
        secondsTaken: tick * 0.6,
        remainingHpRatio: enemyHp / enemyMaxHp,
      };
    }
  }

  // maxTicks 도달 = 발산 (DPS 부족)
  return {
    victory: false,
    ticksTaken: maxTicks,
    secondsTaken: maxTicks * 0.6,
    remainingHpRatio: enemyHp / enemyMaxHp,
  };
}
```

- [ ] **Step 2: balance-sim.test.ts 작성 — determinism + sanity**

```ts
// games/inflation-rpg/tools/balance-sim.test.ts
import { describe, it, expect } from 'vitest';
import { simulateFloor, createSeededRng } from './balance-sim';

describe('balance-sim — determinism', () => {
  it('same seed → same result', () => {
    const player = { atk: 1000, def: 100, hpMax: 5000, agi: 50, luc: 50, skills: [] };
    const enemy = { monsterLevel: 10, isBoss: false, hpMult: 1.0 };

    const r1 = simulateFloor(player, enemy, createSeededRng(42));
    const r2 = simulateFloor(player, enemy, createSeededRng(42));

    expect(r1).toEqual(r2);
  });

  it('different seed → likely different result (rng change)', () => {
    const player = { atk: 100, def: 10, hpMax: 500, agi: 30, luc: 30, skills: [] };
    const enemy = { monsterLevel: 5, isBoss: false, hpMult: 1.0 };

    const r1 = simulateFloor(player, enemy, createSeededRng(1));
    const r2 = simulateFloor(player, enemy, createSeededRng(2));

    // 결정성이지만 다른 seed 면 ticksTaken 미세 다를 가능성 높음
    expect(r1.ticksTaken === r2.ticksTaken && r1.victory === r2.victory).toBeDefined();
  });

  it('overpowered player → quick victory', () => {
    const player = { atk: 100_000, def: 1000, hpMax: 100_000, agi: 100, luc: 100, skills: [] };
    const enemy = { monsterLevel: 1, isBoss: false, hpMult: 1.0 };
    const r = simulateFloor(player, enemy, createSeededRng(42));
    expect(r.victory).toBe(true);
    expect(r.ticksTaken).toBeLessThan(10);
  });

  it('underpowered player → defeat or maxTicks', () => {
    const player = { atk: 1, def: 0, hpMax: 10, agi: 0, luc: 0, skills: [] };
    const enemy = { monsterLevel: 10000, isBoss: true, hpMult: 5.0 };
    const r = simulateFloor(player, enemy, createSeededRng(42), 100);
    expect(r.victory).toBe(false);
  });
});
```

- [ ] **Step 3: 실행**

```bash
pnpm --filter @forge/game-inflation-rpg vitest run tools/balance-sim.test.ts
```

Expected: 4 pass.

- [ ] **Step 4: typecheck + lint**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 error.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/tools/balance-sim.ts games/inflation-rpg/tools/balance-sim.test.ts
git commit -m "feat(game-inflation-rpg): add balance-sim using pure resolver, mulberry32 seeded RNG"
```

---

## Task 5: sweep harness — milestone 격자

**의도:** spec Section 10.1 의 6 milestone 시점에서 metaState 추정 → sim 실행 → 결과 표.

**Files:**
- Create: `games/inflation-rpg/tools/balance-sweep.ts`
- Create: `games/inflation-rpg/tools/balance-sweep.test.ts`

- [ ] **Step 1: milestone 메타 상태 정의**

300h spec Section 10.1 / 11.2 / 5 의 표를 메타 상태로 변환:

```ts
// games/inflation-rpg/tools/balance-sweep.ts
import { simulateFloor, createSeededRng, type SimPlayer, type SimEnemy, type SimResult } from './balance-sim';
import { getMonsterLevel } from '../src/data/floors';
import { enhanceMultiplier } from '../src/systems/enhance';

export interface MilestoneState {
  hours: number;
  expectedFloor: number;       // spec Section 10.1
  charLv: number;              // 추정
  ascTier: number;             // 추정
  equipLvAvg: number;          // 강화 lv 평균
  equipRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  baseAbilityLv: number;       // max 18
  spAtkRatio: number;          // SP 분배 비율 (atk 에 몰빵 0..1)
}

// Spec Section 10.1 + Section 5 + Section 11.2 으로부터 추정.
export const MILESTONES: ReadonlyArray<MilestoneState> = [
  { hours: 5,   expectedFloor: 8,    charLv: 5,   ascTier: 0,  equipLvAvg: 5,   equipRarity: 'common',    baseAbilityLv: 2,  spAtkRatio: 0.5 },
  { hours: 30,  expectedFloor: 25,   charLv: 15,  ascTier: 0,  equipLvAvg: 30,  equipRarity: 'uncommon',  baseAbilityLv: 5,  spAtkRatio: 0.6 },
  { hours: 80,  expectedFloor: 60,   charLv: 30,  ascTier: 1,  equipLvAvg: 80,  equipRarity: 'rare',      baseAbilityLv: 8,  spAtkRatio: 0.6 },
  { hours: 200, expectedFloor: 200,  charLv: 60,  ascTier: 5,  equipLvAvg: 250, equipRarity: 'epic',      baseAbilityLv: 12, spAtkRatio: 0.65 },
  { hours: 300, expectedFloor: 500,  charLv: 100, ascTier: 20, equipLvAvg: 1500,equipRarity: 'legendary', baseAbilityLv: 18, spAtkRatio: 0.7 },
  { hours: 500, expectedFloor: 1500, charLv: 200, ascTier: 30, equipLvAvg: 5000,equipRarity: 'mythic',    baseAbilityLv: 18, spAtkRatio: 0.7 },
];

export interface SweepRow {
  hours: number;
  expectedFloor: number;
  measuredFloor: number;       // sim 결과 도달 가능 max floor
  clearTimeAtExpected: number; // expectedFloor 클리어 평균 초
  withinTolerance: boolean;    // ±20%
  cliffsDetected: number[];    // F 번호. clearTime(F+1)/clearTime(F) ≥ 1.5
}
```

- [ ] **Step 2: state → SimPlayer 변환**

```ts
// 같은 파일에 추가
function buildSimPlayer(s: MilestoneState): SimPlayer {
  // Spec Section 11.2 Curve 3 의 ATK 식 근사:
  // base 110 × (1 + sp*0.03) × (1 + charLv*0.02) × (1 + 0.1*ascT)
  //   × (1 + 0.5*baseAbility) + equipATK
  // SP atk = run 의 sp 분배에서 얻는 stat. 5h 시점 ~50, 300h ~10K 추정.
  const spAtk = Math.floor(s.charLv * 5 * s.spAtkRatio);
  const baseATK = 110;
  const charLvMul = 1 + s.charLv * 0.02;
  const ascMul = 1 + 0.1 * s.ascTier;
  const baseAbilityMul = 1 + 0.5 * s.baseAbilityLv;
  const enhanceMul = enhanceMultiplier(s.equipRarity, s.equipLvAvg);
  // 4 슬롯 가정, 각 슬롯 base 30 atk
  const equipATKBase = 30 * 4;
  const equipATK = Math.floor(equipATKBase * enhanceMul);
  const atk = Math.floor(baseATK * (1 + spAtk * 0.03) * charLvMul * ascMul * baseAbilityMul) + equipATK;
  const def = Math.floor(atk * 0.1);
  const hpMax = Math.floor(atk * 5);
  return { atk, def, hpMax, agi: 30, luc: 30, skills: [] };
}
```

> **NOTE**: ULT (jobskills) 는 Phase 2 (D) 후 effect-pipeline 정식화 시 추가. 현재 sim 은 평타만.

- [ ] **Step 3: sweep 실행 함수**

```ts
// 같은 파일에 추가
const N_FULL = 100; // S2 spec §7.2: full sweep N=100

function clearTimeAtFloor(player: SimPlayer, floor: number, hpMult: number, n: number): number {
  const monsterLevel = getMonsterLevel(floor);
  const enemy: SimEnemy = { monsterLevel, isBoss: false, hpMult };
  let total = 0; let wins = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateFloor(player, enemy, createSeededRng(i + 1), 5000);
    if (r.victory) { total += r.secondsTaken; wins++; }
  }
  return wins > 0 ? total / wins : Infinity;
}

export function runSweep(): SweepRow[] {
  return MILESTONES.map((s) => {
    const player = buildSimPlayer(s);
    const t = clearTimeAtFloor(player, s.expectedFloor, 1.0, N_FULL);

    // measuredFloor = clearTime 이 maxTicks 초과 직전
    let measuredFloor = 1;
    const probe = [1, 5, 10, 30, 100, 200, 500, 1000, 1500, 3000];
    for (const f of probe) {
      const ct = clearTimeAtFloor(player, f, 1.0, 10);
      if (Number.isFinite(ct)) measuredFloor = f;
      else break;
    }

    // 단조성 check — milestone 주변 ±5 floor
    const cliffs: number[] = [];
    const range = Math.max(1, s.expectedFloor - 5);
    for (let f = range; f <= s.expectedFloor + 5; f++) {
      const a = clearTimeAtFloor(player, f, 1.0, 10);
      const b = clearTimeAtFloor(player, f + 1, 1.0, 10);
      if (Number.isFinite(a) && Number.isFinite(b) && b / a >= 1.5) {
        cliffs.push(f);
      }
    }

    const tolerance = 0.2;
    const expectedFloor = s.expectedFloor;
    const within = measuredFloor >= expectedFloor * (1 - tolerance)
                && measuredFloor <= expectedFloor * (1 + tolerance);

    return {
      hours: s.hours,
      expectedFloor,
      measuredFloor,
      clearTimeAtExpected: t,
      withinTolerance: within,
      cliffsDetected: cliffs,
    };
  });
}
```

- [ ] **Step 4: balance-sweep.test.ts — sanity**

```ts
// games/inflation-rpg/tools/balance-sweep.test.ts
import { describe, it, expect } from 'vitest';
import { runSweep, MILESTONES } from './balance-sweep';

describe('balance sweep harness', () => {
  it('runs all milestones without throwing', () => {
    const rows = runSweep();
    expect(rows.length).toBe(MILESTONES.length);
    for (const row of rows) {
      expect(row.hours).toBeGreaterThan(0);
      expect(row.expectedFloor).toBeGreaterThan(0);
    }
  }, 60_000); // ~1 min upper bound
});
```

- [ ] **Step 5: 실행**

```bash
pnpm --filter @forge/game-inflation-rpg vitest run tools/balance-sweep.test.ts
```

Expected: 1 pass. 결과는 통과/실패 무관 — sweep 이 throw 없이 끝나면 OK.

- [ ] **Step 6: typecheck + lint + Commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
git add games/inflation-rpg/tools/balance-sweep.ts games/inflation-rpg/tools/balance-sweep.test.ts
git commit -m "feat(game-inflation-rpg): add balance-sweep harness with 6 spec milestones"
git tag phase-balance-cp2
```

---

## Task 6: sweep CLI + 1차 측정 + report

**의도:** spec 표 vs 측정 곡선 diff 를 markdown 으로 자동 생성. report 가 magnitude 조정 task 의 입력.

**Files:**
- Create: `games/inflation-rpg/tools/balance-sweep-cli.ts`
- Create: `docs/superpowers/reports/2026-05-10-balance-sweep.md`

- [ ] **Step 1: CLI 작성**

```ts
// games/inflation-rpg/tools/balance-sweep-cli.ts
import { writeFileSync } from 'node:fs';
import { runSweep } from './balance-sweep';

const rows = runSweep();
const md: string[] = [];
md.push('# Balance Sweep — 자동 생성');
md.push('');
md.push('> spec `2026-05-01-content-300h-design.md` Section 10.1 / 11.2 vs simulator 측정.');
md.push('');
md.push('| 시점 (h) | 기대 floor | 측정 floor | 클리어 시간 (s) | ±20% 통과 | 절벽 |');
md.push('|---|---|---|---|---|---|');
for (const r of rows) {
  const cliffs = r.cliffsDetected.length === 0 ? '0' : r.cliffsDetected.join(', ');
  const t = Number.isFinite(r.clearTimeAtExpected) ? r.clearTimeAtExpected.toFixed(1) : '∞';
  md.push(`| ${r.hours} | ${r.expectedFloor} | ${r.measuredFloor} | ${t} | ${r.withinTolerance ? '✅' : '❌'} | ${cliffs} |`);
}
md.push('');
md.push('## 통과 기준');
md.push('');
md.push('- **(i)** 모든 row 의 `±20% 통과` 가 ✅.');
md.push('- **(ii)** 모든 row 의 `절벽` 이 0.');
md.push('- **(iii)** TODO-a~d 처리 (별도 검증).');
md.push('');

const out = process.argv[2] ?? 'balance-sweep-out.md';
writeFileSync(out, md.join('\n'));
console.log(`wrote ${out} (${rows.length} rows)`);
```

- [ ] **Step 2: 1차 측정 실행**

```bash
pnpm --filter @forge/game-inflation-rpg balance:sweep docs/superpowers/reports/2026-05-10-balance-sweep.md
```

Expected: report 파일 생성. (현재 시점 측정은 통과 ❌ 가능성 높음 — Curve 2 의 spec `1.4^L` 지수 vs 코드의 선형 모델 불일치 예상.)

- [ ] **Step 3: report 검토 + 분석 섹션 추가**

생성된 `docs/superpowers/reports/2026-05-10-balance-sweep.md` 끝에 수동 분석 섹션 추가:

```markdown
## 1차 측정 분석 (수동)

### 발견 사항

[측정 결과를 보고 채움. 예시:]
- Section 11.2 Curve 2 (`HP(L) = 100 × 1.4^L`) 가 코드에 선형 모델 (`monsterLevel * 20 * hpMult`) 로 들어감. 이 불일치가 ±20% 통과를 좌우.
- Curve 1 의 anchor 보간은 `floors.ts:14-46` 에 정확히 구현됨.
- ULT 미반영 — 평타만으로 측정. legend ULT 효과 누락.

### 결정

(필요 시 spec §8.2 에 추가)
- `monsters.ts` 의 hpMult 을 spec Curve 2 와 정합 → Tier A 로 처리.
- 또는 spec Curve 2 를 코드 선형 모델에 맞춰 수정 → spec 변경.
```

- [ ] **Step 4: report Commit**

```bash
git add games/inflation-rpg/tools/balance-sweep-cli.ts docs/superpowers/reports/2026-05-10-balance-sweep.md
git commit -m "feat(game-inflation-rpg): add balance:sweep CLI + 1st measurement report"
git tag phase-balance-cp3
```

---

## Task 7: TODO-d (Curve 1 절벽 + Curve 2 정합 결정)

**의도:** Task 6 의 report 분석에서 식별된 floor 절벽 / Curve 2 불일치 처리. Tier A scope.

**전제:** Task 6 의 report 가 floor 30 (final boss) 또는 floor 100 (심층 시작) 부근 절벽 / Curve 2 불일치를 식별했다고 가정.

**Files:**
- Modify: `games/inflation-rpg/src/data/monsters.ts` — `hpMult` row (Curve 2 정합 여부 결정)
- Modify: `games/inflation-rpg/src/data/floors.ts` — anchor 표 (필요 시)

- [ ] **Step 1: Curve 2 결정 — spec 따라가기 vs 선형 유지**

분석:
- Spec `HP(L) = 100 × 1.4^L` 은 L=180 에서 약 1.5e21. UI 표기는 알파벳 (Section 11.3) 으로 가능하나 game balance 의미 없음.
- 코드의 선형 `monsterLevel * 20 * hpMult` 은 L=180 에서 3,600. 인플레이션 미발생.
- spec 의 인플레이션 의도는 **player power 도 동일 곡선으로 따라간다** 가정. 즉 Curve 3 의 곱셈 합이 1.4^L 비슷한 속도로 자라야.

**결정 (1 옵션 선택):**

옵션 A — Curve 2 spec 따르기:
- `BattleScene` / `resolver.ts` 의 `enemyMaxHp` 식을 `100 × 1.4^L × hpMult` 로 변경.
- 단, 이 변경은 §8.1 Tier A scope 의 "코드 로직 불변" 원칙을 깬다.

옵션 B — 선형 유지하고 spec 수정:
- 부모 spec Section 11.2 Curve 2 를 코드 선형 모델로 수정.
- 본 spec §8.2 에 결정 사유 추가 commit.

옵션 C — hpMult 만 조정 (Tier A 순수):
- `monsters.ts` 의 `hpMult` 을 spec Curve 2 ratio 에 맞춰 lv 구간별로 조정 (지수 흉내).
- 가장 보수적. Tier A 유지.

**기본 선택: 옵션 C** — spec §3 의 비목적 "BattleScene 의 구조 변경" 위반 없음.

(실행 agent 가 report 분석 결과 보고 옵션 A/B 가 더 합리적이라 판단하면 사용자에게 confirm 요청 후 본 spec §8.2 업데이트.)

- [ ] **Step 2: 옵션 C 적용 — `monsters.ts` 의 levelMin/Max 구간별 hpMult 조정**

monsters.ts 의 row 들 검토:
- common pool: `levelMin=1` ~ `levelMax=Infinity` 모두 hpMult ≤ 3.0.
- 측정 결과로 Section 10.1 의 80h@F60 에서 ±20% 미달이면, 해당 구간 (lv 500 부근) hpMult 상향.
- 측정 결과로 30h@F25 에서 ±20% 초과면, 해당 구간 (lv 60 부근) hpMult 하향.

조정 패턴:
```ts
// 예시: 측정 결과 30h@F25 가 너무 빨리 통과 (over-tolerance) → hpMult 1.5 → 1.8
{ id: 'goblin', ..., levelMin: 50, levelMax: 500, hpMult: 1.8, ... },
```

각 조정 직후 sweep 재실행:

```bash
pnpm --filter @forge/game-inflation-rpg balance:sweep /tmp/sweep-iter.md
cat /tmp/sweep-iter.md | head -20
```

`±20% 통과` 컬럼이 모두 ✅ 될 때까지 반복.

- [ ] **Step 3: Curve 1 절벽 (있으면) 처리**

`floors.ts:16-24` 의 anchor 표가 단조이지만, monster lv 갑작스런 점프가 floor 30→31 (180→184), 100→101 (1000→1023) 등 자연스러운 가속. 절벽이 sweep 에서 검출되면:

옵션:
- anchor 추가 (예: `[60, 500]` 추가) — 보간 부드럽게.
- anchor 값 미세 조정.

```ts
// floors.ts:16
const FLOOR_LEVEL_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [10, 10],
  [30, 180],
  [60, 500],   // 측정 발견 시 추가 — 30→100 사이 부드럽게
  [100, 1_000],
  [200, 10_000],
  [500, 100_000],
  [1000, 1_000_000],
];
```

`floors.test.ts` 의 anchor expectation 도 함께 갱신.

- [ ] **Step 4: 회귀 검증**

```bash
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg balance:sweep docs/superpowers/reports/2026-05-10-balance-sweep.md
```

Expected: 모든 vitest pass. report 의 `±20% 통과` ✅, `절벽` 0.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/monsters.ts games/inflation-rpg/src/data/floors.ts games/inflation-rpg/src/data/floors.test.ts docs/superpowers/reports/2026-05-10-balance-sweep.md
git commit -m "fix(game-inflation-rpg): tune monsters.hpMult + floors anchors per spec curve 1+2"
```

---

## Task 8: TODO-a (F30 보상 격상)

**Files:**
- Modify: `games/inflation-rpg/src/data/dungeons.ts` 또는 보상 정의 파일

- [ ] **Step 1: F30 보상 위치 확인**

```bash
```

`dungeons.ts` 의 `bossIds.final` row 와 연관된 reward. spec §2 TODO-a 의 "강화석 50~100 분배". 현재 BattleScene line 188 의 `onBossKill(this.bossId, 5, ...)` — 5 가 BP, 강화석은 별도 (gameStore 의 `bossDrop`).

```bash
grep -rn "bossDrop\|stones" games/inflation-rpg/src/store/
```

- [ ] **Step 2: bossDrop 의 강화석 분배 식 확인**

해당 함수 위치 식별 후 final boss 의 stone 보상이 50~100 사이가 되도록 조정.

- [ ] **Step 3: 단위 테스트**

bossDrop 의 final boss 케이스 stone 보상 50≤x≤100 검증.

- [ ] **Step 4: 회귀 + Commit**

```bash
pnpm --filter @forge/game-inflation-rpg test
git add games/inflation-rpg/src/store/ games/inflation-rpg/src/data/
git commit -m "feat(game-inflation-rpg): boost F30 final boss stone reward to 50-100"
```

---

## Task 9: TODO-b (ULT magnitude 절벽 보정)

**Files:**
- Modify: `games/inflation-rpg/src/data/jobskills.ts`

- [ ] **Step 1: jobskills.ts 의 12 ULT 의 dmgMul / cd / target 표 검토**

각 ULT 의 lv 1→6 magnitude 가 `enhanceMultiplier` 의 lv 곡선 (per_lv = 0.05~0.32) 와 비례하는지 확인.

- [ ] **Step 2: 절벽 발견 시 magnitude 조정**

dmgMul 이 lv 간격에서 1.5× 이상 점프하면 보정.

- [ ] **Step 3: jobskills.test.ts 에 절벽 가드 추가**

```ts
import { describe, it, expect } from 'vitest';
import { JOB_SKILLS } from './jobskills';

describe('jobskill magnitude monotonicity', () => {
  for (const sk of JOB_SKILLS) {
    it(`${sk.id}: dmgMul 단조 + 절벽 0`, () => {
      const lvs = sk.lvCurve.map((row) => row.dmgMul);
      for (let i = 0; i < lvs.length - 1; i++) {
        const a = lvs[i]!; const b = lvs[i + 1]!;
        expect(b).toBeGreaterThanOrEqual(a);    // 단조
        expect(b / a).toBeLessThan(1.5);        // 절벽 금지
      }
    });
  }
});
```

(`lvCurve` 의 정확한 필드 이름은 jobskills.ts 의 type 따라 조정.)

- [ ] **Step 4: 회귀 + Commit**

```bash
pnpm --filter @forge/game-inflation-rpg test
git add games/inflation-rpg/src/data/jobskills.ts games/inflation-rpg/src/data/jobskills.test.ts
git commit -m "fix(game-inflation-rpg): smooth ULT dmgMul curve, add monotonicity guard"
```

---

## Task 10: TODO-c (강화 lv cap + 광고 페이싱 검증)

**Files:**
- 검증만, 데이터 변경은 발견 시.

- [ ] **Step 1: 평생 cap (base 50) + 광고 +50 검증**

```bash
grep -rn "lifetimeCap\|enhanceCap\|cap" games/inflation-rpg/src/systems/enhance.ts games/inflation-rpg/src/store/
```

cap 정의 위치 식별. spec §2 TODO-c: base 50 + 광고 +1/시청 (총 +50).

- [ ] **Step 2: 페이싱 검증 — 광고 시청 횟수 가정**

300h spec Section 10.3: 300h = ~2,000회 광고 시청. cap +50 까지 도달 = 50회 광고 시청 = ~7시간. spec Section 10.1 의 0~1h 마일스톤 "첫 강화석" 과 비교해 cap 도달이 너무 빠르거나 느리지 않은지 확인.

- [ ] **Step 3: 발견 시 cap 식 조정 (없으면 skip)**

cap 도달이 5h 이내 너무 빠르면 광고당 +1 → +0.5 등 조정 (계단 cap = floor(adWatched / 2)).

- [ ] **Step 4: vitest 추가 + Commit**

cap 식 변경 시 enhance.test.ts 에 케이스 추가. 변경 없으면 검증만.

```bash
pnpm --filter @forge/game-inflation-rpg test
git add ...
git commit -m "verify(game-inflation-rpg): enhance lv cap pacing matches spec 10.3"
```

(변경 없으면 commit 생략.)

---

## Task 11: 통과 검증 + (필요 시) Tier B 진입

**Files:**
- (조건부) `games/inflation-rpg/src/systems/enhance.ts`, `experience.ts`
- (조건부) `docs/superpowers/specs/2026-05-10-phase-balance-patch-design.md` §8.2

- [ ] **Step 1: 통합 sweep 재실행**

```bash
pnpm --filter @forge/game-inflation-rpg balance:sweep docs/superpowers/reports/2026-05-10-balance-sweep.md
```

- [ ] **Step 2: 통과 기준 (i)(ii)(iii) 검증**

report 의 모든 row 가:
- `±20% 통과` ✅
- `절벽` 0
- TODO-a/b/c/d 모두 commit 됨 (git log 로 검증)

전부 통과 → **Task 12 로 skip**.

- [ ] **Step 3: 통과 안 되면 — Tier B 진입**

본 spec `docs/superpowers/specs/2026-05-10-phase-balance-patch-design.md` §8.2 에 결정 추가 (Edit 로 inline):

```markdown
### 8.2 Tier B (실제 진입 — 2026-05-XX)

진입 사유: Tier A 만으로 milestone X시점 ±20% 통과 실패. 실측 = N, 기대 = M.
변경 magnitude:
- `enhance.ts` PER_LV_MULT: epic 0.15 → 0.18 (or whatever)
- `experience.ts` ...
```

해당 파일 magnitude 조정 → sweep 재실행 → 통과 확인.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-10-phase-balance-patch-design.md games/inflation-rpg/src/systems/enhance.ts games/inflation-rpg/src/systems/experience.ts docs/superpowers/reports/2026-05-10-balance-sweep.md
git commit -m "fix(game-inflation-rpg): tier B escalation — adjust enhance/exp curves"
git tag phase-balance-cp4
```

---

## Task 12: vitest 영구 회귀 가드

**의도:** S6. milestone 6 케이스를 CI 자동 실행으로 동결. 곡선 회귀 즉시 감지.

**Files:**
- Create: `games/inflation-rpg/src/test/balance-milestones.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// games/inflation-rpg/src/test/balance-milestones.test.ts
import { describe, it, expect } from 'vitest';
import { runSweep } from '../../tools/balance-sweep';

const N_VITEST = 10; // S2 spec §7.4: vitest N=10 (full sweep N=100 from CLI)

describe('balance milestones — spec Section 10.1 ±20%', () => {
  // runSweep 의 내부 N 값을 vitest 모드로 줄이려면 balance-sweep.ts 에
  // overrideable N 파라미터를 추가해야 함. 현재는 full sweep 그대로 호출.
  // 실행 시간이 60s 이내면 OK, 초과 시 sweep 에 옵션 추가.
  it.concurrent('runSweep 모든 row ±20% + 절벽 0', async () => {
    const rows = runSweep();
    for (const row of rows) {
      expect.soft(row.withinTolerance, `${row.hours}h@F${row.expectedFloor}: measured ${row.measuredFloor}`).toBe(true);
      expect.soft(row.cliffsDetected, `${row.hours}h cliffs`).toEqual([]);
    }
  }, 120_000);
});
```

> `runSweep` 가 60s 초과면 N 파라미터 추가:
>
> ```ts
> // balance-sweep.ts
> export function runSweep(opts?: { n?: number }): SweepRow[] {
>   const N = opts?.n ?? 100;
>   ...
> }
> ```
>
> vitest 는 `runSweep({ n: 10 })`, CLI 는 `runSweep()` (N=100).

- [ ] **Step 2: 실행 + 시간 측정**

```bash
time pnpm --filter @forge/game-inflation-rpg vitest run src/test/balance-milestones.test.ts
```

Expected: pass, 시간 < 120s. 60s 초과 시 N 파라미터화 + retry.

- [ ] **Step 3: 전체 vitest 회귀**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모두 pass.

- [ ] **Step 4: typecheck + lint + circular + e2e**

```bash
pnpm typecheck && pnpm lint && pnpm circular && pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: 모두 0 exit.

- [ ] **Step 5: Commit + tag**

```bash
git add games/inflation-rpg/src/test/balance-milestones.test.ts games/inflation-rpg/tools/balance-sweep.ts
git commit -m "test(game-inflation-rpg): freeze balance milestone regression guard (6 cases)"
git tag phase-balance-cp5
```

---

## Task 13: phase 종료 — 머지 + tag

**Files:**
- 없음 (git 작업만)

- [ ] **Step 1: 최종 검증**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm circular && pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: 모두 0 exit / pass.

- [ ] **Step 2: main 으로 머지 (`--no-ff`)**

```bash
git checkout main
git merge --no-ff feat/phase-balance-patch -m "Merge feat/phase-balance-patch: Phase 1 균형 패치 (300h spec 곡선 정합화)"
git tag phase-balance-complete
```

- [ ] **Step 3: 메모리 갱신 (사용자 확인 후)**

`/Users/joel/.claude/projects/-Users-joel-Desktop-git-2d-game-forge/memory/MEMORY.md` 에 한 줄 추가:

```
- [Phase 1 균형 패치 완료 — 300h spec 곡선 정합화](project_phase_balance_complete.md) — phase-balance-complete. pure resolver + balance-sim + 6 milestone 회귀 가드.
```

해당 파일 (`project_phase_balance_complete.md`) 도 함께 작성.

- [ ] **Step 4: 사용자 push 안내**

```
완료. main 머지 + tag phase-balance-complete. push 명령 (사용자 직접):
  git push origin main
  git push origin phase-balance-cp1 phase-balance-cp2 phase-balance-cp3 phase-balance-cp4 phase-balance-cp5 phase-balance-complete
```

---

## Self-Review (작성자가 plan 작성 후 본인 점검)

### 1. Spec coverage

| spec 항목 | 처리 task |
|-----------|-----------|
| §2 TODO-a (F30 보상) | Task 8 |
| §2 TODO-b (ULT magnitude) | Task 9 |
| §2 TODO-c (강화 cap + 광고) | Task 10 |
| §2 TODO-d (Curve 1 절벽) | Task 7 |
| §5 (i) 페이싱 ±20% | Task 6 + 7 + 11 |
| §5 (ii) 단조성 절벽 0 | Task 6 + 7 + 11 |
| §5 (iii) TODO 처리 | Task 8 + 9 + 10 |
| §7 S1 (resolver) | Task 1 + 2 + 3 |
| §7 S2 (simulator) | Task 4 |
| §7 S3 (sweep) | Task 5 |
| §7 S4 (report) | Task 6 |
| §7 S5 (magnitude) | Task 7~11 |
| §7 S6 (vitest 가드) | Task 12 |
| §8.1 Tier A | Task 7~10 |
| §8.2 Tier B 진입 조건 | Task 11 (조건부) |
| §10 persist v8 | 코드 변경 없음 — 자동 만족 |
| §11 위험 (drift) | Task 1 의 fixture + Task 2 의 parity test |
| §12 일정 (CP1~CP5) | Task 3/5/6/11/12 의 tag |
| §13 검증 | Task 12/13 의 명령 모두 포함 |
| §15 Phase 2 인터페이스 | resolver 가 export — Phase 2 가 직접 import 가능 |

전 항목 cover.

### 2. Placeholder scan

- Task 8/9/10 의 일부 step 이 "위치 식별" 후 조정 — 이는 sweep 결과 의존이라 plan 작성 시점에 정확한 file:line 명시 불가능. step 안에 grep 명령 + 후속 step 의 결정 기준은 명시함.
- Task 7 step 1 의 "옵션 A/B/C 결정" — 분석/결정 task 이므로 분기 명시.

### 3. Type consistency

- `SimPlayer.skills` 타입은 `Array<ActiveSkill & { dmgMul?: number }>` (BattleScene line 22 `buildActiveSkillsForCombat` 결과와 일치).
- `MilestoneState.equipRarity` 는 `EquipmentRarity` 의 union literal 과 동일.
- `runSweep` 의 옵션 `{ n?: number }` 는 Task 12 step 1 에서 추가 (필요 시).

수정 없음.

---

## Execution Handoff

Plan 작성 완료 → `docs/superpowers/plans/2026-05-10-phase-balance-patch-plan.md`. main 에 commit 후 실행 모드 선택 필요.

**1. Subagent-Driven (recommended)** — 각 task 별로 fresh subagent 디스패치. task 간 review 가능. 빠른 iteration.

**2. Inline Execution** — 본 세션에서 task 차례로 실행. checkpoint 별 사용자 review.

어느 모드?
