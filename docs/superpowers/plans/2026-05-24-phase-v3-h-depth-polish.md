# Phase V3-H — Depth + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** V3-DEF 머지 직후 사용자 6건 피드백 + 디버그로 발견된 base 락 3-bug compound 모두 해소. 자동 이어하기 / 상태창 / HUD polish / death penalty / content variety (4 새 event type) 통합 mega-phase.

**Architecture:**
- Bug fix triad: OverworldScene.setUnlockedRealms sync + mapLayout 양쪽 경계 exit + sim onBossKill 와이어
- Save model 재정의: 포기 버튼 폐기 + 자동 이어하기 + 자동 회춘 (Hero 사망 시)
- 신규 UI: StatusModal + HUD layout 재배치 + floating "+N" cleanup
- 신규 gameplay: 관광/명상/시련/계절변화 4 SagaEventType
- Persist v21 → v22 (season state 만 추가)

**Tech Stack:** TypeScript, Zustand persist v22, Vitest, Playwright, React, Phaser.

**Sub-spec:** `docs/superpowers/specs/2026-05-24-phase-v3-h-depth-polish-design.md` (commit `f902b21`)
**Base commit:** `f902b21` (main HEAD, V3-DEF 머지 + STATUS + V3-H sub-spec 직후)
**Branch:** `feat/phase-v3-h-depth-polish`

---

## File Structure

**Create:**
- `games/inflation-rpg/src/screens/StatusModal.tsx` — C1
- `games/inflation-rpg/src/data/narrationVariants.ts` — F1
- `games/inflation-rpg/src/data/sightseeingLandmarks.ts` — F3 (절경/landmark types)
- `games/inflation-rpg/src/season/SeasonState.ts` — F6 (cycle/transition logic)
- `games/inflation-rpg/src/season/__tests__/SeasonState.test.ts`
- `games/inflation-rpg/src/store/__tests__/migrateV21ToV22.test.ts`
- `games/inflation-rpg/tests/e2e/v3-h-depth-polish.spec.ts` — T20

**Modify:**
- `games/inflation-rpg/src/overworld/OverworldScene.ts` — A1, F6 season tint
- `games/inflation-rpg/src/screens/OverworldRunner.tsx` — A1 (event listener), B1 (button rename), C2, D1+D2, F6 (HUD season badge)
- `games/inflation-rpg/src/overworld/mapLayout.ts` — A2 (양쪽 경계 exit), F3 (sightseeing 배치)
- `games/inflation-rpg/src/data/landmarks.ts` — F3 (sightseeing landmark types)
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — F3 (sightseeing emit), F5 (trial), F6 (season tick)
- `games/inflation-rpg/src/overworld/cycleSliceV2.ts` — B3 (auto rejuv)
- `games/inflation-rpg/src/hero/HeroEntity.ts` — E1 (die level decrement)
- `games/inflation-rpg/src/saga/SagaTypes.ts` — F3-F6 (새 SagaEventType union 추가)
- `games/inflation-rpg/src/saga/SagaRecorder.ts` — F1 (narration variant lookup)
- `games/inflation-rpg/src/screens/SagaBookModal.tsx` — F3-F6 (새 filter)
- `games/inflation-rpg/src/store/gameStore.ts` — B2 (resume detection), F6 (season state), persist v22 migration
- `games/inflation-rpg/src/types.ts` — F6 (SeasonState type)
- `scripts/sim-cycle-v2.ts` — A3 (onBossKill + setCurrentRealmId)
- `games/inflation-rpg/tests/e2e/v9-migration.spec.ts` — v22 bump

---

## Task 1: Branch + types.ts + SeasonState 타입

**Files:** Modify `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Branch 생성**

```bash
git checkout -b feat/phase-v3-h-depth-polish
```

- [ ] **Step 2: types.ts 갱신**

`MetaState` 안 `eternalSaga` 다음에 추가:

```typescript
  /** V3-H — 현재 계절 (cycle 기반, hero age 0/15/30/45 마다 전환). */
  season: SeasonState;
```

types.ts 상단 (다른 type 들 근처) 에 추가:

```typescript
export type SeasonId = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonState {
  current: SeasonId;
  /** 마지막 transition 시점의 hero age. */
  startedAtAge: number;
}
```

- [ ] **Step 3: INITIAL_META 갱신**

`games/inflation-rpg/src/store/gameStore.ts` 의 `INITIAL_META` 의 `eternalSaga` 다음에:

```typescript
  // Phase V3-H — 계절
  season: { current: 'spring', startedAtAge: 0 },
```

- [ ] **Step 4: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): V3-H SeasonState type + INITIAL_META.season"
```

---

## Task 2: migrateV21ToV22 (TDD)

**Files:** Modify `games/inflation-rpg/src/store/gameStore.ts`, Create test

- [ ] **Step 1: 실패 테스트**

`games/inflation-rpg/src/store/__tests__/migrateV21ToV22.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { migrateV21ToV22 } from '../gameStore';

describe('migrateV21ToV22', () => {
  it('inserts default season { spring, 0 }', () => {
    const v21 = { meta: { light: 0 }, run: { level: 1 } };
    const r = migrateV21ToV22(v21) as { meta: any };
    expect(r.meta.season).toEqual({ current: 'spring', startedAtAge: 0 });
  });

  it('preserves existing season (idempotent)', () => {
    const v22 = { meta: { season: { current: 'fall', startedAtAge: 30 } } };
    const r = migrateV21ToV22(v22) as { meta: any };
    expect(r.meta.season.current).toBe('fall');
  });

  it('null meta safe', () => {
    expect(migrateV21ToV22({ meta: null })).toEqual({ meta: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV21ToV22(null)).toBe(null);
  });
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/store/__tests__/migrateV21ToV22.test.ts
```

- [ ] **Step 3: 구현**

`gameStore.ts` 의 `migrateV20ToV21` 다음에:

```typescript
export function migrateV21ToV22(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null };
  if (s.meta && typeof s.meta === 'object') {
    if (!s.meta['season'] || typeof s.meta['season'] !== 'object') {
      s.meta['season'] = { current: 'spring', startedAtAge: 0 };
    }
  }
  return s;
}
```

`runStoreMigration` 에 다음 블록 추가 (v20→v21 다음에):

```typescript
  if (fromVersion <= 21) {
    migrateV21ToV22(s);
  }
```

`persist` config 의 `version: 21` 을 `version: 22` 로 + 주석 갱신.

- [ ] **Step 4: Pass + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/store/__tests__/migrateV21ToV22.test.ts
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/__tests__/migrateV21ToV22.test.ts
git commit -m "feat(game-inflation-rpg): persist v21→v22 V3-H migration"
```

- [ ] **Step 5: v9-migration e2e v22 bump**

Edit `games/inflation-rpg/tests/e2e/v9-migration.spec.ts`:
- `JSON.parse(raw).version === 21` → `=== 22`
- `expect(migratedState.version).toBe(21)` → `.toBe(22)`
- title 의 "v21" 표기 → "v22"
- v21 assertions 다음에 v22 추가:

```typescript
  // v22 — Phase V3-H season default
  expect(migratedState.state.meta.season).toEqual({ current: 'spring', startedAtAge: 0 });
```

```bash
git add games/inflation-rpg/tests/e2e/v9-migration.spec.ts
git commit -m "fix(game-inflation-rpg): update v9-migration e2e for persist v22 (V3-H T2 followup)"
```

---

## Task 3: Bug A — OverworldScene.setUnlockedRealms sync

**Files:** Modify `games/inflation-rpg/src/overworld/OverworldScene.ts`, `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: OverworldScene setter + getter**

`OverworldScene.ts` 에 (기존 `unlockedRealms` 필드 근처) 추가/갱신:

```typescript
  private unlockedRealms: readonly RealmId[] = ['base'];

  init(data: { ...; currentRealm?: RealmId; unlockedRealms?: readonly RealmId[] }) {
    // ... 기존 init 로직
    if (data.unlockedRealms) {
      this.unlockedRealms = data.unlockedRealms;
    }
  }

  setUnlockedRealms(realms: readonly RealmId[]): void {
    this.unlockedRealms = realms;
  }
```

- [ ] **Step 2: OverworldRunner 가 realm_unlocked 이벤트 시 sync**

handleArrival 의 evs 처리 (T14 의 `realm_entered` 처리 옆) 에 추가:

```typescript
const realmUnlocked = evs.find(e => e.type === 'realm_unlocked');
if (realmUnlocked && realmUnlocked.type === 'realm_unlocked') {
  // Sync OverworldScene's stale unlockedRealms copy with controller's updated list
  const scene = (window as any).__overworldScene; // or however the scene is exposed
  if (scene && typeof scene.setUnlockedRealms === 'function') {
    scene.setUnlockedRealms(controller.getUnlockedRealms());
  }
}
```

NB: OverworldRunner 의 scene reference 구조 확인. Phaser game.scene.getScene 으로 접근 가능. 또는 controller 가 scene reference 갖고 있을 수도 있음. 단순히 setOpts 또는 events 로 scene 에 전파.

- [ ] **Step 3: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldScene.ts games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "fix(game-inflation-rpg): Bug A — OverworldScene.unlockedRealms sync on realm_unlocked (V3-H)"
```

---

## Task 4: Bug B — mapLayout 양쪽 경계 exit landmark

**Files:** Modify `games/inflation-rpg/src/overworld/mapLayout.ts`

- [ ] **Step 1: T6 의 base skip 제거 + 모든 realm 의 양쪽 경계 exit**

mapLayout.ts 의 V3-D realm loop 갱신:

```typescript
// V3-D: realm 별 column band 의 enemy + boss + exit 배치
for (let idx = 0; idx < REALM_CATALOG.length; idx++) {
  const realm = REALM_CATALOG[idx];
  const [colStart, colEnd] = realm.columnRange;

  // realm 1-5 의 enemy + boss
  if (realm.id !== 'base') {
    let y = 2;
    for (let i = 0; i < Math.min(4, realm.enemyRoster.length); i++) {
      const enemyId = realm.enemyRoster[i];
      const col = colStart + 2 + i * 4;
      place(enemyId, col, y, `_r${realm.id}`);
      y = (y + 3) % (GRID_H - 2) + 1;
    }
    place(realm.bossId, colEnd - 2, Math.floor(GRID_H / 2), `_r${realm.id}`);
  }

  // V3-H Bug B fix: 양쪽 경계 exit
  // current realm 의 끝 (colEnd - 1) 과 다음 realm 의 시작 (nextRealm.colStart = colEnd) 양쪽에 exit
  if (realm.nextRealm) {
    const nextRealm = REALM_CATALOG[idx + 1];
    // current realm 측 exit (col = colEnd - 1, 즉 current realm 의 마지막 column)
    place('exit', colEnd - 1, Math.floor(GRID_H / 2), `_${realm.id}_to_${realm.nextRealm}_a`);
    // next realm 측 exit (col = nextRealm.columnRange[0], 즉 next realm 의 첫 column) — back-entry semantics
    if (nextRealm) {
      place('exit', nextRealm.columnRange[0], Math.floor(GRID_H / 2) + 1, `_${realm.nextRealm}_from_${realm.id}_b`);
    }
  }
}
```

NB: 위 코드는 idx 기반 loop 로 base 도 포함. base 의 enemy/boss 배치는 기존 V1e 패턴 유지 (이 loop 의 if !base 분기 가 enemy/boss spawn skip). exit 은 base 도 placement (그게 Bug B fix 핵심).

NB: y offset (Math.floor(GRID_H / 2) vs `+ 1`) 은 두 exit 가 같은 셀 안 들어가게 하기 위함. 실제 적용 시 mapLayout 의 다른 landmark 와 겹치지 않게 grid placement 확인.

- [ ] **Step 2: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

NB: 기존 mapLayout 관련 테스트 (예: zone band 검증) 가 깨질 수 있음. 깨지면 expected count 갱신 (exit 개수 증가).

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/mapLayout.ts
git commit -m "fix(game-inflation-rpg): Bug B — 양쪽 경계 exit landmark (V3-H)"
```

---

## Task 5: Bug C — sim-cycle-v2 onBossKill + setCurrentRealmId 와이어

**Files:** Modify `scripts/sim-cycle-v2.ts`

- [ ] **Step 1: 와이어 추가**

`runOneCycle` 또는 controller construction 부분 찾아 update:

```typescript
import { findRealm } from '../games/inflation-rpg/src/data/realms';

function runOneCycle(opts: ...) {
  // ... existing ctrl 생성 코드
  const unlockedRealms: Set<RealmId> = new Set(['base']);
  let currentRealmId: RealmId = 'base';

  ctrl.setCurrentRealmId(currentRealmId);
  ctrl.setUnlockedRealms(Array.from(unlockedRealms));

  // onBossKill callback 추가
  ctrl.opts.onBossKill = (current) => {
    const realm = findRealm(current);
    if (realm.nextRealm && !unlockedRealms.has(realm.nextRealm)) {
      unlockedRealms.add(realm.nextRealm);
      ctrl.setUnlockedRealms(Array.from(unlockedRealms));
      return realm.nextRealm;
    }
    return null;
  };

  // ... 기존 loop
}
```

NB: ctrl.opts 가 readonly 일 수 있음. 그 경우 ctrl 생성 시점에 onBossKill 전달.

- [ ] **Step 2: Sim 실행**

```bash
pnpm --filter @forge/game-inflation-rpg exec tsx scripts/sim-cycle-v2.ts --count 50 --max-arrivals 500 > /tmp/v3h-sim.log
grep -c "realm_unlocked\|unlockedRealms" /tmp/v3h-sim.log
```

Expected: ≥ some realm_unlocked count (Bug C fix 의 증명).

- [ ] **Step 3: Commit**

```bash
git add scripts/sim-cycle-v2.ts
git commit -m "fix(scripts): sim-cycle-v2 onBossKill + setCurrentRealmId wire (V3-H Bug C)"
```

---

## Task 6: B1 — 포기 버튼 → 메인 메뉴 버튼

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: 버튼 텍스트 + 동작 변경**

기존 `포기 (cycle 종료)` 버튼 찾아서:

```jsx
<button
  type="button"
  data-testid="open-main-menu"
  onClick={() => {
    // V3-H: 자동 저장 후 메인 메뉴로. cycle 종료 호출 안 함.
    onExitToMenu?.();
  }}
  style={{ minHeight: 44, padding: '8px 16px', ... }}
>
  메인 메뉴
</button>
```

기존 `onAbandonCycle` 또는 비슷한 prop 은 제거하거나 그대로 두되 호출 안 함. `onExitToMenu` prop 가 없으면 `window.history.back()` 또는 메인 메뉴 라우팅 사용.

NB: `onExitToMenu` prop 의 정확한 명칭은 OverworldRunner 의 부모 (Routing) 확인.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): 포기 버튼 → 메인 메뉴 (자동 저장) (V3-H B1)"
```

---

## Task 7: B2 — 자동 이어하기 mount 시 resume

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`, `games/inflation-rpg/src/overworld/cycleSliceV2.ts`

- [ ] **Step 1: useEffect mount-time resume**

`OverworldRunner` 의 mount useEffect 안에서:

```typescript
useEffect(() => {
  const cycleStore = useCycleStoreV2.getState();
  if (!cycleStore.active) {
    // No active cycle — start new
    cycleStore.start({ seed: ... });
  } else {
    // Active cycle exists — resume in-place. controller already constructed.
  }
}, []);
```

NB: `useCycleStoreV2.active` field 존재 확인. 없으면 controller 존재 여부로 판단. 또는 `cycleStore.controller` truthy 면 active.

- [ ] **Step 2: cycleSliceV2 가 cycle state 를 persist (이미 v21 부터?)**

확인: useCycleStoreV2 가 zustand persist 안 쓰면 page reload 시 cycle 사라짐. V3-DEF 까지 보면 cycle state 는 controller 의 in-memory 만이고 persist 안 됨. **저장이 안 되면 B2 무의미.**

해결책 A: cycleSliceV2 가 persist 사용 (가벼운 cycle metadata 만).
해결책 B: OverworldRunner mount 시 useGameStore 의 run.* 필드 기준으로 cycle 자동 재시작 (== "이어하기" 의 의미 = 같은 hero/save 로 새 cycle 시작, 무한 hero 의미상 동일).

**선택: B**. eternal hero 의 의미는 run.* state 가 persist v22 에 보존되어 다음 진입 시 hero 이어짐. cycle 자체는 재시작하되 같은 hero/age/saga 로 — 사용자 관점에서 "이어하기".

구현: mount 시 useGameStore 의 hero 상태 보고 `cycleStore.start()` 가 기존 hero 재사용. `cycleSliceV2.start` 에서 INITIAL_RUN 기반 새 hero 생성하지 말고 `useGameStore.getState().run` 기반 resume.

```typescript
// cycleSliceV2.start 안에서:
const run = useGameStore.getState().run;
const hero = run.heroSnapshot
  ? HeroEntity.restore(run.heroSnapshot)  // V3-B 의 deserialize
  : new HeroEntity({ ... });  // 새 hero
```

NB: `HeroEntity.restore` 또는 비슷한 메서드 존재 확인. 없으면 별도 deserialize 로직 작성 필요. V3-B 가 hero 를 어떻게 persist 하는지 확인.

- [ ] **Step 3: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx games/inflation-rpg/src/overworld/cycleSliceV2.ts
git commit -m "feat(game-inflation-rpg): auto-resume mount-time cycle (V3-H B2)"
```

---

## Task 8: B3 — Hero 사망 시 자동 회춘 5년

**Files:** Modify `games/inflation-rpg/src/overworld/cycleSliceV2.ts`

- [ ] **Step 1: Hero died 분기 자동 회춘**

cycleSliceV2 의 hero_died event 처리 (V3-B 에서 wire 됨) 안에서:

```typescript
// V3-H B3: hero 사망 시 자동 회춘 5년 (eternal hero 유지)
const onHeroDied = () => {
  // 기존 hero_died 핸들링 (saga event 등) ...

  // 5년 자동 회춘
  setTimeout(() => {
    const cycleStore = useCycleStoreV2.getState();
    cycleStore.rejuvenateHero(5);
  }, 2000);  // 2초 dramatic pause
};
```

NB: setTimeout 대신 OverworldRunner 의 cinematic overlay 와 연동 가능. "재생합니다..." 텍스트 2초 표시 후 회춘. UX 부드러움.

- [ ] **Step 2: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/cycleSliceV2.ts
git commit -m "feat(game-inflation-rpg): hero death → auto rejuv 5년 (V3-H B3)"
```

---

## Task 9: E1 — Death penalty -10% level

**Files:** Modify `games/inflation-rpg/src/hero/HeroEntity.ts`

- [ ] **Step 1: die() 또는 동등 위치에서 level decrement**

`HeroEntity.die()` 안에 추가 (또는 isAlive=false 로 전환되는 위치):

```typescript
die(): void {
  // ... 기존 die 로직 (isAlive = false 등)

  // V3-H E1: 패배 시 -10% 레벨
  const oldLevel = this.level;
  this.level = Math.max(1, Math.floor(this.level * 0.90));
  // saga event 텍스트는 SagaRecorder 에서 생성
}
```

NB: `this.level` 의 field 명 확인. HeroEntity 의 stat 구조에 따라 다를 수 있음. V3-B 는 `level` 직접 노출.

NB: HeroEntity 외에 cycleSliceV2 가 hero_died 처리 시 level 변동 narration 을 saga 에 기록할 수 있도록 `oldLevel` → `newLevel` 전달 필요. controller 또는 slice 에서 이 정보를 saga 로.

- [ ] **Step 2: saga narration 갱신**

`SagaRecorder` 또는 saga event push 위치에서 hero_died event 의 narrativeText:

```typescript
const oldLv = ...; // hero 사망 전 level
const newLv = ...; // hero 사망 후 level (die 호출 후)
const narrativeText = `[LV ${oldLv} → ${newLv}] 시련에 쓰러졌다`;
```

NB: cycleSliceV2 또는 controller 의 hero_died 처리 부분 (V3-B 의 deathPenalty wire) 참고.

- [ ] **Step 3: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/saga/SagaRecorder.ts games/inflation-rpg/src/overworld/cycleSliceV2.ts
git commit -m "feat(game-inflation-rpg): death penalty -10% level + saga narration (V3-H E1)"
```

---

## Task 10: D1 — Floating "+N" animation cleanup

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: max stack + position offset + clean fade**

기존 floating "+N" state 찾기 (V3-C 에서 추가):

```typescript
const [lightFloats, setLightFloats] = useState<Array<{ id: string; amount: number; createdAt: number }>>([]);
```

핸들러 갱신:

```typescript
// V3-H D1: max 3 concurrent, fade out 1500ms, position stagger
const MAX_FLOATS = 3;
const FADE_MS = 1500;

const emitFloat = (amount: number) => {
  setLightFloats(prev => {
    const next = [...prev, { id: `${Date.now()}-${Math.random()}`, amount, createdAt: Date.now() }];
    return next.slice(-MAX_FLOATS);
  });
};

// cleanup useEffect:
useEffect(() => {
  const tick = setInterval(() => {
    const now = Date.now();
    setLightFloats(prev => prev.filter(f => now - f.createdAt < FADE_MS));
  }, 500);
  return () => clearInterval(tick);
}, []);
```

JSX (위치 stagger, HUD 텍스트 위로 겹치지 않게 z-index 분리):

```jsx
{lightFloats.map((f, idx) => (
  <div
    key={f.id}
    style={{
      position: 'absolute',
      right: 16 + idx * 4,
      top: 80 + idx * 18,  // stagger
      color: '#ffd54f',
      fontSize: 14,
      fontWeight: 700,
      opacity: 1 - ((Date.now() - f.createdAt) / FADE_MS),
      pointerEvents: 'none',
      zIndex: 5,  // HUD text (zIndex 10) 아래로
      transition: 'opacity 0.3s',
    }}
  >
    +{f.amount.toFixed(1)}
  </div>
))}
```

NB: z-index 결정 — HUD 텍스트가 위로 올라가게 (정보 우선) + floating 이 시각효과로 살짝 보이게.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): floating +N animation cleanup (V3-H D1)"
```

---

## Task 11: D2 — HUD layout 2줄 재배치

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: HUD 컨테이너를 2줄로**

기존 HUD wrapper 찾아서 flex direction 또는 grid 로 2줄:

```jsx
<div data-testid="hud" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, ... }}>
  {/* 1행: 캐릭터 정보 */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
    <span data-testid="hud-emoji-name">{hero.emoji} {hero.nameKR}</span>
    <span data-testid="hud-age">{Math.floor(hero.age)}세 · {hero.chapter}</span>
    <span data-testid="hud-job-lv">{hero.job} · LV {hero.level}</span>
    <span data-testid="hud-hp">HP {hero.hp}/{hero.maxHp}</span>
  </div>

  {/* 2행: 메타 + buttons */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
    <span data-testid="hud-light">빛 {meta.light}</span>
    <span data-testid="hud-rejuv">재생 #{meta.eternalSaga.rejuvenationCount}</span>
    <span data-testid="hud-realm">🌍 {realmName} ({meta.unlockedRealms.length}/6)</span>
    <span data-testid="hud-season">{seasonEmoji} {seasonName}</span>  {/* V3-H F6 */}
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
      <button data-testid="open-spend-modal">신의 메뉴</button>
      <button data-testid="open-saga-modal">📖 기록</button>
      <button data-testid="open-status-modal">📊 상태</button>  {/* V3-H C2 */}
      <button data-testid="open-main-menu">메인 메뉴</button>
    </div>
  </div>

  {/* Speed buttons (별도 행 또는 corner) */}
  <div style={{ display: 'flex', gap: 4 }}>
    {/* 1x / 2x / 5x / 10x */}
  </div>
</div>
```

NB: 정확한 spans / buttons 명은 기존 HUD 의 분리 따름. season + status button 은 F6 / C 가 끝나면 활성.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): HUD 2줄 layout 재배치 (V3-H D2)"
```

---

## Task 12: C1 — StatusModal

**Files:** Create `games/inflation-rpg/src/screens/StatusModal.tsx`

- [ ] **Step 1: Modal component**

```tsx
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { BUFF_CATALOG } from '../buff/catalog';
import { findRealm } from '../data/realms';

interface Props {
  onClose: () => void;
}

export function StatusModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!hero) return null;

  const realm = findRealm(run.currentRealmId);

  return (
    <div data-testid="status-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div data-testid="status-modal" style={{ width: 'min(480px, 96vw)', maxHeight: '88vh', background: '#1a1d28', color: '#eee', borderRadius: 12, border: '1px solid #444', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>{hero.emoji} {hero.nameKR}</strong>
          <button type="button" data-testid="status-modal-close" onClick={onClose} style={{ minHeight: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6 }}>✕</button>
        </div>

        {/* Body: scrollable */}
        <div style={{ overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 기본 정보 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>기본 정보</div>
            <div style={{ fontSize: 13 }}>나이: {Math.floor(hero.age)}세 · {hero.chapter}</div>
            <div style={{ fontSize: 13 }}>직업: {hero.job}</div>
            <div style={{ fontSize: 13 }}>레벨: {hero.level}</div>
            <div style={{ fontSize: 13 }}>현재 위치: {realm.nameKR}</div>
          </section>

          {/* 스탯 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>스탯</div>
            <div style={{ fontSize: 13 }}>HP: {hero.hp} / {hero.maxHp}</div>
            <div style={{ fontSize: 13 }}>ATK: {hero.atk}</div>
            <div style={{ fontSize: 13 }}>SP: {hero.sp}</div>
          </section>

          {/* 장비 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>장비</div>
            {meta.inventory?.equipped ? (
              <div style={{ fontSize: 13 }}>
                {Object.entries(meta.inventory.equipped).map(([slot, item]) => (
                  <div key={slot}>{slot}: {item ? `${item.nameKR ?? item.id}` : '(없음)'}</div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#888' }}>(장비 없음)</div>
            )}
          </section>

          {/* 학습 스킬 */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>학습 스킬</div>
            {meta.skillsLearned && meta.skillsLearned.length > 0 ? (
              <ul style={{ fontSize: 13, margin: 0, paddingLeft: 16 }}>
                {meta.skillsLearned.map((sk: string) => <li key={sk}>{sk}</li>)}
              </ul>
            ) : (
              <div style={{ fontSize: 12, color: '#888' }}>(스킬 없음)</div>
            )}
          </section>

          {/* Buff Lv */}
          <section>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>신의 가호 (buff Lv)</div>
            <div style={{ fontSize: 13 }}>
              {BUFF_CATALOG.filter(b => b.id !== 'oneshot_rejuv').map(b => {
                const lv = meta.buffLevels[b.id] ?? 0;
                if (lv === 0) return null;
                return <div key={b.id}>{b.nameKR}: Lv {lv}</div>;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
```

NB: meta.inventory / meta.skillsLearned 의 정확한 schema 는 V3-C/V3-DEF 까지의 코드 확인. 없는 필드는 optional 처리. BUFF_CATALOG 의 nameKR 도 V3-C 에서 확인.

NB: `data-testid="status-modal"` + `status-modal-backdrop` + `status-modal-close` 필수.

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/screens/StatusModal.tsx
git commit -m "feat(game-inflation-rpg): StatusModal — 장비/스킬/스탯/buff (V3-H C1)"
```

---

## Task 13: C2 — StatusModal mount

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: state + mount**

T11 의 HUD redesign 에서 이미 `open-status-modal` button 추가. 이제 mount:

```typescript
import { StatusModal } from './StatusModal';
const [statusModalOpen, setStatusModalOpen] = useState(false);
```

Button onClick:

```jsx
<button data-testid="open-status-modal" onClick={() => setStatusModalOpen(true)}>📊 상태</button>
```

Mount:

```jsx
{statusModalOpen && <StatusModal onClose={() => setStatusModalOpen(false)} />}
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): StatusModal mount in OverworldRunner (V3-H C2)"
```

---

## Task 14: F1 — Narration variants

**Files:** Create `games/inflation-rpg/src/data/narrationVariants.ts`, Modify `games/inflation-rpg/src/saga/SagaRecorder.ts`

- [ ] **Step 1: Variant catalog**

```typescript
import type { SagaEventType } from '../saga/SagaTypes';

const VARIANTS: Partial<Record<SagaEventType, (ctx: { hero?: any; payload?: any }) => string[]>> = {
  battle: () => [
    '{enemy}을 처치했다',
    '{enemy}를 베어넘겼다',
    '{enemy}에게 일격을 가했다',
    '{enemy}와 싸워 이겼다',
    '{enemy}가 쓰러졌다',
    '{enemy}의 숨이 끊어졌다',
    '간신히 {enemy}을 제압했다',
    '{enemy}을 압도했다',
  ],
  levelUp: () => [
    'LV {from} → LV {to} 까지 {steps}단계 폭풍 성장했다',
    'LV {from} 에서 LV {to} 으로 진화했다',
    '{steps}단계 폭발적으로 성장 — LV {to}',
    '미친 듯이 강해졌다 — LV {to}',
    '{steps}단계의 비약 — LV {from} → {to}',
  ],
  drop: () => [
    '{item}을 손에 넣었다',
    '{item}을 발견했다',
    '바닥에 떨어진 {item}을 주웠다',
    '{item}이 빛났다',
  ],
  shrine: () => [
    '사당에서 잠시 기도했다',
    '신의 가호를 받았다',
    '오래된 사당 앞에서 묵상했다',
    '성스러운 빛이 흘렀다',
  ],
  moralChoice: () => [
    '쓰러진 적을 살려보내며 자비가 깊어졌다',
    '도망친 적을 추격하지 않았다',
    '약자를 보호했다',
    '냉정하게 적을 베었다',
  ],
};

export function variantOf(type: SagaEventType, ctx: { hero?: any; payload?: any; seed: number }): string {
  const candidates = VARIANTS[type]?.(ctx) ?? [];
  if (candidates.length === 0) return '';
  return candidates[ctx.seed % candidates.length];
}
```

- [ ] **Step 2: SagaRecorder 가 variantOf 사용**

`SagaRecorder.record` 가 narrativeText 를 채워넣는 곳 (또는 controller's recordToStore 호출 site) 에서:

```typescript
import { variantOf } from '../data/narrationVariants';

// 기존 narrativeText 생성 코드를:
const seed = Math.floor(Math.random() * 100000);
const variant = variantOf(event.type, { hero: this.hero, payload: event.payload, seed });
// variant 가 비어있으면 기존 fallback 사용
const narrativeText = variant
  .replace('{enemy}', event.payload?.enemyName ?? '적')
  .replace('{from}', event.payload?.from ?? '')
  .replace('{to}', event.payload?.to ?? '')
  .replace('{steps}', event.payload?.steps ?? '')
  .replace('{item}', event.payload?.itemName ?? '아이템')
  || fallback;
```

NB: 정확한 payload field 명은 SagaEvent 의 type 정의 + SagaRecorder.record callsite 에서 확인. battle event 의 payload 가 `enemyName` 필드 있는지 등.

- [ ] **Step 3: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/data/narrationVariants.ts games/inflation-rpg/src/saga/SagaRecorder.ts
git commit -m "feat(game-inflation-rpg): narration variants (5-10/event) (V3-H F1)"
```

---

## Task 15: F2 — shrine/drop frequency 조정

**Files:** Modify `games/inflation-rpg/src/overworld/EncounterEngine.ts` 또는 동등 위치

- [ ] **Step 1: shrine/drop 빈도 +20%**

EncounterEngine 의 shrine/drop encounter 확률 찾아 +20%:

```typescript
// 기존: const shrineChance = 0.05;
const shrineChance = 0.06;  // V3-H F2: +20%
const dropChance = 0.10;  // 기존 0.083 -> +20%
```

NB: 정확한 변수명 + 위치는 EncounterEngine.ts 의 resolveEncounter 코드 확인.

- [ ] **Step 2: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

NB: 기존 sim regression 에서 drop / shrine count assertion 이 있으면 갱신.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts
git commit -m "feat(game-inflation-rpg): shrine/drop 빈도 +20% (V3-H F2)"
```

---

## Task 16: F3 — Sightseeing event type

**Files:** Modify `games/inflation-rpg/src/saga/SagaTypes.ts`, `games/inflation-rpg/src/data/landmarks.ts`, `games/inflation-rpg/src/overworld/mapLayout.ts`, `games/inflation-rpg/src/overworld/CycleControllerV2.ts`

- [ ] **Step 1: SagaEventType 추가**

`SagaTypes.ts`:

```typescript
export type SagaEventType =
  | 'battle' | 'drop' | 'levelUp' | 'shrine' | 'moralChoice' | 'rejuvenation' | 'hero_died'
  | 'sightseeing' | 'meditation' | 'trial' | 'season_change';  // V3-H 신규
```

(union 의 기존 정확한 모양은 코드 확인. 새 4종 추가.)

- [ ] **Step 2: 절경 landmark types**

`landmarks.ts` 에 추가:

```typescript
  // V3-H F3 — 절경 sightseeing landmark
  { id: 'mountain_peak',  nameKR: '산정',         emoji: '⛰️', kind: 'sightseeing' },
  { id: 'ancient_tree',   nameKR: '고대의 나무',  emoji: '🌳', kind: 'sightseeing' },
  { id: 'waterfall',      nameKR: '폭포',         emoji: '💧', kind: 'sightseeing' },
  { id: 'starry_field',   nameKR: '별빛 들판',    emoji: '✨', kind: 'sightseeing' },
  { id: 'sacred_grove',   nameKR: '신성한 숲',    emoji: '🌲', kind: 'sightseeing' },
```

LandmarkType.kind union 에 'sightseeing' 추가 (만약 없으면).

- [ ] **Step 3: mapLayout 에 배치**

기존 realm enemy/boss loop 다음에:

```typescript
// V3-H F3: sightseeing landmark 배치 (cycle 당 1-2회 만남 budget)
const SIGHTSEEING_TYPES = ['mountain_peak', 'ancient_tree', 'waterfall', 'starry_field', 'sacred_grove'];
for (const realm of REALM_CATALOG) {
  const [colStart, colEnd] = realm.columnRange;
  // realm 당 1-2개 sightseeing 배치
  const typeId = SIGHTSEEING_TYPES[Math.floor(rng.next() * SIGHTSEEING_TYPES.length)];
  const col = colStart + 5 + Math.floor(rng.next() * Math.max(1, colEnd - colStart - 10));
  const row = 2 + Math.floor(rng.next() * (GRID_H - 4));
  place(typeId, col, row, `_sightseeing_${realm.id}`);
}
```

- [ ] **Step 4: CycleControllerV2 가 sightseeing 도착 시 event 발화**

`handleArrival` 의 kind 별 분기에 추가:

```typescript
if (kind === 'sightseeing') {
  // personality dim +1 (랜덤) + 소액 XP
  const dim = (['heroic', 'pious', 'merciful'] as const)[this.rng.int(3)];
  this.hero.personality.adjust(dim, 1);
  this.recordToStore({
    age: this.hero.age,
    type: 'sightseeing',
    narrativeText: `${landmark.type.nameKR}에서 잠시 멈춰섰다`,
    payload: { dim, landmarkId: landmark.instanceId },
  });
}
```

NB: 정확한 hero.personality.adjust 시그니처 + SagaEvent payload schema 확인. landmark / consumed 로직은 mapLayout 의 기존 패턴 따름.

- [ ] **Step 5: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/saga/SagaTypes.ts games/inflation-rpg/src/data/landmarks.ts games/inflation-rpg/src/overworld/mapLayout.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts
git commit -m "feat(game-inflation-rpg): sightseeing event + 절경 landmark types (V3-H F3)"
```

---

## Task 17: F4 — Meditation (shrine 변형)

**Files:** Modify `games/inflation-rpg/src/overworld/EncounterEngine.ts` or controller

- [ ] **Step 1: shrine 의 20% 확률로 meditation**

EncounterEngine 의 shrine 분기에서:

```typescript
if (kind === 'shrine') {
  if (this.rng.chance(0.2)) {
    // meditation 변형
    this.hero.personality.adjust('pious', 3);
    this.hero.hp = this.hero.maxHp;
    this.hero.age += 0.5;
    this.recordToStore({
      age: this.hero.age,
      type: 'meditation',
      narrativeText: '깊은 명상에 잠겨 시간을 잃었다',
      payload: { pious_gain: 3, age_cost: 0.5 },
    });
  } else {
    // 기존 shrine 처리
    // ... 기존 코드
  }
}
```

NB: this.rng 가 EncounterEngine 에 있는지 controller 에 있는지 확인. shrine 분기의 정확한 위치는 코드 확인.

- [ ] **Step 2: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts
git commit -m "feat(game-inflation-rpg): meditation event (shrine 20% 변형) (V3-H F4)"
```

---

## Task 18: F5 — Trial event (시련)

**Files:** Modify `games/inflation-rpg/src/overworld/CycleControllerV2.ts`, `games/inflation-rpg/src/data/landmarks.ts`

- [ ] **Step 1: Trial landmark type**

```typescript
  { id: 'trial_altar', nameKR: '시련의 제단', emoji: '🗿', kind: 'trial' },
```

LandmarkType.kind union 에 'trial' 추가.

- [ ] **Step 2: mapLayout 에서 장년기 이후 realm 마다 1개 trial**

```typescript
// V3-H F5: trial landmark (장년기 이후 = sea 이상 realm 마다 1개)
for (const realm of REALM_CATALOG) {
  if (realm.id === 'base') continue;
  const [colStart, colEnd] = realm.columnRange;
  const col = colStart + Math.floor((colEnd - colStart) / 3);
  place('trial_altar', col, 1, `_trial_${realm.id}`);
}
```

- [ ] **Step 3: Controller handleArrival 의 trial 분기**

```typescript
if (kind === 'trial') {
  // field level × 2 인 적
  const fieldLv = fieldLevelAtColumn(this.currentRealmId ?? 'base', this.hero.gridX);
  const trialLv = fieldLv * 2;
  const damping = computeFieldDamping(this.hero.level, trialLv, getFieldDiffThreshold(useGameStore.getState().meta));
  const heroAtk = Math.max(1, Math.floor(this.hero.atk * damping));
  const enemyHp = trialLv * 30;
  const enemyAtk = trialLv * 2;

  let eHp = enemyHp;
  let hHp = this.hero.hp;
  while (eHp > 0 && hHp > 0) {
    eHp -= heroAtk;
    if (eHp > 0) hHp -= enemyAtk;
  }

  if (eHp <= 0) {
    // 승리: LV +3 + special drop
    this.hero.level += 3;
    this.recordToStore({
      age: this.hero.age,
      type: 'trial',
      narrativeText: '시련을 이겨냈다 — LV +3',
      payload: { trialLv, outcome: 'win' },
    });
  } else {
    // 패배: 더 큰 penalty (-15%)
    const oldLv = this.hero.level;
    this.hero.level = Math.max(1, Math.floor(this.hero.level * 0.85));
    this.recordToStore({
      age: this.hero.age,
      type: 'trial',
      narrativeText: `시련에 무너졌다 — LV ${oldLv} → ${this.hero.level}`,
      payload: { trialLv, outcome: 'lose' },
    });
    // hero 사망 아님 (continue cycle)
  }
}
```

NB: damping computation 의 import 위치 확인. trial 의 단순화된 battle 로직 (no skill / no drop) 은 의도된 design.

- [ ] **Step 4: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/data/landmarks.ts games/inflation-rpg/src/overworld/mapLayout.ts
git commit -m "feat(game-inflation-rpg): trial event (시련, 고위험 고보상) (V3-H F5)"
```

---

## Task 19: F6 — Season state + bg tint + bonus

**Files:** Create `games/inflation-rpg/src/season/SeasonState.ts`, Modify several

- [ ] **Step 1: SeasonState helper (TDD)**

`SeasonState.ts`:

```typescript
import type { SeasonId } from '../types';

export const SEASON_ORDER: readonly SeasonId[] = ['spring', 'summer', 'fall', 'winter'];

export const SEASON_DURATION_YEARS = 15;  // 4 seasons / 60-year cycle

export function seasonForAge(age: number): SeasonId {
  const ageMod = ((age % (SEASON_DURATION_YEARS * 4)) + (SEASON_DURATION_YEARS * 4)) % (SEASON_DURATION_YEARS * 4);
  const idx = Math.floor(ageMod / SEASON_DURATION_YEARS);
  return SEASON_ORDER[idx];
}

export function seasonNameKR(s: SeasonId): string {
  return { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' }[s];
}

export function seasonEmoji(s: SeasonId): string {
  return { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' }[s];
}

export function seasonBgTint(s: SeasonId): number {
  // Phaser color int
  return { spring: 0xb0e57c, summer: 0xfff5a8, fall: 0xffb066, winter: 0xc9e3ff }[s];
}

export interface SeasonBonus { atkMul: number; dropMul: number; lightRateMul: number; dampingThresholdBonus: number; }

export function seasonBonus(s: SeasonId): SeasonBonus {
  return {
    spring: { atkMul: 1.0, dropMul: 1.0, lightRateMul: 1.1, dampingThresholdBonus: 0 },
    summer: { atkMul: 1.05, dropMul: 1.0, lightRateMul: 1.0, dampingThresholdBonus: 0 },
    fall:   { atkMul: 1.0, dropMul: 1.1, lightRateMul: 1.0, dampingThresholdBonus: 0 },
    winter: { atkMul: 1.0, dropMul: 1.0, lightRateMul: 1.0, dampingThresholdBonus: 5 },
  }[s];
}
```

Test file `__tests__/SeasonState.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { seasonForAge, seasonBonus, SEASON_ORDER } from '../SeasonState';

describe('seasonForAge', () => {
  it('age 0 → spring', () => expect(seasonForAge(0)).toBe('spring'));
  it('age 14 → spring (boundary)', () => expect(seasonForAge(14)).toBe('spring'));
  it('age 15 → summer', () => expect(seasonForAge(15)).toBe('summer'));
  it('age 30 → fall', () => expect(seasonForAge(30)).toBe('fall'));
  it('age 45 → winter', () => expect(seasonForAge(45)).toBe('winter'));
  it('age 60 → spring (wraps)', () => expect(seasonForAge(60)).toBe('spring'));
});

describe('seasonBonus', () => {
  it('summer atkMul 1.05', () => expect(seasonBonus('summer').atkMul).toBe(1.05));
  it('fall dropMul 1.1', () => expect(seasonBonus('fall').dropMul).toBe(1.1));
});
```

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/season/__tests__/SeasonState.test.ts
```

- [ ] **Step 2: controller season tick**

`CycleControllerV2.handleArrival` 끝부분에 (NPC tick 다음):

```typescript
// V3-H F6: season transition check
import { seasonForAge } from '../season/SeasonState';
const newSeason = seasonForAge(this.hero.age);
const meta = useGameStore.getState().meta;
if (newSeason !== meta.season.current) {
  useGameStore.setState(s => ({
    ...s,
    meta: { ...s.meta, season: { current: newSeason, startedAtAge: Math.floor(this.hero.age) } },
  }));
  this.recordToStore({
    age: this.hero.age,
    type: 'season_change',
    narrativeText: `계절이 바뀌었다 — ${seasonNameKR(newSeason)}`,
    payload: { season: newSeason },
  });
  events.push({ type: 'season_changed', season: newSeason } as any);  // OverworldEvent union extension
}
```

NB: OverworldEvent union 에 `season_changed` 추가 필요. 만약 union narrow 강제면 별도 type extend.

- [ ] **Step 3: OverworldScene bg tint**

scene 안에서 season 변경 시 main camera 또는 background bgColor 변경:

```typescript
// OverworldScene 의 init 또는 update:
this.cameras.main.setBackgroundColor(seasonBgTint(currentSeason));
```

NB: 정확한 적용 방법은 Phaser API 확인. 또는 tile tint.

- [ ] **Step 4: bonus 적용**

EncounterEngine 또는 controller 의 damage/drop/light 계산에 season bonus 곱:

```typescript
const seasonBonusVal = seasonBonus(useGameStore.getState().meta.season.current);
const finalAtk = Math.max(1, Math.floor(hero.atk * damping * seasonBonusVal.atkMul));
const finalDrop = dropChanceBonus * seasonBonusVal.dropMul;
```

NB: getBuffSnapshot callback 안에 season bonus 통합도 가능. 가장 깨끗한 위치 선택.

- [ ] **Step 5: HUD season badge**

T11 의 HUD layout 에 season span:

```jsx
<span data-testid="hud-season">{seasonEmoji(meta.season.current)} {seasonNameKR(meta.season.current)}</span>
```

- [ ] **Step 6: typecheck + vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/season/ games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/overworld/OverworldScene.ts games/inflation-rpg/src/overworld/EncounterEngine.ts games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): season system + bg tint + bonus (V3-H F6)"
```

---

## Task 20: SagaBookModal 새 filter

**Files:** Modify `games/inflation-rpg/src/screens/SagaBookModal.tsx`

- [ ] **Step 1: 4 새 filter 추가**

기존 EventFilter union 에 추가:

```typescript
type EventFilter = 'all' | 'battle' | 'drop' | 'levelUp' | 'realm' | 'npc' | 'rejuv' | 'sightseeing' | 'meditation' | 'trial' | 'season';
```

filter button row 에 4 추가 (loop 사용):

```jsx
{(['all','battle','drop','levelUp','realm','npc','rejuv','sightseeing','meditation','trial','season'] as EventFilter[]).map(f => (
  // ... 기존 button JSX
))}
```

matchesFilter 함수 갱신:

```typescript
function matchesFilter(t: SagaEventType, f: EventFilter): boolean {
  if (f === 'all') return true;
  if (f === 'season') return t === 'season_change';
  // 다른 매핑 그대로
  // ...
  return t === f;
}
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/screens/SagaBookModal.tsx
git commit -m "feat(game-inflation-rpg): SagaBookModal 4 new event filters (V3-H)"
```

---

## Task 21: E2E v3-h-depth-polish.spec.ts

**Files:** Create `games/inflation-rpg/tests/e2e/v3-h-depth-polish.spec.ts`

- [ ] **Step 1: E2E**

```typescript
import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('V3-H — Depth + Polish', () => {
  test.setTimeout(300_000);

  test('base → sea 전환 (Bug A+B fix) + status modal + season HUD', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => { localStorage.removeItem(key); }, SAVE_KEY);
    await page.reload();

    await page.getByTestId('btn-start-cycle').click();
    await page.getByTestId('btn-prep-start').click();
    await page.waitForSelector('[data-testid="overworld-runner"]', { timeout: 10000 });
    await page.getByTestId('speed-10x').click();

    // 상태창 열기 (C2)
    await page.getByTestId('open-status-modal').click();
    await expect(page.getByTestId('status-modal')).toBeVisible();
    await page.getByTestId('status-modal-close').click();
    await expect(page.getByTestId('status-modal')).not.toBeVisible();

    // 메인 메뉴 버튼 존재 (B1) + 포기 버튼 부재
    await expect(page.getByTestId('open-main-menu')).toBeVisible();

    // Season HUD (F6)
    await expect(page.getByTestId('hud-season')).toBeVisible();

    // 50초 대기 → base 탈출 검증 (boss kill + sea 진입)
    await page.waitForTimeout(50_000);

    // HUD realm 이 '시작의 들판' 외 다른 realm 으로 전환되었거나, unlockedRealms count > 1
    const realmText = await page.getByTestId('hud-realm').innerText();
    const hasProgress = !realmText.includes('1/6');  // base 만 unlock 이면 1/6
    expect(hasProgress).toBe(true);
  });
});
```

- [ ] **Step 2: Commit (no run)**

```bash
git add games/inflation-rpg/tests/e2e/v3-h-depth-polish.spec.ts
git commit -m "test(game-inflation-rpg): E2E V3-H depth+polish — base→sea + status + season"
```

---

## Task 22: 전체 검증 + main 머지 prep

**Files:** none (validation)

- [ ] **Step 1: 전체 vitest** → `pnpm --filter @forge/game-inflation-rpg exec vitest run`
- [ ] **Step 2: typecheck** → `pnpm typecheck`
- [ ] **Step 3: lint** → `pnpm lint`
- [ ] **Step 4: 전체 e2e** → `pnpm --filter @forge/game-inflation-rpg e2e`
- [ ] **Step 5: 50-cycle sim regression** → `tsx scripts/sim-cycle-v2.ts --count 50 --max-arrivals 500`. base → sea unlock rate > 70% 목표 (Bug C 와이어 후).
- [ ] **Step 6: Verification report** (vitest / typecheck / lint / e2e / sim findings / 부채 갱신)
- [ ] **Step 7: NO 머지, NO tag** — user 명시 후 진행. 보고만.

---

## Self-Review

**Spec coverage:**
- §1 Why (6 피드백 + 3 bug) ✓ T3-T5 (bug fixes) + T6-T8 (save) + T12-T13 (status) + T10-T11 (HUD) + T9 (death) + T14-T20 (variety) 모두 매핑
- §2 Scope (6 그룹) ✓ A=T3-T5, B=T6-T8, C=T12-T13, D=T10-T11, E=T9, F=T14-T20
- §3 Architecture (새 파일 + 수정 파일) ✓ T1-T22 에 분산
- §4 결정 사항 5건 ✓ 모두 코드에 baked
- §5 Testing (TDD + E2E + sim regression) ✓ T2/T19 TDD, T21 E2E, T22 sim
- §6 위험 R1-R5 ✓ 코드 위치에 NB 처리

**Placeholder scan:**
- T3 NB scene reference 접근 방법 (scene.setUnlockedRealms call 위치)
- T6 NB onExitToMenu prop 명확 (parent routing 확인)
- T7 NB HeroEntity.restore deserialize 방법 (V3-B 코드 확인)
- T9 NB hero.level field 명 (HeroEntity 확인)
- T17 NB shrine 분기 위치 (EncounterEngine 또는 controller)
- T18 NB damping import 위치
- T19 NB OverworldEvent union season_changed 추가

**Type consistency:**
- `SeasonId` (T1) → `SeasonState` (T19) → store actions (T1) 일관
- `SagaEventType` (T16 추가) → SagaRecorder (T14 narration) → SagaBookModal (T20) 일관
- `RealmId` (V3-DEF) → mapLayout 양쪽 경계 (T4) → Bug A sync (T3) 일관

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-phase-v3-h-depth-polish.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks. 22 task = 25+ subagent dispatch. 8-10h 자율 적합.

**2. Inline Execution** — executing-plans, batch with checkpoints.

Which approach?
