# Cycle 4 결과 (Full Merge)

> 상태: **full merged** — 6 polish fix 모두 main 으로 머지.
> PRD: [`cycle-4-prd.md`](cycle-4-prd.md)
> 정찰: agent `a2501ef69f3e4e705` (cycle 4 진입 직전 정찰), 후 정찰 본 세션 Playwright.

## 변경 한 줄

사용자 보고 "실제 게임 실행 시 오류 + UI 어설픔" 정찰의 6 핀포인트
(favicon 404 · 한국어 조사 오류 · dev placeholder · HUD 정보 과밀 ·
신의 메뉴 Hick's Law 위반 · Saga Book 필터 영/한 혼용) 을 한 phase 의
Group A (코드 critical) + Group B (UI 디자인) 으로 병렬 dispatch 하여
해소.

## 6 fix 의 commit

| ID | 그룹 | 한 줄 | Commit |
|----|-----|-------|--------|
| A1 | Code | dev-shell `public/favicon.ico` 추가 (404 침묵) | `af085f6` |
| A2 | Code | `josa.ts` util + NPC narrative wire (받침 자동 판정) | `4687a97` |
| A3 | Code | dev placeholder 문자열 제거 / DEV gate | `d7d4e01` |
| B1 | UI   | HUD top bar 3-row 재구성 (identity/resource/action) | `9dce162` |
| B2 | UI   | 신의 메뉴 4 카테고리 탭 (이동/자원/시간/기타) | `d387576` |
| B3 | UI   | SagaBookModal 11 필터 칩 한글 label | `26dfee9` |

## 머지 가드 결과

| 가드 | baseline (cycle 3) | cycle 4 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1094 / 1094 | **1130 / 1130** | OK (+36 신규 cycle 4 unit/integration) |
| circular | 1 (baseline) | 1 | OK (회귀 0) |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 부터 알려진 부채).

## 정찰 재실행 (6 checklist)

본 세션 Playwright MCP, iPhone 14 viewport (390×844), dev server `localhost:3000`.

| # | 항목 | 검증 방법 | 결과 |
|---|------|-----------|------|
| C1 | favicon 404 → 0 | `browser_console_messages level=error` (mainmenu + sponsor 후) | **0 error** PASS |
| C2 | 조사 오류 (`폭풍와` 등) | `grep -rn "후속 단계에서 구현\|V3-D 도착\|구현 예정" src` + josa util unit test 23 개 | grep 0 hit, vitest PASS. Hero overworld 진입은 sim 자동 진행으로 캡처 못함 (자연사 5세 즉시) — 코드 +unit test 로 검증 |
| C3 | dev placeholder | Sponsor 화면 `browser_evaluate` body innerText (`후속 단계에서 구현` `V3-D 도착` 등) | **0 hit** PASS |
| U1 | HUD `신의 메뉴` word-break 0 | `OverworldRunner.tsx` 3-row chunk (`hud-row-identity / -resource / -action`) + 액션 row gap 6 + `whiteSpace: nowrap` 액션 버튼 | 코드 review PASS, vitest HUD 테스트 PASS |
| U2 | 신의 메뉴 한 탭 buff ≤ 3 | `SpendModal.tsx` 의 `BUFF_CATEGORY` (movement:1 / resource:2 / time:3 / misc:1) | 한 탭 max 3 buff PASS |
| U3 | SagaBook 필터 11 칩 한글 | `SagaBookModal.tsx` 의 `FILTER_LABEL_KR` 11 entry + button text = `FILTER_LABEL_KR[f]` | 한글화 PASS (영어는 internal value 만) |

C2 의 hero overworld 캡처 한계: V3 의 sim 자동 진행 특성상 sponsor 클릭 → 즉시 epilogue (영혼 자연사 5세). 두 번째 영혼도 동일 (sponsorship 10 빛 누적). 이건 cycle 5 의 prod 빌드 정찰 + balance 검사 영역.

screenshot: `.tmp-cycle-4-postsim/screen-{1..4}-*.png` (gitignored).

## 6 fix 정찰 시점 vs 후 비교

| 항목 | 정찰 시 (cycle 4 진입 직전) | cycle 4 후 |
|------|------------|------|
| favicon | 404 1 건 | 0 건 |
| 조사 잘못 | 예: `폭풍와`, `리치 왕와` | josa util + NPC wire 적용. Unit test 23 PASS |
| dev placeholder | `후속 단계에서 구현 / V3-D 도착 시 활성` 류 visible | grep 0 hit |
| HUD top bar | 11-12 정보 1 줄 `신의 메 / 뉴` word-break | 3-row (4+4+3) + nowrap |
| 신의 메뉴 | 7 buff 1 화면 (Hick's Law) | 4 탭 max 3 |
| 필터 칩 | `battle / drop / levelUp` 영어 | 11 칩 한글 |

## Phase G self-check (Cycle 4 종료 후)

- **약점 고갈**: ✗ (cycle 5 carry-over D1-D7 + 본 cycle 신규 + prod 빌드 미정찰)
- **3 연속 같은 1순위**: cycle 0 saturation → 1 variance → 2 process → 3 prefix bug → **4 polish**. 5 cycle 모두 다른 카테고리. soft-halt 신호 없음.
- **자원 추정**: cycle 4 는 신규 세션 시작 + Group A/B 병렬 dispatch + 짧은 polish 라 한 cycle 안에 full 가능. 본 cycle 정상 종료.
- **사용자 halt**: 없음 (사용자 "오랫동안 자리 비울 거야. 자율적으로 개선" — 자율 머지 위임).
- **Hard halt**: 미발생.

**→ cycle 5 진입 가능.**

## Cycle 5 carry-over

### 1순위 (cycle 5 PRD 후보)

- **C5-1. prod 빌드 정찰 — 사용자 보고 "계속 오류" 의 진짜 root cause** —
  본 정찰은 dev 모드 console error 0. 사용자가 보고한 "오류" 가
  prod 빌드 (`build:web`) 의 console error 인지, 또는 gameplay 의
  자연사 5세 즉시 종료를 "오류" 로 인식한 것인지 미상. 후자라면
  balance 패치 (영혼 sponsor 10 → 충분, MAX_ARRIVALS, 5세 → 6세 단축 미인지 등).
- **C5-2. inflation 정체성 회복** — cycle 3 result.md 의 `max_arrivals 149/150` —
  inflation RPG 인데 영혼이 자연사로 끝나면 정체성 fault. cycle 0/3 의 D3
  (MAX_ARRIVALS 500→1000 + idle 회춘 trigger) 와 통합.

### Cycle 3 carry-over (cycle 4 미수행) — cycle 5 / 6 분산

| ID | Title | 수치 제안 |
|----|-------|----------|
| D1 | priest saturator structural | MERCIFUL_PROC_RATE 0.10→0.05 + priest.min 3→5 |
| D2 | prudent dim source famine | PERSONALITY_ENCOUNTERS prudent source 1→2 |
| D3 | MAX_ARRIVALS + idle 회춘 trigger | MAX_ARRIVALS 500→1000 + age/arrivals 임계 회춘 |
| D4 | NPC first-vs-recurring 필터 | CycleControllerV2 의 npc id 기반 first/recurring 분기 |
| D5 | spare_enemy moral saturation | PERSONALITY_ENCOUNTERS weighting 조정 또는 variant 8→24 |
| D6 | levelUp 자릿수 톤 | ≤999 / 1k-999k / 1M+ 분기, variant 6→18 |
| D7 | EternalSaga era key chapter title 동적 생성 | Caves of Qud sultan-history 식 |

### Cycle 4 자체 backlog

- modal panel elevation/shadow (정찰 보고 "화면 4" 약점 2)
- status modal 빈 섹션 hint (V3 컨셉 fault 의 UI 측 대응)
- narrative dedupe (saga book 같은 이벤트 반복)

## 추천 cycle 5 우선순위

**C5-1 (prod 빌드 정찰) > C5-2 (inflation 정체성, D3 통합)**.
- 사용자가 보고한 "오류" 의 root cause 확인 없이는 cycle 4 의 polish 가 사용자 만족까지 도달했는지 알 수 없음.
- 정찰 후 사용자 confirm → C5-2 (inflation 회복) 또는 D1 (priest saturator) 로 분기.
