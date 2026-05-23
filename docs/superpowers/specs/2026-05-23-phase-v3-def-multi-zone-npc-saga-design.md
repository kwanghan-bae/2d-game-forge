# Phase V3-DEF — Multi-zone + NPC + 무한 Saga (mega-phase)

**Status:** Design (brainstorming 산출물)
**Date:** 2026-05-23
**Author:** kwanghan-bae + Claude (Opus 4.7)
**Base commit:** `7a4d958` (main HEAD — V3-A + V3-B + V3-C 머지 직후)
**Branch:** `feat/phase-v3-def-multi-zone-npc-saga` (예정)
**Master spec:** `docs/superpowers/specs/2026-05-23-v3-eternal-hero-idle-sponsor-design.md` §6 / §7 / §8 / §9

---

## 0. 이 sub-spec 의 의미

V3 spec §9 의 V3-D (Multi-zone) + V3-E (NPC + 관계) + V3-F (무한 saga) 세 phase 를 하나의 mega-phase 로 통합. 사용자의 10h+ 자율 작업 의도에 맞춰 single spec + single plan + single main 머지로 진행. V3-G (1만시간 balance pass) 는 sim 측정 필요로 분리 — 사용자 복귀 후 별 phase.

이 spec 의 가치:
- 6 zone catalog + field level + damping 의 디테일 정의
- Zone 진행 단방향 + boss 경감 + Hero AI 의 navigation 결정
- NPC 4종 (라이벌/멘토/친구/가족) 의 lifecycle + interaction
- EternalSaga 무한 chapter viewer
- Persist v20 → v21 마이그레이션
- Buff #6 (field_diff threshold) 의 V3-C 의 inert 상태 해제

---

## 1. Scope

**In-scope:**
- 6 realm catalog (base/sea/volcano/underworld/heaven/chaos)
- GRID_W=120 (6 × 20 col) + camera follow + viewport scroll
- Field level damping (soft log 곡선, buff #6 threshold 경감)
- Zone 단방향 progression (boss 처치 → 다음 zone unlock → exit landmark + 자동 흡수)
- NPC 4종 entity + lifecycle + encounter modal
- 가족 시스템 (부모 / 결혼 / 자식)
- EternalSaga 무한 chapter scrollable viewer
- 회춘 marker "재생 #K" 시각화
- Persist v20 → v21

**Out-of-scope (다른 phase):**
- 1만시간 곡선 balance — V3-G
- BigInt 도입 — V3-G 또는 이후
- Personality combat 정교화 — V3-H 이후
- 추가 buff catalog 확장 — V3-G 이후

---

## 2. 결정 사항 요약 (brainstorming 산출물)

| # | 결정 | 값 |
|---|---|---|
| 1 | V3-D scope | Full Spec §6 (6 zone) |
| 2 | Map 구조 | Grid 확장 — GRID_W=120 + camera follow |
| 3 | Zone progression | 단방향 + boss 경감 (자동 흡수) |
| 4 | Damping 공식 | Soft log: `1 / (1 + 0.05 × max(0, fieldLv - heroLv - buff6))` |
| 5 | Zone layer | V1e (village/forest/plains/mountains/mystic) = zone 0 의 column band 유지. 5 realm 새 enemy roster |
| 6 | Zone unlock UX | 자동 흡수 — exit landmark 가 next realm unlocked 일 때 Hero AI valid target |
| 7 | V3-E NPC scope | Full 4종 (라이벌 / 멘토 / 친구 / 가족) |
| 8 | V3-F saga 구조 | Timeline scroll (era 그룹 + filter) |
| 9 | V3-G | 별 phase (mega 에서 제외) |

---

## 3. Architecture

### 3.1 신규 파일

| 경로 | 책임 |
|---|---|
| `games/inflation-rpg/src/data/realms.ts` | 6 realm catalog (`REALM_CATALOG`) |
| `games/inflation-rpg/src/data/__tests__/realms.test.ts` | catalog 구조 검증 |
| `games/inflation-rpg/src/zone/fieldDamping.ts` | pure helper `computeFieldDamping(heroLv, fieldLv, buff6)` |
| `games/inflation-rpg/src/zone/zoneNavigation.ts` | `canEnterRealm`, `nextRealm`, `fieldLevelAtColumn` |
| `games/inflation-rpg/src/zone/__tests__/fieldDamping.test.ts` | damping 공식 + cap 검증 |
| `games/inflation-rpg/src/zone/__tests__/zoneNavigation.test.ts` | unlock + column → field level |
| `games/inflation-rpg/src/data/npcs.ts` | NPC entity type + initial roster |
| `games/inflation-rpg/src/npc/NpcLifecycle.ts` | NPC aging + lifespan + 만남 trigger |
| `games/inflation-rpg/src/npc/NpcInteraction.ts` | encounter modal data (relationship drift, narrative templates) |
| `games/inflation-rpg/src/npc/__tests__/NpcLifecycle.test.ts` | NPC tickAge + 사망 |
| `games/inflation-rpg/src/npc/__tests__/NpcInteraction.test.ts` | encounter outcome by personality |
| `games/inflation-rpg/src/saga/EternalSaga.ts` | CycleSaga 확장 — chaptersByEra + rejuvenationCount marker |
| `games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts` | era 그룹핑 + filter |
| `games/inflation-rpg/src/screens/SagaBookModal.tsx` | timeline scroll viewer |
| `games/inflation-rpg/src/screens/NpcEncounterModal.tsx` | NPC 만남 modal |
| `games/inflation-rpg/src/store/__tests__/migrateV20ToV21.test.ts` | 마이그레이션 검증 |
| `games/inflation-rpg/tests/e2e/v3-def-multi-zone-npc-saga.spec.ts` | E2E |

### 3.2 수정 파일

| 경로 | 변경 |
|---|---|
| `games/inflation-rpg/src/types.ts` | `RealmId` 타입 + `MetaState.unlockedRealms: RealmId[]` + `MetaState.eternalSaga` + `RunState.currentRealmId: RealmId` + `RunState.npcs: NpcEntity[]` |
| `games/inflation-rpg/src/overworld/mapLayout.ts` | `GRID_W = 120` + `generateMapLayout(seed, realmId)` 가 해당 realm 의 column band 만 active |
| `games/inflation-rpg/src/overworld/OverworldScene.ts` | camera follow hero + setBounds(120 × TILE_PX) + 게임 width fixed 640px (viewport) |
| `games/inflation-rpg/src/overworld/CycleControllerV2.ts` | (a) zone state 통합 (b) boss 처치 시 unlockNextRealm 발화 (c) NPC interaction trigger (d) realm 전환 emit |
| `games/inflation-rpg/src/overworld/EncounterEngine.ts` | battle damage 에 `computeFieldDamping(...)` 곱 |
| `games/inflation-rpg/src/overworld/Pathfinding.ts` | currentRealm 의 column 범위 안에서만 navigation |
| `games/inflation-rpg/src/overworld/OverworldEvents.ts` | `realm_unlocked`, `npc_encounter`, `npc_died`, `family_event` events 추가 |
| `games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts` | exit landmark 의 valid target 조건 (next realm unlocked) |
| `games/inflation-rpg/src/data/landmarks.ts` | exit landmark 의 의미 = "다음 realm 으로". realm boss landmark 6 개 추가 |
| `games/inflation-rpg/src/store/gameStore.ts` | `unlockRealm` + `recordNpcEvent` actions + migrate v20→v21 |
| `games/inflation-rpg/src/screens/OverworldRunner.tsx` | HUD 에 현재 realm + unlocked count + realm transition cinematic + saga book 버튼 |
| `games/inflation-rpg/src/buff/buffEffects.ts` | `getFieldDiffThreshold` consume site wire (CycleControllerV2 가 호출) |
| `games/inflation-rpg/src/saga/SagaRecorder.ts` | EternalSaga 구조로 확장 |

### 3.3 핵심 디자인 결정

- **Single 120-wide grid.** 6 realm 이 grid 의 column band (0-19 / 20-39 / ... / 100-119). Hero 의 navigation 가능 범위 = unlocked realm 의 column 합. Camera bounds 동적 갱신.
- **Field level = realm.fieldLevelRange[0] + (column_within_realm / 20) × (range[1] - range[0]).** Column 따라 점진. Realm 마지막 column (boss 위치) 이 최고 field level.
- **Damping pure selector.** EncounterEngine + OverworldScene 의 movement tween 둘 다 적용.
- **NPC entity = first-class state.** RunState.npcs[] persist. NPC 도 tickAge (hero 보다 빠른 rate).
- **EternalSaga = CycleSaga 확장.** chaptersByEra + rejuvenationCount marker. SagaRecorder 가 era key 부여.

---

## 4. V3-D Multi-zone 상세

### 4.1 REALM_CATALOG

```ts
export type RealmId = 'base' | 'sea' | 'volcano' | 'underworld' | 'heaven' | 'chaos';

export interface RealmDef {
  id: RealmId;
  nameKR: string;
  fieldLevelRange: [number, number];
  bgColor: string;
  columnRange: [number, number];  // grid column [start, end) — base=[0,20), sea=[20,40), …
  enemyRoster: string[];          // landmark TYPE ids
  bossId: string;                 // realm boss TYPE id
  nextRealm: RealmId | null;
}

export const REALM_CATALOG: readonly RealmDef[] = [
  { id: 'base',       nameKR: '시작의 들판', fieldLevelRange: [1, 50],            columnRange: [0, 20],   bgColor: '#3f6212', enemyRoster: ['wolf','bandit','goblin','dire_wolf','brigand','ogre'], bossId: 'base_boss',       nextRealm: 'sea' },
  { id: 'sea',        nameKR: '폭풍의 바다', fieldLevelRange: [50, 500],          columnRange: [20, 40],  bgColor: '#1e3a8a', enemyRoster: ['sea_serpent','kraken_spawn','tide_wraith','storm_eel'], bossId: 'sea_boss',     nextRealm: 'volcano' },
  { id: 'volcano',    nameKR: '용암의 화산', fieldLevelRange: [500, 5000],        columnRange: [40, 60],  bgColor: '#7c2d12', enemyRoster: ['flame_drake','lava_golem','magma_imp','salamander'], bossId: 'volcano_boss',   nextRealm: 'underworld' },
  { id: 'underworld', nameKR: '망자의 명계', fieldLevelRange: [5000, 50000],      columnRange: [60, 80],  bgColor: '#1f2937', enemyRoster: ['wraith','soul_collector','bone_lord','grim_reaper'], bossId: 'underworld_boss', nextRealm: 'heaven' },
  { id: 'heaven',     nameKR: '천계의 평원', fieldLevelRange: [50000, 500000],    columnRange: [80, 100], bgColor: '#fef3c7', enemyRoster: ['celestial_guardian','angel','seraph','divine_envoy'], bossId: 'heaven_boss', nextRealm: 'chaos' },
  { id: 'chaos',      nameKR: '혼돈의 끝',   fieldLevelRange: [500000, 5_000_000], columnRange: [100, 120], bgColor: '#4c1d95', enemyRoster: ['void_horror','chaos_lord','reality_breaker','primordial_shade'], bossId: 'chaos_boss', nextRealm: null },
];
```

NB: V3-D 의 새 enemy/boss landmark TYPE 들은 `landmarks.ts` 에 ID 만 등록 (emoji + nameKR placeholder). 데이터 정의는 V3-G balance pass 에서 충실화.

### 4.2 Field Level Calculation

```ts
// zone/zoneNavigation.ts
export function fieldLevelAtColumn(realmId: RealmId, column: number): number {
  const realm = REALM_CATALOG.find(r => r.id === realmId);
  if (!realm) return 1;
  const [colStart, colEnd] = realm.columnRange;
  const [lvStart, lvEnd] = realm.fieldLevelRange;
  const t = (column - colStart) / (colEnd - colStart);
  return Math.floor(lvStart + t * (lvEnd - lvStart));
}
```

### 4.3 Damping Selector

```ts
// zone/fieldDamping.ts
export function computeFieldDamping(heroLv: number, fieldLv: number, buff6Threshold: number): number {
  const effectiveDiff = Math.max(0, fieldLv - heroLv - buff6Threshold);
  return 1 / (1 + 0.05 * effectiveDiff);
}
```

Wire 위치:
- `EncounterEngine.resolveEncounter` 의 hero atk × damping → 데미지 감소
- `OverworldScene.setSpeed` 가 `speed × moveMul × damping` 으로 — hero 가 강한 영역에서 느려짐
- `getBuffSnapshot` callback 에 `damping: number` 추가 (per arrival 계산)

### 4.4 Zone Unlock + Hero AI

`MetaState.unlockedRealms: RealmId[]` 초기 `['base']`. Boss 처치 시:

```ts
// CycleControllerV2.handleArrival 의 battle_won 처리 안에
if (kind === 'boss') {
  const realm = REALM_CATALOG.find(r => r.id === this.currentRealmId);
  if (realm?.nextRealm && !meta.unlockedRealms.includes(realm.nextRealm)) {
    useGameStore.getState().unlockRealm(realm.nextRealm);
    events.push({ type: 'realm_unlocked', realmId: realm.nextRealm });
  }
}
```

`HeroDecisionAI` — exit landmark 의 valid target 조건:

```ts
function isExitValid(landmark: PlacedLandmark, currentRealm: RealmId, unlockedRealms: RealmId[]): boolean {
  if (landmark.type.kind !== 'exit') return false;
  const realm = REALM_CATALOG.find(r => r.id === currentRealm);
  if (!realm?.nextRealm) return false;
  return unlockedRealms.includes(realm.nextRealm);
}
```

Hero 가 exit 도착 → cinematic overlay 2s (`다음 영역: {nextRealmName}`) → `setRealm(next)` → controller 가 `currentRealmId = next` 갱신 + hero 위치 = next realm 의 첫 column.

### 4.5 Map Layout — Single Grid 120-wide

```ts
// overworld/mapLayout.ts
export const GRID_W = 120;
export const GRID_H = 12;
export const TILE_PX = 32;

export function generateMapLayout(seed: number): MapLayout {
  // 전체 120 col 항상 생성. realm 별 column band 내에서 enemy roster + boss 배치.
  // 6 realm × landmark 패턴 (마을 / enemy x N / boss / exit).
}
```

Camera (OverworldScene):
```ts
this.cameras.main.setBounds(0, 0, GRID_W * TILE_PX, GRID_H * TILE_PX);
this.cameras.main.startFollow(this.heroSprite, true, 0.1, 0.1);
this.cameras.main.setDeadzone(200, 100);
```

게임 width = 640 (viewport) fixed. canvas height = 384.

---

## 5. V3-E NPC 시스템

### 5.1 NPC entity

```ts
export type NpcKind = 'rival' | 'mentor' | 'friend' | 'family_parent' | 'family_spouse' | 'family_child';

export interface NpcEntity {
  instanceId: string;
  kind: NpcKind;
  nameKR: string;
  emoji: string;
  age: number;
  ageRate: number;            // hero 보다 빠른 rate (1.5x ~ 2x)
  isAlive: boolean;
  bornChapter: Chapter;
  relationship: number;       // 0-100
  zoneRealmId: RealmId;       // 거주 realm
  personalityDim?: PersonalityDim;
}
```

`RunState.npcs: NpcEntity[]` persist. V3-E 시작 시 빈 array.

### 5.2 NPC Lifecycle

- **부모 (family_parent)** — 어린시절 (age <= 14) 안에 hero 의 부모 1-2명 spawn. ageRate 1.5x. passive (encounter 없음). 노년기 hero 도달 시 자연 사망 → saga event.
- **라이벌 (rival)** — 어린시절 끝에 (age ~10) spawn. 같이 늙음 (ageRate 1.0x). 매 zone 마다 만남 trigger 확률 30%. 결투 outcome by personality.
- **멘토 (mentor)** — 청년기 (15-29) 안에 1명 spawn. 1-2 chapter 안에 스킬 전수 후 떠남 (isAlive=false 가 아니라 zoneRealmId=null 로 제거).
- **친구 (friend)** — 어느 chapter 든 1-3명 spawn 가능. 만남 확률 20%. 죽으면 saga 의 큰 narrative event (사회성 디버프 임시).
- **결혼 (family_spouse)** — 청년기 또는 장년기 안에 1명 spawn (확률 trigger). 같이 늙음. 결혼 event = 큰 saga marker.
- **자식 (family_child)** — 결혼 후 청년기-장년기 안에 1-2명 spawn. ageRate 1.5x. 자라면서 personality drift (hero 의 personality 따라). hero 도달 chapter 가 자식 의 성년기 = 자식 떠남 event.

### 5.3 NPC Encounter Modal

`NpcEncounterModal.tsx`:
- NPC name + emoji + age + relationship
- 3 narrative outcome (personality dim 영향):
  - 라이벌: 결투 (충동) / 협력 (자비) / 회피 (신중)
  - 멘토: 스킬 전수 (신앙) / 평범한 만남 (세속)
  - 친구: 잡담 (자비) / 도움 (영웅)
  - 가족: 식사 / 결혼식 / 생일 (chapter milestone)
- 선택 시 relationship + saga event 기록

### 5.4 NPC Encounter Trigger

CycleControllerV2 의 매 arrival 마다:
1. 현재 column 의 realm 에 거주하는 NPC 후보 추출
2. 각 NPC 별 만남 확률 (kind / chapter / relationship 함수)
3. 1명 선택 → npc_encounter event 발화
4. OverworldRunner 가 NpcEncounterModal 띄움

---

## 6. V3-F EternalSaga 무한 Chapter Viewer

### 6.1 Data Structure

```ts
// saga/EternalSaga.ts
export interface EternalSaga {
  events: SagaEvent[];                       // 누적 (CycleSaga 와 호환)
  chaptersByEra: Record<string, EraGroup>;   // era key → group
  rejuvenationCount: number;                 // V3-B marker
  realmTransitions: Array<{ from: RealmId; to: RealmId; atAge: number; eraKey: string }>;
}

export interface EraGroup {
  eraKey: string;                            // 예: "재생 #2 청년기" 또는 "본래 노년기"
  chapter: Chapter;
  rejuvCount: number;                        // 이 era 가 몇 번째 재생인지
  events: SagaEvent[];                       // 이 era 안의 event 부분집합
}
```

### 6.2 SagaRecorder 확장

기존 `SagaRecorder.record(event)` 가 chaptersByEra 도 갱신. 회춘 시 rejuvenationCount 증가 + 새 era key.

### 6.3 Saga Book Modal

`SagaBookModal.tsx`:
- Timeline scroll — era 별 큰 divider ("재생 #K · {chapter}")
- 각 era 안에 event 카드 (battle / drop / level_up / npc / realm / rejuv)
- Filter checkboxes: era / event type
- ESC + 외부 클릭 close
- HUD 의 "기록" 버튼이 열기

### 6.4 회춘 Marker 시각화

`재생 #K` divider 가 saga book 의 큰 visual break. 빛 효과 + 다른 색.

---

## 7. Persist v20 → v21

### 7.1 마이그레이션

```ts
export function migrateV20ToV21(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null; run?: Record<string, unknown> | null };
  if (s.meta && typeof s.meta === 'object') {
    if (!Array.isArray(s.meta['unlockedRealms'])) s.meta['unlockedRealms'] = ['base'];
    if (!s.meta['eternalSaga']) s.meta['eternalSaga'] = { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] };
  }
  if (s.run && typeof s.run === 'object') {
    if (typeof s.run['currentRealmId'] !== 'string') s.run['currentRealmId'] = 'base';
    if (!Array.isArray(s.run['npcs'])) s.run['npcs'] = [];
  }
  return s;
}
```

### 7.2 STORE_VERSION 20 → 21

`version: 21` + chain entry `if (fromVersion <= 20) migrateV20ToV21(s);`

### 7.3 INITIAL_META / INITIAL_RUN 갱신

`INITIAL_META.unlockedRealms = ['base']`, `INITIAL_META.eternalSaga = { ... }`, `INITIAL_RUN.currentRealmId = 'base'`, `INITIAL_RUN.npcs = []`.

---

## 8. Testing

### 8.1 Unit

- `data/__tests__/realms.test.ts` — catalog 구조 (6 entries, column ranges 인접, fieldLevelRange ascending)
- `zone/__tests__/fieldDamping.test.ts` — `computeFieldDamping`:
  - heroLv >= fieldLv → 1.0
  - heroLv < fieldLv, buff6=0 → soft decay
  - buff6 이 diff 만큼 ↑ → damping = 1.0 (effectiveDiff=0)
- `zone/__tests__/zoneNavigation.test.ts`:
  - `canEnterRealm(['base'], 'sea')` → false
  - `canEnterRealm(['base', 'sea'], 'sea')` → true
  - `fieldLevelAtColumn('base', 0)` ≈ 1, `('base', 19)` ≈ 50
  - `fieldLevelAtColumn('sea', 20)` ≈ 50, `('sea', 39)` ≈ 500
- `npc/__tests__/NpcLifecycle.test.ts` — NPC tickAge, ageRate, 자연 사망
- `npc/__tests__/NpcInteraction.test.ts` — encounter outcome by personality
- `saga/__tests__/EternalSaga.test.ts` — era 그룹핑, rejuv marker, filter
- `store/__tests__/migrateV20ToV21.test.ts` — 마이그레이션 (insert / idempotent / null safety)

### 8.2 Integration

- `overworld/__tests__/CycleControllerV2.test.ts` 확장:
  - Boss 처치 시 unlockRealm 발화
  - exit landmark 도착 → realm 전환
  - damping 이 hero atk 에 곱해지는지

### 8.3 E2E

`v3-def-multi-zone-npc-saga.spec.ts`:
1. 새 세이브 시작 → realm 0 (base) 진입
2. 적 처치 후 hud-realm 표시
3. realm 0 boss 처치 → realm_unlocked → exit landmark active → hero 가 exit 통과 → realm 1 (sea) 진입
4. NPC encounter trigger → modal → 선택 outcome
5. "기록" 버튼 → SagaBookModal → 회춘 marker / realm transition 보임
6. modal close

---

## 9. 위험

- **R1. GRID_W=120 의 mobile UX.** Camera follow + viewport scroll 이 mobile 에서 자연스러운지. V3-A safe area 와 충돌 없는지. Mitigation: E2E iphone14 project 통과 필수.
- **R2. EncounterEngine + OverworldScene 의 damping wire.** Movement tween 의 timeScale 곱은 V3-C 의 moveMul 곱과 합쳐져 4중 곱 (speed × moveMul × damping × buff). 수치 폭발 vs 0 수렴 검증 필요. Mitigation: setSpeed 의 clamp (e.g. 0.1 ~ 100) + unit test.
- **R3. NPC 4종 동시 구현 의 복잡도.** family 시스템 (결혼/자식) 은 milestone event 가 chapter 의존. NPC encounter trigger 의 확률 매트릭스가 폭발 가능. Mitigation: V3-E 의 NPC roster 를 placeholder magnitude 로 + V3-G balance pass.
- **R4. EternalSaga 의 메모리.** 1만 시간 plays 면 event 수십만 개. Scroll viewport 의 virtualization 필요할 수 있음. Mitigation: V3-F 의 Saga book viewer 는 era 별 lazy load + 최근 N era 만 default 표시.
- **R5. Persist v21 마이그레이션 의 size.** unlockedRealms + npcs + eternalSaga 가 새 큰 fields. v20 → v21 transition 의 backward compat 검증. Mitigation: migrate test 의 idempotent / null safety case 명시.
- **R6. Hero AI 의 exit landmark 선택 priority.** 현재 enemy / shrine / boss / exit 의 우선순위 미정. Boss 처치 후 exit 만 valid 인 상황에서 hero 가 exit 으로 직진하는지. Mitigation: HeroDecisionAI test 의 valid target list 검증.
- **R7. Single grid 120-wide 의 Pathfinder 성능.** 1440 cells. A* 의 worst case O(n log n). 충분히 fast 일 것이지만 검증 필요. Mitigation: Pathfinder.test 추가.

---

## 10. Phase 결정 (sub-section 진행)

이 mega-phase 는 single plan + single main 머지. 단 plan 의 task 는 V3-D / V3-E / V3-F 의 sub-section 으로 그룹핑:

- **V3-D group (T1-T15)**: realm catalog + map 확장 + damping + zone state + nav AI + Hero AI + Pathfinder + 마이그레이션 + E2E (zone unlock)
- **V3-E group (T16-T25)**: NPC entity + lifecycle + encounter modal + 가족 시스템 + interaction trigger + saga event
- **V3-F group (T26-T32)**: EternalSaga 확장 + SagaBookModal + era 그룹 + filter + 회춘 marker visual
- **T33: Final integration + 전체 검증 + main 머지**

총 ~33 task. 각 5-15 min. 4-8h 자율 실행 예상.

---

## 11. 검증 / 성공 기준

### V3-D
- 6 realm catalog 가 column band + field level 일치
- realm 0 boss 처치 → realm 1 unlock + exit landmark 활성
- Damping 이 hero atk + movement 둘 다 적용
- HUD 에 현재 realm + unlocked count 표시

### V3-E
- 라이벌 NPC 가 어린시절 ~ 노년기 persistent (같이 늙음)
- 결혼 milestone + 자식 NPC spawn
- NPC encounter modal 의 personality outcome 분기
- NPC 사망 시 saga 의 큰 event

### V3-F
- Saga book modal 이 era 별 그룹핑
- 회춘 marker "재생 #K" divider 시각화
- Filter (era / event type) 작동
- 1000+ event 에서 scroll 부드러움

### 전체
- 모든 vitest + e2e PASS
- 1만 시간 곡선 가설 = V3-G 에서 측정 (이 phase 의 scope 아님)
- mobile UX (iphone14) 의 viewport scroll 자연스러움

---

## 12. 다음 phase (mega 후)

V3-G (1만시간 balance pass, 4-6h) — sim 측정 필요. 사용자 복귀 후 진행. headless sim 으로 1000 hour 시뮬 → maxLevel / realm 진행 / buff Lv / 회춘 빈도 측정 → magnitude tune.

— V3-DEF mega-phase sub-spec (2026-05-23, brainstorming 산출물)
