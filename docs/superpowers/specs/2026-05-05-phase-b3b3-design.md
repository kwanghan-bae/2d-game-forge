# Phase B-3β3 — Procedural 31+ floors (심층)

- 태그 목표: `phase-b3b3-complete`
- 선행: `phase-b3b2-complete` (merge `e292255`) + Battle dynamic-import 주석 (`d0aa35c`)
- 후속: 콘텐츠 균형 패치 (별도) 또는 Phase F (Ascension + 균열석 wiring)
- 범위: `inflation-rpg` 단일 워크스페이스

## 1. 한 줄 요약

F30 final boss 의 첫 클리어 시 정복자 모달 + run 종료 의식은 보존하되, **두 번째 이후 F30 클리어는 일반 보스처럼 통과 → F31 → 무한 procedural 진행**. DungeonFloors 화면은 기존 30 카드를 유지하고, 첫 정복 이후 추가 "심층 진입" panel 로 deepest floor 로 점프 진입. 데이터 레이어 (`getMonsterLevel`, `getBossType`, `pickBossIdByType`) 는 이미 procedural 지원 — 본 phase 는 cap 제거 + UI 분기만.

## 2. 동기

`docs/superpowers/specs/2026-05-01-content-300h-design.md` §1.5 의 마지막 절: `Floor 31~∞: 심층 (procedural — 동일 풀 + level multiplier ↑, 화폐 무한 farming)`. β1 (보스 floors), β2 (legacy 제거) 머지 후 cap 만 풀면 활성. 300h 페이싱 (§10.1) 의 후반 (200h+) 은 무한 심층에서 강화 lv 1000+ / Asc 30+ 누적이 핵심 활동 — 본 phase 는 그 기반.

## 3. 비목표

- **균열석 (crack stone, Ascension currency)** wiring — `MetaState.crackStones` 신규 필드 + drop 로직. spec §10.5 의 "심층 floor / 50 per 클리어" 를 구현하려면 Ascension UI/소비처가 필요한데 미존재. Phase F 에서 같이.
- **F30 매번 보상 격상** — spec §1.5 의 "강화석 50~100, 화폐 박스" 를 literal 구현 시 현재 `bossDrop(bossId, 5)` 의 DR 500 / 강화석 5 보다 훨씬 큰 보상. economy 영향 큼. 콘텐츠 균형 패치 phase 에서.
- **DungeonFloors 의 1~30 카드 외 procedural floor 카드 렌더** — 가상화 / 슬라이딩 윈도우 / 페이지네이션 모두 복잡. 본 phase 는 단일 "심층 진입" 버튼으로 대체.
- **`pickBossIdByType` round-robin 의 phase 결정** — 현재 `(floor - 30) / 5 % 3` 으로 F35→sub[1], F40→sub[2], F45→sub[0]. β1 plan 에서 의도 명시 X 였으나 그대로 보존. 변경 시 콘텐츠 패치 phase.
- **신규 콘텐츠 추가** — 새 던전/몬스터/장비/스킬/스토리 없음. 기존 dungeon 의 monsterPool 만 무한 재사용.

## 4. 작업 범위

### 4.1 `BattleScene.ts` — final 분기 split + cap 제거

현재 final 분기 (B-3β1+β2 결과):

```ts
if (bossType === 'final') {
  stateAfterKill.markFinalCleared(dungeonId);
  stateAfterKill.markDungeonProgress(dungeonId, 30);
  stateAfterKill.setPendingFinalCleared(dungeonId);
  stateAfterKill.selectDungeon(null);
  stateAfterKill.setScreen('town');
  return;
}
const nextFloor = Math.min(finishedFloor + 1, 30);
stateAfterKill.markDungeonProgress(dungeonId, nextFloor);
stateAfterKill.setCurrentFloor(nextFloor);
stateAfterKill.setScreen('dungeon-floors');
return;
```

본 phase 후 형태:

```ts
if (bossType === 'final') {
  const isFirstClear = !stateAfterKill.meta.dungeonFinalsCleared.includes(dungeonId);
  if (isFirstClear) {
    stateAfterKill.markFinalCleared(dungeonId);
    stateAfterKill.markDungeonProgress(dungeonId, 31); // unlock 심층
    stateAfterKill.setPendingFinalCleared(dungeonId);
    stateAfterKill.selectDungeon(null);
    stateAfterKill.setScreen('town');
    return;
  }
  // 두 번째 이후 — 일반 procedural 진행 (모달 X, run 계속)
}
const nextFloor = finishedFloor + 1;            // cap 제거
stateAfterKill.markDungeonProgress(dungeonId, nextFloor);
stateAfterKill.setCurrentFloor(nextFloor);
stateAfterKill.setScreen('dungeon-floors');
return;
```

**핵심 변경 포인트**:
- final 분기 안에서 `isFirstClear` 분기 신설.
- `isFirstClear === true`: 기존 동작 + `markDungeonProgress(31)` (정복 후 심층 unlock 신호).
- `isFirstClear === false`: final 분기 본문을 빠져나가 일반 분기로 fall-through. nextFloor 가 31 (= finishedFloor + 1 = 30 + 1).
- 일반 분기의 `Math.min(finishedFloor + 1, 30)` → `finishedFloor + 1` (cap 제거).
- `markFinalCleared` 는 idempotent (이미 store 가 처리) — first-clear branch 안에 두는 것은 의미 명확화.
- `bossDrop` (DR + 강화석) 은 이미 `onBossKill` 콜백에서 호출됨 (현 코드 라인 207). 두 번째 이후 final 도 자동으로 보상 발생.

### 4.2 `DungeonFloors.tsx` — 심층 진입 panel

기존 1~30 카드 grid 그대로. 첫 final clear 후 grid 아래 추가 panel:

```tsx
const finalCleared = meta.dungeonFinalsCleared.includes(dungeon.id);
const maxFloor = meta.dungeonProgress[dungeon.id]?.maxFloor ?? 0;
const deepestUnlocked = Math.max(31, maxFloor);

{finalCleared && (
  <ForgePanel
    data-testid="dungeon-deep-panel"
    style={{ margin: 'var(--forge-space-4) var(--forge-space-2)' }}
  >
    <ForgeButton
      onClick={() => enterFloor(deepestUnlocked)}
      data-testid="dungeon-deep-enter"
      variant="primary"
      style={{ width: '100%' }}
    >
      🌌 심층 진입 (F{deepestUnlocked})
    </ForgeButton>
    <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)', marginTop: 6, textAlign: 'center' }}>
      Lv {formatNumber(getMonsterLevel(deepestUnlocked))}
    </div>
  </ForgePanel>
)}
```

`enterFloor` 호출 시 cap 가 풀려 있다고 가정 — 단, 현재 `enterFloor` 의 `if (floor > run.currentFloor) return;` 가드는 1~30 카드 용. 심층은 항상 진입 허용 가져야 하므로 우회 필요:

옵션:
- A) `enterFloor(floor, { allowDeep: true })` 시그니처 확장.
- B) 심층 진입 핸들러 별도 정의:
  ```tsx
  const enterDeep = () => {
    const info = getFloorInfo(dungeon.id, deepestUnlocked);
    setCurrentFloor(deepestUnlocked);
    encounterMonster(info.monsterLevel);
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setScreen('battle');
  };
  ```
- 둘 다 작동. **B 채택** — 1~30 카드 의 가드는 보존되고 심층은 별도 함수. 책임 분리 명확.

`getMonsterLevel` 은 현재 `data/floors.ts` 에서 export 안 되어 있음. import 추가 또는 `getFloorInfo` 의 `monsterLevel` 활용. **`getFloorInfo` 활용** — DungeonFloors.tsx 가 이미 `getFloorInfo` import 함.

수정 형태:
```tsx
{finalCleared && (() => {
  const deepInfo = getFloorInfo(dungeon.id, deepestUnlocked);
  return (
    <ForgePanel data-testid="dungeon-deep-panel" style={{ margin: 'var(--forge-space-4) var(--forge-space-2)' }}>
      <ForgeButton onClick={enterDeep} data-testid="dungeon-deep-enter" variant="primary" style={{ width: '100%' }}>
        🌌 심층 진입 (F{deepestUnlocked})
      </ForgeButton>
      <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)', marginTop: 6, textAlign: 'center' }}>
        Lv {formatNumber(deepInfo.monsterLevel)}
      </div>
    </ForgePanel>
  );
})()}
```

### 4.3 신규 테스트

`games/inflation-rpg/src/screens/DungeonFloors.test.tsx`:

- `'심층 panel hidden before first final clear'` — `meta.dungeonFinalsCleared = []` 일 때 `queryByTestId('dungeon-deep-panel')` null.
- `'심층 panel visible after first final clear'` — `meta.dungeonFinalsCleared = ['plains']` 일 때 panel 보임 + 라벨에 F31 포함.
- `'심층 진입 클릭 시 currentFloor=deepest + screen=battle'` — `meta.dungeonFinalsCleared = ['plains']`, `meta.dungeonProgress.plains.maxFloor = 47` → 클릭 후 `run.currentFloor === 47` && `screen === 'battle'`.

`games/inflation-rpg/src/battle/BattleScene.test.ts` 가 없으므로 (BattleScene 은 Phaser 의존이라 unit test 안 함) → final-clear 분기는 manual + e2e 검증. 단 store 레벨에서 가능한 것은:

`games/inflation-rpg/src/store/gameStore.test.ts` 에 추가:
- `'first markFinalCleared adds to dungeonFinalsCleared'` (이미 있음 — re-verify).
- `'subsequent markFinalCleared is idempotent'` (이미 있음).

BattleScene 의 first-vs-subsequent 분기 자체는 unit test 어려움 — 통합 e2e 또는 수동에서 커버.

### 4.4 E2E

기존 `dungeon-flow.spec.ts` 에 새 케이스 추가:

```ts
test('심층 panel visibility toggles with first final clear', async ({ page }) => {
  // setup: ... navigate to DungeonFloors
  await expect(page.getByTestId('dungeon-deep-panel')).toBeHidden();
  // Force-set the meta state to simulate post-final-clear
  await page.evaluate(() => {
    // @ts-expect-error — exposed test hook
    window.__forgeStore.getState().markFinalCleared('plains');
  });
  await expect(page.getByTestId('dungeon-deep-panel')).toBeVisible();
});
```

**주의**: `window.__forgeStore` 는 `config.exposeTestHooks` 게이트 아래 노출되는지 확인. 미구현이면 e2e 는 navigation-only 검증으로 줄이거나 신규 e2e 케이스 생략.

`config.exposeTestHooks` 미노출 시: 본 phase 는 e2e 신규 안 추가, unit test 와 수동 smoke 만.

## 5. 검증 게이트

각 task 후:
```
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
```

마지막 task:
```
pnpm circular
pnpm --filter @forge/game-inflation-rpg build   # β2 incidental fix 후 통과 가능
pnpm --filter @forge/game-inflation-rpg e2e
```

수동 smoke:
1. 새 프로필 → ClassSelect → Town → 평야 던전 → ClassSelect → 모험 시작 → DungeonFloors.
2. 심층 panel 보이지 않음 확인.
3. floor 1~30 모두 진행 (또는 devtool 로 maxFloor 강제) → F30 final 클리어 → 모달 표시 → 닫기 → town 복귀 + currentDungeonId === null 확인.
4. 같은 던전 다시 입장 → 심층 panel 보임 ("F31").
5. 1~29 카드 활성, 30 final card 도 카드 클릭 가능. 클릭 → 전투 → 클리어 → 모달 X + run 계속 → DungeonFloors 의 currentFloor 가 31 으로 표시.
6. 심층 panel 클릭 → battle → F31 sub-boss 가 아닌 일반 (getBossType(31)=null), F35 sub-boss, F60 sub-boss 등 매 5층 마다 보스 확인.
7. 사망 → game-over → MainMenu 진입 가능.

## 6. 분해 — 3 task

### Task 1 — BattleScene final 분기 split + cap 제거

수정: `games/inflation-rpg/src/battle/BattleScene.ts`.

§4.1 의 코드 변경 적용. typecheck/test/lint 통과.

### Task 2 — DungeonFloors 심층 panel + 테스트

수정: `games/inflation-rpg/src/screens/DungeonFloors.tsx`, `games/inflation-rpg/src/screens/DungeonFloors.test.tsx`.

§4.2 의 panel + `enterDeep` 핸들러 추가. §4.3 의 3 테스트 신규 추가. typecheck/test/lint 통과.

### Task 3 — 검증 + 수동 smoke + tag

전체 toolchain (build 포함) + 수동 smoke 7 step (§5). 회귀 발견 시 fix-fix loop. tag `phase-b3b3-complete`.

E2E 신규 케이스는 `config.exposeTestHooks` / `__forgeStore` 노출 확인 후 결정 — 미노출 시 생략.

## 7. 위험 / 알려진 부채

- `pickBossIdByType` round-robin phase decision: spec 명시 X. 현행 유지.
- F30 procedural 진행 시 `bossDrop` 의 reward = bpReward 5 (final boss 가 spec 상 magnitude 표시. spec 의 "강화석 50~100" 미반영). 콘텐츠 균형 패치.
- 균열석: Phase F.
- DungeonFloors 가 maxFloor=1000+ 갱신 시 1~30 카드만 보여서 현재 진행 floor 가 1~30 외임을 표시 안 함. 심층 panel 의 `(F{deepestUnlocked})` 으로만 노출. 사용자가 "내가 어느 층까지 갔지?" 알기 어려움. 후속 cleanup: panel 라벨 강화 또는 town 의 dungeon 카드에 maxFloor 표시.
- e2e 신규 케이스가 노출 hook 의존 시 추가 미실시 가능. 그 경우 unit test + 수동 smoke 가 유일한 검증.
- **`enterFloor` 의 currentFloor 회귀**: 기존 동작 — 깊은 floor 에 있을 때 더 낮은 카드 클릭 시 currentFloor 가 regression. 본 phase 가 도입하는 issue 아님 (β1 부터 존재). 콘텐츠 패치 phase 에서 `setCurrentFloor(Math.max(currentFloor, ...))` 로 fix 검토.
- **Town 재진입 시 run continuity**: 깊은 run 에서 town 으로 backToTown → 재진입 시 currentFloor 가 보존되는지 / startRun 으로 1 로 초기화되는지 검증 필요. 본 phase 의 design 은 startRun 호출 안 하면 currentFloor 가 보존된다고 가정. Town 코드 확인은 Task 1 시작 전 spot-check.

## 8. 받아들일 결과

- typecheck 0, lint clean, vitest PASS (신규 3 test 포함).
- circular clean, build 통과 (β2 incidental fix 후), e2e 18+ PASS.
- 수동 smoke 7 step 통과.
- tag `phase-b3b3-complete` + main 머지 (`feat/phase-b3b3-procedural-floors` 브랜치).

## 9. 참조

- 선행 spec: `docs/superpowers/specs/2026-05-02-phase-b3b2-design.md`, `docs/superpowers/specs/2026-05-01-content-300h-design.md`.
- 선행 plan: `docs/superpowers/plans/2026-05-02-phase-b3b2-legacy-removal.md`.
- 메모리: `project_phase_b3b2_complete.md` (incidental build fix 포함).
