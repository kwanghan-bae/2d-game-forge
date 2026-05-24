# Cycle 2 UI/UX Guide

## 한 줄 요약

F1 은 persona doc 패치라 **UI 영향 0**. F2 의 회춘 trigger 확장은 narrative event 1 줄 추가뿐 — 기존 SagaBookModal "여정" filter 안에서 흡수, 신규 화면/컴포넌트 0. 다만 **idle rejuvenation 비트가 시각 transition 없이 narrative line 만으로 발화하면 정체성 약화 위험** — V3-A 의 `chapter_transition` overlay 패턴을 *선택적으로* 회춘에도 재사용 권장 (PRD scope 외, backlog). F3 는 텍스트 catalog 확장 only — UI 영향 0.

## 영향 화면

- **SagaBookModal** (`games/inflation-rpg/src/screens/SagaBookModal.tsx`) — F2 의 신규 `rejuvenation` (idle 발화) 라인이 "여정" filter chip 안에 흡수. cycle 1 이 이미 4 chip (전체/성장/관계/여정/전투) 확장 완료, F2 는 새 chip 0 — 기존 `rejuvenation` 필터 매핑 그대로.
- **OverworldRunner** (`games/inflation-rpg/src/screens/OverworldRunner.tsx`) — F2 의 idle 회춘이 narrative log slot 에 1 줄 추가. 기존 `chapter_transition` overlay 와 다른 슬롯 (narrative log 는 modal 안, overlay 는 full-screen).
- (선택, backlog) **chapter_transition overlay 패턴 재사용** — `OverworldRunner.tsx` 의 `transition && transition.type === 'chapter_transition'` 분기 옆에 `rejuvenation && source === 'idle'` 분기 추가. **본 cycle scope 외**, PRD 의 F2 NOT this 가 game state 영향 변경 금지로 적시 — overlay 추가는 visual-only 라 NOT 가드 위반 아님이나, PRD 가 명시하지 않으므로 backlog.

기타 (StatusModal / HUD / EternalSagaPanel / 운영체제 modal / EncounterEngine UI) 는 **변경 없음**.

---

## F1. Multi-seed Acceptance 룰 (persona doc 패치) 의 UI 함의

**No UI impact this cycle — persona documentation patch only.**

이유:
- 변경 대상이 `docs/personas/01-game-planner.md` 와 `docs/superpowers/evolution/cycle-2-backlog.md` 두 md 파일. game code 0, asset 0.
- 사용자는 이 룰을 cycle 3+ 의 PRD 작성 단계에서만 마주친다 — 게임 플레이/UI 노출 0.
- F1 의 "수용 기준이 game code 안 assertion 으로 추가 금지" 조항이 UI 변경을 PRD 차원에서 차단.

권장: F1 머지 후 UI 검증 명령 0. doc-grep 으로 충분.

---

## F2. Eternal Hero 회춘·사망 비트 회수 의 UI 함의

### 배치

- **SagaBookModal "여정" filter** — idle rejuvenation 라인을 cycle 안 다른 event 라인과 동일 row 형식으로 흘려보낸다. 기존 `rejuvenation` event type 의 chip 매핑이 그대로라면 신규 wire 0.
- **OverworldRunner narrative log** — `CycleControllerV2.handleArrival` 가 emit 하는 신규 narrative-only `rejuvenation` event 가 기존 saga line 슬롯에 1 줄 추가.
- (선택, backlog) **chapter_transition-style overlay** — `rejuvenation && payload.source === 'idle'` 시 V3-A 의 chapter_transition overlay 와 동일한 fade-in (300ms) + 짧은 한 줄 (`forIdleRejuvenation` 결과의 첫 30자) 노출. **본 cycle scope 외** — implementer 가 추가 시 NOT 가드 위반 아님이나 PRD 미명시.

### 트리거

- **idle rejuvenation** (옵션 a — PRD F2 §동작 첫 번째):
  - `age >= 30 AND saga.arrivals >= 200` (또는 `chapter_transition` 직후) 시 1 회 narrative-only 발화.
  - **game state 변경 0** (hp/age/level unchanged) — UI 시각 응답이 narrative log 1 줄로만 충분.
  - 한 cycle 안 ≤ 1 회 발화 가드 권장 (반복 시 UI spam).
- **확장 사망 curve** (옵션 b — PRD F2 §동작 두 번째):
  - `age >= 50` 시 `hero_died` probability +1%/year 누적. 기존 `hero_died` UI 경로 (cycle 1 의 dead path fix + SagaBookModal "여정" filter) 그대로 재사용. **UI 추가 0**.

### wireframe — SagaBookModal "여정" filter (idle rejuvenation 발화 시)

```
┌─ SagaBookModal (forge-panel) ───────────────────────┐
│ Saga Book                                    [ X ]  │
│ ┌──────────────────────────────────────────────┐    │
│ │ [전체] [성장] [관계] [여정 *] [전투]         │    │
│ └──────────────────────────────────────────────┘    │
│                                                     │
│ ── Cycle 3072 ─────────────────────── (chapter) ── │
│  (13세) 바다 안개가 발치까지 올라왔다 — 심해의      │
│         문이 열렸다.                      [realm]   │
│  (28세) 사원에서 새로운 기술을 익혔다.    [skill]   │
│  (35세) 빛이 어깨에 내려앉았다 — 시간이             │
│         잠시 멎은 듯 했다.            [rejuv:idle]  │
│  ...                                                │
│                                                     │
│ ── Cycle 3073 ─────────────────────── (chapter) ── │
│  (8세) ...                                          │
└─────────────────────────────────────────────────────┘
```

- `[rejuv:idle]` 배지: 기존 `[rejuv]` 배지 (cycle 1 변경 없음) 재사용. sub-type 라벨은 line 본문 어휘로 구분 (`[rejuv]` 단일 토큰 유지).
- 기존 death-driven rejuvenation 과 시각 구분이 필요한 경우만 `[rejuv:idle]` vs `[rejuv:death]` 분리 — 본 cycle 은 **단일 `[rejuv]` 토큰 유지** (UI 복잡도 비용 > 가치).

### wireframe — (선택, backlog) chapter_transition-style overlay

본 cycle scope 외. 참고용.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           (full-screen dim, 300ms fade)             │
│                                                     │
│         ┌─────────────────────────────┐             │
│         │   "빛이 어깨에 내려앉았다"   │             │
│         │       (centered, gold)      │             │
│         └─────────────────────────────┘             │
│                                                     │
│        (auto-dismiss after 1.5s 또는 tap)           │
└─────────────────────────────────────────────────────┘
```

- overlay 패턴: V3-A 의 `chapter_transition` overlay (`OverworldRunner.tsx:157-158`) 그대로 follow. 같은 fade duration, 같은 token (`--color-accent-soft` bg + `--color-accent` text), 같은 dismiss interaction.
- **backlog 결정 트리거**: cycle 3 의 sim 측정에서 `rejuvenation` 발화율이 ≥ 10% 도달 (UI 노출 빈도 충분) + 사용자가 narrative log 만으로 "회춘 비트가 약하다" 라고 보고할 때.

### interaction

- SagaBookModal: "여정" filter chip tap (44px) → rejuvenation + hero_died + realm_entered + season_changed 모두 표시. cycle 1 의 chip 매핑 그대로.
- narrative line tap → 기존 saga event detail 동작 (변경 없음).
- 신규 overlay 도입 시 (backlog) — tap 으로 dismiss, auto-dismiss 1.5s, ESC 키 (web) 로 dismiss.

### accessibility

- `[rejuv]` 배지 contrast: 기존 cycle 1 V3-DEF 가 검증한 토큰 사용. 신규 검증 불필요.
- screen reader: idle rejuvenation 라인이 일반 saga event 와 동일 aria 패턴 — 추가 라벨 0.
- focus ring: 기존 forge-panel default (`--color-focus` 2px) 그대로.
- sensitive content: idle rejuvenation 은 긍정적 비트 (빛/회춘) — 별도 dim/animation 강조 불필요. `hero_died` 도 cycle 1 fix 가 정적 텍스트로 처리, 본 cycle 변경 0.

### 잘못된 패턴 (피해야 할 디자인)

- **idle rejuvenation 마다 modal pop** — 금지. cognitive overload + V3 컨셉 (idle, 매끄러운 흐름) 위배.
- **`[rejuv:idle]` 별도 색상 토큰 신설** — 금지. 기존 `[rejuv]` 토큰 재사용, sub-type 은 본문 어휘 (`빛이 어깨에 내려앉았다`) 로만 구분.
- **idle rejuvenation 시 game state 시각 응답 (hp bar 채움 / age 숫자 -5 애니메이션)** — 금지. PRD §F2 NOT this 의 "narrative 비트 emit 회수만" 위배. game state 변경 0 = UI 시각 응답 0.
- **MAX_ARRIVALS 1000 화면 표시** — 금지. sim infra 변경은 sim 결과 (jsonl/md) 에만 반영. 게임 UI 에 `arrivals: 567 / 1000` 같은 progress bar 도입은 정체성 위배 (idle hero 가 cap 을 자각하는 디자인 = 일반 RPG cap, V3 컨셉 가드 위반).

---

## F3. Narrative Variance Pass 의 UI 함의

### 배치

- **전역 UI 영향 0** — 세 sub-deliverable 모두 텍스트 catalog 확장:
  - `LEVELUP_BATCH_VARIANTS` 6 → 15 (3 tier)
  - `MORAL_VARIANTS` 5 → 8 (caste-tag 3 추가)
  - NPC variant rival 3 → 8 / mentor 2 → 5 / passerby 3 → 5 / death 3 → 6 (총 24)
- 모든 변경이 `src/data/narrationVariants.ts` 의 함수 배열. UI 컴포넌트 / Modal / HUD / 화면 layout 변경 0.

### 트리거

- `forLevelUpBatch` 호출 시점 (`CycleControllerV2` 의 `levelCount > 0` 분기, line 250) 에서 `toLevel` 자릿수로 tier 분기 → catalog index 선택. 기존 호출 site 변경 0 (분기는 catalog 내부).
- `forMoralChoice` 호출 시 hero personality snapshot 을 인자로 추가 (현재 `{age, choiceNameKR}` → `{age, choiceNameKR, personality}`). 호출 site 1 곳 (`CycleControllerV2.ts:226`) 의 시그니처만 변경. UI/렌더 경로 변경 0.
- `forNpcEncounter` / `forNpcDeath` 호출 시점/시그니처 변경 0 — 배열 크기만 증가.

### wireframe

신규 wireframe 없음. SagaBookModal 의 line 형식 / 배지 / chip / chapter 헤더 모두 cycle 1 가이드 그대로 유지.

cycle 1 의 SagaBookModal "관계" filter wireframe 그대로 적용. NPC 라인의 본문 어휘가 다양해지는 변화는 시각 layout 영향 0.

### interaction

- 변경 없음.

### accessibility

- **시각 위계 영향 0** — catalog 확장은 시각 layout / contrast / focus ring / font 어느 것도 건드리지 않음.
- screen reader: 라인 본문 어휘가 다양해지면 청취 경험 *개선* (반복 감소). 별도 작업 0.
- **장문 라인 가드**: tier3 (≥1M) variant 가 우주적 어휘 (예: `"차원이 영웅 쪽으로 기울었다"`) 라 기존 tier1 신체적 (예: `"팔이 굵어졌다"`) 보다 ~2 배 길어질 가능성. SagaBookModal 의 line 자동 wrap 이 cycle 1 V3-DEF 에서 검증 완료 — 신규 검증 불필요. 단, **단일 line 80 자 cap 권장** (모바일 4 line wrap 한계).

### 잘못된 패턴

- **tier 별 다른 글자 색상** (예: tier1 = gray, tier2 = gold, tier3 = rainbow) — 금지. raw hex 0, token 위계 0, cognitive overload.
- **`MORAL_VARIANTS` 의 caste-tag frame 에 personality 점수 숫자 노출** (예: `"기도의 결과였다 (pious +7)"`) — 금지. 게임 mechanic 노출 = narrative 톤 파괴. 점수는 catalog 분기 기준일 뿐, 본문 노출 0.
- **NPC variant 확장 시 신규 emoji / icon 추가** (예: rival 라인 앞 ⚔️) — 금지. 톤 일관성 (modern dark gold, 정적 텍스트) 파괴.
- **caste-tag frame 의 personality dim 분기를 OR 가 아닌 AND 로 묶기** (예: `pious >= 7 AND merciful >= 10`) — UI 가 아닌 mechanic 영역. UI 가이드 scope 외. 다만 분기가 너무 좁아 단일 cycle 안 catalog 8 frame 도달 못 하면 F3 통합 acceptance (≤ 40 회 반복) 미달 위험 — implementer 가 OR 우선순위로 작성.

---

## 토큰 사용 (3 feature 공통)

- `theme-modern-dark-gold` 의 `--color-*` 만 사용. raw hex 0.
- 신규 컴포넌트 0 — 모든 노출은 기존 `forge-panel` / `forge-button` / SagaBookModal / EternalSagaPanel / OverworldRunner narrative log 의 row/chip 슬롯 재사용.
- 배지/chip 의 토큰 매핑 (cycle 1 가이드 상속):
  - rejuvenation: `--color-accent` (gold) — cycle 1 default `[rejuv]` 그대로
  - hero_died: cycle 1 의 default `[death]` 토큰 그대로
  - realm_entered / season_changed / npc_* / family_*: cycle 1 가이드 그대로
- 44px 터치 타겟: 신규 chip / button 0 — 검증 불필요.
- 동시 primary action: SagaBookModal chip 5 개 mutually-exclusive 유지, Hick's Law 위반 아님.

## 회귀 가드

- V3-H + cycle 1 의 4 새 event filter chip 패턴 (rejuvenation / hero_died / realm_entered / season_changed / npc_* / family_*) 매핑이 cycle 2 변경으로 깨지지 않음.
- SagaBookModal 의 chip 수 5 개 (전체/성장/관계/여정/전투) 유지.
- `chapter_transition` overlay (V3-A) 의 동작 변경 0 — F2 의 idle rejuvenation 은 다른 slot (narrative log) 으로 emit, overlay 충돌 0.
- `OverworldRunner.tsx` 의 `transition` 분기 (line 157-158) 변경 0 — F2 의 idle rejuvenation 이 같은 분기 안에 들어가지 않음. 신규 emit 은 saga record only.
- F3 의 catalog 확장이 기존 cycle 1 의 NarrativeGenerator 단위 테스트 (battle/shrine/levelUp/drop/rejuvenation/death/realmEnter/seasonChange/npcEncounter/npcDeath/familyEvent 11+ case) 회귀 0 — 첫 variant (seed=0) hard-code 어휘 의존 case 가 있으면 fixture 갱신 동반 (test plan F3 회귀 위험 §).

## 사용자 검증 (수동, 자동화 불가)

- F2 머지 후 `pnpm dev` → `localhost:3000/games/inflation-rpg` → 게임 진행 → SagaBookModal 열어 "여정" filter 활성 → idle rejuvenation 라인이 chapter 헤더 직후 또는 cycle 중반에 자연 발화하는지 시각 확인. 발화율은 sim 측정 (test plan F2.15~F2.21) 으로 검증, **여기서는 라인이 line break / wrap / 배지 위치 측면에서 깨지지 않는지** 만 확인.
- F3 머지 후 같은 SagaBookModal 에서 levelUpBatch tier1/2/3 어휘가 자릿수에 맞춰 발화하는지 시각 확인 (LV 5 = 신체적, LV 1k+ = 추상적, LV 1M+ = 우주적). sim 측정은 test plan F3.22~F3.23 가 잡지만, 한 cycle 안 *섞임* 의 시각 인상 (반복 감소) 은 수동.
