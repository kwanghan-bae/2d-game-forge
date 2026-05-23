# V3 — Eternal Hero, Idle Sponsor

**Status:** Design (brainstorming 산출물)
**Date:** 2026-05-23
**Author:** kwanghan-bae + Claude (Opus 4.7)
**Base commit:** `e07fc10` (main HEAD — V1e enemy variety merged)
**Branch:** TBD (각 sub-phase 별 별도 branch)

---

## 0. 이 spec 의 의미 — V2 spec 의 큰 pivot

V2 spec (`2026-05-16-hero-simulator-v2-design.md`) 는 **cycle = 한 사람의 일대기, 70세 죽음, saga book 으로 닫힘** 의 model 이었다. V1c-1 / V1d / V1e 까지 그 model 을 따라 Tier 1 MVP 를 채웠다.

2026-05-23 dev shell 직접 관찰 후 user 의 vision 이 명시적으로 확장됨:

> "심즈처럼. 정해놓으면 마치 살아있는 AI 가 일생을 살아가는 것 처럼. 컨셉을 바꾸자. inflation rpg 처럼 BP 기반이 아니라 영원히 살아간다. 용사의 활약에 따라 내 자원이 쌓이며 내가 계속 버프를 조금씩 줄수 있는 형태. 그냥 영원히 켜놓고 보고 있으면 알아서 성장하는건데. 내 지원이 없으면 굉장히 느리게 가겠지."

**핵심 pivot:**
- BP 폐기 — cycle 길이 제한 없음
- Hero 가 영원히 사는 단일 존재 (Aging + 회춘 mechanic)
- 신의 자원 = 누적, player 가 가끔 들여다보며 영구 buff spend
- 1만시간 플레이 타임 목표 — 점진적 idle 곡선
- Sims-like narrative — 살아있는 AI 가 자기 인생을 living

V2 spec 은 **archive**. V2 의 구조적 결정 (controller / decisionAI / saga / 5 dim personality / 16 직업 / 32 스킬) 은 살아남는다. 단 *cycle 메타포* 와 *BP 시스템* 이 무효.

---

## 1. Vision

**사용자 = 영원의 신.** 한 영혼을 후원한다 — 평범한 평민으로 시작, 자기 인생을 살아가다, 늙는다. 죽지 않고 영원히 살아간다 — 단 늙음의 디버프가 가속하며, 신만이 회춘의 자원을 줄 수 있다.

신은 끊임없이 누적되는 자원 ("빛") 으로 영구 buff 를 골라 영혼에게 부여한다. Buff 가 작아도 1만 시간 누적 차이가 영혼의 진행을 결정한다. 신이 손을 떼면 영혼은 한없이 느리게 늙다 사라지는 듯한 디버프 상태. 신이 자주 손을 대면 영혼은 빠르게 성장하며 더 깊은 영역에 도전.

**핵심 모토:** "영원의 후원자 — 한 영혼을 1만 시간 동안 키워낸다."

---

## 2. V2 spec 과의 차이

| V2 spec | V3 spec |
|---|---|
| Cycle = 한 사람 일대기 | Cycle 없음. Hero 영원 |
| BP 100 = cycle 길이 | BP 폐기 |
| 70세 자연사 → 새 hero | 70세 → 디버프 가속, 회춘 가능 |
| saga book = 한 cycle 의 일대기 책 | saga = 영원 hero 의 무한 chapter |
| sponsorGold endCycle auto-spend | "빛" 자원, 수동 spend, 영구 buff |
| 16 직업 = 직업 unlock 풀 (cycle 안) | 16 직업 = 영원 hero 의 전직 (한 인생 여러 전직 가능) |
| Multi-zone 5 realm Tier-gated | 같음. 영구 hero 가 진행 |
| 라이벌 Tier 2, 가족 Tier 3 | 같음. 단 hero 영원 → 가족 NPC 세대 |
| 1 cycle 5-10분 | 단일 hero 1만 시간 lifespan |

---

## 3. Core loop

```
[hero auto-action]                          ← 켜져있는 동안 자동
 ├─ 전투 (zone 의 적 처치, 경험치 / drop / aging tick)
 ├─ 이동 (zone 간 / zone 내 landmark)
 └─ encounter (사당, 폐허, personality drift, NPC 만남)
       ↓
[자원 누적 + 경험치 + 장비 drop]            ← 행동 비례
 ├─ 빛 (player 자원) 누적
 ├─ hero level up (inflation 곡선)
 ├─ aging tick (작음)
 └─ saga 기록
       ↓
[player 가끔 들여다봄]                       ← idle 패턴, 시간 단위
       ↓
[메뉴 → 영구 buff 1-2개 spend]              ← 의미 있는 결정
 ├─ "이동속도 +0.5% (cost 300)"
 ├─ "장비획득률 +0.3% (cost 500)"
 ├─ "회춘 10년 (cost 800)"
 └─ ...
       ↓
[hero 가 약간 빨라짐/강해짐]                ← 다음 idle 진행 가속
```

Idle 의 의미 = "켜놓고 다른 일 하기". 앱 꺼지면 진행 멈춤 (action-time aging, offline progress 없음).

---

## 4. Hero — aging + 회춘

### 4.1 Aging

- **Aging tick = action 비례** — battle / 이동 / encounter 마다 작은 tick.
- 시작 5세. 한 life-step (5→14 어린시절, 15→29 청년기 …) 의 duration = N actions. N 의 magnitude 는 Sim-G balance 에서 결정 (대략 chapter 당 100-200 actions, 70세 도달 = ~1000 actions).
- **자연 chapter:** 어린시절 (5-14) / 청년기 (15-29) / 장년기 (30-49) / 노년기 (50-69) / 마지막 (70+).
- 직업 unlock milestone (10/30/50 age) 의 의미는 그대로 유지.

### 4.2 디버프 (노년 이후)

- 50세부터 작은 디버프 시작: 이동속도 -2%, 회복 -5%
- 70세부터 본격 디버프: -10% / -15% / -20% 매 10년
- 100세 도달 시 데미지 -50%, 이동속도 -50% 등 거의 정지
- 200세 도달 시 사실상 멈춤 — 그러나 죽지 않음. 신의 회춘만이 살림.
- 디버프 magnitude 는 일종의 "시한폭탄" — player 가 회춘 안 해주면 hero 의 진행이 1만 시간 곡선에서 한참 뒤처짐.

### 4.3 회춘 mechanic

- player 의 spend menu 에 "회춘" 버튼.
- "5년 회춘 (cost N 빛)" — hero age 가 -5 (단, 5세 미만 불가).
- Cost 는 hero 의 현재 age 에 비례 (늙을수록 비싸짐).
- Cooldown 없음. Player 가 자원 있으면 언제든. 단 cost 가 점차 비싸지므로 자연 limit.
- 회춘 시 saga 에 marker: "N세에 빛의 은총으로 M년이 사라졌다 — 재생 #K."
- 회춘 후 hero 의 emoji / 외형 / chapter 는 새 age 의 것을 따름. 직업 / 스킬 / 장비 / personality / level 은 유지.

### 4.4 Hero 죽음

- **죽지 않음.** 전투 패배 시 hero hp = 0 → "쓰러짐" 상태. N 초 (또는 N actions) 후 hp 회복 (마을 워프 등). 사망 = 없음.
- 200세 + 모든 디버프 누적 = 거의 멈춤. 단 살아있음. 신 회춘 시 살아남.
- saga 의 "마지막" chapter 메타포는 회춘 후 보류 — 회춘 안 하고 player 가 게임 그만두면 "마지막" 으로 책 닫힘 (player choice).

---

## 5. 신의 자원 + Buff catalog

### 5.1 자원 1종 — "빛"

- 단일 자원 (idle game 의 simplicity)
- Hero 행동에 비례 누적:
  - 적 처치: +1 빛 (잡몹) / +10 빛 (보스)
  - drop: +0.5 빛
  - encounter (positive 분기): +1 빛
  - level up: +0.5 빛 / level
- 누적 max 없음 (1만 시간 동안 천천히 자랄 수 있게)

### 5.2 Buff catalog (영구 누적, 점진 magnitude)

Phase V3-C 에서 catalog 정의. 초기 set (확장 예정):

| Buff | 첫 효과 | 첫 cost | Cost 증가율 |
|---|---|---|---|
| 이동속도 +0.5% (영구) | hero overworld 이동 빠름 | 100 | × 1.15 / step |
| 장비획득 확률 +0.3% (영구) | drop chance ↑ | 150 | × 1.15 |
| 빛 누적 속도 +1% (메타) | 자원 자체 누적 가속 | 500 | × 1.25 |
| 회춘 cost 할인 5% (영구) | 이후 회춘 cheaper | 800 | × 1.30 |
| 자연 aging 속도 -1% | hero 가 천천히 늙음 | 1000 | × 1.30 |
| 장비 레벨 vs 필드 디버프 한도 +1 (영구) | inflation 곡선 상쇄 | 300 | × 1.20 |
| 일회용 회춘 (5년) | 즉시 hero age -5 | hero age 비례 | dynamic |

총 7 base buff. 1만 시간 곡선 동안 각 buff 가 Lv 50-100 도달 가능 (이상 logarithmic damping).

### 5.3 Spend UI

- Main 화면에 "신의 메뉴" 버튼 → 모달
- 모달 안: buff 별 카드 (현재 Lv / 다음 효과 / cost / 살 수 있는 ×N 한꺼번에)
- "다음 단계까지 ×N 사기" 빠른 결정
- 게임 시간 누적 표시: "오늘 누적 빛 +N, 총 N"

---

## 6. Multi-zone

### 6.1 Zone 진행 model

- 한 zone 의 적 처치 가 hero 의 진행. 적당히 켜놓으면 한 zone 의 진행이 자동.
- Zone clear 조건: zone 의 boss 처치 → 다음 zone unlock
- **5 realm + 1 base map** = 6 zone 총. base map 에서 시작, 5 realm 으로 점진 진행.

### 6.2 Zone 별 핵심 변수

- **Field level** — 각 zone 의 적이 가지는 base level. base map = Lv 1-50, realm 1 = Lv 50-200, realm 2 = Lv 200-1000, ... 1만 시간 곡선 따라 지수.
- **Hero level vs field level 차이** = inflation 상쇄 mechanic:
  - hero level ≥ field level → 일반 진행
  - hero level < field level → 디버프: 이동속도 -, 데미지 - (level diff 의 함수)
  - **buff** "장비레벨 vs 필드디버프 한도" 가 N 차이 까지 디버프 무효화. user 가 신 buff 로 곡선 push.
- **Boss 종류** — zone 별 1-3 boss 타입. 처치 시 다음 zone unlock + 큰 자원 보상.

### 6.3 Zone catalog (대략)

| Zone | 이름 | Field Lv 범위 | 비고 |
|---|---|---|---|
| 0 | 시작의 들판 | 1-50 | 현재 단일 grid. 어린시절 / 청년기 주로 활동 |
| 1 | 폭풍의 바다 (sea) | 50-500 | V2 spec realms |
| 2 | 화산 (volcano) | 500-5000 | |
| 3 | 명계 (underworld) | 5000-50000 | |
| 4 | 천계 (heaven) | 50000-500000 | |
| 5 | 혼돈 (chaos) | 500000+ | 최종, 무한 |

Hero 가 한 zone 에 만족하면 자유 의지로 다음 zone 도전 (AI 가 결정). 단 신 buff 가 부족하면 자동으로 후퇴 (safe zone).

---

## 7. NPC + 관계 (Sims-like)

### 7.1 NPC 종류

- **라이벌** (1-3 persistent) — hero 의 평생 동안 반복 등장. 같이 늙고 회춘. 결투 = 큰 narrative event.
- **멘토** — 한 chapter 안에서 만남, 스킬 전수, 떠남.
- **친구** (1-N) — 인생 동안 만나고 헤어짐. 자주 만나면 buff (사회성), 죽으면 (다른 hero 가 아니라 NPC 도 영원? 결정 필요) 큰 saga event.
- **가족** — 어린시절 부모 (passive NPC), 성년 결혼 + 자식 (NPC). 단 hero 본인만 영원.
  - **자식 NPC** — 자라면서 hero 의 paragon (스킬 일부 따라함). hero 사망 안 함 → 가문 계승 시스템 없음. 자식은 그냥 평범한 NPC 인생을 살다 죽음 (시간 흐름 따라).

### 7.2 NPC interaction

- NPC 의 zone 거주. Hero 가 그 zone 지나가면 만남 (확률).
- 만남 modal — "X 가 어떻게" / personality dim 영향.
- 가족: 결혼 / 자식 = 청년기-장년기 의 milestone event.

### 7.3 NPC lifespan

- NPC 도 늙는다. Hero 만 영원, NPC 는 일반 인간.
- 라이벌 / 친구 의 죽음 = 큰 saga event. Hero 의 인생 안에서 일어남.
- 회춘 buff 가 NPC 에게도 적용 가능? — **부정**. Hero 한정. NPC 는 자연 흐름. (단순화)

---

## 8. Saga 재정의

### 8.1 무한 chapter

- 기존 5 chapter (어린/청년/장년/노년/마지막) 의 한 cycle 만.
- 새 model: chapter 가 무한 추가. 회춘 시 "재생 #K" 라는 의미적 marker.
- saga book 의 UI 가 "책 한 권" 이 아니라 "여러 권" — chapter 별 또는 chapter group 별 책.

### 8.2 데이터 구조 변화

- `CycleSaga` → `EternalSaga` 로 재정의.
- 새 field: `cycleCount` (회춘 횟수 + 자연 chapter 진행), `chaptersByEra`
- persist v19 — schema 변화. v18 에서 마이그레이션 (기존 saga 는 archive).

### 8.3 Saga Book UI (V3-F)

- 새 화면: 무한 책 viewer. timeline / chapter group / search.
- 핵심 이벤트 highlight (boss kill, 직업 unlock, 라이벌 만남 등).

---

## 9. Phase 분해 (sub-spec)

각 phase = 별도 plan + branch + 머지 + tag. Spec 은 한 문서 (이거).

### Phase V3-A — Movement polish (1-2h)
**Goal:** Hero movement bug fix (맵 바깥 / 어색한 navigation).
- Pathfinding bounds check
- 자연스러운 idle (도착 후 잠시 pause / 주위 둘러보기 등)
- Chapter transition cinematic (간단)

**산출:** `phase-v3-a-complete` tag.

### Phase V3-B — BP → 영원 hero 전환 + aging + 회춘 (4-6h)
**Goal:** Hero 의 BP 폐기, 자연 aging tick, 죽음 폐기, 디버프 + 회춘.
- `HeroEntity.bp` 폐기 (or BP 의 의미 재정의 — "energy" 로 살릴지 결정)
- Action-time aging tick (action 카운터 → age tick)
- 디버프 시스템 (age >= N → stat penalty)
- 회춘 spend handler
- saga "재생 #K" marker
- persist v19 마이그레이션

**산출:** `phase-v3-b-complete` tag.

### Phase V3-C — 신의 빛 + buff catalog + spend UI (4-6h)
**Goal:** 자원 누적 + 영구 buff spend + idle-friendly UI.
- "빛" 자원 변환 (sponsorGold → light)
- 7 buff catalog 와 cost curves
- Spend modal UI (모달 내 buff 카드들)
- HUD 에 빛 누적 표시

**산출:** `phase-v3-c-complete` tag.

### Phase V3-D — Multi-zone (4-6h)
**Goal:** 5 realm + base map = 6 zone. Hero 가 zone 자유 진행 + field level vs hero level 디버프.
- Zone catalog (`zones.ts` 확장)
- Field level system
- Hero 의 zone navigation AI
- Zone clear 조건 (boss 처치 → unlock)

**산출:** `phase-v3-d-complete` tag.

### Phase V3-E — NPC + 관계 (6-8h)
**Goal:** 라이벌, 멘토, 친구, 가족 NPC. NPC interaction modal.
- NPC entity + lifecycle
- NPC encounter trigger
- 가족 시스템 (결혼/자식)
- NPC narrative templates

**산출:** `phase-v3-e-complete` tag.

### Phase V3-F — Saga 무한 chapter (2-3h)
**Goal:** Saga book 의 무한 chapter 뷰어 + 재생 marker.
- `EternalSaga` data structure
- Saga book UI 재설계
- Chapter group / timeline filter

**산출:** `phase-v3-f-complete` tag.

### Phase V3-G — 1만시간 balance pass (4-6h)
**Goal:** Sim-G 재활용, 1만시간 곡선 정합화.
- 모든 buff cost curves 측정
- Hero level vs zone field level 의 점진성 확인
- 회춘 cost 균형
- Idle time vs progress 의 logarithmic-ish 곡선 확인

**산출:** `phase-v3-g-complete` tag.

---

## 10. 기존 시스템 변경 요약

### 살아남 (keep)
- `OverworldScene`, `Pathfinding`, `HeroDecisionAI`, `EncounterEngine`
- `HeroEntity` (단 BP 폐기, aging 시스템 재정의)
- `JobSystem`, `SkillLearningSystem` (cycle 무관, 영원 hero 가 한 인생 안에서 여러 직업 가능)
- `PersonalityState`, `PERSONALITY_ENCOUNTERS` (V1c-1)
- `enemyTiers`, `LANDMARK_TYPES` (V1e)
- `SagaRecorder` (단 EternalSaga 로 데이터 구조 재정의)
- `NarrativeGenerator` (한국어 josa 등 V1e 그대로)
- `inflationCurve.ts` (V3-G 에서 magnitude tune)

### 폐기 (drop)
- `CyclePrepV2` — 영원 hero 라 cycle prep 없음. Main menu 가 "스폰서 시작" 만.
- `CycleResultV2` — cycle 종료 없음. Saga book viewer 가 대체.
- `cycleSliceV2` — store slice 의 cycle 메타포 폐기. 새 `eternalSliceV3` 또는 기존 confuse 안 되게 rename.
- `goldFromCycle` (in MetaProgression) — endCycle 없음. 자원 누적이 hero action 비례.

### Reframe
- `sponsorGold` → `light` (자원 rename + 의미 재정의)
- `atkBaseBonus/hpBaseBonus` → 7 buff 의 1-2개로 통합
- `cycleHistory` (persist v15) → archive. EternalSaga 가 새 storage.

---

## 11. Persist 마이그레이션

v18 → v19 (Phase V3-B 에서 적용):
- `meta.sponsorGold` → `meta.light` (그대로 carry)
- `meta.atkBaseBonus`, `meta.hpBaseBonus` → buff catalog 의 starter Lv
- `meta.cycleHistory` → archive (별 시스템). 새 `meta.eternalSaga` 시작.
- 기존 hero 인스턴스 (run state) 폐기. v3 시작 시 새 hero spawn.

**중요:** 마이그레이션은 일방향. v19 → v18 rollback 없음.

---

## 12. 검증 / 성공 기준

### Phase V3-A
- Hero 가 맵 바깥 안 나감
- Idle 동작 자연스러움 (도착 → 짧은 pause → 다음 결정)

### Phase V3-B
- BP HUD 안 보임
- Aging tick → chapter 진행 → 디버프 누적 → 회춘 spend → age reset 의 end-to-end 흐름
- 회춘 후 saga 의 "재생 #K" marker 확인

### Phase V3-C
- Spend modal 에서 buff Lv 1 → Lv 5 까지 사보고 cost 곡선 자연
- Idle 30분 켜놓고 자원 누적 → 의미 있는 결정 1-2개

### Phase V3-D
- Hero 가 zone 0 boss 처치 후 zone 1 자동 진행
- Hero level << field level 시 디버프 보임

### Phase V3-E
- 라이벌 NPC 1번 만남 (어린시절) → 청년기에 또 만남 (persistent)
- 결혼 + 자식 saga event

### Phase V3-F
- Saga book 의 무한 chapter, 재생 marker 정상 표시

### Phase V3-G
- 1만 시간 곡선 측정 (Sim-G 재활용) — 가설 검증

### 전체
- 1만 시간 idle 곡선 가설: 100 시간 = Lv 5,000 정도, 1000 시간 = Lv 200,000 정도, 1만 시간 = Lv 10,000,000+ 정도 (실제 magnitude 는 V3-G 에서 측정)
- 회춘 mechanic 의 의미 (player 가 회춘 안 하면 progress 가 30-50% 느려져야 의미 있음)

---

## 13. 위험 / Tradeoff

- **R1. BP 폐기 의 회귀** — BP 가 cycle 길이 제한 + AI 결정의 시간 제약 이었음. 영원 hero 에서 hero 가 자유롭게 zone 진행 → AI 가 너무 boring 한 결정 만들면 narrative 무미. Mitigation: V3-D 의 zone clear 조건 + V3-E 의 NPC 가 narrative spike.
- **R2. 회춘 cost 의 곡선** — 너무 비싸면 player 가 짜증, 너무 싸면 의미 없음. Mitigation: V3-G 의 balance pass.
- **R3. Saga book 무한 chapter UI** — 너무 길어지면 읽기 불가능. Mitigation: chapter group + search (V3-F).
- **R4. 1만 시간 곡선** — idle game 의 곡선 설계는 매우 어려움. Mitigation: V3-G Sim-G 재활용 + 가설 측정. 부족하면 buff catalog 확장.
- **R5. 기존 자산 (16 직업 / 32 스킬 / 109 보스 / 41 장비) 의 reframe** — 영원 hero 의 단일 인생에 다 들어가야 함. Mitigation: V2 spec 의 reframe 표 그대로 활용.
- **R6. Persist 마이그레이션 위험** — 기존 v18 의 saga / cycleHistory 가 무효. Mitigation: archive 처리, v19 가 fresh start.
- **R7. NPC 죽음 narrative 의 위험** — NPC 죽으면 hero 의 인생 동안 일어남. 너무 자주 죽으면 슬픔만 누적. Mitigation: V3-E 에서 NPC lifespan 조절.

---

## 14. 다음 단계

1. ☑️ 이 spec 작성 + commit (`main` 또는 `feat/v3-spec`)
2. ☐ User 가 spec 검토 + 수정 요청
3. ☐ Phase V3-A 부터 시작 — writing-plans skill 으로 `docs/superpowers/plans/2026-05-23-phase-v3-a-movement-polish.md` 작성
4. ☐ subagent-driven-development 로 V3-A 실행
5. ☐ V3-A 머지 + tag → V3-B 시작
6. ☐ V3-A → V3-G 순차 진행 (수십 시간 / 수 phase)

— V3 spec 작성 (2026-05-23, brainstorming v3 산출물)
