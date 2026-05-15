# Phase G — Ascension Tree (성좌) Design

**Date**: 2026-05-15
**Status**: draft (pre-approval)
**Master spec**: [`2026-05-01-content-300h-design.md`](2026-05-01-content-300h-design.md) §6.4
**Predecessors**: phase-f1-complete (38a4cf6), phase-d-complete (14a8db0)

## 1. 목적

F-1 의 dormant `meta.ascPoints` 를 sink 로 연결한다. 계정 단위 영구 효과 노드 10개 + Phase D modifier/effect 통합 hook 으로 Asc Tier 진행에 의미 부여.

## 2. 결정 사항 (사용자 합의)

| 항목 | 결정 |
|---|---|
| 노드 구성 | spec §6.4 의 10개 중 8개 + Phase D 통합 노드 2개 (`mod_magnitude`, `effect_proc`) |
| 제거된 spec 노드 | `DEF +5%` (인플레이션 곡선상 무의미), `잠재력 개방` (jobTree 와 중첩) |
| AP cost 모델 | linear (`lv × 1 AP`), 다음 lv 비용 = 현재 lv + 1 |
| Sim fidelity | Phase G 안에 통합 (`processIncomingDamage` + `stat_mod` + 노드 반영) |
| UI 배치 | `Ascension.tsx` 탭 2개 (`초월` / `성좌`) |
| Respec | 불가 (영구) — 노드 클릭 시 확인 모달로 mistake 완화 |
| Persist | v9 → v10 (ascTree 초기 0 주입) |

## 3. 노드 카탈로그

| # | id | 이름 | 효과 | max | 누적 | 총 비용 |
|---|---|---|---|---|---|---|
| 1 | `hp_pct` | 강철의 심장 | HP +5%/lv | 10 | +50% | 55 |
| 2 | `atk_pct` | 분노의 인장 | ATK +5%/lv | 10 | +50% | 55 |
| 3 | `gold_drop` | 황금의 손길 | 골드 드랍 +10%/lv | 5 | +50% | 15 |
| 4 | `bp_start` | 전사의 결의 | 런 시작 BP +1/lv | 5 | +5 | 15 |
| 5 | `sp_per_lvl` | 성장의 빛 | 레벨업 SP +1/lv | 4 | +4 | 10 |
| 6 | `dungeon_currency` | 차원의 보고 | 던전 화폐 +10%/lv | 5 | +50% | 15 |
| 7 | `crit_damage` | 치명의 일격 | 크리 데미지 +20%/lv | 5 | +100% | 15 |
| 8 | `asc_accel` | 어센션 가속 | Asc 비용 -10%/lv | 9 | -90% | 45 |
| 9 | `mod_magnitude` ★ | 수식의 정수 | 수식어 magnitude +5%/lv | 10 | +50% | 55 |
| 10 | `effect_proc` ★ | 격발의 손길 | Effect proc 확률 +5%/lv | 5 | +25% | 15 |

★ spec §6.4 drift — Phase D 통합 노드. 이름은 placeholder, 구현 시 확정.

**Full saturation**: 68 levels = **295 AP**. Tier 24 진입 누적 = 300 AP → 도달 가능. 잉여 165 AP @ Tier 30.

`nodeCost(currentLv) = currentLv + 1`
`nodeTotalCost(targetLv) = targetLv × (targetLv + 1) / 2`

## 4. State & Persist

### 4.1 Type (`src/types.ts`)

```ts
export type AscTreeNodeId =
  | 'hp_pct' | 'atk_pct' | 'gold_drop' | 'bp_start' | 'sp_per_lvl'
  | 'dungeon_currency' | 'crit_damage' | 'asc_accel'
  | 'mod_magnitude' | 'effect_proc';

export interface AscTree {
  hp_pct: number; atk_pct: number; gold_drop: number;
  bp_start: number; sp_per_lvl: number; dungeon_currency: number;
  crit_damage: number; asc_accel: number;
  mod_magnitude: number; effect_proc: number;
}

// MetaState
ascTree: AscTree;  // 모든 노드 lv 0 초기값
```

### 4.2 Catalogue (`src/data/ascTree.ts` 신규)

```ts
interface AscTreeNodeDef {
  id: AscTreeNodeId;
  name: string;
  description: string;
  effectMagnitude: number;  // 0.05 / 0.10 / 0.20 / 1
  maxLevel: number;
}

export const ASC_TREE_NODES: Record<AscTreeNodeId, AscTreeNodeDef>;
export function nodeCost(currentLv: number): number { return currentLv + 1; }
export function nodeTotalCost(targetLv: number): number {
  return (targetLv * (targetLv + 1)) / 2;
}
```

### 4.3 Store Actions (`src/store/gameStore.ts`)

```ts
canBuyAscTreeNode(id: AscTreeNodeId): {
  ok: boolean;
  cost: number;
  currentLv: number;
  reason?: 'max' | 'ap';
};

buyAscTreeNode(id: AscTreeNodeId): boolean;
```

### 4.4 Persist v9 → v10

```ts
if (fromVersion <= 9 && s.meta) {
  s.meta.ascTree = s.meta.ascTree ?? {
    hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
    dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
    mod_magnitude: 0, effect_proc: 0,
  };
}
```

v9 이전 chain 마이그는 기존대로 유지. `ascPoints` 누적값은 보존.

## 5. 효과 적용 지점

### 5.1 `calcFinalStat` 확장 (`src/systems/stats.ts`)

```ts
calcFinalStat(
  base: number,
  spPoints: number,
  percentMult: number,
  charMult: number,
  baseAbilityMult: number,
  ascTierMult: number,
  ascTreeMult: number,  // 신규
): number
```

호출자가 노드 매핑 후 multiplier 전달:
- ATK 계산: 호출자가 `1 + 0.05 × ascTree.atk_pct` 전달
- HP 계산: 호출자가 `1 + 0.05 × ascTree.hp_pct` 전달
- DEF: 변경 없음 (해당 노드 제거됨)

### 5.2 Drop multipliers

- `gainGold(amount)` → `Math.floor(amount × (1 + 0.10 × gold_drop))`
- `gainDungeonCurrency(type, amount)` → `Math.floor(amount × (1 + 0.10 × dungeon_currency))`

### 5.3 Run 시작 BP / SP

- `startRun(char)` BP 초기값 = `BP_BASE + bp_start`
- `levelUpCharacter()` SP 획득 = `SP_PER_LEVEL + sp_per_lvl`

### 5.4 크리 데미지 (`src/effects/pipeline.ts`)

```ts
if (isCrit) {
  damage = base × (CRIT_MULT + 0.20 × crit_damage);
}
```

### 5.5 Asc 비용 (`canAscend`)

```ts
cost = Math.ceil((nextTier ** 2) × (1 - 0.10 × asc_accel));
```

max 9 → ×0.10 floor. Tier 30 비용 = 90 (원래 900).

### 5.6 수식어 magnitude (`src/modifiers/resolve.ts`)

```ts
resolvedMagnitude = mod.magnitude × (1 + 0.05 × mod_magnitude);
```

모든 modifier 일괄 적용. base × multiplier.

### 5.7 Effect proc 확률 (`src/effects/pipeline.ts`)

```ts
procChance = Math.min(1, effect.chance × (1 + 0.05 × effect_proc));
```

base 0% effect 는 영원히 0% (의도).

## 6. UI

### 6.1 `Ascension.tsx` 탭 2개

```
┌─ 차원 제단 ─────────────────┐
│  [ 초월 ] [ 성좌 ]          │
├─────────────────────────────┤
│ (탭 내용)                   │
└─────────────────────────────┘
```

**Tab "초월"** (기존 UI 보존):
- Tier 상태 / 균열석 / finals 진행 / 초월 버튼
- 비용 표시는 `asc_accel` 적용 후

**Tab "성좌"** (신규):
- 상단: `보유 AP: {meta.ascPoints}` (forge-accent)
- 노드 grid 10개 (2-col 모바일, 3-col tablet)
- 노드 카드:
  ```
  ┌──────────────┐
  │ 분노의 인장   │
  │ ATK +5%      │
  │ lv 3 / 10    │
  │ 다음: 4 AP   │
  │ [ 강화 ]     │
  └──────────────┘
  ```
- 클릭 → 확인 모달:
  ```
  분노의 인장 lv 3 → 4
  4 AP 소비
  [ 확인 ] [ 취소 ]
  ```
- 비활성 상태: AP 부족 (회색) / max lv (`MAX` 표시)

### 6.2 testid 규칙

- 탭 전환: `[data-testid="asctree-tab-tree"]` / `asctree-tab-tier`
- 노드 카드: `[data-testid="asctree-node-{id}"]`
- 강화 버튼: `[data-testid="asctree-buy-{id}"]`
- 확인 모달 확인: `[data-testid="asctree-confirm-{id}"]`
- AP 카운터: `[data-testid="asctree-ap"]`

### 6.3 컴포넌트

기존 forge-ui 재사용: `forge-screen`, `forge-panel`, `forge-button`. 새 컴포넌트 없음.

## 7. Sim Fidelity Cleanup

### 7.1 `processIncomingDamage` 통합

- `balance-sim/run.ts` 의 적 공격 경로가 직접 `player.hp -= dmg` 하던 부분을 `processIncomingDamage(player, dmg, modifiers, effects)` 호출로 교체.
- shield / reflect / dot 흐름이 sim 에서 실 게임 동일하게 작동.

### 7.2 `stat_mod` SimPlayer 합산

- `balance-sim/buildSimPlayer.ts` (또는 동등 파일) 가 modifier list 의 `stat_mod` (ATK/HP flat/pct) 를 합산하도록 확장.
- 결과 SimPlayer.atk/hp 가 실 게임 `calcFinalStat` 결과와 동일.

### 7.3 magnitude / proc 노드 sim 반영

- `buildSimPlayer` 가 `meta.ascTree.mod_magnitude` / `meta.ascTree.effect_proc` 인자를 받아 modifier 해상도 / effect chance 에 곱한다.

### 7.4 검증

기존 `balance-milestones.ts` 회귀 가드가 통과해야 함. sim drift 가 milestone 허용 범위 (±5%) 초과 시 별 step 으로 milestone 재조정.

## 8. 테스트 전략

### 8.1 Unit (vitest)

- `data/ascTree.test.ts` — 10 노드 카탈로그 무결성, `nodeCost(lv)` / `nodeTotalCost(targetLv)` 곡선.
- `store/gameStore.test.ts` — `canBuyAscTreeNode`, `buyAscTreeNode` (AP 차감, max 차단, 비용 정확).
- `systems/stats.test.ts` — `calcFinalStat` 가 ascTreeMult 적용. ATK/HP 매핑 별 노드 lv 결과.
- `effects/pipeline.test.ts` — `effect_proc` procChance 곱. `crit_damage` 곱. floor 0 / ceiling 1.
- `modifiers/resolve.test.ts` — `mod_magnitude` magnitude 곱.
- 새 `economy.test.ts` — gold/dungeon currency drop multiplier (`gold_drop`, `dungeon_currency`).
- `store/migrate.test.ts` — v9 → v10 (ascTree 초기 0, ascPoints 보존).

### 8.2 Sim (balance-sim)

- `balance-sim/run.ts` 새 시나리오: ascTree saturated (full max) 빌드. ATK / HP 곡선 spec §11 정합.
- `balance-sweep` axis: 노드 lv 0 vs full max 비교.
- `balance-milestones.ts` 회귀 통과.

### 8.3 E2E (Playwright)

- `e2e/asctree.spec.ts` 신규 — 차원 제단 → 성좌 탭 → AP 표시 → 노드 클릭 → 확인 모달 → 강화 후 lv 증가 + AP 차감.
- 기존 `e2e/ascension.spec.ts` 회귀 — 초월 탭 흐름 변경 없음.

### 8.4 카운트 타겟

- vitest: 현재 447 → **~475**
- e2e: 현재 22 → **24**

## 9. Scope Boundary

### 9.1 Phase G 포함

- 10 노드 카탈로그 + AP linear cost
- `meta.ascTree` state + persist v9 → v10
- 10개 적용 지점 (HP / ATK / gold / dungeon currency / BP / SP / crit / asc_accel / mod_magnitude / effect_proc)
- UI 탭 2개
- Sim fidelity cleanup
- vitest + e2e 회귀

### 9.2 Phase G 제외

- ❌ Respec
- ❌ Asc Tier 마일스톤 보상 (Phase E 와 통합)
- ❌ Mythic 유물 / 유물 시스템 (Phase E)
- ❌ 비핵심 캐릭터 13 (별도 spec)
- ❌ Job Tree 확장

## 10. 알려진 한계 (수용)

- `asc_accel` max 9 = -90%. Tier 30 비용 90 (원래 900). 의도된 sink 감소.
- `effect_proc` 가 base chance 곱셈. base 0% effect 는 영원히 0%.
- `mod_magnitude` 가 모든 modifier 일괄. 특정 modifier 차등 조정 불가.
- spec §6.4 노드 2개 (DEF, 잠재력) 제거 — 본 spec 에 명시 기록 (drift).

## 11. 감각 체크 (인플레이션 곡선 정합)

- `atk_pct` max 10 = ×1.50 — `calcFinalStat` 의 한 multiplier 무게. `(1 + 0.1 × ascTier)` Tier 10 = ×2.0 와 비교해 비슷한 무게감.
- `mod_magnitude` max 10 = +50%. Phase D 평균 modifier magnitude 5~30% → effective DPS +5~15%.
- `effect_proc` max 5 = +25%. base 5% chance status → 6.25%. 미세하지만 누적.
- Full saturation 295 AP @ Tier 24 — spec §11.4 의 Tier 30 "초월" 마일스톤 시점에 모든 노드 max 도달 + 잉여 AP 가능. 자연 종착.

## 12. 다음 단계

1. 본 spec 사용자 리뷰 + 승인
2. `writing-plans` skill → 상세 task 분해 (cp1~cpN)
3. `subagent-driven-development` 실행
4. 최종 tag `phase-g-complete`
