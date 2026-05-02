# Phase B-3β2 — Legacy flow removal + final-clear cleanup

- 태그 목표: `phase-b3b2-complete`
- 선행: `phase-b3b1-complete` (merge `d4d031c`) + `chore/test-speedup` (`1cde967`)
- 후속: 별개 phase **B-fix-phaser-build** (이 spec 범위 밖)
- 범위: `inflation-rpg` 단일 워크스페이스

## 1. 한 줄 요약

신 dungeon flow (`town` → `dungeon-floors` → battle → 보스 floor → final modal) 가
정상 동작하는 지금, 구 flow 의 데드 코드 (`world-map` / `region-map` / `dungeon`
area-stage 화면, region-기반 quest tracking, `currentAreaId` run state) 를 일괄
제거한다. 동시에 final boss 처치 시 `selectDungeon(null)` 을 호출해 run
시맨틱을 깔끔히 닫는다. Quest UI 는 본격 재설계 (Phase F) 까지 placeholder.

## 2. 동기

`docs/superpowers/specs/2026-05-01-content-300h-design.md` §B-3 의 분해 절반.
B-3β1 가 보스 floor + meta 진행도 + final 모달을 추가했고, β2 는 그 후속의
**한 가지 책무** 만 진다 — **구 flow 의 코드 잔재 삭제**.

분해 의도: legacy 제거가 보스 추가와 한 PR 에 묶이면 review 가 비대해짐.
B-3β1 머지로 신 flow 가 검증된 지금이 안전 시점.

## 3. 비목표 (이 phase 가 하지 않는 것)

- **Quest 시스템 재설계** — Phase F 에서 직업 트리와 함께. 본 phase 는 placeholder 라벨만.
- **`next build` 실패 수정** — phase-b3a 시점부터 깨진 Phaser ESM default-export
  이슈. typecheck/lint/test/circular/e2e 모두 통과해도 `next build` 만 실패.
  완전히 직교한 문제이므로 별도 phase **B-fix-phaser-build** 에서 처리. 이
  phase 의 검증 게이트에서 `build` 는 제외.
- **Migrate 함수 unit test 추출** — `gameStore.test.ts` 의 v4→v5/v5→v6 검증은
  현 stub 패턴 유지. helper 추출은 후속 cleanup 후보.
- **`pickMonster` 의 region 인자 외 다른 시그니처 단순화** — 본 phase 는
  region 인자 한 가지만 정리.
- **인라인 hex 색상 → forge token 마이그** — 직교한 cleanup.

## 4. 작업 범위

### 4.1 제거되는 코드 표면

**파일 삭제:**

- `games/inflation-rpg/src/screens/WorldMap.tsx`
- `games/inflation-rpg/src/screens/WorldMap.test.tsx`
- `games/inflation-rpg/src/screens/RegionMap.tsx`
- `games/inflation-rpg/src/screens/RegionMap.test.tsx`
- `games/inflation-rpg/src/screens/Dungeon.tsx`
- `games/inflation-rpg/src/screens/Dungeon.test.tsx`
- `games/inflation-rpg/src/data/regions.ts`
- `games/inflation-rpg/src/data/maps.ts`
- `games/inflation-rpg/src/data/maps.test.ts` (있다면)
- `games/inflation-rpg/tests/full-run.spec.ts` (이미 skip 처리된 상태로 머지된 e2e)

**타입 변경 (`src/types.ts`):**

- `RunState.currentAreaId: string` 필드 제거
- `Screen` 유니온에서 `'world-map'`, `'dungeon'` 제거
  (남는 멤버: `'main-menu' | 'town' | 'dungeon-floors' | 'class-select' | 'battle' | 'stat-alloc' | 'inventory' | 'shop' | 'game-over' | 'quests'`)
  - 주: `'stat-alloc'` 은 현재 routing 에 없지만 union 멤버로 남아있음. 본 phase 는 건드리지 않음.

**Store (`src/store/gameStore.ts`):**

- `INITIAL_RUN` 에서 `currentAreaId: 'village-entrance'` 제거
- `setCurrentArea` 액션 + 인터페이스 멤버 제거
- `startRun` 의 `screen: s.run.currentDungeonId !== null ? 'dungeon-floors' : 'world-map'` 분기를
  단일 `screen: 'dungeon-floors'` 로 (currentDungeonId === null 시는 invariant 위반 — 호출 사이트에서 보장)
- `trackKill` 시그니처: `(monsterId: string, regionId: string)` → `(monsterId: string)`.
  본문은 `q.target.monsterId === monsterId` 매칭만 유지. region-wide kill_count quest
  (`q.target.monsterId === undefined && q.regionId === regionId`) 분기는 제거.
  결과: region-wide quest 는 진행 불가 — Quest UI placeholder 와 정합 (Phase F 에서 재설계).
- Persist `version: 5` → `6`. `migrate` 함수 case 추가: state.run.currentAreaId 제거.

**BattleScene (`src/battle/BattleScene.ts`):**

- `create()` 의 `const area = run.currentAreaId` 제거.
- `getBossesForArea(area, run.isHardMode)` 호출 + 구 flow 25% 보스 분기 (라인 ~93-99) 제거.
- `pickMonsterFromPool` (신 flow) vs `pickMonster(run.level, currentArea?.regionId)` (구 flow) 의 else 분기 (라인 ~133-142) 제거.
  결과: dungeon flow 만 남음. `run.currentDungeonId !== null` 가정.
- `doRound()` 의 trackKill 호출에서 `MAP_AREAS.find` + `currentArea.regionId` 룩업 제거.
  `storeState.trackKill(this.currentMonsterId)` 한 인자만.
- `setScreen('world-map')` (라인 ~360, 던전 끝/run 종료 분기) → `setScreen('town')`.
- final 보스 처치 분기 (이미 `markFinalCleared` + `markDungeonProgress(30)` + `setPendingFinalCleared` 호출 중)
  뒤에 `selectDungeon(null)` 추가.

**Screen 컴포넌트 back 버튼:**

- `src/screens/Battle.tsx`: `setScreen('world-map')` → `setScreen('town')`
- `src/screens/Inventory.tsx`: `backScreen = run.characterId ? 'world-map' : 'main-menu'` →
  `backScreen = run.characterId ? 'town' : 'main-menu'`
- `src/screens/Shop.tsx`: 동일 패턴
- `src/screens/Quests.tsx`: `setScreen('world-map')` → `setScreen('town')`

**Quest UI (`src/screens/Quests.tsx`):**

- 현 카드 매핑 시작점에서 `useGameStore((s) => s.run.currentDungeonId)` 구독 추가.
- `currentDungeonId !== null` 일 때:
  - 각 카드를 dim 색 + "재설계 예정 — Phase F" 부제 라벨.
  - "보상 수령" 버튼 숨김 (claimable 무시).
  - 진행도 표시는 유지 (이미 누적된 progress 가 안 보이면 사용자 혼란).
- `currentDungeonId === null` 시 (즉 town 진입 전 main-menu 등 — 실제 라우팅 상 도달 거의 안 됨)
  은 현 동작 유지.

**Sound (`src/systems/sound.ts`):**

- `'world-map': 'field'` 키 제거 (Screen union 에서 제거되었으므로 typecheck 가 자동 강제)
- `'dungeon': 'field'` 키도 제거 (동일 이유)

**테스트 갱신:**

- `src/store/gameStore.test.ts`:
  - 라인 15, 21: "startRun: navigates to world-map" → "startRun: navigates to dungeon-floors when currentDungeonId is set"
  - 라인 333-336 의 "legacy flow" 테스트 삭제 (가능 경로가 아님)
  - `currentAreaId` 어서션 모두 제거
  - persist v5→v6 마이그 stub 추가 (B-3β1 패턴 따름)
- `src/screens/ClassSelect.test.tsx` (라인 39): `expect(state.screen).toBe('world-map')` →
  `'dungeon-floors'` (테스트 setup 에서 `currentDungeonId` 를 미리 셋해 invariant 만족)
- `src/screens/Inventory.test.tsx` (라인 45): `['main-menu', 'world-map']` → `['main-menu', 'town']`
- `src/systems/sound.test.ts` (라인 12): `bgmIdForScreen('world-map')` 어서션 제거
  (Screen union 에서 사라지므로 타입 자체로 호출 불가)

**E2E:**

- `games/inflation-rpg/tests/full-run.spec.ts` 삭제 (이미 skipped, 구 flow 가정).
- 기존 `dungeon-flow.spec.ts` 는 본 phase 에서 손대지 않음 (이미 `chromium` + `iphone14` 통과).

### 4.2 신규 / 수정 동작

- BattleScene 의 final 처치: `selectDungeon(null)` + `markFinalCleared` + `markDungeonProgress(id, 30)`
  + `setPendingFinalCleared(id)` + `setScreen('town')`. 결과적으로 modal 닫은 뒤 town 의 dungeon
  선택 UI 가 다시 나타남. MainMenu 의 "런 이어하기" 는 `currentDungeonId === null && run.characterId !== ''`
  상태 — UI 상 비활성 또는 숨김 처리되는지 확인 (필요 시 작은 수정 추가).
- `trackKill` 단일 인자: 구 flow 의 region-기반 quest progress 가 사실상 동작 안 했으므로 (신
  flow 만 활성), 본문은 단순 progress 누적 (현재 동일 동작) 유지. 카운트만 갱신.

## 5. 검증 게이트 (per-task)

각 task 완료 시:

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
```

마지막 (Task 8) 완료 시 추가:

```bash
pnpm --filter @forge/game-inflation-rpg circular
pnpm --filter @forge/game-inflation-rpg e2e   # chromium + iphone14
```

`pnpm --filter @forge/game-inflation-rpg build` 는 **제외**. 사유: 비목표 §3.

수동 smoke (Task 8):

1. 새 프로필 → ClassSelect → Town → 던전 선택 → dungeon-floors → F30 final 처치
2. 정복 modal 자동 표시 → 닫기 → town 으로 복귀 + dungeon 선택 해제 확인
3. MainMenu 의 "런 이어하기" 가 비활성 (정복 후 run 종료) 확인
4. Inventory / Shop / Quests 백 버튼이 town 으로 가는지 (각 화면 진입 후 백)
5. dungeon flow 진입 상태에서 Quests 화면 → 모든 카드가 "재설계 예정 — Phase F" 라벨

## 6. 분해 — 8 task

각 task 는 review-fix loop 포함 (B-3β1 패턴: haiku implementer + spec
reviewer + superpowers:code-reviewer agent. 3-5 dispatch 평균).

**Ordering 원칙**: 각 task 끝에서 typecheck/lint/test 가 green. 따라서 캐스케이딩
타입 변경 (RunState.currentAreaId / Screen 유니온) 은 모든 caller 정리와 같은 task
에 묶는다. 외관 cleanup (placeholder, back-button, file delete) 을 먼저 보내고
core surgery 는 단일 큰 task 로.

### Task 1 — Quests UI placeholder (추가만, isolated)

- `Quests.tsx` 가 `currentDungeonId` 구독
- `currentDungeonId !== null` 시: 각 카드 dim + "재설계 예정 — Phase F" 라벨, "보상 수령" 버튼 숨김
- 진행도/이름/설명은 표시 유지
- 신규 테스트: `Quests.test.tsx` 또는 같은 파일 case 추가 (currentDungeonId 셋 시 보상 버튼 부재)
- typecheck/test 통과 (additive 만이라 baseline 유지)

### Task 2 — Screen 컴포넌트 back 버튼: 'world-map' → 'town'

- `Battle.tsx`, `Inventory.tsx`, `Shop.tsx`, `Quests.tsx` 의 `'world-map'` 백 → `'town'`
- `Inventory.test.tsx` 의 `['main-menu', 'world-map']` → `['main-menu', 'town']`
- typecheck/test 통과 ('town' 은 이미 Screen 멤버라 변환 가능)

### Task 3 — Core surgery: types + gameStore + BattleScene (한 단위로)

이 task 는 **3 파일을 동시에 수정**해야 typecheck 가 green 으로 유지됨.
implementer 가 한 번에 모든 변경을 포함하도록 명시.

**types.ts**:
- `RunState.currentAreaId` 필드 제거
- `Screen` 유니온에서 `'world-map'`, `'dungeon'` 제거

**gameStore.ts**:
- `INITIAL_RUN` 의 `currentAreaId: 'village-entrance'` 라인 제거
- `setCurrentArea` 인터페이스 멤버 + 구현 제거
- `startRun` 분기: `screen: s.run.currentDungeonId !== null ? 'dungeon-floors' : 'world-map'`
  → 단일 `screen: 'dungeon-floors'`
- `trackKill(monsterId: string, regionId: string)` → `trackKill(monsterId: string)`
  - 본문에서 `q.target.monsterId === undefined && q.regionId === regionId` 분기 제거
  - monsterId-specific 매칭만 유지
- `persist` `version: 5` → `6`, `migrate` 에 v5→v6 case 추가 (state.run.currentAreaId 있으면 strip)

**BattleScene.ts**:
- `create()` 에서 `const area = run.currentAreaId` 제거
- 구 flow 25% 보스 분기 (~93-99) 삭제
- 구 flow normal 분기 (~133-142) 삭제 — `pickMonster(level, regionId?)` 호출 사라짐
- `doRound()` 의 `MAP_AREAS.find` lookup 제거, `trackKill(this.currentMonsterId)` 한 인자만
- 던전-끝 `setScreen('world-map')` → `setScreen('town')`
- final 처치 분기에 `selectDungeon(null)` 추가 (markFinalCleared/markDungeonProgress(30) 직후)

**테스트**:
- `gameStore.test.ts`: world-map 시나리오 어서션 → dungeon-floors. legacy fallback 테스트 (라인 333-336) 삭제. `currentAreaId` 어서션 모두 제거. v6 migrate stub 추가.
- typecheck/lint/test 통과

### Task 4 — App.tsx 라우팅 + 잔여 import 정리

- `App.tsx` 에서 `WorldMap` import + `{screen === 'world-map' && <WorldMap />}` 라인 제거
- 동일하게 `Dungeon` import + `{screen === 'dungeon' && <Dungeon />}` 라인 제거
  (단, `Dungeon` 컴포넌트는 Task 5 에서 삭제. 여기서는 라우팅 라인만)
- typecheck/test 통과

### Task 5 — 파일 / 데이터 삭제

- `screens/WorldMap.tsx` + `WorldMap.test.tsx`
- `screens/RegionMap.tsx` + `RegionMap.test.tsx`
- `screens/Dungeon.tsx` + `Dungeon.test.tsx`
- `data/regions.ts`, `data/maps.ts`, `data/maps.test.ts` (있는 경우)
- 잔여 import 가 있으면 제거 (`grep -r "WorldMap\|RegionMap\|MAP_AREAS\|REGIONS"` 0 hit 확인)
- typecheck/test/circular 통과

### Task 6 — sound 시스템 정리

- `systems/sound.ts` 에서 `'world-map': 'field'`, `'dungeon': 'field'` 키 제거
  (Screen 유니온에서 사라졌으므로 typecheck 자체 강제)
- `systems/sound.test.ts` 의 `bgmIdForScreen('world-map')` 어서션 제거
- typecheck/lint/test 통과

### Task 7 — 잔여 테스트 / e2e 정리

- `screens/ClassSelect.test.tsx` 의 `expect(state.screen).toBe('world-map')` →
  `'dungeon-floors'` (테스트 setup 에서 `currentDungeonId` 사전 주입해 invariant 만족)
- `tests/full-run.spec.ts` 삭제
- 잔여 grep: `grep -rn "world-map\|currentAreaId\|setCurrentArea"` 0 hit 확인
- typecheck/lint/test 통과

### Task 8 — 최종 검증 + 수동 smoke

- 전체 toolchain: typecheck + lint + test + circular + e2e (chromium + iphone14)
- 수동 smoke 5 step (§5)
- `next build` 는 의도적으로 제외 (별도 phase B-fix-phaser-build)
- 발견된 회귀 → review-fix loop

## 7. 위험 / 알려진 부채

- **`next build` 실패**: phase-b3a 시점부터 깨진 Phaser ESM default-export 문제.
  본 phase 가 건드리지 않음. 별도 phase **B-fix-phaser-build** 권장 (출시 차단
  위험이라 가급적 빠르게).
- **MainMenu "런 이어하기" 비활성 처리**: final clear 후 `selectDungeon(null)` 까지
  하면 `run.characterId` 는 남고 `currentDungeonId === null`. 현 MainMenu 가
  이 조합을 어떻게 표시하는지 확인 필요. Task 3 또는 Task 8 에서 확인.
- **`'stat-alloc'` Screen 멤버**: 본 phase 는 건드리지 않음. 라우팅에 없으면
  후속 cleanup.
- **Persist v6 migrate 검증**: 현 stub 테스트 패턴 유지. 후속에 helper 추출 검토.
- **인라인 hex 색상**: 직교 cleanup, 본 phase 범위 밖.
- **`markRegionVisited` / `MetaState.regionsVisited`**: WorldMap/RegionMap 삭제로 호출 사이트 dead.
  Story 시스템 ("region_enter" 트리거) 와 결합되어 있을 수 있어 본 phase 는 건드리지 않음.
  후속 cleanup 후보 (story refactor 와 동시).
- **`pickMonster(level, regionId?)` 시그니처**: 본 phase 는 호출 사이트만 정리. 함수 시그니처
  자체의 regionId 인자 제거는 호출이 0 으로 줄면 dead-code-removal 로 자연스럽게.
  Task 3 후 grep 으로 0 호출 확인되면 시그니처도 정리, 아니면 다음 phase.

## 8. 받아들일 결과

- 모든 검증 게이트 통과 (build 제외)
- 수동 smoke 5 step 통과
- `phase-b3b2-complete` 태그 + main 머지 (`feat/phase-b3b2-legacy-removal` 브랜치)
- 후속 phase 는 **B-fix-phaser-build** (출시 차단 해소).

## 9. 참조

- 선행 plan: `docs/superpowers/plans/2026-05-02-phase-b3b1-boss-floors-meta.md`
- 메모리: `project_phase_b3b1_complete.md` (다음 단계 / concerns 섹션)
- 300h spec: `docs/superpowers/specs/2026-05-01-content-300h-design.md` §B-3
