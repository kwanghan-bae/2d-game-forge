# 2026-05-06 — Phase F-2+3 Design Spec (Enhance + Skill Progression, inflation-rpg)

## 한 줄 요약

300h spec §4·§5 를 **단일 mega-phase** 로 구현. 골자는:

1. **Equipment Instance refactor** — catalog/instance 분리, instance 별 `enhanceLv`,
   6 등급 강화 곡선 + 무한 lv + Inventory 내 강화 UI.
2. **Skill Progression** — 캐릭터당 6 levelable skill (base 2 + ULT 4), JP 무한
   sink. Skill lv ↑ → DMG mult ↑, ULT 만 cooldown ↓. ULT 슬롯 게이트 = 누적 skill
   lv 50/200/500/1500.
3. **JP system** — 보스 처치마다 (first-kill ×2 보너스 + 반복 drip), 평생 획득
   cap, **광고 시청으로 cap +50 영구 확장**.
4. **13 비핵심 캐릭터** — ClassSelect 에서 hard-gate (🔒).
5. **persist v8 migration** 1회.

본 spec 은 300h spec §4 의 "300 노드 트리" 모델을 **폐기하고** "스킬 무한 lv +
ULT 슬롯" 모델로 대체한다 (브레인스토밍 Q8~Q14 결정 결과).

## 배경

- 현재 phase: `phase-f1-complete`. F-1 = Ascension MVP + 균열석. ascTier 진입 가능
  (`(1 + 0.1·N)` 멀티플라이어 wired).
- 메타 케이크 (300h spec §1) 의 4 (Job Tree) 와 5 (강화) 동시 도입 — 둘 다 Asc reset
  보존되는 영구 메타.
- 스킬 카탈로그 = 캐릭터당 base active 2개, ULT 4개 (기존 `activeSkills: [Skill, Skill]` 위에
  ULT 4개 신설).

## 결정 매트릭스 (clarifying questions)

| Q | 결정 | 비고 |
|---|---|---|
| Q1 — F-2/F-3 분리 vs Full | **Full** — 두 시스템 한 phase |
| Q2 — Equipment 모델 | **Instance refactor** | catalog/instance 분리 |
| Q3 — JP 의미론 (1차) | (revised by Q8) | 처음엔 "글로벌 first-only"; Q8 에서 폐기 |
| Q4 — 13 비핵심 캐릭터 | **Hard gate** | ClassSelect 🔒 |
| Q5 — ULT activation (1차) | (revised by Q8~Q14) | "all simultaneous" 정신 유지 |
| Q6 — UI | **Enhance = Inventory 임베드, Skill Progression = 신규 화면** |
| Q7 — sequencing | **Single mega-plan** + 5 checkpoint |
| Q8 — JP 무한화 | **first-kill 보너스 + 반복 drip + 평생 cap + 광고로 cap 확장** |
| Q9 — 스킬 lv 단위 | **B — 스킬당 lv** (캐릭터당 6 skill 각자 lv) |
| Q10 — JP cap 의미 | **평생 획득 누적 cap** (사용 여부 무관) |
| Q11 — ULT 슬롯 게이트 | **A — 누적 skill lv 합** (50/200/500/1500) |
| Q12 — Skill lv 효과 곡선 | **C — 단순 선형, base ×0.05/lv, ULT ×0.15/lv, CD 만 ULT 감소** |
| Q13 — ULT 슬롯 swap | **B — Free swap** (비용 ✗) |
| Q14 — JP cap 초기값 + 광고 | **B — cap 50 시작, 광고 1회 +50** |

## 1. Equipment Instance Model

### 1.1 타입 변경

```ts
// 현재 (v7)
export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  stats: EquipmentStats;
  dropAreaIds: string[];
  price: number;
}
inventory: { weapons: Equipment[], armors: Equipment[], accessories: Equipment[] }
equippedItemIds: string[]   // 현재 의미: catalog id

// v8 후
export interface EquipmentBase {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  baseStats: EquipmentStats;
  dropAreaIds: string[];
  price: number;
}
export interface EquipmentInstance {
  instanceId: string;          // crypto.randomUUID()
  baseId: string;              // catalog id 참조
  enhanceLv: number;           // 0 시작, 무한
}
inventory: {
  weapons: EquipmentInstance[],
  armors: EquipmentInstance[],
  accessories: EquipmentInstance[]
}
equippedItemIds: string[]      // ← 의미 변경: instanceId
```

`Equipment` 타입은 **삭제** (혼동 방지). 검색 헬퍼 `getEquipmentBase(baseId)`.

### 1.2 stat 계산 헬퍼

```ts
// src/systems/enhance.ts
export function enhanceMultiplier(rarity: EquipmentRarity, lv: number): number {
  const perLv = {
    common: 0.05, uncommon: 0.07, rare: 0.10,
    epic: 0.15, legendary: 0.22, mythic: 0.32,
  } as const;
  return 1 + perLv[rarity] * lv;
}

export function getInstanceStats(inst: EquipmentInstance): EquipmentStats {
  const base = getEquipmentBase(inst.baseId);
  if (!base) return {};
  const m = enhanceMultiplier(base.rarity, inst.enhanceLv);
  return {
    flat:    Object.fromEntries(Object.entries(base.baseStats.flat ?? {}).map(([k,v]) => [k, Math.floor(v * m)])),
    percent: Object.fromEntries(Object.entries(base.baseStats.percent ?? {}).map(([k,v]) => [k, Math.floor(v * m)])),
  };
}
```

### 1.3 Consumer 갱신 면

| 파일 | 변경 |
|---|---|
| `src/types.ts` | `Equipment` → `EquipmentBase` + `EquipmentInstance` |
| `src/data/equipment.ts` | `EQUIPMENT_CATALOG` → `EQUIPMENT_BASES` |
| `src/systems/equipment.ts` | `addToInventory`/`removeFromInventory` 가 instance 받음, `getInstanceStats` 신규 |
| `src/systems/calcFinalStat.ts` | equipped instance 의 stat 합산 |
| `src/store/gameStore.ts` | `addEquipment(EquipmentInstance)`, `equipItem(instanceId)`, `unequipItem(instanceId)`, `sellEquipment(instanceId, price)` |
| `src/screens/Inventory.tsx` | 카드 = instance 표시 (`name + (lv > 0 ? ` +${lv}` : '')`), 강화 UI 임베드 (§2) |
| `src/screens/Shop.tsx` | 구매 시 EquipmentInstance 생성하여 addEquipment |
| `src/screens/Battle.tsx` | drop 시 EquipmentInstance 생성 |
| `src/systems/quests.ts` (item-collect) | `trackItemCollect(baseId)` (catalog id 그대로) |
| `src/store/gameStore.ts` (Asc keepEquipped) | instance 단위 필터, equipped 보존 = enhanceLv 자동 보존 |
| `src/systems/crafting.ts` | 합성 결과물 = 새 instance, enhanceLv = 0 (§9) |

### 1.4 instanceId 생성

`crypto.randomUUID()`. Vitest jsdom 환경 + capacitor (iOS Safari 15.4+, Android
WebView Chrome 92+) 모두 지원.

## 2. Enhance 시스템

### 2.1 곡선 (300h spec §5.2 그대로)

| 등급 | mult/lv | rarityMult | lv 100 | lv 1000 |
|---|---|---|---|---|
| common    | 1+0.05N | 1.0 | ×6   | ×51  |
| uncommon  | 1+0.07N | 1.5 | ×8   | ×71  |
| rare      | 1+0.10N | 2.5 | ×11  | ×101 |
| epic      | 1+0.15N | 4   | ×16  | ×151 |
| legendary | 1+0.22N | 8   | ×23  | ×221 |
| mythic    | 1+0.32N | 16  | ×33  | ×321 |

### 2.2 비용 (300h spec §5.3)

```ts
export function enhanceCost(rarity: EquipmentRarity, currentLv: number) {
  const next = currentLv + 1;
  const rarityMult = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8, mythic: 16 }[rarity];
  return {
    stones: Math.ceil((next * next) / 5) * rarityMult,
    dr:     next * next * next * 100 * rarityMult,
  };
}
```

100% 성공, lv cap 없음.

### 2.3 store action

```ts
enhanceItem: (instanceId: string) => void
```

전제: 보유 instance + DR + stones 충분. 만족 시 `enhanceLv += 1`, 자원 차감.

### 2.4 UI — Inventory.tsx 임베드

각 instance 카드 (Q6=B):
```
┌─────────────────────────┐
│ 청룡도 +12  [rare]       │
│ ATK +320 (base 80, ×4)  │
│ 장착 / 해제              │
│ ▾ 강화 (열기)            │
└─────────────────────────┘
펼침:
┌─────────────────────────┐
│ → +13  ATK +330 (+10)   │
│ 비용: 강화석 39 / DR 22K │
│ [강화]                   │
└─────────────────────────┘
```

`+10 일괄` 은 stretch (본 phase 는 +1 만).

## 3. Skill Progression System

### 3.1 캐릭터당 6 levelable skill

핵심 캐릭터 (hwarang/mudang/choeui) 각자:
- **Base active 2개** — 기존 SkillSystem 의 `activeSkills: [Skill, Skill]`. 항상 발동.
- **ULT 4개** — 슬롯 게이트로 unlock, 슬롯 박은 후 발동.

ULT 명칭 (본 spec 확정):

| 캐릭터 | ULT 1 | ULT 2 | ULT 3 | ULT 4 |
|---|---|---|---|---|
| 화랑 ⚔️ | 일섬 | 천공무 | 진명 | 무영살 |
| 무당 🌸 | 흑주 | 천우 | 신탁 | 영혼소환 |
| 초의 🛡️ | 불괴 | 반격일도 | 광폭화 | 호국 |

각 ULT 의 effect type 매핑 (기존 `multi_hit | aoe | heal | buff | execute` 안에서):

| ULT | type | 임시 매핑 컨셉 |
|---|---|---|
| 일섬 | execute | 단일 처형 |
| 천공무 | multi_hit | 다단 관통 |
| 진명 | aoe | 광역 |
| 무영살 | execute | 크리 보장 처형 |
| 흑주 | aoe | 광역 (디버프 = Phase D) |
| 천우 | heal | 회복 |
| 신탁 | execute | LUC 비례 처형 |
| 영혼소환 | aoe | 광역 다단 |
| 불괴 | buff | DEF buff |
| 반격일도 | execute | 받은 dmg ×N (Phase D 까지 임시) |
| 광폭화 | buff | atk buff |
| 호국 | heal | 회복 |

(임시 매핑 — spec §8 effect-pipeline 도입 후 정확한 디버프/반격/도트로 재구현.)

### 3.2 데이터 타입

```ts
// src/types.ts (추가)
export type SkillKind = 'base' | 'ult';

export interface UltSkillRow extends ActiveSkill {
  charId: string;        // 'hwarang' | 'mudang' | 'choeui'
  ultIndex: 1 | 2 | 3 | 4;
}

// MetaState 추가 필드
skillLevels: Record<string /* charId */, Record<string /* skillId */, number>>;
              // skillId = base skill id 또는 ULT id. lv 0 시작, 무한.
ultSlotPicks: Record<string /* charId */, [string|null, string|null, string|null, string|null]>;
              // 슬롯 4개. null = 비어있음. 채워지면 ULT skillId.
```

```ts
// src/data/jobskills.ts (신규)
export const ULT_CATALOG: UltSkillRow[] = [
  { id: 'hwarang_ult_ilseom', charId: 'hwarang', ultIndex: 1, nameKR: '일섬',
    description: '...', cooldownSec: 8,
    effect: { type: 'execute', multiplier: 5, executeThreshold: 0.30 },
    vfxEmoji: '⚡' },
  // ... 12 row 총
];

export function getUltSkillsForChar(charId: string): UltSkillRow[]
export function getUltById(skillId: string): UltSkillRow | undefined
```

기존 `src/data/skills.ts` (32 base actives) 는 변경 없음.

### 3.3 Skill lv 효과 (Q12=C)

```ts
// src/systems/skillProgression.ts
export function skillDmgMul(kind: SkillKind, lv: number): number {
  return 1 + (kind === 'ult' ? 0.15 : 0.05) * lv;
}

export function skillCooldownMul(kind: SkillKind, lv: number): number {
  if (kind === 'base') return 1.0;
  return Math.max(0.4, 1 - 0.005 * lv);   // ULT only, lv 120 → 40% (cap)
}
```

| skill | lv | dmg mult | cd mult |
|---|---|---|---|
| base   | 0    | ×1.0  | ×1.0 |
| base   | 50   | ×3.5  | ×1.0 |
| base   | 100  | ×6.0  | ×1.0 |
| base   | 1000 | ×51   | ×1.0 |
| ULT    | 0    | ×1.0  | ×1.0 |
| ULT    | 50   | ×8.5  | ×0.75 |
| ULT    | 100  | ×16   | ×0.5 |
| ULT    | 120+ | ×19+  | ×0.4 (cap) |
| ULT    | 1000 | ×151  | ×0.4 |

ULT base cooldown = 8s → lv 100 = 4s, lv 120+ = 3.2s (cap).

### 3.4 JP cost per level

```ts
export function jpCostToLevel(kind: SkillKind, currentLv: number): number {
  const N = currentLv + 1;
  const base = Math.ceil((N * N) / 2);
  return kind === 'ult' ? base * 3 : base;
}
```

| target lv | base | ULT |
|---|---|---|
| 1   | 1     | 3      |
| 10  | 50    | 150    |
| 30  | 450   | 1,350  |
| 50  | 1,250 | 3,750  |
| 100 | 5,000 | 15,000 |

(JP cap 으로 페이싱 게이트 — 한 lv up 당 여러 보스 누적 → 한 spike 모델.)

### 3.5 ULT 슬롯 unlock 게이트 (Q11=A)

```ts
export function totalSkillLv(charId: string): number {
  return sum of meta.skillLevels[charId][skillId] over all skillIds
}

export function ultSlotsUnlocked(charId: string): 0 | 1 | 2 | 3 | 4 {
  const sum = totalSkillLv(charId);
  if (sum >= 1500) return 4;
  if (sum >= 500)  return 3;
  if (sum >= 200)  return 2;
  if (sum >= 50)   return 1;
  return 0;
}
```

### 3.6 ULT 슬롯에 박기 (Q13=B — Free swap)

```ts
pickUltSlot: (charId: string, slotIndex: 0|1|2|3, ultSkillId: string | null) => void
```

전제:
- `slotIndex < ultSlotsUnlocked(charId)`
- ultSkillId 가 그 캐릭터 ULT_CATALOG 에 존재
- 다른 슬롯 (이 슬롯 아님) 에 같은 ultSkillId 박혀있지 않음
- null = 슬롯 비우기 (스킬 lv 는 보존)

비용 ✗. 언제든 변경. 변경해도 박혀있던 ULT 의 lv 는 그대로 유지 (다시 박으면 그
lv 부터 재개).

## 4. ULT Activation (Q5=B 정신 + level-driven)

### 4.1 정책

unlock 된 ULT 슬롯에 박힌 ULT 는 **자동 발동**, 각자 **독립 cooldown**. 공유 lockout
없음. ULT 의 cooldown 과 dmg 는 그 ULT 의 현재 lv 로 결정 (§3.3).

### 4.2 SkillSystem 통합

```ts
// 전투 시작 시 (BattleScene 내부)
function buildActiveSkillsForCombat(charId: string): ActiveSkill[] {
  const character = getCharacter(charId);
  const meta = useGameStore.getState().meta;
  
  const baseSkills = character.activeSkills.map(s => {
    const lv = meta.skillLevels[charId]?.[s.id] ?? 0;
    return {
      ...s,
      cooldownSec: s.cooldownSec * skillCooldownMul('base', lv),  // ×1.0 — base CD 변화 없음
      dmgMul: skillDmgMul('base', lv),
    };
  });
  
  const ultSkills = (meta.ultSlotPicks[charId] ?? [null, null, null, null])
    .filter((id): id is string => id !== null)
    .map(ultId => {
      const ult = getUltById(ultId);
      const lv = meta.skillLevels[charId]?.[ultId] ?? 0;
      return {
        ...ult,
        cooldownSec: 8 * skillCooldownMul('ult', lv),
        dmgMul: skillDmgMul('ult', lv),
      };
    });
  
  return [...baseSkills, ...ultSkills];
}
```

`dmgMul` 은 SkillSystem 의 데미지 계산 단계 (`multiplier` 와 함께) 에 추가 곱.

### 4.3 10 초 전투 컨셉 align

| ULT lv | cooldown | 한 전투 (10s) 발동 횟수 |
|---|---|---|
| 0   | 8.0s | ~1 (운에 따라) |
| 50  | 6.0s | ~1.6 |
| 100 | 4.0s | ~2.5 |
| 200 | 3.2s (cap) | ~3 |
| 500+ | 3.2s | ~3 |

만렙 4 슬롯 + 평균 lv 200+ → 4 ULT × 3.2s = 평균 0.8s 마다 ULT = polyfire 광란 ✓

## 5. JP System

### 5.1 영구 트래커

```ts
// MetaState 추가 필드
jp: Record<string /* charId */, number>;                      // 가용 JP
jpEarnedTotal: Record<string /* charId */, number>;           // 평생 획득 누적 (cap 대상)
jpCap: Record<string /* charId */, number>;                   // 평생 cap (광고로 +50)
jpFirstKillAwarded: Record<string /* charId */, Record<string /* bossId */, true>>;
jpCharLvAwarded: Record<string /* charId */, number>;         // 마지막 처리한 lv 마일스톤 (Asc 사이클 무관 영구)
```

INITIAL_META 에서 (Q14=B):
```ts
jp = {}
jpEarnedTotal = {}
jpCap = { hwarang: 50, mudang: 50, choeui: 50 }
jpFirstKillAwarded = {}
jpCharLvAwarded = {}
skillLevels = {}
ultSlotPicks = { hwarang: [null,null,null,null], mudang: [null,null,null,null], choeui: [null,null,null,null] }
```

### 5.2 JP 부여 — 보스 처치

```ts
function awardJpOnBossKill(charId, bossId, bossType: 'mini'|'major'|'sub'|'final'):
  const baseJp = { mini: 1, major: 2, sub: 1, final: 5 }[bossType]
  const isFirst = !jpFirstKillAwarded[c]?.[bossId]
  const totalGain = isFirst ? baseJp * 2 : baseJp   // first-kill = ×2
  
  const headroom = jpCap[c] - jpEarnedTotal[c]
  const granted = Math.max(0, Math.min(totalGain, headroom))
  
  if (granted > 0) {
    jp[c] = (jp[c] ?? 0) + granted
    jpEarnedTotal[c] = (jpEarnedTotal[c] ?? 0) + granted
  }
  if (isFirst) jpFirstKillAwarded[c][bossId] = true
```

핵심 3 캐릭터의 phase 시작 이전 보스 kill 은 카운트 ✗ (phase 도입 시점부터 시작).

### 5.3 JP 부여 — 캐릭터 lv 마일스톤

```ts
gainLevels 후, charLevels[c] 갱신값 m 에 대해:
  for milestone in [50, 100, 200, 500, 1000]:
    if m >= milestone && jpCharLvAwarded[c] < milestone:
      gain = { 50: 3, 100: 5, 200: 10, 500: 15, 1000: 20 }[milestone]
      headroom = jpCap[c] - jpEarnedTotal[c]
      granted = max(0, min(gain, headroom))
      jp[c] += granted
      jpEarnedTotal[c] += granted
      jpCharLvAwarded[c] = milestone
```

Asc reset 으로 `characterLevels` 가 0 으로 가도 `jpCharLvAwarded` 는 보존 → 재부여 ✗.

### 5.4 광고 시청 (Q14=B)

```ts
watchAdForJpCap: (charId: string) => void
// 효과: jpCap[c] += 50
```

UI: SkillProgression 화면 상단 "📺 광고 시청 +50 cap" 버튼. 본 phase 는 **stub
action** — 실제 ad SDK 통합은 Phase 5 monetization spec. stub 호출 시 즉시 cap +50.

### 5.5 JP spend — skill level up

```ts
levelUpSkill: (charId: string, skillId: string) => void
// 전제:
//   - skillId 가 그 캐릭터의 base 또는 ULT (ULT 라면 ultSlotPicks 에 박혀있어야 함)
//   - jp[c] >= jpCostToLevel(kind, currentLv)
// 효과:
//   - jp[c] -= cost
//   - skillLevels[c][skillId] += 1
```

ULT 가 슬롯에서 빠져있으면 levelUp 불가 (정책: 박힌 ULT 만 키울 수 있음, 빠지면
"비활성" — 다시 박으면 lv 그대로 재개).

## 6. Skill Progression 화면

### 6.1 위치

신규 `src/screens/SkillProgression.tsx`. Town hub 에 "직업소" 입구 추가.
`Screen` 타입에 `'skill-progression'` 추가.

### 6.2 화면 구조

```
┌────────────────────────────────────┐
│  ← Town       화랑의 직업소          │
│  JP: 32 | 누적 67/cap 100           │
│  [📺 광고 시청 +50 cap]              │
├────────────────────────────────────┤
│  Base Skills (always active)        │
│  ┌──────────────────────────────┐   │
│  │ ⚔️ 검격 Lv 12                  │   │
│  │ DMG ×1.6  CD 6s              │   │
│  │ → +1 lv: ×1.65, 비용 85 JP    │   │
│  │ [+1]                          │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 🐯 백호 Lv 8 ...              │   │
│  └──────────────────────────────┘   │
├────────────────────────────────────┤
│  ULT Slots (∑ skill lv 67)          │
│  ┌─ Slot 1 ✓ (≥50) ─────────────┐   │
│  │ 일섬 Lv 5                     │   │
│  │ DMG ×1.75  CD 7.8s           │   │
│  │ → +1 lv: ×1.9, 비용 50 JP     │   │
│  │ [+1]  [변경]                  │   │
│  └──────────────────────────────┘   │
│  ┌─ Slot 2 (≥200) 🔒 ──────────┐    │
│  │ 누적 67/200                   │    │
│  └──────────────────────────────┘   │
│  ...                                 │
└────────────────────────────────────┘
```

### 6.3 UI flow

- Skill card: lv + 현재 효과 + 다음 lv 효과/비용 + [+1] 버튼. JP 부족 시 disabled.
- ULT slot:
  - **잠금**: 누적 lv 진척 표시 (`67/200`)
  - **unlock + 비어있음**: "선택" 버튼 → 4 ULT picker (이미 박힌 ULT 제외)
  - **unlock + 채워짐**: skill card + [변경] (= picker 다시), 비우기 옵션 포함
- 캐릭터 picker: 상단. locked 13 = 표시 ✗. 핵심 3 만 토글.

## 7. 13 비핵심 캐릭터 처리 (Q4=A)

### 7.1 ClassSelect.tsx

- 16 캐릭터 카드 모두 표시 (그리드 유지)
- 13 비핵심 = 🔒 오버레이 + "차후 spec" 라벨, selectable 차단 (no-op + toast)
- 핵심 3 만 selectable

```ts
// src/data/characters.ts 에 추가
export const PHASE_F2F3_CORE_CHARS = ['hwarang', 'mudang', 'choeui'] as const;
export function isCharLocked(charId: string): boolean {
  return !PHASE_F2F3_CORE_CHARS.includes(charId as any);
}
```

(`src/data/characters.ts` 확인 결과 ID 는 정확히 'hwarang' / 'mudang' / 'choeui'.)

### 7.2 데이터 보존

- `meta.characterLevels[id]` 전부 보존
- `inventory` 캐릭터 종속 ✗ → 영향 없음
- 32 base active skill row 전부 보존. 13 캐릭터의 26 = dead data (호출 경로 없음)

### 7.3 base active skill 발동

핵심 3 의 6 base active = **트리/슬롯과 무관하게 항상 자동 발동**. ClassSelect
직후 첫 전투부터 그대로. skill lv 은 0 시작 (mult ×1.0 = 동작 변화 없음).

## 8. Persist v8 Migration

### 8.1 v7 → v8

```ts
{
  name: 'korea_inflation_rpg_save',
  version: 8,
  migrate: (persisted, fromVersion) => {
    // 기존 v6→v7 migration 유지
    
    if (fromVersion < 8) {
      const meta = persisted.meta;
      
      // 1. inventory: Equipment[] → EquipmentInstance[]
      const migrateSlot = (items: any[]) =>
        items.map((it: any) => ({
          instanceId: crypto.randomUUID(),
          baseId: it.id,
          enhanceLv: 0,
        }));
      
      meta.inventory = {
        weapons: migrateSlot(meta.inventory?.weapons ?? []),
        armors: migrateSlot(meta.inventory?.armors ?? []),
        accessories: migrateSlot(meta.inventory?.accessories ?? []),
      };
      
      // 2. equippedItemIds: baseId[] → instanceId[]
      const oldEquipped: string[] = meta.equippedItemIds ?? [];
      const allInstances = [
        ...meta.inventory.weapons,
        ...meta.inventory.armors,
        ...meta.inventory.accessories,
      ];
      const claimed = new Set<string>();
      const newEquipped: string[] = [];
      for (const oldBaseId of oldEquipped) {
        const found = allInstances.find(
          (inst: any) => inst.baseId === oldBaseId && !claimed.has(inst.instanceId)
        );
        if (found) {
          claimed.add(found.instanceId);
          newEquipped.push(found.instanceId);
        }
        // not found = orphan equipped — silently drop
      }
      meta.equippedItemIds = newEquipped;
      
      // 3. JP / Skill 신규 필드 (Q14=B 초기값)
      meta.jp = {};
      meta.jpEarnedTotal = {};
      meta.jpCap = { hwarang: 50, mudang: 50, choeui: 50 };
      meta.jpFirstKillAwarded = {};
      meta.jpCharLvAwarded = {};
      meta.skillLevels = {};
      meta.ultSlotPicks = {
        hwarang: [null, null, null, null],
        mudang:  [null, null, null, null],
        choeui:  [null, null, null, null],
      };
    }
    return persisted;
  }
}
```

### 8.2 mid-run safety

`run` state 는 inventory 직접 참조 ✗ (drop 시 store action 만 호출). v8 migration
1회 적용 후 정상.

### 8.3 forward 확장 지점

v9 (Phase D modifier) 도착 시 `EquipmentInstance.modifiers: Modifier[]` 추가가 자연
확장. 본 phase 는 미정.

## 9. 합성 시스템 호환

기존 Phase 2.5 합성 (3 → 1 tier-up):

```
attemptCraft(slot: EquipmentSlot, sourceInstanceIds: [string, string, string]):
  precondition: 3 instance 모두 같은 rarity, 같은 slot
  결과: 새 instance, baseId = (다음 tier 의 random base), enhanceLv = 0
  source 3 instance inventory 에서 제거
```

**합성 결과물의 enhanceLv = 0**. 입력 instance 의 enhanceLv 는 손실. UI 에서 명시
경고.

## 10. 테스트 계획

### 10.1 신규 vitest (≥ 50 테스트)

| 영역 | 테스트 |
|---|---|
| enhanceMultiplier | 등급별 lv 0/100/1000 mult 정확 (6) |
| enhanceCost | (rarity, lv) → stones/dr 정확. 단조 증가 (6) |
| getInstanceStats | base × enhanceLv 적용. floor 처리 (4) |
| store.enhanceItem | 비용 차감 / lv +1 / 비용 부족 시 no-op (4) |
| persist v7→v8 | 빈/단일/중복 baseId/orphan equipped + JP fields (5) |
| skillDmgMul | base / ULT lv 0/50/100/1000 정확 (4) |
| skillCooldownMul | base ×1, ULT lv 0/50/100/120 cap (4) |
| jpCostToLevel | base / ULT lv 0/50/100. 단조 증가 (4) |
| ultSlotsUnlocked | boundaries 50/200/500/1500 (4) |
| pickUltSlot | 슬롯 인덱스 검증, 잠긴 슬롯 거부, 중복 거부, null 비우기, swap 시 lv 보존 (5) |
| levelUpSkill | base 가능 / ULT 슬롯 박힘만 가능 / JP 부족 / lv 누적 (5) |
| awardJpOnBossKill | first-kill ×2 / 반복 drip / cap 도달 시 0 grant / first 트래커 (5) |
| 캐릭터 lv 마일스톤 | 50/100/200/500/1000 1회만, Asc 후 재부여 ✗ (3) |
| watchAdForJpCap | cap +50 (1) |
| jobskills.ts | 12 ULT row schema (3) |

### 10.2 기존 vitest 영향 (~30 테스트 갱신)

- `gameStore.test.ts`: equipItem/unequipItem/sellEquipment 가 instanceId (~10)
- `Inventory.test.tsx`, `Shop.test.tsx`: instance 생성 (~10)
- `equipment.test.ts` / `crafting.test.ts`: instance 모델 (~10)

총 ≈ 251 + 50 = **목표 ≥ 295 vitest** (현 251).

### 10.3 E2E 추가

신규 `e2e/enhance-skill-progression.spec.ts`:
- enhance flow: classSelect → start run → drop item → end run → Inventory → 강화 → DR/stones 차감 + lv +1 visible
- skill-progression: Town → 직업소 → base skill +1 → JP 차감 visible. 누적 50 → ULT slot 1 unlock + ULT 선택 가능

ULT 발동 visual check 는 skip.

목표 e2e **18 + 1 = 19**.

## 11. 단일 plan 내 execution checkpoint (Q7=B + advisor)

mega-plan 1개 안에 5 checkpoint. 각 CP 후 `pnpm typecheck` + vitest 그린 확인 필수.

1. **CP1 — Instance refactor**
   - `Equipment` → `EquipmentBase` + `EquipmentInstance`
   - 모든 consumer 갱신 (Inventory/Shop/Battle/store/equipment system/quest/Asc keepEquipped/crafting)
   - persist v8 migration (instance 부분만, JP fields 는 CP3)
   - 모든 instance 의 enhanceLv = 0 → 동작 변화 없음 (mult ×1.0)
   - vitest 갱신 + migration 테스트 (8 신규)

2. **CP2 — Enhance 시스템**
   - `enhanceMultiplier` / `enhanceCost`
   - `store.enhanceItem` action
   - Inventory.tsx 강화 UI (item 카드 expand → +1 버튼)
   - vitest 신규 (curve / cost / store action — 14)

3. **CP3 — JP 시스템 + Skill 데이터 + persist**
   - `src/data/jobskills.ts` (12 ULT row)
   - persist v8 의 JP / skillLevels / ultSlotPicks 신규 필드 부분
   - `meta.jp/jpEarnedTotal/jpCap/jpFirstKillAwarded/jpCharLvAwarded/skillLevels/ultSlotPicks`
   - store actions: `awardJpOnBossKill` (`trackBossDefeat` 에 wire), `gainLevels` 의 마일스톤, `watchAdForJpCap`, `levelUpSkill`, `pickUltSlot`
   - SkillProgression UI 미구현 (다음 CP)
   - vitest 신규 (JP / skill level / cap / 슬롯 — 21)

4. **CP4 — SkillProgression 화면**
   - `Screen` 타입에 'skill-progression' 추가
   - `src/screens/SkillProgression.tsx` 신규 (skill cards + ULT slots + 광고 버튼)
   - Town.tsx 에 "직업소" 입구 버튼 추가
   - e2e 1개 추가
   - vitest (UI 컴포넌트 4)

5. **CP5 — Battle 통합 + 13 char hard gate + 마무리**
   - `buildActiveSkillsForCombat` 로직: skillDmgMul + skillCooldownMul + ULT 슬롯 → SkillSystem
   - SkillSystem 데미지 계산에 `dmgMul` 곱 적용
   - ClassSelect.tsx 의 13 캐릭터 hard gate (🔒, no-op)
   - 최종 typecheck + vitest + e2e + lint + circular + next build 모두 그린

## 12. Out-of-scope

- 13 비핵심 캐릭터 6 base skill / ULT / 정체성 (별도 spec, unlock 시점에 작성)
- 수식어 (Modifier) 시스템 (Phase D — EquipmentInstance 위에 modifiers 필드 추가)
- Mythic 유물 / 누적 유물 / 차원 나침반 (Phase E)
- 광고 SDK 실제 통합 (Phase 5 monetization — 본 spec 은 stub 만)
- 온라인 / PvP / 길드 (300h spec §15)
- 마을 hub UI 본격 디자인 (별도 spec)
- 균형 시뮬레이션 + 인플레이션 곡선 검증 (Phase I)
- effect-pipeline (도트/CC/디버프/반사 — 300h spec §8.6) — 일부 ULT 임시 매핑은
  Phase D 에서 정확한 효과로 재구현
- BP 비례 소모 (300h spec §2.5) — 별도, 직교
- 알파벳 숫자 표기 (300h spec §11.3) — 별도, 직교
- ULT 발동 시각 효과 / vfx 강화 — 본 spec 는 기능만, vfx 다듬기는 후속

## 13. 위험 / 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| Instance refactor 가 30+ consumer 모두 손댐 | 큼 | CP1 단일 checkpoint, 갱신 후 typecheck 그린이 되어야 다음 진행 |
| Skill lv 무한 인플레가 enhance × Asc Tier 와 곱해져 데미지 폭발 | 중 | spec §11.3 Curve 3 의 곱·합 혼합으로 조절. 균형은 Phase I |
| JP cap 50 시작 + 광고 +50 페이싱 | 중 | 광고 1회 ≈ 던전 1~2 보스분 = 가벼움. 균형은 Phase I |
| ULT slot free swap 의 store race | 작 | store action 단일 트랜잭션 |
| ULT 임시 매핑 (반격일도 등) 후속 phase 부채 | 중 | out-of-scope 명시. Phase D 도착 시 재방문 |
| persist v8 의 orphan equipped | 작 | migration 에서 silent drop. 매우 드문 케이스 |
| 합성 × enhanceLv | 작 | 명시 정책 (lv 0 reset). UI 경고 |
| `crypto.randomUUID()` 호환 | 작 | Node 19+ / jsdom 23+ / Safari 15.4+ / Android Chrome 92+ 모두 OK |
| 각 phase 시작 이전 보스 kill 의 JP 환원 ✗ | 작 | spec §5.2 명시. 사용자 입장 = phase 도입 후 새로 시작하는 페이싱 |

## 14. 측정 / 완료 정의

다음 모두 그린이어야 phase-f2f3-complete:

- `pnpm typecheck` 0 error
- `pnpm lint` 0 error
- `pnpm test` ≥ 295 PASS
- `pnpm circular` 0
- `pnpm --filter @forge/game-inflation-rpg e2e` 19 PASS
- `next build` 통과
- 사용자 manual sanity check (강화 1회 + skill lv +1 + ULT 슬롯 unlock + ULT 발동 visual)

## 15. 후속 단계

본 phase 이후 추천 순서:

1. **콘텐츠 균형 패치** — F30 보상, 스킬 magnitude (small, optional)
2. **Phase D — 수식어 시스템** — EquipmentInstance 에 modifiers + 40 수식어 풀 + reroll + effect-pipeline. 본 spec 의 instance 모델 위에 자연 확장.
3. **Phase E — 유물 + Mythic 슬롯** — Asc Tier 마일스톤 보상과 통합. 광고 인프라 본격화 (본 phase 의 stub 을 진짜로).
4. **Phase G — Asc Tree 노드** — F-1 의 ascPoints 소비처. 10 노드 종류.

13 비핵심 캐릭터 unlock + 6 base skill / ULT 본격 디자인은 위 순서와 병렬 가능
(별도 spec).
