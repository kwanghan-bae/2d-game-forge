# Hero Simulator v2 — 신과 용사 (Open World 자유 이동)

**Status:** Design (brainstorming v2 산출물)
**Date:** 2026-05-16
**Author:** kwanghan-bae + Claude (Opus 4.7)
**Base commit:** `8d5dd26` (main HEAD — Sim-A/B + Sim-G baseline merged)
**Branch:** `feat/hero-simulator-v2-pivot`

---

## 0. 이 spec 의 의미 — Sim-A/B 의 큰 pivot

Sim-A/B (2026-05-16 phase-sim-b-complete 까지) 는 **추상 BP simulator** 를 만들었다. AutoBattleController 가 placeholder enemy 를 spawn → kill → cycle_end 의 abstract loop 를 돌리고, React 텍스트 로그가 view 였다.

사용자 (kwanghan-bae) 의 의도는 처음부터 **"AI 가 기존 inflation-rpg 의 모든 시스템을 자동으로 플레이하는 것"** 이었고, brainstorming v2 에서 그게 더 깊은 vision 으로 확장되었다:

> **사용자 = 후원하는 신, 용사 = 자유의지 가진 인간, 한 cycle = 한 사람의 일대기.**

Sim-A/B 의 추상 simulator 는 player-facing 게임이 아니다 — balance sim / regression test 용으로 **강등**된다 (Sim-G baseline report 가 그 첫 사용). 새 player-facing 게임은 이 spec 이 처음부터 정의한다.

**옛 spec (`2026-05-16-hero-simulator-design.md`) 는 obsolete** — 그것의 architectural 결정 (Controller/View 분리, deterministic seed, persist v15/v16, CycleEvent stream) 은 살아남지만, view 모델 (도트맵 + zoom-in cut + 텍스트 narrative log) 과 phase 시퀀스 (Sim-C ~ G) 는 이 spec 으로 대체된다.

---

## 1. Context — 왜 v2 가 필요했나

Sim-A/B 머지 후 user 가 dev-shell 직접 띄워서 본 결과 (2026-05-16 evening):

- 기존 manual flow (Town / DungeonFloors / Battle / Inventory) UI 가 "2000년대 초반대 웹게임" 수준 → 너무 빈약
- Sim-A/B 의 새 cycle flow 도 React 텍스트 로그 + minimal HUD — 더 빈약
- BP 30 으로 한 사이클 돌려도 maxLevel 17, 빈 drop / 빈 skill / 빈 quest → 추상 simulation 이라 게임감 0
- User 의 진짜 vision = "마치 유저가 게임을 직접 하는 것처럼, AI 가 던전 입장 / 장비 파밍 / 스킬 학습 / 직업 획득 / 라이벌 만남 / 도덕 결정 / 죽음 — 모든 것을 자동 진행, 사용자는 후원하는 신으로 관조"

Sim-A/B 가 **abstract simulator** 로 빠진 게 architectural mistake. v2 는 이 vision 을 처음부터 design.

---

## 2. Vision

**사용자는 후원하는 신.** 매 사이클마다 신은 한 영혼 (용사) 을 세상에 내보낸다. 용사는 자유의지로 인간처럼 행동한다 — 어디 갈지, 어떤 적과 싸울지, 부상자를 구할지 강탈할지, 신을 믿을지 세속을 좇을지. 신은 보면서 후원 자원 (균열석 = 캐시) 으로 일부 영향력만 행사한다.

용사의 일대기 = 한 cycle (어린 시절 → 청년기 → 장년기 → 노년기 → 마지막). BP 소진 또는 전투 패배가 죽음. 죽음 후 일대기는 **saga book** 에 영원히 기록된다. 신은 새 용사로 다음 사이클 시작.

사용자가 용사를 키워낼수록 (cycle 누적) 신의 권한이 늘어나 더 강한 용사 / 더 풍부한 영향력 / 더 다양한 결과를 만들 수 있다.

**핵심 모토:** "신들의 시점 — 한 영혼의 자유로운 일대기를 후원하며 관조한다."

---

## 3. 핵심 결정 (총 9 개)

| # | 결정 | 비고 |
|---|---|---|
| 1 | **Full auto cycle (0 click)** | 사이클 안 사용자 입력 = pause / abandon 만. 큰 이벤트는 transient popup 으로 인지 |
| 2 | **Procedural 용사 + 균열석 partial design 권한** | 매 cycle 새 영혼. 균열석 (캐시) 으로 trait nudge / 시작 자원 / 사이클 중 기적 일부 unlock |
| 3 | **무명 평민 → emergent 일대기** | 1lv 평민으로 시작, 직업/스킬/도덕성 모두 cycle 안 자연 발생. 16 기존 캐릭터 = 직업 unlock 풀 |
| 4 | **인생 montage (어린 시절 → 죽음)** | 5 챕터 (어린/청년/장년/노년/마지막) + 년 단위 milestone ("12세에 X") |
| 5 | **D. Open World 자유 이동** | Phaser overworld + hero token + AI navigation + zone 별 landmark. 라이브 view = 게임 그 자체 |
| 6 | **Saga 별도 리플레이 화면** | 라이브 view 에는 텍스트 패널 없음. 일대기는 cycle 종료 후 책 메타포로 |
| 7 | **B-1. Legacy 완전 제거, 데이터 100% 살림** | 모든 기존 화면 (Town / DungeonFloors / Battle / Inventory etc) 폐기. 데이터·시스템 reframe |
| 8 | **D. 다축 personality (5 dim)** | 선/악, 신중/충동, 영웅/회피, 자비/잔혹, 신앙/세속. Trait = 시작 prior, cycle 안 결정으로 변동 |
| 9 | **Tier 1 MVP 첫 phase** | 전투 / 보스 / 레벨업 / 드롭 / 직업 / 스킬학습 / 사당 / 도덕분기 / 죽음. Tier 2-4 후속 |

---

## 4. Sim-A/B 의 운명 — keep / demote / drop

### Keep — 그대로 살아남

- **`AutoBattleController` (추상 simulator)** — player-facing 아님. **Sim-G balance simulator / regression test 전용**으로 강등. headless sim CLI (`scripts/sim-cycle.ts`) 가 inflation 곡선 tuning 의 주 도구.
- **`SeededRng`** — sim 의 결정성 보장. 새 시스템에도 RNG axis 들어가면 활용.
- **`CycleEvent` stream type** — 새 시스템도 event-driven 구조이므로 재활용. 새 event type 추가 예정.
- **`CycleResult`, `CycleHistoryEntry`** — saga 데이터 구조의 일부로 활용.
- **`TRAIT_CATALOG` 16 entries** — 새 시스템에서 그대로. magnitudes 는 Sim-G 가 tune.
- **`Trait`, `TraitModifiers`, `applyTraitMods`** — 새 시스템 hero 의 trait 부여 시 활용.
- **`HeroDecisionAI` interface** — v2 가 본격적으로 body 채움 (navigation / target / retreat / skill / 사냥터 / 도덕 결정 등).
- **Persist v16 (`MetaState.cycleHistory`, `traitsUnlocked`)** — 살아남. saga history 가 cycleHistory 의 진화형.
- **gameStore** 의 모든 메타 데이터 (gold / 강화재료 / ascension / 유물 / mythic / compass 등) — keep. reframe 만.

### Drop — 폐기

- **기존 manual flow 화면 전체** — Town / WorldMap / DungeonFloors / Battle / Inventory / Shop / Quests / GameOver / DungeonFinalClearedModal / ClassSelect / RegionMap (이미 폐기) / etc. 모두 v2 에서 안 보임.
- **Sim-A/B 의 `CycleRunner.tsx`, `CycleResult.tsx`** — React 텍스트 로그 view. v2 에선 Phaser overworld 가 main view.
- **Sim-B 의 `CyclePrep.tsx`** — Sim-B 의 trait 3 슬롯 picker. v2 에선 신의 후원 화면으로 재설계 (CyclePrep v2).
- **MainMenu 의 "사이클 시작 (NEW)" 외 모든 entry button** — 인벤토리 / 상점 / 새로 시작 / 런 이어하기 / 튜토리얼 다시 등 다 제거.

### Reframe — 데이터는 살리되 의미 재정의

- **16 캐릭터** = 직업 unlock 풀 (cycle 안 hero 가 일정 milestone 도달 시 unlock 가능한 advanced class). 시작은 무명 평민.
- **32 스킬** = emergent learnable 풀 (특정 직업 / 사당 / 멘토 만남 / 책 발견 trigger).
- **109 보스** = open world 의 109 boss spawn pool. zone / 깊이 / cycle 진행도 따라 분포.
- **41 장비** = drop pool (rarity-weighted, AI 자동 equip 결정).
- **28 quest** = cycle 내 emergent goal — hero 가 자연 발생적으로 받음 (마을 NPC / 의뢰판). 완료 시 cycle 안 보상 + 일부 영구 unlock.
- **26 스토리** = milestone event 의 narrative text — region enter / boss defeat 외에도 새로운 trigger 확장.
- **10 ascension 노드** = **신의 권한 (영구 buff)** 으로 reframe. 사용자 (신) 가 cycle 누적으로 unlock.
- **30 mythic** = 용사의 영구 유산 — cycle 안 매우 희귀 drop. 다음 cycle 의 hero 가 시작 시 적용.
- **10 유물** = 영구 cumulate 자원 — cycle 안 발견 / 보스 격파로 얻음.
- **차원 나침반 (compass)** = open world 의 차원 균열 zone — 특수 discovery + 보스.
- **5 던전 확장 (realms — sea/volcano/underworld/heaven/chaos)** = open world 의 5 신비 zone. Tier-gated.
- **Hardmode** = 메타 unlock 모드 (best run level 임계 도달 시 신의 강한 후원 가능).
- **Phase 4b Sound** = open world / 전투 / saga 화면의 BGM/SFX 다 재활용.
- **Phase 5 Monetization** = 균열석 IAP 로 신의 가호 unlock (Phase 5a-1 의 onestore native 는 별개 트랙으로 진행).

---

## 5. 매 사이클의 흐름 (player POV)

```
┌───────────────────────────────────────────────────────────────┐
│  1. CyclePrep v2 — 신의 후원 화면                                  │
│     "오늘 등장한 영혼: 이름없는 (5세, 무명)"                          │
│     trait 1 (기본) or 3 (균열석 가호) 선택                            │
│     도덕 dim nudge (균열석 가호)                                    │
│     시작 자원 / 장비 보너스 (균열석 가호)                             │
│     [시작]                                                       │
├───────────────────────────────────────────────────────────────┤
│  2. Live View — Open World (5–10분, 0 click)                  │
│     큰 overworld map, hero token 자유 이동                         │
│     상단 HUD: 이름 / 직업 (시작 = 무명) / 나이 / LV / HP / BP        │
│     하단 1줄 ticker: 현재 행동                                       │
│     큰 이벤트 = transient popup (드롭, 직업 unlock, 사당,              │
│     도덕 분기, 보스 등장, 죽음 cinematic)                            │
│     5 챕터 진행 (어린 시절 → 청년기 → 장년기 → 노년기 → 마지막)        │
│     배경 / 음악 / 시간 색조 챕터별 변화                                │
├───────────────────────────────────────────────────────────────┤
│  3. CycleResult v2 — 일대기 종료                                  │
│     "이름없는, 12세, 깊은 숲의 늑대 두목에 쓰러지다"                     │
│     ★ Saga book 펴기 (이번 cycle 의 일대기 책처럼)                     │
│     ★ 영구 보상 (gold / 강화재료 / ascension XP / 유물 / 균열석)     │
│     ★ 신의 권한 ↑ (cycle 누적, unlock 진행도)                       │
│     [다음 사이클 / saga 갤러리 / 메인메뉴]                            │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. 라이브 View — Open World 자세히

### 6.1 화면 layout

- 상단 HUD 한 줄 (이름 / 직업 / 나이 / LV / HP / BP / 도덕성 mini bar)
- 메인 = Phaser overworld scene
  - Zone 색 / terrain 영역 (숲 / 산 / 평원 / 물 / 마을 / 던전 / 특수)
  - Landmark icons (procedural placement) — 마을 / 사당 / 동굴 / 보스 / 라이벌 / 폐허 / 시장 / 항구 등
  - Hero token (sprite 또는 emoji, 직업 따라 변화) — A* pathfinding 으로 destination 까지 자연 이동
  - Path trail (dotted) 표시
  - 시간 / 챕터 따라 sky tint 변화
  - 좌하단 minimap (현 위치 dot)
  - 우측 destination indicator ("↗ 숲의 사당 — 신비 buff 기대 / 트레이트: 탐험가")
- 하단 1줄 ticker (현 행동 + 다음 목적지)
- 큰 이벤트 = floating popup (자동 fade)

### 6.2 시각 자산 전략

**MVP (첫 phase):**
- Emoji + 색 영역 = landmark / hero / 적 (이미 baseline mockup 으로 검증)
- 자체 작성 CSS animation / Phaser tween = 이펙트
- 기존 Phase 4b sound 자산 재활용

**다음 phase (polish):**
- Kenney.nl CC0 sprite (16x16 / 32x32 캐릭터 + tileset) 통합
- 직업별 sprite 차별 (placeholder → 실제 sprite 교체)
- 더 풍부한 zone tileset (4-5 zone biome 차이)

### 6.3 AI navigation (HeroDecisionAI)

매 tick 마다 hero 의 다음 destination 결정:

- **input:** 현재 zone, 현재 stats, trait 5 차원, personality 5 dim, BP 잔량, 챕터, 현재 cycle 의 미발견 landmark list, 알려진 위협 (라이벌 등)
- **output:** 다음 target landmark + travel path
- **로직:** trait + personality 의 weighted sum 으로 후보 평가
  - "도전적" → 강한 적 / 보스 / 깊은 zone 우선
  - "소극적" → 안전한 zone / 마을 / 사당 우선
  - "탐험가" → 미발견 landmark 우선
  - "수전노" → 시장 / 보물 / 상인 우선
  - "광신도" → 사당 / 신앙 NPC 우선
  - 도덕 dim: 선 → 의뢰판 / 부상자 등 / 악 → 강도 / 약탈 등

기존 추상 `HeroDecisionAI` interface 가 body 채워짐.

### 6.4 시간 / 챕터 진행

| 챕터 | 나이 | BP 비율 | 시각 / 음악 | 가능 사건 |
|---|---|---|---|---|
| 어린 시절 | 5–14세 | 0–20% | 청량 / 평화 / 새벽~아침 | 첫 모험, 부모 / 멘토 등장, 첫 적, 직업 unlock 가능 |
| 청년기 | 15–29세 | 20–50% | 청록 / 활기 / 정오 | 본격 전투, 라이벌 등장, 첫 보스, 도덕 분기 본격 |
| 장년기 | 30–49세 | 50–80% | 황금 / 무게 / 오후 | 깊은 zone, 특수 보스, 큰 사건, 명성/악명 (Tier 3) |
| 노년기 | 50–69세 | 80–95% | 보라 / 회상 / 황혼 | 환생 / 깨달음, ultimate 스킬, 라이벌 결판 |
| 마지막 | 70세+ | 95–100% | 진홍 / 신비 / 밤 | 최후의 전투, 다양한 ending (자연사 / 영광 / 비극) |

BP 소모율은 trait 영향 (시한부 천재 = 2x → 빠른 일생, 강철의지 = 1.0 → 정상). 즉 **trait 가 곧 운명**.

---

## 7. Personality 다축 (5 dim)

| Dim | -10 (악) ↔ +10 (선) | 영향 |
|---|---|---|
| 선 ↔ 악 | 강탈/배신 ↔ 자비/구조 | 도덕 분기 결정, NPC 반응, 명성/악명 누적 |
| 신중 ↔ 충동 | 후퇴/회피 ↔ 돌격/도주 안 함 | HP 임계값 후퇴, 위험 노드 진입 결정 |
| 영웅 ↔ 회피 | 강한 적 우선 ↔ 약한 적 우선 | 사냥터 선택, 보스 도전 |
| 자비 ↔ 잔혹 | 적 살림 ↔ 끝장 | NPC 동료 가능성, 적 처치 후 결과 분기 |
| 신앙 ↔ 세속 | 사당 / 기적 ↔ 자력 / 합리 | 사당 우선, 특수 buff 받음, 종교 사건 trigger |

**초기값:** 모든 dim = 0 (중립). Trait 가 시작 시 nudge — 예: `t_zealot` = 신앙 +5, `t_thrill` = 충동 +5, `t_terminal_genius` = 영웅 +7 + 충동 +5 등.

**Cycle 내 변동:** 매 도덕 분기 / 사당 / NPC 결정마다 dim 점수 ±1~±3 변동. 누적이 personality 의 그 시점 모양.

**저장:** 매 milestone 마다 personality snapshot 을 cycle 의 saga 에 저장. Saga 책에 "12세 — 신앙 +3 (사당 헌신)" 식으로 추적.

---

## 8. Tier 1 MVP 이벤트 catalog (첫 phase)

| 이벤트 | 발생 trigger | 시각 / narrative |
|---|---|---|
| 일반 전투 | 적 landmark 도달 | hero / 적 sprite 마주침 + 데미지 popup + 처치 시 +EXP popup |
| 보스 전투 | boss landmark 도달 (zone boss) | cinematic cut-in + flash + 큰 sprite + 스킬 발동 |
| 레벨업 | EXP 임계 도달 | hero 주위 빛 + "LV N → N+1" popup + 스탯 증가 표시 |
| 장비 drop | 적 처치 (rarity rng) | 아이콘 + 이름 + tween-fade + 자동 equip 결정 알림 |
| 직업 unlock | 특정 milestone (예: 적 100명 처치 / 검 50번 휘두름) | cinematic "검사가 되었다!" + portrait 변화 + 직업 스킬 unlock |
| 스킬 학습 | 사당 / 멘토 / 직업 변화 / 우연 | "X 스킬을 배웠다" popup + 스킬 아이콘 |
| 사당 / 제단 | 사당 landmark 도달 | 모달 (자동 선택) — 1 of 3 buff/debuff/스킬, 신앙 dim 영향 |
| 도덕 분기 (간단) | 특정 인카운터 (부상자 / 강도) | 모달 (자동 선택) — personality 따라 결과 분기, dim 점수 변동 |
| 죽음 | BP 소진 OR HP 0 | cinematic — 마지막 멘트 + 페이드 + saga book 펴기 |
| Milestone narrative | 5세 / 10세 / 18세 / 30세 / 50세 etc | transient text ("12세에 첫 적을 쓰러뜨렸다") + 챕터 transition cinematic |

(Tier 2-4 는 후속 phase — §11 phase 시퀀스 참조)

---

## 9. Saga / 리플레이 화면 (cycle 종료 후)

### 9.1 데이터 구조

매 cycle 의 saga = 시간 순 event stream 의 narrative 화.

```ts
interface CycleSaga {
  cycleId: string;
  endedAtMs: number;
  hero: {
    name: string;
    finalAge: number;
    finalJob: string;
    finalLevel: number;
    finalPersonality: Personality5;
    cause: '자연사' | '전사' | '영광스러운죽음' | '비극';
  };
  chapters: CycleChapter[];  // 5 챕터의 milestone events
  highlightEvents: SagaEvent[];  // 큰 이벤트만 (saga book 의 main 페이지)
}

interface CycleChapter {
  name: '어린시절' | '청년기' | '장년기' | '노년기' | '마지막';
  ageRange: [number, number];
  events: SagaEvent[];
}

interface SagaEvent {
  age: number;
  type: 'birth' | 'firstKill' | 'jobUnlock' | 'skillLearn' | 'bossKill' |
        'moralChoice' | 'rivalMeet' | 'levelMilestone' | 'rareDrop' | 'death';
  narrativeText: string;  // "12세에 늑대 무리를 처치하고 영웅이 되었다."
  payload?: object;  // type-specific data (boss id, item id, etc.)
}
```

### 9.2 리플레이 화면 UI

책 메타포 (이전 mockup C 의 saga-book 방향이지만 cycle 종료 후 풀 책):
- 화면 = 열린 책 (한국 신화책 / pixel 풍)
- 페이지 = 챕터 단위. 페이지 넘기기로 진행.
- 왼쪽 페이지 = narrative text (typewriter 효과로 점진 표시)
- 오른쪽 페이지 = 챕터 highlight (드롭 장비, 사용 스킬, 마주친 NPC, 도덕 score graph)
- 책 표지 = hero portrait + 이름 + 일대기 한 줄 요약
- 책 마지막 페이지 = 죽음 / ending + 영구 보상 (메타 transfer)

### 9.3 Saga 갤러리

메인메뉴에서 접근. 모든 cycle 의 saga 책 목록. 좋아하는 saga 는 "표시" 가능 (future: 공유).

---

## 10. CyclePrep v2 — 신의 후원 화면

### 10.1 화면 layout

- 상단: "오늘 등장한 영혼" — procedural 이름 + 시작 외형 (placeholder portrait)
- 중앙: trait slots
  - Default (균열석 0): trait 1 슬롯 (불러올 풀 = unlocked traits)
  - 균열석 N개 (예: 1개) — trait 2 슬롯 unlock
  - 균열석 NN개 — trait 3 슬롯 + 도덕 dim nudge unlock
  - 균열석 NNN개 — 시작 자원 / 장비 보너스 unlock
  - 가장 비싼 — 시작 직업 미리 선택 (16 캐릭터 중)
- 하단: 균열석 잔량 + 가호 unlock 상태 + [시작] / [reroll (균열석 소비)] / [메뉴]

### 10.2 균열석 가호 catalog (구체)

| 가호 이름 | 비용 (균열석) | 효과 |
|---|---|---|
| 영혼 점지 | 1 | trait 1 → 2 슬롯 |
| 깊은 점지 | 3 | trait 1 → 3 슬롯 |
| 도덕 인도 | 2 | 5 dim 중 1 선택해서 +5 시작값 |
| 시작 자원 | 1 | 시작 gold +N, 강화재료 +N |
| 영혼 reroll | 1 | 등장 영혼 새로 굴림 (이름 / 외형) |
| 직업 선택 | 5 | 시작 직업 = 무명 → 선택한 advanced 직업 |
| 중간 기적 | 3 | cycle 중 1회 manual trigger 가능 — 풀회복 + BP +5 |
| 영혼 보호 | 4 | 첫 1회 사망 시 HP 1 부활 (HP-restore) |

균열석 회복: 시간 기반 + 광고 시청 + IAP (Phase 5 자산 그대로) + cycle 결과 보상.

---

## 11. Phase 시퀀스 (v2)

Sim-A/B 가 abstract simulator 였으므로 player-facing 게임은 phase 1 부터 새로 시작.

### Phase V1 — Open World Vertical Slice (★ MVP)

- 신규 `OverworldScene` (Phaser) — 작은 procedural map (1 마을 + 4-5 zone + 6-8 landmark)
- Hero sprite (placeholder emoji / Kenney sprite) + A* pathfinding (`easystarjs` 등)
- `HeroDecisionAI` body 채움 (trait + personality 기반 destination 결정 — Tier 1 수준)
- 기존 Phase 4b sound 재활용 (BGM transition)
- Tier 1 이벤트 9 종 wire (§8)
- CyclePrep v2 (신의 후원 화면) — default 만 (균열석 가호 1-2개)
- CycleResult v2 + 단순 saga 책 (mockup 수준 — 시간 순 narrative text 만)
- Legacy 화면 (Town / DungeonFloors / Battle / Inventory etc) 제거 — App.tsx routing 정리
- Persist v16 → v17 (saga history field, personality snapshot)

검증: 한 cycle 완주 (5-10분) → CycleResult → 책 펴고 일대기 읽음. Vertical slice 의 game-feel 입증.

### Phase V2 — Saga Book + Replay + 갤러리

- Saga book UI (책 메타포, 페이지 넘기기, typewriter)
- Saga 갤러리 (모든 cycle 의 책)
- Persistent 좋아하는 saga 표시 ("☆")
- 일대기 narrative text 풍부화 (Tier 1 event 들 narrative 다양화)

### Phase V3 — Personality + 도덕 분기 + 사당 (Tier 1 완성)

- Personality 5 dim 시스템 (점수 누적 / 표시 / saga 저장)
- 도덕 분기 인카운터 (부상자 / 강도) — 모달 + 자동 선택 + dim 변동
- 사당 시스템 (1 of 3 buff/debuff/skill, 자동 선택)
- Tier 1 의 all wire

### Phase V4 — 균열석 가호 catalog (신의 권한)

- §10.2 의 가호 catalog wire
- CyclePrep v2 의 가호 selector
- 균열석 회복 / IAP 통합 (Phase 5 자산)
- 메타 progression — 신의 권한 점수 누적

### Phase V5 — Tier 2 narrative depth

- 라이벌 NPC system (1-3 persistent, 반복 등장)
- 멘토 시스템 (스킬 전수)
- 도덕 분기 확장 (10+ 인카운터)
- 차원 균열 (compass) 통합 — 특수 zone
- NPC 마을 방문 (의뢰 / 거래)

### Phase V6 — 자산 polish

- Kenney sprite 통합 (직업별)
- Zone tileset polish (5 zone biome)
- 사운드 layering (zone BGM, 큰 이벤트 SFX)
- 챕터 transition cinematic
- 큰 이벤트 popup polish (애니메이션)

### Phase V7 — Inflation 곡선 + Balance (Sim-G 재활용)

- AutoBattleController (Sim-A/B 의 추상 sim) 를 v2 controller 와 연결 — sim:cycle CLI 가 v2 의 balance 측정 가능하게
- spec §11.5 의 7 카테고리 balance pass
- Tier 2 데이터 magnitude tuning

### Phase V8 — Tier 3 (인생 깊이)

- 가족 / 결혼 / 자식
- 명성 / 악명
- 큰 사건 (자연재해 / 마을 위협)
- 환생 / 영적 각성

### Phase V9 — 콘텐츠 확장 + 공유

- 가문 / 영지 / 정치
- 용사 저장 / 공유 (future)
- 다중 도시

---

## 12. 기술 아키텍처

### 12.1 핵심 신규 모듈

```
games/inflation-rpg/src/
  overworld/
    OverworldScene.ts        — Phaser scene, 메인 라이브 view
    HeroSprite.ts            — 캐릭터 sprite + animation
    Landmark.ts              — zone landmark icon + behavior
    Pathfinding.ts           — A* wrapper
  hero/
    HeroEntity.ts            — hero 의 모든 state (직업/스킬/장비/personality/age)
    HeroLifecycle.ts         — 챕터 진행 / 나이 / 죽음 처리
    HeroSpawner.ts           — procedural 이름·외형 생성
    PersonalityState.ts      — 5 dim 점수 관리
  decisionAI/
    HeroDecisionAI.ts        — Sim-B 의 stub 가 본격 logic body
    DestinationResolver.ts   — trait + personality 기반 다음 destination 결정
    BattleAI.ts              — 전투 안 스킬 / 타겟 결정
    EncounterResolver.ts     — 도덕 분기 / 사당 결과 결정
  saga/
    SagaRecorder.ts          — cycle 안 이벤트 → CycleSaga 변환
    SagaStorage.ts           — gameStore.meta 의 sagaHistory 저장
    NarrativeGenerator.ts    — 이벤트 → 한국어 narrative text
  screens/
    OverworldRunner.tsx      — Phaser scene 호스트 + HUD overlay
    CyclePrepV2.tsx          — 신의 후원 화면
    CycleResultV2.tsx        — 일대기 종료 + saga book entry
    SagaBook.tsx             — 책 메타포 리플레이
    SagaGallery.tsx          — 모든 cycle 책 목록
  data/
    landmarks.ts             — landmark 종류 / 외형 / 행동
    zones.ts                 — zone 정의 (terrain / boss pool / 시각 색조)
    encounters.ts            — 도덕 분기 인카운터 데이터
    shrines.ts               — 사당 buff/debuff/skill pool
    blessings.ts             — 균열석 가호 catalog
```

### 12.2 강등된 모듈 (Sim-A/B legacy — sim 전용 keep)

```
games/inflation-rpg/src/cycle/
  AutoBattleController.ts    — sim 전용 (Sim-G balance / regression test)
  cycleEvents.ts             — type 공유 (새 event type 확장)
  cycleSlice.ts              — 새 OverworldRunner 가 활용 가능
  SeededRng.ts               — 새 시스템에도 활용
  traits.ts, HeroDecisionAI.ts — 새 시스템에 reframe
scripts/sim-cycle.ts         — Sim-G 의 balance simulator 그대로
```

### 12.3 삭제 대상 (Sim-A/B 폐기 + legacy manual flow)

```
games/inflation-rpg/src/screens/
  CycleRunner.tsx            — 텍스트 로그 view (대체: OverworldRunner)
  CycleResult.tsx            — 단순 result (대체: CycleResultV2 + SagaBook)
  CyclePrep.tsx              — Sim-B 의 trait picker (대체: CyclePrepV2)
  Town.tsx, MainMenu.tsx (재설계), Inventory.tsx, Shop.tsx, Quests.tsx,
  Battle.tsx, DungeonFloors.tsx, DungeonFinalClearedModal.tsx,
  ClassSelect.tsx, GameOver.tsx — legacy 화면 (모두 제거)
games/inflation-rpg/src/battle/
  BattleScene.ts             — 기존 Phaser BattleScene. v2 에선 전투가 OverworldScene 안 short cinematic 으로 통합 (참고용 코드만 keep 일 수도 — 결정 보류)
```

### 12.4 Persist v16 → v17

- 신규 필드: `sagaHistory: CycleSaga[]` (cap 100), `personalityUnlocks: number` (신의 권한 점수)
- 기존 `cycleHistory` keep (Sim-A/B 의 결과)
- 균열석 잔량 `crackStones` 기존 자산 그대로

### 12.5 자산 / 자료 (CC0)

- **Kenney 1-bit pack** — character / tileset / icon (https://kenney.nl)
- **OpenGameArt 한국 풍 tileset** — 필요 시
- **기존 Phase 4b sound** — BGM 3종 + SFX 12종 + 새 boss / chapter transition jingle 추가 필요

---

## 13. 검증 / 성공 기준

### Phase V1 (MVP)
- Cycle 한 번 완주 5–10분 자연 흐름
- Hero 가 자유 이동하는 게 보임 (placeholder 자산이라도 game-feel)
- Tier 1 9 종 이벤트 다 발생 가능 (전투 / 보스 / 레벨업 / 드롭 / 직업 / 스킬 / 사당 / 도덕분기 / 죽음)
- 책으로 saga 펴서 읽을 수 있음 (text 만이라도)
- 사용자 click = pause / abandon 만 (cycle 안 0 click)
- "감상하는 자동 RPG" 의 느낌이 분명히 살아남 (이전 Sim-A/B 의 텍스트 로그 와 명확히 다른 quality)

### Phase V2-V4
- Saga book 책 메타포 / 갤러리 / 공유 표시 (read-only)
- 도덕 5 dim 작동 + saga 에 기록
- 균열석 가호 8+ catalog 작동

### Phase V5-V9
- Tier 2/3 콘텐츠 풍부화
- Inflation 곡선 정합화 (Sim-G baseline 의 maxLevel 17 → 수만/수십만 도달)
- 자산 polish 완료

---

## 14. 위험 / Tradeoff

- **R1. Open world 작업량 폭증** — Phaser tilemap + A* + sprite + AI navigation. Mitigation: MVP 는 작은 map + emoji + simple AI 로 진입 부담 줄임. 자산 polish 는 후속 phase.
- **R2. 5 dim personality 시스템의 complexity** — UI / 데이터 / 이벤트 영향 다 복잡. Mitigation: Phase V3 까지는 dim 점수 누적만, balance / dim list 정밀화는 Phase V7 (balance).
- **R3. Saga narrative 생성 quality** — 단순 template 이면 robotic, LLM 통합은 budget 부담. Mitigation: 첫 phase 는 hand-written template (예: "{age}세에 {bossName}을 격파했다"). Phase V8 이후 다양화.
- **R4. 기존 자산 100% 살리되 화면 폐기 후 데이터만 활용 — 일부 자산 (특히 ascension / 유물 / mythic) 가 새 컨셉에 부자연** — 매핑 작업 비대. Mitigation: §4 의 reframe 표에 explicit mapping. Phase V4 (균열석 가호) + Phase V5 (Tier 2) 가 그 작업의 본격 단계.
- **R5. Sim-A/B 작업이 demote 되어 architectural debt 느낌** — 사용자 / 다음 개발자에게 confusion. Mitigation: 이 spec 의 §0 / §4 가 explicit 하게 설명. Sim-A/B 의 controller 가 balance simulator 로 살아남는 게 정당화.
- **R6. 자산 부족으로 "2000년대 웹게임" 다시 됨** — placeholder 너무 lonely. Mitigation: Phase V1 의 MVP 도 최소한 procedural map + sprite (emoji 라도) + 큰 이벤트 popup + sound 가 있어야 합격. Polish 는 Phase V6 가 책임.

---

## 15. 다음 단계

1. ☑️ 이 spec commit (`feat/hero-simulator-v2-pivot` 브랜치)
2. ☐ User 가 spec 검토 + 수정 요청
3. ☐ writing-plans skill 으로 `docs/superpowers/plans/2026-05-16-phase-v1-open-world-vertical-slice.md` 작성 (Phase V1 MVP)
4. ☐ subagent-driven-development 로 Phase V1 실행 (브랜치 keep)
5. ☐ Phase V1 머지 + `phase-v1-complete` 태그
6. ☐ V2 → V9 순차 진행 (수개월 / 수십 phase)
