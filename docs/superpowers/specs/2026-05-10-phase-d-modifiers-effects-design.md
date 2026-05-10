# Phase D — 수식어 (Modifier) + Effect-Pipeline 디자인

- 작성일: 2026-05-10
- 대상: `games/inflation-rpg`
- 선행: `phase-balance-complete` (b7b7335)
- 후행: Phase G (Asc Tree) → Phase E (유물 + Mythic + 광고)
- 부모 spec: [`2026-05-01-content-300h-design.md`](2026-05-01-content-300h-design.md) §8 + §8.6
- 직전 phase spec: [`2026-05-10-phase-balance-patch-design.md`](2026-05-10-phase-balance-patch-design.md)

## 1. 개요

부모 spec §8 의 D2 식 수식어 시스템 + §8.6 의 effect-pipeline 도입. 임시
ULT (Phase 1 의 부채 — 흑주 디버프 / 반격일도) 정식화. 빌드 시너지 (§8.5) 의 5
컨셉 작동.

핵심 architecture:
- **effect-pipeline 은 Phase 1 의 resolver pattern 따른다** — pure tick
  함수 + state map. BattleScene 과 simulator 가 동일 module 호출.
  drift 불가.
- **modifier magnitude 는 강화 곡선 그대로** — `base × enhanceMultiplier
  (rarity, lv)`. 별도 곡선 없음.
- **persist v9 자동 굴림 마이그레이션** — 기존 EquipmentInstance 가
  v9 로 로드 시 등급 기반 자동 modifier 굴림. 과거 자산 보호.

## 2. 목적

- 부모 spec §8 의 모든 sub-section 구현:
  - §8.1 — instance 마다 1~4 modifier
  - §8.2 — rarity → slot 수
  - §8.3 — 40 풀 (5 카테고리)
  - §8.4 — 굴림 (drop / craft / reroll)
  - §8.5 — 빌드 시너지 5 컨셉 검증
  - §8.6 — effect-pipeline 6 effect type
- Phase 1 임시 ULT 정식화 (TODO from `2026-05-10-phase-balance-patch-design.md` §3).
- balance sweep 재측정 (modifier 효과 포함).

## 3. 비목적

- mythic 등급 장비 풍부화 (30 종) → Phase E
- 유물 (10 누적 + 30 mythic + 40 차원 나침반) → Phase E
- 광고 SDK / 강화 cap 식 → Phase E
- Asc Tree 노드 (10 종류) → Phase G
- BattleScene 의 구조 변경. effect-pipeline 은 신규 layer 로 추가, 기존
  resolver 호출 보존.

## 4. 출발점 / context

- Phase 1 (균형 패치) 후 power 곡선 6/6 ✅. balance-milestones.test.ts
  회귀 가드 동결.
- `EquipmentInstance` 모델 (Phase F-2+3) 가 이미 `baseId` + `enhanceLv`
  필드. 본 phase 가 `modifiers: Modifier[]` 추가.
- 임시 ULT 매핑 (jobskills.ts 의 흑주 디버프 / 반격일도) 가 `buff`
  effect type 으로 임시 처리됨. 본 phase 가 정식 `debuff` / `reflect`
  로 정착.
- Phase 1 의 sweep 가 임시 ULT 의 부정확성을 명시 — Phase D 후 재 sweep
  으로 곡선 변화 측정.

## 5. 통과 기준

phase 종료 시 다음 모두 만족.

1. **(i) sweep 회귀** — `balance-milestones.test.ts` 가 modifier 포함된
   환경에서도 6/6 ✅. cliff 0.
2. **(ii) effect-pipeline 6 type 작동** — dot / cc / debuff / shield /
   reflect / trigger 각 단위 테스트 통과.
3. **(iii) 빌드 시너지** — §8.5 의 5 컨셉 (화랑 검술 폭딜 / 화랑 화염
   폭격 / 무당 저주 봉쇄 / 무당 즉사 / 초의 흡혈 탱커) 가 simulator
   또는 e2e 에서 작동.
4. **(iv) 임시 ULT 정식화** — 흑주 디버프 → debuff effect type, 반격일도
   → reflect effect type. resolver.test.ts 의 snapshot 갱신 (의도적
   행동 변경).
5. **(v) v8 → v9 마이그레이션** — 기존 save 로드 시 자동 굴림. e2e
   회귀 0.
6. **(vi) 40 modifier 풀 모두 catalogue** — 5 카테고리 × 평균 8.

## 6. 컴포넌트 상세

### 6.1 Effect-pipeline — `src/systems/effects.ts`

**Architecture**: pure tick 함수 + state map combo. Phase 1 resolver
pattern 의 stateful 확장.

**6 effect type**:

| type | 의미 | 적용 메커니즘 |
|------|------|-------------|
| `dot` | 도트 (중독·출혈) | duration 동안 매 tick `damage_per_tick × magnitude` |
| `cc` | 기절·동결·공포 | duration 동안 행동 봉쇄 (`actionBlocked: true`) |
| `debuff` | 약화·둔화 | duration 동안 stat % 감소 + stack |
| `shield` | 보호막 | flat absorption — 일정량까지 받는 dmg 무효화 |
| `reflect` | 반사 | duration 동안 받은 dmg × magnitude → 적 |
| `trigger` | 처치/HP/stack | 조건 만족 시 effect 발동 (HP < threshold, on_kill, stack ≥ N) |

**시그니처 (확정 아님 — plan 단계에서 정확한 type 표 정착)**:

```ts
// EffectId 의 정확한 catalogue 는 plan 의 effects 카탈로그 task 에서 결정.
// 예: 'dot_poison', 'cc_stun', 'debuff_weaken', 'shield_basic', 'reflect_basic',
// 'trigger_on_kill_soul' 등.
export type EffectId = string;

export interface ActiveEffect {
  id: EffectId;
  source: 'modifier' | 'ult' | 'skill';
  target: 'self' | 'enemy';
  durationMs: number;
  remainingMs: number;
  magnitude: number;
  stack: number;
}

export interface EffectsState {
  active: Map<EffectId, ActiveEffect>;
}

export function createEffectsState(): EffectsState;

export function addEffect(state: EffectsState, effect: ActiveEffect): void;

// dt 만큼 진행. 만료된 effect 제거. tick 데미지 / 디버프 만료 처리.
export function tickEffects(
  state: EffectsState,
  combatState: CombatState,
  dt: number,
): { stateDelta: Partial<CombatState>; events: EffectEvent[] };

// trigger 평가 (HP/kill/stack)
export function evaluateTriggers(
  state: EffectsState,
  combatEvent: 'on_kill' | 'on_hp_change' | 'on_stack',
  context: TriggerContext,
): EffectEvent[];
```

**Stateful 부분** (pure 아님): `EffectsState` 의 `active` map. 매 tick
업데이트. simulator 도 동일 map 유지 (deterministic).

**Pure 부분**: `tickEffects` 의 effect → stat delta / events 변환은
deterministic. 동일 input → 동일 output.

### 6.2 Modifier 데이터 — `src/data/modifiers.ts`

40 row 의 catalogue. 각 row:

```ts
export interface Modifier {
  id: string;
  nameKR: string;
  category: 'attack' | 'status' | 'utility' | 'defense' | 'special';
  baseValue: number;       // 강화 lv 0 의 magnitude
  effectType: EffectType;  // 'stat_mod' | 'dot' | 'cc' | 'debuff' | 'shield' | 'reflect' | 'trigger'
                           // 'stat_mod' 는 effect-pipeline 이 아닌 stat 식에 직접 적용 (크리/관통/원소피해 등).
                           // 나머지 6 종은 §6.1 effect-pipeline 의 6 type 과 일치.
  validSlots: SlotKind[];  // ['weapon'] | ['armor'] | ['accessory'] | ['*']
  rarityWeight: { common: number; ...; mythic: number };
  triggerSpec?: TriggerSpec;  // trigger type 만
}
```

**5 카테고리 × 카테고리별 풀**:

| 카테고리 | 수 | 예 |
|----------|----|----|
| attack | 8 | 크리티컬, 크리데미지, 관통, 마법공격, 화염피해, 냉기피해, 번개피해, 신성피해 |
| status | 8 | 중독(dot), 출혈(dot), 기절(cc), 동결(cc), 공포(cc), 약화(debuff), 둔화(debuff), 침묵(cc) |
| utility | 6 | 흡혈(trigger:on_hit), SP흡수(trigger), 골드부스트, 경험치부스트, 화폐부스트, 행운 |
| defense | 6 | 회피, 반사(reflect), 가시(reflect), 방어막(shield), 재생(trigger), 면역 |
| special | 6 | 즉사(trigger:HP), 시간정지(cc), 광기(trigger:HP), 분노(trigger:stack), 영혼흡수(trigger:on_kill), 검은노래(debuff:special) |

**rarity weight**: special 6 은 mythic-rarity 만 (또는 legendary+mythic 가중). 다른 카테고리는 rarity 무관 또는 약한 가중.

**slot 분배** (§8.3 의 슬롯별 풀):
- weapon 풀: attack + status + utility + special (반사·가시 X)
- armor 풀: defense + status (제한적) + utility (제한적)
- accessory 풀: 모두 가능

### 6.3 Modifier 시스템 — `src/systems/modifiers.ts`

**핵심 함수**:

```ts
// drop 시 굴림 (§8.4)
rollModifiers(rarity: EquipmentRarity, slotKind: SlotKind): Modifier[];

// reroll 비용 (§8.4)
rerollCost(instance: EquipmentInstance, mode: 'one' | 'all'): { dr: number; stones: number };

// reroll
rerollOneSlot(instance: EquipmentInstance, slotIdx: number): EquipmentInstance;
rerollAllSlots(instance: EquipmentInstance): EquipmentInstance;

// magnitude (강화 lv 곡선 적용)
getModifierMagnitude(modifier: Modifier, instance: EquipmentInstance): number;

// 합성 시 (§8.4)
craftWithNewModifiers(items: EquipmentInstance[]): EquipmentInstance;
```

**rarity → slot 수** (§8.2):
| rarity | slots |
|--------|-------|
| common | 1 |
| uncommon | 1 |
| rare | 2 |
| epic | 2 |
| legendary | 3 |
| mythic | 4 |

**굴림 규칙**:
- drop 시: rarity 의 slot 수 만큼 valid pool 에서 가중치 적용 무작위 (중복 없음).
- 합성 시 (3→1): 새 등급의 slot 수만큼 새로 굴림 (이전 modifier 사라짐).
- reroll: 1 슬롯 또는 전체. 강화 lv 보존.

**reroll 비용** (§8.4):
- 슬롯 1 개: `DR 25M + 강화석 250 × 1.5^N` (N = 누적 reroll 횟수)
- 전체: `DR 100M + 강화석 1,000 × 1.5^N`

### 6.4 UI 통합

#### 6.4.1 Inventory detail 확장

기존 `Inventory.tsx` 의 장비 detail panel:
- 추가: modifier 리스트 표시. 각 modifier 의 nameKR + magnitude (강화 lv
  적용한 값). `[크리티컬 +12.5%]` 형태.
- 강화 lv 변경 시 magnitude 실시간 갱신 (zustand subscribe).

#### 6.4.2 Reroll 모달

- 장비 detail 의 "재굴림" 버튼 클릭 → 모달 열림.
- 모달 내용:
  - 현재 modifier 리스트.
  - 슬롯별 reroll 버튼 (n 개) + 전체 reroll 버튼.
  - 비용 표시 (DR + 강화석, 누적 reroll 횟수 반영).
  - 확인 시: 비용 차감 → 새 modifier 굴림 → 모달 갱신.

#### 6.4.3 신규 화면 X

별도 reroll shop / town 메뉴 추가 X. Inventory 안에서 모두 처리.

### 6.5 BattleScene + Simulator 통합

#### 6.5.1 BattleScene

- 새 필드: `private effectsState: EffectsState`.
- `create`: `effectsState = createEffectsState()`.
- `update`: `tickEffects(effectsState, combatState, delta)` 호출 → stateDelta
  적용 + events 처리.
- `doRound`: 적 공격 후 `evaluateTriggers('on_hp_change', ...)` 호출 (HP <
  threshold trigger 발동).
- 적 처치 시: `evaluateTriggers('on_kill', ...)` 호출 (영혼 흡수 등).
- 평타 / 스킬 적용 후 `addEffect` 호출 (반격일도, 흑주 디버프 등).
- modifier 효과: 장비 modifier 의 effect 가 player atk 추가 / shield 부여 /
  trigger 등록 등. `setupModifierEffects(equipment, effectsState)` in
  `create`.

#### 6.5.2 Simulator

- `simulateFloor` 의 turn loop 가 동일 함수 호출.
- BattleScene 의 600ms tick = simulator 의 tick. 동일 시간 단위.
- Effects state map 도 simulator 가 자체 보유 (deterministic).

#### 6.5.3 Resolver 호환

- Phase 1 의 resolver 함수 (`resolveEnemyMaxHp` 등) 그대로 유지.
- effect-pipeline 은 resolver 호출 결과에 추가 적용 (예: 받은 dmg →
  shield 흡수 → 반사 trigger).
- resolver.test.ts snapshot 보존 (modifier 없을 때).
- 새 효과 적용된 케이스는 effects.test.ts 에서 별도 검증.

## 7. 임시 ULT 정식화

| ULT | Phase 1 임시 매핑 | Phase D 정식 |
|-----|-----------------|------------|
| 흑주 디버프 | `buff` (no-op) | `debuff` — 적 ATK -50% × 5s |
| 반격일도 | `buff` | `reflect` — 받은 dmg 80% 반사 × 3s |

`jobskills.ts` 의 lvCurve 에서 effect type 변경 + magnitude 명시. magnitude
값 (-50% / 5s / 80% / 3s) 은 본 spec 시점의 추정. cp1 의 sweep 측정으로
balance 검증 후 plan 에서 최종 정착 — 부모 spec §11 의 Curve 와 정합.

resolver.test.ts snapshot 갱신 (의도적 행동 변경 — 정식화). balance-milestones.test.ts 의 통과 기준
(`measuredFloor ≥ expectedFloor`) 은 그대로 — sim 의 절대값 변동은 통과 여부에 무관 (Phase 1 §5.1 재정의 효과).

## 8. persist v8 → v9 마이그레이션

### 8.1 마이그레이션 함수

`gameStore.ts` 의 zustand persist config:

```ts
persist(... , {
  name: 'inflation-rpg',
  version: 9,
  migrate: (persistedState, version) => {
    if (version === 8) {
      return migrateV8ToV9(persistedState as V8State);
    }
    return persistedState;
  },
})
```

`migrateV8ToV9` 의 역할:
- 모든 `EquipmentInstance` (inventory + equipped) 에 대해:
  - rarity 기반 slot 수 계산.
  - `rollModifiers(rarity, slotKind)` 호출.
  - 결과를 `instance.modifiers` 에 저장.
- 새 v9 필드 추가 — `meta.adsWatched: 0` (Phase E 대비).
- 기존 강화 lv 그대로.

### 8.2 영향

- 기존 player 가 v9 로 업데이트 시 모든 장비 자동 modifier 부착.
- magnitude 즉시 반영 — 더 강해짐 (긍정 UX).
- v8 save 가 깨지지 않음 — corrupt 시 복구는 최후 수단으로 빈 modifiers
  로 fallback.

### 8.3 검증

- 단위 테스트: v8 mock state → migrate → v9 검증.
- e2e: localStorage 에 v8 형태 save 주입 → 게임 로드 → 모든 장비 modifier
  표시 + 회귀 0.

## 9. Checkpoint 분해

| cp | 산출 | tag |
|----|------|-----|
| **cp1** | effects.ts 6 effect type pure module + 단위 테스트 + BattleScene 통합 (modifier 없는 상태에서 ULT 의 effect 만 통과). 임시 ULT 정식화 완료. resolver.test snapshot 갱신. | `phase-d-cp1` |
| **cp2** | modifiers.ts 40 풀 + modifier 시스템 (굴림/reroll/magnitude). v9 마이그레이션. | `phase-d-cp2` |
| **cp3** | Inventory detail modifier 표시 + Reroll 모달. e2e 회귀 0. | `phase-d-cp3` |
| **cp4** | 통합 sweep 재측정 (modifier 효과 포함). milestone 회귀 가드 갱신 정책: (a) Phase 1 통과 기준 (i) 의 `measuredFloor ≥ expectedFloor` 가 여전히 만족하면 통과; (b) modifier 효과로 sim 결과가 변동해도 기준은 그대로. (c) 만약 modifier 가 cliff 새로 생성하면 그 자체가 회귀 — 데이터 조정. | `phase-d-cp4` |
| **cp5** | 빌드 시너지 5 컨셉 검증 + v9 마이그레이션 e2e. | `phase-d-cp5` |

종료 tag = `phase-d-complete`.

## 10. 데이터 / 카탈로그

40 modifier 의 카테고리별 row 정의는 `data/modifiers.ts` 에서 명시. magnitude
는 `baseValue` 만 row 에 정의, 강화 lv 적용은 시스템 단의 함수 호출.

상세 row 카탈로그는 plan 단계의 implementation detail. 본 spec 의 §6.2 의
카테고리 표가 row 의 nameKR / category / 대략적 effectType 의 가이드.

## 11. 일정

- cp1: 1.5d (effects.ts + BattleScene + 임시 ULT — 가장 architectural)
- cp2: 1.5d (modifier 데이터 40 + 시스템 + 마이그레이션)
- cp3: 1d (UI)
- cp4: 0.5d (sweep)
- cp5: 0.5d (빌드 검증 + e2e)

총 ~5d. F-2+3 와 비슷한 규모 (29 task → 30~35 예상).

## 12. 위험 / 완화

| 위험 | 완화 |
|------|------|
| effect state map 의 sim ↔ BattleScene drift | 동일 module import, 동일 함수 호출. resolver pattern. |
| 40 풀 magnitude 균형 | 강화 곡선 단일 → magnitude 공식 단순. baseValue 만 튜닝. |
| persist 마이그레이션 corruption | migrateV8ToV9 단위 테스트 + e2e (v8 save 로드 → 통과 검증) + corrupt fallback. |
| trigger effect 조건 정의 (HP / on_kill / stack) | spec §8.5 빌드 컨셉이 검증 케이스. trigger spec 카탈로그 명시. |
| effect-pipeline 추가로 BattleScene 행동 변화 | Phase 1 의 fixture snapshot — modifier-free 기존 행동 보존 검증. resolver 자체는 unmodified. |
| sweep milestone 변경 시 회귀 가드 false positive | 마이그레이션 시 측정값 변경되면 baseline 갱신 (의도적). 갱신 사유 명시. |
| stateful effect 의 difference 누적 | seed 고정 sim 으로 deterministic 검증. event 별 단위 테스트. |

## 13. 검증

- `pnpm typecheck` 0 / `pnpm lint` 0.
- `pnpm test` 모두 통과 (현재 397 → 본 phase 추가로 +20~40 예상).
- `pnpm e2e` 회귀 0 (20 + 신규 v8→v9 마이그레이션 case + 빌드 시너지 case).
- `pnpm circular` 0.
- `pnpm balance:sweep` — 6/6 ✅, cliff 0.
- vitest 새 케이스: effects.test.ts (6+ tests), modifiers.test.ts (10+ tests),
  v9 migration.test.ts (3+ tests), buildSynergy.test.ts (5 tests, §8.5 컨셉).

## 14. 산출 spec / 후속 plan

- 본 spec → `docs/superpowers/specs/2026-05-10-phase-d-modifiers-effects-design.md`.
- 후속 plan → `docs/superpowers/plans/2026-05-10-phase-d-modifiers-effects-plan.md`
  (writing-plans skill 로 생성).

## 15. 다음 phase 와의 인터페이스

- **Phase G (Asc Tree)** — modifier 의 일부가 Asc Tree 노드로 강화 가능 (예:
  "공격 modifier magnitude +20%" 노드). 본 phase 의 `getModifierMagnitude`
  함수가 Asc Tree multiplier 도 받을 수 있도록 hook 명시 (현재는 1.0).
- **Phase E (유물 + Mythic)** — mythic 등급 장비 풍부화 시 본 phase 의
  modifier slot 4 활용. 유물 효과 일부도 effect-pipeline 사용 (예: 시간의
  모래시계 = cc 효과 trigger). effect-pipeline 자체가 유물의 backbone.
