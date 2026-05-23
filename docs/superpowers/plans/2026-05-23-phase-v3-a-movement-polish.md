# Phase V3-A — Movement Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hero overworld movement 의 3 가지 polish — (1) 맵 바깥으로 안 나가도록 bounds clamp, (2) 도착 후 idle pause 변동화 + 짧은 "둘러보기" 시각 효과, (3) chapter 전환 (어린→청년 등) 시 간단한 cinematic overlay.

**Architecture:** Pathfinder 와 mapLayout 의 좌표 생성에 입력 clamp + invariant 추가 (pure TS, vitest). OverworldScene 의 `arriveAtTarget` 가 고정 400ms 대신 sceneRng 으로 300-800ms 변동 + heroSprite alpha pulse tween. CycleControllerV2 가 hero.chapter 변화 감지해 새 `chapter_transition` OverworldEvent emit. OverworldRunner.tsx 가 이벤트 받아 React 오버레이로 2초간 "청년기 시작" 등 표시.

**Tech Stack:** TypeScript / Phaser 3 (tween, time.delayedCall) / React 19 / Vitest / 기존 SeededRng / 기존 OverworldEvent union.

---

## File Structure

**Modify:**
- `games/inflation-rpg/src/overworld/Pathfinding.ts` — bounds validation in `findPath`
- `games/inflation-rpg/src/overworld/Pathfinding.test.ts` — 신규 bounds test cases
- `games/inflation-rpg/src/overworld/mapLayout.ts` — `place()` helper 가 좌표를 grid bounds 로 clamp
- `games/inflation-rpg/src/overworld/__tests__/mapLayout.test.ts` (신규 또는 확장)
- `games/inflation-rpg/src/overworld/OverworldEvents.ts` — `chapter_transition` 추가
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — chapter 변화 감지 + emit
- `games/inflation-rpg/src/overworld/CycleControllerV2.test.ts` — chapter_transition 테스트
- `games/inflation-rpg/src/overworld/OverworldScene.ts` — variable pause + alpha pulse
- `games/inflation-rpg/src/screens/OverworldRunner.tsx` — chapter_transition 오버레이

---

### Task 1: Pathfinder bounds validation

**Files:**
- Modify: `games/inflation-rpg/src/overworld/Pathfinding.ts`
- Test: `games/inflation-rpg/src/overworld/Pathfinding.test.ts`

**Why:** Caller (OverworldScene) 가 가끔 out-of-range x/y 를 전달하면 easystar 가 silent fail → hero 가 stale path 따라가다 grid 밖으로 visible 이동 가능. 명시적 bounds reject 로 fail-fast.

- [ ] **Step 1: Failing test 작성**

`games/inflation-rpg/src/overworld/Pathfinding.test.ts` 의 끝에 추가:

```ts
describe('Pathfinding bounds', () => {
  it('returns null when start coords out of grid', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    expect(await pf.findPath(-1, 0, 2, 2)).toBeNull();
    expect(await pf.findPath(0, 5, 2, 2)).toBeNull();
  });

  it('returns null when destination coords out of grid', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    expect(await pf.findPath(0, 0, 5, 2)).toBeNull();
    expect(await pf.findPath(0, 0, 2, -1)).toBeNull();
  });

  it('returns all nodes inside the grid for a valid path', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 4, 4);
    expect(path).not.toBeNull();
    for (const node of path!) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThan(5);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThan(5);
    }
  });
});
```

`GridCell` import 가 없으면 파일 상단의 `import` 에 추가.

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- Pathfinding.test.ts
```

Expected: `bounds` 3 케이스가 실패 (또는 일부는 우연히 pass, 명시적 reject 없어서 통과 가능 — Step 3 후 일관성 확보).

- [ ] **Step 3: Pathfinder 에 bounds 가드 추가**

`Pathfinding.ts` 의 `findPath` 메서드를 다음으로 교체:

```ts
findPath(sx: number, sy: number, dx: number, dy: number): Promise<{ x: number; y: number }[] | null> {
  const h = (this.easystar as unknown as { grid: number[][] }).grid?.length ?? 0;
  const w = h > 0 ? ((this.easystar as unknown as { grid: number[][] }).grid[0]?.length ?? 0) : 0;
  const inBounds = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h;
  if (!inBounds(sx, sy) || !inBounds(dx, dy)) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    this.easystar.findPath(sx, sy, dx, dy, path => resolve(path ?? null));
    this.easystar.calculate();
  });
}
```

(easystar 의 private `grid` field 접근 — runtime 검증된 패턴. 또는 constructor 에서 `this.width / this.height` 멤버 저장으로 깔끔히 할 수도 있다. 깔끔한 버전:)

대안 (권장): constructor 에서 dimensions 저장.

```ts
export class Pathfinder {
  private easystar: EasyStar.js;
  private readonly width: number;
  private readonly height: number;

  constructor(grid: GridCell[][]) {
    this.height = grid.length;
    this.width = this.height > 0 ? grid[0]!.length : 0;
    this.easystar = new EasyStar.js();
    const numericGrid = grid.map(row => row.map(c => (c === 'walkable' ? WALKABLE_ID : BLOCKED_ID)));
    this.easystar.setGrid(numericGrid);
    this.easystar.setAcceptableTiles([WALKABLE_ID]);
    this.easystar.enableDiagonals();
    this.easystar.enableSync();
  }

  findPath(sx: number, sy: number, dx: number, dy: number): Promise<{ x: number; y: number }[] | null> {
    const inBounds = (x: number, y: number) =>
      x >= 0 && x < this.width && y >= 0 && y < this.height;
    if (!inBounds(sx, sy) || !inBounds(dx, dy)) {
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      this.easystar.findPath(sx, sy, dx, dy, path => resolve(path ?? null));
      this.easystar.calculate();
    });
  }
}
```

- [ ] **Step 4: 테스트 재실행해서 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- Pathfinding.test.ts
```

Expected: 모든 케이스 PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/Pathfinding.ts games/inflation-rpg/src/overworld/Pathfinding.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): Pathfinder rejects out-of-bounds start/dest

V3-A movement polish — explicit bounds check returns null fast instead
of letting easystar silently misroute or emit stale path nodes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: mapLayout 좌표 clamp + bounds invariant test

**Files:**
- Modify: `games/inflation-rpg/src/overworld/mapLayout.ts`
- Create: `games/inflation-rpg/src/overworld/__tests__/mapLayout.bounds.test.ts`

**Why:** `place('lich_king', 18 + rng.int(2), …)` 같은 호출이 GRID_W (20) 의 경계에 너무 가까움. rng.int(2) → 0 or 1 이라 max gridX = 19 = GRID_W-1, 운 좋게 in-bounds 지만 향후 누군가 `place('x', 19 + rng.int(2), …)` 추가하면 silent 20 = OOB. `place()` 자체에서 명시적 clamp + 모든 landmark 가 grid 안임을 invariant 로 보장.

- [ ] **Step 1: 새 테스트 파일 생성**

`games/inflation-rpg/src/overworld/__tests__/mapLayout.bounds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateMapLayout, GRID_W, GRID_H } from '../mapLayout';

describe('mapLayout — all landmarks inside grid bounds', () => {
  it('100 seeds: every placed landmark has 0 <= gridX < GRID_W and 0 <= gridY < GRID_H', () => {
    for (let seed = 0; seed < 100; seed++) {
      const layout = generateMapLayout(seed);
      for (const lm of layout.landmarks) {
        expect(lm.gridX, `seed ${seed} ${lm.instanceId}`).toBeGreaterThanOrEqual(0);
        expect(lm.gridX, `seed ${seed} ${lm.instanceId}`).toBeLessThan(GRID_W);
        expect(lm.gridY, `seed ${seed} ${lm.instanceId}`).toBeGreaterThanOrEqual(0);
        expect(lm.gridY, `seed ${seed} ${lm.instanceId}`).toBeLessThan(GRID_H);
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실행 — 통과/실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- mapLayout.bounds.test.ts
```

Expected: 현재 코드에서 이미 통과할 가능성 큼 (오프-바이-원 없음). 단 이 테스트가 향후 regression 가드로 작동.

- [ ] **Step 3: mapLayout.ts 의 `place()` 에 clamp guard 추가**

`mapLayout.ts` 의 `place` 함수를 다음으로 교체:

```ts
const place = (typeId: string, gridX: number, gridY: number, instanceSuffix = '') => {
  const type = LANDMARK_TYPES.find(t => t.id === typeId);
  if (!type) return;
  const cx = Math.max(0, Math.min(GRID_W - 1, gridX));
  const cy = Math.max(0, Math.min(GRID_H - 1, gridY));
  landmarks.push({
    instanceId: `${typeId}_${cx}_${cy}${instanceSuffix}`,
    type,
    gridX: cx,
    gridY: cy,
    consumed: false,
  });
};
```

- [ ] **Step 4: 테스트 재실행해서 모두 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- mapLayout
```

Expected: 모든 mapLayout 테스트 PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/mapLayout.ts games/inflation-rpg/src/overworld/__tests__/mapLayout.bounds.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): clamp landmark coords + bounds invariant test

V3-A movement polish — place() 가 (gridX, gridY) 를 GRID_W/GRID_H 로
clamp. 100 seed 회귀 테스트로 모든 landmark 가 grid 내부임을 보장.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: OverworldScene 의 hero camera bounds + heroSprite clamp

**Files:**
- Modify: `games/inflation-rpg/src/overworld/OverworldScene.ts`

**Why:** Phaser camera 가 grid 의 직사각형으로 자동 clamp 되도록 명시. heroSprite 의 tween 좌표는 항상 tile center 라 OOB 불가능하지만 camera bounds 가 명시되면 사용자가 향후 zoom/pan 추가시 안전.

- [ ] **Step 1: OverworldScene.ts 의 `create()` 에 cameras.main.setBounds 추가**

`create()` 메서드의 첫 줄 (`this.cameras.main.setBackgroundColor` 이후) 에 추가:

```ts
this.cameras.main.setBounds(0, 0, GRID_W * TILE_PX, GRID_H * TILE_PX);
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldScene.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): set camera bounds to grid rectangle

V3-A movement polish — explicit camera bounds (0,0,GRID_W*TILE,GRID_H*TILE)
so any future zoom/pan stays inside the playable area.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 자연스러운 idle — 변동 pause + alpha pulse

**Files:**
- Modify: `games/inflation-rpg/src/overworld/OverworldScene.ts`

**Why:** 현재 `arriveAtTarget` 가 항상 400ms 고정 후 다음 destination 으로 출발. 도착-즉시-이동 의 robotic 느낌. (a) sceneRng 으로 300-800ms 변동 pause + (b) heroSprite 짧은 alpha pulse 로 "둘러보기" 신호.

- [ ] **Step 1: OverworldScene.ts 의 `arriveAtTarget` 전체 교체**

기존:

```ts
private arriveAtTarget(): void {
  const target = this.currentTarget;
  if (!target) return;
  this.onEvent({ type: 'arrived_at', landmarkId: target.instanceId, landmarkKind: target.type.kind });
  // Wait 400ms (lets React resolve the encounter and update hero state) then continue
  this.time.delayedCall(400, () => {
    target.consumed = true;
    const sprite = this.landmarkSprites.get(target.instanceId);
    sprite?.setAlpha(0.3);
    if (target.type.kind === 'enemy') {
      this.respawnEnemyNear(target);
    }
    this.currentTarget = null;
    this.pickNextDestination();
  });
}
```

교체:

```ts
private arriveAtTarget(): void {
  const target = this.currentTarget;
  if (!target) return;
  this.onEvent({ type: 'arrived_at', landmarkId: target.instanceId, landmarkKind: target.type.kind });
  // V3-A: variable pause (300-800ms) + brief alpha pulse on the hero so the
  // idle feels like the hero is looking around before deciding next move.
  const pauseMs = 300 + this.sceneRng.int(500); // 300..799 inclusive
  this.tweens.add({
    targets: this.heroSprite,
    alpha: 0.55,
    duration: Math.floor(pauseMs / 2),
    yoyo: true,
    ease: 'Sine.InOut',
  });
  this.time.delayedCall(pauseMs, () => {
    target.consumed = true;
    const sprite = this.landmarkSprites.get(target.instanceId);
    sprite?.setAlpha(0.3);
    if (target.type.kind === 'enemy') {
      this.respawnEnemyNear(target);
    }
    this.heroSprite.setAlpha(1);
    this.currentTarget = null;
    this.pickNextDestination();
  });
}
```

- [ ] **Step 2: typecheck + lint**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 errors.

- [ ] **Step 3: 기존 OverworldScene 테스트 재실행 (regression)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- OverworldScene
```

Expected: 기존 테스트 PASS (alpha tween 은 mock Phaser scene 가 ignore 해도 무방).

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldScene.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): variable idle pause + alpha pulse on arrival

V3-A movement polish — replace fixed 400ms post-arrival delay with
300-800ms sceneRng-derived pause and a yoyo alpha tween so the hero
looks like it's "looking around" before picking the next destination.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `chapter_transition` OverworldEvent 추가 + CycleControllerV2 emit

**Files:**
- Modify: `games/inflation-rpg/src/overworld/OverworldEvents.ts`
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.test.ts`

**Why:** Hero 가 chapter 경계 (어린시절→청년기 at age 15, 청년기→장년기 at age 30, ...) 를 넘는 순간을 UI 에 신호. Saga 는 이미 chapter 별 grouping 있지만 시각적 cinematic 가 없음.

- [ ] **Step 1: OverworldEvents.ts 에 새 event variant 추가**

`OverworldEvents.ts` 의 union 끝쪽에 추가 (`hero_died` 위):

```ts
| { type: 'chapter_transition'; fromChapter: Chapter; toChapter: Chapter; atAge: number }
```

파일 상단 import 에 `Chapter` 추가:

```ts
import type { Chapter } from '../hero/HeroLifecycle';
```

- [ ] **Step 2: CycleControllerV2 의 chapter 변화 감지 위치 찾기**

`grep -n 'chapter' games/inflation-rpg/src/overworld/CycleControllerV2.ts` 로 chapter 가 갱신되는 줄을 찾는다. (`hero.chapter` 가 `consumeBp` → `refreshAge` 로 자동 갱신, controller 는 read-only 인 경우가 일반.) 갱신은 hero side 에 있고, controller 는 매 arrival 후 `hero.chapter` 를 snapshot 비교하면 됨.

- [ ] **Step 3: CycleControllerV2 에 chapter snapshot + emit**

Controller class 에 `private lastChapter: Chapter = '어린시절';` 멤버 추가, `handleArrival` (또는 동등한 main loop entry — controller 구조 따라) 의 끝, 다음 destination 으로 가기 직전에:

```ts
if (this.hero.chapter !== this.lastChapter) {
  this.onEvent({
    type: 'chapter_transition',
    fromChapter: this.lastChapter,
    toChapter: this.hero.chapter,
    atAge: this.hero.age,
  });
  this.lastChapter = this.hero.chapter;
}
```

(정확한 위치는 grep 결과를 보고 적용. controller 가 `onEvent` 또는 동등한 emit 채널 가짐.)

- [ ] **Step 4: CycleControllerV2.test.ts 에 chapter_transition 테스트 추가**

기존 test file 끝에:

```ts
describe('CycleControllerV2 chapter_transition', () => {
  it('emits chapter_transition exactly once when hero crosses 어린시절 → 청년기', async () => {
    // 기존 테스트와 동일한 setup helper 사용 (controller + collector). hero 의 bp
    // 를 한 번에 청년기 (age 15+) 까지 진행시키는 방식이 가장 간단:
    //   - bpMax 100, age 5 → age 15 는 bpProgress 10/65 ≈ 0.154
    //   - consumeBp(16) 한 번이면 청년기 진입
    // 또는 기존 test 의 "run N cycles" 패턴이 있으면 그것 활용.
    // 이 구체적 setup 은 기존 테스트의 helper 시그니처에 맞춰 작성.
    // ...
    // expect(events.filter(e => e.type === 'chapter_transition')).toHaveLength(>=1);
    // const t = events.find(e => e.type === 'chapter_transition');
    // expect(t).toMatchObject({ fromChapter: '어린시절', toChapter: '청년기' });
  });
});
```

테스트 implementer 가 기존 `CycleControllerV2.test.ts` 의 setup helper 와 hero spawn 시그니처를 보고 위의 의사 코드를 실제 테스트로 채운다. (Implementer subagent 가 grep + 기존 테스트 한 개 읽고 동일 패턴으로 작성.)

- [ ] **Step 5: 테스트 실행 → 실패 (chapter_transition 없음) → emit 추가 후 통과**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleControllerV2
```

Expected: 새 테스트 PASS, 기존 테스트 regression 없음.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldEvents.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/overworld/CycleControllerV2.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): emit chapter_transition when hero crosses chapter boundary

V3-A movement polish — controller snapshots hero.chapter after each
arrival; on change, emits a chapter_transition event with from/to/age
so the React shell can surface a brief cinematic overlay.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: OverworldRunner 의 chapter transition 오버레이

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`

**Why:** Task 5 의 event 를 UI 가 받아 2초간 풀-스크린-가까운 작은 cinematic ("청년기 시작" + 부제) 표시. CSS animation 만으로 간단히. 너무 길거나 입력 차단하지 않도록.

- [ ] **Step 1: OverworldRunner.tsx 에 state 추가**

기존 useState 들 옆에:

```ts
const [chapterOverlay, setChapterOverlay] = useState<{ to: string; age: number; key: number } | null>(null);
```

- [ ] **Step 2: event 핸들러에서 chapter_transition 처리**

Event 처리 switch/branch (현재 `arrived_at` 등 처리하는 곳) 에 추가:

```ts
} else if (event.type === 'chapter_transition') {
  setChapterOverlay({ to: event.toChapter, age: event.atAge, key: Date.now() });
  setTimeout(() => setChapterOverlay(null), 2000);
}
```

- [ ] **Step 3: JSX 에 오버레이 렌더**

`<>` 또는 outer `<div>` 안 어딘가에 (event log 오버레이 옆이 자연스러움):

```tsx
{chapterOverlay && (
  <div
    key={chapterOverlay.key}
    style={{
      position: 'absolute',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '16px 24px',
      background: 'rgba(0,0,0,0.7)',
      color: '#ffd166',
      fontSize: 24,
      fontWeight: 700,
      borderRadius: 8,
      pointerEvents: 'none',
      animation: 'forgeFadeInOut 2s ease-in-out forwards',
      zIndex: 100,
    }}
  >
    <div>📖 {chapterOverlay.to}</div>
    <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{chapterOverlay.age}세</div>
  </div>
)}
```

키프레임이 globals.css 에 없을 가능성 — file 끝에 `<style>` 으로 같이 인라인하거나, 기존 OverworldRunner 가 styled-component / module CSS 쓰는지 확인. 가장 간단 = 컴포넌트 안의 `<style>{`@keyframes forgeFadeInOut { 0% { opacity: 0; transform: translateX(-50%) translateY(-8px); } 20%,80% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; } }`}</style>` 한 번 렌더 (overlay JSX 옆).

- [ ] **Step 4: dev server 로 수동 확인 + typecheck/lint**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 errors.

(런타임 시각 검증은 dev shell `pnpm dev` 후 cycle 진행하다 age 15 도달 시 overlay 1 번 확인 — 수동, implementer 가 sim:cycle 로도 event emission 자체 확인 가능.)

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): chapter transition overlay (2s cinematic)

V3-A movement polish — React shell catches chapter_transition events
and displays a 2s fade-in/out overlay showing the new chapter name +
age. Non-blocking (pointerEvents none).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 전체 검증 (typecheck / lint / test / build)

**Files:** —

**Why:** V3-A 가 끝났다고 선언하기 전 전체 화면 — 6 commits 누적 후 회귀 없음 확인.

- [ ] **Step 1: typecheck (전 워크스페이스)**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 2: lint (전 워크스페이스)**

```bash
pnpm lint
```

Expected: 0 errors.

- [ ] **Step 3: test (inflation-rpg)**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모든 vitest PASS — 기존 ~825 통과 + 신규 4-6 추가 (Pathfinding bounds 3 + mapLayout bounds 1 + CycleControllerV2 chapter 1).

- [ ] **Step 4: e2e smoke (1 케이스만)**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --reporter=list
```

Expected: 기존 ~62-66 e2e PASS. (Smoke 만 돌리려면 `--grep smoke` 등 옵션 — 실패 없는 한 전체 OK.)

- [ ] **Step 5: dev shell 수동 확인 (optional, 단 V3-A 의 시각적 polish 가 핵심이라 권장)**

```bash
pnpm dev
```

- http://localhost:3000 → inflation-rpg → 새 cycle 시작 → 약 30초-1분 켜놓고:
  - hero 가 grid 밖으로 안 나가는지
  - 도착 후 짧은 pause + 약간의 fade 가 보이는지
  - age 15 도달 시점 "청년기" 오버레이 표시되는지

- [ ] **Step 6: V3-A complete tag (브랜치 머지 후 main 에서)**

```bash
# 브랜치 작업이라면 finishing-a-development-branch skill 로 머지 + tag.
# tag 명: phase-v3-a-complete
```

(브랜치 / 머지 / push 는 implementer subagent 가 아니라 controller 가 finishing-a-development-branch skill 로 처리.)

---

## Self-Review

**Spec coverage:**

| §9 V3-A 목표 | Task |
|---|---|
| Pathfinding bounds check | T1 (Pathfinder reject) + T2 (mapLayout clamp) + T3 (camera bounds) |
| 자연 idle (도착 후 pause / 둘러보기) | T4 (variable 300-800ms + alpha pulse) |
| Chapter transition cinematic | T5 (event emit) + T6 (overlay) |

§9 V3-A 의 3 bullet 모두 task 1 이상으로 mapping 됨.

**Placeholder scan:** Task 5 Step 4 의 chapter_transition 테스트 본문은 의사 코드. Implementer 가 기존 `CycleControllerV2.test.ts` 의 setup helper 와 hero spawn 시그니처를 grep + 1 케이스 read 한 뒤 동일 pattern 으로 채움. 이는 placeholder 가 아니라 "기존 패턴 따르기" 인 구체 지시 — 허용 범위.

**Type consistency:** `Chapter` 는 `hero/HeroLifecycle` 에서 import. `OverworldEvent` union 의 새 variant 와 일치. `onEvent` signature 는 controller / runner 양쪽 동일 (기존).

**Scope:**
- T1: ~10분 (test 3 case + 코드 ~10줄 변경)
- T2: ~10분 (test 1 case + place() 2줄 변경)
- T3: ~3분 (1줄 추가)
- T4: ~10분 (메서드 1개 교체)
- T5: ~20분 (event union + controller 약 5-10줄 + test 의 helper 활용)
- T6: ~15분 (state + handler + JSX + keyframe)
- T7: ~10분 (자동 검증 + 수동 확인)

총 ~78분 → 스펙 명시 1-2h 범위 OK.

---

— Plan 작성 완료 (2026-05-23, writing-plans v3 산출물)
