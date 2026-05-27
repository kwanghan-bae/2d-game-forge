# Cycle 131 PRD — claim button + claimed flag

category: UI

## 한 줄

도전과제 reward 의 자동 입금을 폐지하고, 완료된 도전과제에 한해 사용자가 직접 누르는 **claim button** + **claimed flag** 인터랙션을 도입한다.

## 평가 핀포인트

- **게임비평가**: cycle 130 의 SeasonPassScreen 은 목록 + 환전 UI 만 있고, "받는다" 라는 행위가 보이지 않는다. 사용자의 진척 인지 (recognition) 가 자동 토큰 누적으로 평준화되어, 도전과제 완료의 카타르시스가 죽었다. completed 상태가 그저 회색 체크 아이콘으로만 표현되고, "내가 무엇을 얻었는가" 가 즉시 가시화되지 않는다. 다른 idle 게임의 기준선 (예: AFK Arena, Cookie Run Kingdom) 과 비교했을 때 claim 인터랙션 부재는 즉시 어색하다.
- **스토리작가**: V3 컨셉상 hero 는 후원자 (player) 의 자율 의지를 받아 진화한다. 토큰 자동 입금은 후원자의 능동성을 우회한다. claim 행위로 후원자가 직접 보상을 "수확" 하는 incentive arc 가 필요하다. 또한 cycle 130 의 도입부 "토큰: N" 헤더는 N 의 변화를 보고도 그 출처가 어떤 도전과제 였는지 알 수 없는 불투명한 grant flow 다. claim 행위가 출처와 시점을 묶어 user-driven attribution 을 만든다.
- **레벨디자이너**: 누적 환전과 claim 의 두 단계로 token sink-source 가 분리되면, 향후 cycle (132+) 에 한정 시간 claim window / claim 시 보너스 / claim 회수 limit 등 운영 hook 의 발판이 만들어진다. 현재의 fused grant 는 운영팀의 lever 가 0 이다. 또 cycle 129 의 `cycle129TokenEconomy.test.ts` 가 fused grant 를 전제로 짜여있어, 향후 token economy 의 미세 조정 시 회귀 가드가 fused 행동을 잠가버린다.

## 우선순위

1. **claim 액션 분리** — cycle 129 의 `evaluateAndGrantAchievements` 가 evaluator 와 grant 두 책임을 묶고 있다. UI 분기 가능하려면 store layer 의 책임 분리가 선결. 이 분리가 안 끝나면 button click 이 grant 의 진원지가 될 수 없다.
2. **SeasonPassScreen claim button + 상태 4 종 노출** — UI 표현의 진원지. 사용자에게 보이는 유일한 1 라인. 4 종 상태가 button 의 visual variant 와 1:1 매핑되어야 한다 (locked / claimable / claimed / disabled-error).
3. **회귀 가드 정합화** — cycle 129 의 `cycle129TokenEconomy.test.ts` 가 자동 grant 를 검증 중. claim 분리 후 그 테스트는 깨진다 (의도). claim 호출 형태로 갱신. 갱신은 명시적 claim 호출 1 줄 추가만으로 좁게 유지하여, 다른 invariant (F1.8 중복 차단 등) 의 의미를 보존한다.

## 기능 요구사항

### F1. claim button + claimed flag

- **목적**: 도전과제의 reward 입금을 자동 → 수동으로 전환. completed 와 claimed 두 state 를 분리하여 사용자 인터랙션을 명시화한다.

- **동작**:
  - **store action 분리**:
    - `evaluateAndGrantAchievements(saga, nowMs)` 의 **이름은 유지하되 grant 책임을 제거**한다. evaluator 호출 + `meta.achievements` 만 갱신. token 누적 0. claimedAt set 0. (advisor 권고 (a): 호출처 변경 0 로 안전.)
    - 본문 내부: evaluator 결과를 그대로 `meta.achievements` 에 저장. cycle 129 의 grantedById diff 루프 + tokenDelta 계산 + tokens 누적 block 을 **완전히 삭제**한다. 함수 이름과 시그니처만 그대로 유지.
    - 결과: cycle 종료 hook 호출 시 `meta.tokens` delta = 0. 새 entry 는 `completed === true && claimedAt === undefined` 상태로 저장.
  - **새 액션 `claimAchievement(id, nowMs?)` 추가**:
    - 시그니처 = `(id: AchievementId, nowMs?: number) => { ok: boolean; reason?: 'not-completed' | 'already-claimed' | 'unknown-id'; tokenDelta?: number }`.
    - id 검증: `ALL_ACHIEVEMENT_IDS` 에 없는 id → `{ ok: false, reason: 'unknown-id' }`.
    - completed 검증: `meta.achievements.byId[id].completed === false` → `{ ok: false, reason: 'not-completed' }`.
    - 중복 claim 차단: `claimedAt !== undefined` → `{ ok: false, reason: 'already-claimed' }`.
    - 통과 시: `claimedAt = nowMs ?? Date.now()` 박고, `meta.tokens += ACHIEVEMENT_CATALOG[id].reward.tokens` 누적, `{ ok: true, tokenDelta: ACHIEVEMENT_CATALOG[id].reward.tokens }` 반환.
    - immutable spread 강제. `prior.byId[id]` 도, `meta.achievements` 객체도 새 reference.
  - **SeasonPassScreen UI**: 각 achievement row 우측에 button 1 개. 상태 4 종 (button 의 visual variant 와 1:1 매핑):
    - **locked** (`completed === false`): button 자체 미노출. 진행도만 표시.
    - **claimable** (`completed === true && claimedAt === undefined`): button active, label = "수령 (+N 🎫)", color = `#ffd700` 배경, 최소 height 36px, click → `claimAchievement(id)` → feedback 영역에 성공 메시지 (2.5s).
    - **claimed** (`claimedAt != null`): button disabled, label = "수령 완료", color = muted gray (`#3b4252` 배경 + `#666` text), opacity 0.6.
    - **error/feedback**: claim 실패 시 sp-feedback 영역에 reason 한글 표시 ("이미 수령했습니다" / "도전과제가 아직 완료되지 않았습니다" / "잘못된 도전과제 id").
  - **상태 전이 (cycle hook 통과 후)**: completed 직후 tokens 변동 없음. 사용자가 SeasonPassScreen 진입해서 button click 해야만 tokens 증가. UI 의 button label 도 click 직후 "수령 완료" 로 즉시 전환. feedback 영역에 +N 표시.
  - **data-testid 명세 (Playwright 회귀용)**:
    - `sp-claim-btn-<id>`: 각 row 의 claim button. id = AchievementId (예: `sp-claim-btn-realm-conquest-6`).
    - `sp-claim-state-<id>`: button 상태 (`locked` / `claimable` / `claimed`) — disabled 속성 + aria-label 로 표현. test 가 이 attribute 로 분기.
    - `sp-feedback`: cycle 130 의 기존 feedback 영역 재사용.
    - `sp-tokens`: cycle 130 의 기존 token 잔액 display 재사용 (claim 후 즉시 갱신 확인).
  - **호출 흐름 (cycle 종료 → claim → 환전)**:
    1. cycleSliceV2.endCycle 의 hook → `evaluateAndGrantAchievements(saga, nowMs)` → `meta.achievements.byId[id].completed = true, completedAt = nowMs` (claimedAt 미설정).
    2. UI: MainMenu → SeasonPassScreen 진입 → completed && !claimedAt 인 row 에 "수령 (+N 🎫)" button 노출.
    3. 사용자 click → `claimAchievement(id)` → `claimedAt = Date.now(), meta.tokens += N` → button label 즉시 "수령 완료" + `sp-feedback` 에 성공 메시지.
    4. 누적된 tokens 를 환전 input 으로 균열석 N/10 변환 (cycle 130 의 기존 흐름 유지).
  - **edge case**:
    - 동시 cycle 에 ≥ 2 개 achievement 완료 → 각각 별개 claim 호출 필요. evaluator 의 1 cycle 안 batch 완료 가능성을 UI 가 ≥ 2 claimable button 으로 표현.
    - SeasonPassScreen 열려있는 동안 background 에서 cycle 종료 hook 호출 → useGameStore selector 가 자연스럽게 re-render 하여 새 claimable 즉시 노출 (Zustand store subscription).
    - claim button 연타 → 첫 click 의 set 안에서 claimedAt 박힌 후 두 번째 click 은 `{ ok: false, reason: 'already-claimed' }` (F1.2 idempotent).

- **수용 기준**:
  - **F1.1 (discriminator — 핵심)**: cycle 종료 직후 새로 완료된 achievement 가 1+ 개 있어도 `meta.tokens` delta = 0. 동일 시나리오에서 `claimAchievement(id)` 호출 후에만 tokens 누적이 일어난다. vitest 1 unit + 1 e2e 회귀 가드. 이 한 줄이 cycle 131 의 성패 분기.
  - **F1.2 (claim 액션 idempotent)**: `completed && !claimedAt` 인 동일 id 에 2 회 호출 시 1 회만 grant. 2 회차는 `{ ok: false, reason: 'already-claimed' }` 반환, tokens 변동 0, claimedAt 변경 0 (첫 1 회의 timestamp 보존).
  - **F1.3 (locked claim 차단)**: `completed === false` 인 id 에 claim 호출 시 `{ ok: false, reason: 'not-completed' }`, tokens 변동 0, byId 변경 0.
  - **F1.4 (unknown id 차단)**: `ALL_ACHIEVEMENT_IDS` 에 없는 id 문자열 (예: `'not-a-real-id'`) 로 호출 시 `{ ok: false, reason: 'unknown-id' }`, throw 0, state 변경 0.
  - **F1.5 (UI 4 state 정확)**: SeasonPassScreen 의 button text / aria-label / disabled 속성이 locked / claimable / claimed 3 state 별로 정확 (locked 는 button 미노출이라 sp-claim-btn-<id> 자체 부재). Playwright dev server 1× smoke 30 초 — `cycle131ClaimButton.spec.ts` (신규) 가 단일 cycle 안 강제 완료 → SeasonPassScreen 진입 → button claimable 확인 → click → claimed 전환 + tokens 누적 시나리오를 e2e 로 1 회 통과.
  - **F1.6 (persist v26 유지)**: 데이터 shape 변경 0 (`claimedAt?` 이미 optional). 기존 cycle 130 까지 진행된 user save 는 `completedAt === claimedAt` 인 entry 가 "이미 claim 됨" 으로 자연 해석되어 claimed 상태로 표시. **migration 불필요**, store version bump 없음. v26 → v27 transition 없음을 마이그레이션 테스트 그대로 통과로 확인.
  - **F1.7 (cycle 129 회귀 갱신)**: 기존 `cycle129TokenEconomy.test.ts` 의 F3.1 ("achievement 완료 → token 누적 e2e") 과 F1.8 ("중복 완료 차단") 시나리오는 claim 액션 호출을 추가한 형태로 갱신. 갱신 전 테스트가 깨지는 것은 정상 (의도된 행동 분기). 갱신은 endCycle 호출 후 token 누적 assertion 위에 `claimAchievement(id)` 호출 1 줄 + ok 검증 1 줄을 추가하는 형태로 좁게 한정.
  - **F1.8 (evaluator invariant 보존)**: achievementsLogic.ts 의 `evaluateAchievements` 는 **수정 0**. evaluator 가 claimedAt 을 절대 set 하지 않는 invariant (cycle 128 F1.11 회귀) 유지. cycle 131 의 변경은 store layer 와 UI layer 에 한정. pure logic 은 손대지 않는다.
  - **F1.9 (immutable invariant)**: claim 액션 호출 시 `meta.achievements` 객체 reference 가 변경됨 (React selector 가 re-render 되도록). byId 객체 reference 도 변경됨. 그러나 변경되지 않은 entry 는 동일 reference 보존 (선택적 memoization 의 진원지).

- **반대 기준 (NOT this)**:
  - **자동 grant 잔존 (NOT auto-claim)**: `evaluateAndGrantAchievements` 의 grant 부분이 *어떤 우회 경로로든* 살아있으면 안 된다. cycleSliceV2 의 다른 hook 에서 우회적으로 token 을 박는 코드도 금지.
  - **claim all 일괄 button (NOT batch claim)**: cycle 131 scope 아님. 모든 row 가 개별 button. 일괄은 cycle 132+ backlog (F3 candidate).
  - **claim window timer / expiry (NOT time-gated claim)**: 한정 시간 / 보너스는 cycle 132+ 의 운영 cycle scope. 본 cycle 은 단순 토글. claimedAt 은 단순 timestamp 일 뿐 expiry 로직 0.
  - **claim 시 VFX / sound (NOT audio-visual polish)**: 시각 효과는 별도 VFX cycle. 본 cycle 은 button label 전환만.
  - **claim attribute migration v27 (NOT schema bump)**: persist version 변경 0. 데이터 shape 그대로. migrate 함수 수정 0.
  - **evaluator 수정 (NOT pure logic change)**: achievementsLogic.ts 는 수정 0. 변경 surface 는 store + UI 만.

## 우선순위 외 backlog

- **F2 candidate (다음 cycle 후보)**: claim 시 시각 효과 (gold particle, 짧은 sound). 시청각 강화 — VFX category. cycle 134+ 의 카테고리 강제 회전 슬롯.
- **F3 candidate**: claim all 일괄 button (≥ 3 claimable 일 때만 등장). UX category. 본 cycle 에서 빼는 이유 = 단일 claim 의 행동 분기 검증이 먼저. 일괄은 단일 claim 위에 layered 로 자연스럽게 쌓인다.
- **F4 candidate**: 한정 시간 claim window (예: 완료 후 7 일 내 claim 안 하면 reward 반감). 운영 category. claim 액션이 분리된 후에야 의미가 있다.
- **F5 candidate**: claim 시점의 누적 카드 history (timeline 으로 "언제 어떤 도전을 수령했는가"). meta 통계 category. token attribution 의 다음 단계.
- **F6 candidate**: claimable count badge 를 MainMenu 의 SeasonPass 진입 버튼에 노출 (예: "도전과제 (3)"). 진입 incentive 강화. UI category 라 cycle 131 의 룰 9 충돌로 미룸.

## 비고

- **카테고리 룰 9 체크**: 128 system → 129 system → 130 UI → **131 UI (2 연속, 3 연속 금지 조건 통과)**. **cycle 132 는 UI 카테고리 금지** — system / balance / meta / VFX / 운영 중 하나 강제. 이 가드를 cycle 132 planner dispatch 시 1 줄 reminder 로 carry-over.
- **Δ-from-baseline 룰 미적용**: 본 cycle 의 수용 기준은 sim-driven 측정이 아니라 store action 단위 행동 + UI button state 매핑이다. 따라서 cycle 132+ 의 sim 회귀가 동반될 때까지 multi-seed sim Δ-guard 는 본 PRD scope 외.
- **Sim-real parity 검증 룰 미적용**: 동일 이유. 단 F1.4 의 Playwright dev server 1× smoke 는 의무로 유지 (수동 click → tokens 누적 → 환전 e2e 1 회).
- **PRD 산술 충돌 사전 검증**: 본 PRD 의 다항 수용 기준 (F1.1 + F1.2 + F1.3) 은 상호 배타 (claim 의 3 경로). 산술 충돌 없음.
- **persist v26 유지 근거**: `claimedAt?: number` 는 cycle 128 부터 이미 optional 로 정의됨. cycle 129 hook 이 항상 채워 넣었기 때문에 기존 save 의 모든 completed entry 는 claimedAt 도 set. 새 로직 하에서 그 entry 들은 자연스럽게 "이미 claim 됨" 으로 해석되어 사용자는 잃는 reward 없음. v27 migration 불필요.
- **호출처 영향**: cycleSliceV2.endCycle hook 의 `evaluateAndGrantAchievements(saga, nowMs)` 호출은 **시그니처 / 호출처 변경 0**. 함수 본체 안의 grant block 만 제거. 따라서 cycleSliceV2 / cycleSliceV2.helpers 의 회귀 가드는 자동으로 통과.
- **컨셉 가드**: V3 의 "eternal hero idle sponsor" 에서 후원자 (player) 의 능동성을 강조하는 방향. 자동 입금은 후원자 행위를 우회. 본 cycle 은 컨셉 정렬.
- **리스크**:
  - **R1 (medium)**: SeasonPassScreen 의 button DOM 이 늘어나면서 mobile viewport 의 스크롤 / 44px touch target 룰 (Phase 4a 의 MobileUX) 충돌 가능성. row layout 검증 의무. Playwright iPhone 14 viewport snapshot 1 회 + button 의 min-height 36px (claimed disabled) / 44px (claimable active) 명시. claimable button 은 사용자 click target 이므로 44px 룰 적용, claimed 는 비대화형이라 36px 허용.
  - **R2 (low)**: cycle 129 의 `cycle129TokenEconomy.test.ts` 갱신 시 F3.1 / F1.8 / 그 외 인접 시나리오까지 의도치 않게 깨질 수 있음. 갱신은 명시적 claim 호출 추가 만으로 좁게 유지. 갱신 후 vitest 1443+ 의 회귀 0 확인.
  - **R3 (low)**: completed && claimedAt === undefined 인 entry 의 정의를 evaluator 와 store action 양쪽이 일치하게 해석해야 한다. evaluator 는 claimedAt 을 절대 set 하지 않는 invariant (achievementsLogic.ts F1.11 회귀) 유지 의무. F1.8 의 단위 테스트로 회귀 가드.
  - **R4 (low)**: cycle 130 의 `SeasonPassScreen.tsx` 의 row layout 이 button 추가 후 가로 overflow 가능성. row 의 flex 배치를 재검토하여 button 영역을 별도 column 으로 분리. 진행도 표시는 button 좌측 또는 row 하단으로 배치.
  - **R5 (low)**: claim 액션의 set 안에서 byId 객체 reference 가 변경되는데, 변경되지 않은 entry 들의 reference 까지 새로 만들어내면 SeasonPassScreen 의 row 전체가 re-render 되어 button click 의 즉시 피드백이 손상될 가능성. claim 액션 내부에서 변경 entry 만 spread 하고 나머지는 기존 reference 보존하는 spread 패턴 의무.
- **의존성**:
  - cycle 128 의 `AchievementProgress` 의 `claimedAt?: number` (이미 정의됨, 변경 0).
  - cycle 128 의 `achievementsLogic.ts` 의 `evaluateAchievements` (변경 0, 호출만).
  - cycle 129 의 `evaluateAndGrantAchievements` (gameStore.ts, 수정 대상 — grant block 제거).
  - cycle 129 의 `cycle129TokenEconomy.test.ts` (수정 대상 — claim 호출 추가).
  - cycle 130 의 `SeasonPassScreen.tsx` (button 추가 대상).
  - cycle 130 의 `MainMenu.tsx` (변경 0, SeasonPassScreen 진입점 그대로).
- **carry-over**:
  - cycle 131 종료 후 carry-over 없음 (단일 cycle 완결).
  - cycle 132 의 카테고리 강제 회전 메모만 INDEX.md 에 남기면 됨 (UI 3 연속 차단).
  - cycle 132 의 후보 = system / balance / meta / VFX / 운영 중 1. F2 candidate (claim 시 VFX) 는 cycle 134+ 의 카테고리 회전 슬롯에서 선택 가능.
- **검증 명령 (cycle 131 종료 시점)**:
  - `pnpm --filter @forge/game-inflation-rpg test` — 1443+ → 1450+ (claim 액션 4 unit 추가 + cycle 129 갱신).
  - `pnpm --filter @forge/game-inflation-rpg e2e -g cycle131ClaimButton` — 1 회 dev server smoke.
  - `pnpm --filter @forge/game-inflation-rpg typecheck` — 0 exit.
  - `grep -rn 'tokens.*+=' games/inflation-rpg/src/store/gameStore.ts` — claim action 만 hit (cycleSliceV2 hook 안에는 0).
- **컨셉 가드 재확인**: V3 의 후원자 능동성 강화. inflation-rpg 의 정체성 (1 → 수십만 레벨 폭발) 과 무관한 인터랙션 변경. balance / 곡선 수정 0. spec drift 0.
- **변경 surface 추정 (cycle scope 의 가시화)**:
  - `gameStore.ts` — `evaluateAndGrantAchievements` 의 grant block 삭제 (~40 줄 삭제), `claimAchievement(id, nowMs?)` 액션 신규 추가 (~30 줄). 순 변동 -10 ~ +0 줄.
  - `SeasonPassScreen.tsx` — button + 상태 분기 (~25 줄 추가). claimed 일 때의 button visual variant + feedback message KR (~5 줄). 순 변동 +30 줄.
  - `cycle129TokenEconomy.test.ts` — F3.1 + F1.8 갱신 (claim 호출 추가, ~10 줄). assertion 1-2 줄 추가. 순 변동 +12 줄.
  - 신규 `cycle131ClaimAction.test.ts` (vitest 단위) — F1.1~F1.4 / F1.8 / F1.9 (~80 줄). 순 변동 +80 줄.
  - 신규 `e2e/cycle131ClaimButton.spec.ts` (Playwright) — F1.5 dev server smoke (~40 줄). 순 변동 +40 줄.
  - **총 변동 추정**: +150 ~ +180 줄 추가, ~40 줄 삭제. 작은 cycle 의 크기 적정.
- **PRD 본문 길이 정당화**: F1 only 의 작은 cycle scope 임에도, 4 state UI / 3 reason 분기 / 회귀 가드 의무 / cycle 129 갱신 의무 등 spec 의무가 다층. 따라서 본문은 ~120 줄 수준에서 안정. 가이드 (200-500 줄) 미달 의도적. 추가 padding 은 spec hygiene 손상.
