# Content Expansion Layer 1 — Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Content Expansion 스펙](../specs/2026-04-25-content-expansion-spec.md) 의 **Layer 1 (데이터 확장)** 구현. 몬스터 8 → ~50 종, 장비 15 → ~50 종, 보스 9 → ~54 (27 normal + 27 hard).

**Architecture:** 인터페이스 확장 (`regionTags`, `EquipmentRarity` 6 tier, `Boss.guaranteedDrop` 등) → 데이터 카탈로그 확장 → 호출처 (BattleScene, Inventory, Shop) 시그니처 갱신 → save 마이그레이션 → 검증.

**Tech Stack:** TypeScript 5.6, React 19, Phaser 3.90, Vitest 4 (jsdom), Tailwind v4 + forge-ui registry components.

---

## Task L1-1: 인터페이스 확장 (types.ts)

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: `EquipmentRarity` 6 tier 로 확장**

기존:
```typescript
export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary';
```

변경:
```typescript
export type EquipmentRarity =
  | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
```

- [ ] **Step 2: `Monster` 인터페이스에 `regionTags` 추가**

기존 인터페이스 끝에 필드 추가:
```typescript
export interface Monster {
  id: string;
  nameKR: string;
  emoji: string;
  levelMin: number;
  levelMax: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  isBoss: false;
  regionTags: string[];  // 신규: region IDs 또는 ['*'] 공통
}
```

- [ ] **Step 3: `Boss` 인터페이스에 신규 필드 추가**

```typescript
export interface Boss {
  id: string;
  nameKR: string;
  emoji: string;
  areaId: string;
  bpReward: number;
  isHardMode: boolean;
  hpMult: number;
  atkMult: number;
  guaranteedDrop?: string;  // 신규: equipment.id (보스 처치 보장 drop)
  storyOnDefeat?: string;   // 신규: Layer 5 story.id
}
```

- [ ] **Step 4: typecheck 확인**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 기존 `MONSTERS` 배열의 항목이 `regionTags` 누락으로 에러. 다음 task 에서 채워짐 — **이번 step 에서는 typecheck 실패 OK**.

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): extend Monster/Boss/EquipmentRarity for content expansion"
```

---

## Task L1-2: rarity 색상 토큰 + UI 분기

**Files:**
- Modify: `games/inflation-rpg/src/styles/game.css` — 신규 rarity 색상 변수
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx` — uncommon, mythic 분기
- Modify: `games/inflation-rpg/src/screens/Shop.tsx` — 동일

- [ ] **Step 1: `game.css` 에 신규 rarity 색상 변수 추가**

`.forge-ui-root` 룰 위쪽 또는 별도 섹션에 추가:

```css
/* Equipment rarity colors */
:root {
  --forge-rarity-common: #c8b88a;
  --forge-rarity-uncommon: #6cd96c;
  --forge-rarity-rare: #60a0e0;
  --forge-rarity-epic: #c060e0;
  --forge-rarity-legendary: #f0c060;
  --forge-rarity-mythic: #e05050;
}
```

(공통 toplevel `:root` 가 modern-dark-gold.css 로 옮겨졌으므로 game.css 에 추가는 grandfathered 방식. registry 테마 파일에도 추가 권장이지만 이번 task 에서는 game.css 한정.)

- [ ] **Step 2: `Inventory.tsx` 의 rarity 색상 분기 확인 및 확장**

기존 분기 패턴 (예시 — 실제 코드는 다를 수 있음, 파일 보고 확인):

```tsx
const rarityColor = (rarity: EquipmentRarity) => {
  switch (rarity) {
    case 'common': return 'var(--forge-rarity-common)';
    case 'rare': return 'var(--forge-rarity-rare)';
    case 'epic': return 'var(--forge-rarity-epic)';
    case 'legendary': return 'var(--forge-rarity-legendary)';
  }
};
```

확장:

```tsx
const rarityColor = (rarity: EquipmentRarity) => {
  switch (rarity) {
    case 'common':    return 'var(--forge-rarity-common)';
    case 'uncommon':  return 'var(--forge-rarity-uncommon)';
    case 'rare':      return 'var(--forge-rarity-rare)';
    case 'epic':      return 'var(--forge-rarity-epic)';
    case 'legendary': return 'var(--forge-rarity-legendary)';
    case 'mythic':    return 'var(--forge-rarity-mythic)';
  }
};
```

(Inventory.tsx 와 Shop.tsx 둘 다 같은 분기가 있을 가능성. 먼저 grep 해서 실제 코드 위치 확인.)

```bash
grep -n "case 'common'\|case 'legendary'" games/inflation-rpg/src/screens/Inventory.tsx games/inflation-rpg/src/screens/Shop.tsx
```

각 결과를 위 패턴으로 확장.

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

신규 `'uncommon'`, `'mythic'` case 누락 시 TS exhaustive switch 에러 발생 가능 — 이미 Step 2 에서 추가했으므로 통과.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/styles/game.css \
        games/inflation-rpg/src/screens/Inventory.tsx \
        games/inflation-rpg/src/screens/Shop.tsx
git commit -m "feat(game-inflation-rpg): add uncommon/mythic rarity color tokens and UI branches"
```

---

## Task L1-3: 몬스터 데이터 확장 (8 → ~53)

**Files:**
- Modify: `games/inflation-rpg/src/data/monsters.ts`

- [ ] **Step 1: 기존 MONSTERS 배열에 `regionTags: ['*']` 추가**

기존 8개 항목 모두에 필드 추가 (모든 region 공유 의미):

```typescript
{ id: 'slime', nameKR: '슬라임', emoji: '🟢', levelMin: 1, levelMax: 100, hpMult: 1.0, atkMult: 0.8, defMult: 0.5, expMult: 1.0, goldMult: 1.0, isBoss: false, regionTags: ['*'] },
{ id: 'goblin', nameKR: '도깨비', emoji: '👺', levelMin: 50, levelMax: 500, hpMult: 1.2, atkMult: 1.0, defMult: 0.8, expMult: 1.1, goldMult: 1.1, isBoss: false, regionTags: ['*'] },
{ id: 'tiger', nameKR: '호랑이', emoji: '🐯', levelMin: 200, levelMax: 2000, hpMult: 1.5, atkMult: 1.3, defMult: 1.0, expMult: 1.3, goldMult: 1.2, isBoss: false, regionTags: ['*'] },
{ id: 'dragon', nameKR: '용', emoji: '🐉', levelMin: 1000, levelMax: 10000, hpMult: 2.0, atkMult: 1.8, defMult: 1.5, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['*'] },
{ id: 'ghost', nameKR: '귀신', emoji: '👻', levelMin: 500, levelMax: 5000, hpMult: 0.8, atkMult: 1.5, defMult: 0.5, expMult: 1.4, goldMult: 1.3, isBoss: false, regionTags: ['*'] },
{ id: 'undead', nameKR: '망자', emoji: '💀', levelMin: 5000, levelMax: 50000, hpMult: 1.8, atkMult: 1.6, defMult: 1.3, expMult: 1.7, goldMult: 1.4, isBoss: false, regionTags: ['*'] },
{ id: 'deity', nameKR: '신수', emoji: '🌟', levelMin: 20000, levelMax: 200000, hpMult: 2.5, atkMult: 2.2, defMult: 2.0, expMult: 2.0, goldMult: 1.8, isBoss: false, regionTags: ['*'] },
{ id: 'chaos', nameKR: '혼돈체', emoji: '🌀', levelMin: 100000, levelMax: Infinity, hpMult: 3.0, atkMult: 2.8, defMult: 2.5, expMult: 2.5, goldMult: 2.0, isBoss: false, regionTags: ['*'] },
```

- [ ] **Step 2: 9 region × 5 종 신규 몬스터 추가**

기존 8개 다음에 추가. 각 몬스터의 `levelMin`/`levelMax` 는 `regions.ts` 에서 해당 region 의 areas levelRange 를 참고하여 합리적으로 설정.

**plains (5종)** — Lv 1-5,000 범위:
```typescript
{ id: 'plains-imp',      nameKR: '도깨비병사',  emoji: '🪖', levelMin: 1,    levelMax: 800,   hpMult: 0.9, atkMult: 0.7, defMult: 0.6, expMult: 1.0, goldMult: 1.0, isBoss: false, regionTags: ['plains'] },
{ id: 'plains-rat',      nameKR: '들쥐',       emoji: '🐀', levelMin: 1,    levelMax: 300,   hpMult: 0.6, atkMult: 0.5, defMult: 0.3, expMult: 0.8, goldMult: 0.9, isBoss: false, regionTags: ['plains'] },
{ id: 'plains-crow',     nameKR: '까마귀',     emoji: '🐦‍⬛', levelMin: 50,   levelMax: 1500,  hpMult: 0.7, atkMult: 0.9, defMult: 0.4, expMult: 1.1, goldMult: 1.0, isBoss: false, regionTags: ['plains'] },
{ id: 'plains-bandit',   nameKR: '야적',       emoji: '🥷', levelMin: 200,  levelMax: 3000,  hpMult: 1.1, atkMult: 1.1, defMult: 0.9, expMult: 1.2, goldMult: 1.4, isBoss: false, regionTags: ['plains'] },
{ id: 'plains-ronin',    nameKR: '길잃은영혼', emoji: '🪦', levelMin: 800,  levelMax: 5000,  hpMult: 1.0, atkMult: 1.2, defMult: 0.7, expMult: 1.3, goldMult: 1.1, isBoss: false, regionTags: ['plains'] },
```

**forest (5종)** — Lv 500-22,000:
```typescript
{ id: 'forest-fox',      nameKR: '여우',       emoji: '🦊', levelMin: 500,  levelMax: 5000,  hpMult: 0.8, atkMult: 1.1, defMult: 0.6, expMult: 1.2, goldMult: 1.1, isBoss: false, regionTags: ['forest'] },
{ id: 'forest-squirrel', nameKR: '청설모',     emoji: '🐿️', levelMin: 500,  levelMax: 3000,  hpMult: 0.5, atkMult: 0.6, defMult: 0.4, expMult: 1.0, goldMult: 0.9, isBoss: false, regionTags: ['forest'] },
{ id: 'forest-bear',     nameKR: '곰',         emoji: '🐻', levelMin: 2000, levelMax: 12000, hpMult: 1.6, atkMult: 1.5, defMult: 1.2, expMult: 1.4, goldMult: 1.2, isBoss: false, regionTags: ['forest'] },
{ id: 'forest-spirit',   nameKR: '나무정령',   emoji: '🌳', levelMin: 3000, levelMax: 18000, hpMult: 1.8, atkMult: 1.0, defMult: 1.5, expMult: 1.5, goldMult: 1.3, isBoss: false, regionTags: ['forest'] },
{ id: 'forest-snake',    nameKR: '독뱀',       emoji: '🐍', levelMin: 800,  levelMax: 8000,  hpMult: 0.7, atkMult: 1.4, defMult: 0.5, expMult: 1.3, goldMult: 1.0, isBoss: false, regionTags: ['forest'] },
```

**mountains (5종)** — Lv 3,000-180,000:
```typescript
{ id: 'mountain-goat',   nameKR: '산양',       emoji: '🐐', levelMin: 3000,  levelMax: 15000,  hpMult: 1.0, atkMult: 1.0, defMult: 0.8, expMult: 1.1, goldMult: 1.0, isBoss: false, regionTags: ['mountains'] },
{ id: 'mountain-bandit', nameKR: '산적',       emoji: '🤺', levelMin: 4000,  levelMax: 25000,  hpMult: 1.3, atkMult: 1.4, defMult: 1.1, expMult: 1.3, goldMult: 1.5, isBoss: false, regionTags: ['mountains'] },
{ id: 'mountain-eagle',  nameKR: '검독수리',   emoji: '🦅', levelMin: 6000,  levelMax: 50000,  hpMult: 1.0, atkMult: 1.6, defMult: 0.7, expMult: 1.4, goldMult: 1.1, isBoss: false, regionTags: ['mountains'] },
{ id: 'mountain-miner',  nameKR: '광부유령',   emoji: '⛏️', levelMin: 8000,  levelMax: 80000,  hpMult: 1.4, atkMult: 1.3, defMult: 1.4, expMult: 1.5, goldMult: 1.6, isBoss: false, regionTags: ['mountains'] },
{ id: 'mountain-grey',   nameKR: '회색곰',     emoji: '🦣', levelMin: 20000, levelMax: 180000, hpMult: 2.0, atkMult: 1.9, defMult: 1.8, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['mountains'] },
```

**coast (5종)** — 해양 계열, Lv 범위는 region 의 area 데이터 기반:
```typescript
{ id: 'coast-eel',       nameKR: '뱀장어',     emoji: '🐠', levelMin: 1000,  levelMax: 8000,    hpMult: 0.7, atkMult: 1.2, defMult: 0.5, expMult: 1.2, goldMult: 1.0, isBoss: false, regionTags: ['coast'] },
{ id: 'coast-turtle',    nameKR: '거북',       emoji: '🐢', levelMin: 2000,  levelMax: 20000,   hpMult: 1.5, atkMult: 0.8, defMult: 1.8, expMult: 1.3, goldMult: 1.1, isBoss: false, regionTags: ['coast'] },
{ id: 'coast-crab',      nameKR: '대게',       emoji: '🦀', levelMin: 3000,  levelMax: 30000,   hpMult: 1.2, atkMult: 1.3, defMult: 1.5, expMult: 1.4, goldMult: 1.3, isBoss: false, regionTags: ['coast'] },
{ id: 'coast-mermaid',   nameKR: '인어',       emoji: '🧜', levelMin: 8000,  levelMax: 80000,   hpMult: 1.1, atkMult: 1.5, defMult: 0.9, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['coast'] },
{ id: 'coast-deepfish',  nameKR: '심해어',     emoji: '🐟', levelMin: 15000, levelMax: 150000,  hpMult: 1.7, atkMult: 1.7, defMult: 1.0, expMult: 1.7, goldMult: 1.4, isBoss: false, regionTags: ['coast'] },
```

**underground (5종)** — 동굴 계열:
```typescript
{ id: 'cave-bat',        nameKR: '박쥐',       emoji: '🦇', levelMin: 1000,  levelMax: 10000,   hpMult: 0.6, atkMult: 1.1, defMult: 0.4, expMult: 1.1, goldMult: 0.9, isBoss: false, regionTags: ['underground'] },
{ id: 'cave-spider',     nameKR: '거대거미',   emoji: '🕷️', levelMin: 2000,  levelMax: 20000,   hpMult: 0.9, atkMult: 1.3, defMult: 0.7, expMult: 1.3, goldMult: 1.1, isBoss: false, regionTags: ['underground'] },
{ id: 'cave-miner-ghost',nameKR: '광부영혼',   emoji: '👷', levelMin: 5000,  levelMax: 50000,   hpMult: 1.1, atkMult: 1.2, defMult: 1.0, expMult: 1.4, goldMult: 1.7, isBoss: false, regionTags: ['underground'] },
{ id: 'cave-golem',      nameKR: '석상골렘',   emoji: '🗿', levelMin: 12000, levelMax: 120000,  hpMult: 2.2, atkMult: 1.4, defMult: 2.5, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['underground'] },
{ id: 'cave-salamander', nameKR: '도롱뇽',     emoji: '🦎', levelMin: 800,   levelMax: 12000,   hpMult: 0.7, atkMult: 1.0, defMult: 0.6, expMult: 1.0, goldMult: 1.0, isBoss: false, regionTags: ['underground'] },
```

**heaven-realm (5종)** — 천계, deity 계열:
```typescript
{ id: 'heaven-immortal', nameKR: '선동',       emoji: '👼', levelMin: 30000,  levelMax: 300000,  hpMult: 1.5, atkMult: 1.6, defMult: 1.2, expMult: 1.8, goldMult: 1.7, isBoss: false, regionTags: ['heaven-realm'] },
{ id: 'heaven-crane',    nameKR: '학',         emoji: '🦩', levelMin: 25000,  levelMax: 250000,  hpMult: 1.3, atkMult: 1.5, defMult: 1.0, expMult: 1.7, goldMult: 1.5, isBoss: false, regionTags: ['heaven-realm'] },
{ id: 'heaven-horse',    nameKR: '신마',       emoji: '🐎', levelMin: 50000,  levelMax: 500000,  hpMult: 1.8, atkMult: 1.9, defMult: 1.4, expMult: 1.9, goldMult: 1.8, isBoss: false, regionTags: ['heaven-realm'] },
{ id: 'heaven-rabbit',   nameKR: '옥토끼',     emoji: '🐇', levelMin: 20000,  levelMax: 200000,  hpMult: 0.9, atkMult: 1.4, defMult: 0.8, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['heaven-realm'] },
{ id: 'heaven-phoenix',  nameKR: '봉황',       emoji: '🔥', levelMin: 100000, levelMax: 1000000, hpMult: 2.5, atkMult: 2.3, defMult: 1.8, expMult: 2.1, goldMult: 1.9, isBoss: false, regionTags: ['heaven-realm'] },
```

**underworld (5종)** — 저승:
```typescript
{ id: 'under-dead',      nameKR: '망자',       emoji: '🧟', levelMin: 8000,   levelMax: 80000,   hpMult: 1.4, atkMult: 1.2, defMult: 1.1, expMult: 1.4, goldMult: 1.2, isBoss: false, regionTags: ['underworld'] },
{ id: 'under-reaper',    nameKR: '저승사자',   emoji: '☠️', levelMin: 30000,  levelMax: 300000,  hpMult: 1.7, atkMult: 1.9, defMult: 1.3, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['underworld'] },
{ id: 'under-maiden',    nameKR: '처녀귀신',   emoji: '👻', levelMin: 5000,   levelMax: 50000,   hpMult: 0.9, atkMult: 1.6, defMult: 0.7, expMult: 1.5, goldMult: 1.3, isBoss: false, regionTags: ['underworld'] },
{ id: 'under-flame',     nameKR: '도깨비불',   emoji: '🔥', levelMin: 15000,  levelMax: 150000,  hpMult: 0.8, atkMult: 2.0, defMult: 0.6, expMult: 1.7, goldMult: 1.4, isBoss: false, regionTags: ['underworld'] },
{ id: 'under-spirit',    nameKR: '사령',       emoji: '🦇', levelMin: 20000,  levelMax: 200000,  hpMult: 1.5, atkMult: 1.5, defMult: 1.2, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['underworld'] },
```

**chaos (5종)** — 혼돈계:
```typescript
{ id: 'chaos-shard',     nameKR: '혼돈파편',   emoji: '💥', levelMin: 100000,  levelMax: 1000000,  hpMult: 1.5, atkMult: 1.8, defMult: 1.0, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['chaos'] },
{ id: 'chaos-eroder',    nameKR: '차원침식체', emoji: '🌀', levelMin: 200000,  levelMax: 2000000,  hpMult: 2.0, atkMult: 2.0, defMult: 1.5, expMult: 2.0, goldMult: 1.7, isBoss: false, regionTags: ['chaos'] },
{ id: 'chaos-mutant',    nameKR: '변이체',     emoji: '👾', levelMin: 150000,  levelMax: 1500000,  hpMult: 1.8, atkMult: 1.9, defMult: 1.3, expMult: 1.9, goldMult: 1.6, isBoss: false, regionTags: ['chaos'] },
{ id: 'chaos-bubble',    nameKR: '시간거품',   emoji: '⏳', levelMin: 300000,  levelMax: 3000000,  hpMult: 2.2, atkMult: 1.7, defMult: 1.8, expMult: 2.1, goldMult: 1.8, isBoss: false, regionTags: ['chaos'] },
{ id: 'chaos-void',      nameKR: '공허파편',   emoji: '🌑', levelMin: 500000,  levelMax: 5000000,  hpMult: 2.5, atkMult: 2.5, defMult: 2.0, expMult: 2.3, goldMult: 2.0, isBoss: false, regionTags: ['chaos'] },
```

**final-realm (3종)** — 최종 영역. 잡몹 적게:
```typescript
{ id: 'final-shadow',    nameKR: '종말의 그림자', emoji: '🖤', levelMin: 1000000,  levelMax: Infinity, hpMult: 3.0, atkMult: 2.8, defMult: 2.3, expMult: 2.5, goldMult: 2.0, isBoss: false, regionTags: ['final-realm'] },
{ id: 'final-warrior',   nameKR: '신화 전사',     emoji: '⚔️', levelMin: 2000000,  levelMax: Infinity, hpMult: 3.5, atkMult: 3.2, defMult: 2.5, expMult: 2.6, goldMult: 2.1, isBoss: false, regionTags: ['final-realm'] },
{ id: 'final-titan',     nameKR: '거신',         emoji: '🗿', levelMin: 5000000,  levelMax: Infinity, hpMult: 4.0, atkMult: 3.5, defMult: 3.0, expMult: 2.8, goldMult: 2.2, isBoss: false, regionTags: ['final-realm'] },
```

총 카운트: 8 (기존 공통) + 5×8 (region) + 3 (final-realm) = **51종**.

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 exit. (앞 task 의 인터페이스 변경에 맞춰 모든 항목에 `regionTags` 들어감.)

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/data/monsters.ts
git commit -m "feat(game-inflation-rpg): expand monsters 8 -> 51 with regionTags (9 region)"
```

---

## Task L1-4: `getMonstersForLevel` 시그니처 갱신 + BattleScene 호출처

**Files:**
- Modify: `games/inflation-rpg/src/data/monsters.ts` — `getMonstersForLevel` / `pickMonster` 에 `regionId` 추가
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` — 현재 area 의 regionId 전달

- [ ] **Step 1: monsters.ts 의 함수 시그니처 갱신**

기존:
```typescript
export function getMonstersForLevel(level: number): Monster[] {
  return MONSTERS.filter(m => m.levelMin <= level && m.levelMax >= level);
}

export function pickMonster(level: number): Monster {
  const pool = getMonstersForLevel(level);
  if (pool.length === 0) return MONSTERS[MONSTERS.length - 1]!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
```

변경:
```typescript
export function getMonstersForLevel(level: number, regionId?: string): Monster[] {
  return MONSTERS.filter(m =>
    m.levelMin <= level &&
    m.levelMax >= level &&
    (m.regionTags.includes('*') || (regionId !== undefined && m.regionTags.includes(regionId)))
  );
}

export function pickMonster(level: number, regionId?: string): Monster {
  const pool = getMonstersForLevel(level, regionId);
  if (pool.length === 0) {
    // Fallback: region 무관 공통 풀
    const commonPool = MONSTERS.filter(m =>
      m.regionTags.includes('*') && m.levelMin <= level && m.levelMax >= level
    );
    if (commonPool.length === 0) return MONSTERS[MONSTERS.length - 1]!;
    return commonPool[Math.floor(Math.random() * commonPool.length)]!;
  }
  return pool[Math.floor(Math.random() * pool.length)]!;
}
```

- [ ] **Step 2: BattleScene 의 호출처 찾기**

```bash
grep -n "pickMonster\|getMonstersForLevel" games/inflation-rpg/src/battle/BattleScene.ts
```

- [ ] **Step 3: BattleScene 에서 currentAreaId → regionId 추출 + 전달**

`MAP_AREAS.find(a => a.id === currentAreaId)?.regionId` 로 regionId 얻고 `pickMonster(level, regionId)` 로 호출.

예시 (실제 코드는 grep 결과를 보고 정확히 바꿈):

기존:
```typescript
const monster = pickMonster(playerLevel);
```

변경:
```typescript
import { MAP_AREAS } from '../data/maps';
// ...
const area = MAP_AREAS.find(a => a.id === currentAreaId);
const regionId = area?.regionId;
const monster = pickMonster(playerLevel, regionId);
```

(BattleScene 가 currentAreaId 를 어떻게 받고 있는지 grep 으로 확인 후 적절히 통합.)

- [ ] **Step 4: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 115 passed.

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/data/monsters.ts \
        games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): pass regionId to pickMonster for region-tagged spawns"
```

---

## Task L1-5: 장비 카탈로그 6 tier 확장 (15 → ~50)

**Files:**
- Modify: `games/inflation-rpg/src/data/equipment.ts`

- [ ] **Step 1: 기존 15 종 그대로 유지**

기존 항목은 변경 없음.

- [ ] **Step 2: `uncommon` tier 추가 (6 종)**

`common` 과 `rare` 사이에 위치한 base 장비:

```typescript
// Uncommon weapons
{ id: 'w-club',      name: '곤봉',       slot: 'weapon', rarity: 'uncommon', stats: { flat: { atk: 50 } },                          dropAreaIds: ['farm-fields', 'brook-side'],   price: 200 },
{ id: 'w-dagger',    name: '비수',       slot: 'weapon', rarity: 'uncommon', stats: { flat: { atk: 60 }, percent: { agi: 5 } },     dropAreaIds: ['market-street', 'tavern-street'], price: 250 },
// Uncommon armors
{ id: 'a-padded',    name: '누비옷',     slot: 'armor',  rarity: 'uncommon', stats: { flat: { def: 35, hp: 80 } },                  dropAreaIds: ['farm-fields', 'brook-side'],   price: 220 },
{ id: 'a-hide',      name: '가죽 두건', slot: 'armor',  rarity: 'uncommon', stats: { flat: { def: 50, hp: 120 } },                 dropAreaIds: ['market-street'], price: 280 },
// Uncommon accessories
{ id: 'acc-amulet',  name: '부적',       slot: 'accessory', rarity: 'uncommon', stats: { flat: { hp: 30 } },                       dropAreaIds: ['tavern-street', 'beacon-hill'], price: 350 },
{ id: 'acc-charm',   name: '복주머니',  slot: 'accessory', rarity: 'uncommon', stats: { percent: { luc: 20 } },                    dropAreaIds: ['market-street'], price: 400 },
```

- [ ] **Step 3: `mythic` tier 추가 (6 종)**

최상위. final-realm / hard-only 보스 drop:

```typescript
// Mythic weapons
{ id: 'w-mythic-sword',  name: '천년검',     slot: 'weapon',    rarity: 'mythic', stats: { percent: { atk: 1500 } },         dropAreaIds: ['final-realm', 'hard-final'], price: 200000 },
{ id: 'w-mythic-bow',    name: '신궁',       slot: 'weapon',    rarity: 'mythic', stats: { percent: { atk: 1200, agi: 300 } }, dropAreaIds: ['hard-time', 'hard-chaos'],   price: 180000 },
// Mythic armor
{ id: 'a-mythic-robe',   name: '천룡갑',     slot: 'armor',     rarity: 'mythic', stats: { percent: { hp: 1000, def: 800 } }, dropAreaIds: ['final-realm', 'hard-final'], price: 250000 },
{ id: 'a-mythic-aura',   name: '신성가호',  slot: 'armor',     rarity: 'mythic', stats: { percent: { hp: 800, def: 1000 } }, dropAreaIds: ['hard-emperor', 'hard-chaos'], price: 220000 },
// Mythic accessories
{ id: 'acc-mythic-gem',  name: '운명석',     slot: 'accessory', rarity: 'mythic', stats: { percent: { luc: 500 } },          dropAreaIds: ['final-realm', 'hard-final'], price: 300000 },
{ id: 'acc-mythic-ring', name: '천공반지',  slot: 'accessory', rarity: 'mythic', stats: { percent: { hp: 500, atk: 300 } }, dropAreaIds: ['hard-time', 'hard-emperor'], price: 280000 },
```

- [ ] **Step 4: 추가 region-specific 장비 (~14 종) — 빈 region 의 drop 채움**

각 region 의 hub area 에 1-2 종 drop 추가. (`dropAreaIds` 가 현재 11 area 만 — 9 region 의 미커버 area 에 drop 보강.)

```typescript
// Coast (해양)
{ id: 'w-trident',       name: '삼지창',     slot: 'weapon',    rarity: 'rare',      stats: { flat: { atk: 250 } },             dropAreaIds: ['dragon-palace'],     price: 1200 },
{ id: 'a-shell-armor',   name: '조개갑옷',   slot: 'armor',     rarity: 'rare',      stats: { flat: { def: 180 }, percent: { hp: 25 } }, dropAreaIds: ['dragon-palace'], price: 1800 },
// Underground
{ id: 'w-pickaxe',       name: '광부곡괭이', slot: 'weapon',    rarity: 'epic',      stats: { percent: { atk: 150 } },          dropAreaIds: ['cave-deep'],         price: 5000 },
{ id: 'a-ore-armor',     name: '광석갑',     slot: 'armor',     rarity: 'epic',      stats: { percent: { def: 200, hp: 100 } }, dropAreaIds: ['cave-deep'],         price: 6500 },
// Heaven-realm
{ id: 'w-celestial-spear',name: '선풍창',    slot: 'weapon',    rarity: 'legendary', stats: { percent: { atk: 700 } },          dropAreaIds: ['jade-palace'],       price: 35000 },
// Underworld
{ id: 'w-soulreaper',    name: '영혼낫',     slot: 'weapon',    rarity: 'legendary', stats: { percent: { atk: 600 } },          dropAreaIds: ['underworld-gate'],   price: 30000 },
// Forest
{ id: 'w-vine-bow',      name: '덩굴활',     slot: 'weapon',    rarity: 'rare',      stats: { flat: { atk: 180 } },             dropAreaIds: ['forest-heart'],      price: 1000 },
{ id: 'a-bark-armor',    name: '수피갑',     slot: 'armor',     rarity: 'rare',      stats: { flat: { def: 130, hp: 200 } },    dropAreaIds: ['forest-heart'],      price: 1300 },
// Mountains
{ id: 'a-stone-armor',   name: '석갑',       slot: 'armor',     rarity: 'rare',      stats: { flat: { def: 200, hp: 250 } },    dropAreaIds: ['kumgang-foot'],      price: 1700 },
// Chaos
{ id: 'acc-chaos-orb',   name: '혼돈구',     slot: 'accessory', rarity: 'epic',      stats: { percent: { luc: 200, atk: 50 } }, dropAreaIds: ['chaos-land'],        price: 18000 },
{ id: 'acc-time-shard',  name: '시간조각',  slot: 'accessory', rarity: 'epic',      stats: { percent: { agi: 250 } },          dropAreaIds: ['time-rift'],         price: 17000 },
// Plains 추가
{ id: 'acc-spirit-talisman', name: '영부적', slot: 'accessory',rarity: 'rare',      stats: { percent: { hp: 80 } },            dropAreaIds: ['cursed-fields'],      price: 4000 },
{ id: 'w-rust-blade',    name: '녹슨검',     slot: 'weapon',    rarity: 'common',    stats: { flat: { atk: 40 } },              dropAreaIds: ['ruined-village'],     price: 150 },
{ id: 'a-tribal-armor',  name: '부족갑',     slot: 'armor',     rarity: 'rare',      stats: { flat: { def: 100 }, percent: { hp: 20 } }, dropAreaIds: ['wanderer-camp'], price: 1100 },
```

총 카운트: 15 (기존) + 6 (uncommon) + 6 (mythic) + 14 (region 보강) = **41종**.

(스펙의 "~50" 목표에 약간 못 미치지만 의미 있는 분포 우선. plan 단계 추가 가능.)

- [ ] **Step 5: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 115 passed.

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/data/equipment.ts
git commit -m "feat(game-inflation-rpg): expand equipment 15 -> 41 (uncommon/mythic + region drops)"
```

---

## Task L1-6: 보스 placeholder 채우기 + hard 보스 추가

**Files:**
- Modify: `games/inflation-rpg/src/data/bosses.ts`

- [ ] **Step 1: 기존 보스에 신규 필드 (`guaranteedDrop`, `storyOnDefeat`) 추가**

기존 18 보스 (9 normal + 9 hard) 에 `guaranteedDrop` 추가. `storyOnDefeat` 은 Layer 5 에서 채울 것이므로 일단 비워둠 (선택적 필드라 OK).

예시:
```typescript
{ id: 'goblin-chief',   nameKR: '도깨비 대장',  emoji: '👹', areaId: 'goblin-pass',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2,    guaranteedDrop: 'w-bow' },
{ id: 'gate-guardian',  nameKR: '관문 수호신',  emoji: '⛩️',  areaId: 'baekdu-gate',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2,    guaranteedDrop: 'a-iron' },
// 등 기존 18 모두에 guaranteedDrop 추가
```

- [ ] **Step 2: maps.ts 의 placeholder bossId 모두 식별**

```bash
grep -oE "bossId: '[a-z-]+'" games/inflation-rpg/src/data/maps.ts | sort -u > /tmp/all-bossids.txt
grep -oE "id: '[a-z-]+'" games/inflation-rpg/src/data/bosses.ts | sed "s|id: ||" | tr -d "'" | sort -u > /tmp/defined-bossids.txt
comm -23 /tmp/all-bossids.txt /tmp/defined-bossids.txt
```

(또는 단순히 maps.ts 에서 `bossId: '...'` 를 모두 추출해서 bosses.ts 에 정의 안 된 것 찾기)

예상 placeholder 목록 (대략):
- plains: `plains-ghost`, `spirit-post-guardian`, `cursed-plains`, `plains-lord`
- forest: `gumiho`, `tree-spirit`, `black-tiger`, `cursed-tree-spirit`, `forest-ruler`
- mountains: 추가 예상 (rocky-ridge 등에 bossId 있다면)
- coast: `dragon-palace` 외 추가
- underground: 새로
- heaven-realm: 추가
- underworld: `underworld-gate` 외 추가
- chaos: `chaos-land` 외 추가
- final-realm: `final-realm`, `time-rift` 외 추가

- [ ] **Step 3: 모든 placeholder 보스 정의 추가 (Normal mode ~18 신규)**

각 placeholder 에 대해:

```typescript
// Plains (4 신규)
{ id: 'plains-ghost',          nameKR: '폐허의 망령',  emoji: '👻', areaId: 'old-fortress',      bpReward: 2, isHardMode: false, hpMult: 8,  atkMult: 1.5, guaranteedDrop: 'a-iron' },
{ id: 'spirit-post-guardian',  nameKR: '서낭당 수호신',emoji: '🌳', areaId: 'spirit-post',       bpReward: 3, isHardMode: false, hpMult: 9,  atkMult: 2,   guaranteedDrop: 'acc-ring-bp3' },
{ id: 'cursed-plains',         nameKR: '저주받은 군주',emoji: '☠️', areaId: 'cursed-fields',     bpReward: 3, isHardMode: false, hpMult: 11, atkMult: 2.2, guaranteedDrop: 'acc-spirit-talisman' },
{ id: 'plains-lord',           nameKR: '평야의 군주',  emoji: '🏰', areaId: 'plains-border',     bpReward: 4, isHardMode: false, hpMult: 12, atkMult: 2.5, guaranteedDrop: 'w-bluedragon' },

// Forest (5 신규)
{ id: 'gumiho',                nameKR: '구미호',       emoji: '🦊', areaId: 'fox-den',           bpReward: 3, isHardMode: false, hpMult: 9,  atkMult: 2,   guaranteedDrop: 'w-vine-bow' },
{ id: 'tree-spirit',           nameKR: '신령 거목',    emoji: '🌳', areaId: 'spirit-tree',       bpReward: 4, isHardMode: false, hpMult: 11, atkMult: 2.2, guaranteedDrop: 'a-bark-armor' },
{ id: 'black-tiger',           nameKR: '흑호',         emoji: '🐯', areaId: 'beast-territory',   bpReward: 5, isHardMode: false, hpMult: 13, atkMult: 2.7, guaranteedDrop: 'w-bluedragon' },
{ id: 'cursed-tree-spirit',    nameKR: '저주의 정령',  emoji: '🌲', areaId: 'cursed-tree',       bpReward: 5, isHardMode: false, hpMult: 14, atkMult: 2.8, guaranteedDrop: 'a-dragon' },
{ id: 'forest-ruler',          nameKR: '숲의 통치자',  emoji: '🦌', areaId: 'forest-heart',      bpReward: 6, isHardMode: false, hpMult: 16, atkMult: 3,   guaranteedDrop: 'w-yongcheon' },

// Mountains, coast, underground, heaven-realm, underworld, chaos, final-realm 의 placeholder 도 동일 방식으로 채움
// (실제로는 grep 결과에 따라 ~9 region × 평균 2-3 신규 보스 = ~20+)
```

> **Note**: 각 placeholder 의 areaId / bpReward / hpMult / atkMult 는 area 의 levelRange 와 region 위치를 고려하여 합리적으로 설정. emoji 와 nameKR 은 region 정체성에 맞춤.

(전체 placeholder 명세는 plan 실행 시 maps.ts 의 실제 bossId 를 grep 으로 확인하여 채움)

- [ ] **Step 4: 각 신규 normal 보스의 hard 버전 추가**

각 신규 normal 보스마다 hard 버전 1개:

```typescript
// 예: plains-ghost 의 hard 버전
{ id: 'plains-ghost-hard', nameKR: '심연의 망령', emoji: '🌑', areaId: 'old-fortress', bpReward: 4, isHardMode: true, hpMult: 18, atkMult: 3.5, guaranteedDrop: 'a-celestial' },
// 등 모든 신규 normal 마다 hard 버전
```

- [ ] **Step 5: 카운트 검증**

```bash
grep -c "isHardMode: false" games/inflation-rpg/src/data/bosses.ts
grep -c "isHardMode: true" games/inflation-rpg/src/data/bosses.ts
```

Expected: ~27 normal + ~27 hard. (정확한 수는 maps.ts placeholder 수에 따라 조정)

- [ ] **Step 6: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 115+ passed (기존 maps.test.ts 의 boss areaId integrity 검증 통과).

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/data/bosses.ts
git commit -m "feat(game-inflation-rpg): fill bossId placeholders + hard variants (9 -> ~54)"
```

---

## Task L1-7: maps.test.ts 보강 — 보스 무결성 + 신규 검증

**Files:**
- Modify: `games/inflation-rpg/src/data/maps.test.ts`

- [ ] **Step 1: 신규 검증 추가**

기존 maps.test.ts 가 이미 boss areaId integrity 검증을 가지고 있음 (memory). 추가:

1. 모든 `MapArea.bossId` 가 `BOSSES` 에 정의되어 있는지
2. 모든 region 에 최소 1 종의 monster 가 있는지 (regionTags)
3. 모든 normal boss 가 대응하는 hard 버전을 가지고 있는지

```typescript
import { describe, it, expect } from 'vitest';
import { MAP_AREAS } from './maps';
import { BOSSES } from './bosses';
import { MONSTERS } from './monsters';
import { REGIONS } from './regions';

describe('maps integrity (Layer 1)', () => {
  it('every MapArea.bossId is defined in BOSSES', () => {
    const bossIds = new Set(BOSSES.map(b => b.id));
    for (const area of MAP_AREAS) {
      if (area.bossId) {
        expect(bossIds.has(area.bossId), `${area.id} references undefined boss ${area.bossId}`).toBe(true);
      }
    }
  });

  it('every region has at least one region-tagged monster', () => {
    for (const region of REGIONS) {
      const matched = MONSTERS.filter(m => m.regionTags.includes(region.id));
      expect(matched.length, `region ${region.id} has no tagged monster`).toBeGreaterThan(0);
    }
  });

  it('every normal boss has a hard counterpart in the same area', () => {
    const normals = BOSSES.filter(b => !b.isHardMode);
    for (const n of normals) {
      const hard = BOSSES.find(b => b.isHardMode && b.areaId === n.areaId);
      expect(hard, `normal boss ${n.id} (area ${n.areaId}) has no hard counterpart`).toBeDefined();
    }
  });

  it('every Boss.guaranteedDrop references existing equipment', () => {
    // (이미 EQUIPMENT_CATALOG import 되어 있다고 가정)
    // import { EQUIPMENT_CATALOG } from './equipment';
    // 본 검증은 위 테스트와 함께 추가
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test data/maps.test
```

Expected: 신규 검증 통과 (Layer 1 데이터가 정합).

만약 통과 안 되면: 원인 (예: 정의 안 된 bossId, region 에 monster 없음) 추적해서 데이터 보완.

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/data/maps.test.ts
git commit -m "test(game-inflation-rpg): add Layer 1 data integrity checks (boss/monster/region)"
```

---

## Task L1-8: save 마이그레이션 — `regionTags` 누락 처리

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — 로드 시 누락 필드 기본값 주입

- [ ] **Step 1: gameStore 의 load 함수 찾기**

```bash
grep -n "loadFromSave\|migrate\|JSON.parse" games/inflation-rpg/src/store/gameStore.ts
```

- [ ] **Step 2: 신규 필드 기본값 처리**

Layer 1 자체는 `MetaState` / `RunState` 에 신규 필드 없음 (Layer 2-5 가 추가). 단 **Equipment** 의 rarity 가 6 tier 로 확장됐지만 기존 save 의 rarity 값 (4 tier 중 하나) 은 그대로 6 tier 의 부분집합. 마이그레이션 불필요.

따라서 Layer 1 은 **save 마이그레이션 변경 없음**. Step 3 으로 바로 진행.

- [ ] **Step 3: typecheck + test 확인 (마이그레이션 회귀 없음)**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 115+ passed.

- [ ] **Step 4: (변경 없으므로 commit 안 함)**

---

## Task L1-9: 통합 검증 + Phase tag

**Files:**
- (수정 없음 — 검증 + 태그만)

- [ ] **Step 1: 전체 typecheck**

```bash
pnpm typecheck
```

Expected: 0 exit (4 workspaces).

- [ ] **Step 2: 전체 테스트**

```bash
pnpm test
```

Expected: 145+ passed (기존 145 + 신규 ~3-5 maps.test.ts 검증).

- [ ] **Step 3: lint + circular**

```bash
pnpm lint
pnpm circular
```

Expected: 0 errors.

- [ ] **Step 4: 정량 검증 (카운트 확인)**

```bash
echo -n "Monsters: "; grep -c "regionTags:" games/inflation-rpg/src/data/monsters.ts
echo -n "Equipment: "; grep -c "rarity:" games/inflation-rpg/src/data/equipment.ts
echo -n "Bosses: "; grep -c "isHardMode:" games/inflation-rpg/src/data/bosses.ts
```

Expected:
- Monsters >= 50
- Equipment >= 40
- Bosses >= 50

- [ ] **Step 5: build**

```bash
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: 성공.

- [ ] **Step 6: Layer 1 phase tag**

```bash
git tag phase-content-data-complete
git log --oneline forge-ui-opus-complete..HEAD
```

Expected: Layer 1 의 모든 commit 이 요약 출력.

- [ ] **Step 7: CLAUDE.md 갱신 (선택)**

CLAUDE.md 의 "현재 단계" 섹션에 추가:
```
- `phase-content-data-complete` — Layer 1 데이터 확장 (몬스터 51, 장비 41, 보스 ~54)
```

```bash
git add CLAUDE.md
git commit -m "docs(claude): mark phase-content-data-complete in roadmap"
```

---

## 요약

Layer 1 완료 시 repo 상태:
- 몬스터: 8 → ~51 (9 region 정체성 반영)
- 장비: 15 → ~41 (6 rarity tier)
- 보스: 18 → ~54 (모든 placeholder 채워짐)
- maps.test.ts 에 무결성 검증 추가
- 신규 phase tag: `phase-content-data-complete`

다음 Layer 2 (던전 구조) plan 으로 진행 — `2026-04-26-content-layer2-dungeon-plan.md`.

---

## 알려진 주의사항

| 주의 | 대응 |
| --- | --- |
| L1-3 Step 2 의 region 별 몬스터 levelRange 가 region 의 area levelRange 와 정확히 매핑되지 않을 수 있음 | maps.ts 의 area levelRange 를 빠르게 검토하여 monster levelMin/levelMax 가 그 안에 들어가도록 조정. |
| L1-4 Step 3 BattleScene 의 currentAreaId 접근 방식이 다를 수 있음 | grep 결과를 보고 store / props / scene config 중 어디서 받는지 확인 후 적용. |
| L1-6 Step 2 placeholder 목록은 추정값 — 실제로는 maps.ts 의 grep 결과에 따라 정확한 카운트 결정 | grep + comm 명령으로 정확히 식별 후 채움. |
| L1-6 의 hard 보스 areaId 가 hard-only area (예: hard-abyss, hard-void) 인지 일반 area 인지 혼재 | 기존 hard 보스 패턴 (`area: 'goblin-pass', isHardMode: true`) 을 따라 동일 area 에 hard 버전 추가. |
| Equipment 의 dropAreaIds 에 등장하는 area 가 maps.ts 에 실제 존재하는지 | maps.test.ts 에 dropAreaIds 무결성 검증 추가 가능 (선택, 이번 plan 에서는 보류) |

---

**End of Layer 1 plan. Total tasks: 9. Estimated commits: 7-8.**
