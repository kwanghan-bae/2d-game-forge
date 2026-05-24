# Cycle 1 UI/UX Guide

## 한 줄 요약

F1 은 데이터 레이어 (gating rate + JobSystem tie-break) 만 건드리므로 **UI 영향 0**. F2 는 narrative 줄이 SagaBookModal "여정" filter 에 chapter 경계로 새로 깔리므로 **기존 modal 안의 시각 위계 보강**. F3 은 V3-H 의 SagaBookModal "4 new event filter chip" 패턴을 동일하게 follow — **신규 chip 3-4 개 추가만**, modal 자체는 재발명 0.

## 영향 화면

- **SagaBookModal** (`games/inflation-rpg/src/ui/components/SagaBookModal.tsx`) — F2 의 realm_enter / season_change 라인이 "여정" filter 에 새로 발화 + F3 의 npc_encounter / npc_died / family_event 가 "관계" filter chip 으로 새로 등장.
- **EternalSaga 패널** (`games/inflation-rpg/src/ui/components/EternalSagaPanel.tsx` 또는 동등) — F2 의 realm-enter 라인이 chapter 경계 헤더 직후 노출. (시각 위계만 영향, 새 컴포넌트 0)
- **OverworldRunner 의 season 한 줄 patch** — UI 위치 동일 (status overlay 또는 narrative log), 문자열만 generator 호출로 교체.

기타 (StatusModal / HUD / 운영체제 modal) 는 **변경 없음**.

---

## F1. Build / Cycle Variance Pass 의 UI 함의

**No UI impact this cycle — only data layer.**

이유:
- `SHRINE_SKILL_GRANT_RATE` (0.48 → 0.20) 은 EncounterEngine 내부 상수. HUD/modal 노출 0.
- `JobSystem.evaluate` 의 tie-break 수정 (mage.min 3→5, monk.dim pious→prudent, ranger.min 4→6) 은 직업 unlock event 의 빈도/분포만 바꾼다 — 이미 V3-DEF/V3-H 가 job_unlocked event 의 UI 노출 (SagaBookModal "성장" filter + EternalSaga 등재) 을 완비.
- `MERCIFUL_PROC_RATE` (0.15 → 0.10) 도 동일 — moral_choice event 자체의 UI 노출 경로는 이미 존재.

권장: F1 머지 후 50 cycle sim 결과의 jobUnlocks.tier2 분포를 사용자가 SagaBookModal 의 cycle filter 로 **수동 verify** 만 하면 충분. UI 추가 0.

---

## F2. Realm Tone Narrator 의 UI 함의

### 배치

- **SagaBookModal "여정" filter** — realm_entered 라인을 cycle 안 다른 event 라인과 같은 row 형식으로 흘려보낸다. **chapter 헤더 직후** 1 줄 권장.
- **EternalSaga 패널** — 같은 realm_entered 가 era key 의 sub-bullet 으로 1 줄 등장 (이미 V3-DEF 의 saga event aggregator 가 처리하면 자동).
- **OverworldRunner narrative log** — season_changed 가 기존 한 줄 패치 위치에 그대로 출력.

### 트리거

- realm_entered: cycle 안 hero 가 새 realm 도달 시 1 회 (V3-H 기존 emit).
- season_changed: OverworldRunner 의 season cycle 마다 (기존 한 줄 패치 위치 그대로, 문자열만 generator 호출로 교체).

### wireframe — SagaBookModal "여정" filter

```
┌─ SagaBookModal (forge-panel) ───────────────────────┐
│ Saga Book                                    [ X ]  │
│ ┌──────────────────────────────────────────────┐    │
│ │ [전체] [성장] [관계] [여정 *] [전투]         │    │
│ └──────────────────────────────────────────────┘    │
│                                                     │
│ ── Cycle 1024 ─────────────────────── (chapter) ── │
│  (13세) 바다 안개가 발치까지 올라왔다 — 심해의      │
│         문이 열렸다.                      [realm]   │
│  (15세) 계절이 바뀌었다 — 바다 위로 여름이 내렸다.  │
│                                          [season]   │
│  (17세) 사원에서 새로운 기술을 익혔다.    [skill]   │
│  ...                                                │
│                                                     │
│ ── Cycle 1025 ─────────────────────── (chapter) ── │
│  (8세) 화산재가 어깨에 쌓였다 — 불의 영역이         │
│        시작되었다.                        [realm]   │
└─────────────────────────────────────────────────────┘
```

- `*` = "여정" filter 활성 chip (gold 강조)
- `[realm]` / `[season]` 은 **기존 line-type 배지** 위치 재사용 (새 컴포넌트 0)

### interaction

- "여정" filter chip tap → realm_entered + season_changed + 기존 여정 line 만 표시 (44px 터치 타겟 유지, V3-H 의 4 chip 과 동일 spec)
- chapter 헤더는 read-only — tap 없음
- line tap (long press) → 기존 saga event detail 동작 그대로 (변경 없음)

### accessibility

- realm-enter 라인의 `[realm]` 배지: token `--color-info` (blue) — base/sea/volcano 톤은 line 자체의 prefix emoji 또는 keyword 로 구분 (raw hex 0)
- season 라인 배지: token `--color-success` (green) — 기존 season chip 과 동일 토큰 재사용
- chapter 헤더 contrast: gold on `--color-bg-elevated` — 이미 V3-DEF 검증
- focus ring: `--color-focus` 2px (기존 forge-panel default)

### 잘못된 패턴 (피해야 할 디자인)

- realm 별 다른 raw hex 색상 부여 (예: sea=#0099ff, volcano=#ff3300) — **금지**. 토큰 우회.
- realm-enter line 을 modal toast 로 별도 pop — **금지**. cognitive overload + narrative flow 단절. SagaBookModal 내부 row 만 사용.
- season_changed 마다 separate notification — **금지**. 기존 OverworldRunner 한 줄 patch 위치 그대로.

---

## F3. NPC Saga Dead Path 회수 의 UI 함의

### 배치

- **SagaBookModal "관계" filter chip** — V3-H 가 도입한 4-chip 패턴을 그대로 follow. 신규 event type 4 종 (`npc_encounter` / `npc_died` / `family_event` 내부 sub: marriage / child_born / child_grown) 은 모두 "관계" filter 에 흡수.
- 새 filter 카테고리 **추가 0** — PRD "반대 기준" 명시.

### 트리거

- CycleControllerV2.handleArrival 의 npc/family event 4종 emit 시점에 `recordToStore` 호출 추가 → SagaBookModal 자동 노출.
- V3-H 의 `hero_died` dead path fix 와 **동일 패턴** (UI 신규 0, wire 만).

### wireframe — SagaBookModal "관계" filter

```
┌─ SagaBookModal (forge-panel) ───────────────────────┐
│ Saga Book                                    [ X ]  │
│ ┌──────────────────────────────────────────────┐    │
│ │ [전체] [성장] [관계 *] [여정] [전투]         │    │
│ └──────────────────────────────────────────────┘    │
│                                                     │
│ ── Cycle 1024 ─────────────────────── (chapter) ── │
│  (21세) 멘토 카엘과 길에서 마주쳤다.        [npc]   │
│  (24세) 리나와 결혼했다.                  [family]  │
│  (26세) 첫 아이 미루가 태어났다.          [family]  │
│  (38세) 라이벌 자엘이 길 위에서 쓰러졌다.   [npc]   │
│         — 그의 검은 내 손에 남았다.                 │
│  (52세) 아이 미루가 어른이 되었다.        [family]  │
└─────────────────────────────────────────────────────┘
```

- `[npc]` 배지: token `--color-accent` (gold) — 기존 "관계" filter 의 default 배지 토큰 재사용
- `[family]` 배지: token `--color-warning-soft` 또는 `--color-accent-soft` — 가족 = 따뜻한 톤 (기존 토큰 안에서)
- chip label "관계" 는 변경 없음 — V3-DEF 가 이미 정의

### interaction

- "관계" filter chip tap (44px) → npc_encounter / npc_died / family_event 라인만 표시
- npc/family line tap → 기존 saga event detail dialog 동작 그대로 (V3-DEF 의 NPC 컨텍스트 패널 재사용)
- 신규 modal/page 0 — 모든 노출은 SagaBookModal 내부

### accessibility

- npc/family 배지 contrast: 기존 SagaBookModal 배지 토큰 컨트라스트가 이미 AAA — 신규 검증 불필요
- screen reader: 라인 형식이 기존 saga event 와 동일하므로 aria 변경 0
- npc_died 라인이 sensitive content 일 수 있어 **추가 강조 효과 (애니메이션·진동) 금지** — 정적 텍스트만

### 잘못된 패턴

- "관계" filter 외 새 filter 카테고리 (예: "가족" / "NPC") 추가 — **금지**, PRD §F3 "반대 기준" 명시.
- npc_died 발생 시 별도 modal/dim overlay — **금지**, cognitive overload + V3-DEF 의 spawn rate design 을 UI 가 과장하면 정체성 왜곡.
- family_event 의 sub-type (marriage / child_born / child_grown) 마다 다른 색상 배지 — **금지**, 한 토큰 (`--color-accent-soft`) 으로 통일. sub-type 은 line 본문 텍스트로만 구분.

---

## 토큰 사용 (3 feature 공통)

- `theme-modern-dark-gold` 의 `--color-*` 만 사용. raw hex 0.
- 신규 컴포넌트 0 — 모든 노출은 기존 `forge-panel` / `forge-button` / SagaBookModal / EternalSagaPanel 의 row/chip slot 재사용.
- 배지/chip 의 토큰 매핑:
  - realm: `--color-info`
  - season: `--color-success`
  - npc: `--color-accent` (기존 "관계" default)
  - family: `--color-accent-soft`
- 44px 터치 타겟: 신규 chip 0 (기존 4 chip 그대로 사용), 따라서 신규 spec 검증 불필요.
- 동시 primary action: SagaBookModal 의 filter chip 5 개는 mutually-exclusive selector — Hick's Law 위반 아님 (single select).

## 회귀 가드

- V3-H 의 4 new event filter chip pattern 을 깨지 않는다. F3 의 NPC line 은 기존 "관계" chip 안에 들어간다.
- SagaBookModal 의 chip 수 5 개 (전체/성장/관계/여정/전투) 가 변하지 않는다.
- `chapter_transition` overlay (V3-A) 와 F2 의 realm-enter line 은 **다른 레이어** — overlay 는 시각, F2 는 narrative. 동시 트리거 시 overlay 가 위, narrative line 은 modal 안. 충돌 0.
