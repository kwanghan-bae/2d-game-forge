# `신의 마을: 영원의 후원자` 출시 준비 보강 계획

> **에이전트 작업자 필수 절차:** 작업별로 `superpowers:test-driven-development`를 적용하고, 독립 검토 뒤 다음 작업으로 이동한다. 이 문서는 초기 V4 구현을 다시 실행하는 계획이 아니라 2026-09-08 감사에서 확인한 출시 차단 문제를 해결하는 현재 계획이다.

**목표:** 안정적인 V4 수직 슬라이스를 설명과 실제 동작이 일치하고, 최소 서사와 측정 가능한 첫 30분 루프를 가진 출시 후보로 보강한다.

**구조:** V4 schema 1과 V3 저장 격리를 유지한다. 플레이어는 정책과 시설로 방향을 정하고 영웅은 15초의 개입 유예 뒤 정책에 맞는 다음 행동 하나를 선택한다. 결과 확인·위험 보스·Realm 해금·서사 선택은 자동 확정하지 않는다. 서사는 기존 `SagaEntry`에 결정론적 story beat를 기록하고, 계측은 게임 저장과 분리된 bounded local event log에 둔다.

**기술:** TypeScript, React 19, Vitest, Testing Library, Playwright, Next.js static build, GitHub Actions.

**기준 스펙:** `docs/superpowers/specs/2026-09-06-eternal-hero-town-tycoon-gdd-ko-design.md`

## 공통 제약

- V4 저장 키 `shin-ui-eternal-sponsor-v4-save-v1`과 schema 1을 유지한다.
- V3 저장을 자동으로 읽거나 덮어쓰지 않는다. 가져오기는 명시적 사용자 동작으로만 수행한다.
- 오프라인 정산은 최대 8시간, 효율 70%이며 보스 결과·선택·영구 해금을 자동 확정하지 않는다.
- `games/inflation-rpg/src/systems/paradoxSpiral.ts`, 같은 디렉터리의 `paradoxSpiral.test.ts`, `paradoxSpiralBalance.test.ts`는 수정하지 않는다.
- 사용자 `output/`, `tmp/`는 읽기·수정·커밋하지 않는다.
- 강제 광고와 전투 승리 판매를 추가하지 않는다.
- 신규 기능은 실패 테스트를 먼저 실행하고 예상한 이유로 실패한 것을 확인한 뒤 구현한다.
- 커밋은 허용되지만 push·merge·예약 실행·자율 반복 재개는 이 계획의 권한이 아니다.

---

### Task 1: 문서와 실행 제어 기준선 확정

**파일**

- 수정: `AGENTS.md`
- 수정: `README.md`
- 수정: `CLAUDE.md`
- 수정: `docs/README.md`
- 수정: `docs/PRODUCT.md`
- 수정: `docs/OPERATIONS.md`
- 수정: `docs/BACKLOG.md`
- 수정: `docs/DECISIONS.md`
- 수정: `docs/작업-현황.md`
- 수정: `docs/archive/README.md`
- 수정: `docs/superpowers/specs/2026-09-06-eternal-hero-town-tycoon-gdd-ko-design.md`
- 수정: 이 계획 파일
- 삭제: `docs/superpowers/evolution/RESUME.md`, `cycle-156-assets.md`를 제외한 과거 cycle 산출물
- 유지: 현재 문서 링크가 가리키는 `docs/archive/2026-09-08-*.md`
- 유지: `scripts/autonomy/control.mjs`, `scripts/autonomy/run.mjs`와 테스트

**결정**

- 현재 문서 진입점은 제품·운영·상태·백로그·결정으로 제한한다.
- 과거 cycle 문서는 Git 이력으로 복구할 수 있으므로 현재 트리에서 제거한다.
- 정책은 영웅의 다음 회복·훈련·원정을 고른다. 플레이어가 15초 안에 직접 행동하면 그 입력이 우선하며 결과·영구 진행·서사 선택은 계속 직접 확인한다.

- [x] 핵심 문서가 서로 같은 제품 역할과 자동화 범위를 설명하도록 수정한다.
- [x] `docs` 내부 Markdown 링크를 검사해 현재 문서의 깨진 상대 링크가 0개인지 확인한다.
- [x] `pnpm test:autonomy`를 실행해 16개 제어 테스트가 통과하는지 확인한다.
- [x] `git diff --check` 후 문서·제어 기준선만 커밋한다.

---

### Task 2: 영웅 자율 전이·원정 승률·시설 의미 일치

**파일**

- 수정: `games/inflation-rpg/src/v4/domain.ts`
- 수정: `games/inflation-rpg/src/v4/data.ts`
- 수정: `games/inflation-rpg/src/v4/heroRuntime.ts`
- 수정: `games/inflation-rpg/src/v4/types.ts`
- 수정: `games/inflation-rpg/src/v4/useV4Game.ts`
- 수정: `games/inflation-rpg/src/v4/V4App.tsx`
- 수정: `games/inflation-rpg/src/v4/screens/TownHubScreen.tsx`
- 수정: `games/inflation-rpg/src/v4/screens/ExpeditionScreen.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/v4Domain.test.ts`
- 수정: `games/inflation-rpg/src/v4/__tests__/useV4Game.test.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/TownHubScreen.test.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/ExpeditionScreen.test.tsx`

**인터페이스**

- `advanceHeroAutonomy(save, now): HeroAutonomyResult`는 한 번에 회복당·훈련소·원정 중 하나만 시작하며, `now - save.updatedAt < 15_000`이면 플레이어 개입을 기다린다.
- 공격 정책은 가장 높은 해금 영역, 비축 정책은 가장 낮은 위험 영역, 수련 정책은 훈련소를 선택한다. HP 35% 미만이면 정책보다 회복당이 우선한다.
- 진행 중 작업·원정·미확인 결과·다음 Realm 확인이 있거나 재화가 부족하면 자동 전이하지 않는다.
- `getExpeditionForecast(save, realmId, encounterIndex, assignedAgentId, expeditionId?)`는 결정론적 전투와 기존 확률 판정을 함께 계산하며 화면과 실제 정산이 공유한다. 전투 자체가 패배하면 표시 승률은 `0`이다.
- 회복당 설명은 실제 효과인 영웅 HP 완전 회복만 약속한다.
- 기록관 설명은 실제 효과인 사가 정리와 균열석 생산만 약속한다.

- [ ] **RED:** 정책별 대상, 15초 유예, 저HP 우선, 미확인 결과 차단을 검증하는 자율 전이 테스트를 추가하고 실패를 확인한다.
- [ ] **GREEN:** `decideHeroAction`과 `advanceHeroAutonomy`를 구현하고 1초 refresh에서 호출한다.
- [ ] **RED:** 공격력 0·HP 1인 영웅의 표시 승률이 0이어야 한다는 도메인 테스트를 추가하고 기존 구현에서 실패를 확인한다.
- [ ] **GREEN:** `getExpeditionForecast`를 화면과 정산이 공유하게 하고 길잡이·혼자 출발의 예측을 각각 표시한다.
- [ ] **RED:** 회복당과 기록관 설명이 정산 가능한 실제 효과만 안내하는지 화면 테스트를 추가하고 실패를 확인한다.
- [ ] **GREEN:** 마을 문구를 실제 시설 효과와 자율 전이에 맞춘다.
- [ ] 관련 V4 도메인·화면 테스트와 typecheck를 실행한 뒤 커밋한다.

---

### Task 3: 최소 출시 서사와 깊은 숲 선택

**파일**

- 생성: `games/inflation-rpg/src/v4/story.ts`
- 생성: `games/inflation-rpg/src/v4/__tests__/v4Story.test.ts`
- 수정: `games/inflation-rpg/src/v4/domain.ts`
- 수정: `games/inflation-rpg/src/v4/save.ts`
- 수정: `games/inflation-rpg/src/v4/types.ts`
- 수정: `games/inflation-rpg/src/v4/useV4Game.ts`
- 수정: `games/inflation-rpg/src/v4/V4App.tsx`
- 수정: `games/inflation-rpg/src/v4/screens/ExpeditionScreen.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/ExpeditionScreen.test.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/v4Domain.test.ts`

**인터페이스**

```ts
type StoryChoiceOptionId = 'protect_flame' | 'release_goblin';

function getRealmIntroEntry(realmId: RealmId, heroName: string, now: number): SagaEntry;
function getRealmVictoryEntry(realmId: RealmId, heroName: string, now: number): SagaEntry;
function getRejuvenationStoryEntry(heroName: string, years: number, now: number): SagaEntry;
function getAvailableStoryChoice(save: V4SaveEnvelope): StoryChoiceDefinition | null;
function chooseStoryChoice(save: V4SaveEnvelope, choice: StoryChoiceOptionId, now: number): DomainResult;
function hasV4Epilogue(save: V4SaveEnvelope): boolean;
```

선택 결과는 신규 schema 필드가 아니라 `saga-story-deep-forest-embers` saga entry로 저장한다. `protect_flame`은 월령 신뢰 +5와 균열석 +1, `release_goblin`은 솔바람 신뢰 +5와 재료 +2를 준다. 저승 승리는 게임 종료가 아닌 첫 사가의 완결 entry를 한 번 기록하고 이후 반복 플레이를 허용한다.

- [ ] **RED:** 프롤로그, 각 Realm 진입·승리, 회춘 기록이 한국 설화 세계의 인과를 설명하는지 literal fixture로 검증한다.
- [ ] **GREEN:** story catalog와 생성 함수를 구현한다.
- [ ] **RED:** 깊은 숲 승리 전 선택 불가, 승리 후 두 선택 중 하나만 기록 가능, 중복 선택 no-op 테스트를 추가한다.
- [ ] **GREEN:** `chooseStoryChoice`와 Saga 화면의 두 선택 버튼을 구현하고 선택 전에는 저승 해금을 보류한다.
- [ ] **RED:** 저승 승리 시 첫 사가 에필로그가 한 번만 기록되고 이후 원정은 계속 가능한지 테스트한다.
- [ ] **GREEN:** 저승 승리 정산에 중복 없는 에필로그를 연결한다.
- [ ] **RED:** 신뢰도 50 최초 도달 시 에이전트별 관계 milestone이 한 번만 기록되는지 테스트한다.
- [ ] **GREEN:** 작업 정산에 관계 milestone을 연결한다.
- [ ] Saga 화면과 원정 화면 테스트를 실행한 뒤 커밋한다.

---

### Task 4: 첫 30분 로컬 계측

**파일**

- 생성: `games/inflation-rpg/src/v4/telemetry.ts`
- 생성: `games/inflation-rpg/src/v4/__tests__/v4Telemetry.test.ts`
- 수정: `games/inflation-rpg/src/v4/useV4Game.ts`
- 수정: `games/inflation-rpg/src/v4/screens/SettingsScreen.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/useV4Game.test.tsx`
- 수정: `games/inflation-rpg/src/v4/__tests__/SettingsScreen.test.tsx`

**인터페이스**

```ts
type V4MetricName =
  | 'save_created'
  | 'facility_task_started'
  | 'policy_changed'
  | 'expedition_started'
  | 'expedition_finished'
  | 'offline_summary_opened'
  | 'story_choice_made';

interface V4MetricEvent {
  id: string;
  name: V4MetricName;
  occurredAt: number;
  saveCreatedAt: number;
  detail?: string;
}

interface V4OnboardingSummary {
  firstExpeditionSeconds: number | null;
  distinctDecisionKindsIn30Minutes: number;
  firstExpeditionWithin15Minutes: boolean;
  twoDecisionsWithin30Minutes: boolean;
}
```

로그 키는 `shin-ui-eternal-sponsor-v4-metrics-v1`, 최대 500건, 저장 실패 시 게임 진행은 계속한다. 영웅 이름이나 기기 식별자는 기록하지 않는다.

- [ ] **RED:** 잘못된 저장값 복구, 500건 상한, 중복 ID 방지 테스트를 추가한다.
- [ ] **GREEN:** bounded local metric store를 구현한다.
- [ ] **RED:** 첫 원정 900초 경계와 30분 내 서로 다른 결정 2종 요약 테스트를 추가한다.
- [ ] **GREEN:** `summarizeV4Onboarding`을 구현한다.
- [ ] **RED:** 실제 hook 액션이 성공했을 때만 이벤트가 기록되고 실패 액션에는 기록되지 않는 테스트를 추가한다.
- [ ] **GREEN:** 시설·정책·원정·오프라인·결말 액션에 계측을 연결한다.
- [ ] 설정 화면에 서버 전송 없는 로컬 진단 요약을 표시하고 테스트한 뒤 커밋한다.

---

### Task 5: 플레이 화면과 코드 경계 정리

**파일**

- 수정: `games/inflation-rpg/src/v4/V4App.tsx`
- 수정: `games/inflation-rpg/src/v4/styles.css`
- 수정: `games/inflation-rpg/src/v4/data.ts`
- 수정: `games/inflation-rpg/src/v4/screens/TownHubScreen.tsx`
- 수정: `games/inflation-rpg/src/v4/screens/ExpeditionScreen.tsx`
- 수정: 관련 V4 화면 테스트

**결과**

- 플레이어 화면에서 `LOCAL-FIRST · V4`와 혼용된 `Realm`을 제거하고 각각 `조선 설화 후원 RPG`, `영역`으로 바꾼다.
- 기존 Joseon pixel asset을 이용한 마을 hero strip을 추가하되 새 아트 스타일과 신규 이미지 생성은 하지 않는다.
- 430px 모바일 본문은 유지하되 760px 이상 화면에서는 영웅·목표와 시설·에이전트를 2열로 보여 빈 여백을 줄인다.
- `story.ts`와 `telemetry.ts`에 새 책임을 두어 `domain.ts`와 `useV4Game.ts`에 서사 문구·저장소 파싱을 추가하지 않는다.

- [ ] **RED:** 개발 용어가 플레이 화면에 없고 한국어 `영역`이 보이는지 화면 테스트를 추가한다.
- [ ] **GREEN:** 사용자 문구와 레이아웃을 수정한다.
- [ ] 390×844와 desktop Chromium 스크린샷 및 가로 스크롤 검사를 실행한다.
- [ ] V4 화면 테스트와 접근성 포커스 E2E를 실행한 뒤 커밋한다.

---

### Task 6: CI 출시 게이트와 최종 검증

**파일**

- 수정: `.github/workflows/ci.yml`
- 삭제: `games/inflation-rpg/tests/e2e/full-game-flow.spec.ts`
- 수정: `docs/BACKLOG.md`
- 수정: `docs/작업-현황.md`

**CI 계약**

- `check`: autonomy test, workspace typecheck/lint/unit test, circular dependency.
- `game-build`: `pnpm --filter @forge/game-inflation-rpg build`.
- `game-e2e`: game package Playwright Chromium과 iPhone 14 전체 시나리오.
- `portal-e2e`: 기존 dev-shell E2E.
- placeholder 테스트는 통과 개수에 포함하지 않는다.

- [ ] CI job을 분리하고 각 job이 frozen lockfile을 사용하는지 확인한다.
- [ ] `pnpm test:autonomy`를 실행한다.
- [ ] `pnpm --filter @forge/game-inflation-rpg typecheck`를 실행한다.
- [ ] `pnpm --filter @forge/game-inflation-rpg test`를 실행한다.
- [ ] `pnpm --filter @forge/game-inflation-rpg build`를 실행한다.
- [ ] `pnpm --filter @forge/game-inflation-rpg e2e`를 실행한다.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `git diff --check`를 실행한다.
- [ ] 백로그와 현재 상태를 실제 결과로 갱신하고 최종 검토 후 커밋한다.

## 출시 후보 판정

- 문서 기본 탐색에서 과거 cycle 보고서가 노출되지 않는다.
- 정책·시설·승률 설명과 실제 동작이 일치한다.
- 깊은 숲의 플레이어 선택을 거쳐 저승 승리로 완결되는 최소 서사 호가 존재한다.
- 첫 원정 15분, 서로 다른 결정 2종 30분 조건을 로컬 데이터로 계산할 수 있다.
- V4와 V3 저장 격리, 8시간 오프라인 정산, 결제·광고 실패 비차단이 회귀하지 않는다.
- game build와 game E2E가 원격 CI의 필수 job이다.
