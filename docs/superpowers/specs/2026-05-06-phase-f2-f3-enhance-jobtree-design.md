# 2026-05-06 — Phase F-2+3 Design Spec (Enhance + JobTree, inflation-rpg)

## 한 줄 요약

300h spec §4 (직업 트리) 와 §5 (장비 강화) 를 **단일 mega-phase** 로 구현한다.
Equipment 를 catalog/instance 로 분리하고 instance 별 `enhanceLv` 를 갖게 하며,
6 등급 강화 곡선 + 무한 lv + Inventory 내 강화 UI 를 추가한다. 동시에
화랑·무당·초의 3 캐릭터 각 4 분기 ~100 노드 = 300 노드 직업 트리 + 분기당
ULT 1개 = 12 ULT 를 추가한다. JP 는 글로벌 first-only. 비핵심 13 캐릭터는
ClassSelect 에서 hard-gate (🔒). persist v8 migration 1회.

## 배경

- 현재 phase: `phase-f1-complete`. F-1 = Ascension MVP + 균열석. ascTier 진입 가능
  (`(1 + 0.1·N)` 멀티플라이어 wired).
- 현재 메타 케이크 (300h spec §1):
  - 1 Run / 2 Char Lv / 3 Soul·BaseAb / **4 Job Tree (없음)** / **5 강화 (없음)** /
    6 Asc (F-1 완료) / 7 유물 (없음, Phase E 예정)
- 본 spec 이 **층 4 와 층 5** 를 동시 도입한다. 두 층 모두 Asc reset 시 보존되는
  영구 메타 (300h spec §1 표).

## 핵심 선택 (clarifying questions 결과)

| Q | 결정 |
|---|---|
| Q1 — F-2/F-3 분리 vs Full | **Full** — 두 시스템 한 phase 에서 데이터까지 채움 |
| Q2 — Equipment 모델 | **Instance refactor** (catalog/instance 분리) |
| Q3 — JP 의미론 | **글로벌 first-only** — Asc reset 으로 재획득 ✗ |
| Q4 — 13 비핵심 캐릭터 | **Hard gate** — ClassSelect 🔒 + 차후 spec |
| Q5 — ULT activation | **All unlocked ULTs simultaneous** — 각자 독립 cooldown |
| Q6 — UI | **Enhance = Inventory 임베드, JobTree = 신규 화면** |
| Q7 — 작업 sequencing | **Single mega-plan** (내부 5 checkpoint) |

## 1. Equipment Instance Model

### 1.1 타입 변경

```ts
// 현재 (v7)
export interface Equipment {
  id: string;       // catalog id
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  stats: EquipmentStats;
  dropAreaIds: string[];
  price: number;
}
inventory: { weapons: Equipment[], armors: Equipment[], accessories: Equipment[] }
equippedItemIds: string[]   // 현재 의미: catalog id 저장

// v8 후
export interface EquipmentBase {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  baseStats: EquipmentStats;   // ← 명확한 이름
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
equippedItemIds: string[]      // ← 의미 변경: instanceId 저장
```

`Equipment` 타입은 **삭제** (혼동 방지). catalog 는 `EQUIPMENT_BASES: EquipmentBase[]`
로 export. 검색 헬퍼 `getEquipmentBase(baseId): EquipmentBase | undefined`.

### 1.2 stat 계산 헬퍼

```ts
// src/systems/enhance.ts
export function enhanceMultiplier(rarity: EquipmentRarity, lv: number): number {
  const perLv: Record<EquipmentRarity, number> = {
    common: 0.05, uncommon: 0.07, rare: 0.10,
    epic: 0.15, legendary: 0.22, mythic: 0.32,
  };
  return 1 + perLv[rarity] * lv;
}

// src/systems/equipment.ts (기존 파일 확장)
export function getInstanceStats(inst: EquipmentInstance): EquipmentStats {
  const base = getEquipmentBase(inst.baseId);
  if (!base) return {};
  const m = enhanceMultiplier(base.rarity, inst.enhanceLv);
  return {
    flat:    Object.fromEntries(Object.entries(base.baseStats.flat ?? {}).map(([k,v]) => [k, v * m])),
    percent: Object.fromEntries(Object.entries(base.baseStats.percent ?? {}).map(([k,v]) => [k, v * m])),
  };
}
```

flat 과 percent 양쪽 동일 multiplier 적용 (300h spec §5.2).

### 1.3 Consumer 갱신 면

| 파일 | 변경 |
|---|---|
| `src/types.ts` | `Equipment` → `EquipmentBase` + `EquipmentInstance` |
| `src/data/equipment.ts` | `EQUIPMENT_CATALOG: Equipment[]` → `EQUIPMENT_BASES: EquipmentBase[]` |
| `src/systems/equipment.ts` | `addToInventory`/`removeFromInventory`/`sortBySlot` 등이 instance 받음. `getInstanceStats` 신규 |
| `src/systems/calcFinalStat.ts` (또는 stat 합성 코드) | equipped instance 의 `getInstanceStats` 합산 |
| `src/store/gameStore.ts` | `addEquipment(item: EquipmentInstance)`, `equipItem(instanceId)`, `unequipItem(instanceId)`, `sellEquipment(instanceId, price)` |
| `src/screens/Inventory.tsx` | 아이템 카드 = instance 표시 (이름 = base.name + (lv > 0 ? ` +${lv}` : '')), 강화 UI 임베드 (§2) |
| `src/screens/Shop.tsx` | 구매 시 `EquipmentInstance` 생성하여 addEquipment |
| `src/screens/Battle.tsx` | drop 시 `EquipmentInstance` 생성 |
| `src/systems/quests.ts` (item-collect quest) | `trackItemCollect(baseId)` (catalog id 그대로) |
| `src/store/gameStore.ts` (Asc keepEquipped) | instance 단위 필터, equipped 보존 시 enhanceLv 자동 보존 |

### 1.4 instanceId 생성

`crypto.randomUUID()`. Vitest jsdom 환경 호환 (Node 19+ / jsdom 23+ 지원). 만약
인스턴스 카운트 폭증으로 uuid 길이가 우려되면 후속 phase 에서 단축 hash 로 마이그레이션
가능 — 본 phase 는 readability + 충돌 zero 우선.

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
// src/systems/enhance.ts
export function enhanceCost(rarity: EquipmentRarity, currentLv: number): { stones: number; dr: number } {
  const next = currentLv + 1;
  const rarityMult = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8, mythic: 16 }[rarity];
  return {
    stones: Math.ceil((next * next) / 5) * rarityMult,
    dr:     next * next * next * 100 * rarityMult,
  };
}
```

100% 성공, 실패 없음. lv cap 없음.

### 2.3 store action

```ts
enhanceItem: (instanceId: string) => void
```

전제 조건:
- 보유 instance 인지
- DR + stones 충분한지

만족 시: `enhanceLv += 1`, DR/stones 차감. 실패 시 무시 (silent — UI 가 버튼 disabled
처리).

### 2.4 UI — Inventory.tsx 임베드 (Q6=B)

각 instance 카드:
```
┌─────────────────────────┐
│ 청룡도 +12  [rare]       │
│ ATK +320 (base 80, ×4)  │
│ 장착 / 해제              │
│ ▾ 강화 (열기)            │  ← 토글
└─────────────────────────┘

▾ 펼침:
┌─────────────────────────┐
│ → +13  ATK +330 (+10)   │
│ 비용: 강화석 39 / DR 22K │
│ [강화]  [10회 일괄]      │
└─────────────────────────┘
```

- 모바일 safe area 호환: 카드 expand 시 list 가 자연 reflow.
- "10회 일괄" = 합 누적 비용 계산 후 만족 시 10회 일괄 적용 (UX 사치품, 옵션).
  본 phase 는 일단 "+1" 만 구현하고 일괄은 stretch.
- 등급별 색상 토큰 (`forge-rarity-*`) 그대로 재사용.

### 2.5 stat 정수 처리

`getInstanceStats` 가 곱하는 결과는 float 가능 (예: rare base 200 × ×11 = 2200, ok).
하지만 `1 + 0.1 × N` 같은 multiplier 가 float drift 를 일으킬 수 있어 **stat 합산
직전에 `Math.floor`** 적용. 표시도 floor.

## 3. Job Tree 데이터

### 3.1 캐릭터 분기 + ULT (300h spec §4.2)

| 캐릭터 | 분기 1 | 분기 2 | 분기 3 | 분기 4 | ULT 명 (각 분기 끝) |
|---|---|---|---|---|---|
| 화랑 ⚔️ | 검술 | 창술 | 체술 | 무영 | 일섬 / 천공무 / 진명 / 무영살 |
| 무당 🌸 | 저주 | 축복 | 점복 | 강령 | 흑주 / 천우 / 신탁 / 영혼소환 |
| 초의 🛡️ | 방어 | 반격 | 분노 | 수호 | 불괴 / 반격일도 / 광폭화 / 호국 |

(ULT 명은 spec §4 의 "일섬/천공무/진명/무영살" 외 미정 항목을 본 spec 이 확정.)

### 3.2 노드 타입

```ts
// src/types.ts (신규)
export type JobBranchId = string;  // e.g. 'hwarang-swordsman', 'hwarang-spear', ...
export type JobTreeNodeKind = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type JobTreeEffect =
  | { kind: 'stat'; stat: StatKey; percent: number }
  | { kind: 'passive'; description: string; effect: { type: string; value: number } }
  | { kind: 'skill_enhance'; skillId: string; cdMul?: number; dmgMul?: number; targetsAdd?: number }
  | { kind: 'active'; activeSkillId: string }
  | { kind: 'ult_unlock'; ultSkillId: string }
  | { kind: 'identity'; multipliers: Partial<Record<StatKey, number>> };  // ×N flat boost

export interface JobTreeNode {
  id: string;
  charId: string;
  branchId: JobBranchId;
  kind: JobTreeNodeKind;
  jpCost: number;
  effect: JobTreeEffect;
  requires?: string[];  // prerequisite nodeIds (within same branch). 미설정 = 분기 entrance node 또는 무관.
}
```

JP 비용 (300h spec §4.3 그대로):

| kind | jpCost |
|---|---|
| common | 1 |
| uncommon | 2 |
| rare | 3 |
| epic | 5 |
| legendary | 10 |
| mythic | 15 |

### 3.3 분기 구조 (각 분기 ~25 노드)

분기 = 트리 형태의 prereq DAG. 단순 chain 권장:

```
[branch entrance — common]
       ↓
[node 2 — common] ← (alt: uncommon)
       ↓
[node 3 — uncommon]
       ↓
... (depth 가 깊어질수록 kind 가 평균적으로 무거움)
       ↓
[node 24 — epic]
       ↓
[node 25 — legendary "ULT unlock"]
```

깊이 25, 다중 chain 가능 (일부 노드는 prereq 1개, 일부는 2개). epic/mythic 노드
는 mid-depth 에 산재. legendary "ULT unlock" 은 분기 끝.

### 3.4 카탈로그 분량

총 300 노드 = 3 캐릭터 × 4 분기 × ~25. 데이터 row 작업이며 spec §4.2 의 분기
identity (검술 = 근접/단일, 창술 = 원거리/관통, 등) 를 참고하여 stat % / passive
효과를 분기 정체성에 맞게 분배. 본 spec 은 row schema 만 확정. 실제 카탈로그는
plan 단계에서 subagent 에게 spec §4.2 + balance heuristic 을 주고 채우게 함.

balance heuristic (subagent 가 따를 규칙):
- 분기당 stat % 합 ≈ +200% (한 분기 만렙 시 그 분기 stat ×3 효과)
- legendary ULT unlock = 1개 (분기 끝)
- mythic 노드 = 분기당 0~1개 (분기 정체성 핵심 boost)
- common (kind) 비율 ≈ 60%, uncommon 20%, rare 10%, epic 7%, legendary 3% (= ULT)

### 3.5 ULT skill row (12개)

`src/data/jobskills.ts` 신규. ActiveSkill 타입 그대로 사용 (spec §11 의 "스킬 카탈로그
구조 변경" 은 본 phase 에서 수행하지 않고 ActiveSkill 의 multiplier/duration 을
크게 키운 row 12개로 처리). 효과 type = 기존 `multi_hit | aoe | heal | buff |
execute` 중 분기 정체성에 맞게 매핑:

| ULT | type | 컨셉 |
|---|---|---|
| 일섬 (화랑 검술) | execute | 단일 대상 폭딜 + 처형 |
| 천공무 (화랑 창술) | multi_hit | 관통 다단 |
| 진명 (화랑 체술) | aoe | 광역 폭발 |
| 무영살 (화랑 무영) | execute | 크리 보장 + 처형 |
| 흑주 (무당 저주) | aoe + 디버프 | spec §8 effect-pipeline 미존재 → buff 로 임시 처리, Phase D 에 진짜 디버프 |
| 천우 (무당 축복) | heal + buff | 회복 + atk buff |
| 신탁 (무당 점복) | execute | LUC 비례 dmg |
| 영혼소환 (무당 강령) | aoe | 광역 다단 |
| 불괴 (초의 방어) | buff | DEF buff |
| 반격일도 (초의 반격) | execute | 받은 dmg 의 ×N 반격 — 단순화 = execute 로 임시 |
| 광폭화 (초의 분노) | buff + aoe | atk buff + 광역 |
| 호국 (초의 수호) | heal + buff | 회복 + def buff |

(임시 매핑은 spec §8 effect-pipeline 도입 시 정확한 디버프 / 반격 / 도트 등으로
재구현 — 본 phase 는 기존 SkillSystem 안에서 구현 가능한 형태로만 ship.)

### 3.6 데이터 파일

```
src/data/jobtree.ts    — 300 노드 row
src/data/jobskills.ts  — 12 ULT ActiveSkill row
```

기존 `src/data/skills.ts` (32 base actives) 는 **변경 없음**. 다만 13 비핵심 캐릭터
의 26 skill 은 dead data (해당 캐릭터가 잠겨서 발동 경로 없음).

## 4. ULT Activation (Q5=B + advisor #2)

### 4.1 정책

unlock 한 모든 ULT 가 **자동 발동**, 각자 **독립 cooldown**. 공유 lockout 없음.

### 4.2 Cooldown 계산

```ts
// src/systems/jobtree.ts
export function ultCooldownSec(branchDepth: number): number {
  // depth = 그 분기에서 unlock 한 노드 수. clamp [1, 25].
  const d = Math.max(1, Math.min(25, branchDepth));
  return 60 * (1 - 0.02 * d);
}
```

| branchDepth | cooldown |
|---|---|
| 1 (entrance only) | 58.8s |
| 5 | 54s |
| 10 | 48s |
| 15 | 42s |
| 20 | 36s |
| 25 (만렙) | 30s |

분기 만렙 시 cooldown 절반. 4 분기 모두 만렙이면 4 ULT × 30s = 평균 7.5s 마다 ULT
하나 발동 = 본 spec 이 의도하는 polyfire 절정.

### 4.3 SkillSystem 통합

기존 SkillSystem 은 `activeSkills: [skill1, skill2]` 만 처리. ULT 추가:

```ts
// 전투 시작 시
const baseSkills = character.activeSkills;  // 2개
const unlockedUlts = getUnlockedUlts(meta, characterId);  // 0~4개
                    .map(u => ({ ...u, cooldownSec: ultCooldownSec(branchDepth(u)) }));
const allActiveSkills = [...baseSkills, ...unlockedUlts];

// 각 skill 은 자기 cooldownSec 으로 독립 timer
```

### 4.4 노드 효과 → battle 통합

`stat` / `identity` 효과 = `calcFinalStat` 합성 단계에 곱·합 (300h spec §11.3
Curve 3 의 `(1 + 0.1 × jobTreeATK)` 자리). 구현:

```ts
// jobtree.ts
export function jobTreeStatBonus(meta, charId): Partial<Record<StatKey, number>> {
  // unlocked nodes 의 stat / identity effect 합산
}
```

`skill_enhance` 효과 = base active skill 의 row 를 런타임에 변형 (cdMul, dmgMul,
targetsAdd 적용). SkillSystem 이 skillId 로 base row + enhance overlay 합성.

`active` 효과 (= 새 active skill 추가) = ULT 와 같은 방식으로 active list 에 push.

`passive` 효과 = 본 phase 에서는 description 만 보유, 실제 작동은 effect 별 스위치
case (간단한 것만 — 예: "BP +1", "크리율 +N%" 같은 single-axis). 복잡한 trigger 는
Phase D effect-pipeline 도착 후 와이어.

## 5. JP Semantics

### 5.1 영구 트래커

```ts
// MetaState 추가 필드
jp: Record<string /* charId */, number>;                     // 미사용 JP
jpAwarded: Record<string /* charId */, Record<string /* bossId */, true>>;
                                                             // 글로벌 first-only
jpCharLvAwarded: Record<string /* charId */, number>;        // 마지막으로 부여된 마일스톤
                                                             // (0 = 아직 50 미달, 50/100/200/500/1000)
jobNodes: Record<string /* charId */, Record<string /* nodeId */, true>>;
```

### 5.2 부여 시점

#### (a) Boss 처치
```
trackBossDefeat(bossId) 시 — 현재 활성 캐릭터의 charId 가 c라 할 때:
  if jpAwarded[c]?.[bossId] !== true:
    bossType = lookupBossType(bossId)  // 'mini'/'major'/'sub'/'final'/'normal'
    jpGain = { normal: 1, mini: 2, major: 3, sub: 2, final: 5 }[bossType]
    jp[c] += jpGain
    jpAwarded[c][bossId] = true
```

**잠금 해제 전 처치는 카운트 ✗**. phase 시작 시점부터 새 처치만 카운트 (charId
정보 없는 과거 데이터는 무시). 핵심 3 캐릭터 (화랑/무당/초의) 의 phase 이전 보스
kill 도 마찬가지 — `normalBossesKilled[]` 는 charId 없이 저장되어 있어 누가 죽였는지
알 수 없으므로 보존하되 JP 환원하지 않음. **저장된 첫 phase 시작 시점부터 새로 시작.**

#### (b) 캐릭터 lv 마일스톤
```
gainLevels 후, 갱신된 charLevels[c] 에 대해:
  milestones = [50, 100, 200, 500, 1000]
  for m in milestones:
    if charLevels[c] >= m && jpCharLvAwarded[c] < m:
      jp[c] += { 50: 3, 100: 5, 200: 10, 500: 15, 1000: 20 }[m]
      jpCharLvAwarded[c] = m

(jpCharLvAwarded[c] 이미 기록된 마일스톤은 Asc reset 후에도 유지 → 재부여 ✗)
```

### 5.3 노드 unlock

```ts
unlockJobNode: (charId, nodeId) => void
```

전제:
- node 가 그 캐릭터 트리에 존재
- prereq 노드 모두 unlock 됨 (`requires` 배열)
- `jp[charId] >= node.jpCost`

만족 시: `jp[c] -= cost`, `jobNodes[c][nodeId] = true`.

ULT unlock 노드 도 동일 — 단지 effect.kind 가 'ult_unlock'.

### 5.4 트리 reset

```ts
resetJobTree: (charId) => void
```

비용: `Object.keys(jobNodes[c]).length × 500 DR`. DR 차감 후 `jobNodes[c] = {}`,
누적 JP 는 트리에 박은 만큼 환불 (`jp[c] += sum(node.jpCost for unlocked)`).
`jpAwarded` / `jpCharLvAwarded` 는 reset 영향 없음 (= JP 누적 cap 그대로).

per-character. 다른 캐릭터 트리 / 진척 무관.

## 6. JobTree 화면

### 6.1 위치

신규 `src/screens/JobTree.tsx`. Town hub 에 "직업소" 입구 추가:
```
src/screens/Town.tsx  → 직업소 버튼 추가, onClick = setScreen('job-tree')
```

`Screen` 타입에 `'job-tree'` 추가.

### 6.2 화면 구조

```
┌─────────────────────────────────┐
│  ← Town    화랑의 직업 트리      │
│            JP: 47 / 누적: 152    │
├─────────────────────────────────┤
│  [검술] [창술] [체술] [무영]     │  ← 분기 탭
├─────────────────────────────────┤
│   ▶ branch tree visualization    │
│   (depth 25, 노드 카드 grid)     │
│                                  │
│   [노드 카드: ⓒ 검의 길]         │
│   "ATK +5%"                      │
│   비용: 1 JP  [unlock]           │
│                                  │
│   ...                            │
├─────────────────────────────────┤
│  [트리 초기화 — DR 6,500]        │
└─────────────────────────────────┘
```

상단 캐릭터 선택 picker (locked 13 = 표시 안 함, 핵심 3 만 토글). 분기 탭 4개로
한 분기씩 표시 (UI 단순화 — 4 분기 전체를 한 화면에 그리는 D2 식 mosaic 은 stretch).

노드 카드 = 4 상태:
- 🔒 prereq 미충족 (회색)
- 💰 unlock 가능 (highlight + JP 충분) / JP 부족 (highlight + disabled)
- ✅ unlock 됨

### 6.3 모바일 safe area

세로 스크롤. 분기 탭 = 상단 sticky. 노드 카드 = 60×80 grid. 트리 초기화 = 하단
sticky.

## 7. 13 비핵심 캐릭터 처리 (Q4=A)

### 7.1 ClassSelect.tsx 변경

- 16 캐릭터 카드 모두 표시 (그리드 유지)
- 13 비핵심 캐릭터 = 🔒 오버레이 + "차후 spec" 라벨. selectable 차단 (onClick = no-op + toast).
- 핵심 3 (화랑/무당/초의) 만 selectable.

### 7.2 데이터 보존

- `meta.characterLevels[id]` 는 전부 보존 (잠긴 캐릭터의 과거 lv 진척 그대로 저장)
- `inventory` 는 캐릭터 종속이 아니므로 영향 없음
- 32 base active skill row 는 모두 보존. 13 캐릭터의 26 skill 은 호출 경로 없음
  (= dead data) 이지만 향후 unlock spec 때 그대로 활용

### 7.3 ClassSelect 의 잠금 게이트 추가

```ts
// src/data/characters.ts (추가)
export const PHASE_F2F3_CORE_CHARS = ['hwarang', 'mudang', 'choeui'] as const;
export function isCharLocked(charId: string): boolean {
  return !PHASE_F2F3_CORE_CHARS.includes(charId as any);
}
```

(`src/data/characters.ts` 확인 결과 ID 는 정확히 'hwarang' / 'mudang' / 'choeui'.)

### 7.4 base active skill 발동 (advisor #3)

핵심 3 의 6 base active skill = **트리와 무관하게 항상 자동 발동**. ClassSelect
직후 첫 전투부터 그대로. 트리는 별도 layer (stat boost / ULT 추가 / skill
enhance).

## 8. Persist v8 Migration

### 8.1 v7 → v8

```ts
{
  name: 'korea_inflation_rpg_save',
  version: 8,
  migrate: (persisted, fromVersion) => {
    // ... 기존 v6→v7 migration 유지
    
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
      const oldEquipped = meta.equippedItemIds ?? [];
      const allInstances = [
        ...meta.inventory.weapons,
        ...meta.inventory.armors,
        ...meta.inventory.accessories,
      ];
      const claimed = new Set<string>();
      const newEquipped: string[] = [];
      for (const oldBaseId of oldEquipped) {
        const found = allInstances.find(
          inst => inst.baseId === oldBaseId && !claimed.has(inst.instanceId)
        );
        if (found) {
          claimed.add(found.instanceId);
          newEquipped.push(found.instanceId);
        }
        // not found = orphan equipped (data corruption) — silently drop
      }
      meta.equippedItemIds = newEquipped;
      
      // 3. JP / JobTree fields = 빈 상태로 초기화
      meta.jp = {};
      meta.jpAwarded = {};
      meta.jpCharLvAwarded = {};
      meta.jobNodes = {};
    }
    return persisted;
  }
}
```

### 8.2 mid-run safety

- `run` state 는 `inventory` 를 직접 참조하지 않음 (drop 시 store action 만 호출)
- `currentDungeonId` / `currentFloor` 등은 v7 v8 무관
- migration 1회 적용 후 persist 정상 동작

### 8.3 forwards/backwards

`run.exp` 같은 신규 필드 없음. v8 → v9 (Phase D modifier) 도착 시 EquipmentInstance
에 `modifiers: Modifier[]` 필드 추가가 자연스러운 확장 지점.

## 9. 합성 시스템 호환

기존 Phase 2.5 합성 (3 → 1 tier-up) 은 base id 기반. instance 시대에는:

```
attemptCraft(slot: EquipmentSlot, sourceInstanceIds: [string, string, string]):
  precondition: 3 instance 모두 같은 rarity, 같은 slot
  결과: 새 instance, baseId = (다음 tier random base), enhanceLv = 0
  source 3 instance 는 inventory 에서 제거
```

→ **합성 결과물의 enhanceLv = 0 으로 시작**. 입력 instance 의 enhanceLv 는 손실.
사용자가 강화 lv 깊이 박은 아이템을 합성에 쓰지 않게 하는 자연 방어 (UI 에서
명시).

## 10. 테스트 계획

### 10.1 Vitest 신규 (≥ 40 테스트)

| 영역 | 테스트 |
|---|---|
| enhanceMultiplier | 등급별 lv 0/100/1000 mult 정확 (6 테스트) |
| enhanceCost | (rarity, lv) → stones/dr 정확. 단조 증가 (6 테스트) |
| getInstanceStats | base × enhanceLv 적용. floor 처리 (4 테스트) |
| store.enhanceItem | 비용 차감 / lv +1 / 비용 부족 시 no-op (4 테스트) |
| persist v7→v8 | 빈/단일/중복 baseId/orphan equipped (5 테스트) |
| jobNode unlock | prereq 충족/불충족, JP 부족, 중복 (4 테스트) |
| resetJobTree | per-character, JP 환불, DR 차감 (3 테스트) |
| JP gain on boss | first-kill 1회만, charId 별 분리 (4 테스트) |
| JP gain on charLv | 마일스톤 50/100/200/500/1000 1회만, Asc 후 재부여 ✗ (3 테스트) |
| ultCooldownSec | depth 1/5/10/25 정확 (2 테스트) |
| jobTreeStatBonus | unlocked stat 노드 합산 (3 테스트) |

### 10.2 기존 vitest 영향

`Equipment` → `EquipmentInstance` 의미 변경으로 다음 파일들의 테스트가 수정 필요:

- `gameStore.test.ts`: equipItem/unequipItem/sellEquipment 테스트가 baseId →
  instanceId 로 호출 (~10 테스트)
- `Inventory.test.tsx`, `Shop.test.tsx`: drop/buy 시 instance 생성 (~10 테스트)
- `equipment.test.ts` / `crafting.test.ts`: 신규 instance 모델로 (~10 테스트)

총 ≈ 30 기존 테스트 갱신 + ≥ 40 신규 = **목표 ≥ 290 vitest** (현 251).

### 10.3 E2E 추가

`e2e/full-game-flow.spec.ts` 또는 신규 `e2e/enhance-jobtree.spec.ts`:

- enhance flow: classSelect → start run → drop item → end run → Inventory → 강화
  버튼 → DR/stones 차감 + lv +1 visible
- jobtree: Town → 직업소 → 분기 탭 → 노드 1개 unlock → JP 차감 visible

ULT 발동 visual check 는 skip (sleep-flake 위험).

목표 e2e 18 + 1 = **19 e2e**.

## 11. 단일 plan 내 execution checkpoint (Q7=B + advisor)

mega-plan 1개 안에 5 checkpoint. 각 checkpoint 에서 typecheck + vitest 그린 확인
후 다음으로:

1. **CP1 — Instance refactor**
   - `Equipment` → `EquipmentBase` + `EquipmentInstance`
   - 모든 consumer 갱신 (Inventory/Shop/Battle/store/equipment system/quest/Asc keepEquipped)
   - persist v8 migration
   - 모든 instance 의 enhanceLv = 0 (강화 시스템 미구현)
   - 게임 동작은 v7 과 동일 (enhanceLv 가 0 이라 mult = 1)
   - vitest 갱신 + 신규 migration 테스트 (8 테스트)

2. **CP2 — Enhance 시스템**
   - `enhanceMultiplier` / `enhanceCost`
   - `store.enhanceItem` action
   - Inventory.tsx 강화 UI (item 카드 expand → +1 버튼)
   - vitest 신규 (curve / cost / store action — 14 테스트)

3. **CP3 — JobTree 데이터 + 화면**
   - `src/data/jobtree.ts` (300 노드 row, subagent 가 spec §3.4 heuristic 따라 작성)
   - `src/data/jobskills.ts` (12 ULT row)
   - `src/screens/JobTree.tsx` + Screen 타입 + Town 입구
   - `meta.jp/jpAwarded/jpCharLvAwarded/jobNodes` 필드 추가
   - 화면 = 분기 탭 + 노드 카드 (unlock 미동작 — visual only)
   - vitest 신규 (data shape / row count — 4 테스트)

4. **CP4 — JP + node unlock + reset**
   - `trackBossDefeat` → JP 부여
   - `gainLevels` → 마일스톤 JP 부여
   - `unlockJobNode` / `resetJobTree` action
   - JobTree.tsx 의 unlock/reset 버튼 wired
   - vitest 신규 (JP gain / unlock / reset — 14 테스트)

5. **CP5 — ULT + 노드 효과 통합**
   - `ultCooldownSec`
   - `jobTreeStatBonus` 합산을 `calcFinalStat` 에 통합
   - SkillSystem 이 unlock 된 ULT 를 active list 에 동적으로 push
   - skill_enhance 효과 (base active skill 의 cooldownSec / multiplier 변형)
   - ClassSelect 의 13 캐릭터 hard gate
   - e2e 1개 추가 (enhance + jobtree flow)
   - vitest 신규 (ULT cd / stat bonus — 5 테스트)
   - 마지막 typecheck + vitest + e2e + lint + circular + next build 모두 그린

## 12. Out-of-scope

본 spec 에서 다루지 않음:

- 13 비핵심 캐릭터 트리·정체성·6 base skill 본격 디자인 (별도 spec, 13 캐릭터
  unlock 시점에 작성)
- 수식어 (Modifier) 시스템 (Phase D — 본 spec 의 EquipmentInstance 모델 위에
  modifiers 필드 추가가 자연 확장)
- Mythic 유물 슬롯 / 누적 유물 / 차원 나침반 (Phase E)
- 온라인 / PvP / 길드 (300h spec §15)
- 마을 hub UI 본격 디자인 (별도 spec — 본 spec 은 Town.tsx 에 직업소 입구 1개만
  추가)
- 균형 시뮬레이션 스프레드시트 + 인플레이션 곡선 검증 (Phase I)
- effect-pipeline (도트/CC/디버프/반사 — 300h spec §8.6) — 일부 ULT (반격일도/
  흑주 등) 는 본 phase 에서 임시 매핑 (§3.5), Phase D 도착 시 정확한 효과로
  재구현
- BP 비례 소모 (300h spec §2.5 — 별도 phase A 마무리에서 처리. 본 spec 와 직교)
- 알파벳 숫자 표기 (300h spec §11.3 — 본 spec 와 직교)

## 13. 위험 / 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| Instance refactor 가 30+ consumer 모두 손댐 | 큼 | CP1 단일 checkpoint 로 일괄, 갱신 후 `pnpm typecheck` 그린이 되어야 다음 진행 |
| 300 노드 row 작업량 | 큼 | spec §3.4 heuristic + subagent 1명에게 전임. row schema 가 단순해서 자동 생성 친화적 |
| ULT polyfire 의 후반 power 폭발 | 중 | Asc Tier × Mythic enhance × ULT 4 동시 = 의도된 절정. 균형 검증은 Phase I (별도). 본 spec 는 메커니즘만 |
| persist v8 의 orphan equipped | 작 | migration 에서 silent drop. 사용자 입장 = 그냥 일부 equipped 가 풀림. 매우 드물게 일어날 케이스 |
| 합성 × enhance lv | 작 | 명시적 정책 (enhanceLv 0 으로 reset). UI 에서 경고 |
| ULT 임시 매핑 (디버프/반격 등) 이 후속 phase 에 부채 | 중 | spec out-of-scope 에 명시. Phase D 도착 시 재방문 |
| `crypto.randomUUID()` 가 일부 환경에서 미지원 | 작 | Node 19+ / jsdom 23+ 모두 지원. capacitor / Safari 모두 지원 (확인 필요 — plan 단계에서) |
| ULT cooldown 식이 너무 가팔라 만렙이 OP | 중 | balance fine-tune 은 Phase I. spec 의 식은 reasonable starting point |

## 14. 측정 / 완료 정의

다음 모두 그린이어야 phase-f2f3-complete:

- `pnpm typecheck` 0 error
- `pnpm lint` 0 error
- `pnpm test` ≥ 290 PASS
- `pnpm circular` 0
- `pnpm --filter @forge/game-inflation-rpg e2e` 19 PASS
- `next build` 통과
- 사용자 manual sanity check (강화 1회 + 트리 1 노드 unlock + ULT 발동 visual)

## 15. 후속 단계

본 phase 이후 추천 순서:

1. **콘텐츠 균형 패치** — F30 보상, 스킬 magnitude (small, optional)
2. **Phase D — 수식어 시스템** — EquipmentInstance 에 modifiers 필드 + 40 수식어
   풀 + reroll + effect-pipeline. 본 spec 의 instance 모델 위에 자연 확장.
3. **Phase E — 유물 + Mythic 슬롯** — Asc Tier 마일스톤 보상과 통합. 광고 인프라
   stub.
4. **Phase G — Asc Tree 노드** — F-1 의 ascPoints 소비처. 10 노드 종류.

13 비핵심 캐릭터 unlock + 트리·정체성 본격 디자인은 위 순서와 병렬 가능 (별도
spec).
