# Hero Simulator Pivot — inflation-rpg manual → auto

**Status:** Design (브레인스토밍 산출물)
**Date:** 2026-05-16
**Author:** kwanghan-bae + Claude (Opus 4.7)
**Base commit:** `303e5f0` (phase-5-complete)
**Branch:** `feat/hero-simulator-pivot`

---

## 1. Context

inflation-rpg 는 `phase-5-complete` 까지 manual play loop 로 진행됐다 — 직접 던전·floor 선택, 직접 장비 교체, 직접 사이클 운영. 사용자가 컨셉을 **auto hero simulator (용사 시뮬레이터)** 로 pivot 하기로 결정했다.

**왜 pivot 인가:**
- 트렌드 정합 — 한국 모바일 시장에서 자동전투 / idle / 키우기류가 메인스트림 (둠앤디스트로이어·검은사막 키우기·세븐나이츠 키우기·메이플 m).
- 자산 활용 — 이미 쌓인 깊은 시스템 (16 캐릭터 · 32 스킬 · 41 장비 · 109 보스 · 26 스토리 · 28 quest · 10 ascension · 30 mythic · 10 유물) 이 manual play 에선 피로 요인이었지만 **auto 에선 "내 빌드가 알아서 굴러가는 카타르시스"** 로 전환.
- 코드 ready — `BattleScene.doRound()` 가 이미 600ms 자동 timer (BattleScene.ts:154). 스킬도 cooldown 기반 auto-fire (SkillSystem.ts). Manual 느낌은 대부분 out-of-battle UX 에 있고, in-battle 은 시뮬레이션 ready 상태.

**핵심 카타르시스 — inflation 정체성 유지:** 게임 이름이 `inflation-rpg` 인 만큼, 1 cycle 안에 **1 → 수만/수십만 레벨의 인플레이션 곡선**이 핵심. 강한 몬스터를 처치할수록 EXP 가 거대하게 들어와 폭발적 성장. 누적된 메타 (장비·강화·합성·ascension·유물·mythic) 가 두꺼울수록 사이클 시작 시 1레벨이어도 빠르게 강한 적을 잡을 수 있게 되고 → 거대 EXP → 폭발 성장 → 더 깊은 사냥터 도달. 메타가 얇으면 약한 적만 잡다 BP 소진 → 천천히 메타 누적. 기존 `bestRunLevel >= 100k` hardmode gate 가 곧 inflation 곡선의 증거.

---

## 2. 의사결정 요약 (브레인스토밍 결과)

| 항목 | 결정 | 비고 |
|---|---|---|
| 사이클 단위 | **BP 소진 = 1 cycle** | 기존 BP 시스템 reframe |
| 호흡 | **5–10분**, Active-watch | 앱 켜놔야 진행, offline 누적 없음 |
| Pre-cycle 지침 | **Loadout + Route (3 step queue) + Behavior (3/6 tag)** | B+C 하이브리드 축소판 |
| Cycle 중 개입 | **100% 관조** (pause / abandon only) | "사주식" — 시작 후 봉인 |
| View | **도트맵 + 전투 zoom-in** (Phaser scene cut) | 한국 모바일 키우기류 + 임팩트 |
| 이벤트 source | **기존 자산 + 랜덤 인카운터 layer** | 보스·드롭·레벨업·스토리·합성 + 상점·함정·사당·NPC·라이벌 |
| 메타 진행 | **풀 RPG 누적, 단 캐릭터 레벨은 사이클마다 1부터 리셋** | 빠른 성장 곡선 visualization + 영구 빌드 |
| Hero 수 | **1명** (선택된 캐릭터) | "용사 시뮬레이터" 어감 |
| 라이벌 / 빌런 | **1–3 persistent NPC**, 인카운터로 반복 등장 | 신규 데이터 + 영구 history |
| Sound | BGM transition (town → map → battle → boss → rival jingle) | SoundManager 확장 |
| 배속 시스템 | User-facing 1x / 2x / 4x | "계속 쳐다보기" 호흡 조절 |
| Headless simulation | **AutoBattleController 는 Phaser 독립 pure TS** | Claude 가 직접 sim 실측 가능 |

---

## 3. Core Loop (1 cycle)

```
┌────────────────────────────────────────────────────────────┐
│  Town (지침 세팅)         │  Cycle (관조)        │  결과     │
├────────────────────────────────────────────────────────────┤
│ Loadout                  │ 도트맵 위 hero 자동  │ Drop      │
│ Route 3 step             │ 이동 → 노드 만나면   │ Material  │
│ Behavior 3/6 태그        │ 인카운터 / 전투      │ Gold      │
│ "출발" 버튼              │ zoom-in cut          │ Meta XP   │
│                          │ BP 소진 → 종료       │ Story 해금│
└────────────────────────────────────────────────────────────┘
                          ↓
              메타 영구 누적 + 캐릭터 레벨 리셋
                          ↓
                       다음 사이클
```

**캐릭터 레벨 정책 (inflation 곡선):** 사이클 내 **1 → 수만~수십만** 의 인플레이션 성장. 강한 몬스터를 잡으면 거대 EXP gain (기존 게임 그대로). **사이클 종료 시 1 로 리셋** (사용자 결정 — "다시 1부터 시작해야지 그래야 제한된 BP 내에 엄청나게 성장해나가는게 계속 보이지"). 도달 가능 max level 은 메타 power × 도달 사냥터 tier 의 함수. 사이클 EXP transfer 정책은 [Q-A](#12-open-questions-잔존) 에서 phase plan 시 결정.

**영구 누적:** gold / 강화 재료 / 장비 / ascension XP / 유물 진행도 / mythic / 캐릭터 unlock / 스토리 / 퀘스트 진행. **이게 곧 다음 사이클의 base power** — 누적이 두꺼울수록 사이클 시작 시점부터 강한 적 처치 가능 → 인플레이션 출발선이 높아짐 → 더 깊은 사냥터·더 큰 레벨 도달.

**BP regen:** 시간 기반 (기존 광고 시청 + 균열석 IAP 자산 재사용).

---

## 4. Pre-cycle 지침 UI (3 panel)

### 4.1 Loadout (기존 시스템 100% 재사용)

- 캐릭터 1명 (16 unlock 풀 중 1 선택)
- 장비 6 슬롯 (기존 inventory + 강화 + 합성 결과)
- Ascension build (10 노드 트리)
- 유물 N (10 중 영구 stack)
- Mythic N (30 중 equipped)

### 4.2 Route Queue

- **3 step drag-drop**. 각 step:
  ```ts
  { dungeonId: string, exitCondition: ExitCondition }
  ```
- ExitCondition 프리셋:
  - `floor_clear: { count: number }` — N floor 클리어 시 step 종료
  - `boss_kill: { bossId: string }` — 특정 보스 처치 시
  - `resource_n: { resource: 'gold'|'material'|'enhance_stone', count: number }`
  - `bp_threshold: { remaining: number }` — BP X% 남으면
- Step 간 transition: 다음 step 의 던전으로 자동 이동 (town 경유 옵션 가능)

### 4.3 Behavior Tags

- **6 태그 풀 / 3 슬롯**. 슬롯 cap → 트레이드오프 발생.

| 태그 | 효과 |
|---|---|
| 신중함 | HP < 임계값 시 회복 스킬·포션 우선, 회피 우선 |
| 공격적 | Ultimate 즉시 발동, 도주 안함 |
| 수전노 | 포션·균열석 사용 자제, 골드 우선 |
| 탐험가 | 보너스 챔버·사당 노드 우선 방문 |
| 약한적 우선 | 타겟팅 시 HP 낮은 적부터 |
| 보스 우선 | 타겟팅 시 보스부터 |

### 4.4 메타 power preview

Loadout + ascension + 유물 + mythic 으로 계산된 base stat → "예상 cycle 길이 / 권장 던전 tier" 표시. "내 빌드로 어디까지 가능?" 의 visualization.

---

## 5. Cycle 중 View — 도트맵 + 전투 zoom-in

### 5.1 메인 view (DungeonMapScene)

- 위에서 본 던전 floor 도트맵 (Phaser scene). Hero token + 노드.
- 노드 종류:
  - 적 (일반 / 엘리트 / 보스)
  - 상점 (방랑 상인)
  - 함정 (HP/골드 감소)
  - 보너스 챔버 (자원 폭딸)
  - 사당 (랜덤 buff/debuff)
  - NPC (동료 합류 / 거래 / 협상)
  - 라이벌 (mini-boss 등장)
  - 차원 균열 (compass mini/major)
  - Exit (다음 floor / 다음 route step)

### 5.2 이벤트 layer

- 전투 노드 도달 → BattleScene zoom-in cut → 자동 전투 → 결과 → map 복귀
- 보스 → cinematic cut-in + dramatic transition
- 인카운터 → 짧은 modal (EncounterModal, StoryModal 패턴 재사용). Auto-resolve (behavior tag 따라 선택).
- 레벨업 / 희귀 드롭 / 스킬 unlock → popup overlay (map 위)
- 스토리 트리거 (region enter / boss defeat) → 기존 StoryModal 재활용

### 5.3 HUD

- HP·SP·LV (사이클 내 1→N)
- BP remaining (사이클 종료 임박 표시)
- 현재 step + route progress
- 배속 토글 (1x / 2x / 4x)
- Pause / Abandon

---

## 6. 아키텍처 — Controller/View 분리 (★ 중요)

### 6.1 동기

- 사용자용 배속 (1x/2x/4x) 외에 **dev/test headless mode** 가 필요 — 사이클 호흡 tuning, balance metric 수집, regression test.
- Claude 가 직접 sim 을 실행하여 cycle duration / floor 도달 / drop 분포 등을 실측한 후 tuning 제안하려면 Phaser 의존성 없이 Node 에서 단독 import 가능해야 한다.

### 6.2 설계

```
┌──────────────────────────────────────────────────┐
│  AutoBattleController (pure TS, Phaser 독립)    │
│  - tick(deltaMs)                                 │
│  - getEvents() → CycleEvent[]                    │
│  - getState() → CycleState                       │
│  - getResult() → CycleResult                     │
│  - Deterministic seed                            │
└──────────────────────────────────────────────────┘
        ▲                              ▲
        │                              │
┌─────────────────┐          ┌────────────────────┐
│ DungeonMapScene │          │ scripts/sim-cycle  │
│ (Phaser view)   │          │ (Node CLI)         │
│ - subscribe to  │          │ - while loop tick  │
│   events        │          │ - collect stats    │
│ - render anim   │          │ - JSONL output     │
│ - timer 1x/2x/4x│          │ - speed unbounded  │
└─────────────────┘          └────────────────────┘
```

### 6.3 BattleScene 분리

기존 `BattleScene.doRound()` 의 핵심 로직 (resolver, skill, level-up) 을 pure 함수로 추출하여 controller 가 직접 호출 가능하게. Phaser 의존부 (sprite, tween, sound) 는 view 측에서 event-driven 으로.

### 6.4 두 실행 모드

- **Live (Phaser-rendered):** 실시간 timer 로 controller.tick(deltaMs) — speed multiplier 적용.
- **Sim (headless):** while loop 로 controller.tick(deltaMs) 무한 반복 — speed 무관, 결과만 수집.

### 6.5 신규 dev CLI

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle \
    --loadout default \
    --route tier3-x3 \
    --behavior 신중,공격,탐험 \
    --count 100 \
    --seed 42
```

출력: JSONL 또는 표 — cycle duration, floor reached, drops, encounters, deaths, EXP curve, BP burn rate.

---

## 7. Phase 분할

각 phase 는 별도 spec + plan + subagent-driven 실행 (기존 워크플로 유지).

### Phase Sim-A — Vertical Slice + Headless Sim (skeleton)

1 캐릭터 / 1 던전 / 5분 cycle 의 end-to-end watch flow + headless sim CLI.

- `AutoBattleController` pure TS (Phaser 독립)
- `DungeonMapScene` view-only
- BattleScene 의 resolver/skill 로직 pure 함수 추출
- `cycleState` zustand slice
- Persist v15 migration
- UI: MainMenu → CyclePrep (loadout 최소) → CycleRunner → CycleResult
- `scripts/sim-cycle.ts` CLI 진입점

**검증:** typecheck / test / e2e / sim:cycle --count 10 (cycle duration 5–10분 범위 확인) / 수동 dev-shell 관조.

### Phase Sim-B — Route Queue + Behavior Tags

- RoutePlanner UI (3 step drag-drop)
- BehaviorAI pure TS (6 태그 → priority weight)
- AutoBattleController 확장 (multi-step + behavior)
- SkillSystem `chooseNextSkill(state, tags)` priority layer

### Phase Sim-C — Encounter Layer + Rival NPCs

- EncounterSystem (노드 spawn pool)
- Story type 확장: `merchant | trap | shrine | npc_join | rival`
- src/data/encounters.ts + src/data/npcs.ts (1–3 라이벌)
- EncounterModal (StoryModal 패턴)
- Rival mini-boss 등장 + 전용 jingle

### Phase Sim-D — Meta Progression Rework

- endCycle (gameStore.ts:453-470 endRun 재설계): 캐릭터 레벨 리셋, gold/material/EXP 일부 → meta transfer
- Persist v15 → v16 (필요 시)
- 퀘스트 재해석: cycle-based counter (`meta.questProgress[].cyclesCompleted`)
- CycleResultScreen (drop list, kill count, 도달 floor, 인카운터 history, 다음 cycle 추천)

### Phase Sim-E — Cinematic Polish + Sound + Tutorial + 배속 UI

- 보스 cut-in 강화, 레벨업 cinematic (lightweight)
- SCREEN_BGM 맵 확장: `town | cycle-map | cycle-battle | boss-battle | rival-jingle | victory`
- TutorialOverlay 재작성 (hero simulator 컨셉)
- SpeedToggle UI (1x/2x/4x)
- (옵션) `?devSpeed=1000` URL param (production 비활성)

### Phase Sim-F — Balance Pass (headless sim 으로 실측)

- Claude 가 `sim:cycle` 로 수백–수천 cycle 돌려 metric 수집
- 5–10분 cycle 호흡 tuning
- **Inflation 곡선 검증** — 메타 power 별로 사이클 종료 시 도달 max level 분포가 의도된 곡선 (얇은 빌드: 수천 / 두꺼운 빌드: 수십만+) 을 따르는지
- 메타 power × 권장 던전 tier 곡선
- 신규 metric: cycle 평균 duration, **사이클 max level 분포 (inflation 검증 ★)**, floor 도달 분포, encounter diversity, rival 등장 빈도, BP burn rate, EXP curve, drop tier 분포
- 산출: `docs/balance-sim/phase-sim-f-report.md`

---

## 8. 재활용 자산 (그대로 살아남)

| 시스템 | 파일 | 비고 |
|---|---|---|
| BattleScene 자동전투 | `games/inflation-rpg/src/battle/BattleScene.ts:94-414` | resolver/skill 만 pure 함수 추출 |
| SkillSystem | `src/battle/SkillSystem.ts:1-84` | priority layer (BehaviorAI) 만 추가 |
| Resolver | `src/battle/resolver.ts` | 그대로 |
| BP / Run state | `src/store/gameStore.ts:50-66, 441-478` | "cycle" 의미로 reframe |
| Persist v14 | `src/store/gameStore.ts:1170-1176` | v15 마이그레이션 |
| Ascension / 유물 / Mythic / Crafting / 강화 | `gameStore.ts:721-911, 990-1006` | 그대로 |
| Story system | `src/components/StoryModal.tsx`, `src/data/stories.ts`, `gameStore.pendingStoryId` | type 확장 (types.ts:327) |
| Sound | `src/systems/sound.ts:80-90` SCREEN_BGM | 맵 확장 |
| Compass (차원 균열) | `gameStore.compassOwned` | 인카운터 노드로 통합 |
| MonetizationService | Phase 5 자산 | BP refill 광고 / 균열석 결제 그대로 |
| Tutorial 인프라 | `src/components/TutorialOverlay.tsx` | flow 재작성 |
| Sound assets | `public/sounds/` (Phase 4b) | 그대로 + 신규 boss/rival BGM 추가 |
| 16 캐릭터 / 32 스킬 / 109 보스 / 41 장비 / 26 스토리 / 28 quest 데이터 | `src/data/*` | 그대로 |

---

## 9. 제거 / Deprecated

- 직접 floor 선택 (`DungeonFloors.tsx`) — Route 가 대체. (단 "Route step preview" 용도로 단순화 재활용 가능)
- 기존 `MainMenu → Dungeon → Battle` flow — `MainMenu → CyclePrep → CycleRunner → CycleResult` 로 교체
- (skill button UI 가 있다면) `Battle.tsx` 의 manual skill trigger
- 기존 quest UI 의 cycle-unaware 표시

---

## 10. 신규 컴포넌트 / 파일

```
src/cycle/
  AutoBattleController.ts  — Phaser 독립 pure TS simulator (★ headless ready)
  BehaviorAI.ts            — Phaser 독립, 태그 기반 priority
  EncounterSystem.ts       — Phaser 독립, 노드 spawn + auto-resolve
  cycleEvents.ts           — event stream type 정의
  DungeonMapScene.ts       — Phaser view (controller 구독)
  cycleSlice.ts            — zustand slice
src/data/
  encounters.ts            — 인카운터 데이터
  npcs.ts                  — 라이벌 / 동료 NPC
  routes.ts                — route preset templates
  behaviorTags.ts          — 6 태그 정의 + priority weights
src/screens/
  CyclePrep.tsx            — loadout + route + behavior UI
  CycleRunner.tsx          — 도트맵 view 래퍼 (배속 토글)
  CycleResult.tsx          — 사이클 결과 요약
src/components/
  EncounterModal.tsx       — 인카운터 cut-in (StoryModal 패턴)
  RouteEditor.tsx          — 3 step queue UI
  BehaviorTagSelector.tsx  — 3/6 슬롯
  SpeedToggle.tsx          — 1x / 2x / 4x (+ dev x1000)
scripts/
  sim-cycle.ts             — headless sim CLI
docs/balance-sim/
  phase-sim-f-report.md    — Phase Sim-F 산출물 (Claude 작성)
```

---

## 11. 검증 (end-to-end)

각 phase 끝:
- `pnpm --filter @forge/game-inflation-rpg typecheck`
- `pnpm --filter @forge/game-inflation-rpg test`
- `pnpm --filter @forge/game-inflation-rpg e2e`
- `pnpm --filter @forge/game-inflation-rpg build:web` (정적 export)
- 수동: dev-shell 띄우고 1 cycle 끝까지 관조

Phase Sim-A 끝부터:
- `pnpm --filter @forge/game-inflation-rpg sim:cycle --count 10` 통과 + cycle duration 분포가 5–10분 ± 30% 안에 들어옴

Phase Sim-F 끝:
- 수백–수천 cycle metric 분석
- Phase 5a-1 (원스토어 native) 와 결합성 (BP refill IAP 가 cycle 모델에서도 동작)

---

## 12. Open Questions (잔존)

다음 phase plan 작성 시 결정:

- **Q-A. EXP transfer policy:** 캐릭터 레벨 리셋 시 사이클 EXP 전부 버림? 일부 ascension XP 로 변환? 또는 cycle 내 max level → meta 의 "캐릭터 마스터리" 로 적립?
- **Q-B. Route step transition:** Step 간 hero 가 town 경유? 또는 다음 던전으로 즉시 텔레포트? UX vs 시간 비용.
- **Q-C. 라이벌 NPC 의 첫 등장 트리거:** Cycle count? Boss kill? Story progress?
- **Q-D. 배속 적용 범위:** 사이클 안의 cut-in (스토리, 보스 등장) 도 배속? 또는 cut-in 은 항상 1x 유지?
- **Q-E. Cycle 중간에 BP refill 광고/IAP:** 가능? 또는 한 cycle 안에선 BP 추가 충전 불가 (다음 cycle 시작 시만)?

---

## 13. Out of Scope (이번 pivot 에서 다루지 않음)

- Offline progression (앱 꺼놔도 누적)
- Multi-hero party (1명 hero focus)
- PvP / 길드 (single-player 유지)
- 신규 캐릭터·보스·스킬 콘텐츠 (기존 자산 재활용)
- Cloud save (로컬 persist 만)
- Phase 5b/5c/5a-1 (각자 별도 트랙)

---

## 14. 위험 / Tradeoff

- **R1. Manual 게임 즐기던 기존 유저 이탈.** Mitigation: 일부 "manual mode" 토글 옵션 유지 검토 가능 — 그러나 코드 복잡도 ↑. 현 권장은 manual mode 제거 (pivot 의 본질).
- **R2. Controller/View 분리 도중 BattleScene refactor 리스크.** Mitigation: Phase Sim-A 의 핵심 디자인 작업이며, BattleScene 의 pure 함수 추출은 점진적으로 (resolver 먼저, skill 다음).
- **R3. 5–10분 cycle 호흡이 의도대로 안 나옴.** Mitigation: Phase Sim-A 단계부터 sim:cycle 으로 실측, Phase Sim-F 에서 본격 tuning.
- **R4. 라이벌 NPC 콘텐츠 부족.** Mitigation: Phase Sim-C 에선 1–3 캐릭터만, 후속 콘텐츠 phase 에서 확장.
- **R5. 기존 e2e 테스트 60개 중 다수 깨짐.** Mitigation: 각 phase 별로 e2e 재작성 task 포함.

---

## 15. 다음 단계

1. ☑️ 이 spec commit (feat/hero-simulator-pivot 브랜치)
2. ☐ User 가 spec 검토 + 수정 요청
3. ☐ writing-plans skill 으로 `docs/superpowers/plans/phase-sim-a-plan.md` 작성
4. ☐ subagent-driven-development 로 Phase Sim-A 실행
5. ☐ Phase Sim-A 머지 + `phase-sim-a-complete` 태그
6. ☐ B → C → D → E → F 순차 진행
