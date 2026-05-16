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
| Pre-cycle 지침 | **Loadout + Trait N슬롯 (성격/성향)** | Route / Behavior tag 폐기 → Trait 으로 흡수 |
| AI 의사결정 | **Hero 자율 (사주식)** — 사냥터 선택·깊이·후퇴·다음 던전 다 hero 가 결정 | User 의 input = trait 만 |
| Cycle 중 개입 | **100% 관조** (pause / abandon only) | 시작 후 봉인 |
| View | **도트맵 + 전투 zoom-in** (Phaser scene cut) | 한국 모바일 키우기류 + 임팩트 |
| 이벤트 source | **기존 자산 + 랜덤 인카운터 + Random Skill 획득** | 보스·드롭·레벨업·스토리·합성 + 상점·함정·사당·NPC·라이벌 + 사당·멘토·이정표·라이벌격파·흑주해독 으로 임시 skill |
| Hero personality | **독백·자기관찰·저주반응 dialogue layer** | trait 와 캐릭터별 voice 가 멘트 결정 |
| 메타 진행 | **풀 RPG 누적, 캐릭터 레벨 = inflation 곡선 (1→수만+) 매 사이클 리셋** | 영구 빌드 + 사이클 폭발 성장 |
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

## 4. Pre-cycle 지침 UI (2 panel)

User 는 명령 (Route) 대신 **성격 / 성향** 을 지정. Hero 가 그 성격을 embody 하여 자율 행동.

### 4.1 Loadout (기존 시스템 100% 재사용)

- 캐릭터 1명 (16 unlock 풀 중 1 선택)
- 장비 6 슬롯 (기존 inventory + 강화 + 합성 결과)
- Ascension build (10 노드 트리)
- 유물 N (10 중 영구 stack)
- Mythic N (30 중 equipped)

### 4.2 Trait Panel (성격 / 성향)

- **N 슬롯 (기본 3, 메타 progression 으로 확장 가능)**. Trait pool 일부는 처음 lock, 메타로 unlock.
- Trait 자체에 trade-off 내장 (cost 시스템 없이 trait 가 알아서 양면). 예: "시한부 역대급 천재" = 강한 buff + 강한 cost 한 trait.
- Trait 가 영향 주는 layer:
  1. **AI 의사결정** — 사냥터 선택 (도전적 vs 소극적), 깊이 / 후퇴 판단, 타겟팅 우선순위
  2. **Stat modifier** — HP·공격력·EXP gain·BP 소모율 등
  3. **Dialogue tone** — 독백 / 자기관찰 / 반응 멘트의 어조 결정 (호기롭게 / 조심스럽게 / 광기 등). **모든 dialogue 는 텍스트 only — voice acting 없음.** 화면 위 floating bubble 또는 side log 로 표시.
  4. **Encounter spawn 가중치** (탐험가 → 사당·보너스 챔버 ↑)
- 자세한 trait catalog 는 [§16](#16-trait-catalog-초안).

### 4.3 메타 power preview

Loadout + ascension + 유물 + mythic + trait 으로 계산된 base stat → "예상 cycle 길이 / hero 가 향할 던전 tier 예측 / max level 예상 범위" 표시.

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
                  ┌────────────────────┐
                  │  HeroDecisionAI    │ (pure TS)
                  │  - 사냥터 선택      │
                  │  - 깊이 / 후퇴 판단 │
                  │  - 타겟팅 / skill   │
                  │  - trait 기반       │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │  HeroDialogue      │ (pure TS)
                  │  - 독백 / 반응      │
                  │  - trait + char     │
                  │    voice → 텍스트   │
                  └─────────┬──────────┘
                            │
┌──────────────────────────────────────────────────┐
│  AutoBattleController (pure TS, Phaser 독립)    │
│  - tick(deltaMs)                                 │
│  - getEvents() → CycleEvent[]                    │
│  - getState() → CycleState                       │
│  - getResult() → CycleResult                     │
│  - HeroDecisionAI / HeroDialogue 통합            │
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
│ - dialogue UI   │          │ - speed unbounded  │
│ - timer 1x/2x/4x│          │ - dialogue log     │
└─────────────────┘          └────────────────────┘
```

**HeroDecisionAI** — trait + 현재 power + 환경 input → 결정 output. 사냥터 / 깊이 / 후퇴 / 타겟팅 / skill 발동 우선순위.

**HeroDialogue** — event + trait + character voice → 텍스트 멘트. Cycle 의 narrative voice. Voice acting 없음.

### 6.3 BattleScene 분리

기존 `BattleScene.doRound()` 의 핵심 로직 (resolver, skill, level-up) 을 pure 함수로 추출하여 controller 가 직접 호출 가능하게. Phaser 의존부 (sprite, tween, sound) 는 view 측에서 event-driven 으로.

### 6.4 두 실행 모드

- **Live (Phaser-rendered):** 실시간 timer 로 controller.tick(deltaMs) — speed multiplier 적용.
- **Sim (headless):** while loop 로 controller.tick(deltaMs) 무한 반복 — speed 무관, 결과만 수집.

### 6.5 신규 dev CLI + 로그 설계 (★ Claude 분석 가능성 핵심)

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle \
    --loadout '{"charId":"K01","equipped":{...},"ascension":{...},"relics":[...],"mythics":[...]}' \
    --traits 도전적,천재,위험을즐김 \
    --count 100 \
    --seed 42 \
    --out runs/2026-05-16-baseline.jsonl
```

**CycleEvent 스키마 (모든 event 가 JSONL line 으로 dump):**

```ts
type CycleEvent =
  | { t: number; type: 'cycle_start';   loadoutHash: string; traitIds: string[]; seed: number }
  | { t: number; type: 'tier_enter';    dungeonId: string; floor: number; reason: 'auto'|'forced' }
  | { t: number; type: 'encounter';     nodeType: 'enemy'|'boss'|'merchant'|'trap'|'shrine'|'npc'|'rival'|'rift'|'mentor'; payload: object }
  | { t: number; type: 'battle_start';  enemyId: string; isBoss: boolean; heroLv: number; heroHp: number; enemyHp: number }
  | { t: number; type: 'skill_fire';    skillId: string; isTemp: boolean; cooldownSec: number; targetIds: string[]; damage: number }
  | { t: number; type: 'enemy_hit';     enemyId: string; damage: number; remaining: number }
  | { t: number; type: 'hero_hit';      enemyId: string; damage: number; remaining: number }
  | { t: number; type: 'enemy_kill';    enemyId: string; expGain: number; goldGain: number; dropIds: string[] }
  | { t: number; type: 'level_up';      from: number; to: number; statDelta: object }
  | { t: number; type: 'drop_rare';     itemId: string; rarity: string; source: 'kill'|'shrine'|'merchant' }
  | { t: number; type: 'curse_applied'; modifierId: string; duration: number }
  | { t: number; type: 'curse_resolved';modifierId: string; outcome: 'expired'|'cleared'|'converted_to_skill'; skillId?: string }
  | { t: number; type: 'skill_acquired';skillId: string; via: 'shrine'|'merchant'|'milestone'|'curse'|'rival'|'rift'|'boss_drop'|'quest'; isTemp: boolean }
  | { t: number; type: 'rival_meet';    rivalId: string; meetCount: number }
  | { t: number; type: 'ai_decision';   reason: string; choice: string; powerEval: { hero: number; areaTier: number; ratio: number } }
  | { t: number; type: 'dialogue';      text: string; trait: string; emotionTag: string }
  | { t: number; type: 'bp_change';     delta: number; remaining: number; cause: string }
  | { t: number; type: 'cycle_end';     reason: 'bp_exhausted'|'abandoned'|'forced'; durationMs: number; maxLevel: number; finalState: object }
```

**CycleResult 요약 (cycle 종료 시 자동 계산):**

```ts
type CycleResult = {
  durationMs: number
  maxLevel: number              // inflation 곡선의 endpoint ★
  levelCurve: Array<{ t: number; lv: number }>  // time-series
  expCurve: Array<{ t: number; cumExp: number }>
  bpCurve: Array<{ t: number; bp: number }>
  kills: { total: number; byEnemyId: Record<string, number>; bossKills: number }
  drops: { byItemId: Record<string, number>; rarityHistogram: Record<string, number> }
  encounters: { byType: Record<string, number> }
  skillsAcquired: Array<{ skillId: string; via: string; lvAtAcquire: number }>
  cursesEncountered: Array<{ modifierId: string; outcome: string }>
  aiDecisions: { tierChanges: number; retreats: number; selfEvalEvents: Array<{ t: number; ratio: number }> }
  dialogue: Array<{ t: number; text: string; emotionTag: string }>
  rivalEncounters: Array<{ rivalId: string; outcome: string }>
}
```

**N cycle 집계 (--count > 1 시 자동):**

`runs/<file>.summary.json` 별도 산출 — 평균·중앙값·표준편차·percentile(p10/p50/p90)·히스토그램:
- maxLevel 분포 (inflation 곡선 검증)
- cycle duration 분포 (5–10분 target 확인)
- BP burn rate / 분당 EXP gain / 분당 kill count
- Skill acquisition rate (trigger별)
- Trait combination × maxLevel 매트릭스
- Encounter diversity index

**Claude 분석 워크플로:**
1. Claude 가 sim:cycle 실행 → JSONL + summary 산출
2. JSONL 을 grep/jq 로 검색하거나 summary.json 을 직접 read
3. 사용자에게 "데이터 보니 X 가 Y 임. tuning 제안: Z" 보고
4. 사용자 의견 받아 데이터 파일 (예: monsters.ts EXP 수치) 수정
5. 다시 sim → 변화 추적 → 수렴까지 반복

**전체 변수 조율 대상은 §11.5 (Balance Tuning 변수) 에서 정리.**

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

### Phase Sim-B — Trait System + HeroDecisionAI

- HeroDecisionAI pure TS (trait + power × 환경 → 결정)
- Trait pool 데이터 (`src/data/traits.ts`) — [§16](#16-trait-catalog-초안)
- TraitSelector UI (`CyclePrep.tsx` panel)
- AutoBattleController 확장 (Route 입력 제거, hero 자율 path)
- 메타 trait unlock token

### Phase Sim-C — Encounter Layer + Rival NPCs

- EncounterSystem (노드 spawn pool)
- Story type 확장: `merchant | trap | shrine | npc_join | rival | mentor`
- src/data/encounters.ts + src/data/npcs.ts (1–3 라이벌)
- EncounterModal (StoryModal 패턴)
- Rival mini-boss 등장 + 전용 jingle

### Phase Sim-D — Hero Personality + Random Skill (NEW)

- HeroDialogue pure TS (event × trait × voice → 텍스트, voice acting 없음)
- DialogueBubble UI (floating bubble + side log)
- 흑주 / 저주 반응 (Phase D effect-pipeline `src/systems/effects.ts` 의 34 modifier 연결)
- TempSkillSlots (cycle 내 임시 skill slot 3 추가)
- Random skill 획득 trigger 풀: 사당 / 방랑상인 / 멘토 / 레벨 이정표 / 흑주 해독 / 라이벌 격파 / compass / 보스 드롭 / 퀘스트
- 일부 특수 인카운터 → 영구 unlock (메타)

### Phase Sim-E — Meta Progression Rework

- endCycle (gameStore.ts:453-470 endRun 재설계): 캐릭터 레벨 → 1 reset, gold/material/EXP 일부 → meta transfer, ascension XP, trait unlock token
- Persist v15 → v16 (필요 시)
- 퀘스트 재해석: cycle-based counter (`meta.questProgress[].cyclesCompleted`)
- CycleResultScreen (drop list, kill count, **사이클 max level (inflation ★)**, 인카운터 history, dialogue highlight, 다음 cycle trait 추천)

### Phase Sim-F — Cinematic Polish + Sound + Tutorial + 배속 UI

- 보스 cut-in 강화, 레벨업 cinematic (lightweight — inflation 곡선상 수십~수백 번 발동)
- SCREEN_BGM 맵 확장: `town | cycle-map | cycle-battle | boss-battle | rival-jingle | victory`
- TutorialOverlay 재작성 (hero simulator 컨셉)
- SpeedToggle UI (1x/2x/4x)
- (옵션) `?devSpeed=1000` URL param (production 비활성)

### Phase Sim-G — Balance Pass (headless sim 으로 실측 + 협업 조율 ★)

핵심 phase — 본 게임 정체성 (inflation 곡선 + cycle 호흡 + trait 균형) 의 fine-tune. **Claude–사용자 협업 iterative 루프**.

- Claude 가 `sim:cycle` 로 수백–수천 cycle 돌려 metric 수집 → 분석 → tuning 제안 → 사용자 검토 → 수치 조정 → 다시 sim. 반복.
- 조율 대상 변수 (사용자 명시 — 전체적으로 협업):
  - 베이스 레벨 성장 속도 (inflation 곡선 기울기)
  - EXP 획득량 (몬스터별·tier별)
  - 아이템 획득률 (rarity 분포)
  - 사이클 평균 max level (얇은 빌드 vs 두꺼운 빌드)
  - 사이클 평균 duration (5–10분 target)
  - BP burn rate (per-encounter cost)
  - Trait 강도 (시한부 역대급 천재 같은 extreme trait 의 cost/benefit ratio)
  - Random skill 획득 빈도 + 영구 unlock 비율
  - Rival 등장 cadence
  - 메타 power × 권장 던전 tier 곡선
- 산출: `docs/balance-sim/phase-sim-g-report.md` (라운드별 측정·결정 누적)

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
  HeroDecisionAI.ts        — Phaser 독립, trait 기반 자율 결정 (사냥터/깊이/후퇴/타겟팅)
  HeroDialogue.ts          — Phaser 독립, event × trait × voice → 텍스트 멘트
  EncounterSystem.ts       — Phaser 독립, 노드 spawn + auto-resolve
  TempSkillSlots.ts        — cycle 내 임시 skill slot 관리
  cycleEvents.ts           — event stream type 정의
  DungeonMapScene.ts       — Phaser view (controller 구독)
  cycleSlice.ts            — zustand slice
src/data/
  encounters.ts            — 인카운터 데이터
  npcs.ts                  — 라이벌 / 동료 / 멘토 NPC
  traits.ts                — trait pool (성격/성향)
  dialogue.ts              — voice × trait × event 멘트 풀
src/screens/
  CyclePrep.tsx            — loadout + trait selector UI
  CycleRunner.tsx          — 도트맵 view 래퍼 (배속 토글, dialogue bubble)
  CycleResult.tsx          — 사이클 결과 요약 (max level + dialogue highlight)
src/components/
  EncounterModal.tsx       — 인카운터 cut-in (StoryModal 패턴)
  TraitSelector.tsx        — N 슬롯 trait 선택
  DialogueBubble.tsx       — 화면 위 floating bubble + side log
  SpeedToggle.tsx          — 1x / 2x / 4x (+ dev x1000)
scripts/
  sim-cycle.ts             — headless sim CLI (dialogue log 포함)
docs/balance-sim/
  phase-sim-g-report.md    — Phase Sim-G 산출물 (Claude 작성)
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

## 11.5. Balance Tuning 변수 — Claude / 사용자 협업 (Phase Sim-G 의 핵심)

본 게임은 inflation-rpg 인 만큼 숫자 곡선의 정밀 tuning 이 정체성. **Claude 가 headless sim 으로 데이터 수집·분석·제안, 사용자가 게임 디자이너 관점에서 검토·결정** 하는 반복 루프로 조율. 다음 변수 모두 협업 대상:

### 11.5.1 Inflation 곡선 (★ 최우선)

- 사이클 내 base level growth rate (1 → 수만/수십만 도달 곡선 기울기)
- 메타 power × 사이클 max level 의 관계식 (얇은 빌드 vs 두꺼운 빌드)
- Tier별 권장 진입 메타 power 임계값
- 레벨업 시 스탯 증가량 (HP / ATK / DEF / SPD)
- 스킬 cooldown / 데미지 멀티플라이어 의 레벨 스케일링

### 11.5.2 EXP / 보상 곡선

- 몬스터별 EXP gain (tier · region · enemy type 별)
- Gold drop (per kill + chest + shrine)
- Item drop rate × rarity 분포 (common → mythic)
- 보스 처치 보너스 (EXP, gold, item, ascension XP)
- Drop quality 의 메타 power dependency (under-leveled hero 의 drop quality?)

### 11.5.3 Cycle 호흡

- BP 시작값 + 메타 진행에 따른 max BP 확장
- Per-encounter BP cost (일반 / 엘리트 / 보스 / 인카운터)
- 사이클 평균 duration (target = 5–10분)
- Encounter spawn density (per floor)
- 도트맵 floor 당 노드 count

### 11.5.4 Trait 균형

- 각 trait 의 effect magnitude (예: 천재 = EXP +20% 가 적정? 30%?)
- 시한부 역대급 천재 같은 extreme trait 의 risk/reward ratio
- Trait 슬롯 N 의 default + 메타 확장 cap
- Trait unlock cadence (몇 cycle 후?)
- Trait combination meta — 강력한 시너지 / 더는 dominant 못하게 막기

### 11.5.5 Random Skill 시스템

- Cycle 내 평균 임시 skill 획득 수
- 획득 trigger 별 빈도 (사당 vs 흑주해독 vs 보스 vs ...)
- 영구 unlock 비율 (1%? 5%? per cycle?)
- 임시 skill vs base skill 의 power 차이 (임시가 너무 약하면 무의미)
- 흑주 → skill 전환의 risk/reward

### 11.5.6 NPC / 라이벌 / 인카운터

- Rival 등장 cadence (cycle count 함수)
- Rival 의 power scaling (메타 power 따라가게)
- 인카운터 type 별 spawn rate
- 인카운터 reward 의 cycle 진행도 dependency

### 11.5.7 Dialogue / Personality (정성적, 그래도 metric 가능)

- Cycle 당 평균 멘트 발생 수
- Trait × event 의 멘트 다양성 (한 trait 의 멘트 repeat 빈도)
- Bubble display duration / fade timing

각 round 마다 Claude 가 sim 데이터 + 제안 보고서 작성 (`docs/balance-sim/round-N-<topic>.md`), 사용자 검토 후 수치 commit. Phase Sim-G 가 끝나는 시점 = 모든 곡선이 spec 의도 안에 들어왔을 때.

---

## 12. Open Questions (잔존)

다음 phase plan 작성 시 결정:

- **Q-A. EXP transfer policy:** 캐릭터 레벨 리셋 시 사이클 EXP 전부 버림? 일부 ascension XP 로 변환? 또는 cycle 내 max level → meta 의 "캐릭터 마스터리" 로 적립?
- **Q-B. 사이클 시작 던전 결정 주체:** Hero 가 trait 따라 자동 선택? 또는 user 가 출발 region 만 정함? (자율의 극단 vs 최소 user input)
- **Q-C. 라이벌 NPC 의 첫 등장 트리거:** Cycle count? Boss kill? Story progress?
- **Q-D. 배속 적용 범위:** 사이클 안의 cut-in (스토리, 보스 등장, dialogue bubble) 도 배속? 또는 cut-in 은 항상 1x 유지?
- **Q-E. Cycle 중간에 BP refill 광고/IAP:** 가능? 또는 한 cycle 안에선 BP 추가 충전 불가 (다음 cycle 시작 시만)?
- **Q-F. Trait 슬롯 N의 초기값:** 3 → 메타 확장 5? 또는 처음부터 5? Trade-off 강도와 직결.
- **Q-G. 영구 unlock 으로 이어지는 인카운터 비율:** Random skill 의 1%? 5%? "전설 사당" 같은 rare drop 빈도.

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
- **R3. 5–10분 cycle 호흡이 의도대로 안 나옴.** Mitigation: Phase Sim-A 단계부터 sim:cycle 으로 실측, Phase Sim-G 에서 본격 tuning.
- **R4. 라이벌 NPC 콘텐츠 부족.** Mitigation: Phase Sim-C 에선 1–3 캐릭터만, 후속 콘텐츠 phase 에서 확장.
- **R5. 기존 e2e 테스트 60개 중 다수 깨짐.** Mitigation: 각 phase 별로 e2e 재작성 task 포함.

---

## 15. 다음 단계

1. ☑️ 이 spec commit (feat/hero-simulator-pivot 브랜치)
2. ☐ User 가 spec 검토 + 수정 요청
3. ☐ writing-plans skill 으로 `docs/superpowers/plans/phase-sim-a-plan.md` 작성
4. ☐ subagent-driven-development 로 Phase Sim-A 실행
5. ☐ Phase Sim-A 머지 + `phase-sim-a-complete` 태그
6. ☐ B → C → D → E → F → G 순차 진행

---

## 16. Trait Catalog 초안 (Phase Sim-B 에서 정식 데이터화)

사용자가 제안한 6개 + 추가 후보를 한 풀로 정리. 각 trait 는 trade-off 내장. 강도 / cost / unlock 조건은 Phase Sim-G 에서 sim 으로 튜닝.

| ID | 이름 | 효과 (양) | 효과 (음 / cost) | Dialogue tone | Unlock |
|---|---|---|---|---|---|
| t_challenge | 도전적 | 강한 적 추구. 깊은 던전 자율 진입 ↑. EXP 받는 양 ↑ | 위험 회피 ↓ → 사망 위험 ↑ | 호기롭게, 도발 | base |
| t_timid | 소극적 | 안전한 적부터. 후퇴 빠름. 생존율 ↑ | 강한 적 회피 → 깊은 던전 도달 ↓ | 조심스럽게, 떨림 | base |
| t_thrill | 위험을 즐김 | 함정 / 고위험 노드 우선. 보스 우선 추구. crit ↑ | DEF -10% | 즐기듯이, 광기 | base |
| t_genius | 천재 | EXP gain +20% (Sim-G 튜닝). 레벨업 시 +1 추가 스탯 | 없음 (pure buff). 슬롯 1개 차지 | 통찰력, 자신만만 | base |
| t_fragile | 허약함 | (없음 — 슬롯 비용 음수, 다른 trait 강화) | HP -30%, DEF -20% | 약한 척, 자조 | base |
| t_terminal_genius | 시한부 역대급 천재 | EXP +50%, 전체 스탯 +30%, 레벨업 속도 ↑ | BP 소모 2배. 사이클 절반 길이로 강제 종료 | 자조, 비관, 광기 | rare unlock (cycle N 이상) |
| t_explorer | 탐험가 | 보너스 챔버 / 사당 / 멘토 노드 spawn rate ↑. 인카운터 자율 진입 ↑ | 메인 전투 시 +0 (수평 trait) | 호기심, 관찰 | base |
| t_berserker | 광전사 | HP 낮을수록 공격력 ↑ (max +50% at HP < 30%) | 회복 스킬 효과 -30% | 호전적, 분노 | base |
| t_miser | 수전노 | gold drop +20%. drop item rarity ↑ | 포션 / 균열석 사용 자제 | 인색, 계산적 | base |
| t_boss_hunter | 보스 사냥꾼 | 보스 추적 우선. 보스에게 데미지 +30% | 일반 적 회피 → 사이클 EXP 분포 변동 ↑ | 결의, 집념 | mid unlock |
| t_fortune | 운명론자 | crit / 행운 +20%. rare drop rate ↑ | 회복 능력 -20% (운에 맡김) | 운명적, 시적 | mid unlock |
| t_zealot | 광신도 | 사당 / NPC / 균열 효과 +50% (영구 unlock 확률 ↑) | 일반 적 EXP -10% | 신실, 광적 | rare unlock |
| t_swift | 신속 | 이동·전투 SPD +30%. cycle duration 단축 가능성 | 데미지 -15% | 경쾌, 자신감 | base |
| t_iron | 강철의지 | DEF +30%, 흑주 저항 +50% | 공격력 -15% | 묵직, 강직 | base |
| t_prodigy | 후천적 영재 | cycle 후반 (BP < 50%) 부터 EXP ×3, 스탯 +20% | cycle 전반은 페널티 (-10% 모든 스탯) | 잠재력, 각성 | mid unlock |
| t_lucky | 행운아 | 모든 random 굴림에 약한 양 buff. 인카운터 random skill 획득 +1 보너스 | base | base |

**Trait 슬롯 정책:** 기본 3 슬롯, 메타 unlock token 으로 최대 5 까지 확장 가능 ([Q-F](#12-open-questions-잔존)).

**중요 — Trait 가 hero 의 사냥터 선택에 직접 영향:**
- 도전적 / 보스 사냥꾼 / 시한부 천재 → 더 깊은 던전 자율 진입
- 소극적 / 허약함 / 신중 류 → 얕은 던전부터 안전하게
- 탐험가 / 광신도 → 인카운터 노드 우선 (직선 진행 안 함)

이게 곧 §6 의 HeroDecisionAI 의 input.
