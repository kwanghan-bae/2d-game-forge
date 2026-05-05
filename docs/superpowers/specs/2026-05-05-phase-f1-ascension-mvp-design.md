# Phase F-1 — Ascension MVP + 균열석

- 태그 목표: `phase-f1-complete`
- 선행: `phase-b3b3-complete` (merge `98def8d`).
- 후속 sub-projects (별도 spec):
  - F-2: 장비 강화 시스템.
  - F-3: 직업 트리 — 화랑 (1 캐릭터 100 노드).
  - F-4: 직업 트리 — 무당 + 초의 (200 노드 데이터).
  - F-5: Asc Tree (AP 영구 stat 노드).
- 범위: `inflation-rpg` 단일 워크스페이스.

## 1. 한 줄 요약

심층 floor 클리어 시 균열석 drop, 새 "차원 제단" 화면에서 final 누적 N+2 + 균열석 N² 비용으로 Tier N 진입 → run/일반 인벤토리/dr reset + meta `ascTier += 1` → `calcFinalStat` 의 `ascTierMult = 1 + 0.1·ascTier` 가 자동 적용 (Tier 1 = ×1.1, Tier 30 = ×4). Asc Tree / Mythic slot / 트리/나침반/유물 reset 분기는 후속 phase.

## 2. 동기

`docs/superpowers/specs/2026-05-01-content-300h-design.md` §6 (Ascension) + §10.5 (균열석 drop "심층 floor / 50 per 클리어"). 페이싱 곡선 (§10.1) 의 50h+ 시점 핵심 활동 = "첫 Asc Tier 1 → Asc 5 → 9 final → ...". B-3β3 가 심층 procedural 을 활성한 후의 자연스러운 후속 — 심층에서 farming 한 균열석을 Asc 비용으로 소비, 그 결과 power multiplier 가 누적되어 다시 깊이 도달.

## 3. 비목표 (이 phase 가 하지 않는 것)

- **Asc Tree (영구 stat 노드)** — `ascPoints` 만 누적, 소비처는 F-5 에서.
- **Mythic 슬롯 해금** — 현 `equipSlotCount` 는 그대로 보존. spec §6.3 Tier 1 의 "Mythic 슬롯 1개 해금" 미반영.
- **트리/나침반/유물 reset 분기** — 미구현 시스템이라 분기 의미 없음. 시스템 추가 시 reset 정책에 같이 추가.
- **Tier 보상 마일스톤** (Tier 5 = 슬롯 3 + Mythic 유물, Tier 15 = 19번 던전 해금, Tier 20 = 20번 던전 해금, Tier 30 = "초월" 모드) — 19/20번 던전 미존재. 마일스톤 대응 시스템 미존재. 미구현. multiplier 만 작동.
- **DR 비용** — Asc 진입 비용은 균열석만 (spec literal). DR 은 reset 대상이지만 비용 X.
- **하드모드 reset 분기** — `hardModeUnlocked` 는 보존 (계정 통계).
- **Tier 18+ 균열석-only 분기** — spec §6.1 "Tier 18+ = 균열석 비용만". 현재 게임에 18 dungeon 없으므로 Tier 1 만 도달 가능. 의미 없음. final 카운트 조건은 항상 적용.

## 4. 작업 범위

### 4.1 타입 / persist 변경

`src/types.ts` `MetaState` 3 필드 추가:

```ts
export interface MetaState {
  // ... 기존 필드 ...
  // Phase F-1 — Ascension
  crackStones: number;       // 차원 균열석 — Asc 비용 화폐
  ascTier: number;           // 현재 Asc Tier (시작 0)
  ascPoints: number;         // Tier 진입 시 N 누적 — F-5 Asc Tree 소비처
}
```

`Screen` 유니온에 `'ascension'` 추가:

```ts
export type Screen =
  | 'main-menu'
  | 'town'
  | 'dungeon-floors'
  | 'class-select'
  | 'battle'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over'
  | 'quests'
  | 'ascension';
```

`gameStore.ts` `INITIAL_META` 에 3 필드 default:
```ts
crackStones: 0,
ascTier: 0,
ascPoints: 0,
```

Persist `version: 6 → 7`. Migrate v6→v7:
```ts
if (fromVersion < 7 && s.meta) {
  s.meta.crackStones = s.meta.crackStones ?? 0;
  s.meta.ascTier = s.meta.ascTier ?? 0;
  s.meta.ascPoints = s.meta.ascPoints ?? 0;
}
```

### 4.2 Store actions

#### `gainCrackStones(amount: number): void`

```ts
gainCrackStones: (amount) =>
  set((s) => ({ meta: { ...s.meta, crackStones: s.meta.crackStones + amount } })),
```

GameStore 인터페이스에 추가.

#### `canAscend(): { ok: boolean; nextTier: number; cost: number; finalsRequired: number; finalsCleared: number; reason: 'finals' | 'stones' | null }`

```ts
canAscend: () => {
  const s = get();
  const nextTier = s.meta.ascTier + 1;
  const finalsRequired = nextTier + 2;
  const finalsCleared = s.meta.dungeonFinalsCleared.length;
  const cost = nextTier * nextTier;
  if (finalsCleared < finalsRequired) {
    return { ok: false, nextTier, cost, finalsRequired, finalsCleared, reason: 'finals' };
  }
  if (s.meta.crackStones < cost) {
    return { ok: false, nextTier, cost, finalsRequired, finalsCleared, reason: 'stones' };
  }
  return { ok: true, nextTier, cost, finalsRequired, finalsCleared, reason: null };
},
```

#### `ascend(): boolean`

성공 시 reset 적용 + true 반환. 조건 미충족 시 false.

```ts
ascend: () => {
  const check = get().canAscend();
  if (!check.ok) return false;
  set((s) => {
    const { nextTier, cost } = check;
    // 장착된 아이템만 인벤토리에 보존.
    const equippedSet = new Set(s.meta.equippedItemIds);
    const keepFromList = (list: Equipment[]) => list.filter((it, idx) =>
      // 같은 id 가 여러 개일 수 있으므로 가장 먼저 매치 1개만 보존.
      // equippedItemIds 는 unique id 의 배열 — 단순 includes 매치.
      equippedSet.has(it.id) && list.findIndex((x) => x.id === it.id) === idx
    );
    return {
      run: INITIAL_RUN,
      screen: 'main-menu',
      meta: {
        ...s.meta,
        // reset 항목
        soulGrade: 0,
        dr: 0,
        enhanceStones: 0,
        characterLevels: {},
        normalBossesKilled: [],
        hardBossesKilled: [],
        baseAbilityLevel: getBaseAbilityLevel([], []),  // 0
        questProgress: {},
        questsCompleted: [],
        regionsVisited: [],
        dungeonProgress: {},
        pendingFinalClearedId: null,
        inventory: {
          weapons: keepFromList(s.meta.inventory.weapons),
          armors: keepFromList(s.meta.inventory.armors),
          accessories: keepFromList(s.meta.inventory.accessories),
        },
        // 보존 + 수정
        crackStones: s.meta.crackStones - cost,
        ascTier: nextTier,
        ascPoints: s.meta.ascPoints + nextTier,
        // 보존 (변경 없음)
        // dungeonFinalsCleared / equippedItemIds / equipSlotCount /
        // tutorialDone / tutorialStep / musicVolume / sfxVolume / muted /
        // lastPlayedCharId / bestRunLevel / hardModeUnlocked
      },
    };
  });
  return true;
},
```

GameStore 인터페이스에 둘 다 추가.

**중요**: `keepFromList` 의 dedup 로직 — 인벤토리에 같은 id 가 여러 개 있을 수 있고 (합성 재료 다수 보유), `equippedItemIds` 가 unique id 만 갖는 형태인지 reset 시 고려해야 함. 현재 코드는 한 슬롯당 한 id (unique id 가 array index 로 저장). 보수적으로 first match 만 keep — 여분 사본은 버려짐 (예: 같은 검 3개 보유 + 1개 장착 → reset 후 1개만 남음).

### 4.3 stats.ts multiplier

`src/systems/stats.ts` 의 `calcFinalStat` 시그니처 변경.

현재:
```ts
export function calcFinalStat(
  statKey: StatKey,
  spAlloc: number,
  charMult: number,
  equipped: Equipment[],
  baseAbility: number,
  charLevelMult: number,
): number {
  // ... 합성 ...
}
```

변경 후:
```ts
export function calcFinalStat(
  statKey: StatKey,
  spAlloc: number,
  charMult: number,
  equipped: Equipment[],
  baseAbility: number,
  charLevelMult: number,
  ascTierMult: number,  // 신규 — (1 + 0.1 * meta.ascTier)
): number {
  // ... 기존 합성 결과 × ascTierMult ...
}
```

호출 사이트:
- `BattleScene.create()` (BattleScene.ts:163-165) — `useGameStore.getState().meta.ascTier` 읽고 `ascTierMult = 1 + 0.1 * ascTier` 계산 후 전달.

`stats.test.ts` 테스트 업데이트 (있으면) — `ascTierMult: 1` 인자 추가.

### 4.4 BattleScene 균열석 drop

`BattleScene.ts` `doRound()` win branch — non-boss kill 후 `incrementDungeonKill` 호출 부근:

```ts
if (!this.isBoss) {
  useGameStore.getState().incrementDungeonKill(run.level);
  if (this.currentMonsterId) {
    useGameStore.getState().trackKill(this.currentMonsterId);
  }
}
```

추가 — non-boss 든 boss 든 무관하게 floor 기반 drop. final 분기 진입 직전에 한 번 처리:

```ts
// Phase F-1: 심층 floor 균열석 drop.
const stonesGained = Math.floor(finishedFloor / 50);
if (stonesGained > 0) {
  stateAfterKill.gainCrackStones(stonesGained);
}
```

배치: `const dungeonId = currentRun.currentDungeonId;` 라인 바로 위 또는 아래. final 분기 진입 전. 그래야 final 처치도 균열석 drop 받음 (F50 가 final 일 가능성은 없지만 spec 일반화).

**중요**: drop 은 **finished floor** 기준 (방금 클리어한 floor). final 분기에서 first clear → run terminates → drop 도 그 직전에 일어나야 함.

### 4.5 Ascension 제단 UI

신규 파일 `src/screens/Ascension.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';
import { formatNumber } from '../lib/format';

export function Ascension() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const canAscendResult = useGameStore((s) => s.canAscend)();
  const ascend = useGameStore((s) => s.ascend);
  const [confirming, setConfirming] = React.useState(false);

  const currentMult = 1 + 0.1 * meta.ascTier;
  const nextMult = 1 + 0.1 * canAscendResult.nextTier;

  const handleAscend = () => {
    const ok = ascend();
    if (ok) {
      setConfirming(false);
    }
  };

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('town')}>← 마을로</ForgeButton>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>🌌 차원 제단</h2>
        <span />
      </div>

      <ForgePanel data-testid="ascension-status" style={{ margin: '8px 16px' }}>
        <div style={{ fontSize: 14 }}>현재 <strong>Tier {meta.ascTier}</strong> (×{currentMult.toFixed(2)})</div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 4 }}>
          누적 균열석: <strong>{formatNumber(meta.crackStones)}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          던전 정복: <strong>{canAscendResult.finalsCleared}</strong> / 총 3
        </div>
      </ForgePanel>

      <ForgePanel data-testid="ascension-next" style={{ margin: '16px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>다음: Tier {canAscendResult.nextTier} (×{nextMult.toFixed(2)})</div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 6 }}>
          정복 던전 필요: {canAscendResult.finalsCleared} / {canAscendResult.finalsRequired}
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          균열석 필요: {formatNumber(meta.crackStones)} / {formatNumber(canAscendResult.cost)}
        </div>

        {!canAscendResult.ok && (
          <div data-testid="ascension-blocked" style={{ marginTop: 8, fontSize: 12, color: 'var(--forge-danger)' }}>
            {canAscendResult.reason === 'finals' && '아직 정복한 던전이 부족하다.'}
            {canAscendResult.reason === 'stones' && '균열석이 부족하다.'}
          </div>
        )}

        {canAscendResult.ok && !confirming && (
          <ForgeButton
            data-testid="ascension-ascend"
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setConfirming(true)}
          >
            초월 — Tier {canAscendResult.nextTier}
          </ForgeButton>
        )}

        {confirming && (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--forge-danger)', borderRadius: 4 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              진행 중인 모든 진척이 사라진다. (장착된 장비, 균열석, Asc Tier 는 보존)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ForgeButton
                data-testid="ascension-confirm"
                variant="primary"
                style={{ flex: 1 }}
                onClick={handleAscend}
              >
                확인
              </ForgeButton>
              <ForgeButton
                data-testid="ascension-cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirming(false)}
              >
                취소
              </ForgeButton>
            </div>
          </div>
        )}
      </ForgePanel>
    </ForgeScreen>
  );
}
```

`Town.tsx` 에 제단 버튼 추가 (dungeon grid 아래, "돌아가기" 위):

```tsx
<div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
  <ForgeButton
    variant="secondary"
    onClick={() => setScreen('ascension')}
    data-testid="town-ascension-altar"
  >
    🌌 차원 제단
  </ForgeButton>
</div>
```

`App.tsx`:
```tsx
import { Ascension } from './screens/Ascension';
// ...
{screen === 'ascension' && <Ascension />}
```

`sound.ts` `SCREEN_BGM`:
```ts
ascension: 'lobby',
```

`sound.test.ts` 신규 어서션:
```ts
expect(bgmIdForScreen('ascension')).toBe('lobby');
```

### 4.6 신규 unit tests

#### `gameStore.test.ts` 추가 describe `'Phase F-1 — Ascension'`

- `'INITIAL_META has crackStones=0, ascTier=0, ascPoints=0'`
- `'gainCrackStones increments meta.crackStones'`
- `'canAscend returns finals-blocked when fewer than nextTier+2 dungeons cleared'`
- `'canAscend returns stones-blocked when crackStones < cost'`
- `'canAscend returns ok with nextTier=1, cost=1 when 3 finals + 1 stone'`
- `'ascend returns false when blocked'`
- `'ascend returns true and applies reset'` — setup with 3 finals + 1 stone, characterLevels populated, dr=1000, run with stuff → ascend → meta.ascTier=1, meta.dr=0, meta.characterLevels={}, run=INITIAL_RUN, screen='main-menu', dungeonFinalsCleared 보존
- `'ascend keeps equipped items, drops unequipped'` — setup inventory with equipped + non-equipped → ascend → 장착된 것만 남음

#### `Ascension.test.tsx` 신규 파일

- `'shows current Tier and multiplier'`
- `'shows blocked message when finals insufficient'`
- `'shows ascend button when conditions met'`
- `'click ascend → confirm → applies reset and navigates to main-menu'`
- `'cancel from confirmation hides confirm dialog'`

#### `Town.test.tsx` (있으면) 추가:
- `'click 차원 제단 navigates to ascension'`

### 4.7 BattleScene 균열석 drop — manual verification

BattleScene 자체에 unit test 없음. F-1 의 drop 검증은:
- Smoke 단계에서 devtools 로 currentFloor=50 set + 클리어 → meta.crackStones += 1 확인.

## 5. 검증 게이트

각 task 후:
```
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
```

마지막:
```
pnpm circular
pnpm --filter @forge/game-inflation-rpg build
pnpm --filter @forge/game-inflation-rpg e2e
```

수동 smoke (F-1 의 가장 중요한 검증 단계 — BattleScene drop + Asc reset 의 통합):

1. 새 프로필 → Town → 평야 → ClassSelect → 모험 시작 → DungeonFloors.
2. devtools: 3 dungeon final 모두 처치한 상태로 set:
   ```js
   useGameStore.setState((s) => ({
     meta: {
       ...s.meta,
       dungeonFinalsCleared: ['plains', 'forest', 'mountains'],
       crackStones: 1,
     },
   }))
   ```
3. Town → 차원 제단 클릭 → Ascension 화면.
4. "Tier 0 (×1.00)" + "정복 던전: 3 / 3" + "균열석: 1 / 1" 확인.
5. "초월 — Tier 1" 버튼 클릭 → 확인 dialog → "확인".
6. MainMenu 화면 + meta.ascTier === 1, meta.crackStones === 0, meta.dr === 0, run.characterId === '' 확인 (devtools).
7. 다시 Town → 차원 제단. "Tier 1 (×1.10)" 확인. "정복 던전: 3 / 4" → blocked-finals (since nextTier=2, requires 4 finals).
8. devtools: 심층 floor drop 검증 — `useGameStore.setState((s) => ({ run: { ...s.run, currentDungeonId: 'plains', currentFloor: 50 } }))` → fight at F50 → win → meta.crackStones += 1 확인.
9. 다시 Town → 차원 제단 → "균열석 1 / 4" → blocked-finals (4 dungeons 부족).

## 6. 분해 — 6 task

각 task review-fix loop 포함.

### Task 1 — 타입 + persist v7

`src/types.ts`, `src/store/gameStore.ts` 의 타입 + INITIAL_META + persist version + migrate. 영향: typecheck pass, vitest pass (기존 테스트는 영향 없음).

### Task 2 — Store actions + 단위 테스트

`gainCrackStones` / `canAscend` / `ascend` 액션 + 7~8 신규 단위 테스트 (gameStore.test.ts).

### Task 3 — stats.ts ascTierMult + BattleScene 호출 사이트

`calcFinalStat` 시그니처 확장 + BattleScene `create()` 의 호출 갱신 + 기존 stats.test.ts 갱신.

### Task 4 — BattleScene 균열석 drop

`doRound()` 의 finished floor 기반 drop. unit test 없음. typecheck/test pass.

### Task 5 — Ascension 화면 + Town 진입점

`screens/Ascension.tsx` (+ test), `Town.tsx` 제단 버튼, `App.tsx` 라우팅, `sound.ts` 의 BGM key + test.

### Task 6 — 검증 + 수동 smoke + tag

전체 toolchain (build 포함) + e2e + 9-step manual smoke + tag `phase-f1-complete`.

## 7. 받아들일 결과

- typecheck 0, lint clean, vitest PASS (신규 ~13 test 포함).
- circular clean, build 통과, e2e 18+ PASS.
- 수동 smoke 9 step 통과 (특히 BattleScene drop 검증 + Asc reset 통합).
- tag `phase-f1-complete` + main 머지 (`feat/phase-f1-ascension-mvp` 브랜치).

## 8. 참조

- 선행: `docs/superpowers/specs/2026-05-05-phase-b3b3-design.md`, `docs/superpowers/specs/2026-05-01-content-300h-design.md` §6 + §10.5.
- 메모리: `project_phase_b3b3_complete.md`.
