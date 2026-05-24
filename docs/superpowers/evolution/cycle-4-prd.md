# Cycle 4 PRD — Polish Pass (게임 실행 오류 + UI 어설픔)

## 한 줄

사용자 보고 "실제 게임 실행 시 오류 + 디자인 어설픔" 의 정찰 결과 6 핀포인트를 한 phase 로 묶어 polish. 신규 feature 0, polish 100%. 정찰 보고: agent `a2501ef69f3e4e705` (`/tmp/cycle-4-recon/`).

## 평가 핀포인트

### 코드 critical (3)
1. **C1. favicon 404** — `apps/dev-shell/public/favicon.ico` 부재. dev/prod 모두 console error 1 건.
2. **C2. 한국어 조사 오류** — `폭풍와`, `리치 왕의 숨이...` 등 받침 유무에 따른 `이/가`, `을/를`, `과/와`, `은/는` 처리 누락. 발화 시점은 NPC encounter / death modal / saga book.
3. **C3. dev placeholder production 노출** — `trait 선택 / 가호 / 수동 후원 UI 는 후속 단계에서 구현`, `V3-D 도착 시 활성` 등 dev meta 문자열이 사용자 visible.

### UI 어설픔 (3)
4. **U1. Hero overworld HUD top bar 정보 과밀** — `신의 메 / 뉴` word-break, 11-12 정보 1 줄. 3-row chunk 재구성.
5. **U2. 신의 메뉴 7 buff Hick's Law 위반** — 한 화면에 7 primary action. 카테고리 탭 or unlock-stage progressive reveal.
6. **U3. Saga Book 필터 칩 영/한 혼용** — `battle / drop / levelUp` 가 `전체` 옆에 영어. 한글화.

## 우선순위 그룹

자원 절약 위해 2 그룹 병렬 dispatch (서로 다른 파일군):

### Group A (코드 critical, 가볍고 빠름)
- C1 favicon
- C2 josa helper + 발화 시점 wire
- C3 dev placeholder 제거 또는 dev flag gate

### Group B (UI 디자인 어설픔, 디자인 시간 더 큼)
- U1 HUD 3-row 재구성
- U2 신의 메뉴 카테고리 탭
- U3 필터 칩 i18n 한글화

## F1-F6 의 acceptance 기준

각 fix 의 sim/test guard. Δ-from-baseline 룰 적용 (단일-seed 절대값 금지, multi-seed 무관한 단순 UI 변경은 e2e/snapshot 으로 검증).

### C1. favicon
- 머지 후 dev 서버 home 페이지 reload → `browser_console_messages` 에 favicon 404 0 건
- (정찰 시 1 건 → 0 건)

### C2. 조사
- 신규 util `games/inflation-rpg/src/utils/josa.ts` 또는 `@forge/core` 의 한국어 josa helper
- 받침 유무 자동 판정 후 `이/가`, `을/를`, `과/와`, `은/는`, `으로/로` 5 변환 지원
- Unit test: 받침 있음 (`폭풍` → "폭풍과"), 받침 없음 (`리치 왕`? — "왕" 받침 있음 → "왕과"), 모음 받침 (`바람` → "바람과")
- Integration: NPC encounter / death narrative 에서 새 josa wrapper 통과
- Sim guard (50 cycle seed 4096): `grep -E '(\S)(와|를|이) ' 의 *받침 없는 단어 직전* mismatch 0 건` — 또는 단순화: 자주 발생하는 5 단어 (`폭풍`, `바람`, `리치`, `사령`, `용`) 의 잘못된 조사 0 건

### C3. dev placeholder
- Sponsor 화면의 `trait 선택 / 가호 / 수동 후원 UI 는 후속 단계에서 구현` placeholder grep → 0 건 또는 `import.meta.env.DEV` gate
- 신의 메뉴의 `V3-D 도착 시 활성` 류 dev meta 문자열 → "추후 활성" 같은 user-facing 문구로 교체 또는 제거
- e2e: Sponsor 진입 → placeholder 문자열 0 건

### U1. HUD 3-row
- `Overworld.tsx` (또는 동등) 의 top bar 가 3-row 로 재구성:
  - row1: 정체성 (이름 / 나이 / 직업 / HP gauge)
  - row2: 자원 (빛 / 재생 / 계절 / 지역)
  - row3: 액션 (3 버튼 + 속도 1×/2×/5×/10×)
- 모바일 (390×844) viewport 에서 `신의 메뉴` 텍스트 word-break 0
- Playwright screenshot 비교 정찰 시점 vs 후

### U2. 신의 메뉴 카테고리
- 7 buff 를 3-4 카테고리 탭으로 분리:
  - 이동 (가속 류)
  - 자원 (재화 buff)
  - 시간 (회춘, 멈춤 류)
  - 기타
- 한 탭에 max 3 buff
- 또는 unlock-stage progressive reveal (LV/age/cycle 임계 도달 시 새 buff 노출)
- e2e: 신의 메뉴 진입 시 한 번에 보이는 buff ≤ 3

### U3. 필터 칩 한글화
- `SagaBookModal.tsx` 의 13 필터:
  - 전체 / 전투 (battle) / 획득 (drop) / 성장 (levelUp) / 영지 (realm) / 인연 (npc) / 회춘 (rejuv) / 명소 (sightseeing) / 명상 (meditation) / 시련 (trial) / 계절 (season) / ...
- 한글 label + 영어 internal value 분리 유지 (catalog map)
- Unit test: 13 필터 모두 한글 label 노출

## 반대 기준 (NOT this)

- 사용자 보고의 "오류" 에 대한 진짜 root cause (prod 빌드 다른 console error) — 본 PRD 에서 해소 불가. Cycle 5 의 1순위 후보.
- D1-D7 backlog (priest saturator / prudent famine / MAX_ARRIVALS 등) — cycle 5+ carry-over.
- 신규 feature, balance 패치, content 추가.

## 머지 가드

- typecheck/lint: PASS
- vitest: 1094 baseline + josa unit test 추가분 (1094+ N)
- circular: baseline 1 (회귀 0)
- e2e: cycle 1 spec PASS + 신규 polish spec (placeholder 0, 필터 13 한글 label)
- Playwright 정찰 재실행: console error 0 (favicon 포함), word-break 0, dev placeholder 0
- 50 cycle sim (seed 4096): 조사 오류 grep 0 건 (단순화 기준)

## Phase G self-check 예상

- 약점 고갈: ✗ (D1-D7 + cycle 4 자체 backlog 풍부)
- 3 연속 같은 1순위: cycle 0 saturation → 1 variance → 2 process → 3 prefix bug → **4 polish** = 5 cycle 모두 다른 카테고리. soft-halt 신호 없음.
- 자원 추정: cycle 1+2+3 partial 누적 ~88% context 였으나 새 세션 (이번) 시작 시 reset. cycle 4 는 짧게 polish 라 한 cycle 안에 full 가능.
- 새 cycle 진입 가능.

## Carry-over (cycle 5)

- prod 빌드 정찰 (`pnpm --filter @forge/game-inflation-rpg build:web`) → 사용자 보고 "계속 오류" root cause 재조사
- D1-D7 backlog (cycle 3 result.md 참조)
- narrative dedupe (saga book 같은 이벤트 반복 문제)
- modal panel elevation/shadow (정찰 보고의 "화면 4" 약점 2)
- status modal 빈 섹션 hint (V3 컨셉 fault 의 UI 측 대응)
