# Content Expansion Layer 5 — Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Content Expansion 스펙](../specs/2026-04-25-content-expansion-spec.md) 의 **Layer 5 (스토리 조각)** 구현. 9 region 진입 텍스트 + ~30 보스 처치 후 텍스트.

**Architecture:** `Story` 인터페이스 + `data/stories.ts` + `StoryModal` 컴포넌트 + `MetaState.regionsVisited` 추적 + RegionMap 첫 진입 시 modal + 보스 처치 hook.

**Tech Stack:** TypeScript 5.6, React 19, Zustand 5, Vitest 4.

**Prerequisite:** Layer 1-4 완료. 가장 가벼운 Layer (텍스트 추가 + 1 컴포넌트).

---

## File Structure

### 신규
```
games/inflation-rpg/src/
├── data/stories.ts                      # 9 region + ~30 boss 스토리
├── data/stories.test.ts                 # 무결성 검증
├── components/StoryModal.tsx            # 신규: 스토리 표시 modal
└── components/StoryModal.test.tsx       # 단위 테스트
```

### 수정
```
games/inflation-rpg/src/
├── types.ts                             # Story 인터페이스 + MetaState.regionsVisited
├── store/gameStore.ts                   # markRegionVisited 액션 + 마이그레이션
├── screens/RegionMap.tsx                # 첫 진입 시 StoryModal
└── screens/GameOver.tsx                 # 보스 처치 시 스토리 표시 (또는 별도 hook)
```

---

## Task L5-1: 타입 + MetaState 확장

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Story 인터페이스 추가**

```typescript
export type StoryType = 'region_enter' | 'boss_defeat';

export interface Story {
  id: string;
  type: StoryType;
  refId: string;     // regionId or bossId
  textKR: string;
}
```

- [ ] **Step 2: MetaState 에 `regionsVisited` 추가**

```typescript
export interface MetaState {
  // 기존 필드 …
  regionsVisited: string[]; // regionIds (첫 진입 modal 표시 후 추가)
}
```

- [ ] **Step 3: typecheck (gameStore INITIAL_META_STATE 누락 fail)**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: gameStore 누락 에러. 다음 task 에서 fix.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add Story interface + MetaState.regionsVisited"
```

---

## Task L5-2: stories.ts — 9 region + ~30 boss 텍스트

**Files:**
- Create: `games/inflation-rpg/src/data/stories.ts`

- [ ] **Step 1: stories.ts 작성**

```typescript
import type { Story } from '../types';

export const STORIES: Story[] = [
  // ── Region enter (9) ──
  {
    id: 's-region-plains',
    type: 'region_enter',
    refId: 'plains',
    textKR: '바람이 부드럽게 풀잎을 쓸어내린다. 농가의 굴뚝에서 연기가 피어오르고, 멀리서 도깨비들의 웃음소리가 들린다. 이곳 조선 평야가 너의 첫 무대다.',
  },
  {
    id: 's-region-forest',
    type: 'region_enter',
    refId: 'forest',
    textKR: '거목들이 하늘을 가리고 햇빛 한 줄기 들지 않는다. 짙은 풀냄새와 함께 짐승의 발자국이 어디론가 사라진다. 깊은 숲은 신령한 자만이 살아 나온다.',
  },
  {
    id: 's-region-mountains',
    type: 'region_enter',
    refId: 'mountains',
    textKR: '바위 절벽이 끝없이 솟아오른다. 구름 사이로 매가 활공하고, 산짐승의 그림자가 능선을 따라 움직인다. 이곳에서 약자는 단숨에 굴러 떨어진다.',
  },
  {
    id: 's-region-coast',
    type: 'region_enter',
    refId: 'coast',
    textKR: '파도가 끊임없이 절벽에 부딪힌다. 짠 바람이 옷자락을 흔들고, 수평선 너머에서 해룡의 울음소리가 메아리친다. 동해의 깊이를 헤아리지 마라.',
  },
  {
    id: 's-region-underground',
    type: 'region_enter',
    refId: 'underground',
    textKR: '횃불 하나의 빛이 어둠을 겨우 밀어낸다. 광부영혼의 곡괭이질 소리가 메아리치고, 천장에서 박쥐가 푸드덕 날아오른다. 지하의 어둠은 끝이 없다.',
  },
  {
    id: 's-region-heaven-realm',
    type: 'region_enter',
    refId: 'heaven-realm',
    textKR: '구름이 발 아래에 펼쳐진다. 황금 누각이 끝없이 솟아 있고, 옥토끼와 학들이 한가로이 노닌다. 천계의 공기는 마시기만 해도 단전이 뜨거워진다.',
  },
  {
    id: 's-region-underworld',
    type: 'region_enter',
    refId: 'underworld',
    textKR: '검은 강이 흐르고, 망자의 행렬이 끝없이 이어진다. 저승사자의 시선이 너를 따라온다. 산 자가 발 들이는 곳이 아니지만, 너는 들어선다.',
  },
  {
    id: 's-region-chaos',
    type: 'region_enter',
    refId: 'chaos',
    textKR: '시간과 공간이 뒤틀린다. 어제와 내일이 동시에 존재하고, 색조차 안정되지 않는다. 혼돈계는 정상의 법칙이 통하지 않는 영역이다.',
  },
  {
    id: 's-region-final-realm',
    type: 'region_enter',
    refId: 'final-realm',
    textKR: '모든 것이 끝나는 곳. 또는 모든 것이 시작되는 곳. 너는 마침내 여기까지 도달했다. 이제 종말과 마주할 시간이다.',
  },

  // ── Boss defeat (~30) ──
  // Plains
  { id: 's-boss-goblin-chief',  type: 'boss_defeat', refId: 'goblin-chief',
    textKR: '도깨비 대장이 무릎을 꿇는다. "다시는 사람을 괴롭히지 않겠다…" 그의 마지막 말이 바람에 흩어진다.' },
  { id: 's-boss-plains-ghost',  type: 'boss_defeat', refId: 'plains-ghost',
    textKR: '폐허의 망령이 빛으로 흩어진다. 오랜 세월 떠돌던 한이 마침내 풀린다.' },
  { id: 's-boss-spirit-post-guardian', type: 'boss_defeat', refId: 'spirit-post-guardian',
    textKR: '서낭당의 수호신이 너를 인정한다. "이 길을 지나가도 좋다, 인간."' },
  { id: 's-boss-cursed-plains', type: 'boss_defeat', refId: 'cursed-plains',
    textKR: '저주받은 군주가 사라지자, 들판의 시든 풀이 다시 푸르러진다.' },
  { id: 's-boss-plains-lord',   type: 'boss_defeat', refId: 'plains-lord',
    textKR: '평야의 군주가 쓰러진다. 그의 왕관이 너의 발 앞에 떨어진다.' },

  // Forest
  { id: 's-boss-gumiho',        type: 'boss_defeat', refId: 'gumiho',
    textKR: '구미호의 아홉 꼬리가 모두 사라진다. 마지막 순간 그녀는 인간의 얼굴로 돌아간다.' },
  { id: 's-boss-tree-spirit',   type: 'boss_defeat', refId: 'tree-spirit',
    textKR: '신령 거목이 천천히 가지를 늘어뜨린다. 천 년의 잠에 든다.' },
  { id: 's-boss-black-tiger',   type: 'boss_defeat', refId: 'black-tiger',
    textKR: '흑호가 마지막 포효를 내지른다. 그 가죽이 검에서 황금빛으로 변한다.' },
  { id: 's-boss-forest-ruler',  type: 'boss_defeat', refId: 'forest-ruler',
    textKR: '숲의 통치자가 무너지자, 모든 나무가 한 번 떨고 다시 잠잠해진다.' },

  // Mountains
  { id: 's-boss-gate-guardian', type: 'boss_defeat', refId: 'gate-guardian',
    textKR: '관문의 수호신이 머리를 숙인다. "백두로 향하는 길을 너에게 허락한다."' },

  // Coast
  { id: 's-boss-sea-god',       type: 'boss_defeat', refId: 'sea-god',
    textKR: '해신의 거대한 몸이 깊은 바닷속으로 가라앉는다. 파도가 잠시 멈춘다.' },

  // Underground
  // (placeholders — fill if specific bosses defined)

  // Heaven-realm
  { id: 's-boss-jade-emperor',  type: 'boss_defeat', refId: 'jade-emperor',
    textKR: '옥황상제가 옥좌에서 일어선다. "인간이 여기까지 올라왔다… 이는 운명인가."' },

  // Underworld
  { id: 's-boss-death-reaper',  type: 'boss_defeat', refId: 'death-reaper',
    textKR: '저승사자의 낫이 부러진다. 그는 침묵 속에서 사라진다.' },

  // Chaos
  { id: 's-boss-chaos-god',     type: 'boss_defeat', refId: 'chaos-god',
    textKR: '혼돈신의 형체가 무수한 조각으로 흩어진다. 그러나 어디선가 그 일부는 다시 모인다.' },
  { id: 's-boss-time-warden',   type: 'boss_defeat', refId: 'time-warden',
    textKR: '시간의 파수꾼이 사라지자, 모든 시간이 정지한 듯 느껴진다. 잠시 후, 다시 흐른다.' },

  // Final
  { id: 's-boss-final-boss',    type: 'boss_defeat', refId: 'final-boss',
    textKR: '최종 보스가 천천히 무너진다. 그가 마지막으로 너를 본다. "너는… 진정 강해졌구나." 모든 것이 빛에 휩싸인다.' },

  // … 더 추가 가능 (특정 보스만 정의, 나머지는 generic fallback 또는 텍스트 없음)
];

export function getStoryById(id: string): Story | undefined {
  return STORIES.find(s => s.id === id);
}

export function getRegionEnterStory(regionId: string): Story | undefined {
  return STORIES.find(s => s.type === 'region_enter' && s.refId === regionId);
}

export function getBossDefeatStory(bossId: string): Story | undefined {
  return STORIES.find(s => s.type === 'boss_defeat' && s.refId === bossId);
}
```

총 9 region enter + 16+ boss defeat = ~25-30 스토리. 모든 보스에 대해 필수 아님.

- [ ] **Step 2: Commit**

```bash
git add games/inflation-rpg/src/data/stories.ts
git commit -m "feat(game-inflation-rpg): add 25+ stories (9 region enter + 16+ boss defeat)"
```

---

## Task L5-3: 단위 테스트 — stories.test.ts

**Files:**
- Create: `games/inflation-rpg/src/data/stories.test.ts`

- [ ] **Step 1: 무결성 검증**

```typescript
import { describe, it, expect } from 'vitest';
import { STORIES, getRegionEnterStory, getBossDefeatStory } from './stories';
import { REGIONS } from './regions';
import { BOSSES } from './bosses';

describe('stories', () => {
  it('every region has exactly one region_enter story', () => {
    for (const region of REGIONS) {
      const story = getRegionEnterStory(region.id);
      expect(story, `region ${region.id}`).toBeDefined();
    }
  });

  it('all story IDs are unique', () => {
    const ids = STORIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('boss_defeat stories reference existing bosses', () => {
    const bossIds = new Set(BOSSES.map(b => b.id));
    for (const story of STORIES) {
      if (story.type === 'boss_defeat') {
        expect(bossIds.has(story.refId), `${story.id} -> ${story.refId}`).toBe(true);
      }
    }
  });

  it('every story has non-empty textKR', () => {
    for (const story of STORIES) {
      expect(story.textKR.length, `${story.id}`).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 2: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test data/stories
```

Expected: 통과. region_enter 가 9 모두 있는지 검증.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/stories.test.ts
git commit -m "test(game-inflation-rpg): verify story integrity (region/boss refs, uniqueness)"
```

---

## Task L5-4: gameStore — regionsVisited 액션 + 마이그레이션

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: INITIAL_META_STATE 에 regionsVisited 추가**

```typescript
regionsVisited: [],
```

- [ ] **Step 2: markRegionVisited 액션**

```typescript
markRegionVisited: (regionId: string) => set(state => {
  if (state.meta.regionsVisited.includes(regionId)) return state;
  return {
    meta: {
      ...state.meta,
      regionsVisited: [...state.meta.regionsVisited, regionId],
    },
  };
}),
```

- [ ] **Step 3: 마이그레이션 (load 함수에)**

```typescript
regionsVisited: loaded.regionsVisited ?? [],
```

- [ ] **Step 4: typecheck + test**

Expected: 0 exit, 132+ passed.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): add regionsVisited tracking + save migration"
```

---

## Task L5-5: StoryModal 컴포넌트

**Files:**
- Create: `games/inflation-rpg/src/components/StoryModal.tsx`
- Create: `games/inflation-rpg/src/components/StoryModal.test.tsx`

- [ ] **Step 1: StoryModal.tsx 작성**

```tsx
import React from 'react';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

interface StoryModalProps {
  title: string;
  emoji?: string;
  textKR: string;
  onClose: () => void;
}

export function StoryModal({ title, emoji, textKR, onClose }: StoryModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
      padding: 16,
    }}>
      <ForgePanel variant="elevated" style={{ maxWidth: 380, width: '100%' }}>
        <div style={{
          fontSize: 24, fontWeight: 700,
          color: 'var(--forge-accent)',
          textAlign: 'center', marginBottom: 12,
        }}>
          {emoji && <span style={{ marginRight: 8 }}>{emoji}</span>}
          {title}
        </div>
        <p style={{
          fontSize: 14, lineHeight: 1.7,
          color: 'var(--forge-text-primary)',
          margin: '14px 0 18px',
        }}>
          {textKR}
        </p>
        <ForgeButton variant="primary" style={{ width: '100%' }} onClick={onClose}>
          확인
        </ForgeButton>
      </ForgePanel>
    </div>
  );
}
```

- [ ] **Step 2: 단위 테스트**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryModal } from './StoryModal';

describe('StoryModal', () => {
  it('renders title and text', () => {
    render(<StoryModal title="조선 평야" textKR="바람이 분다." onClose={() => {}} />);
    expect(screen.getByText('조선 평야')).toBeInTheDocument();
    expect(screen.getByText('바람이 분다.')).toBeInTheDocument();
  });

  it('calls onClose when 확인 clicked', () => {
    const onClose = vi.fn();
    render(<StoryModal title="t" textKR="x" onClose={onClose} />);
    fireEvent.click(screen.getByText('확인'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg test components/StoryModal
```

Expected: 통과.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/components/StoryModal.tsx \
        games/inflation-rpg/src/components/StoryModal.test.tsx
git commit -m "feat(game-inflation-rpg): add StoryModal component"
```

---

## Task L5-6: RegionMap 의 첫 진입 modal

**Files:**
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx`

- [ ] **Step 1: useEffect — 첫 진입 시 modal 표시**

```tsx
import { StoryModal } from '../components/StoryModal';
import { getRegionEnterStory } from '../data/stories';
import { useState, useEffect } from 'react';

// 컴포넌트 내부:
const [story, setStory] = useState<{ title: string; emoji?: string; textKR: string } | null>(null);
const meta = useGameStore(s => s.meta);
const markRegionVisited = useGameStore(s => s.markRegionVisited);
const region = REGIONS.find(r => r.id === currentRegionId);

useEffect(() => {
  if (!region) return;
  if (meta.regionsVisited.includes(region.id)) return;
  const s = getRegionEnterStory(region.id);
  if (s) {
    setStory({ title: region.nameKR, emoji: region.emoji, textKR: s.textKR });
  }
}, [region]);

const onCloseStory = () => {
  if (region) markRegionVisited(region.id);
  setStory(null);
};

// JSX:
{story && (
  <StoryModal
    title={story.title}
    emoji={story.emoji}
    textKR={story.textKR}
    onClose={onCloseStory}
  />
)}
```

- [ ] **Step 2: typecheck + test**

Expected: 0 exit, 134+ passed.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/RegionMap.tsx
git commit -m "feat(game-inflation-rpg): show region_enter story on first visit"
```

---

## Task L5-7: 보스 처치 후 스토리 표시

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` (또는 GameOver hook)

- [ ] **Step 1: 보스 처치 시 스토리 ID 저장**

BattleScene 의 보스 처치 hook 에서:
```typescript
import { getBossDefeatStory } from '../data/stories';

// 보스 처치 시:
const story = getBossDefeatStory(bossId);
if (story) {
  // gameStore 의 transient slot 에 저장 → 다음 화면에서 모달 표시
  useGameStore.getState().setPendingStory(story);
}
```

- [ ] **Step 2: gameStore 에 pendingStory transient state**

```typescript
pendingStoryId: string | null;
setPendingStory: (story: Story | null) => void;
```

(persist 에서 제외 — transient)

- [ ] **Step 3: 다음 화면 (GameOver 또는 Dungeon clear 시) 에서 modal 표시**

```tsx
const pendingStoryId = useGameStore(s => s.pendingStoryId);
const setPendingStory = useGameStore(s => s.setPendingStory);
const story = pendingStoryId ? getStoryById(pendingStoryId) : null;

{story && (
  <StoryModal
    title="보스 처치"
    textKR={story.textKR}
    onClose={() => setPendingStory(null)}
  />
)}
```

- [ ] **Step 4: typecheck + test**

Expected: 0 exit.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts \
        games/inflation-rpg/src/store/gameStore.ts \
        games/inflation-rpg/src/screens/GameOver.tsx
git commit -m "feat(game-inflation-rpg): show boss_defeat story after victory"
```

---

## Task L5-8: 통합 검증 + Phase tag

- [ ] **Step 1: 전체 검증**

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm circular
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: 모두 0 exit, 145+ passed.

- [ ] **Step 2: 정량 검증**

```bash
echo "Stories: $(grep -c "id: 's-" games/inflation-rpg/src/data/stories.ts)"
# Expected: 25+
```

- [ ] **Step 3: Phase tag**

```bash
git tag phase-content-story-complete
```

- [ ] **Step 4: 모든 Layer 완료 — 최종 통합 tag**

```bash
git tag phase-content-expansion-complete
git log --oneline phase-content-data-complete..HEAD
```

---

## 요약

Layer 5 완료 시:
- 9 region enter 스토리 (모든 region 첫 진입 시 modal)
- 16+ boss defeat 스토리 (주요 보스)
- StoryModal 컴포넌트 (재사용 가능)
- regionsVisited 추적 (재방문 시 modal 미표시)
- save 마이그레이션

**전체 5 Layer 완료 시**:
- 콘텐츠 6 종 (몬스터/장비/보스/퀘스트/스킬/스토리)
- 던전 구조 (120 area = stage 던전)
- 합성·퀘스트·스킬·스토리 mechanic 4
- ~150 task 누적, 5 phase tag
- inflation-rpg 가 "껍데기" 에서 "온전한 RPG" 로

**End of Layer 5 plan. Total tasks: 8.**
