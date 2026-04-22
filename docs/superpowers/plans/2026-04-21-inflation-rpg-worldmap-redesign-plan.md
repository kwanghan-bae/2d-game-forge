# Inflation RPG — 월드맵 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 14개 단조로운 구역 리스트를 9개 지역 × 120개 구역의 CSS 일러스트 2단계 월드맵으로 교체한다.

**Architecture:** WorldMap → Region 노드 클릭 → RegionMap → Area 노드 탭 → 전투. `src/data/regions.ts` 신규 파일에 Region 타입 + 9개 데이터, `src/data/maps.ts`를 120개 구역으로 전면 교체, `RegionMap.tsx` 신규 컴포넌트, `WorldMap.tsx` 를 Region 노드 CSS 맵으로 교체.

**Tech Stack:** React 19, TypeScript 5, Zustand, CSS linear-gradient, SVG overlay, @testing-library/react + userEvent

---

## 파일 구조

| 파일 | 상태 | 역할 |
|------|------|------|
| `src/data/regions.ts` | 신규 | Region 인터페이스 + 9개 REGIONS 배열 + getRegionById |
| `src/types.ts` | 수정 | MapArea에 regionId, mapX, mapY, icon 추가 |
| `src/data/maps.ts` | 교체 | 120개 MAP_AREAS + getAreasByRegion + getAreaById + getAvailableAreas |
| `src/data/bosses.ts` | 수정 | jade-emperor/hard-emperor areaId 수정 (heaven-realm → jade-palace) |
| `src/screens/RegionMap.tsx` | 신규 | 지역 내 구역 노드 맵. regionId + onBack props |
| `src/screens/WorldMap.tsx` | 교체 | 9개 Region 노드 월드맵. selectedRegionId state → RegionMap 렌더링 |
| `src/screens/RegionMap.test.tsx` | 신규 | RegionMap 컴포넌트 테스트 |
| `src/screens/WorldMap.test.tsx` | 수정 | 2단계 탐색 테스트로 업데이트 |

---

## 시작 전: 브랜치 생성

모든 Task를 시작하기 전에 `main`에서 새 브랜치를 만든다.

```bash
git checkout main
git pull
git checkout -b feat/inflation-rpg-worldmap
```

---

### Task 1: `src/data/regions.ts` — Region 타입 + 9개 지역 데이터

**Files:**
- Create: `games/inflation-rpg/src/data/regions.ts`

- [ ] **Step 1: Create `games/inflation-rpg/src/data/regions.ts` with the following content**

```ts
export interface Region {
  id: string;
  nameKR: string;
  emoji: string;
  worldX: number;
  worldY: number;
  bgGradient: string;
  bgPattern: string;
  isHardOnly: boolean;
}

export const REGIONS: Region[] = [
  {
    id: 'plains',
    nameKR: '조선 평야',
    emoji: '🏘️',
    worldX: 20,
    worldY: 75,
    bgGradient: 'linear-gradient(160deg, #7ab648 0%, #5a9e30 60%, #3d7a20 100%)',
    bgPattern: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 8px)',
    isHardOnly: false,
  },
  {
    id: 'forest',
    nameKR: '깊은 숲',
    emoji: '🌲',
    worldX: 35,
    worldY: 55,
    bgGradient: 'linear-gradient(160deg, #1e4620 0%, #2d5a1b 50%, #1a3a12 100%)',
    bgPattern: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)',
    isHardOnly: false,
  },
  {
    id: 'mountains',
    nameKR: '산악 지대',
    emoji: '⛰️',
    worldX: 50,
    worldY: 40,
    bgGradient: 'linear-gradient(160deg, #7f8c8d 0%, #566573 60%, #2c3e50 100%)',
    bgPattern: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 10px)',
    isHardOnly: false,
  },
  {
    id: 'sea',
    nameKR: '동해 바다',
    emoji: '🌊',
    worldX: 72,
    worldY: 45,
    bgGradient: 'linear-gradient(180deg, #1a5276 0%, #154360 50%, #0b2d44 100%)',
    bgPattern: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, transparent 1px, transparent 20px), repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 8px)',
    isHardOnly: false,
  },
  {
    id: 'volcano',
    nameKR: '화산 지대',
    emoji: '🌋',
    worldX: 68,
    worldY: 68,
    bgGradient: 'linear-gradient(160deg, #c0392b 0%, #922b21 60%, #641e16 100%)',
    bgPattern: 'radial-gradient(circle at 50% 50%, rgba(255,120,0,0.08) 0%, transparent 60%)',
    isHardOnly: false,
  },
  {
    id: 'underworld',
    nameKR: '저승',
    emoji: '💀',
    worldX: 48,
    worldY: 20,
    bgGradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    bgPattern: 'radial-gradient(ellipse at 50% 50%, rgba(100,0,200,0.06) 0%, transparent 70%)',
    isHardOnly: false,
  },
  {
    id: 'heaven',
    nameKR: '천상계',
    emoji: '☁️',
    worldX: 30,
    worldY: 20,
    bgGradient: 'linear-gradient(160deg, #d5e8f5 0%, #a9cfe8 50%, #7ab8e8 100%)',
    bgPattern: 'radial-gradient(circle 3px at 10px 10px, rgba(255,255,255,0.5) 100%, transparent 0%), radial-gradient(circle 3px at 30px 30px, rgba(255,255,255,0.3) 100%, transparent 0%)',
    isHardOnly: false,
  },
  {
    id: 'chaos',
    nameKR: '혼돈의 끝',
    emoji: '🌀',
    worldX: 50,
    worldY: 10,
    bgGradient: 'linear-gradient(160deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
    bgPattern: 'conic-gradient(from 0deg at 50% 50%, rgba(100,0,255,0.05), rgba(0,100,255,0.05), rgba(100,0,255,0.05))',
    isHardOnly: false,
  },
  {
    id: 'demon-castle',
    nameKR: '마왕의 성',
    emoji: '🏰',
    worldX: 80,
    worldY: 25,
    bgGradient: 'linear-gradient(160deg, #3d0000 0%, #1a0000 100%)',
    bgPattern: 'repeating-linear-gradient(45deg, rgba(200,0,0,0.06) 0px, rgba(200,0,0,0.06) 1px, transparent 1px, transparent 8px)',
    isHardOnly: true,
  },
];

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
```

- [ ] **Step 2: Run typecheck to confirm no errors**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors (regions.ts is standalone, no imports from other new files yet)

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/regions.ts
git commit -m "feat(game-inflation-rpg): add regions.ts with 9 region definitions"
```

---

### Task 2: `types.ts` + `maps.ts` + `bosses.ts` 데이터 교체

**Files:**
- Modify: `games/inflation-rpg/src/types.ts` (MapArea 인터페이스)
- Modify: `games/inflation-rpg/src/data/maps.ts` (120개 구역)
- Modify: `games/inflation-rpg/src/data/bosses.ts` (heaven-realm → jade-palace 수정)

- [ ] **Step 1: Update `MapArea` interface in `games/inflation-rpg/src/types.ts`**

Find the `MapArea` interface (lines 64–70) and replace with:

```ts
export interface MapArea {
  id: string;
  nameKR: string;
  regionId: string;
  levelRange: [number, number];
  bossId?: string;
  isHardOnly: boolean;
  mapX: number;
  mapY: number;
  icon: string;
}
```

- [ ] **Step 2: Replace `games/inflation-rpg/src/data/maps.ts` entirely**

```ts
import type { MapArea } from '../types';

export const MAP_AREAS: MapArea[] = [
  // ── Region: plains (조선 평야) ── 22구역 Lv 1–5,000
  { id: 'village-entrance',  nameKR: '마을 입구',    regionId: 'plains', levelRange: [1, 8],          bossId: undefined,              isHardOnly: false, mapX: 30, mapY: 85, icon: 'village' },
  { id: 'farm-fields',       nameKR: '농가 들판',    regionId: 'plains', levelRange: [5, 18],         bossId: undefined,              isHardOnly: false, mapX: 50, mapY: 80, icon: 'wheat' },
  { id: 'brook-side',        nameKR: '개울가',       regionId: 'plains', levelRange: [12, 35],        bossId: undefined,              isHardOnly: false, mapX: 70, mapY: 82, icon: 'water-drop' },
  { id: 'market-street',     nameKR: '장터 거리',    regionId: 'plains', levelRange: [25, 60],        bossId: undefined,              isHardOnly: false, mapX: 40, mapY: 70, icon: 'coins' },
  { id: 'tavern-street',     nameKR: '주막 거리',    regionId: 'plains', levelRange: [45, 100],       bossId: undefined,              isHardOnly: false, mapX: 60, mapY: 72, icon: 'beer' },
  { id: 'beacon-hill',       nameKR: '봉수대 언덕',  regionId: 'plains', levelRange: [75, 155],       bossId: undefined,              isHardOnly: false, mapX: 25, mapY: 62, icon: 'fire' },
  { id: 'dirt-road',         nameKR: '황톳길',       regionId: 'plains', levelRange: [120, 220],      bossId: undefined,              isHardOnly: false, mapX: 50, mapY: 60, icon: 'footprint' },
  { id: 'reed-field',        nameKR: '갈대밭',       regionId: 'plains', levelRange: [170, 300],      bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 65, icon: 'grass' },
  { id: 'old-fortress',      nameKR: '옛 성터',      regionId: 'plains', levelRange: [230, 400],      bossId: 'plains-ghost',         isHardOnly: false, mapX: 35, mapY: 52, icon: 'castle' },
  { id: 'grassland-end',     nameKR: '초원 끝',      regionId: 'plains', levelRange: [320, 500],      bossId: undefined,              isHardOnly: false, mapX: 60, mapY: 50, icon: 'plain-arrow' },
  { id: 'foothills-village', nameKR: '산기슭 마을',  regionId: 'plains', levelRange: [420, 650],      bossId: undefined,              isHardOnly: false, mapX: 20, mapY: 45, icon: 'village' },
  { id: 'watermill',         nameKR: '물레방아 터',  regionId: 'plains', levelRange: [550, 800],      bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 42, icon: 'gears' },
  { id: 'wasteland',         nameKR: '황무지',       regionId: 'plains', levelRange: [700, 1000],     bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 45, icon: 'arid' },
  { id: 'spirit-post',       nameKR: '서낭당 고개',  regionId: 'plains', levelRange: [850, 1200],     bossId: 'spirit-post-guardian', isHardOnly: false, mapX: 38, mapY: 35, icon: 'wooden-sign' },
  { id: 'ferry-crossing',    nameKR: '나루터',       regionId: 'plains', levelRange: [1000, 1500],    bossId: undefined,              isHardOnly: false, mapX: 65, mapY: 38, icon: 'boat' },
  { id: 'flooded-plains',    nameKR: '범람한 들판',  regionId: 'plains', levelRange: [1200, 1800],    bossId: undefined,              isHardOnly: false, mapX: 28, mapY: 25, icon: 'rain' },
  { id: 'ruined-village',    nameKR: '폐허 마을',    regionId: 'plains', levelRange: [1500, 2200],    bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 28, icon: 'ruins' },
  { id: 'cursed-fields',     nameKR: '저주받은 땅',  regionId: 'plains', levelRange: [1800, 2500],    bossId: 'cursed-plains',        isHardOnly: false, mapX: 72, mapY: 28, icon: 'poison' },
  { id: 'wanderer-camp',     nameKR: '유랑민 야영지',regionId: 'plains', levelRange: [2000, 3000],    bossId: undefined,              isHardOnly: false, mapX: 40, mapY: 18, icon: 'campfire' },
  { id: 'plains-border',     nameKR: '평야 끝자락',  regionId: 'plains', levelRange: [2500, 3500],    bossId: 'plains-lord',          isHardOnly: false, mapX: 62, mapY: 18, icon: 'border-post' },
  { id: 'frontier-post',     nameKR: '변방 초소',    regionId: 'plains', levelRange: [3000, 4000],    bossId: undefined,              isHardOnly: false, mapX: 25, mapY: 12, icon: 'watchtower' },
  { id: 'borderlands',       nameKR: '국경 지대',    regionId: 'plains', levelRange: [3500, 5000],    bossId: undefined,              isHardOnly: false, mapX: 50, mapY: 10, icon: 'crossed-swords' },

  // ── Region: forest (깊은 숲) ── 14구역 Lv 500–22,000
  { id: 'forest-entrance',   nameKR: '숲의 입구',    regionId: 'forest', levelRange: [500, 900],      bossId: undefined,              isHardOnly: false, mapX: 30, mapY: 85, icon: 'pine-tree' },
  { id: 'bamboo-grove',      nameKR: '대나무 숲',    regionId: 'forest', levelRange: [750, 1300],     bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 80, icon: 'bamboo' },
  { id: 'ancient-tree',      nameKR: '고목 군락',    regionId: 'forest', levelRange: [1100, 1800],    bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 75, icon: 'oak' },
  { id: 'fox-den',           nameKR: '여우굴',       regionId: 'forest', levelRange: [1500, 2500],    bossId: 'gumiho',               isHardOnly: false, mapX: 40, mapY: 65, icon: 'fox' },
  { id: 'moss-rocks',        nameKR: '이끼 바위',    regionId: 'forest', levelRange: [2000, 3200],    bossId: undefined,              isHardOnly: false, mapX: 65, mapY: 62, icon: 'stone-block' },
  { id: 'mushroom-valley',   nameKR: '버섯 골짜기',  regionId: 'forest', levelRange: [2700, 4000],    bossId: undefined,              isHardOnly: false, mapX: 25, mapY: 52, icon: 'mushroom' },
  { id: 'spirit-tree',       nameKR: '신령 나무',    regionId: 'forest', levelRange: [3300, 5000],    bossId: 'tree-spirit',          isHardOnly: false, mapX: 55, mapY: 48, icon: 'tree-face' },
  { id: 'dark-forest',       nameKR: '어두운 숲',    regionId: 'forest', levelRange: [4000, 6500],    bossId: undefined,              isHardOnly: false, mapX: 75, mapY: 42, icon: 'dark-forest' },
  { id: 'hidden-shrine',     nameKR: '숨겨진 사당',  regionId: 'forest', levelRange: [5500, 8000],    bossId: undefined,              isHardOnly: false, mapX: 38, mapY: 35, icon: 'torii-gate' },
  { id: 'beast-territory',   nameKR: '맹수 구역',    regionId: 'forest', levelRange: [7000, 10000],   bossId: 'black-tiger',          isHardOnly: false, mapX: 62, mapY: 30, icon: 'tiger' },
  { id: 'poison-grove',      nameKR: '독초 군락',    regionId: 'forest', levelRange: [8500, 12000],   bossId: undefined,              isHardOnly: false, mapX: 28, mapY: 22, icon: 'poison' },
  { id: 'forest-labyrinth',  nameKR: '숲의 미로',    regionId: 'forest', levelRange: [10000, 15000],  bossId: undefined,              isHardOnly: false, mapX: 55, mapY: 18, icon: 'maze' },
  { id: 'cursed-tree',       nameKR: '저주받은 고목', regionId: 'forest', levelRange: [13000, 18000], bossId: 'cursed-tree-spirit',   isHardOnly: false, mapX: 72, mapY: 15, icon: 'dead-tree' },
  { id: 'forest-heart',      nameKR: '숲의 심장',    regionId: 'forest', levelRange: [16000, 22000],  bossId: 'forest-ruler',         isHardOnly: false, mapX: 42, mapY: 8,  icon: 'heart' },

  // ── Region: mountains (산악 지대) ── 16구역 Lv 3,000–180,000
  { id: 'mountain-trail',    nameKR: '산길 입구',    regionId: 'mountains', levelRange: [3000, 5500],    bossId: undefined,           isHardOnly: false, mapX: 30, mapY: 88, icon: 'hiking' },
  { id: 'goblin-pass',       nameKR: '도깨비 고개',  regionId: 'mountains', levelRange: [4500, 7000],    bossId: 'goblin-chief',      isHardOnly: false, mapX: 55, mapY: 82, icon: 'imp' },
  { id: 'rocky-ridge',       nameKR: '바위 능선',    regionId: 'mountains', levelRange: [6000, 9500],    bossId: undefined,           isHardOnly: false, mapX: 75, mapY: 78, icon: 'rock' },
  { id: 'cliff-path',        nameKR: '절벽 길',      regionId: 'mountains', levelRange: [8000, 12000],   bossId: undefined,           isHardOnly: false, mapX: 40, mapY: 68, icon: 'cliff' },
  { id: 'mountain-shrine',   nameKR: '산신 사당',    regionId: 'mountains', levelRange: [10000, 16000],  bossId: 'mountain-god',      isHardOnly: false, mapX: 65, mapY: 65, icon: 'totem' },
  { id: 'snow-valley',       nameKR: '설국 계곡',    regionId: 'mountains', levelRange: [13000, 20000],  bossId: undefined,           isHardOnly: false, mapX: 25, mapY: 55, icon: 'snowflake' },
  { id: 'kumgang-foot',      nameKR: '금강산 기슭',  regionId: 'mountains', levelRange: [17000, 26000],  bossId: undefined,           isHardOnly: false, mapX: 55, mapY: 50, icon: 'mountain' },
  { id: 'kumgang-mid',       nameKR: '금강산 중턱',  regionId: 'mountains', levelRange: [22000, 32000],  bossId: undefined,           isHardOnly: false, mapX: 70, mapY: 42, icon: 'pine-tree' },
  { id: 'kumgang-peak',      nameKR: '금강산 정상',  regionId: 'mountains', levelRange: [28000, 40000],  bossId: 'kumgang-spirit',    isHardOnly: false, mapX: 40, mapY: 35, icon: 'mountain-peak' },
  { id: 'baekdu-approach',   nameKR: '백두 길목',    regionId: 'mountains', levelRange: [35000, 50000],  bossId: undefined,           isHardOnly: false, mapX: 65, mapY: 28, icon: 'arrow-right' },
  { id: 'baekdu-gate',       nameKR: '백두 관문',    regionId: 'mountains', levelRange: [45000, 62000],  bossId: 'gate-guardian',     isHardOnly: false, mapX: 30, mapY: 22, icon: 'fortress' },
  { id: 'baekdu-cheonji',    nameKR: '백두 천지',    regionId: 'mountains', levelRange: [55000, 78000],  bossId: undefined,           isHardOnly: false, mapX: 55, mapY: 18, icon: 'lake' },
  { id: 'cloud-ridge',       nameKR: '구름 능선',    regionId: 'mountains', levelRange: [70000, 95000],  bossId: undefined,           isHardOnly: false, mapX: 72, mapY: 12, icon: 'cloud' },
  { id: 'thunder-gorge',     nameKR: '천둥 협곡',    regionId: 'mountains', levelRange: [85000, 115000], bossId: 'thunder-god',       isHardOnly: false, mapX: 38, mapY: 8,  icon: 'lightning' },
  { id: 'spirit-peak',       nameKR: '신령 봉우리',  regionId: 'mountains', levelRange: [105000, 140000],bossId: undefined,           isHardOnly: false, mapX: 62, mapY: 5,  icon: 'spirit' },
  { id: 'summit-beyond',     nameKR: '구름 너머 정상',regionId: 'mountains', levelRange: [130000, 180000],bossId: 'sky-mountain-lord', isHardOnly: false, mapX: 48, mapY: 2,  icon: 'star' },

  // ── Region: sea (동해 바다) ── 13구역 Lv 20,000–400,000
  { id: 'coastline',         nameKR: '해안가',         regionId: 'sea', levelRange: [20000, 35000],   bossId: undefined,           isHardOnly: false, mapX: 30, mapY: 85, icon: 'anchor' },
  { id: 'tidal-flats',       nameKR: '갯벌',           regionId: 'sea', levelRange: [28000, 45000],   bossId: undefined,           isHardOnly: false, mapX: 55, mapY: 80, icon: 'crab' },
  { id: 'cliff-coast',       nameKR: '파도치는 절벽',  regionId: 'sea', levelRange: [38000, 58000],   bossId: 'wave-spirit',       isHardOnly: false, mapX: 72, mapY: 75, icon: 'wave' },
  { id: 'deep-entrance',     nameKR: '심해 입구',      regionId: 'sea', levelRange: [50000, 75000],   bossId: undefined,           isHardOnly: false, mapX: 38, mapY: 65, icon: 'fish' },
  { id: 'dragon-palace',     nameKR: '용궁 어귀',      regionId: 'sea', levelRange: [65000, 95000],   bossId: 'sea-god',           isHardOnly: false, mapX: 62, mapY: 60, icon: 'trident' },
  { id: 'coral-palace',      nameKR: '산호 궁전',      regionId: 'sea', levelRange: [80000, 115000],  bossId: undefined,           isHardOnly: false, mapX: 28, mapY: 52, icon: 'coral' },
  { id: 'deep-cave',         nameKR: '심해 동굴',      regionId: 'sea', levelRange: [95000, 135000],  bossId: undefined,           isHardOnly: false, mapX: 58, mapY: 45, icon: 'cave' },
  { id: 'dragon-treasury',   nameKR: '용왕의 보고',    regionId: 'sea', levelRange: [115000, 160000], bossId: 'dragon-king-guard', isHardOnly: false, mapX: 75, mapY: 38, icon: 'treasure' },
  { id: 'storm-vortex',      nameKR: '폭풍의 소용돌이',regionId: 'sea', levelRange: [135000, 185000], bossId: undefined,           isHardOnly: false, mapX: 35, mapY: 30, icon: 'vortex' },
  { id: 'glacier-sea',       nameKR: '빙하 바다',      regionId: 'sea', levelRange: [160000, 220000], bossId: 'ice-sea-dragon',    isHardOnly: false, mapX: 60, mapY: 25, icon: 'ice' },
  { id: 'undersea-volcano',  nameKR: '해저 화산',      regionId: 'sea', levelRange: [195000, 270000], bossId: undefined,           isHardOnly: false, mapX: 25, mapY: 18, icon: 'fire' },
  { id: 'deep-palace',       nameKR: '용궁 심층',      regionId: 'sea', levelRange: [240000, 330000], bossId: 'true-sea-god',      isHardOnly: false, mapX: 55, mapY: 12, icon: 'palace' },
  { id: 'abyss-throne',      nameKR: '심해 왕좌',      regionId: 'sea', levelRange: [300000, 400000], bossId: 'abyss-sea-ruler',   isHardOnly: false, mapX: 42, mapY: 5,  icon: 'throne' },

  // ── Region: volcano (화산 지대) ── 13구역 Lv 100,000–2,100,000
  { id: 'volcano-foot',      nameKR: '화산 기슭',   regionId: 'volcano', levelRange: [100000, 160000],  bossId: undefined,        isHardOnly: false, mapX: 30, mapY: 88, icon: 'mountain' },
  { id: 'lava-fields',       nameKR: '용암 들판',   regionId: 'volcano', levelRange: [140000, 210000],  bossId: undefined,        isHardOnly: false, mapX: 55, mapY: 82, icon: 'lava' },
  { id: 'ash-plains',        nameKR: '재의 평원',   regionId: 'volcano', levelRange: [185000, 265000],  bossId: 'ash-spirit',     isHardOnly: false, mapX: 72, mapY: 75, icon: 'ash' },
  { id: 'crater-entrance',   nameKR: '분화구 입구', regionId: 'volcano', levelRange: [240000, 330000],  bossId: undefined,        isHardOnly: false, mapX: 40, mapY: 65, icon: 'circle' },
  { id: 'black-dragon-den',  nameKR: '흑룡 소굴',   regionId: 'volcano', levelRange: [300000, 420000],  bossId: 'black-dragon',   isHardOnly: false, mapX: 65, mapY: 58, icon: 'dragon' },
  { id: 'lava-waterfall',    nameKR: '용암 폭포',   regionId: 'volcano', levelRange: [380000, 520000],  bossId: undefined,        isHardOnly: false, mapX: 28, mapY: 48, icon: 'waterfall' },
  { id: 'flame-gorge',       nameKR: '화염 협곡',   regionId: 'volcano', levelRange: [480000, 650000],  bossId: 'fire-warlord',   isHardOnly: false, mapX: 58, mapY: 42, icon: 'fire' },
  { id: 'crater-rim',        nameKR: '분화구 테두리',regionId: 'volcano', levelRange: [600000, 800000], bossId: undefined,        isHardOnly: false, mapX: 75, mapY: 35, icon: 'crater' },
  { id: 'magma-depths',      nameKR: '마그마 심층', regionId: 'volcano', levelRange: [750000, 1000000], bossId: 'magma-king',     isHardOnly: false, mapX: 35, mapY: 25, icon: 'lava' },
  { id: 'flame-kingdom',     nameKR: '불꽃 왕국',   regionId: 'volcano', levelRange: [950000, 1250000], bossId: undefined,        isHardOnly: false, mapX: 58, mapY: 18, icon: 'castle' },
  { id: 'underground-blaze', nameKR: '지하 불길',   regionId: 'volcano', levelRange: [1150000, 1500000],bossId: undefined,        isHardOnly: false, mapX: 28, mapY: 12, icon: 'fire' },
  { id: 'volcano-heart',     nameKR: '화산 심장부', regionId: 'volcano', levelRange: [1350000, 1700000],bossId: 'volcano-heart',  isHardOnly: false, mapX: 55, mapY: 7,  icon: 'heart' },
  { id: 'fire-throne',       nameKR: '불의 왕좌',   regionId: 'volcano', levelRange: [1600000, 2100000],bossId: 'fire-sovereign', isHardOnly: false, mapX: 42, mapY: 2,  icon: 'throne' },

  // ── Region: underworld (저승) ── 13구역 Lv 400,000–Infinity
  { id: 'underworld-gate',   nameKR: '저승 입구',       regionId: 'underworld', levelRange: [400000, 600000],   bossId: 'death-reaper',        isHardOnly: false, mapX: 50, mapY: 88, icon: 'gate' },
  { id: 'three-river',       nameKR: '삼도천',          regionId: 'underworld', levelRange: [550000, 800000],   bossId: undefined,             isHardOnly: false, mapX: 30, mapY: 78, icon: 'river' },
  { id: 'hell-gate',         nameKR: '저승 관문',       regionId: 'underworld', levelRange: [720000, 1000000],  bossId: 'hell-gate-guard',     isHardOnly: false, mapX: 68, mapY: 72, icon: 'portcullis' },
  { id: 'yama-hall',         nameKR: '염라대왕 전각',   regionId: 'underworld', levelRange: [900000, 1250000],  bossId: 'yama-king',           isHardOnly: false, mapX: 45, mapY: 62, icon: 'throne' },
  { id: 'oblivion-river',    nameKR: '망각의 강',       regionId: 'underworld', levelRange: [1150000, 1600000], bossId: undefined,             isHardOnly: false, mapX: 25, mapY: 52, icon: 'river' },
  { id: 'grudge-plains',     nameKR: '원혼 들판',       regionId: 'underworld', levelRange: [1400000, 1900000], bossId: 'grudge-general',      isHardOnly: false, mapX: 65, mapY: 45, icon: 'ghost' },
  { id: 'ghost-castle',      nameKR: '귀왕의 성',       regionId: 'underworld', levelRange: [1700000, 2400000], bossId: 'ghost-king',          isHardOnly: false, mapX: 42, mapY: 35, icon: 'haunted-house' },
  { id: 'deep-underworld',   nameKR: '저승 심층',       regionId: 'underworld', levelRange: [2200000, 3100000], bossId: undefined,             isHardOnly: false, mapX: 68, mapY: 28, icon: 'skull' },
  { id: 'hell-door',         nameKR: '지옥문',          regionId: 'underworld', levelRange: [2900000, 4000000], bossId: 'hell-door-guardian',  isHardOnly: false, mapX: 30, mapY: 20, icon: 'door' },
  { id: 'dark-kingdom',      nameKR: '어둠의 왕국',     regionId: 'underworld', levelRange: [3700000, 5200000], bossId: 'dark-kingdom-ruler',  isHardOnly: false, mapX: 55, mapY: 15, icon: 'crown' },
  { id: 'dissolution-zone',  nameKR: '존재 소멸 지대',  regionId: 'underworld', levelRange: [4800000, 6800000], bossId: undefined,             isHardOnly: false, mapX: 25, mapY: 8,  icon: 'void' },
  { id: 'final-judgment',    nameKR: '최후의 심판',     regionId: 'underworld', levelRange: [6200000, 8500000], bossId: 'final-judge',         isHardOnly: false, mapX: 60, mapY: 5,  icon: 'scale' },
  { id: 'underworld-depths', nameKR: '저승 최심층',     regionId: 'underworld', levelRange: [8000000, Infinity],bossId: 'underworld-lord',     isHardOnly: false, mapX: 42, mapY: 2,  icon: 'abyss' },

  // ── Region: heaven (천상계) ── 10구역 Lv 2,000,000–32,000,000
  { id: 'cloud-gate',        nameKR: '구름 관문',   regionId: 'heaven', levelRange: [2000000, 3000000],   bossId: 'cloud-guardian',          isHardOnly: false, mapX: 50, mapY: 88, icon: 'cloud' },
  { id: 'fairy-valley',      nameKR: '선녀 계곡',   regionId: 'heaven', levelRange: [2700000, 4000000],   bossId: undefined,                 isHardOnly: false, mapX: 30, mapY: 78, icon: 'feather' },
  { id: 'celestial-garden',  nameKR: '천상 정원',   regionId: 'heaven', levelRange: [3600000, 5200000],   bossId: 'celestial-garden-spirit', isHardOnly: false, mapX: 68, mapY: 72, icon: 'flower' },
  { id: 'jade-palace',       nameKR: '옥황상제 궁전',regionId: 'heaven', levelRange: [4800000, 6800000],  bossId: 'jade-emperor',            isHardOnly: false, mapX: 45, mapY: 60, icon: 'palace' },
  { id: 'star-field',        nameKR: '별자리 지대', regionId: 'heaven', levelRange: [6200000, 8800000],   bossId: undefined,                 isHardOnly: false, mapX: 25, mapY: 50, icon: 'star' },
  { id: 'thunder-divine',    nameKR: '천둥신 영역', regionId: 'heaven', levelRange: [8200000, 11500000],  bossId: 'thunder-celestial',       isHardOnly: false, mapX: 65, mapY: 42, icon: 'lightning' },
  { id: 'immortal-realm',    nameKR: '신선 경지',   regionId: 'heaven', levelRange: [10500000, 15000000], bossId: undefined,                 isHardOnly: false, mapX: 40, mapY: 32, icon: 'yin-yang' },
  { id: 'heaven-depths',     nameKR: '천상계 심층', regionId: 'heaven', levelRange: [13500000, 19000000], bossId: 'celestial-lord',          isHardOnly: false, mapX: 68, mapY: 22, icon: 'crown' },
  { id: 'chaos-door',        nameKR: '혼돈의 문 앞',regionId: 'heaven', levelRange: [17000000, 24000000], bossId: undefined,                 isHardOnly: false, mapX: 30, mapY: 15, icon: 'portal' },
  { id: 'heaven-deepest',    nameKR: '천상 최심층', regionId: 'heaven', levelRange: [22000000, 32000000], bossId: 'heaven-ruler',            isHardOnly: false, mapX: 52, mapY: 8,  icon: 'infinity' },

  // ── Region: chaos (혼돈의 끝) ── 9구역 visible + 1 hidden Lv 15,000,000–∞
  { id: 'chaos-land',        nameKR: '혼돈의 땅',    regionId: 'chaos', levelRange: [15000000, 25000000],   bossId: 'chaos-god',          isHardOnly: false, mapX: 50, mapY: 88, icon: 'chaos' },
  { id: 'time-rift',         nameKR: '시간의 틈',    regionId: 'chaos', levelRange: [22000000, 38000000],   bossId: undefined,            isHardOnly: false, mapX: 30, mapY: 75, icon: 'hourglass' },
  { id: 'void-boundary',     nameKR: '공허의 경계',  regionId: 'chaos', levelRange: [34000000, 56000000],   bossId: 'void-boundary-lord', isHardOnly: false, mapX: 68, mapY: 68, icon: 'void' },
  { id: 'existence-end',     nameKR: '존재의 끝',    regionId: 'chaos', levelRange: [52000000, 88000000],   bossId: undefined,            isHardOnly: false, mapX: 25, mapY: 55, icon: 'skull' },
  { id: 'time-collapse',     nameKR: '시간 붕괴 지대',regionId: 'chaos', levelRange: [80000000, 135000000], bossId: 'time-destroyer',     isHardOnly: false, mapX: 62, mapY: 45, icon: 'broken-clock' },
  { id: 'primal-void',       nameKR: '원초의 공허',  regionId: 'chaos', levelRange: [125000000, 210000000], bossId: undefined,            isHardOnly: false, mapX: 38, mapY: 35, icon: 'black-hole' },
  { id: 'god-battlefield',   nameKR: '신들의 전장',  regionId: 'chaos', levelRange: [190000000, 320000000], bossId: 'god-of-gods',        isHardOnly: false, mapX: 65, mapY: 25, icon: 'crossed-swords' },
  { id: 'final-gate',        nameKR: '최종 구역 입구',regionId: 'chaos', levelRange: [300000000, 500000000],bossId: undefined,            isHardOnly: false, mapX: 30, mapY: 15, icon: 'gate' },
  { id: 'final-realm',       nameKR: '최종 구역',    regionId: 'chaos', levelRange: [450000000, Infinity],  bossId: 'final-boss',         isHardOnly: false, mapX: 55, mapY: 8,  icon: 'crown' },
  // hidden: levelRange[0] === Infinity → UI에서 렌더링 스킵
  { id: 'primordial-chaos',  nameKR: '태초의 혼돈',  regionId: 'chaos', levelRange: [Infinity, Infinity],   bossId: 'primordial-chaos',   isHardOnly: false, mapX: 42, mapY: 2,  icon: 'infinity' },

  // ── Region: demon-castle (마왕의 성) ── 9구역 isHardOnly: true Lv 100–∞
  { id: 'hard-abyss',        nameKR: '심연',        regionId: 'demon-castle', levelRange: [100, 5000],          bossId: 'abyss-lord',          isHardOnly: true, mapX: 50, mapY: 88, icon: 'abyss' },
  { id: 'hard-void',         nameKR: '공허',        regionId: 'demon-castle', levelRange: [5000, 50000],        bossId: 'void-king',           isHardOnly: true, mapX: 35, mapY: 75, icon: 'void' },
  { id: 'demon-gate',        nameKR: '마왕의 관문', regionId: 'demon-castle', levelRange: [30000, 200000],      bossId: 'demon-gate-guardian', isHardOnly: true, mapX: 65, mapY: 65, icon: 'gate' },
  { id: 'cursed-castle',     nameKR: '저주받은 성', regionId: 'demon-castle', levelRange: [150000, 800000],     bossId: 'cursed-castle-lord',  isHardOnly: true, mapX: 30, mapY: 52, icon: 'haunted-house' },
  { id: 'demon-hall',        nameKR: '마왕의 전각', regionId: 'demon-castle', levelRange: [600000, 3000000],    bossId: 'demon-palace-lord',   isHardOnly: true, mapX: 60, mapY: 42, icon: 'throne' },
  { id: 'dark-treasury',     nameKR: '어둠의 보고', regionId: 'demon-castle', levelRange: [2000000, 10000000],  bossId: 'dark-treasury-guard', isHardOnly: true, mapX: 35, mapY: 30, icon: 'treasure' },
  { id: 'demon-throne-room', nameKR: '마왕의 옥좌', regionId: 'demon-castle', levelRange: [8000000, 40000000],  bossId: 'demon-throne',        isHardOnly: true, mapX: 65, mapY: 20, icon: 'crown' },
  { id: 'demon-inner',       nameKR: '마왕의 심층', regionId: 'demon-castle', levelRange: [30000000, 150000000],bossId: 'demon-king-inner',    isHardOnly: true, mapX: 40, mapY: 10, icon: 'skull' },
  { id: 'demon-king',        nameKR: '마왕 본체',   regionId: 'demon-castle', levelRange: [100000000, Infinity], bossId: 'demon-king',         isHardOnly: true, mapX: 55, mapY: 3,  icon: 'dragon' },
];

export function getAreaById(id: string): MapArea | undefined {
  return MAP_AREAS.find((a) => a.id === id);
}

export function getAvailableAreas(isHardMode: boolean): MapArea[] {
  return MAP_AREAS.filter(
    (a) => a.levelRange[0] !== Infinity && (!a.isHardOnly || isHardMode)
  );
}

export function getAreasByRegion(regionId: string, isHardMode: boolean): MapArea[] {
  return MAP_AREAS.filter(
    (a) =>
      a.regionId === regionId &&
      a.levelRange[0] !== Infinity &&
      (!a.isHardOnly || isHardMode)
  );
}
```

- [ ] **Step 3: Fix `games/inflation-rpg/src/data/bosses.ts` — `jade-emperor` / `hard-emperor` areaId**

`heaven-realm` 구역이 삭제되고 `jade-palace`로 대체됐으므로 두 보스의 areaId를 수정한다. bosses.ts에서 다음 두 줄을 찾아 수정:

```ts
// BEFORE:
{ id: 'jade-emperor',  nameKR: '옥황상제', emoji: '👑', areaId: 'heaven-realm', bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
// ...
{ id: 'hard-emperor',  nameKR: '천제',     emoji: '🏆', areaId: 'heaven-realm', bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },

// AFTER:
{ id: 'jade-emperor',  nameKR: '옥황상제', emoji: '👑', areaId: 'jade-palace',  bpReward: 6, isHardMode: false, hpMult: 20, atkMult: 3.5 },
// ...
{ id: 'hard-emperor',  nameKR: '천제',     emoji: '🏆', areaId: 'jade-palace',  bpReward: 6, isHardMode: true,  hpMult: 25, atkMult: 4.5 },
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors. TypeScript가 MapArea 필드 누락에 대해 에러를 낼 수 있으면 모두 수정.

- [ ] **Step 5: Fix `games/inflation-rpg/src/screens/WorldMap.test.tsx` — `주막 거리` 레벨 30 → 45**

`주막 거리` minLevel이 30 → 45로 변경되어 두 테스트가 깨진다. 커밋 전에 수정한다.

다음 세 줄을 찾아 교체:

```ts
// BEFORE:
  it('주막 거리 (minLevel 30) is locked at level 15', () => {
// AFTER:
  it('주막 거리 (minLevel 45) is locked at level 15', () => {
```

```ts
// BEFORE:
  it('주막 거리 shows Lv.30 필요 text when locked', () => {
    render(<WorldMap />); // level 1
    expect(screen.getByText(/Lv\.30 필요/i)).toBeInTheDocument();
  });

  it('주막 거리 is accessible at exactly level 30', () => {
    useGameStore.setState({ run: { ...runWithChar, level: 30 } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /주막 거리/i })).not.toBeDisabled();
  });
// AFTER:
  it('주막 거리 shows Lv.45 필요 text when locked', () => {
    render(<WorldMap />); // level 1
    expect(screen.getByText(/Lv\.45 필요/i)).toBeInTheDocument();
  });

  it('주막 거리 is accessible at exactly level 45', () => {
    useGameStore.setState({ run: { ...runWithChar, level: 45 } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /주막 거리/i })).not.toBeDisabled();
  });
```

- [ ] **Step 6: Run tests to confirm all pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --reporter=verbose 2>&1 | tail -20
```

Expected: 모든 tests pass (WorldMap.test.tsx 포함)

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/data/maps.ts games/inflation-rpg/src/data/bosses.ts games/inflation-rpg/src/screens/WorldMap.test.tsx
git commit -m "feat(game-inflation-rpg): expand to 120 areas across 9 regions"
```

---

### Task 3: `RegionMap.tsx` — 지역 내 구역 노드 맵

**Files:**
- Create: `games/inflation-rpg/src/screens/RegionMap.test.tsx`
- Create: `games/inflation-rpg/src/screens/RegionMap.tsx`

- [ ] **Step 1: Write the failing test — `games/inflation-rpg/src/screens/RegionMap.test.tsx`**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegionMap } from './RegionMap';
import { useGameStore, INITIAL_META } from '../store/gameStore';

const baseRun = {
  characterId: 'hwarang', level: 1, exp: 0, bp: 28, statPoints: 0,
  allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
  currentAreaId: 'village-entrance', isHardMode: false,
  monstersDefeated: 0, goldThisRun: 0,
};

beforeEach(() => {
  useGameStore.setState({ screen: 'world-map', run: baseRun, meta: INITIAL_META });
});

describe('RegionMap (plains)', () => {
  it('shows 마을 입구 node at level 1', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).toBeInTheDocument();
  });

  it('마을 입구 is not locked at level 1', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).not.toBeDisabled();
  });

  it('tavern-street (minLevel 45) is locked at level 1 — shows info, does not enter battle', async () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /주막 거리/i });
    await userEvent.click(btn);
    expect(useGameStore.getState().screen).not.toBe('battle');
    expect(screen.getByText(/Lv\.45/i)).toBeInTheDocument();
  });

  it('← button calls onBack', async () => {
    const onBack = vi.fn();
    render(<RegionMap regionId="plains" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('entering unlocked area triggers battle screen and deducts BP', async () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('battle');
    expect(state.run.bp).toBe(27);
    expect(state.run.currentAreaId).toBe('village-entrance');
  });

  it('shows region name in header', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.getByText(/조선 평야/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails (module not found)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- RegionMap.test 2>&1 | tail -10
```

Expected: `Cannot find module './RegionMap'` 에러 발생

- [ ] **Step 3: Create `games/inflation-rpg/src/screens/RegionMap.tsx`**

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getRegionById } from '../data/regions';
import { getAreasByRegion } from '../data/maps';
import { isRunOver } from '../systems/bp';
import type { MapArea } from '../types';

const ICON_EMOJI: Record<string, string> = {
  village: '🏘️', wheat: '🌾', 'water-drop': '💧', coins: '🪙', beer: '🍺',
  fire: '🔥', footprint: '👣', grass: '🌿', castle: '🏯', 'plain-arrow': '➡️',
  gears: '⚙️', arid: '🌵', 'wooden-sign': '🪵', boat: '⛵', rain: '🌧️',
  ruins: '🏚️', poison: '☠️', campfire: '🔥', 'border-post': '🚩', watchtower: '🗼',
  'crossed-swords': '⚔️', 'pine-tree': '🌲', bamboo: '🎋', oak: '🌳',
  fox: '🦊', 'stone-block': '🪨', mushroom: '🍄', 'tree-face': '🌳',
  'dark-forest': '🌑', 'torii-gate': '⛩️', tiger: '🐯', maze: '🌀',
  'dead-tree': '🌵', heart: '❤️', hiking: '🥾', imp: '👺', rock: '🪨',
  cliff: '🏔️', totem: '🗿', snowflake: '❄️', mountain: '⛰️',
  'mountain-peak': '🏔️', 'arrow-right': '➡️', fortress: '🏰', lake: '🏞️',
  cloud: '☁️', lightning: '⚡', spirit: '👻', star: '⭐', anchor: '⚓',
  crab: '🦀', wave: '🌊', fish: '🐟', trident: '🔱', coral: '🪸',
  cave: '🕳️', treasure: '💎', vortex: '🌀', ice: '🧊', palace: '🏯',
  throne: '🪑', lava: '🌋', ash: '💨', circle: '⭕', dragon: '🐉',
  waterfall: '💦', crater: '⭕', gate: '🚪', river: '🌊', portcullis: '🚧',
  ghost: '👻', 'haunted-house': '🏚️', skull: '💀', door: '🚪', crown: '👑',
  void: '🌑', scale: '⚖️', abyss: '🕳️', feather: '🪶', flower: '🌸',
  'yin-yang': '☯️', portal: '🔮', infinity: '♾️', chaos: '🌀',
  hourglass: '⏳', 'broken-clock': '⏰', 'black-hole': '🌑',
};

interface RegionMapProps {
  regionId: string;
  onBack: () => void;
}

export function RegionMap({ regionId, onBack }: RegionMapProps) {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);
  const [lockedInfo, setLockedInfo] = React.useState<MapArea | null>(null);

  const region = getRegionById(regionId);
  if (!region) return null;

  const areas = getAreasByRegion(regionId, run.isHardMode);

  const enterArea = (area: MapArea) => {
    setLockedInfo(null);
    encounterMonster();
    if (isRunOver(run.bp - 1)) {
      endRun();
      return;
    }
    useGameStore.setState((s) => ({ run: { ...s.run, currentAreaId: area.id } }));
    setScreen('battle');
  };

  return (
    <div
      className="screen"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: region.bgGradient,
        overflow: 'hidden',
      }}
    >
      {/* CSS pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: region.bgPattern,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 12px',
          background: 'rgba(0,0,0,0.55)',
          zIndex: 10,
        }}
      >
        <button
          aria-label="뒤로가기"
          onClick={onBack}
          style={{
            fontSize: 18,
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            minWidth: 44,
            minHeight: 44,
          }}
        >
          ←
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {region.emoji} {region.nameKR}
        </span>
        <span
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #2a4060',
            borderRadius: 6,
            padding: '4px 10px',
            color: '#7ab8e8',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ⚡ BP: {run.bp}
        </span>
      </div>

      {/* SVG connection lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {areas.map((area, i) => {
          if (i === 0) return null;
          const prev = areas[i - 1]!;
          const unlocked = run.level >= area.levelRange[0];
          return (
            <line
              key={`line-${area.id}`}
              x1={`${prev.mapX}%`}
              y1={`${prev.mapY}%`}
              x2={`${area.mapX}%`}
              y2={`${area.mapY}%`}
              stroke={unlocked ? '#d4af37' : '#555'}
              strokeWidth={2}
              strokeDasharray={unlocked ? '6 3' : '4 4'}
            />
          );
        })}
      </svg>

      {/* Area nodes */}
      {areas.map((area) => {
        const isLocked = run.level < area.levelRange[0];
        const isCurrent = run.currentAreaId === area.id;
        const emoji = ICON_EMOJI[area.icon] ?? '📍';
        return (
          <button
            key={area.id}
            aria-label={area.nameKR}
            onClick={() => (isLocked ? setLockedInfo(area) : enterArea(area))}
            style={{
              position: 'absolute',
              left: `${area.mapX}%`,
              top: `${area.mapY}%`,
              transform: 'translate(-50%, -50%)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: area.bossId ? '2px solid #e03030' : '2px solid rgba(255,255,255,0.3)',
              background: isLocked ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.75)',
              opacity: isLocked ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 20,
              boxShadow: isCurrent ? '0 0 12px 4px gold' : undefined,
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {isLocked ? '🔒' : emoji}
          </button>
        );
      })}

      {/* Locked area info bar */}
      {lockedInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 12,
            right: 12,
            background: 'rgba(0,0,0,0.88)',
            border: '1px solid #2a4060',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#fff',
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {lockedInfo.nameKR}
            {lockedInfo.bossId && (
              <span
                style={{
                  fontSize: 10,
                  background: '#e03030',
                  color: '#fff',
                  borderRadius: 3,
                  padding: '0 5px',
                  marginLeft: 6,
                }}
              >
                BOSS
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Lv.{lockedInfo.levelRange[0].toLocaleString()} ~{' '}
            {lockedInfo.levelRange[1] === Infinity
              ? '∞'
              : lockedInfo.levelRange[1].toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#e05050', marginTop: 2 }}>
            Lv.{lockedInfo.levelRange[0].toLocaleString()} 필요
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.55)',
        }}
      >
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('inventory')}>
          인벤토리
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('shop')}>
          상점
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- RegionMap.test 2>&1 | tail -15
```

Expected: 6/6 tests pass

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/RegionMap.tsx games/inflation-rpg/src/screens/RegionMap.test.tsx
git commit -m "feat(game-inflation-rpg): add RegionMap component with area nodes and CSS terrain"
```

---

### Task 4: `WorldMap.tsx` — Region 노드 맵으로 교체

**Files:**
- Modify: `games/inflation-rpg/src/screens/WorldMap.test.tsx`
- Modify: `games/inflation-rpg/src/screens/WorldMap.tsx`

- [ ] **Step 1: Update `games/inflation-rpg/src/screens/WorldMap.test.tsx` with new tests**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldMap } from './WorldMap';
import { useGameStore, INITIAL_META } from '../store/gameStore';

const baseRun = {
  characterId: 'hwarang', level: 1, exp: 0, bp: 28, statPoints: 0,
  allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
  currentAreaId: 'village-entrance', isHardMode: false,
  monstersDefeated: 0, goldThisRun: 0,
};

beforeEach(() => {
  useGameStore.setState({ screen: 'world-map', run: baseRun, meta: INITIAL_META });
});

describe('WorldMap', () => {
  it('shows current BP', () => {
    render(<WorldMap />);
    expect(screen.getByText(/BP.*28/i)).toBeInTheDocument();
  });

  it('shows current level', () => {
    render(<WorldMap />);
    expect(screen.getByText(/^Lv\.1$/i)).toBeInTheDocument();
  });

  it('조선 평야 region is visible and unlocked at level 1', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /조선 평야/i })).not.toBeDisabled();
  });

  it('깊은 숲 region is locked at level 1 (minLevel 500)', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /깊은 숲/i })).toBeDisabled();
  });

  it('마왕의 성 region is hidden in normal mode', () => {
    render(<WorldMap />);
    expect(screen.queryByRole('button', { name: /마왕의 성/i })).not.toBeInTheDocument();
  });

  it('마왕의 성 region is visible in hard mode', () => {
    useGameStore.setState({ run: { ...baseRun, isHardMode: true } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마왕의 성/i })).toBeInTheDocument();
  });

  it('clicking 조선 평야 shows RegionMap with 마을 입구', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /조선 평야/i }));
    expect(screen.getByRole('button', { name: /마을 입구/i })).toBeInTheDocument();
  });

  it('← button in RegionMap returns to WorldMap region list', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /조선 평야/i }));
    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/i }));
    expect(screen.getByRole('button', { name: /조선 평야/i })).toBeInTheDocument();
  });

  it('entering area from RegionMap triggers battle screen after BP deduct', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /조선 평야/i }));
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('battle');
    expect(state.run.bp).toBe(27);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (old WorldMap doesn't have region nodes)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- WorldMap.test 2>&1 | tail -20
```

Expected: 여러 tests FAIL (조선 평야, 깊은 숲 등 버튼 없음)

- [ ] **Step 3: Replace `games/inflation-rpg/src/screens/WorldMap.tsx`**

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { REGIONS } from '../data/regions';
import { MAP_AREAS } from '../data/maps';
import { RegionMap } from './RegionMap';

export function WorldMap() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null);

  if (selectedRegionId) {
    return (
      <RegionMap regionId={selectedRegionId} onBack={() => setSelectedRegionId(null)} />
    );
  }

  const isRegionUnlocked = (regionId: string) =>
    MAP_AREAS.some((a) => a.regionId === regionId && run.level >= a.levelRange[0]);

  const visibleRegions = REGIONS.filter((r) => !r.isHardOnly || run.isHardMode);

  return (
    <div
      className="screen"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(180deg, #7ab8e8 0%, #a8d5a2 35%, #5a9e30 65%, #7f8c8d 85%, #2c3e50 100%)',
        overflow: 'hidden',
      }}
    >
      {/* CSS pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 16px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.45)',
          zIndex: 10,
        }}
      >
        <span
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #2a4060',
            borderRadius: 6,
            padding: '4px 12px',
            color: '#7ab8e8',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ⚡ BP: {run.bp}
        </span>
        <span
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #2a4a2a',
            borderRadius: 6,
            padding: '4px 12px',
            color: '#8dc98d',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Lv.{run.level.toLocaleString()}
        </span>
      </div>

      {/* SVG region connections */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {visibleRegions.map((region, i) => {
          if (i === 0) return null;
          const prev = visibleRegions[i - 1]!;
          const unlocked = isRegionUnlocked(region.id);
          return (
            <line
              key={`rline-${region.id}`}
              x1={`${prev.worldX}%`}
              y1={`${prev.worldY}%`}
              x2={`${region.worldX}%`}
              y2={`${region.worldY}%`}
              stroke={unlocked ? '#d4af37' : '#555'}
              strokeWidth={2}
              strokeDasharray={unlocked ? '6 3' : '4 4'}
            />
          );
        })}
      </svg>

      {/* Region nodes */}
      {visibleRegions.map((region) => {
        const unlocked = isRegionUnlocked(region.id);
        return (
          <button
            key={region.id}
            aria-label={region.nameKR}
            disabled={!unlocked}
            onClick={unlocked ? () => setSelectedRegionId(region.id) : undefined}
            style={{
              position: 'absolute',
              left: `${region.worldX}%`,
              top: `${region.worldY}%`,
              transform: 'translate(-50%, -50%)',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: region.isHardOnly
                ? '2px solid #e03030'
                : '2px solid rgba(255,255,255,0.5)',
              background: unlocked ? 'rgba(0,0,0,0.72)' : 'rgba(80,80,80,0.55)',
              opacity: unlocked ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: unlocked ? 'pointer' : 'default',
              fontSize: 22,
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {unlocked ? region.emoji : '🔒'}
          </button>
        );
      })}

      {/* Bottom nav */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.45)',
        }}
      >
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('inventory')}>
          인벤토리
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('shop')}>
          상점
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run WorldMap tests to confirm they pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- WorldMap.test 2>&1 | tail -15
```

Expected: 9/9 tests pass

- [ ] **Step 5: Run full test suite**

```bash
pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -10
```

Expected: 109+ tests pass (103 existing + 6 RegionMap + WorldMap updated)

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/screens/WorldMap.tsx games/inflation-rpg/src/screens/WorldMap.test.tsx
git commit -m "feat(game-inflation-rpg): replace WorldMap with 2-level CSS region map"
```

---

### Task 5: 최종 검증 및 완료

**Files:** 수정 없음 — 검증만

- [ ] **Step 1: Run full test suite**

```bash
pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -10
```

Expected: 모든 tests pass

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 3: Run lint**

```bash
pnpm lint 2>&1 | tail -10
```

Expected: 0 errors, 0 warnings

- [ ] **Step 4: Run circular dependency check**

```bash
pnpm circular 2>&1 | tail -5
```

Expected: No circular dependencies

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(game-inflation-rpg): resolve typecheck/lint issues from worldmap redesign"
```

- [ ] **Step 6: Plan 실행 완료 — `superpowers:finishing-a-development-branch` 로 핸드오프**

모든 검증이 통과하면 merge/PR 결정은 `superpowers:finishing-a-development-branch` 스킬에 위임한다.
브랜치: `feat/inflation-rpg-worldmap`

---

## 자기 검토 (Spec Coverage)

| 스펙 요구사항 | 구현 Task |
|---|---|
| Region 인터페이스 + 9개 REGIONS | Task 1 |
| MapArea에 regionId, mapX, mapY, icon 추가 | Task 2 |
| 120개 구역 데이터 | Task 2 |
| bosses.ts heaven-realm → jade-palace 수정 | Task 2 |
| RegionMap: CSS terrain 배경 + pattern overlay | Task 3 |
| RegionMap: 구역 노드 absolute 배치 | Task 3 |
| RegionMap: SVG 연결선 (금/회 dashed) | Task 3 |
| RegionMap: 잠금 노드 🔒 + info bar | Task 3 |
| RegionMap: 탭 → 전투 진입 | Task 3 |
| RegionMap: ← 뒤로가기 버튼 | Task 3 |
| WorldMap: CSS 지형 배경 | Task 4 |
| WorldMap: 9개 Region 노드 absolute 배치 | Task 4 |
| WorldMap: 클릭 → RegionMap 전환 | Task 4 |
| WorldMap: 잠금/해금 Region 시각 처리 | Task 4 |
| WorldMap: 하드모드 전용 Region 숨김/표시 | Task 4 |
| [Infinity, Infinity] 구역 렌더링 스킵 | Task 2 (getAreasByRegion 필터) |
| 테스트 업데이트 | Task 3, 4 |
