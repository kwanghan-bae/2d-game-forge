# Content Expansion Layer 3 — Craft + Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Content Expansion 스펙](../specs/2026-04-25-content-expansion-spec.md) 의 **Layer 3 (크래프트 + 퀘스트)** 구현. 같은 장비 3개 → 1 tier 합성, region 별 미션 시스템.

**Architecture:** `Quest` 인터페이스 + `MetaState` 확장 (questProgress/questsCompleted) + 합성 로직 (gold 차감 + 장비 변환) + Inventory 의 합성 탭 + region 별 quests.ts 정의 + Quests.tsx 신규 화면.

**Tech Stack:** TypeScript 5.6, React 19, Zustand 5, Vitest 4, Tailwind v4 + forge-ui registry components.

**Prerequisite:** Layer 1 (데이터) 완료 — 6 tier rarity, 41 equipment 카탈로그 사용. Layer 2 (던전) 완료 — stage 진행 / kill 카운터 활용.

---

## File Structure

### 신규
```
games/inflation-rpg/src/
├── data/quests.ts              # 신규: region 별 quest 정의
├── screens/Quests.tsx          # 신규: 퀘스트 목록 UI
├── screens/Quests.test.tsx     # 신규: 단위 테스트
└── systems/crafting.ts         # 신규: 합성 로직 (순수 함수)
```

### 수정
```
games/inflation-rpg/src/
├── types.ts                # Quest 인터페이스 + MetaState 확장
├── store/gameStore.ts      # 합성 액션 + 퀘스트 진행 + save 마이그레이션
├── screens/Inventory.tsx   # "합성" 탭 추가
├── screens/RegionMap.tsx   # 퀘스트 진행 배지
└── data/maps.test.ts       # 퀘스트 무결성 검증
```

---

## Task L3-1: 타입 확장 — Quest 인터페이스 + MetaState

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Quest 인터페이스 추가**

types.ts 끝에 추가:

```typescript
export type QuestType = 'kill_count' | 'boss_defeat' | 'item_collect';

export interface QuestTarget {
  monsterId?: string;    // kill_count 시 특정 몬스터 (없으면 region 의 모든 몬스터)
  bossId?: string;       // boss_defeat
  equipmentId?: string;  // item_collect
  count: number;         // 목표 카운트
}

export interface QuestReward {
  gold?: number;
  bp?: number;
  equipmentId?: string;
}

export interface Quest {
  id: string;
  regionId: string;
  nameKR: string;
  description: string;
  type: QuestType;
  target: QuestTarget;
  reward: QuestReward;
}
```

- [ ] **Step 2: `MetaState` 에 신규 필드 추가**

기존 `MetaState` 끝에 추가:

```typescript
export interface MetaState {
  // 기존 필드 …
  questProgress: Record<string, number>;  // questId → current count
  questsCompleted: string[];              // 완료한 questId 목록 (보상 수령 완료 포함)
}
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

**Expected**: gameStore 의 INITIAL_META_STATE 가 신규 필드 누락으로 fail. 다음 task 에서 fix.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add Quest interface and MetaState quest fields"
```

---

## Task L3-2: quests.ts — region 별 미션 정의

**Files:**
- Create: `games/inflation-rpg/src/data/quests.ts`

- [ ] **Step 1: quests.ts 작성 — 9 region × 3-5 quest = ~36 quests**

```typescript
import type { Quest } from '../types';

export const QUESTS: Quest[] = [
  // ── plains (4 quest) ──
  { id: 'q-plains-1', regionId: 'plains', nameKR: '도깨비 사냥꾼',
    description: '도깨비병사 100마리 처치',
    type: 'kill_count', target: { monsterId: 'plains-imp', count: 100 },
    reward: { gold: 5000, bp: 1 } },
  { id: 'q-plains-2', regionId: 'plains', nameKR: '망령 정화',
    description: '폐허의 망령 처치',
    type: 'boss_defeat', target: { bossId: 'plains-ghost', count: 1 },
    reward: { gold: 8000, equipmentId: 'a-iron' } },
  { id: 'q-plains-3', regionId: 'plains', nameKR: '평야 수집가',
    description: '단도 5개 수집',
    type: 'item_collect', target: { equipmentId: 'w-knife', count: 5 },
    reward: { gold: 3000 } },
  { id: 'q-plains-4', regionId: 'plains', nameKR: '평야의 군주',
    description: '평야의 군주 처치',
    type: 'boss_defeat', target: { bossId: 'plains-lord', count: 1 },
    reward: { gold: 30000, bp: 3 } },

  // ── forest (4 quest) ──
  { id: 'q-forest-1', regionId: 'forest', nameKR: '여우 사냥',
    description: '여우 50마리 처치',
    type: 'kill_count', target: { monsterId: 'forest-fox', count: 50 },
    reward: { gold: 6000, bp: 1 } },
  { id: 'q-forest-2', regionId: 'forest', nameKR: '구미호 토벌',
    description: '구미호 처치',
    type: 'boss_defeat', target: { bossId: 'gumiho', count: 1 },
    reward: { gold: 15000, equipmentId: 'w-vine-bow' } },
  { id: 'q-forest-3', regionId: 'forest', nameKR: '숲의 통치자',
    description: '숲의 통치자 처치',
    type: 'boss_defeat', target: { bossId: 'forest-ruler', count: 1 },
    reward: { gold: 50000, bp: 4 } },
  { id: 'q-forest-4', regionId: 'forest', nameKR: '곰 사냥꾼',
    description: '곰 30마리 처치',
    type: 'kill_count', target: { monsterId: 'forest-bear', count: 30 },
    reward: { gold: 8000 } },

  // ── mountains (4 quest) ──
  { id: 'q-mountains-1', regionId: 'mountains', nameKR: '도깨비 대장 토벌',
    description: '도깨비 대장 처치',
    type: 'boss_defeat', target: { bossId: 'goblin-chief', count: 1 },
    reward: { gold: 12000, equipmentId: 'a-iron' } },
  { id: 'q-mountains-2', regionId: 'mountains', nameKR: '관문 통과',
    description: '관문 수호신 처치',
    type: 'boss_defeat', target: { bossId: 'gate-guardian', count: 1 },
    reward: { gold: 18000, bp: 2 } },
  { id: 'q-mountains-3', regionId: 'mountains', nameKR: '회색곰 사냥',
    description: '회색곰 30마리 처치',
    type: 'kill_count', target: { monsterId: 'mountain-grey', count: 30 },
    reward: { gold: 25000, bp: 1 } },
  { id: 'q-mountains-4', regionId: 'mountains', nameKR: '광부의 한',
    description: '광부유령 50마리 처치',
    type: 'kill_count', target: { monsterId: 'mountain-miner', count: 50 },
    reward: { gold: 30000 } },

  // ── coast (3 quest) ──
  { id: 'q-coast-1', regionId: 'coast', nameKR: '해신의 노여움',
    description: '해신 처치',
    type: 'boss_defeat', target: { bossId: 'sea-god', count: 1 },
    reward: { gold: 40000, equipmentId: 'w-trident' } },
  { id: 'q-coast-2', regionId: 'coast', nameKR: '심해 어부',
    description: '심해어 50마리 처치',
    type: 'kill_count', target: { monsterId: 'coast-deepfish', count: 50 },
    reward: { gold: 50000, bp: 2 } },
  { id: 'q-coast-3', regionId: 'coast', nameKR: '인어의 노래',
    description: '인어 30마리 처치',
    type: 'kill_count', target: { monsterId: 'coast-mermaid', count: 30 },
    reward: { gold: 35000 } },

  // ── underground (3 quest) ──
  { id: 'q-cave-1', regionId: 'underground', nameKR: '동굴 탐험가',
    description: '거대거미 50마리 처치',
    type: 'kill_count', target: { monsterId: 'cave-spider', count: 50 },
    reward: { gold: 30000 } },
  { id: 'q-cave-2', regionId: 'underground', nameKR: '광부의 안식',
    description: '광부영혼 100마리 처치',
    type: 'kill_count', target: { monsterId: 'cave-miner-ghost', count: 100 },
    reward: { gold: 60000, equipmentId: 'w-pickaxe' } },
  { id: 'q-cave-3', regionId: 'underground', nameKR: '석상의 침묵',
    description: '석상골렘 30마리 처치',
    type: 'kill_count', target: { monsterId: 'cave-golem', count: 30 },
    reward: { gold: 80000, bp: 3 } },

  // ── heaven-realm (3 quest) ──
  { id: 'q-heaven-1', regionId: 'heaven-realm', nameKR: '봉황의 깃털',
    description: '봉황 10마리 처치',
    type: 'kill_count', target: { monsterId: 'heaven-phoenix', count: 10 },
    reward: { gold: 200000, equipmentId: 'w-celestial-spear' } },
  { id: 'q-heaven-2', regionId: 'heaven-realm', nameKR: '옥황상제 알현',
    description: '옥황상제 처치',
    type: 'boss_defeat', target: { bossId: 'jade-emperor', count: 1 },
    reward: { gold: 500000, bp: 5 } },
  { id: 'q-heaven-3', regionId: 'heaven-realm', nameKR: '신마 길들이기',
    description: '신마 30마리 처치',
    type: 'kill_count', target: { monsterId: 'heaven-horse', count: 30 },
    reward: { gold: 300000 } },

  // ── underworld (3 quest) ──
  { id: 'q-under-1', regionId: 'underworld', nameKR: '저승사자 처단',
    description: '저승사자 처치',
    type: 'boss_defeat', target: { bossId: 'death-reaper', count: 1 },
    reward: { gold: 400000, equipmentId: 'w-soulreaper' } },
  { id: 'q-under-2', regionId: 'underworld', nameKR: '망자의 길',
    description: '저승망자 100마리 처치',
    type: 'kill_count', target: { monsterId: 'under-dead', count: 100 },
    reward: { gold: 250000, bp: 3 } },
  { id: 'q-under-3', regionId: 'underworld', nameKR: '도깨비불 정화',
    description: '도깨비불 50마리 처치',
    type: 'kill_count', target: { monsterId: 'under-flame', count: 50 },
    reward: { gold: 350000 } },

  // ── chaos (3 quest) ──
  { id: 'q-chaos-1', regionId: 'chaos', nameKR: '혼돈 정화',
    description: '혼돈신 처치',
    type: 'boss_defeat', target: { bossId: 'chaos-god', count: 1 },
    reward: { gold: 1000000, equipmentId: 'acc-chaos-orb' } },
  { id: 'q-chaos-2', regionId: 'chaos', nameKR: '공허의 흔적',
    description: '공허파편 50마리 처치',
    type: 'kill_count', target: { monsterId: 'chaos-void', count: 50 },
    reward: { gold: 800000, bp: 4 } },
  { id: 'q-chaos-3', regionId: 'chaos', nameKR: '시간 파수꾼',
    description: '시간의 파수꾼 처치',
    type: 'boss_defeat', target: { bossId: 'time-warden', count: 1 },
    reward: { gold: 1500000, equipmentId: 'acc-time-shard' } },

  // ── final-realm (1 quest) ──
  { id: 'q-final-1', regionId: 'final-realm', nameKR: '종말의 시작',
    description: '최종보스 처치',
    type: 'boss_defeat', target: { bossId: 'final-boss', count: 1 },
    reward: { gold: 5000000, equipmentId: 'w-mythic-sword', bp: 8 } },
];

export function getQuestsForRegion(regionId: string): Quest[] {
  return QUESTS.filter(q => q.regionId === regionId);
}

export function getQuestById(id: string): Quest | undefined {
  return QUESTS.find(q => q.id === id);
}
```

총 ~28 quest. 9 region 모두 커버.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

여전히 INITIAL_META_STATE 누락 에러 — Step 4 에서 fix.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/quests.ts
git commit -m "feat(game-inflation-rpg): add 28 quests across 9 regions"
```

---

## Task L3-3: gameStore 확장 — 퀘스트 진행 + 합성 + save 마이그레이션

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: INITIAL_META_STATE 에 신규 필드 추가**

```bash
grep -n "questProgress\|questsCompleted\|INITIAL_META_STATE" games/inflation-rpg/src/store/gameStore.ts
```

INITIAL_META_STATE 에:
```typescript
questProgress: {},
questsCompleted: [],
```

- [ ] **Step 2: 퀘스트 진행 actions**

```typescript
incrementQuestProgress: (questId: string, by = 1) => set(state => {
  const current = state.meta.questProgress[questId] ?? 0;
  return {
    meta: {
      ...state.meta,
      questProgress: { ...state.meta.questProgress, [questId]: current + by },
    },
  };
}),

completeQuest: (questId: string) => set(state => {
  if (state.meta.questsCompleted.includes(questId)) return state;
  // 보상 적용 로직 (Quest 의 reward 읽어서 gold/bp/equipment 부여)
  // (구현은 서브 단계 — 여기서는 questsCompleted 에만 추가)
  return {
    meta: {
      ...state.meta,
      questsCompleted: [...state.meta.questsCompleted, questId],
    },
  };
}),
```

- [ ] **Step 3: 몬스터 처치 hook 으로 자동 진행**

기존 `incrementDungeonKill` 또는 BattleScene 의 처치 콜백에서 — quest 진행도 같이 증가:

```typescript
// gameStore 에 helper:
trackKill: (monsterId: string, regionId: string) => {
  const state = get();
  const relevantQuests = QUESTS.filter(q =>
    q.type === 'kill_count' &&
    !state.meta.questsCompleted.includes(q.id) &&
    (q.target.monsterId === monsterId ||
     (q.target.monsterId === undefined && q.regionId === regionId))
  );
  for (const q of relevantQuests) {
    get().incrementQuestProgress(q.id);
  }
},

trackBossDefeat: (bossId: string) => {
  const state = get();
  const relevantQuests = QUESTS.filter(q =>
    q.type === 'boss_defeat' &&
    q.target.bossId === bossId &&
    !state.meta.questsCompleted.includes(q.id)
  );
  for (const q of relevantQuests) {
    get().incrementQuestProgress(q.id);
  }
},

trackItemCollect: (equipmentId: string) => {
  const state = get();
  const relevantQuests = QUESTS.filter(q =>
    q.type === 'item_collect' &&
    q.target.equipmentId === equipmentId &&
    !state.meta.questsCompleted.includes(q.id)
  );
  for (const q of relevantQuests) {
    get().incrementQuestProgress(q.id);
  }
},
```

- [ ] **Step 4: 합성 액션 추가**

```typescript
craft: (equipmentId: string) => set(state => {
  // 같은 id 장비 3개 보유 확인
  // gold 비용 차감
  // 다음 tier 장비 1개 추가
  // 자세한 구현: systems/crafting.ts 의 함수 호출
  return state; // (다음 단계 craftEquipment 함수 import 후 호출)
}),
```

(자세한 구현은 L3-4 의 systems/crafting.ts 작성 후 채움)

- [ ] **Step 5: save 마이그레이션**

zustand persist 또는 load 함수 에서:
```typescript
function migrateMeta(loaded: any): MetaState {
  return {
    ...loaded,
    questProgress: loaded.questProgress ?? {},
    questsCompleted: loaded.questsCompleted ?? [],
  };
}
```

- [ ] **Step 6: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 122+ passed.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): add quest tracking + craft action stubs to gameStore"
```

---

## Task L3-4: systems/crafting.ts — 합성 로직

**Files:**
- Create: `games/inflation-rpg/src/systems/crafting.ts`
- Create: `games/inflation-rpg/src/systems/crafting.test.ts`

- [ ] **Step 1: crafting.ts 작성**

```typescript
import type { Equipment, EquipmentRarity } from '../types';
import { EQUIPMENT_CATALOG, getEquipmentById } from '../data/equipment';

const RARITY_ORDER: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const TIER_UP_COST: Record<EquipmentRarity, number> = {
  common: 100,
  uncommon: 500,
  rare: 2500,
  epic: 12000,
  legendary: 100000,
  mythic: 0, // 합성 불가
};

export function getNextTier(rarity: EquipmentRarity): EquipmentRarity | null {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
  return RARITY_ORDER[idx + 1]!;
}

export function getCraftCost(fromRarity: EquipmentRarity): number {
  return TIER_UP_COST[fromRarity];
}

/**
 * 같은 slot + 다음 tier 의 임의 장비 1개 선택.
 * 같은 base id 의 다음 tier 가 정의되어 있으면 우선 사용.
 */
export function pickCraftResult(source: Equipment): Equipment | null {
  const nextTier = getNextTier(source.rarity);
  if (!nextTier) return null;
  // 1. 동일 slot + 다음 tier 의 모든 장비
  const candidates = EQUIPMENT_CATALOG.filter(
    e => e.slot === source.slot && e.rarity === nextTier
  );
  if (candidates.length === 0) return null;
  // 2. 랜덤 선택
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

export interface CraftAttempt {
  ok: boolean;
  reason?: 'not-enough-items' | 'no-next-tier' | 'no-result' | 'not-enough-gold';
  result?: Equipment;
  cost?: number;
}

export function attemptCraft(
  inventoryItems: Equipment[],
  sourceId: string,
  gold: number,
): CraftAttempt {
  const source = getEquipmentById(sourceId);
  if (!source) return { ok: false, reason: 'not-enough-items' };
  const matching = inventoryItems.filter(i => i.id === sourceId);
  if (matching.length < 3) return { ok: false, reason: 'not-enough-items' };
  const nextTier = getNextTier(source.rarity);
  if (!nextTier) return { ok: false, reason: 'no-next-tier' };
  const cost = getCraftCost(source.rarity);
  if (gold < cost) return { ok: false, reason: 'not-enough-gold', cost };
  const result = pickCraftResult(source);
  if (!result) return { ok: false, reason: 'no-result' };
  return { ok: true, result, cost };
}
```

- [ ] **Step 2: crafting.test.ts 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { getNextTier, getCraftCost, pickCraftResult, attemptCraft } from './crafting';
import { getEquipmentById } from '../data/equipment';

describe('crafting', () => {
  it('getNextTier returns correct tier', () => {
    expect(getNextTier('common')).toBe('uncommon');
    expect(getNextTier('uncommon')).toBe('rare');
    expect(getNextTier('rare')).toBe('epic');
    expect(getNextTier('epic')).toBe('legendary');
    expect(getNextTier('legendary')).toBe('mythic');
    expect(getNextTier('mythic')).toBeNull();
  });

  it('getCraftCost increases with tier', () => {
    expect(getCraftCost('common')).toBeLessThan(getCraftCost('uncommon'));
    expect(getCraftCost('legendary')).toBeGreaterThan(getCraftCost('epic'));
  });

  it('pickCraftResult returns same slot + next tier', () => {
    const source = getEquipmentById('w-knife')!;
    const result = pickCraftResult(source);
    expect(result?.slot).toBe('weapon');
    expect(result?.rarity).toBe('uncommon');
  });

  it('pickCraftResult returns null for mythic', () => {
    const source = getEquipmentById('w-mythic-sword')!;
    expect(pickCraftResult(source)).toBeNull();
  });

  it('attemptCraft fails with not-enough-items', () => {
    const result = attemptCraft([], 'w-knife', 1000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-enough-items');
  });

  it('attemptCraft succeeds with 3+ items + gold', () => {
    const knife = getEquipmentById('w-knife')!;
    const result = attemptCraft([knife, knife, knife], 'w-knife', 1000);
    expect(result.ok).toBe(true);
    expect(result.result?.rarity).toBe('uncommon');
    expect(result.cost).toBe(100);
  });

  it('attemptCraft fails with insufficient gold', () => {
    const knife = getEquipmentById('w-knife')!;
    const result = attemptCraft([knife, knife, knife], 'w-knife', 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-enough-gold');
  });
});
```

- [ ] **Step 3: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test systems/crafting
```

Expected: 모두 통과.

- [ ] **Step 4: gameStore 의 craft action 구현 채움**

L3-3 에서 stub 으로 둔 `craft` action 을 attemptCraft 호출로 채움:

```typescript
craft: (equipmentId: string) => {
  const state = get();
  const allInventory = [
    ...state.meta.inventory.weapons,
    ...state.meta.inventory.armors,
    ...state.meta.inventory.accessories,
  ];
  const result = attemptCraft(allInventory, equipmentId, state.meta.gold);
  if (!result.ok || !result.result) return false;
  // 1. 같은 id 장비 3개 제거 (slot 별 inventory 에서)
  // 2. gold 차감
  // 3. result 장비 1개 추가
  // (구체 구현은 inventory state 구조 따라)
  return true;
},
```

(inventory 구조에 맞춰 정확히 구현)

- [ ] **Step 5: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 130+ passed (crafting tests 7 + 기존).

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/systems/crafting.ts \
        games/inflation-rpg/src/systems/crafting.test.ts \
        games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): add equipment crafting system + tests"
```

---

## Task L3-5: BattleScene + RegionMap 의 quest tracking 연동

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx` (이미 진입 → Dungeon 라우팅 됨, quest 배지 추가만)

- [ ] **Step 1: BattleScene 의 처치 콜백에 trackKill / trackBossDefeat 호출 추가**

기존 `incrementDungeonKill` 호출 다음에:
```typescript
const monsterId = /* current monster id */;
const regionId = /* current area regionId */;
useGameStore.getState().trackKill(monsterId, regionId);
```

보스 처치:
```typescript
useGameStore.getState().trackBossDefeat(bossId);
```

drop 획득 시 (장비 inventory 추가 콜백):
```typescript
useGameStore.getState().trackItemCollect(equipmentId);
```

- [ ] **Step 2: RegionMap 에 quest 진행 배지**

기존 region 클릭 화면에 미션 진행도 표시:
```tsx
{getQuestsForRegion(currentRegionId).map(q => {
  const progress = meta.questProgress[q.id] ?? 0;
  const completed = meta.questsCompleted.includes(q.id);
  return (
    <div key={q.id} style={{ ... }}>
      {completed ? '✅' : `${progress}/${q.target.count}`} {q.nameKR}
    </div>
  );
})}
```

(또는 별도 'Quests' 화면 — L3-6 에서 다룸)

- [ ] **Step 3: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts \
        games/inflation-rpg/src/screens/RegionMap.tsx
git commit -m "feat(game-inflation-rpg): wire quest tracking into BattleScene + RegionMap"
```

---

## Task L3-6: Quests.tsx 신규 화면 — 퀘스트 목록 + 보상 수령

**Files:**
- Create: `games/inflation-rpg/src/screens/Quests.tsx`
- Create: `games/inflation-rpg/src/screens/Quests.test.tsx`
- Modify: `games/inflation-rpg/src/types.ts` (Screen 에 'quests' 추가)
- Modify: `games/inflation-rpg/src/App.tsx` (라우팅)
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx` (Quests 진입 버튼)

- [ ] **Step 1: Screen 에 'quests' 추가**

types.ts:
```typescript
export type Screen = | ... | 'quests';
```

- [ ] **Step 2: Quests.tsx 작성**

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { QUESTS } from '../data/quests';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function Quests() {
  const meta = useGameStore(s => s.meta);
  const completeQuest = useGameStore(s => s.completeQuest);
  const setScreen = useGameStore(s => s.setScreen);

  const eligibleToClaim = QUESTS.filter(q => {
    if (meta.questsCompleted.includes(q.id)) return false;
    const progress = meta.questProgress[q.id] ?? 0;
    return progress >= q.target.count;
  });

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px' }}>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>퀘스트</h2>
      </div>
      {QUESTS.map(q => {
        const progress = meta.questProgress[q.id] ?? 0;
        const completed = meta.questsCompleted.includes(q.id);
        const claimable = !completed && progress >= q.target.count;
        return (
          <ForgePanel key={q.id} style={{ margin: '8px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>{q.nameKR}</span>
              <span style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                {q.regionId}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', margin: '6px 0' }}>
              {q.description}
            </div>
            <div style={{ fontSize: 12 }}>
              진행: {Math.min(progress, q.target.count)} / {q.target.count}
            </div>
            <div style={{ fontSize: 11, color: 'var(--forge-accent)', marginTop: 4 }}>
              보상: {q.reward.gold ? `${q.reward.gold}G ` : ''}
              {q.reward.bp ? `BP+${q.reward.bp} ` : ''}
              {q.reward.equipmentId ? `${q.reward.equipmentId} ` : ''}
            </div>
            {claimable && (
              <ForgeButton variant="primary" style={{ marginTop: 8 }} onClick={() => completeQuest(q.id)}>
                보상 수령
              </ForgeButton>
            )}
            {completed && (
              <div style={{ marginTop: 8, color: 'var(--forge-stat-hp)', fontSize: 12 }}>
                ✅ 완료
              </div>
            )}
          </ForgePanel>
        );
      })}
      <div style={{ padding: 16 }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('world-map')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
```

- [ ] **Step 3: 단위 테스트 — Quests.test.tsx**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Quests } from './Quests';
import { useGameStore } from '../store/gameStore';

describe('Quests', () => {
  beforeEach(() => {
    useGameStore.setState({
      meta: {
        // 기본 meta state + questProgress / questsCompleted
        inventory: { weapons: [], armors: [], accessories: [] },
        baseAbilityLevel: 0,
        soulGrade: 0,
        hardModeUnlocked: false,
        characterLevels: {},
        bestRunLevel: 0,
        normalBossesKilled: [],
        hardBossesKilled: [],
        gold: 0,
        equippedItemIds: [],
        equipSlotCount: 1,
        lastPlayedCharId: '',
        questProgress: { 'q-plains-1': 100 },
        questsCompleted: [],
      },
    } as any);
  });

  it('shows progress for active quest', () => {
    render(<Quests />);
    expect(screen.getByText(/도깨비 사냥꾼/)).toBeInTheDocument();
  });

  it('shows claim button when quest target met', () => {
    render(<Quests />);
    expect(screen.getByText(/보상 수령/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: App.tsx 에 'quests' case 추가**

```typescript
case 'quests': return <Quests />;
```

- [ ] **Step 5: RegionMap 에 Quests 진입 버튼**

```tsx
<ForgeButton onClick={() => setScreen('quests')}>퀘스트</ForgeButton>
```

- [ ] **Step 6: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 132+ passed.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/screens/Quests.tsx \
        games/inflation-rpg/src/screens/Quests.test.tsx \
        games/inflation-rpg/src/types.ts \
        games/inflation-rpg/src/App.tsx \
        games/inflation-rpg/src/screens/RegionMap.tsx
git commit -m "feat(game-inflation-rpg): add Quests screen + reward claim flow"
```

---

## Task L3-7: Inventory 의 합성 탭

**Files:**
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`

- [ ] **Step 1: 합성 가능한 장비 식별**

```typescript
import { attemptCraft } from '../systems/crafting';

const craftable = useMemo(() => {
  const allItems = [...inventory.weapons, ...inventory.armors, ...inventory.accessories];
  const groups: Record<string, number> = {};
  for (const item of allItems) {
    groups[item.id] = (groups[item.id] ?? 0) + 1;
  }
  return Object.entries(groups).filter(([, count]) => count >= 3);
}, [inventory]);
```

- [ ] **Step 2: 합성 탭 추가 + UI**

```tsx
{craftable.map(([id, count]) => {
  const item = getEquipmentById(id);
  if (!item) return null;
  const cost = getCraftCost(item.rarity);
  return (
    <ForgePanel key={id}>
      <span>{item.name} ×{count}</span>
      <span>비용: {cost}G</span>
      <ForgeButton variant="primary" onClick={() => craft(id)}>
        합성
      </ForgeButton>
    </ForgePanel>
  );
})}
```

- [ ] **Step 3: typecheck + test**

Expected: 0 exit, 132+ passed.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/Inventory.tsx
git commit -m "feat(game-inflation-rpg): add craft tab to Inventory"
```

---

## Task L3-8: maps.test.ts 의 quest 무결성 검증

**Files:**
- Modify: `games/inflation-rpg/src/data/maps.test.ts`

- [ ] **Step 1: Quest 무결성 검증**

```typescript
import { QUESTS } from './quests';

describe('Layer 3 quest integrity', () => {
  it('every quest has valid regionId', () => {
    const regionIds = new Set(REGIONS.map(r => r.id));
    for (const q of QUESTS) {
      expect(regionIds.has(q.regionId), `${q.id} regionId`).toBe(true);
    }
  });

  it('boss_defeat quests reference existing bosses', () => {
    const bossIds = new Set(BOSSES.map(b => b.id));
    for (const q of QUESTS) {
      if (q.type === 'boss_defeat' && q.target.bossId) {
        expect(bossIds.has(q.target.bossId), `${q.id} bossId`).toBe(true);
      }
    }
  });

  it('item_collect quests reference existing equipment', () => {
    const equipmentIds = new Set(EQUIPMENT_CATALOG.map(e => e.id));
    for (const q of QUESTS) {
      if (q.type === 'item_collect' && q.target.equipmentId) {
        expect(equipmentIds.has(q.target.equipmentId), `${q.id}`).toBe(true);
      }
    }
  });

  it('reward equipment IDs are valid', () => {
    const equipmentIds = new Set(EQUIPMENT_CATALOG.map(e => e.id));
    for (const q of QUESTS) {
      if (q.reward.equipmentId) {
        expect(equipmentIds.has(q.reward.equipmentId), `${q.id} reward`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test data/maps.test
```

Expected: 통과. 만약 fail 시 quests.ts 의 잘못된 참조 fix.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/maps.test.ts
git commit -m "test(game-inflation-rpg): verify Layer 3 quest integrity"
```

---

## Task L3-9: 통합 검증 + Phase tag

- [ ] **Step 1: 전체 검증**

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm circular
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: 모두 0 exit, 132+ passed.

- [ ] **Step 2: 정량 검증**

```bash
echo "Quests: $(grep -c "id: 'q-" games/inflation-rpg/src/data/quests.ts)"
# Expected: 28+
```

- [ ] **Step 3: Phase tag**

```bash
git tag phase-content-craft-quest-complete
git log --oneline phase-content-dungeon-complete..HEAD
```

---

## 요약

Layer 3 완료 시:
- 28+ quest 정의 (9 region 커버)
- 합성 시스템 (3 → 1 tier 상승)
- Quests 화면 + Inventory 합성 탭
- BattleScene 자동 quest tracking
- save 마이그레이션 (questProgress, questsCompleted)

다음: Layer 4 (스킬) — `2026-04-28-content-layer4-skills-plan.md`.

**End of Layer 3 plan. Total tasks: 9. Estimated commits: 9.**
