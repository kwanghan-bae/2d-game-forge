# 2026-05-15 — Phase E (유물 + Mythic + 광고 stub) Design Spec

## 한 줄 요약

inflation-rpg 의 7층 메타 케이크 최상층 (유물) 의 첫 wave 를 구현한다. 누적
유물 10종 + Mythic 유물 30종 + 광고 stub 까지. 차원 나침반 (Compass §7.3)
과 IAP / 광고 SDK 실연결은 후속 phase.

## 배경

부모 spec: [`docs/superpowers/specs/2026-05-01-content-300h-design.md`](2026-05-01-content-300h-design.md)
§7 (유물 시스템) + §6.1 (Mythic 슬롯 해금) + §11.4 (페이싱).

선행 phase 누적:
- Phase 1 (균형) — pure resolver + balance-sim/sweep + balance-milestones 회귀 가드.
- Phase D (수식어 + effect-pipeline) — 6 effect type, modifier slot 4 (mythic),
  `adsWatched: 0` placeholder, `effects.ts` proc/trigger.
- Phase F-1 — Asc Tier MVP (×(1 + 0.1·N) multiplier).
- Phase F-2/3 — EquipmentInstance 강화 + 직업소.
- Phase G — Asc Tree (10 노드 영구 효과) + `calcFinalStat` 8th param `ascTreeMult` +
  `applyDropMult` (economy.ts) + `applyExpGain` 5th param + sim parity.

본 phase 가 plug-in 할 hook 들이 이미 존재 — Phase E 는 mostly **데이터 +
신규 hook 호출 + UI 화면 1개** 의 데이터-heavy phase.

## 1. Scope (Phase E 결정)

브레인스토밍 5 Q&A 결과:

| | 결정 |
|---|---|
| Scope | §7.1 (누적 10) + §7.2 (Mythic 30) + 광고 stub. Compass §7.3 / IAP §7.4 / 광고 SDK 실연결은 **후속 phase**. |
| 광고 stub | cooldown 8초 + 일일 cap 30회. 자정 reset (client local). |
| Mythic 카탈로그 | 30개 + 6 effect type 분류 (flat_mult / cooldown_mult / drop_mult / xp_mult / proc / passive). |
| 슬롯 해금 | Tier 1 → 1 slot, Tier 5 → 3 slot, Tier 10 → 5 slot (spec §6.1). |
| 드랍 트리거 | Milestone 5 보장 (Tier 1/5/10/15/20) + Random drop 25 (final boss 재처치, 미보유 풀 weighted, base 30%). |
| Effect 적용 architecture | 타입별 분산 hook (A 모델) — 기존 Phase G 의 multiplier-param 패턴 답습. |

### 1.1 명시적 scope-out

- **Compass (§7.3)** — 차원 나침반 40종. 던전 랜덤 추첨 모드 (spec §2.4) 의
  prereq. 후속 phase.
- **IAP (§7.4)** — Capacitor IAP plugin / 패키지 (₩1,100 / ₩5,500 / ₩11,000).
  후속 phase.
- **광고 SDK 실연결** — AdMob / Unity Ads / Capacitor ad plugin. Phase E 는
  stub 만 (8초 sim cooldown).
- **Dungeon 다양화** — spec §2.2 의 20 dungeon × dungeon-specific final boss.
  Phase E 의 mythic random drop 은 현재 final-boss 1종 기반.
- **효과 곡선 tune** — 30 mythic 의 numeric value 는 spec 예시값 기반 first
  pass. balance-sweep 결과 + spec §11 곡선 검증은 후속.
- **튜토리얼 통합** — 신규 Relics 화면 step 추가는 후속 작업.

## 2. 데이터 모델 + persist v11

### 2.1 MetaState 확장 (`src/types.ts`)

```typescript
// 누적 유물
relicStacks: Record<RelicId, number>;       // 10 id → stack count. 기본 0

// Mythic
mythicOwned: MythicId[];                    // 보유 mythic id 리스트
mythicEquipped: (MythicId | null)[];        // 길이 5. index = slot 번호. null = 비어있음
mythicSlotCap: number;                      // 0~5. ascTier 진행에 따라 1/3/5 로 grow

// 광고
// adsWatched 는 이미 v9 에 있음 (Phase D placeholder, mutation 만 추가)
adsToday: number;                           // 일일 시청 카운터
adsLastResetTs: number;                     // 마지막 일일 reset epoch (client local midnight)
```

### 2.2 RelicId / MythicId 타입

```typescript
export type RelicId =
  | 'warrior_banner' | 'dokkaebi_charm' | 'gold_coin' | 'soul_pearl'
  | 'sands_of_time'  | 'fate_dice'      | 'moonlight_amulet' | 'eagle_arrow'
  | 'undead_coin'    | 'feather_of_fate';

export type MythicId = string;  // 30 id. 카탈로그는 §3.2.
export type MythicEffectType =
  | 'flat_mult' | 'cooldown_mult' | 'drop_mult' | 'xp_mult' | 'proc' | 'passive';
```

### 2.3 Persist v11 migration

`STORE_VERSION` = 10 → **11**.

```typescript
if (fromVersion <= 10 && s.meta) {
  s.meta.relicStacks      ??= EMPTY_RELIC_STACKS;             // 10 id → 0
  s.meta.mythicOwned      ??= [];
  s.meta.mythicEquipped   ??= [null, null, null, null, null];
  s.meta.mythicSlotCap    ??= computeMythicSlotCap(s.meta.ascTier ?? 0);
  s.meta.adsToday         ??= 0;
  s.meta.adsLastResetTs   ??= Date.now();
}
```

기존 v8 → v9 → v10 chain 은 그대로 — v10 migrate block 의 early-return 금지
(Phase G 의 critical fix 패턴 답습).

### 2.4 Asc reset 정책 (`ascend()`)

신규 필드 **전부 보존**. spec §1 의 메타 케이크 7층 "유물 — 보존" 정합.
`ascend()` 의 reset 목록에 추가하지 않으면 자동 보존됨.

특히 `mythicSlotCap` 은 `ascend()` 후 `computeMythicSlotCap(newTier)` 로
재계산 (보존이 아니라 update — newTier 증가 시 cap ↑).

### 2.5 `computeMythicSlotCap(tier)`

```typescript
function computeMythicSlotCap(tier: number): number {
  if (tier >= 10) return 5;
  if (tier >= 5) return 3;
  if (tier >= 1) return 1;
  return 0;
}
```

호출 지점:
- `bossDrop` 분기 — 첫 final 처치 → ascTier += 1 → cap 재계산.
- `ascend()` — cap 재계산.
- `migrateV10ToV11` — 마이그 시 cap 계산.

## 3. 카탈로그

### 3.1 §7.1 누적 유물 — 10종 (`src/data/relics.ts`)

| id | 효과 | type | per-stack | cap |
|---|---|---|---|---|
| `warrior_banner` | BP 최대 +1 | passive (BP_max) | +1 | ∞ |
| `dokkaebi_charm` | BP 무소모 +0.1% | passive (BP_free_chance) | +0.1% | 500 stacks (= 50%) |
| `gold_coin` | 골드 +1% | drop_mult (gold) | +1% | ∞ |
| `soul_pearl` | 캐릭터 XP +1% | xp_mult | +1% | ∞ |
| `sands_of_time` | DR 드랍 +1% | drop_mult (dr) | +1% | ∞ |
| `fate_dice` | LUC +1% | flat_mult (luc) | +1% | 100 stacks (= 100%) |
| `moonlight_amulet` | 모든 stat +0.5% | flat_mult (all) | +0.5% | 400 stacks (= 200%) |
| `eagle_arrow` | 크리율 +0.05% | flat_mult (critRate) | +0.05% | 500 stacks (= 25%) |
| `undead_coin` | 사망 시 손실 무효 | passive (no_death_loss) | binary | 1 stack |
| `feather_of_fate` | 첫 사망 1회 부활 (런당) | passive (revive) | +1 revive/run | 5 stacks |

Cap 모델:
- `∞`: stack 무한 누적.
- `N stacks (= P%)`: stack 가 N 도달 후 광고 시청해도 stack 안 증가. UI 가 "MAX" 표시.
- `binary`: stack 1 만 의미. 1 도달 후 광고 시청해도 stack 안 증가.

### 3.2 §7.2 Mythic 유물 — 30종 (`src/data/mythics.ts`)

5 milestone 보장 + 25 random drop. Spec §7.2 의 sample 8 + 보강 22.

| # | id | 이름 | effect type | value | acquisition |
|---|---|---|---|---|---|
| 1 | `tier1_charm` | 초월자의 부적 | flat_mult atk | +50% | milestone Tier 1 |
| 2 | `tier5_seal` | 초월자의 인장 | flat_mult hp | +50% | milestone Tier 5 |
| 3 | `infinity_seal` | 무한 인장 | drop_mult all_kinds | ×2 (multiplicative) | milestone Tier 10 (spec §6.1) |
| 4 | `dimension_navigator` | 차원 항해사 | drop_mult dungeon_currency | ×3 | milestone Tier 15 (spec §7.2) |
| 5 | `light_of_truth` | 진리의 빛 | flat_mult modifier_magnitude | +25% | milestone Tier 20 (spec §7.2) |
| 6 | `fire_throne` | 화염 왕좌 | flat_mult fire_dmg | +50% | random drop |
| 7 | `time_hourglass` | 시간 모래시계 | cooldown_mult | -30% | random drop |
| 8 | `millennium_promise` | 천 년 약속 | flat_mult hp | +100% | random drop |
| 9 | `soul_truth` | 영혼 진리 | xp_mult | ×3 | random drop |
| 10 | `fate_scales` | 운명 저울 | flat_mult critDmg | ×2 | random drop |
| 11 | `frost_crown` | 서리 왕관 | flat_mult ice_dmg | +50% | random drop |
| 12 | `thunder_diadem` | 천둥의 관 | flat_mult thunder_dmg | +50% | random drop |
| 13 | `divine_halo` | 신성의 후광 | flat_mult holy_dmg | +50% | random drop |
| 14 | `phantom_cloak` | 환영의 망토 | flat_mult evasion | +25% | random drop |
| 15 | `iron_aegis` | 강철 방패 | flat_mult def | +100% | random drop |
| 16 | `serpent_fang` | 뱀의 송곳니 | proc lifesteal | 20% | random drop |
| 17 | `gluttony_chalice` | 탐욕의 성배 | proc sp_steal | 30% | random drop |
| 18 | `thorned_skin` | 가시 갑옷 | proc thorns | 50% reflect | random drop |
| 19 | `swift_winds` | 신속의 바람 | cooldown_mult base | -20% | random drop |
| 20 | `eternal_flame` | 영원의 불꽃 | flat_mult atk | +75% | random drop |
| 21 | `void_pact` | 공허 계약 | flat_mult all | +20% | random drop |
| 22 | `dragon_heart` | 용의 심장 | flat_mult hp | +75% | random drop |
| 23 | `phoenix_feather` | 불사조 깃털 | passive revive_run | 1회/런 | random drop |
| 24 | `lucky_clover` | 행운의 클로버 | flat_mult luc | +100% | random drop |
| 25 | `merchant_seal` | 상인의 인장 | drop_mult gold | +100% | random drop |
| 26 | `scholar_eye` | 학자의 눈 | xp_mult | ×2 | random drop |
| 27 | `assassin_dagger` | 암살자 단검 | flat_mult critRate | +25% | random drop |
| 28 | `berserker_axe` | 광전사 도끼 | flat_mult atk | +75% | random drop |
| 29 | `crystal_orb` | 수정 구슬 | proc magic_burst | 15% | random drop |
| 30 | `world_tree_root` | 세계수 뿌리 | flat_mult hp_regen | +200% | random drop |

(보강 22개 의 정확한 numeric value 는 first pass — balance-sweep 후 tune.)

### 3.3 6 effect type 의미

| type | 의미 | 합산 방식 |
|---|---|---|
| `flat_mult` | 특정 stat / 데미지 type / 메타 진행에 % 보너스 | `Π (1 + bonus)` per target |
| `cooldown_mult` | 스킬 cooldown 감소 | `Π (1 - reduction)`, floor 0.4 (기존 `skillCooldownMul` 의 0.4 cap 답습) |
| `drop_mult` | 골드 / DR / 던전 화폐 drop ratio | `Σ` flat bonus (additive, %) |
| `xp_mult` | 캐릭터 XP 배수 | `Π (1 + bonus)` |
| `proc` | event-driven trigger (받은 데미지 / 공격 시) | effects.ts evaluateTriggers 등록 |
| `passive` | 특수 분기 (사망 무효 / 부활 / BP_max) | hook 별 가드 |

## 4. Effect 적용 — 분산 hook 모델

### 4.1 Aggregator 함수

`src/systems/mythics.ts`:

```typescript
export function getMythicFlatMult(meta: MetaState, target: FlatMultTarget): number  // ×Π
export function getMythicCooldownMult(meta: MetaState, kind: SkillKind): number     // ×Π floor 0.4
export function getMythicDropBonus(meta: MetaState, kind: DropKind): number         // +Σ
export function getMythicXpMult(meta: MetaState): number                            // ×Π
export function getMythicProcs(meta: MetaState): MythicProc[]                       // BattleScene 시작 시 trigger 등록용
export function hasMythicPassive(meta: MetaState, kind: PassiveKind): boolean       // BP_max 등 binary 검사
```

`src/systems/relics.ts`:

```typescript
export function getRelicFlatMult(meta: MetaState, target: FlatMultTarget): number
export function getRelicDropBonus(meta: MetaState, kind: DropKind): number
export function getRelicXpMult(meta: MetaState): number
export function getRelicBpMax(meta: MetaState): number                              // warrior_banner stack
export function getRelicBpFreeChance(meta: MetaState): number                       // dokkaebi_charm capped 50%
export function relicNoDeathLoss(meta: MetaState): boolean                          // undead_coin
export function relicReviveCount(meta: MetaState): number                           // feather_of_fate stack (per-run)
```

Mythic 의 경우 `mythicEquipped` 의 non-null 만 active. `mythicOwned` 는 컬렉션
표시 / drop 풀 제외용. Relic 은 stack 자체가 효과 (cap 까지).

### 4.2 6 hook callsite 수정

#### 4.2.1 `calcFinalStat` — 9th param `metaMult`

`src/systems/stats.ts`:

```typescript
export function calcFinalStat(
  stat: StatKey,
  baseValue: number,
  charMult: number,
  equip: number,
  baseAbility: number,
  charLevelMult: number,
  ascTierMult: number,
  ascTreeMult: number,
  metaMult: number,        // ← 신규 9th param
): number
```

`metaMult` = `getMythicFlatMult(meta, statTarget) × getRelicFlatMult(meta, statTarget)`.

Callsite 7곳 (BattleScene + Inventory + ...) 에 `meta` 인자 전달.

#### 4.2.2 Cooldown — `buildActiveSkills` wrap

`src/systems/buildActiveSkills.ts`:

```typescript
// 기존
cooldownSec: s.cooldownSec * skillCooldownMul('base', lv)
// 신규
cooldownSec: s.cooldownSec * skillCooldownMul('base', lv) * getMythicCooldownMult(meta, 'base')
```

`skillCooldownMul` 자체는 pure 로 유지 (lv 기반). Mythic mult 는 wrap 단계.
Floor 0.4 동일 유지 (각 단계에서 max(0.4, ...) 보장).

#### 4.2.3 `applyDropMult` — `meta` 추가 source

`src/systems/economy.ts` (Phase G 신설). 현재 signature 에 `meta` 추가:

```typescript
export function applyDropMult(
  base: number,
  kind: DropKind,
  ascTree: AscTree,
  meta: MetaState,        // ← 신규 (mythic + relic bonus aggregate)
): number
```

내부에서 `getMythicDropBonus(meta, kind) + getRelicDropBonus(meta, kind)` 합산.

#### 4.2.4 `applyExpGain` — 6th param `metaXpMult`

`src/store/gameStore.ts`:

```typescript
applyExpGain(
  baseExp: number,
  charLevel: number,
  ascTier: number,
  ascTreeSp: number,
  bonusSpPerLevel: number,    // 5th (Phase G)
  metaXpMult: number,          // ← 신규 6th
)
```

`metaXpMult` = `getMythicXpMult(meta) × getRelicXpMult(meta)`.

#### 4.2.5 `effects.ts` proc trigger

`src/systems/effects.ts` 의 trigger 시스템을 mythic-sourced proc 도 받게 확장:

- BattleScene 시작 시 `getMythicProcs(meta)` 호출 → 각 proc 의 trigger condition
  (`on_player_hit_received` / `on_player_attack`) 를 `evaluateTriggers` 에 등록.
- 기존 modifier-sourced trigger 와 동일 path. trigger 종류:
  - `on_player_hit_received` — lifesteal / thorns / evasion(특수).
  - `on_player_attack` — magic_burst / sp_steal.

Mythic proc 은 영구 (BattleScene 동안) — Phase D 의 N초 expiry 모델과 다른
"permanent trigger" 분기 추가. `addEffect` 의 `durationSec: Infinity` 또는
신규 `addPermanentTrigger` API.

#### 4.2.6 Passive — BattleScene/store 특수 분기

- `warrior_banner` (BP_max) → `startRun` 시 `bp = baseBp + ascTreeBp + getRelicBpMax(meta)`.
- `dokkaebi_charm` (BP_free_chance) → `payBpCost` 시 `rng() < getRelicBpFreeChance(meta)` 이면 cost = 0.
- `undead_coin` (no_death_loss) → `playerDie` / `bossDrop` 분기에서 `relicNoDeathLoss(meta)` 이면 inventory/DR 손실 skip.
- `feather_of_fate` + `phoenix_feather` (revive_run) → `startRun` 시 `run.featherUsed = 0`. 사망 시 `featherUsed < relicReviveCount(meta) + mythicReviveCount(meta)` 이면 부활 (HP 50% 복구), `featherUsed++`.
- `infinity_seal` (all_meta ×2) → meta 진행 (BP / SP / DR / 골드 등) 의 모든 source 에 곱연산. **구현 단순화 위해 first pass 는 `applyDropMult` 한정 적용** (gold/dr/dungeon_currency 모든 종 ×2 누적). spec §11.4 의 "무한 인장" 컨셉 부합.
- `light_of_truth` (all_effects +25%) → `getModifierMagnitude` 의 마그니튜드에 ×1.25 (Phase G 의 `mod_magnitude` 와 동일 path). first pass 는 modifier magnitude 만 — 다른 effect-pipeline 은 후속.

### 4.3 BattleScene 사망 분기 통합

```typescript
function playerDie() {
  if (relicNoDeathLoss(meta)) {
    // 손실 skip (DR / inventory 보존)
    if (run.featherUsed < totalReviveCount(meta)) {
      hp = maxHp * 0.5;
      run.featherUsed++;
      return; // 부활
    }
    // 부활 횟수 소진 → 사망 진행 (단 손실 무효)
  }
  // 일반 사망 처리
}
```

## 5. 광고 stub 시스템 (`src/systems/ads.ts`)

### 5.1 상수 + 데이터

```typescript
const AD_COOLDOWN_MS = 8_000;             // 8초 sim
const AD_DAILY_CAP = 30;                  // 일일 한도
```

### 5.2 API

```typescript
canWatchAd(meta: MetaState, nowTs: number): { ok: boolean; reason?: 'cap' | 'cooldown' }
startAdWatch(meta: MetaState, nowTs: number): { adRunId: string; endsAt: number }
finishAdWatch(meta: MetaState, adRunId: string, relicId: RelicId, nowTs: number):
  { ok: boolean; relicId: RelicId; capReached: boolean }
checkDailyReset(meta: MetaState, nowTs: number): MetaState
```

### 5.3 흐름

1. UI "광고 보기" 버튼 누름 → `canWatchAd(meta, now)` 검사.
2. ok 이면 모달 열림 ("광고 시청 중… 8초"). `startAdWatch` 호출 → `adRunId` 발급.
3. `endsAt` 도달 시 (UI 의 `setTimeout` / `useEffect`) `finishAdWatch(adRunId, relicId)` 자동 호출.
4. `finishAdWatch`: `adsWatched++`, `adsToday++`, `relicStacks[relicId]++` (cap 검사 후 — cap 도달 relic 은 stack ↑ 안 됨).
5. 일일 cap 도달 시 다음 광고 거부 (`canWatchAd` returns `{ ok: false, reason: 'cap' }`).
6. 자정 (client local) 넘기면 `checkDailyReset` 가 `adsToday = 0, adsLastResetTs = now` 으로 리셋. `canWatchAd` / `finishAdWatch` 양쪽에서 lazy 호출.

### 5.4 상태 저장

- `adRunId` + `endsAt` 은 UI 컴포넌트 로컬 (persist 안 함). 시청 도중 새로고침 시 그 광고는 무효 — 재시작.
- `adsWatched` / `adsToday` / `adsLastResetTs` 만 persist.

### 5.5 일일 reset 의 timezone 정책

Client local midnight 기반. `nowTs.getDate() !== adsLastResetTs.getDate()` 또는
`startOfDay(nowTs) > adsLastResetTs` 면 reset.

UTC 가 아닌 local — player 가 timezone 변경하면 jitter 가능하나 abuse 영향
미미 (일일 cap 30 = +30 stack 의 한 번 더). 후속 phase 에서 server-side 인증
도입 시 개선.

## 6. UI

### 6.1 신규 화면 `Relics.tsx`

`src/screens/Relics.tsx` — Ascension.tsx 의 tab 패턴 차용.

```
┌─[보물고]──────────────────┐
│ [스택 유물]  [Mythic]      │   ← 2 tab (Compass 는 후속 phase 에서 추가)
├──────────────────────────┤
│  (active tab content)    │
└──────────────────────────┘
```

#### 6.1.1 스택 유물 tab

10 relic row. 각 row:

```
┌──────────────────────────┐
│ ⚔️ 전사의 깃발            │
│ BP 최대 +1 / stack       │
│ 현재: 47 stacks (∞)      │
│ [광고 보기] ← 8s cooldown│
└──────────────────────────┘
```

상단에 "광고 시청 (오늘 12/30)" 카운터.

각 row 의 "광고 보기" 버튼 = 해당 relic 한정 광고 시청. cooldown 중 / cap 도달 /
일일 cap 도달 시 disable + reason 텍스트.

#### 6.1.2 Mythic tab

```
┌─ 슬롯 (Tier 8 → 3 slot) ─┐
│ [🔥 화염왕좌]  [💎 fate_scales]  [⏱ time_hourglass]  [🔒]  [🔒]  │
└────────────────────────────┘

┌─ 보유 (12/30) ─────────────┐
│ [장착] 환영의망토  [장착] 가시갑옷  [장착] 영원의불꽃  ...        │
└────────────────────────────┘
```

- 슬롯 grid: index 0..mythicSlotCap-1 활성, index cap..4 = 🔒 + "Tier N 해금".
- 보유 풀: 30 mythic 중 보유한 것만 표시. 미보유는 silhouette + "???".
- 슬롯 클릭 → 보유 풀에서 pick (modal). 이미 장착된 mythic 은 disable.
- 보유 카드 클릭 → 빈 slot 자동 장착 / 빈 slot 없으면 swap modal.

### 6.2 광고 시청 모달

```
┌─ 광고 시청 중 ──────┐
│   [progress bar]    │
│   ▓▓▓▓▓░░░░░ 5/8s   │
│  광고 시청을 통해   │
│  ⚔️ 전사의 깃발     │
│  +1 stack 획득 중   │
└─────────────────────┘
```

8초 progress bar. "스킵 불가" 안내. 종료 시 자동 dismiss + relic +1 stack toast.

### 6.3 마을 진입점

`MainMenu.tsx` 또는 `Town.tsx` 에 "보물고" 버튼 추가. (위치 details 는
implementation 단계에서 결정.)

### 6.4 효과 표시

Inventory detail 패턴 차용: 장착 mythic + 활성 stackable relic 의 효과 텍스트가
character 상세 또는 Relics 화면에 "현재 활성 효과" 패널로 합쳐 표시.
(First pass — 별 화면 추가 없이 Relics 화면 하단 panel 로 충분.)

## 7. Mythic 획득 + 슬롯 시스템

### 7.1 Milestone award (5 보장)

`bossDrop` 또는 `ascend()` 에서 ascTier 가 1/5/10/15/20 으로 transition 할 때
`awardMilestoneMythic(tier)` 호출.

```typescript
const MILESTONE_MYTHICS: Record<number, MythicId> = {
  1: 'tier1_charm',
  5: 'tier5_seal',
  10: 'infinity_seal',
  15: 'dimension_navigator',
  20: 'light_of_truth',
};

function awardMilestoneMythic(meta: MetaState, tier: number): MetaState {
  const id = MILESTONE_MYTHICS[tier];
  if (!id) return meta;
  if (meta.mythicOwned.includes(id)) return meta;  // 중복 방지
  return { ...meta, mythicOwned: [...meta.mythicOwned, id] };
}
```

이미 보유 검사로 중복 award 방지 (별도 `mythicMilestonesAwarded` 필드 불필요).

### 7.2 Random drop (25)

`bossDrop` 에서 `bossType === 'final'` 이면 굴림.

```typescript
const BASE_DROP_CHANCE = 0.30;

function rollMythicDrop(meta: MetaState, rng: () => number): MythicId | null {
  if (rng() >= BASE_DROP_CHANCE) return null;

  const pool = ALL_MYTHIC_IDS
    .filter(id => MYTHIC_DEFS[id].acquisition === 'random_drop')
    .filter(id => !meta.mythicOwned.includes(id));
  if (pool.length === 0) return null;  // 25 모두 보유 → no drop

  // first pass: 균등 가중 (1.0). 후속에서 weight tune.
  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}
```

획득 시 `meta.mythicOwned.push(id)` + toast + Relics 화면 알림 dot.

미보유 풀 필터로 중복 0 보장. 모두 보유 시 final 처치 보상은 기존 (crackStones, BP) 그대로.

### 7.3 장착 시스템

`src/systems/mythics.ts`:

```typescript
equipMythic(meta: MetaState, slotIndex: number, mythicId: MythicId): MetaState
unequipMythic(meta: MetaState, slotIndex: number): MetaState
swapMythic(meta: MetaState, slotIndex: number, newMythicId: MythicId): MetaState
```

검증:
- `slotIndex < meta.mythicSlotCap`
- `meta.mythicOwned.includes(mythicId)`
- 같은 mythic 두 slot 동시 장착 불가 (`mythicEquipped.includes(mythicId)` 검사 후 reject 또는 swap)

## 8. Sim parity (`tools/balance-sim.ts`)

Phase G 와 동일 패턴 — SimPlayer 확장 + aggregator 호출.

```typescript
interface SimPlayer {
  // 기존 필드 ...
  mythicEquipped?: (MythicId | null)[];
  mythicOwned?: MythicId[];        // 풀 필터 정확성용
  relicStacks?: Partial<Record<RelicId, number>>;
}
```

`simulateFloor` 의 atk/hp 계산이 `metaMult` 적용:
- BattleScene 과 share 하는 aggregator (`getMythicFlatMult`, `getRelicFlatMult`) 동일 호출.
- `applyDropMult` sim source 에도 meta 인자 thread.
- `processIncomingDamage` proc trigger sim 측에도 등록.

`balance-milestones.test.ts` (Phase 1 회귀 가드) 의 baseline = mythic [] / relic {}
— 신 default 가 mythic [] / relic 0 이므로 기존 곡선 0 drift.

`balance-sweep` CLI 에 `--mythic=id1,id2,...` / `--relic=id:stack,id:stack,...`
preset flag 추가 (선택 — first pass 는 default off 만 검증).

## 9. Test plan

### 9.1 Vitest 신규/수정

- `relics.test.ts` (신규) — 10 relic aggregator + cap 검사 + Asc reset 보존. ~15 test.
- `mythics.test.ts` (신규) — 30 카탈로그 load / 6 effect type aggregator / drop roll 미보유 풀 / milestone unlock / slotCap / equip/unequip/swap. ~25 test.
- `ads.test.ts` (신규) — `canWatchAd` (cooldown / cap), `startAdWatch` → `finishAdWatch` happy path, 자정 reset, cap 도달 relic stack 안 됨. ~10 test.
- `gameStore.test.ts` (수정) — v10 → v11 migration, `bossDrop` mythic drop / milestone, `ascend` 신 필드 보존, slotCap 재계산. ~10 새 test.
- `stats.test.ts` (수정) — 9th param `metaMult` 합산. ~3 새 test.
- `effects.test.ts` (수정) — mythic proc trigger (lifesteal, thorns). ~3 새 test.
- `economy.test.ts` (수정) — drop_mult mythic + relic 합산. ~3 새 test.
- `buildActiveSkills.test.ts` (수정) — cooldown mythic wrap, floor 0.4. ~2 새 test.

목표: vitest 498 → ~570 (+72).

### 9.2 E2E (`e2e/`)

- `relics.spec.ts` (신규) — Relics 화면 진입, 광고 시청 → relic stack +1 → 모달 동작 → cap 도달 시 UI disable.
- `mythic.spec.ts` (신규) — final boss 처치 → mythic 보유 → 장착 → BattleScene 에서 effect 적용 (e.g., atk +50% 가 데미지에 반영).
- `v8-migration.spec.ts` (수정) — chain 이 v11 까지 진행 + 신 필드 default 확인 1줄.

목표: e2e 24 → 27 (+3).

### 9.3 Balance 회귀 가드

`balance-milestones.test.ts` baseline = mythic [] / relic 0 으로 동일 milestone 6/6 통과. mythic-off 일 때 곡선 0 drift 검증.

## 10. Definition of done

(i) typecheck / lint / circular = 0
(ii) vitest 모든 신규 + 기존 통과 / e2e 27 통과
(iii) 광고 시청 stub → relic stack +1 + cap 도달 차단 (E2E 검증)
(iv) Final boss 처치 → mythic random drop 또는 milestone award → 장착 → BattleScene effect 적용 (E2E 검증)
(v) `balance-milestones.test.ts` 회귀 0 (mythic-off baseline 동일)
(vi) v10 → v11 migration unit + E2E v8-chain 통과
(vii) Asc reset 후 mythic / relic 데이터 보존 + slotCap 재계산 (unit + E2E)

## 11. 알려진 한계 / 후속 phase migration notes

### 11.1 Phase E 안에서 수용

- **Mythic numeric value first pass** — 30 mythic 의 정확한 곡선 tune 은 후속.
  balance-sweep 결과 + spec §11 검증 별도 작업.
- **`infinity_seal` first pass 적용 범위 제한** — "all_meta ×2" 를 first pass
  는 `applyDropMult` 한정 (gold/dr/dungeon_currency 모든 종 ×2 누적). 다른 메타
  진행 source (XP 등) 적용은 후속.
- **`light_of_truth` first pass 적용 범위 제한** — "all_effects +25%" 를 first
  pass 는 `getModifierMagnitude` 한정. 다른 effect 종류 (proc 강화 등) 는 후속.

### 11.2 후속 phase 의 prereq

- **Compass §7.3** — 던전 랜덤 추첨 모드 (spec §2.4) 가 prereq. 별도 phase.
  Phase E 의 Relics.tsx 는 Compass tab 자리 남김 (현재는 2 tab, 추후 3 tab 확장).
- **IAP §7.4** — Capacitor IAP plugin 통합. ₩1,100 / ₩5,500 / ₩11,000 패키지
  각각의 효과 정의는 spec §7.4 그대로 차용.
- **광고 SDK 실연결** — AdMob / Unity Ads / Capacitor plugin. Phase E 의 stub
  API (`startAdWatch` / `finishAdWatch`) 가 그대로 plug-in point — 실 SDK 가
  `endsAt` callback 을 발화하면 동일 path. UI 도 동일.
- **Dungeon 다양화** — spec §2.2 의 20 dungeon × dungeon-specific final boss.
  Mythic random drop 의 weight 모델을 dungeon 별 시그니처로 transition 시
  본 phase 의 `MYTHIC_DEFS[id].acquisition` 필드를 `'random_drop' | { dungeon: DungeonId }`
  로 확장하면 자연스러운 incremental migration.
- **튜토리얼 step 추가** — 신 Relics 화면 진입을 step 8+ 에 추가.

## 12. 진행 절차

- spec 합의 후 [`writing-plans`](../plans/) skill 로 detailed plan 작성.
- Plan = 25-30 task 단위 (Phase G 의 17 task 보다 large — 데이터 30 mythic +
  6 hook callsite + UI 화면 1개 + sim parity + 광고 stub + e2e 3 + migration).
- subagent-driven-development chain (implementer + spec/code review per task)
  로 dispatch.
- Cp 7-8개 (Phase G 의 6 cp 보다 약간 큼) 예상.
- Merge `--no-ff` to main + tag `phase-e-cp1..N` + `phase-e-complete`.
