# Inflation RPG Clone — Plan 1: Engine (Foundation + Systems + Store)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `games/inflation-rpg`의 Phaser-only 코드를 삭제하고, 새 아키텍처의 엔진 레이어(타입·데이터·순수 로직 시스템·Zustand 스토어)를 TDD로 구축한다.

**Architecture:** 순수 함수 시스템 (`systems/`) → Zustand 스토어 (`store/`) 순으로 쌓는다. React/Phaser UI는 Plan 2에서 다룬다. 각 시스템은 UI 의존성이 없어 Vitest로 단독 검증 가능하다.

**Tech Stack:** TypeScript, Zustand 5, Zod 4, Vitest 4, @forge/core (기존)

**Spec:** `docs/superpowers/specs/2026-04-18-inflation-rpg-faithful-clone-design.md`

---

## File Map

| 경로 | 역할 | 신규/수정 |
|---|---|---|
| `packages/2d-core/src/game-interfaces.ts` | IStatSystem 등 4개 인터페이스 | 신규 |
| `packages/2d-core/src/index.ts` | 인터페이스 re-export | 수정 |
| `games/inflation-rpg/vitest.config.ts` | 테스트 경로 업데이트 | 수정 |
| `games/inflation-rpg/src/types.ts` | 공유 타입 전체 | 신규 |
| `games/inflation-rpg/src/data/characters.ts` | 16종 캐릭터 데이터 | 신규 |
| `games/inflation-rpg/src/data/equipment.ts` | 장비 카탈로그 | 신규 |
| `games/inflation-rpg/src/data/maps.ts` | 14개 구역 | 신규 |
| `games/inflation-rpg/src/data/bosses.ts` | 보스 18종 | 신규 |
| `games/inflation-rpg/src/data/monsters.ts` | 일반 몬스터 | 신규 |
| `games/inflation-rpg/src/systems/bp.ts` | BP 증감 순수 함수 | 신규 |
| `games/inflation-rpg/src/systems/bp.test.ts` | BP 테스트 | 신규 |
| `games/inflation-rpg/src/systems/stats.ts` | 스탯 계산 | 신규 |
| `games/inflation-rpg/src/systems/stats.test.ts` | 스탯 테스트 | 신규 |
| `games/inflation-rpg/src/systems/equipment.ts` | 슬롯·드롭 관리 | 신규 |
| `games/inflation-rpg/src/systems/equipment.test.ts` | 장비 테스트 | 신규 |
| `games/inflation-rpg/src/systems/experience.ts` | 레벨업·SP 계산 | 신규 |
| `games/inflation-rpg/src/systems/experience.test.ts` | 경험치 테스트 | 신규 |
| `games/inflation-rpg/src/systems/progression.ts` | 베이스어빌리티·하드모드 | 신규 |
| `games/inflation-rpg/src/systems/progression.test.ts` | 진행도 테스트 | 신규 |
| `games/inflation-rpg/src/store/gameStore.ts` | Zustand 스토어 | 신규 |
| `games/inflation-rpg/src/store/gameStore.test.ts` | 스토어 통합 테스트 | 신규 |

**삭제 대상:** `games/inflation-rpg/src/game/` 전체

---

## Task 1: 기존 코드 삭제 + 의존성 추가 + 환경 설정

**Files:**
- Delete: `games/inflation-rpg/src/game/`
- Modify: `games/inflation-rpg/package.json`
- Modify: `games/inflation-rpg/vitest.config.ts`

- [ ] **Step 1: 기존 game 디렉토리 삭제**

```bash
cd /path/to/2d-game-forge
rm -rf games/inflation-rpg/src/game
```

Expected: `games/inflation-rpg/src/game/` 디렉토리 없어짐

- [ ] **Step 2: 의존성 추가**

`games/inflation-rpg/package.json` dependencies에 추가:

```json
"zustand": "^5.0.0"
```

devDependencies에 추가:

```json
"@testing-library/react": "^16.0.0",
"@testing-library/user-event": "^14.0.0",
"@testing-library/jest-dom": "^6.0.0",
"lucide-react": "^0.400.0"
```

- [ ] **Step 3: pnpm install**

```bash
pnpm install
```

Expected: lockfile 업데이트, `node_modules` 에 zustand, lucide-react 등 추가

- [ ] **Step 4: vitest.config.ts 업데이트**

`games/inflation-rpg/vitest.config.ts` 전체 교체:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test-setup.ts'],
  },
});
```

- [ ] **Step 5: test-setup.ts 생성**

`games/inflation-rpg/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: 새 디렉토리 스캐폴드**

```bash
mkdir -p games/inflation-rpg/src/{systems,data,store,screens,battle,styles}
```

- [ ] **Step 7: 임시 index 확인 후 커밋**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | head -20
```

Expected: 에러가 있어도 무방 (game/ 삭제로 인한 import 에러). 다음 태스크에서 해결.

```bash
git add -A
git commit -m "chore(inflation-rpg): tear down Phaser-only code, scaffold new structure"
```

---

## Task 2: @forge/core — 게임 인터페이스 4종

**Files:**
- Create: `packages/2d-core/src/game-interfaces.ts`
- Modify: `packages/2d-core/src/index.ts`

- [ ] **Step 1: game-interfaces.ts 생성**

`packages/2d-core/src/game-interfaces.ts`:

```ts
export interface IStatSystem {
  calcFinalStat(
    base: number,
    spPoints: number,
    percentMult: number,
    charMult: number,
    baseAbilityMult: number
  ): number;
  calcDamageReduction(def: number): number;
  calcCritChance(agi: number, luc: number): number;
}

export interface IBattlePointSystem {
  onEncounter(current: number): number;
  onDefeat(current: number, isHard: boolean): number;
  onBossKill(current: number, reward: number): number;
}

export interface IProgressionSystem {
  isHardModeUnlocked(bestRunLevel: number): boolean;
  calcBaseAbilityMult(level: number): number;
  onBossKill(bossId: string, killed: string[], maxLevel: number): string[];
}

export interface CharacterClassBase {
  id: string;
  nameKR: string;
  statMultipliers: Record<'hp' | 'atk' | 'def' | 'agi' | 'luc', number>;
  unlockSoulGrade: number;
}
```

- [ ] **Step 2: index.ts에 re-export 추가**

`packages/2d-core/src/index.ts` 마지막 줄에 추가:

```ts
export type {
  IStatSystem,
  IBattlePointSystem,
  IProgressionSystem,
  CharacterClassBase,
} from './game-interfaces';
```

- [ ] **Step 3: @forge/core typecheck**

```bash
pnpm --filter @forge/core typecheck
```

Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add packages/2d-core/src/game-interfaces.ts packages/2d-core/src/index.ts
git commit -m "feat(core): add IStatSystem, IBattlePointSystem, IProgressionSystem, CharacterClassBase interfaces"
```

---

## Task 3: 공유 타입 정의

**Files:**
- Create: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: types.ts 생성**

`games/inflation-rpg/src/types.ts`:

```ts
export type StatKey = 'hp' | 'atk' | 'def' | 'agi' | 'luc';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface EquipmentStats {
  flat?: Partial<Record<StatKey, number>>;
  percent?: Partial<Record<StatKey, number>>;
}

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  stats: EquipmentStats;
  dropAreaIds: string[];
  price: number;
}

export interface PassiveSkill {
  id: string;
  nameKR: string;
  description: string;
  effect: 'stat_boost' | 'beast_damage' | 'item_find' | 'life_conversion' | 'bp_ring';
  value: number;
}

export interface Character {
  id: string;
  nameKR: string;
  emoji: string;
  statFocus: string;
  statMultipliers: Record<StatKey, number>;
  passiveSkill: PassiveSkill;
  unlockSoulGrade: number;
}

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
}

export interface Boss {
  id: string;
  nameKR: string;
  emoji: string;
  areaId: string;
  bpReward: number;
  isHardMode: boolean;
  hpMult: number;
  atkMult: number;
}

export interface MapArea {
  id: string;
  nameKR: string;
  levelRange: [number, number];
  bossId?: string;
  isHardOnly: boolean;
}

export type AllocatedStats = Record<StatKey, number>;

export interface Inventory {
  weapons: Equipment[];
  armors: Equipment[];
  accessories: Equipment[];
}

export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentAreaId: string;
  isHardMode: boolean;
  monstersDefeated: number;
  goldThisRun: number;
}

export interface MetaState {
  inventory: Inventory;
  baseAbilityLevel: number;
  soulGrade: number;
  hardModeUnlocked: boolean;
  characterLevels: Record<string, number>;
  bestRunLevel: number;
  normalBossesKilled: string[];
  hardBossesKilled: string[];
  gold: number;
}

export type Screen =
  | 'main-menu'
  | 'class-select'
  | 'world-map'
  | 'battle'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over';
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep "src/types"
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(inflation-rpg): add shared types"
```

---

## Task 4: 데이터 파일 (characters, equipment, maps, bosses, monsters)

**Files:**
- Create: `games/inflation-rpg/src/data/characters.ts`
- Create: `games/inflation-rpg/src/data/equipment.ts`
- Create: `games/inflation-rpg/src/data/maps.ts`
- Create: `games/inflation-rpg/src/data/bosses.ts`
- Create: `games/inflation-rpg/src/data/monsters.ts`

- [ ] **Step 1: characters.ts 생성 (16종)**

`games/inflation-rpg/src/data/characters.ts`:

```ts
import type { Character } from '../types';

export const CHARACTERS: Character[] = [
  // ── 기본 (soul grade 0) ──
  {
    id: 'hwarang', nameKR: '화랑', emoji: '⚔️', statFocus: 'AGI·ATK',
    statMultipliers: { hp: 1.0, atk: 1.1, def: 1.0, agi: 1.2, luc: 1.0 },
    passiveSkill: { id: 'hwarang_spirit', nameKR: '화랑정신', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 0,
  },
  {
    id: 'mudang', nameKR: '무당', emoji: '🌸', statFocus: 'LUC·아이템',
    statMultipliers: { hp: 0.9, atk: 1.0, def: 0.95, agi: 1.05, luc: 1.3 },
    passiveSkill: { id: 'spiritual_eye', nameKR: '령안', description: '아이템 드롭 20% 증가', effect: 'item_find', value: 1.2 },
    unlockSoulGrade: 0,
  },
  {
    id: 'choeui', nameKR: '초의', emoji: '🛡️', statFocus: 'HP·DEF',
    statMultipliers: { hp: 1.2, atk: 0.95, def: 1.1, agi: 0.9, luc: 0.9 },
    passiveSkill: { id: 'adamantine', nameKR: '금강불괴', description: '최대 HP 5%를 ATK로 전환', effect: 'life_conversion', value: 0.05 },
    unlockSoulGrade: 0,
  },
  {
    id: 'geomgaek', nameKR: '검객', emoji: '🗡️', statFocus: 'ATK·크리',
    statMultipliers: { hp: 0.95, atk: 1.15, def: 0.9, agi: 1.1, luc: 1.05 },
    passiveSkill: { id: 'sword_mastery', nameKR: '검술', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 0,
  },
  // ── 공격형 (soul grade 2~4) ──
  {
    id: 'tiger_hunter', nameKR: '착호갑사', emoji: '🏹', statFocus: 'ATK·보스',
    statMultipliers: { hp: 0.9, atk: 1.2, def: 0.9, agi: 1.0, luc: 0.95 },
    passiveSkill: { id: 'beast_hunter', nameKR: '짐승사냥꾼', description: '짐승·요괴 데미지 50% 증가', effect: 'beast_damage', value: 1.5 },
    unlockSoulGrade: 2,
  },
  {
    id: 'dosa', nameKR: '도사', emoji: '🔥', statFocus: 'ATK·마법',
    statMultipliers: { hp: 0.9, atk: 1.2, def: 0.85, agi: 1.0, luc: 1.1 },
    passiveSkill: { id: 'tao_power', nameKR: '도력', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 3,
  },
  {
    id: 'yacha', nameKR: '야차', emoji: '😈', statFocus: 'AGI·회피',
    statMultipliers: { hp: 0.85, atk: 1.1, def: 0.85, agi: 1.35, luc: 1.0 },
    passiveSkill: { id: 'ghost_step', nameKR: '귀신발걸음', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 3,
  },
  {
    id: 'gungsu', nameKR: '궁수', emoji: '🎯', statFocus: 'ATK·원거리',
    statMultipliers: { hp: 0.9, atk: 1.15, def: 0.9, agi: 1.15, luc: 1.0 },
    passiveSkill: { id: 'eagle_eye', nameKR: '매의눈', description: '아이템 드롭 20% 증가', effect: 'item_find', value: 1.2 },
    unlockSoulGrade: 4,
  },
  // ── 방어형 (soul grade 3~5) ──
  {
    id: 'uinyeo', nameKR: '의녀', emoji: '💚', statFocus: 'HP·회복',
    statMultipliers: { hp: 1.25, atk: 0.9, def: 1.0, agi: 0.95, luc: 1.05 },
    passiveSkill: { id: 'healing_hand', nameKR: '치유손', description: '최대 HP 5%를 ATK로 전환', effect: 'life_conversion', value: 0.05 },
    unlockSoulGrade: 3,
  },
  {
    id: 'jangsu', nameKR: '장수', emoji: '🪖', statFocus: 'DEF·HP',
    statMultipliers: { hp: 1.2, atk: 0.95, def: 1.25, agi: 0.85, luc: 0.9 },
    passiveSkill: { id: 'iron_wall', nameKR: '철벽', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 4,
  },
  {
    id: 'seungbyeong', nameKR: '승병', emoji: '🙏', statFocus: 'DEF·반격',
    statMultipliers: { hp: 1.1, atk: 1.0, def: 1.2, agi: 0.9, luc: 0.95 },
    passiveSkill: { id: 'monk_guard', nameKR: '호법', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 5,
  },
  {
    id: 'geosa', nameKR: '거사', emoji: '🗿', statFocus: 'HP·중갑',
    statMultipliers: { hp: 1.3, atk: 0.9, def: 1.15, agi: 0.8, luc: 0.9 },
    passiveSkill: { id: 'heavy_armor', nameKR: '중갑', description: '최대 HP 5%를 ATK로 전환', effect: 'life_conversion', value: 0.05 },
    unlockSoulGrade: 5,
  },
  // ── 특수형 (soul grade 6~9) ──
  {
    id: 'cheongwan', nameKR: '천관', emoji: '⭐', statFocus: 'LUC·특수',
    statMultipliers: { hp: 0.95, atk: 1.05, def: 0.95, agi: 1.1, luc: 1.4 },
    passiveSkill: { id: 'star_reading', nameKR: '점성', description: '아이템 드롭 20% 증가', effect: 'item_find', value: 1.2 },
    unlockSoulGrade: 6,
  },
  {
    id: 'yongnyeo', nameKR: '용녀', emoji: '🐉', statFocus: '균형·전지',
    statMultipliers: { hp: 1.1, atk: 1.1, def: 1.1, agi: 1.1, luc: 1.1 },
    passiveSkill: { id: 'dragon_blessing', nameKR: '용의축복', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 7,
  },
  {
    id: 'gwisin', nameKR: '귀신', emoji: '👻', statFocus: 'ATK·유령',
    statMultipliers: { hp: 0.8, atk: 1.35, def: 0.8, agi: 1.2, luc: 1.1 },
    passiveSkill: { id: 'ghost_form', nameKR: '귀신형', description: '짐승·요괴 데미지 50% 증가', effect: 'beast_damage', value: 1.5 },
    unlockSoulGrade: 8,
  },
  {
    id: 'seonin', nameKR: '선인', emoji: '🌙', statFocus: '균형·지혜',
    statMultipliers: { hp: 1.15, atk: 1.15, def: 1.1, agi: 1.1, luc: 1.15 },
    passiveSkill: { id: 'immortal_body', nameKR: '신선체', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 9,
  },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getUnlockedCharacters(soulGrade: number): Character[] {
  return CHARACTERS.filter(c => c.unlockSoulGrade <= soulGrade);
}
```

- [ ] **Step 2: maps.ts 생성**

`games/inflation-rpg/src/data/maps.ts`:

```ts
import type { MapArea } from '../types';

export const MAP_AREAS: MapArea[] = [
  { id: 'village-entrance', nameKR: '마을 입구',   levelRange: [1, 50],       bossId: undefined,          isHardOnly: false },
  { id: 'tavern-street',    nameKR: '주막 거리',    levelRange: [30, 200],     bossId: undefined,          isHardOnly: false },
  { id: 'goblin-pass',      nameKR: '도깨비 고개',  levelRange: [100, 500],    bossId: 'goblin-chief',     isHardOnly: false },
  { id: 'baekdu-gate',      nameKR: '백두 관문',    levelRange: [500, 2000],   bossId: 'gate-guardian',    isHardOnly: false },
  { id: 'kumgang-foot',     nameKR: '금강산 기슭',  levelRange: [1000, 5000],  bossId: undefined,          isHardOnly: false },
  { id: 'dragon-palace',    nameKR: '용궁 어귀',    levelRange: [3000, 10000], bossId: 'sea-god',          isHardOnly: false },
  { id: 'black-dragon-den', nameKR: '흑룡 소굴',    levelRange: [8000, 30000], bossId: 'black-dragon',     isHardOnly: false },
  { id: 'underworld-gate',  nameKR: '저승 입구',    levelRange: [20000, 80000],bossId: 'death-reaper',     isHardOnly: false },
  { id: 'heaven-realm',     nameKR: '천상계',       levelRange: [60000, 200000],bossId: 'jade-emperor',    isHardOnly: false },
  { id: 'chaos-land',       nameKR: '혼돈의 땅',    levelRange: [150000, 500000],bossId: 'chaos-god',      isHardOnly: false },
  { id: 'time-rift',        nameKR: '시간의 틈',    levelRange: [400000, 1000000],bossId: undefined,        isHardOnly: false },
  { id: 'hard-abyss',       nameKR: '심연',         levelRange: [100, 5000],   bossId: 'abyss-lord',       isHardOnly: true  },
  { id: 'hard-void',        nameKR: '공허',         levelRange: [5000, 50000], bossId: 'void-king',        isHardOnly: true  },
  { id: 'final-realm',      nameKR: '최종 구역',    levelRange: [500000, Infinity], bossId: 'final-boss',  isHardOnly: false },
];

export function getAreaById(id: string): MapArea | undefined {
  return MAP_AREAS.find(a => a.id === id);
}

export function getAvailableAreas(isHardMode: boolean): MapArea[] {
  return MAP_AREAS.filter(a => !a.isHardOnly || isHardMode);
}
```

- [ ] **Step 3: bosses.ts 생성**

`games/inflation-rpg/src/data/bosses.ts`:

```ts
import type { Boss } from '../types';

export const BOSSES: Boss[] = [
  // Normal mode (9)
  { id: 'goblin-chief',   nameKR: '도깨비 대장',  emoji: '👹', areaId: 'goblin-pass',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'gate-guardian',  nameKR: '관문 수호신',  emoji: '⛩️',  areaId: 'baekdu-gate',      bpReward: 3, isHardMode: false, hpMult: 10, atkMult: 2 },
  { id: 'sea-god',        nameKR: '해신',         emoji: '🌊', areaId: 'dragon-palace',    bpReward: 4, isHardMode: false, hpMult: 12, atkMult: 2.5 },
  { id: 'black-dragon',   nameKR: '흑룡',         emoji: '🐲', areaId: 'black-dragon-den', bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 3 },
  { id: 'death-reaper',   nameKR: '저승사자',     emoji: '💀', areaId: 'underworld-gate',  bpReward: 5, isHardMode: false, hpMult: 15, atkMult: 3 },
  { id: 'jade-emperor',   nameKR: '옥황상제',     emoji: '👑', areaId: 'heaven-realm',     bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'chaos-god',      nameKR: '혼돈신',       emoji: '🌀', areaId: 'chaos-land',       bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  { id: 'final-boss',     nameKR: '최종보스',     emoji: '🌟', areaId: 'final-realm',      bpReward: 8, isHardMode: false, hpMult: 30, atkMult: 4 },
  { id: 'time-warden',    nameKR: '시간의 파수꾼',emoji: '⏳', areaId: 'time-rift',        bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
  // Hard mode (9)
  { id: 'abyss-lord',     nameKR: '심연의 군주',  emoji: '🕳️',  areaId: 'hard-abyss',       bpReward: 4, isHardMode: true,  hpMult: 15, atkMult: 3 },
  { id: 'void-king',      nameKR: '공허의 왕',    emoji: '🌑', areaId: 'hard-void',        bpReward: 5, isHardMode: true,  hpMult: 18, atkMult: 3.5 },
  { id: 'hard-goblin',    nameKR: '도깨비 왕',    emoji: '👺', areaId: 'goblin-pass',      bpReward: 4, isHardMode: true,  hpMult: 15, atkMult: 3 },
  { id: 'hard-dragon',    nameKR: '황금룡',       emoji: '✨', areaId: 'black-dragon-den', bpReward: 5, isHardMode: true,  hpMult: 20, atkMult: 4 },
  { id: 'hard-reaper',    nameKR: '사신',         emoji: '🔱', areaId: 'underworld-gate',  bpReward: 5, isHardMode: true,  hpMult: 20, atkMult: 4 },
  { id: 'hard-emperor',   nameKR: '천제',         emoji: '🏆', areaId: 'heaven-realm',     bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
  { id: 'hard-chaos',     nameKR: '원초혼돈',     emoji: '💫', areaId: 'chaos-land',       bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
  { id: 'hard-final',     nameKR: '진 최종보스',  emoji: '🌈', areaId: 'final-realm',      bpReward: 8, isHardMode: true,  hpMult: 40, atkMult: 5 },
  { id: 'hard-time',      nameKR: '시간파괴자',   emoji: '⚡', areaId: 'time-rift',        bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
];

export function getBossById(id: string): Boss | undefined {
  return BOSSES.find(b => b.id === id);
}

export function getBossesForArea(areaId: string, isHardMode: boolean): Boss[] {
  return BOSSES.filter(b => b.areaId === areaId && b.isHardMode === isHardMode);
}
```

- [ ] **Step 4: monsters.ts 생성**

`games/inflation-rpg/src/data/monsters.ts`:

```ts
import type { Monster } from '../types';

export const MONSTERS: Monster[] = [
  { id: 'slime',    nameKR: '슬라임',    emoji: '🟢', levelMin: 1,     levelMax: 100,    hpMult: 1.0, atkMult: 0.8,  defMult: 0.5,  expMult: 1.0,  goldMult: 1.0,  isBoss: false },
  { id: 'goblin',   nameKR: '도깨비',    emoji: '👺', levelMin: 50,    levelMax: 500,    hpMult: 1.2, atkMult: 1.0,  defMult: 0.8,  expMult: 1.1,  goldMult: 1.1,  isBoss: false },
  { id: 'tiger',    nameKR: '호랑이',    emoji: '🐯', levelMin: 200,   levelMax: 2000,   hpMult: 1.5, atkMult: 1.3,  defMult: 1.0,  expMult: 1.3,  goldMult: 1.2,  isBoss: false },
  { id: 'dragon',   nameKR: '용',        emoji: '🐉', levelMin: 1000,  levelMax: 10000,  hpMult: 2.0, atkMult: 1.8,  defMult: 1.5,  expMult: 1.8,  goldMult: 1.5,  isBoss: false },
  { id: 'ghost',    nameKR: '귀신',      emoji: '👻', levelMin: 500,   levelMax: 5000,   hpMult: 0.8, atkMult: 1.5,  defMult: 0.5,  expMult: 1.4,  goldMult: 1.3,  isBoss: false },
  { id: 'undead',   nameKR: '망자',      emoji: '💀', levelMin: 5000,  levelMax: 50000,  hpMult: 1.8, atkMult: 1.6,  defMult: 1.3,  expMult: 1.7,  goldMult: 1.4,  isBoss: false },
  { id: 'deity',    nameKR: '신수',      emoji: '🌟', levelMin: 20000, levelMax: 200000, hpMult: 2.5, atkMult: 2.2,  defMult: 2.0,  expMult: 2.0,  goldMult: 1.8,  isBoss: false },
  { id: 'chaos',    nameKR: '혼돈체',    emoji: '🌀', levelMin: 100000,levelMax: Infinity,hpMult: 3.0, atkMult: 2.8, defMult: 2.5,  expMult: 2.5,  goldMult: 2.0,  isBoss: false },
];

export function getMonstersForLevel(level: number): Monster[] {
  return MONSTERS.filter(m => m.levelMin <= level && m.levelMax >= level);
}

export function pickMonster(level: number): Monster {
  const pool = getMonstersForLevel(level);
  if (pool.length === 0) return MONSTERS[MONSTERS.length - 1]!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
```

- [ ] **Step 5: equipment.ts 생성**

`games/inflation-rpg/src/data/equipment.ts`:

```ts
import type { Equipment } from '../types';

export const EQUIPMENT_CATALOG: Equipment[] = [
  // Weapons — flat (early game)
  { id: 'w-knife',     name: '단도',   slot: 'weapon', rarity: 'common',    stats: { flat: { atk: 30 } },               dropAreaIds: ['village-entrance', 'tavern-street'], price: 100 },
  { id: 'w-sword',     name: '철검',   slot: 'weapon', rarity: 'common',    stats: { flat: { atk: 80 } },               dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 300 },
  { id: 'w-bow',       name: '각궁',   slot: 'weapon', rarity: 'rare',      stats: { flat: { atk: 200 }, percent: { atk: 20 } }, dropAreaIds: ['baekdu-gate', 'kumgang-foot'], price: 800 },
  // Weapons — percent (mid-late game)
  { id: 'w-bluedragon',name: '청룡도', slot: 'weapon', rarity: 'rare',      stats: { percent: { atk: 80 } },            dropAreaIds: ['dragon-palace', 'black-dragon-den'], price: 2000 },
  { id: 'w-yongcheon', name: '용천검', slot: 'weapon', rarity: 'epic',      stats: { percent: { atk: 200 } },           dropAreaIds: ['underworld-gate', 'heaven-realm'],   price: 8000 },
  { id: 'w-fairy',     name: '선녀검', slot: 'weapon', rarity: 'legendary', stats: { percent: { atk: 500 } },           dropAreaIds: ['chaos-land', 'final-realm'],          price: 30000 },
  // Armors
  { id: 'a-cloth',     name: '베옷',   slot: 'armor',  rarity: 'common',    stats: { flat: { def: 20, hp: 50 } },       dropAreaIds: ['village-entrance', 'tavern-street'], price: 150 },
  { id: 'a-leather',   name: '가죽갑', slot: 'armor',  rarity: 'common',    stats: { flat: { def: 60, hp: 150 } },      dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 400 },
  { id: 'a-iron',      name: '철갑옷', slot: 'armor',  rarity: 'rare',      stats: { flat: { def: 150 }, percent: { hp: 30 } }, dropAreaIds: ['kumgang-foot', 'dragon-palace'], price: 1500 },
  { id: 'a-dragon',    name: '용린갑', slot: 'armor',  rarity: 'epic',      stats: { percent: { hp: 150, def: 100 } },  dropAreaIds: ['black-dragon-den', 'underworld-gate'],price: 6000 },
  { id: 'a-celestial', name: '천의',   slot: 'armor',  rarity: 'legendary', stats: { percent: { hp: 400, def: 250 } },  dropAreaIds: ['heaven-realm', 'final-realm'],        price: 25000 },
  // Accessories
  { id: 'acc-ring-bp1',name: 'BP반지+1',slot:'accessory',rarity:'common',  stats: {},                                   dropAreaIds: ['village-entrance'],                  price: 500 },
  { id: 'acc-ring-bp3',name: 'BP반지+3',slot:'accessory',rarity:'rare',    stats: {},                                   dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 3000 },
  { id: 'acc-necklace', name: '회복목걸이',slot:'accessory',rarity:'rare',  stats: { percent: { hp: 50 } },              dropAreaIds: ['kumgang-foot', 'dragon-palace'],      price: 5000 },
  { id: 'acc-luc-gem',  name: '행운석', slot:'accessory',rarity:'epic',    stats: { percent: { luc: 100 } },            dropAreaIds: ['heaven-realm', 'chaos-land'],         price: 15000 },
];

export function getEquipmentById(id: string): Equipment | undefined {
  return EQUIPMENT_CATALOG.find(e => e.id === id);
}

export function getDropsForArea(areaId: string): Equipment[] {
  return EQUIPMENT_CATALOG.filter(e => e.dropAreaIds.includes(areaId));
}
```

- [ ] **Step 6: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep -E "error|src/data"
```

Expected: 데이터 파일 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/data/
git commit -m "feat(inflation-rpg): add data files — 16 characters, 14 maps, 18 bosses, equipment, monsters"
```

---

## Task 5: systems/bp.ts (TDD)

**Files:**
- Create: `games/inflation-rpg/src/systems/bp.ts`
- Create: `games/inflation-rpg/src/systems/bp.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/systems/bp.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  STARTING_BP,
  onEncounter,
  onDefeat,
  onBossKill,
  isRunOver,
} from './bp';

describe('BP System', () => {
  it('STARTING_BP is 30', () => {
    expect(STARTING_BP).toBe(30);
  });

  it('onEncounter decrements by 1', () => {
    expect(onEncounter(30)).toBe(29);
    expect(onEncounter(1)).toBe(0);
  });

  it('onDefeat normal: additional -2', () => {
    expect(onDefeat(28, false)).toBe(26);
  });

  it('onDefeat hard: additional -4', () => {
    expect(onDefeat(28, true)).toBe(24);
  });

  it('onBossKill adds reward', () => {
    expect(onBossKill(20, 5)).toBe(25);
  });

  it('isRunOver when bp <= 0', () => {
    expect(isRunOver(0)).toBe(true);
    expect(isRunOver(-1)).toBe(true);
    expect(isRunOver(1)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/bp.test.ts
```

Expected: `Cannot find module './bp'` 에러

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/systems/bp.ts`:

```ts
import type { IBattlePointSystem } from '@forge/core';

export const STARTING_BP = 30;

export function onEncounter(current: number): number {
  return current - 1;
}

export function onDefeat(current: number, isHard: boolean): number {
  return current - (isHard ? 4 : 2);
}

export function onBossKill(current: number, reward: number): number {
  return current + reward;
}

export function isRunOver(bp: number): boolean {
  return bp <= 0;
}

export const bpSystem: IBattlePointSystem = {
  onEncounter,
  onDefeat,
  onBossKill,
};
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/bp.test.ts
```

Expected: `5 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/bp.ts games/inflation-rpg/src/systems/bp.test.ts
git commit -m "feat(inflation-rpg): add BP system with tests"
```

---

## Task 6: systems/stats.ts (TDD)

**Files:**
- Create: `games/inflation-rpg/src/systems/stats.ts`
- Create: `games/inflation-rpg/src/systems/stats.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/systems/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  BASE_STATS,
  SP_INCREASE,
  calcRawStat,
  calcEquipmentPercentMult,
  calcEquipmentFlat,
  calcFinalStat,
  calcDamageReduction,
  calcCritChance,
} from './stats';
import type { Equipment } from '../types';

const noEquip: Equipment[] = [];
const pctWeapon: Equipment = {
  id: 'w1', name: '검', slot: 'weapon', rarity: 'common',
  stats: { percent: { atk: 100 } }, dropAreaIds: [], price: 0,
};
const flatWeapon: Equipment = {
  id: 'w2', name: '도', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 50 } }, dropAreaIds: [], price: 0,
};

describe('Stats System', () => {
  it('BASE_STATS has correct initial values', () => {
    expect(BASE_STATS.hp).toBe(100);
    expect(BASE_STATS.atk).toBe(10);
    expect(BASE_STATS.def).toBe(10);
    expect(BASE_STATS.agi).toBe(5);
    expect(BASE_STATS.luc).toBe(5);
  });

  it('SP_INCREASE has correct increments', () => {
    expect(SP_INCREASE.hp).toBe(5);
    expect(SP_INCREASE.atk).toBe(3);
    expect(SP_INCREASE.def).toBe(3);
    expect(SP_INCREASE.agi).toBe(2);
    expect(SP_INCREASE.luc).toBe(2);
  });

  it('calcRawStat: base + allocated * spIncrease * charMult', () => {
    // 10 base atk + 10 SP * 3 = 40, * 1.0 charMult = 40
    expect(calcRawStat('atk', 10, 1.0)).toBe(40);
    // 10 + 10*3 = 40, * 1.1 = 44
    expect(calcRawStat('atk', 10, 1.1)).toBe(44);
  });

  it('calcEquipmentPercentMult: multiplicative stacking', () => {
    expect(calcEquipmentPercentMult('atk', noEquip)).toBe(1);
    expect(calcEquipmentPercentMult('atk', [pctWeapon])).toBe(2); // +100%
  });

  it('calcEquipmentFlat: additive', () => {
    expect(calcEquipmentFlat('atk', noEquip)).toBe(0);
    expect(calcEquipmentFlat('atk', [flatWeapon])).toBe(50);
  });

  it('calcFinalStat: (raw + flat) * pct * baseAbility', () => {
    // atk: base=10, sp=0, charMult=1, flat=50, pct=2 (100%), baseAbility=1
    // (10 + 50) * 2 * 1 = 120
    expect(calcFinalStat('atk', 0, 1.0, [flatWeapon, pctWeapon], 1)).toBe(120);
  });

  it('calcDamageReduction: DEF/(DEF+500)', () => {
    expect(calcDamageReduction(0)).toBe(0);
    expect(calcDamageReduction(500)).toBeCloseTo(0.5);
    expect(calcDamageReduction(1000)).toBeCloseTo(0.667, 2);
  });

  it('calcCritChance: floor at 0.95', () => {
    expect(calcCritChance(0, 0)).toBeCloseTo(0.05);
    // agi=1000: 0.05 + 1.0 = 1.05 → clamped to 0.95
    expect(calcCritChance(1000, 0)).toBe(0.95);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/stats.test.ts
```

Expected: `Cannot find module './stats'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/systems/stats.ts`:

```ts
import type { StatKey, Equipment, AllocatedStats } from '../types';
import type { IStatSystem } from '@forge/core';

export const BASE_STATS: AllocatedStats = { hp: 100, atk: 10, def: 10, agi: 5, luc: 5 };
export const SP_INCREASE: AllocatedStats = { hp: 5, atk: 3, def: 3, agi: 2, luc: 2 };

export function calcRawStat(key: StatKey, allocated: number, charMult: number): number {
  return (BASE_STATS[key] + allocated * SP_INCREASE[key]) * charMult;
}

export function calcEquipmentPercentMult(key: StatKey, equipped: Equipment[]): number {
  return equipped.reduce((mult, item) => {
    const pct = item.stats.percent?.[key] ?? 0;
    return mult * (1 + pct / 100);
  }, 1);
}

export function calcEquipmentFlat(key: StatKey, equipped: Equipment[]): number {
  return equipped.reduce((sum, item) => sum + (item.stats.flat?.[key] ?? 0), 0);
}

export function calcFinalStat(
  key: StatKey,
  allocated: number,
  charMult: number,
  equipped: Equipment[],
  baseAbilityMult: number
): number {
  const raw = calcRawStat(key, allocated, charMult);
  const flat = calcEquipmentFlat(key, equipped);
  const pct = calcEquipmentPercentMult(key, equipped);
  return Math.floor((raw + flat) * pct * baseAbilityMult);
}

export function calcDamageReduction(def: number): number {
  return def / (def + 500);
}

export function calcCritChance(agi: number, luc: number): number {
  return Math.min(0.95, 0.05 + agi * 0.001 + luc * 0.0005);
}

export const statSystem: IStatSystem = {
  calcFinalStat: (base, spPoints, percentMult, charMult, baseAbilityMult) =>
    Math.floor((base + spPoints) * percentMult * charMult * baseAbilityMult),
  calcDamageReduction,
  calcCritChance,
};
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/stats.test.ts
```

Expected: `8 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/stats.ts games/inflation-rpg/src/systems/stats.test.ts
git commit -m "feat(inflation-rpg): add stat calculation system with tests"
```

---

## Task 7: systems/equipment.ts (TDD)

**Files:**
- Create: `games/inflation-rpg/src/systems/equipment.ts`
- Create: `games/inflation-rpg/src/systems/equipment.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/systems/equipment.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  SLOT_LIMITS,
  canDrop,
  addToInventory,
  removeFromInventory,
  getAllEquipped,
} from './equipment';
import type { Equipment, Inventory } from '../types';

const mkWeapon = (id: string): Equipment => ({
  id, name: id, slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
});

const emptyInv: Inventory = { weapons: [], armors: [], accessories: [] };

describe('Equipment System', () => {
  it('SLOT_LIMITS: weapon=10, armor=10, accessory=3', () => {
    expect(SLOT_LIMITS.weapon).toBe(10);
    expect(SLOT_LIMITS.armor).toBe(10);
    expect(SLOT_LIMITS.accessory).toBe(3);
  });

  it('canDrop: true when slot not full', () => {
    expect(canDrop(emptyInv, 'weapon')).toBe(true);
  });

  it('canDrop: false when slot at limit', () => {
    const fullWeapons = Array.from({ length: 10 }, (_, i) => mkWeapon(`w${i}`));
    const inv: Inventory = { ...emptyInv, weapons: fullWeapons };
    expect(canDrop(inv, 'weapon')).toBe(false);
  });

  it('addToInventory: adds item to correct slot', () => {
    const item = mkWeapon('sword');
    const result = addToInventory(emptyInv, item);
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0]?.id).toBe('sword');
  });

  it('addToInventory: does not add when slot full', () => {
    const fullWeapons = Array.from({ length: 10 }, (_, i) => mkWeapon(`w${i}`));
    const inv: Inventory = { ...emptyInv, weapons: fullWeapons };
    const result = addToInventory(inv, mkWeapon('extra'));
    expect(result.weapons).toHaveLength(10);
  });

  it('removeFromInventory: removes by id', () => {
    const inv: Inventory = { ...emptyInv, weapons: [mkWeapon('sword')] };
    const result = removeFromInventory(inv, 'sword');
    expect(result.weapons).toHaveLength(0);
  });

  it('getAllEquipped: combines all slots', () => {
    const inv: Inventory = {
      weapons: [mkWeapon('w1')],
      armors: [],
      accessories: [],
    };
    expect(getAllEquipped(inv)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/equipment.test.ts
```

Expected: `Cannot find module './equipment'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/systems/equipment.ts`:

```ts
import type { Equipment, EquipmentSlot, Inventory } from '../types';

export const SLOT_LIMITS: Record<EquipmentSlot, number> = {
  weapon: 10,
  armor: 10,
  accessory: 3,
};

function slotArray(inv: Inventory, slot: EquipmentSlot): Equipment[] {
  if (slot === 'weapon') return inv.weapons;
  if (slot === 'armor') return inv.armors;
  return inv.accessories;
}

function setSlotArray(inv: Inventory, slot: EquipmentSlot, arr: Equipment[]): Inventory {
  if (slot === 'weapon') return { ...inv, weapons: arr };
  if (slot === 'armor') return { ...inv, armors: arr };
  return { ...inv, accessories: arr };
}

export function canDrop(inv: Inventory, slot: EquipmentSlot): boolean {
  return slotArray(inv, slot).length < SLOT_LIMITS[slot];
}

export function addToInventory(inv: Inventory, item: Equipment): Inventory {
  if (!canDrop(inv, item.slot)) return inv;
  return setSlotArray(inv, item.slot, [...slotArray(inv, item.slot), item]);
}

export function removeFromInventory(inv: Inventory, itemId: string): Inventory {
  return {
    weapons: inv.weapons.filter(e => e.id !== itemId),
    armors: inv.armors.filter(e => e.id !== itemId),
    accessories: inv.accessories.filter(e => e.id !== itemId),
  };
}

export function getAllEquipped(inv: Inventory): Equipment[] {
  return [...inv.weapons, ...inv.armors, ...inv.accessories];
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/equipment.test.ts
```

Expected: `7 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/equipment.ts games/inflation-rpg/src/systems/equipment.test.ts
git commit -m "feat(inflation-rpg): add equipment slot system with tests"
```

---

## Task 8: systems/experience.ts (TDD)

**Files:**
- Create: `games/inflation-rpg/src/systems/experience.ts`
- Create: `games/inflation-rpg/src/systems/experience.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/systems/experience.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { expRequired, applyExpGain, SP_PER_LEVEL } from './experience';

describe('Experience System', () => {
  it('SP_PER_LEVEL is 4', () => {
    expect(SP_PER_LEVEL).toBe(4);
  });

  it('expRequired(1) = 100', () => {
    expect(expRequired(1)).toBe(100);
  });

  it('expRequired grows with level', () => {
    expect(expRequired(10)).toBeGreaterThan(expRequired(1));
    expect(expRequired(100)).toBeGreaterThan(expRequired(10));
  });

  it('applyExpGain: levels up when exp sufficient', () => {
    const needed = expRequired(1); // 100
    const result = applyExpGain(0, 1, needed, false);
    expect(result.newLevel).toBe(2);
    expect(result.spGained).toBe(4);
    expect(result.newExp).toBe(0);
  });

  it('applyExpGain: multiple levels at once', () => {
    const bigExp = expRequired(1) + expRequired(2) + expRequired(3);
    const result = applyExpGain(0, 1, bigExp, false);
    expect(result.newLevel).toBe(4);
    expect(result.spGained).toBe(12);
  });

  it('applyExpGain: hard mode multiplies exp by 10', () => {
    const result = applyExpGain(0, 1, expRequired(1) / 10, true);
    expect(result.newLevel).toBe(2);
  });

  it('applyExpGain: partial exp carries over', () => {
    const result = applyExpGain(0, 1, 50, false);
    expect(result.newLevel).toBe(1);
    expect(result.newExp).toBe(50);
    expect(result.spGained).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/experience.test.ts
```

Expected: `Cannot find module './experience'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/systems/experience.ts`:

```ts
export const SP_PER_LEVEL = 4;

export function expRequired(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.8));
}

export function applyExpGain(
  currentExp: number,
  currentLevel: number,
  gainedExp: number,
  isHard: boolean
): { newLevel: number; newExp: number; spGained: number } {
  let exp = currentExp + gainedExp * (isHard ? 10 : 1);
  let level = currentLevel;
  let spGained = 0;

  while (exp >= expRequired(level)) {
    exp -= expRequired(level);
    level++;
    spGained += SP_PER_LEVEL;
  }

  return { newLevel: level, newExp: exp, spGained };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/experience.test.ts
```

Expected: `7 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/experience.ts games/inflation-rpg/src/systems/experience.test.ts
git commit -m "feat(inflation-rpg): add experience/level-up system with tests"
```

---

## Task 9: systems/progression.ts (TDD)

**Files:**
- Create: `games/inflation-rpg/src/systems/progression.ts`
- Create: `games/inflation-rpg/src/systems/progression.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/systems/progression.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  HARD_MODE_UNLOCK_LEVEL,
  MAX_BASE_ABILITY_LEVEL,
  isHardModeUnlocked,
  calcBaseAbilityMult,
  onBossKill,
  getBaseAbilityLevel,
} from './progression';

describe('Progression System', () => {
  it('HARD_MODE_UNLOCK_LEVEL is 100000', () => {
    expect(HARD_MODE_UNLOCK_LEVEL).toBe(100_000);
  });

  it('MAX_BASE_ABILITY_LEVEL is 18', () => {
    expect(MAX_BASE_ABILITY_LEVEL).toBe(18);
  });

  it('isHardModeUnlocked: false below threshold', () => {
    expect(isHardModeUnlocked(99_999)).toBe(false);
  });

  it('isHardModeUnlocked: true at or above threshold', () => {
    expect(isHardModeUnlocked(100_000)).toBe(true);
    expect(isHardModeUnlocked(200_000)).toBe(true);
  });

  it('calcBaseAbilityMult: 1 at level 0', () => {
    expect(calcBaseAbilityMult(0)).toBe(1);
  });

  it('calcBaseAbilityMult: 1.9 at level 18', () => {
    expect(calcBaseAbilityMult(18)).toBeCloseTo(1.9);
  });

  it('onBossKill: adds new boss to list', () => {
    const result = onBossKill('goblin-chief', [], 9);
    expect(result).toContain('goblin-chief');
    expect(result).toHaveLength(1);
  });

  it('onBossKill: does not add duplicate', () => {
    const result = onBossKill('goblin-chief', ['goblin-chief'], 9);
    expect(result).toHaveLength(1);
  });

  it('onBossKill: does not exceed maxLevel', () => {
    const full = Array.from({ length: 9 }, (_, i) => `boss-${i}`);
    const result = onBossKill('new-boss', full, 9);
    expect(result).toHaveLength(9);
  });

  it('getBaseAbilityLevel: sum of killed bosses, capped at 18', () => {
    const normal = ['a', 'b', 'c'];
    const hard = ['d', 'e'];
    expect(getBaseAbilityLevel(normal, hard)).toBe(5);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/progression.test.ts
```

Expected: `Cannot find module './progression'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/systems/progression.ts`:

```ts
import type { IProgressionSystem } from '@forge/core';

export const HARD_MODE_UNLOCK_LEVEL = 100_000;
export const MAX_BASE_ABILITY_LEVEL = 18;

export function isHardModeUnlocked(bestRunLevel: number): boolean {
  return bestRunLevel >= HARD_MODE_UNLOCK_LEVEL;
}

export function calcBaseAbilityMult(level: number): number {
  return 1 + level * 0.05;
}

export function onBossKill(
  bossId: string,
  killed: string[],
  maxLevel: number
): string[] {
  if (killed.includes(bossId) || killed.length >= maxLevel) return killed;
  return [...killed, bossId];
}

export function getBaseAbilityLevel(
  normalKilled: string[],
  hardKilled: string[]
): number {
  return Math.min(MAX_BASE_ABILITY_LEVEL, normalKilled.length + hardKilled.length);
}

export const progressionSystem: IProgressionSystem = {
  isHardModeUnlocked,
  calcBaseAbilityMult,
  onBossKill,
};
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/systems/progression.test.ts
```

Expected: `10 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/progression.ts games/inflation-rpg/src/systems/progression.test.ts
git commit -m "feat(inflation-rpg): add progression system (base abilities + hard mode) with tests"
```

---

## Task 10: store/gameStore.ts (Zustand)

**Files:**
- Create: `games/inflation-rpg/src/store/gameStore.ts`
- Create: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/store/gameStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_RUN, INITIAL_META } from './gameStore';

// Zustand store는 모듈 레벨 싱글턴 — 매 테스트 전 리셋
beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('GameStore', () => {
  it('initial screen is main-menu', () => {
    expect(useGameStore.getState().screen).toBe('main-menu');
  });

  it('startRun: sets characterId, resets run, navigates to world-map', () => {
    useGameStore.getState().startRun('hwarang', false);
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.run.bp).toBe(30);
    expect(state.run.level).toBe(1);
    expect(state.screen).toBe('world-map');
  });

  it('encounterMonster: decrements BP by 1', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster();
    expect(useGameStore.getState().run.bp).toBe(29);
  });

  it('defeatRun normal: decrements BP by 2', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster(); // -1 = 29
    useGameStore.getState().defeatRun();        // -2 = 27
    expect(useGameStore.getState().run.bp).toBe(27);
  });

  it('allocateSP: increases allocated stat, decreases statPoints', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().gainLevels(1, 4);
    useGameStore.getState().allocateSP('atk', 2);
    const run = useGameStore.getState().run;
    expect(run.allocated.atk).toBe(2);
    expect(run.statPoints).toBe(2);
  });

  it('allocateSP: does not go below 0 statPoints', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().allocateSP('atk', 5); // no SP available
    expect(useGameStore.getState().run.allocated.atk).toBe(0);
  });

  it('endRun: updates bestRunLevel in meta', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().gainLevels(999, 0);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.bestRunLevel).toBe(1000);
    expect(useGameStore.getState().screen).toBe('game-over');
  });

  it('addEquipment: adds to inventory', () => {
    const item = {
      id: 'w1', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
    };
    useGameStore.getState().addEquipment(item);
    expect(useGameStore.getState().meta.inventory.weapons).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/store/gameStore.test.ts
```

Expected: `Cannot find module './gameStore'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/store/gameStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunState, MetaState, Screen, Equipment, AllocatedStats } from '../types';
import { STARTING_BP, onEncounter, onDefeat, onBossKill as bpOnBossKill } from '../systems/bp';
import {
  onBossKill as progressionOnBossKill,
  getBaseAbilityLevel,
  isHardModeUnlocked,
} from '../systems/progression';
import { addToInventory, removeFromInventory } from '../systems/equipment';

const INITIAL_ALLOCATED: AllocatedStats = { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 };

export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentAreaId: 'village-entrance',
  isHardMode: false,
  monstersDefeated: 0,
  goldThisRun: 0,
};

export const INITIAL_META: MetaState = {
  inventory: { weapons: [], armors: [], accessories: [] },
  baseAbilityLevel: 0,
  soulGrade: 0,
  hardModeUnlocked: false,
  characterLevels: {},
  bestRunLevel: 0,
  normalBossesKilled: [],
  hardBossesKilled: [],
  gold: 0,
};

interface GameStore {
  screen: Screen;
  run: RunState;
  meta: MetaState;
  setScreen: (s: Screen) => void;
  startRun: (characterId: string, isHardMode: boolean) => void;
  endRun: () => void;
  encounterMonster: () => void;
  defeatRun: () => void;
  gainLevels: (levels: number, spGained: number) => void;
  gainExp: (exp: number) => void;
  allocateSP: (stat: keyof AllocatedStats, amount: number) => void;
  bossDrop: (bossId: string, bpReward: number) => void;
  addEquipment: (item: Equipment) => void;
  sellEquipment: (itemId: string, price: number) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'main-menu',
      run: INITIAL_RUN,
      meta: INITIAL_META,

      setScreen: (screen) => set({ screen }),

      startRun: (characterId, isHardMode) =>
        set({ run: { ...INITIAL_RUN, characterId, isHardMode }, screen: 'world-map' }),

      endRun: () => {
        const { run, meta } = get();
        const bestRunLevel = Math.max(meta.bestRunLevel, run.level);
        set({
          run: INITIAL_RUN,
          meta: { ...meta, bestRunLevel, hardModeUnlocked: isHardModeUnlocked(bestRunLevel) },
          screen: 'game-over',
        });
      },

      encounterMonster: () =>
        set((s) => ({ run: { ...s.run, bp: onEncounter(s.run.bp) } })),

      defeatRun: () =>
        set((s) => ({ run: { ...s.run, bp: onDefeat(s.run.bp, s.run.isHardMode) } })),

      gainLevels: (levels, spGained) =>
        set((s) => ({
          run: { ...s.run, level: s.run.level + levels, statPoints: s.run.statPoints + spGained },
        })),

      gainExp: (exp) =>
        set((s) => ({ run: { ...s.run, exp: s.run.exp + exp } })),

      allocateSP: (stat, amount) =>
        set((s) => {
          if (s.run.statPoints < amount) return s;
          return {
            run: {
              ...s.run,
              statPoints: s.run.statPoints - amount,
              allocated: { ...s.run.allocated, [stat]: s.run.allocated[stat] + amount },
            },
          };
        }),

      bossDrop: (bossId, bpReward) =>
        set((s) => {
          const normalKilled = s.run.isHardMode
            ? s.meta.normalBossesKilled
            : progressionOnBossKill(bossId, s.meta.normalBossesKilled, 9);
          const hardKilled = s.run.isHardMode
            ? progressionOnBossKill(bossId, s.meta.hardBossesKilled, 9)
            : s.meta.hardBossesKilled;
          return {
            run: { ...s.run, bp: bpOnBossKill(s.run.bp, bpReward) },
            meta: {
              ...s.meta,
              normalBossesKilled: normalKilled,
              hardBossesKilled: hardKilled,
              baseAbilityLevel: getBaseAbilityLevel(normalKilled, hardKilled),
            },
          };
        }),

      addEquipment: (item) =>
        set((s) => ({ meta: { ...s.meta, inventory: addToInventory(s.meta.inventory, item) } })),

      sellEquipment: (itemId, price) =>
        set((s) => ({
          meta: {
            ...s.meta,
            inventory: removeFromInventory(s.meta.inventory, itemId),
            gold: s.meta.gold + price,
          },
        })),
    }),
    {
      name: 'korea_inflation_rpg_save',
      partialize: (state) => ({ meta: state.meta }),
    }
  )
);

```


- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/store/gameStore.test.ts
```

Expected: `8 tests passed`

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모든 systems + store 테스트 통과 (30+ tests)

- [ ] **Step 6: typecheck + lint**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 errors

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/store/
git commit -m "feat(inflation-rpg): add Zustand game store with integration tests"
```

---

## 완료 체크리스트

Plan 1이 완료되면 아래가 모두 충족되어야 한다:

- [ ] `pnpm --filter @forge/game-inflation-rpg test` — 30개 이상 통과
- [ ] `pnpm --filter @forge/game-inflation-rpg typecheck` — 0 errors
- [ ] `pnpm --filter @forge/core typecheck` — 0 errors
- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm circular` — 순환 참조 없음

완료 후 Plan 2로 진행: `docs/superpowers/plans/2026-04-19-inflation-rpg-clone-plan2-ui.md`
