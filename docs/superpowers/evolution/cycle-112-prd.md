---
category: meta
---

# Cycle 112 PRD — Hall of Sagas (Local Leaderboard MVP)

## 한 줄

cycle 종료 시 사가를 *영구 hall* 에 자동 등록 + maxLevel top 5 list MVP. cycle
105 game critic 의 N3 (Hall of Sagas + Local Leaderboard) sub-feature 1/3 의
첫 ship. 단일 디바이스 local only (서버 도입 0, Phase 5 와 별개). cycle 105
critic 약점 §C ("외부 비교 axis 0") 의 *self-referential* 첫 해소.

## 평가 핀포인트

- **게임비평가 (cycle-105-critic §N3 §73-77)**: "각 cycle 종료 시 사가를 영구
  hall 에 보관 + 가장 인상적인 cycle 의 leaderboard (maxLevel / ageEnd / cause)
  top-N. 단일 디바이스 local 만". 본 cycle = sub-feature 1/3 (=storage + MVP
  screen). MEDIUM impact (HIGH 아님) 의 self-referential retention axis.
- **레벨디자이너 (cycle-105-level-critic §N1-N5 cost 표 line 112)**: code line
  ~200, asset 0, catalog 추가 0 — 5 NEW 방향 중 N4 다음으로 낮은 cost. balance
  영향 0 (read-only ledger, hero state mutation 0). sim 산출 metric Δ = 0.
- **게임 기획자 (cycle 111 PRD §룰 9)**: cycle 108 (system) + 109 (system) +
  110 (system) + **111 (UI)** = 직전 4 cycle 패턴. cycle 111 의 UI 가 단일
  cycle → cycle 112 카테고리 자유. **본 PRD 카테고리 = `meta`** (frontmatter
  첫 줄) — N3 직접 회수 + system/UI 외 첫 *meta* 카테고리 도입.
- **advisor (사전 호출)**: 7 핀포인트 — (1) HallEntry 의 `finalizedSagaSnapshot`
  × 100KB cap 모순 → option (a) **flat aliases only + cycleId reference** 채택,
  (2) dedup by id (top 50 ∪ 10 ∪ 25 union 의 중복 제거), (3) Hall.addEntry
  hook 위치 = `SagaStorage.append` 직후 (endCycle line 114), eviction policy
  분리 강조 (Hall = rank-based, SagaStorage = FIFO), (4) baseline 1396 + 1
  pre-existing fail (holy_ruin delta=2) — 본 cycle scope out, (5) F3 자동등록
  채택 → F1 안에 흡수 (별 section 만들지 않음, 3-feature 한도 준수), (6)
  'hall' screen 신규 추가 ('saga-gallery' = V1b placeholder 와 분리), (7)
  HallEntry input invariant = fresh CycleSaga (`finalLevel?` fallback 불필요).

## 카테고리 룰 9 자가검증

- **직전 4 cycle**: cycle 108 = system, 109 = system, 110 = system, 111 = UI.
  cycle 110 PRD §38-48 의 강제 의무가 cycle 111 의 UI pivot 으로 회수됨. cycle
  111 PRD §44 의 인용: "cycle 112 카테고리 자유 (단 UI 가 3 연속 = 109/110/111
  *후속 UI* 패턴 되면 cycle 112 도 룰 9 발동 — 본 PRD 가 UI 첫 cycle 이므로
  cycle 112 는 UI/system/VFX/narrative/meta/운영 모두 가능)".
- **본 cycle 112 카테고리 태그**: `category: meta` (frontmatter 첫 줄 명시
  완료). cycle 111 의 자유 reading 의 직접 회수 + N3 의 첫 ship.
- **cycle 113 카테고리**: meta 가 3 연속 (112/113/114) 도달 시 cycle 115 강제
  pivot. cycle 113/114 = N3 sub-feature 2/3 + 3/3 후보 → meta 3 연속 가능.
  **cycle 115 의 카테고리 자유 종결 = system/UI/VFX/narrative/운영 중 택일**
  의 의무 — 본 PRD §"Multi-cycle §N3 roadmap" 에 명시.

## Multi-cycle §N3 roadmap — cycle 112+113+114

cycle 105 critic 의 §N3 scope = "3-5 cycle". sub-feature 분할:

| Cycle | Sub-feature | Scope | Status |
|---|---|---|---|
| **112** | **Hall storage + ranking + 1-screen MVP (top 5 by maxLevel)** | **smallest** | **본 PRD** |
| 113 | 즐겨찾기 + filter (cause / realm / age tier) | medium | 본 PRD §"backlog" carry-over |
| 114 | saga 비교 view (현재 cycle vs hall top 1) | largest | carry-over |
| (option) 115 | export to clipboard / share image | side | option, carry-over |

cycle 112 의 hall storage (F1) 패턴 → cycle 113 의 favorite flag (`HallEntry.favorited?`)
+ filter UI 의 mirror. cycle 114 의 compare view 는 cycle 112 의 single
`<HallScreen/>` list + selector → side-by-side. **3 cycle 의 mirror pattern
확보** — 각 cycle 의 sub-feature 가 prior cycle 의 동작 mutation 없이 add-only
extend.

**cycle 115 의 강제 pivot 의무 (룰 9)**: meta 3 연속 (112+113+114) 이면 cycle
115 카테고리 = 반드시 meta 외. category 후보 = system / UI / VFX / narrative /
운영. spec 단계에서 카테고리 태그 의무.

## Baseline 측정 (Δ-from-baseline 의 근거)

**Grep evidence — hall / leaderboard / ranking 어휘 점검**:

```bash
grep -rn "hall\|Hall\|leaderboard\|HallEntry\|hallEntry" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx"
```

결과: 0 hit (관련 식별자 없음. "HallOfFame" "HallScreen" 등 모두 신규).
**clean slate** — 본 PRD 가 최초 도입.

```bash
grep -rn "ranking\|leaderboard\|순위\|랭킹" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx"
```

결과: 0 hit. **baseline = ranking visualization 0**.

```bash
grep -n "lastSaga\|SagaStorage.append\|sagaHistory" \
  games/inflation-rpg/src/overworld/cycleSliceV2.ts
```

결과: line 3 (import), line 114 (`SagaStorage.append(saga)`). hook 위치 명확.

```bash
grep -n "version: " games/inflation-rpg/src/store/gameStore.ts
```

결과: line 1478 → `version: 24`. **cycle 112 = v24 → v25 bump 의무** (task
명시).

```bash
grep -n "DeathCause" games/inflation-rpg/src/saga/SagaTypes.ts
```

결과: line 43 — `type DeathCause = '전사' | '자연사' | '영광스러운죽음' | '비극' | '무위'`.
**5 cause** — top-5-per-cause = 25 entries max contribution to cap.

**Baseline = hall visualization 0 + persist v24 + saga.flat-aliases 채워짐
(cycle 6 P1 이후)**.

## 우선순위 (cycle 112)

1. **F1. HallStorage + HallEntry + auto-register on endCycle + persist v24→v25**
   — N3 의 storage axis 의 전부. cycle 종료 시 자동 hook (player decision 0).
   capacity policy (top 50 maxLevel + top 10 oldest age + top 5 per cause)
   dedup-by-id 보장. **F3 (자동등록, button 없음) 의 흡수** — advisor §5
   직접 수용.
2. **F2. `<HallScreen/>` MVP — top 5 by maxLevel list + 빈 placeholder** — N3
   의 UI axis 첫 ship. filter / 즐겨찾기 / compare 는 cycle 113/114 carry-over.
3. **F3. MainMenu 의 '전당' button 추가 + 'hall' screen routing** — App.tsx
   라우팅 1 줄 + MainMenu 버튼 1 개 (saga-gallery V1b placeholder 와 분리).
   **F3 는 wiring 만 — 자동등록 ≠ surface button. surface = MainMenu entry
   point button 뜻**.

3 features 한도. 우선순위 F1 > F2 > F3 (F3 가 가장 risk 낮음, F1 + F2 가 진짜
작업).

## 기능 요구사항

### F1. HallStorage + HallEntry + auto-register on endCycle + persist v24→v25

- **목적**: cycle 종료 시 사가의 flat metadata 만 영구 hall 에 자동 등록. 영구
  rank-based eviction (FIFO 아님). saga 본문 (chapters / events) 은 hall 에
  저장 0 — `cycleId` reference 만 (advisor §1 option (a) 채택).

- **타입 정의 (신 file `src/data/hallTypes.ts`)**:

  ```ts
  import type { DeathCause } from '../saga/SagaTypes';

  /** Hall of Sagas 의 영구 등록 entry — flat metadata only.
   *  saga 본문 (chapters / events) 은 sagaHistory[100] 에 별 저장됨.
   *  v25 migration 시 빈 hall 로 초기화. */
  export interface HallEntry {
    readonly id: string;              // unique. saga.cycleId 와 동일 (1:1 mapping)
    readonly cycleId: string;         // saga.cycleId 의 reference (UI 가 sagaHistory 에서 본문 lookup 가능)
    readonly heroName: string;        // saga.hero.name snapshot
    readonly maxLevel: number;        // saga.finalLevel (or hero.finalLevel fallback)
    readonly ageEnd: number;          // saga.finalAge (or hero.finalAge fallback)
    readonly cause: DeathCause;       // saga.deathCause (or hero.cause fallback)
    readonly realm: string;           // saga.finalRealm (or '' fallback)
    readonly finishedAt: number;      // saga.finishedAt (or saga.endedAtMs fallback)
  }

  export interface HallState {
    readonly entries: readonly HallEntry[];
  }

  /** v25 migration 의 default. */
  export const EMPTY_HALL: HallState = { entries: [] };

  /** Hall capacity policy — dedup by id, top-N per axis, union ≤ 85.
   *  - top 50 by maxLevel desc
   *  - top 10 by ageEnd desc
   *  - top 5 per cause × 5 causes = 25
   *  Union of 3 sets, deduped by id. */
  export const HALL_TOP_MAX_LEVEL = 50;
  export const HALL_TOP_AGE_END = 10;
  export const HALL_TOP_PER_CAUSE = 5;
  /** Worst case union size = 50 + 10 + 25 = 85 entries when 0 overlap.
   *  Typical overlap (high maxLevel ↔ high age ↔ natural death) reduces this
   *  to 40-60 entries. PR test asserts entries.length ≤ 85 invariant. */
  export const HALL_CAPACITY_HARD_LIMIT = 85;
  ```

- **HallStorage (신 file `src/saga/HallStorage.ts`) — static API mirror of SagaStorage**:

  ```ts
  import { useGameStore } from '../store/gameStore';
  import {
    EMPTY_HALL, HALL_TOP_MAX_LEVEL, HALL_TOP_AGE_END, HALL_TOP_PER_CAUSE,
    HALL_CAPACITY_HARD_LIMIT,
  } from '../data/hallTypes';
  import type { HallEntry } from '../data/hallTypes';
  import type { CycleSaga, DeathCause } from './SagaTypes';

  const ALL_CAUSES: readonly DeathCause[] = [
    '전사', '자연사', '영광스러운죽음', '비극', '무위',
  ] as const;

  export class HallStorage {
    /** Fresh CycleSaga (post-finalize) 받아 HallEntry 생성 + rank-based update.
     *  Hook 위치 = cycleSliceV2.endCycle 의 SagaStorage.append(saga) 직후 (line 115). */
    static register(saga: CycleSaga): void {
      const meta = useGameStore.getState().meta;
      const current = meta.hall?.entries ?? [];
      const entry = toHallEntry(saga);
      // Dedup: 동일 id 가 이미 있으면 skip (cycleId 는 unique).
      if (current.some(e => e.id === entry.id)) return;
      const next = [...current, entry];
      const compacted = compactByRanking(next);
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, hall: { entries: compacted } },
      }));
    }

    static getAll(): readonly HallEntry[] {
      return useGameStore.getState().meta.hall?.entries ?? [];
    }

    static getTopByMaxLevel(n: number = 5): readonly HallEntry[] {
      const all = HallStorage.getAll();
      return [...all].sort((a, b) => b.maxLevel - a.maxLevel).slice(0, n);
    }
  }

  /** Fresh CycleSaga → HallEntry. invariant: saga 는 fresh (cycle 6 P1 이후
   *  flat aliases 보장). v23 이하 stale saga 가 hall.register 호출되는 path 0
   *  (hall 은 v25 이후 첫 cycle 부터 register). 따라서 fallback 은 *방어용* 만. */
  export function toHallEntry(saga: CycleSaga): HallEntry {
    return {
      id: saga.cycleId,
      cycleId: saga.cycleId,
      heroName: saga.hero.name,
      maxLevel: saga.finalLevel ?? saga.hero.finalLevel ?? 1,
      ageEnd: saga.finalAge ?? saga.hero.finalAge ?? 0,
      cause: saga.deathCause ?? saga.hero.cause ?? '자연사',
      realm: saga.finalRealm ?? '',
      finishedAt: saga.finishedAt ?? saga.endedAtMs ?? Date.now(),
    };
  }

  /** Rank-based compaction:
   *  - keep top 50 by maxLevel desc
   *  - keep top 10 by ageEnd desc
   *  - keep top 5 per cause (5 causes)
   *  - union by id (dedup)
   *  - asserts result.length ≤ HALL_CAPACITY_HARD_LIMIT */
  export function compactByRanking(entries: readonly HallEntry[]): readonly HallEntry[] {
    const byMaxLevel = [...entries].sort((a, b) => b.maxLevel - a.maxLevel).slice(0, HALL_TOP_MAX_LEVEL);
    const byAgeEnd = [...entries].sort((a, b) => b.ageEnd - a.ageEnd).slice(0, HALL_TOP_AGE_END);
    const perCause: HallEntry[] = [];
    for (const cause of ALL_CAUSES) {
      const ofCause = entries.filter(e => e.cause === cause);
      ofCause.sort((a, b) => b.maxLevel - a.maxLevel);
      perCause.push(...ofCause.slice(0, HALL_TOP_PER_CAUSE));
    }
    // Union by id (dedup).
    const keepIds = new Set<string>();
    for (const e of byMaxLevel) keepIds.add(e.id);
    for (const e of byAgeEnd) keepIds.add(e.id);
    for (const e of perCause) keepIds.add(e.id);
    const result = entries.filter(e => keepIds.has(e.id));
    // Defensive: invariant assertion. 85 hard limit fail safe.
    if (result.length > HALL_CAPACITY_HARD_LIMIT) {
      // 절대 도달하면 안 되는 path. 안전 cap = maxLevel top-N + ageEnd top-M.
      return [...result].sort((a, b) => b.maxLevel - a.maxLevel).slice(0, HALL_CAPACITY_HARD_LIMIT);
    }
    return result;
  }
  ```

- **MetaState 확장 (수정 `src/types.ts:225-306`)**:

  ```ts
  // Cycle 112 — Hall of Sagas (N3 sub-feature 1/3)
  /** 영구 hall (rank-based). sagaHistory[100] 와 분리 — Hall 은 rank-based
   *  eviction (FIFO 아님). cycle 종료 시 자동 등록. v25 migration default = EMPTY_HALL. */
  hall: HallState;
  ```

  optional 아닌 required field 로 도입. v24 → v25 migration 이 default 보장.

- **endCycle hook 수정 (수정 `src/overworld/cycleSliceV2.ts:106-131`)**:

  ```ts
  endCycle(cause?: DeathCause) {
    const ctrl = get().controller;
    if (!ctrl) return;
    if (cause) ctrl.setEndCause(cause);
    const saga = ctrl.finalize();
    SagaStorage.append(saga);
    HallStorage.register(saga);  // <-- 신규 1 줄. line 115.
    // ... 기존 로직 (gold, applyEndCycleMeta) 그대로 ...
    set({ status: 'ended', lastSaga: saga, lastGoldEarned: gold });
  },
  ```

  **eviction policy 분리 강조** (advisor §3):
  - `SagaStorage.append` = FIFO (SAGA_CAP=100, 오래된 거 evict).
  - `HallStorage.register` = rank-based (오래되도 top rank 면 유지). 본 cycle
    의 핵심 의미적 분리. PR review 시 implementer 가 패턴 복붙 함정에 안 빠지게
    한 줄 comment 추가 의무.

- **persist v24 → v25 migration (수정 `src/store/gameStore.ts:670 직후`)**:

  ```ts
  // v24 → v25: Cycle 112 — Hall of Sagas (N3 sub-feature 1/3)
  if (fromVersion <= 24 && s.meta) {
    s.meta.hall = s.meta.hall ?? { ...EMPTY_HALL };
  }
  ```

  그리고 `version: 24` → `version: 25` 변경 (line 1478).

- **INITIAL_META 갱신 (수정 `src/store/gameStore.ts` 의 INITIAL_META 정의)**:

  ```ts
  hall: { entries: [] },
  ```

  fresh install 의 INITIAL_META 도 빈 hall 명시.

- **수용 기준 (Δ-from-baseline)**:
  - C1. `toHallEntry(freshSaga)` 의 7 field 모두 saga 의 flat alias 값. fixture
    saga = `{ cycleId: 'c1', hero: { name: '용', cause: '자연사', ... },
    finalLevel: 100, finalAge: 70, finalRealm: 'volcano', deathCause: '자연사',
    finishedAt: 1234 }` → HallEntry = `{ id: 'c1', cycleId: 'c1', heroName:
    '용', maxLevel: 100, ageEnd: 70, cause: '자연사', realm: 'volcano',
    finishedAt: 1234 }`.
  - C2. `HallStorage.register(saga)` × 1 → `meta.hall.entries.length === 1`.
    동일 saga 재호출 (cycleId 동일) → length 변동 없음 (dedup-by-id).
  - C3. `compactByRanking(100 entries)` (모두 다른 cycleId + 다른 maxLevel) →
    length ≤ HALL_CAPACITY_HARD_LIMIT (85). top 50 maxLevel + top 10 ageEnd +
    top 5/cause 의 union 검증.
  - C4. `HallStorage.getTopByMaxLevel(5)` → sorted desc by maxLevel, length ≤ 5.
  - C5. `runStoreMigration(v24Envelope, 24)` → migrated.meta.hall === EMPTY_HALL.
  - C6. v25 round-trip: register 1 → persist serialize → deserialize → entries
    유지 (zustand persist 의 partialize 가 meta 를 통째로 persist 함).
  - C7. eviction policy: 200 random entries register (mix of maxLevel 1-10M,
    ageEnd 0-100, 5 cause 분포) → 최종 entries.length ≤ 85, 각 카테고리 top-N
    정합 검증.

- **반대 기준 (NOT this)**:
  - **finalizedSagaSnapshot field 도입 금지** (advisor §1). HallEntry 는 flat
    metadata only. saga 본문은 sagaHistory[100] FIFO 에서 별 retain.
  - **서버 의존 0** (task §"반대 기준"). fetch / network 호출 0. localStorage
    (zustand persist) 만.
  - **PvP / 외부 비교 0** — 본 cycle 의 leaderboard 는 *self-referential* (같은
    디바이스 의 자기 cycle 간 ranking). 다른 플레이어 비교 = 0. cycle 113+
    backlog 도 *local only* — N3 scope 전체.
  - **즐겨찾기 / filter / 비교 view 금지** (본 cycle scope out — cycle 113/114
    carry-over).
  - **저장 데이터 크기 ≤ 100KB** (task §"반대 기준"). HallEntry shape ~150B
    × 85 = ~12.75KB ≪ 100KB. 충족.
  - **`@forge/core` 변경 0** — Hall 은 inflation-rpg 내부 feature. core 승격
    금지 (3 의 규칙).
  - **외부 chart / library 0** — 본 cycle 의 list = inline HTML/CSS.

### F2. `<HallScreen/>` MVP — top 5 by maxLevel + 빈 placeholder

- **목적**: F1 의 저장 데이터 의 첫 시각 surface. top 5 by maxLevel list +
  rank/heroName/maxLevel/ageEnd/cause/finishedAt 표시.

- **신 file `src/screens/HallScreen.tsx`**:

  ```tsx
  import React from 'react';
  import { useGameStore } from '../store/gameStore';
  import type { HallEntry } from '../data/hallTypes';

  export function HallScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const entries = useGameStore(s => s.meta.hall?.entries ?? []);
    const top5 = [...entries].sort((a, b) => b.maxLevel - a.maxLevel).slice(0, 5);

    return (
      <div data-testid="hall-screen" style={{ padding: 24, color: '#eee', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 16 }}>용사 전당 (Hall of Sagas)</h2>
        <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
          maxLevel 상위 5 사가 (영구 저장)
        </p>

        {top5.length === 0 ? (
          <div data-testid="hall-empty" style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>
            아직 기록이 없다. 첫 사이클을 완주하면 여기에 영구 등록된다.
          </div>
        ) : (
          <ol data-testid="hall-list" style={{ paddingLeft: 24, fontSize: 14, lineHeight: 1.9 }}>
            {top5.map((e, i) => <HallRow key={e.id} rank={i + 1} entry={e} />)}
          </ol>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            type="button"
            data-testid="btn-hall-back"
            onClick={() => setScreen('main-menu')}
            style={{
              padding: '10px 24px',
              background: '#fbbf24',
              color: '#0f172a',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            메인 메뉴로
          </button>
        </div>
      </div>
    );
  }

  function HallRow({ rank, entry }: { rank: number; entry: HallEntry }) {
    return (
      <li data-testid={`hall-row-${rank}`} style={{ marginBottom: 8 }}>
        <span style={{ color: '#fbbf24', fontWeight: 'bold', marginRight: 8 }}>#{rank}</span>
        <span data-testid={`hall-row-${rank}-hero`}>{entry.heroName}</span>
        <span style={{ opacity: 0.7, marginLeft: 8, fontSize: 12 }}>
          lv {entry.maxLevel} · {entry.ageEnd}세 · {entry.cause}
          {entry.realm && ` · ${entry.realm}`}
        </span>
      </li>
    );
  }
  ```

- **수용 기준**:
  - C8. empty state: `meta.hall.entries === []` → `data-testid="hall-empty"`
    visible, `data-testid="hall-list"` absent.
  - C9. populated (1 entry): list visible, row `#1` heroName/maxLevel/cause
    표시. `data-testid="hall-empty"` absent.
  - C10. top-5 order: 5 entries with maxLevel 100/50/200/30/150 → rendered
    order = 200/150/100/50/30 (desc). 6th entry (lv 10) 추가 → still 5 rows
    (10 excluded).
  - C11. back button: click → `setScreen('main-menu')` 호출. zustand mock.

- **반대 기준**:
  - **filter / sort selector / 즐겨찾기 toggle 0** — cycle 113/114 backlog.
  - **chart / graph 0** — list 만. cycle 111 chart 의 재사용 backlog (cycle
    113+).
  - **animation / transition 0** — static. 인터랙티브 element = back button 만.
  - **inline style 사용 OK** — 본 cycle 의 새 component 가 단 1 개라 css module
    분리 cost > benefit. cycle 113+ extract 가능.

### F3. MainMenu '전당' button + 'hall' screen routing

- **목적**: F1 + F2 의 entry point. MainMenu 의 V1b placeholder (`saga-gallery`)
  와 분리된 신규 'hall' screen.

- **수정 `src/types.ts:383-389`**:

  ```ts
  export type Screen =
    | 'main-menu'
    | 'cycle-prep-v2'
    | 'overworld'
    | 'cycle-result-v2'
    | 'settings'
    | 'saga-gallery'
    | 'hall';  // <-- 신규
  ```

- **수정 `src/App.tsx:34-41`**:

  ```tsx
  {screen === 'cycle-result-v2' && (
    <CycleResultV2 onBackToMenu={() => setScreen('main-menu')} />
  )}
  {screen === 'hall' && <HallScreen />}  // <-- 신규 1 줄
  {(screen === 'saga-gallery' || screen === 'settings') && (
    <div style={{ padding: 24, color: '#eee' }}>
      <p>이 화면은 V1b 에서 구현됩니다.</p>
      ...
  ```

- **수정 `src/screens/MainMenu.tsx:42-50` (saga-gallery 버튼 *위* 에 새 button 추가)**:

  ```tsx
  <button
    type="button"
    data-testid="btn-hall"
    onClick={() => setScreen('hall')}
    style={menuBtnStyle}
  >
    용사 전당
  </button>
  ```

  saga-gallery / settings V1b placeholder button 은 그대로 둠 (cycle 113+
  remove 가능).

- **수용 기준**:
  - C12. MainMenu render → `data-testid="btn-hall"` visible + clickable.
  - C13. btn-hall click → `setScreen('hall')` 호출. assert via zustand mock.
  - C14. App.tsx 라우팅: `useGameStore.setState({ screen: 'hall' })` →
    `<HallScreen/>` render. integration test.

- **반대 기준**:
  - **'saga-gallery' V1b placeholder 의 contents 활성화 금지** — 본 cycle scope
    의 'hall' 과 별 screen. cycle 113+ 의 saga-gallery vs hall 의 의미 분리는
    별 spec (saga-gallery = 100 FIFO browser, hall = rank-based permanent).
  - **MainMenu layout 재설계 금지** — 기존 4 button (resume / start / saga-gallery /
    settings) 위에 1 row 만 추가. 기존 styling / order 유지.

## Baseline 측정 (재확인)

**Persist version**: `gameStore.ts:1478 → version: 24`. **본 cycle = persist
v24 → v25 bump 의무** (task §"반대 기준" 명시). migration mapper 추가 + INITIAL_META
의 hall field 신규 + MetaState 의 hall field 신규.

**vitest baseline**: 1396 passing + 1 pre-existing fail (advisor §4 — holy_ruin
delta=2 unrelated). 본 cycle = **1396 + 10+ 추가 passing, pre-existing 1 fail
별도 issue (본 cycle scope out)**.

**SagaStorage SAGA_CAP=100 vs HallStorage rank-based** (의미 분리):
- `SagaStorage.append` = FIFO `slice(-100)`. 오래된 saga 본문 evict.
- `HallStorage.register` = rank-based union top-50 + top-10 + top-5/cause.
  오래된 entry 도 top rank 면 유지. **persist 의 두 별개 axis** — sagaHistory
  100 cap 의 본문 = recent 100. hall 의 metadata = 영구 ~80.

## Sim-real parity 검증 (cycle 12 false PASS 룰)

**1. Sim driver mirror 검증 (의무)**:
- F1 의 hook 위치 = `cycleSliceV2.endCycle` 의 `SagaStorage.append(saga)` 직후.
  Sim driver (`scripts/sim-cycle-v2.ts`) 가 동일 path 를 호출하면 자동 propagate.
  단 sim driver 는 cycleSliceV2.endCycle 의 사이드 이펙트를 직접 invoke 안 할
  수도 있음 (직접 controller.finalize 후 SagaStorage 만 호출 가능).
- **구현 단계 grep 의무**: `grep -n "endCycle\|SagaStorage.append" games/inflation-rpg/scripts/sim-cycle-v2.ts`
  → sim driver 의 saga append path 확인. 만약 sim driver 가 SagaStorage.append
  직접 호출 → HallStorage.register 도 mirror 호출 추가 (1 줄). 아니면 (sim 이
  useCycleStoreV2.endCycle 호출) 자동 propagate.

**2. Playwright dev server smoke (의무)**:
- short cycle (death by age 11) → CycleResult → MainMenu → '용사 전당' click →
  HallScreen → top 5 list 에 방금 cycle 포함. 1-2 분 dev server smoke.

**3. 산술 충돌 사전 검증 (cycle 11 룰)**:
- C1-C14 모두 read-only (hero state mutation 0). balance 영향 0. maxLevel /
  arrival count 등 sim 산출 metric Δ = 0. **balance / sim 회귀 0**.
- HallStorage.register overhead — set 1 회 + filter + sort = O(N log N) where
  N ≤ 85. 1 cycle 종료 시 1 회 호출 = negligible (μs 단위).

## 사용자 가치 측정

**Baseline (cycle 111 ship 후)**:
- 영구 ranking visualization count = 0 (hall 부재).
- Self-referential cycle 간 비교 axis = sagaHistory FIFO browser (V1b deferred).

**Cycle 112 ship 후**:
- 영구 ranking visualization count = 1 (HallScreen top 5).
- Δ-from-baseline: **+1 ranking screen** + **+1 영구 metadata store** (~12KB
  cap, 100KB hard limit 의 12% 사용).
- 부가 가치 = cycle 105 critic 약점 §C ("외부 비교 axis 0") 의 *self-referential*
  첫 해소. **다른 플레이어 비교 = 여전히 0** (N3 scope = local only). 단
  "어제의 내 cycle vs 오늘의 내 cycle" 의 self-comparison axis 활성.

## 우선순위 외 backlog

- **cycle 113 carry-over: 즐겨찾기 (`HallEntry.favorited?: boolean`) + filter
  UI (cause / realm / age tier)** — 본 cycle scope out. cycle 113 sub-feature
  2/3.
- **cycle 114 carry-over: saga 비교 view (현재 cycle vs hall top 1)** —
  side-by-side panel. CycleResultV2 의 chart 재사용 가능. cycle 114 sub-feature
  3/3.
- **cycle 115 option: export to clipboard / share image** — N3 side scope.
  cycle 115 의 카테고리 강제 pivot (meta 외) 의 *불가* — cycle 116+ defer.
- **cycle 111 carry-over: multi-line overlay (sim vs real chart)** — 본 cycle
  unrelated. cycle 113+ UI 카테고리에서 가능.
- **MainMenu V1b placeholder cleanup** — saga-gallery / settings disabled
  button 의 활성화 또는 제거. 본 cycle 의 hall 추가가 V1b placeholder 와 *별
  screen* 도입이라 sustain. cycle 116+ refactor 후보.
- **sagaHistory 의 cycleId 가 cycleSaga.cycleId 와 일치 보장** — 현재 invariant
  이지만 PR 추가 test (1 줄) 없음. cycle 113+ 의 lookup (`hall.entry → saga 본문`)
  활성 시 의무화.

## 비고

**리스크 메모**:

- **R1. persist v24 → v25 bump 의무** (task §"반대 기준" 명시): 본 cycle 의
  *유일한* persist schema 변경. migration mapper line 670 직후 추가 + version
  field 1478 의 25 변경. fresh install 의 INITIAL_META 도 hall field 신규.
- **R2. saga finalize hook 의 단일 site 보장** — `cycleSliceV2.endCycle` line
  114 의 SagaStorage.append 직후가 *유일한* HallStorage.register call site.
  CycleControllerV2 의 다른 finalize path (e.g. `finalize()` 직접 호출) 가 있다면
  grep `controller.finalize` 로 enumerate 의무. 현재 grep 결과 = endCycle 1
  site 만. sim driver 는 별 path 가능 → §"Sim-real parity §1" 의 grep 의무.
- **R3. dedup-by-id invariant** (advisor §2): `cycleId` 가 unique 라는 invariant
  의존. 만약 동일 cycleId 의 saga 가 2 번 register 되면 (controller restart 등)
  HallStorage.register 가 skip. test C2 가 보장.
- **R4. Eviction policy 의 의미 분리** (advisor §3): SagaStorage = FIFO,
  HallStorage = rank-based. PR review 시 implementer 의 패턴 복붙 함정 방지
  comment 1 줄. 본 PRD §F1 endCycle hook 코드 블록의 주석으로 명시.
- **R5. 저장 데이터 크기 ≤ 100KB** (task §"반대 기준"): HallEntry shape ~150B
  (8 field × ~20B avg) × 85 max = ~12.75KB. JSON serialize overhead 1.5x =
  ~19KB. ≪ 100KB. 충족. 단 hall 의 cap 이 cycle 113+ 의 favorite/filter 등
  추가 metadata 로 늘면 재검토.
- **R6. v25 backward compat** — v24 envelope 가 hall field 없는 상태로 미그레이션.
  test C5 + C6 가 보장. fresh install 도 INITIAL_META 의 hall field 가 보장.
- **R7. Hall.register 가 호출 안 되는 path risk** — controller.finalize 후
  SagaStorage.append 만 호출되고 HallStorage.register 누락 시 hall = 영구 empty.
  본 cycle 의 *유일한* hook site 가 endCycle line 115 라 grep 으로 단일 sit
  보장. 그리고 sim driver mirror 점검 의무 (§Sim-real parity §1).

**의존성**:

- 신 file: `src/data/hallTypes.ts` (~40 LOC).
- 신 file: `src/saga/HallStorage.ts` (~80 LOC).
- 신 file: `src/screens/HallScreen.tsx` (~70 LOC).
- 수정: `src/types.ts` — Screen union '+ hall' (line 388) + MetaState `hall:
  HallState` field 신규 + import HallState.
- 수정: `src/store/gameStore.ts` — `INITIAL_META.hall = EMPTY_HALL` + migration
  v24→v25 mapper + `version: 24` → `25`.
- 수정: `src/overworld/cycleSliceV2.ts` — `HallStorage.register(saga)` 1 줄 +
  import.
- 수정: `src/App.tsx` — `{screen === 'hall' && <HallScreen />}` 1 줄 + import.
- 수정: `src/screens/MainMenu.tsx` — btn-hall button 추가.

**신 test file** (~10+ tests):
- `src/saga/__tests__/HallStorage.test.ts` (~6 tests for C1-C4, C7).
- `src/store/__tests__/hall-migration.test.ts` 또는 기존 `gameStore.test.ts`
  추가 (C5-C6, ~2 tests).
- `src/screens/__tests__/HallScreen.test.tsx` (~4 tests for C8-C11).
- `src/screens/__tests__/MainMenu.test.tsx` 추가 (C12-C13, ~1-2 tests).
- App.tsx integration test 옵션 (C14).

**8 페르소나 룰 자가검증**:
- **게임비평가**: cycle-105-critic §N3 §73-77 직접 수용. self-referential
  retention axis 활성. *외부 비교 axis 0* (cycle 105 critic §C) 의 *부분*
  해소 (다른 플레이어 비교는 여전히 0, 본 cycle scope out).
- **레벨디자이너**: §N1-N5 cost 표 line 112 의 ~200 LOC + asset 0 + catalog 0.
  balance 영향 0 (sim 산출 metric Δ = 0).
- **웹리서처**: zustand persist + localStorage 만 사용. 외부 dependency 추가
  0. 표준 web platform.
- **게임 기획자**: 카테고리 룰 9 정합 (`category: meta` = system/UI 외 첫
  meta) + cycle 111 PRD §44 의 cycle 112 자유 reading 직접 회수.
- **implementer**: §F1-F3 의 8 file 변경 명시 + HallStorage 정확 산식 +
  endCycle hook line 115 명시 + migration mapper 위치 명시 = 헷갈릴 여지 0.
- **테스트 작성자**: C1-C14 = 14 acceptance. F1 ~6 test, F2 ~4 test, F3 ~3 test
  = **10+ 추가** (task 명시).
- **sim driver 작성자**: §Sim-real parity §1 = sim driver mirror 점검 의무.
  grep `endCycle\|SagaStorage.append` in `scripts/sim-cycle-v2.ts`. 만약 sim
  driver 가 SagaStorage 직접 호출 → HallStorage.register 도 mirror 1 줄 추가.
- **balance 진단자**: hero state mutation 0, sim 산출 0 영향. balance 회귀 0.
- **persist 진단자**: R1 v25 bump + R6 backward compat + INITIAL_META + migration
  test 명시. test C5 + C6 가 보장.
- **advisor**: §advisor (사전 호출) 7 핀포인트 모두 PRD 명시 + mitigation 명시.

**3 의 규칙 평가**:
- hall / leaderboard / ranking 어휘 = **0 회 시도** (baseline grep 확정). spec
  정식화 시점 = 본 cycle 의 첫 ship. cycle 113/114 의 sub-feature 가 누적 3 회
  도달 시 cycle 115+ 의 generic extract 후보 (예: `<RankedListView/>` 공용
  component). 단 cycle 112 의 첫 ship 만으로는 generic 추출 시점 아님.

**룰 9 자가검증 (재확인)**:
- cycle 108 + 109 + 110 = 3 cycle 연속 system. cycle 111 = UI (강제 pivot 회수).
- 본 cycle 112 = meta. **카테고리 chain = system / system / system / UI /
  meta**. 직전 4 cycle 다양성 충분 (system 3 → UI 1 → meta 1). cycle 113/114
  도 meta 가능 → meta 3 연속 (112+113+114) 시 cycle 115 강제 pivot.

**완료 정의 (DoD)**:

- C1-C14 모든 acceptance 통과.
- vitest count baseline 1396 + 10+ 추가 (회귀 0; pre-existing 1 fail 별도
  issue 본 cycle scope out).
- typecheck PASS.
- lint PASS (eslint boundaries 위반 0).
- circular 1 (baseline).
- grep 검증: package.json 의 외부 chart library import 0 (cycle 111 R2 유지).
- migration: v24 envelope → migrate → meta.hall.entries === [] (C5).
- persist v24 → v25 bump 완료 + INITIAL_META.hall 추가.
- carry-over: 즐겨찾기 / filter (cycle 113) / 비교 view (cycle 114) / export
  (cycle 115 option) 모두 cycle 113+ backlog.
- 시간 부족 시: F3 의 라우팅 wiring 만 ship + button data-testid + screen
  routing 의 minimal 1-줄 변경 우선. F2 의 styling polish (HallRow 의 visual
  hierarchy / 색상 등) 는 cycle 113+ defer 허용. **F1 (storage + migration)
  은 절대 skip 금지** — 본 cycle 의 핵심.
