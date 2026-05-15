# 2026-05-15 — Phase Compass (차원 나침반) Design

## 한 줄 요약

inflation-rpg 에 **차원 나침반 (Compass)** 시스템을 도입한다. mini-boss / major-boss
첫 처치 보상으로 던전별 1차/2차 나침반을 획득하고, 모든 던전 mini-boss 첫 처치
시 범우주 나침반이 자동 부여된다. 마을의 던전 자유 선택 UX 를 **무작위 추첨 (가중치)**
으로 전환하며, 나침반 보유 시 가중치 가산 또는 자유 선택 권한이 부여된다.

## 배경

- **Phase E (유물 + Mythic + 광고 stub)** 가 직전 완료. 다음 후보는 (A) Compass /
  (B) Phase E procs 완성 / (C) 13 캐릭터 / (D) IAP/Ads SDK 실연결. **(A) 채택**.
- 300h spec `2026-05-01-content-300h-design.md` §2.4 + §7.3 의 미구현 prereq.
- 현재 코드:
  - 3 던전 (plains/forest/mountains), 모두 `unlockGate.type === 'start'`
  - `Town.tsx` 가 던전을 그리드 list 로 노출하며 **자유 선택** 만 가능
  - `floors.ts` 의 `getBossType()` 가 floor 5 / 10 / 30 의 mini / major / final 분류 이미 구현
  - 던전 final 첫 처치 추적 (`meta.dungeonFinalsCleared`) 만 존재. mini/major 추적 없음
- 본 phase 는 300h spec §2.2 의 **20 던전 확장은 다루지 않는다** — 시스템 골격만 마련.
  추후 던전 데이터만 추가하면 자동 흡수되도록 설계.

## 설계 합의 (Brainstorming 결론)

1. **획득 경로** — 보스 처치 only. 광고 path 없음 (광고는 Phase E 누적유물 전용 BM)
2. **Scope** — α 최소형. 3 던전 그대로, compass + 무작위 추첨 + 범우주 nav 만
3. **UI flow** — Town 의 단일 [던전 입장] 버튼 → 추첨 modal → [입장] / [자유 선택 override]
4. **재추첨** — 없음. compass 가 유일한 escape
5. **가중치 셈** — 1차 보유 = 3, 미보유 = 1. 2차/범우주 보유는 가중치 영향 없음 (자유 선택만 부여)
6. **Compass 화면** — 보물고 (Relics.tsx) 에 "나침반" tab 추가 (3-tab)
7. **구현 architecture** — 독립 모듈 (`data/compass.ts` + `systems/compass.ts` + 신규 modal). Mythic/Relic 과 분리

## 1. 데이터 모델

### 1.1 신규 타입 (`types.ts`)

```typescript
export type CompassId =
  | 'plains_first'    | 'plains_second'
  | 'forest_first'    | 'forest_second'
  | 'mountains_first' | 'mountains_second'
  | 'omni';

export interface CompassEntry {
  id: CompassId;
  dungeonId: string | null;     // null = omni (모든 던전)
  tier: 0 | 1 | 2;              // 0 = omni, 1 = mini-boss, 2 = major-boss
  emoji: string;
  nameKR: string;
  descriptionKR: string;
}
```

### 1.2 MetaState 추가 fields

```typescript
compassOwned: Record<CompassId, boolean>;
dungeonMiniBossesCleared: string[];   // mini-boss 첫 처치 누적
dungeonMajorBossesCleared: string[];  // major-boss 첫 처치 누적
```

- `compassOwned` 는 explicit storage. `omni` 도 boolean 으로 저장 (derive 안함)
- `dungeonMiniBossesCleared` 는 omni 트리거 + idempotent 가드 + 추후 메타 보상 hook 용
- `dungeonMajorBossesCleared` 는 2차 award idempotent 가드용 (현재 phase 에서 별도 보상 없음. 추후 확장 reuse)

### 1.3 데이터 파일 (`data/compass.ts`)

3 던전 × 2종 + 1 omni = **총 7 entries**.

```typescript
export const COMPASS_ITEMS: Record<CompassId, CompassEntry> = {
  plains_first:    { id: 'plains_first',     dungeonId: 'plains',     tier: 1, emoji: '🧭', nameKR: '평야 나침반 1차',   descriptionKR: '평야 던전 추첨 가중치 ×3' },
  plains_second:   { id: 'plains_second',    dungeonId: 'plains',     tier: 2, emoji: '🗺️', nameKR: '평야 나침반 2차',   descriptionKR: '평야 던전 자유 선택' },
  forest_first:    { id: 'forest_first',     dungeonId: 'forest',     tier: 1, emoji: '🧭', nameKR: '깊은숲 나침반 1차', descriptionKR: '깊은숲 던전 추첨 가중치 ×3' },
  forest_second:   { id: 'forest_second',    dungeonId: 'forest',     tier: 2, emoji: '🗺️', nameKR: '깊은숲 나침반 2차', descriptionKR: '깊은숲 던전 자유 선택' },
  mountains_first: { id: 'mountains_first',  dungeonId: 'mountains',  tier: 1, emoji: '🧭', nameKR: '산악 나침반 1차',   descriptionKR: '산악 던전 추첨 가중치 ×3' },
  mountains_second:{ id: 'mountains_second', dungeonId: 'mountains',  tier: 2, emoji: '🗺️', nameKR: '산악 나침반 2차',   descriptionKR: '산악 던전 자유 선택' },
  omni:            { id: 'omni',             dungeonId: null,         tier: 0, emoji: '🌌', nameKR: '범우주 나침반',    descriptionKR: '모든 던전 자유 선택' },
};

export const ALL_COMPASS_IDS: ReadonlyArray<CompassId> = Object.keys(COMPASS_ITEMS) as CompassId[];

export const EMPTY_COMPASS_OWNED: Record<CompassId, boolean> = {
  plains_first: false,    plains_second: false,
  forest_first: false,    forest_second: false,
  mountains_first: false, mountains_second: false,
  omni: false,
};

export function getCompassByDungeon(dungeonId: string, tier: 1 | 2): CompassId {
  return `${dungeonId}_${tier === 1 ? 'first' : 'second'}` as CompassId;
}
```

## 2. Persist v12 Migration

### 2.1 STORE_VERSION

`gameStore.ts` line 1048 — `version: 11` → `version: 12`.

### 2.2 Migration step

`runStoreMigration` 끝부분에 추가:

```typescript
// v11 → v12: Phase Compass — compass owned + dungeon clear tracking
if (fromVersion <= 11 && s.meta) {
  const m = s.meta as MetaState;
  m.compassOwned                = m.compassOwned                ?? { ...EMPTY_COMPASS_OWNED };
  m.dungeonMiniBossesCleared    = m.dungeonMiniBossesCleared    ?? [];
  m.dungeonMajorBossesCleared   = m.dungeonMajorBossesCleared   ?? [];
}
```

### 2.3 INITIAL_META

```typescript
compassOwned: { ...EMPTY_COMPASS_OWNED },
dungeonMiniBossesCleared: [],
dungeonMajorBossesCleared: [],
```

### 2.4 Asc Reset 정책

`ascend()` action 에서 compass / clear lists **보존**. spec §6.2 + §7.3 정합.
기존 ascend 코드의 spread 가 새 fields 를 자동 보존하면 별도 코드 불필요 —
구현 단계에서 검증 후 명시적 보존 line 추가 여부 결정.

### 2.5 Retroactive omni 계산 — 불필요

migration 시 기존 `dungeonMiniBossesCleared` 가 모두 충족된 상태일 가능성은 없음
(이전 버전엔 추적 자체가 없음). 신규 dungeon clear 시점에 자연스럽게 omni 충족 → award.

## 3. System Layer (`systems/compass.ts`)

Pure functions. Phase E `systems/relics.ts` / `systems/ads.ts` 컨벤션.

### 3.1 Public API

```typescript
// Award
export function awardMiniBossCompass(
  meta: MetaState,
  dungeonId: string
): Partial<MetaState> | null;

export function awardMajorBossCompass(
  meta: MetaState,
  dungeonId: string
): Partial<MetaState> | null;

// Query
export function getDungeonWeight(meta: MetaState, dungeonId: string): number;
export function canFreeSelect(meta: MetaState, dungeonId: string): boolean;
export function hasAnyFreeSelect(meta: MetaState): boolean;

// Pick
export function pickRandomDungeon(
  meta: MetaState,
  dungeons: readonly Dungeon[],
  rng?: () => number
): string;
```

### 3.2 Award 함수 — idempotent

```typescript
export function awardMiniBossCompass(meta, dungeonId) {
  if (meta.dungeonMiniBossesCleared.includes(dungeonId)) return null;
  const compassId = getCompassByDungeon(dungeonId, 1);
  const newCleared = [...meta.dungeonMiniBossesCleared, dungeonId];
  const allClear = newCleared.length >= DUNGEONS.length;   // omni 트리거
  return {
    compassOwned: {
      ...meta.compassOwned,
      [compassId]: true,
      ...(allClear ? { omni: true } : {}),
    },
    dungeonMiniBossesCleared: newCleared,
  };
}

export function awardMajorBossCompass(meta, dungeonId) {
  if (meta.dungeonMajorBossesCleared.includes(dungeonId)) return null;
  const compassId = getCompassByDungeon(dungeonId, 2);
  return {
    compassOwned: { ...meta.compassOwned, [compassId]: true },
    dungeonMajorBossesCleared: [...meta.dungeonMajorBossesCleared, dungeonId],
  };
}
```

- **Idempotent** — 이미 부여된 dungeon 재호출 시 null return (호출자 noop)
- partial patch return — store action 에서 spread 합성 가능

### 3.3 Query

```typescript
export function getDungeonWeight(meta, dungeonId) {
  return meta.compassOwned[getCompassByDungeon(dungeonId, 1)] ? 3 : 1;
}

export function canFreeSelect(meta, dungeonId) {
  return meta.compassOwned.omni || meta.compassOwned[getCompassByDungeon(dungeonId, 2)];
}

export function hasAnyFreeSelect(meta) {
  return meta.compassOwned.omni
    || ALL_COMPASS_IDS.some(id => COMPASS_ITEMS[id].tier === 2 && meta.compassOwned[id]);
}
```

### 3.4 Pick — 가중치 추첨

```typescript
export function pickRandomDungeon(meta, dungeons, rng = Math.random) {
  const weights = dungeons.map(d => getDungeonWeight(meta, d.id));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < dungeons.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return dungeons[i]!.id;
  }
  return dungeons[dungeons.length - 1]!.id;  // numerical fallback
}
```

- rng injection — seeded test 가능
- omni 보유와 무관 (호출자가 free-select 모드 결정)

## 4. Store Actions

### 4.1 신규 actions (`gameStore.ts`)

```typescript
// BattleScene 호출 (idempotent)
awardMiniBossCompass: (dungeonId: string) => void;
awardMajorBossCompass: (dungeonId: string) => void;

// UI 호출
pickAndSelectDungeon: () => string;            // 추첨 + selectDungeon
selectDungeonFree: (dungeonId: string) => void; // 자유 선택 (guard 적용)
```

### 4.2 Sketch

```typescript
awardMiniBossCompass: (dungeonId) => set((s) => {
  const patch = awardMiniBossCompassSystem(s.meta, dungeonId);
  return patch ? { meta: { ...s.meta, ...patch } } : {};
}),

awardMajorBossCompass: (dungeonId) => set((s) => {
  const patch = awardMajorBossCompassSystem(s.meta, dungeonId);
  return patch ? { meta: { ...s.meta, ...patch } } : {};
}),

pickAndSelectDungeon: () => {
  const id = pickRandomDungeon(get().meta, DUNGEONS);
  get().selectDungeon(id);
  return id;
},

selectDungeonFree: (dungeonId) => {
  if (!canFreeSelect(get().meta, dungeonId)) {
    console.warn('selectDungeonFree denied: no compass for', dungeonId);
    return;
  }
  get().selectDungeon(dungeonId);
},
```

- `selectDungeon(id)` 은 기존 store action. 새 actions 는 그 위에 wrap
- `selectDungeonFree` 의 guard 는 방어적 — UI 가 정상이면 무용. 임의 호출 / 디버그 방지

## 5. BattleScene 통합

### 5.1 Hook 위치 — line 290 (`getBossType` 직후)

```typescript
const bossType = getBossType(finishedFloor);

// Phase Compass — mini/major-boss 첫 처치 시 award (idempotent)
if (bossType === 'mini') {
  stateAfterKill.awardMiniBossCompass(dungeonId);
} else if (bossType === 'major') {
  stateAfterKill.awardMajorBossCompass(dungeonId);
}

// 이후 Phase F-1 stones drop → final 분기 → 일반 advance ...
```

### 5.2 Why this 위치

1. `bossType` 이 이미 계산됨 — 재계산 없음
2. final 분기 (line 298+) **전** — final 은 early return 이지만 mini/major 는 fall-through
3. `bossDrop` 호출 후 → store 가 DR/stones/counter 업데이트 완료 상태. compass 가 그 위에 얹힘
4. award 가 idempotent → race/retry 안전

### 5.3 알림 — deferred

mini/major 첫 처치 시 축하 modal 은 본 phase 에서 **deferred**. 보물고 tab 의 활성
표시로 가시화 충분. 추후 원하면 `pendingCompassAwardId` 모델 추가.

## 6. UI

### 6.1 Town.tsx — 단일 entry

기존 던전 그리드 (line 41-70) 제거. 단일 [던전 입장] 버튼 + DungeonPickModal mount.

```tsx
<ForgeScreen>
  <h1>마을</h1>
  <p>차원 너머 던전으로 떠나라</p>

  <ForgeButton
    variant="primary"
    onClick={() => setPickModalOpen(true)}
    data-testid="town-enter-dungeon"
  >
    🚪 던전 입장
  </ForgeButton>

  {/* 기존 차원 제단 / 직업소 / 보물고 / 돌아가기 버튼 유지 */}

  {pickModalOpen && (
    <DungeonPickModal onClose={() => setPickModalOpen(false)} />
  )}
</ForgeScreen>
```

### 6.2 DungeonPickModal.tsx (신규)

- **mount 시 `pickAndSelectDungeon()` 호출** → 추첨 결과 결정
- `[입장]` 버튼 = `setScreen('class-select')` + modal close
- `hasAnyFreeSelect(meta)` 이면 `[🗺️ 자유 선택]` 버튼 노출 → 자유 선택 모드 전환
- 자유 선택 모드: 던전 카드 list, `canFreeSelect(meta, id)` 인 것만 활성

```tsx
export function DungeonPickModal({ onClose }) {
  const meta = useGameStore((s) => s.meta);
  const pickAndSelect = useGameStore((s) => s.pickAndSelectDungeon);
  const selectFree = useGameStore((s) => s.selectDungeonFree);
  const setScreen = useGameStore((s) => s.setScreen);

  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [freeMode, setFreeMode] = React.useState(false);

  React.useEffect(() => { setPickedId(pickAndSelect()); }, []);

  // ... see Section 6 of brainstorming for full sketch
}
```

UX 메모:
- modal mount 시점에 추첨 결정 — close 후 재진입 시 새 추첨 (의도된 동작)
- 자유 선택 → 다시 추첨 모드로 돌아가도 `pickedId` 는 유지 (의도된 동작)

### 6.3 Relics.tsx — Compass tab 추가

기존 2-tab (stack / mythic) → 3-tab (stack / mythic / **compass**).

- 7 entries 모두 list. 미보유 = 회색 + hint text
- hint: tier 1 = "○○ 던전 floor 5 mini-boss 첫 처치"
- hint: tier 2 = "○○ 던전 floor 10 major-boss 첫 처치"
- hint: omni = "모든 던전 mini-boss 첫 처치 시 자동"

## 7. Sim Parity

`tools/balance-sim.ts` — compass 영향 **없음** (stat / drop multiplier 비관여).

regression-check 만:
- `phaseCompass_meta` 시뮬 모드 = 모든 mini cleared / omni 보유 상태 → balance-milestones 회귀 0 확인
- 추첨 가중치는 sim 의 단일-dungeon 모델과 무관

새 코드 ≈ 1줄 (regression seed 추가). 핵심 검증은 unit/e2e 가 담당.

## 8. Test Plan

### 8.1 Unit

| 파일 | 케이스 |
|---|---|
| `data/compass.test.ts` | COMPASS_ITEMS 무결성, ALL_COMPASS_IDS length 7, EMPTY_COMPASS_OWNED 무결성, `getCompassByDungeon` 동작 |
| `systems/compass.test.ts` | `awardMiniBossCompass`: 첫 호출 patch, 2회 호출 null, omni 자동 트리거 (3 dungeon 처치 후) |
| `systems/compass.test.ts` | `awardMajorBossCompass`: 첫 호출 patch, 2회 호출 null |
| `systems/compass.test.ts` | `getDungeonWeight`: 1차 보유 = 3, 미보유 = 1 |
| `systems/compass.test.ts` | `canFreeSelect`: omni / 2차 / 미보유 분기 |
| `systems/compass.test.ts` | `pickRandomDungeon`: seeded rng 결정론. 가중치 분포 검증 (10000 sample) |
| `store/gameStore.test.ts` | 4 actions 호출 + meta 업데이트 invariants |
| `store/gameStore.test.ts` | ascend reset 시 compass / clear lists 보존 |
| `store/gameStore.test.ts` | v8 → v12 migration chain (defaults 주입) |
| `screens/DungeonPickModal.test.tsx` | mount 시 pickedId 결정, `hasAnyFreeSelect` 분기 |

총 unit ≈ 10 신규.

### 8.2 E2E

| 케이스 | spec 위치 |
|---|---|
| Town [던전 입장] → modal → [입장] → class-select 진입 | `compass-flow.spec.ts` 신규 |
| seeded compass 1차 1개 → 자유 선택 버튼 노출 → 1 dungeon 만 활성 | 동일 spec |
| seeded omni → 자유 선택 모드에서 전 던전 활성 | 동일 spec |
| v8 → v12 chain (compass defaults 검증) | `v8-migration.spec.ts` 확장 |

총 e2e ≈ 4 logical × 2 project (chromium + mobile-iphone) = **8 신규**.

### 8.3 회귀

- `tools/balance-sim.ts` baseline 동일 (compass-on / compass-off 두 모드)
- 기존 `mythic-flow.spec.ts` / `relics-ad.spec.ts` / `ascension-flow.spec.ts` 회귀 0
- 기존 `dungeon-flow.spec.ts` 가 Town 의 던전 그리드를 가정한 경우 — modal 경유로 업데이트 필요 (관련 spec 식별 + 수정)

## 9. 구현 범위 / 영향 파일

| # | 항목 | 신규/수정 | 파일 수 |
|---|---|---|---|
| 1 | types.ts (CompassId, CompassEntry, MetaState 3 fields) | 수정 | 1 |
| 2 | data/compass.ts + test | 신규 | 2 |
| 3 | systems/compass.ts + test | 신규 | 2 |
| 4 | gameStore.ts (4 actions + migration v12 + ascend 검증) | 수정 | 1 |
| 5 | gameStore.test.ts (액션 + ascend + migration 검증) | 수정 | 1 |
| 6 | BattleScene.ts (4-line hook) | 수정 | 1 |
| 7 | Town.tsx (단순화) | 수정 | 1 |
| 8 | DungeonPickModal.tsx + test | 신규 | 2 |
| 9 | Relics.tsx (compass tab) | 수정 | 1 |
| 10 | compass-flow.spec.ts (e2e) | 신규 | 1 |
| 11 | v8-migration.spec.ts (확장) | 수정 | 1 |
| 12 | tools/balance-sim.ts (regression seed) | 수정 | 1 |
| 13 | 기존 e2e 중 던전 그리드 가정 spec — 식별 + 수정 | 수정 | 1-2 |

**총 영향 파일 ≈ 13-15**. Phase E (33 파일) 대비 작은 규모.

## 10. Known Limitations / Out of Scope

### 10.1 본 phase 가 다루지 않는 것

- **20 던전 확장 (§2.2)** — 시스템 골격만. 17 던전 추가는 별도 phase
- **mini-boss / major-boss 첫 처치 축하 modal** — 보물고 tab 가시화로 갈음. 추후 polish
- **광고 path 로 compass 획득** — Phase E 누적유물 광고 라인과 톤 분리. 본 phase 보스 처치 only
- **재추첨 (광고 / 무료)** — compass 가 유일한 escape. 추후 분리 검토 가능
- **Compass 효과의 추가 부수효과** — 가중치 ×3 / 자유 선택만. drop_mult / xp_mult 등은 mythic 영역

### 10.2 Phase E 의 deferred 한계

본 phase 와 무관 — 영향 없음:
- lifesteal / sp_steal proc (BattleScene `currentHPEstimate` + skill SP 부재)
- swift_winds target 분리
- infinity_seal / light_of_truth first-pass scope

이들은 별도 후속 phase (F++ 등) 에서 처리.

## 11. 다음 단계

1. 본 spec 사용자 검토
2. `writing-plans` skill 진입 — task 단위 분할 + 단위/통합 test plan 구체화
3. `subagent-driven-development` — 각 task 를 implementer + reviewer 페어로 진행
4. merge `--no-ff` + `phase-compass-complete` tag
