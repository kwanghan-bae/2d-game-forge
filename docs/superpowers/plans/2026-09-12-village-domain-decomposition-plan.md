# Village Domain Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 `village/domain.ts`의 기능별 공개 유스케이스를 독립 모듈로 분리하고, 기존 façade·동작·저장 계약을 유지한다.

**Architecture:** `domain.ts`는 기존 외부 import를 보존하는 re-export façade가 된다. 실제 구현은 hero, facility, expedition, story, intervention, rewards, settings와 의미별 shared 모듈로 이동하며, 각 모듈은 `VillageSaveEnvelope`를 입력으로 받아 현재의 상태 복제·결과 반환 semantics를 유지한다. 이번 계획에서는 `@forge/core`, `save.ts`, `useVillageGame.ts`, `types.ts`의 구조를 바꾸지 않는다.

**Tech Stack:** TypeScript, React/Vitest 테스트 환경, pnpm workspace, ESLint, Madge, Next.js/Playwright 검증 명령

**Spec:** `docs/superpowers/specs/2026-09-12-reusable-domain-modules-design.md`

## Global Constraints

- 현재 제품은 `신의 마을: 영원의 후원자`이며 Android 식별자는 `com.shinui.eternalsponsor`다.
- canonical 저장 키는 `shin-ui-eternal-sponsor-save-v2`이며 현재 schema만 읽고 과거 저장 import를 추가하지 않는다.
- `domain.ts`의 기존 export 이름·인자·반환 타입과 현재 저장·오프라인·원정 동작을 유지한다.
- 도메인 모듈은 React·브라우저 전역·localStorage·광고·결제를 직접 참조하지 않는다.
- 기능 모듈은 `domain.ts` façade를 import하지 않는다.
- 공용 코어에는 현재 게임 고유 규칙과 RPG 계약을 추가하지 않는다.
- `domain.ts`는 구현 없이 re-export 중심이며 120줄 이하를 목표로 한다.
- 공개 유스케이스 모듈이 400줄을 넘으면 추가 기능 분해를 검토한다.
- 보호된 `games/inflation-rpg/src/systems/paradoxSpiral.ts`, `paradoxSpiral.test.ts`, `paradoxSpiralBalance.test.ts`와 사용자 `output/`, `tmp/`는 변경·커밋하지 않는다.
- 모든 단계는 관련 Vitest와 typecheck를 통과한 뒤 별도 로컬 커밋으로 남기며 push하지 않는다.

---

## Scope Check

설계 문서는 domain 분해, core 계약, save 경계, React hook, 타입 정리라는 독립
하위 시스템을 포함한다. 이 계획은 그중 단계 A인 `village/domain.ts` 분해만
구현한다. 단계 B~E는 단계 A의 public API와 검증 결과를 확인한 뒤 별도의
sub-project 계획으로 작성한다. 따라서 이 계획만 완료해도 현재 제품이
동일하게 빌드·테스트되는 독립 결과를 만든다.

## File Map

### Create

- `games/inflation-rpg/src/village/domain/contracts.ts` — 기존 domain 결과 union, preview, upgrade 비용, domain 상수를 담는다.
- `games/inflation-rpg/src/village/domain/shared/guards.ts` — 시간·정책·agent·수치 검증만 담당한다.
- `games/inflation-rpg/src/village/domain/shared/saveMutation.ts` — save 복제·timestamp·touch·사가 entry 보조를 담당한다.
- `games/inflation-rpg/src/village/domain/shared/resourceMath.ts` — 지불·지급·배율·포화 산술을 담당한다.
- `games/inflation-rpg/src/village/domain/shared/ids.ts` — save/task id 충돌 회피를 담당한다.
- `games/inflation-rpg/src/village/domain/hero/autonomy.ts` — hero action 결정·진행·autonomy를 담당한다.
- `games/inflation-rpg/src/village/domain/hero/progression.ts` — hero 경험치·회춘·power를 담당한다.
- `games/inflation-rpg/src/village/domain/facility/preview.ts` — facility task와 blacksmith preview를 담당한다.
- `games/inflation-rpg/src/village/domain/facility/tasks.ts` — facility task 시작·취소와 agent 휴식을 담당한다.
- `games/inflation-rpg/src/village/domain/facility/upgrade.ts` — facility upgrade 비용·변경을 담당한다.
- `games/inflation-rpg/src/village/domain/expedition/forecast.ts` — expedition success chance·forecast·다음 realm 조회를 담당한다.
- `games/inflation-rpg/src/village/domain/expedition/commands.ts` — expedition 시작·pending 확인·realm unlock을 담당한다.
- `games/inflation-rpg/src/village/domain/expedition/settlement.ts` — facility task 완료와 expedition 전투·정산 조합을 담당한다.
- `games/inflation-rpg/src/village/domain/story/choices.ts` — story 선택 적용을 담당한다.
- `games/inflation-rpg/src/village/domain/intervention/commands.ts` — intervention charge 획득·사용을 담당한다.
- `games/inflation-rpg/src/village/domain/rewards/offline.ts` — offline resource bonus 적용을 담당한다.
- `games/inflation-rpg/src/village/domain/settings/commands.ts` — village policy·settings 변경을 담당한다.
- `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts` — façade와 각 public module의 동일 export 및 façade 역참조 금지 계약을 검사한다.

### Modify

- `games/inflation-rpg/src/village/domain.ts` — 구현을 제거하고 기존 public API를 새 모듈에서 re-export한다.
- `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts` — 기능별 테스트 파일로 이동할 테스트의 import와 describe 범위를 정리한다.
- `games/inflation-rpg/src/village/__tests__/saveRecovery.test.ts` — domain 직접 import가 생기는 경우 현재 save 정산 계약을 유지하도록 import만 조정한다.
- `games/inflation-rpg/src/village/__tests__/useVillageGame.test.tsx` — hook이 façade 또는 public domain API를 통해 동일한 명령을 호출하는지 import만 조정한다.

### Do not modify in this plan

- `games/inflation-rpg/src/village/save.ts`
- `games/inflation-rpg/src/village/useVillageGame.ts`의 책임 분해
- `games/inflation-rpg/src/types.ts`
- `packages/2d-core/**`
- Android, Capacitor, public assets, protected Paradox files, `output/`, `tmp/`

## Public Interfaces Fixed Before Implementation

`domain.ts` façade와 새 모듈은 다음 이름과 타입을 사용한다. `VillageSaveEnvelope`,
`FacilityId`, `RealmId`, `SupportAgentId`, `VillagePolicy`, `VillageSettings`,
`InterventionType`, `StoryChoiceOptionId`는 기존 `village/types.ts`의 타입을
그대로 참조하고, `StoryDomainResult`는 기존 `village/story.ts`의 타입을
그대로 참조한다.

```ts
// domain/contracts.ts
export type DomainResult<T extends VillageSaveEnvelope = VillageSaveEnvelope> =
  | { ok: true; save: T; task: FacilityTask }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export type HeroDomainResult =
  | { ok: true; save: VillageSaveEnvelope; result: RejuvenationResult }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export type AgentDomainResult =
  | { ok: true; save: VillageSaveEnvelope }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export type InterventionDomainResult =
  | { ok: true; save: VillageSaveEnvelope; intervention: InterventionType }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export interface FacilityTaskPreview {
  facilityId: FacilityId;
  durationSeconds: number;
  input: Partial<Record<VillageCurrencyKey, number>>;
  output: Partial<Record<VillageCurrencyKey, number>>;
  outputEquipmentIds: string[];
  heroExpGain: number;
  assignedAgentId: SupportAgentId | null;
  canStart: boolean;
  error: string | null;
}

export type FacilityUpgradeCost = { gold: number; materials: number };
```

Public function signatures remain:

```ts
// hero/autonomy.ts
export function advanceHeroActions(source: VillageSaveEnvelope, actions: number, now: number): VillageSaveEnvelope;
export function getHeroNextAction(source: VillageSaveEnvelope): HeroAction;
export function decideHeroAction(source: VillageSaveEnvelope): HeroAutonomyDecision;
export function advanceHeroAutonomy(source: VillageSaveEnvelope, now: number): HeroAutonomyResult;

// hero/progression.ts
export function rejuvenateHero(source: VillageSaveEnvelope, years: number, now: number): HeroDomainResult;
export function getVillageHeroPower(save: VillageSaveEnvelope): number;

// facility
export function getBlacksmithEquipmentOutput(source: VillageSaveEnvelope): string;
export function getBlacksmithEquipmentRecommendation(source: VillageSaveEnvelope): string | null;
export function getFacilityTaskPreview(source: VillageSaveEnvelope, facilityId: FacilityId, assignedAgentId?: SupportAgentId | null): FacilityTaskPreview;
export function startFacilityTask(source: VillageSaveEnvelope, facilityId: FacilityId, now: number, assignedAgentId?: SupportAgentId | null): DomainResult;
export function cancelFacilityTask(source: VillageSaveEnvelope, facilityId: FacilityId, now: number): DomainResult;
export function restAgent(source: VillageSaveEnvelope, agentId: SupportAgentId, now: number): AgentDomainResult;
export function upgradeFacility(source: VillageSaveEnvelope, facilityId: FacilityId, now: number): DomainResult;
export function getFacilityUpgradeCost(source: VillageSaveEnvelope, facilityId: FacilityId): FacilityUpgradeCost | null;

// expedition
export function getExpeditionSuccessChance(source: VillageSaveEnvelope, realmId: RealmId, encounterIndex?: number, assignedAgentId?: SupportAgentId | null): number;
export function getExpeditionForecast(source: VillageSaveEnvelope, realmId: RealmId, encounterIndex?: number, assignedAgentId?: SupportAgentId | null, expeditionId?: string): ExpeditionForecast;
export function getNextRealmId(realmId: RealmId): RealmId | null;
export function startExpedition(source: VillageSaveEnvelope, realmId: RealmId, now: number, policy: VillagePolicy, assignedAgentId: SupportAgentId | null): DomainResult;
export function confirmPendingExpedition(source: VillageSaveEnvelope, now: number): VillageSaveEnvelope;
export function confirmNextRealmUnlock(source: VillageSaveEnvelope, now: number): VillageSaveEnvelope;
export function completeFacilityTasks(source: VillageSaveEnvelope, now: number, outputEfficiency?: number, allowPermanentUnlock?: boolean, allowHistoricalSettlement?: boolean, allowRiskyBossConfirmation?: boolean): VillageSaveEnvelope;
export function completeFacilityTaskNow(source: VillageSaveEnvelope, facilityId: FacilityId, now: number): DomainResult;

// remaining commands
export function chooseStoryChoice(source: VillageSaveEnvelope, choice: StoryChoiceOptionId, now: number): StoryDomainResult;
export function grantOfflineResourceBonus(source: VillageSaveEnvelope, gains: Partial<Record<VillageCurrencyKey, number>>, now: number): VillageSaveEnvelope;
export function grantInterventionCharge(source: VillageSaveEnvelope, now: number): VillageSaveEnvelope;
export function useIntervention(source: VillageSaveEnvelope, intervention: InterventionType, now: number): InterventionDomainResult;
export function setVillagePolicy(source: VillageSaveEnvelope, policy: VillagePolicy, now: number): VillageSaveEnvelope;
export function updateVillageSettings(source: VillageSaveEnvelope, patch: Partial<VillageSettings>, now: number): VillageSaveEnvelope;
```

`domain.ts`는 기존 타입·상수 import 호환도 유지한다. 따라서 contracts를 다음과
같이 façade에서 re-export한다.

```ts
export type {
  AgentDomainResult,
  DomainResult,
  FacilityTaskPreview,
  FacilityUpgradeCost,
  HeroDomainResult,
  InterventionDomainResult,
} from './domain/contracts';
export { AGENT_REST_RECOVERY, MAX_INTERVENTION_CHARGES } from './domain/contracts';
```

## Implementation Tasks

### Task 1: Add boundary contracts and the first failing module contract test

**Files:**
- Create: `games/inflation-rpg/src/village/domain/contracts.ts`
- Create: `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts`
- Modify: `games/inflation-rpg/src/village/domain.ts:1-76` only to remove duplicated type definitions after the new contracts exist
- Test reference: `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts`

**Interfaces:**
- Consumes: existing `DomainResult`, `HeroDomainResult`, `AgentDomainResult`, `InterventionDomainResult`, `FacilityTaskPreview`, `FacilityUpgradeCost`, `MAX_INTERVENTION_CHARGES`, and `AGENT_REST_RECOVERY` definitions in `domain.ts`.
- Produces: `domain/contracts.ts` exports that all later feature modules import without importing the façade.

- [ ] **Step 1: Write the failing contract test**

Create the test against the contracts module that this task will provide. Keep
feature-module imports out of this first commit; later tasks extend this same test
after their direct modules exist.

```ts
import { describe, expect, it } from 'vitest';
import * as facade from '../../domain';
import * as contracts from '../contracts';

describe('Village domain module boundaries', () => {
  it('keeps public result constants available through the façade', () => {
    expect(facade.MAX_INTERVENTION_CHARGES).toBe(contracts.MAX_INTERVENTION_CHARGES);
    expect(facade.AGENT_REST_RECOVERY).toBe(contracts.AGENT_REST_RECOVERY);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts
```

Expected: FAIL because `domain/contracts.ts` does not exist yet.

- [ ] **Step 3: Move the public contracts without changing their shapes**

Copy the four result unions, `FacilityTaskPreview`, and `FacilityUpgradeCost` into
`domain/contracts.ts`. Import the existing value types from `../../types` and the
existing `FacilityTask` type from `../../types`; do not introduce a second save type.
In the same file, preserve the existing constant exports exactly:

```ts
export { Village_MAX_INTERVENTION_CHARGES as MAX_INTERVENTION_CHARGES } from '../../types';
export const AGENT_REST_RECOVERY = 25;
```

Remove the duplicate declarations from `domain.ts` and re-export both constants and
all six result/preview/cost types through the façade as shown above.

- [ ] **Step 4: Run typecheck and the existing domain test**

Run:

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/__tests__/villageDomain.test.ts
```

Expected: the contract file compiles; the full domain test remains green because the
façade still owns the implementation at this checkpoint.

- [ ] **Step 5: Commit the contract-only change**

```bash
git add games/inflation-rpg/src/village/domain.ts games/inflation-rpg/src/village/domain/contracts.ts games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts
git commit -m "refactor: define village domain module contracts"
```

### Task 2: Extract shared pure helpers and the hero modules

**Files:**
- Create: `games/inflation-rpg/src/village/domain/shared/guards.ts`
- Create: `games/inflation-rpg/src/village/domain/shared/saveMutation.ts`
- Create: `games/inflation-rpg/src/village/domain/shared/resourceMath.ts`
- Create: `games/inflation-rpg/src/village/domain/shared/ids.ts`
- Create: `games/inflation-rpg/src/village/domain/hero/autonomy.ts`
- Create: `games/inflation-rpg/src/village/domain/hero/progression.ts`
- Modify: `games/inflation-rpg/src/village/domain.ts`
- Modify: `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts`
- Test: `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts`

**Interfaces:**
- Consumes: `domain/contracts.ts`, existing village `types.ts`, `data.ts`, `equipment.ts`, `heroRuntime.ts`, `HeroLifecycle`, and story entries.
- Produces: `advanceHeroActions`, `getHeroNextAction`, `decideHeroAction`, `advanceHeroAutonomy`, `rejuvenateHero`, and `getVillageHeroPower` from their respective direct modules.

- [ ] **Step 1: Extend the failing boundary test for hero exports**

Add these imports and assertions before moving implementation:

```ts
import {
  advanceHeroActions,
  advanceHeroAutonomy,
  decideHeroAction,
  getHeroNextAction,
} from '../hero/autonomy';
import { getVillageHeroPower, rejuvenateHero } from '../hero/progression';

it('exposes hero operations through the façade without wrapping them', () => {
  expect(facade.advanceHeroActions).toBe(advanceHeroActions);
  expect(facade.advanceHeroAutonomy).toBe(advanceHeroAutonomy);
  expect(facade.decideHeroAction).toBe(decideHeroAction);
  expect(facade.getHeroNextAction).toBe(getHeroNextAction);
  expect(facade.getVillageHeroPower).toBe(getVillageHeroPower);
  expect(facade.rejuvenateHero).toBe(rejuvenateHero);
});
```

- [ ] **Step 2: Run the contract test to verify the new imports fail**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts
```

Expected: FAIL because the hero modules are not present.

- [ ] **Step 3: Move helper implementations by dependency direction**

Move only helpers with the following ownership:

```text
guards.ts        MAX_ECONOMY_VALUE, positiveFiniteLevel, isPersistableClock,
                 isValidCompletionWindow, safeCompletionTimestamp,
                 isActionClockValid, isVillagePolicy, isValidAgentFatigue,
                 isValidAgentLevel, isValidAgentTrust, isValidAgentState,
                 isValidCurrencyBalance, isPersistableFiniteNumber
saveMutation.ts  cloneSave, eventTimestamp, touchSave,
                 addUniqueStoryEntry, syncHeroAction
resourceMath.ts  safeScaledEconomyAmount, canPay, canApplyCurrencyOutput, pay,
                 give
ids.ts            isSaveIdUsed, nextSaveId, nextTaskId
```

Keep feature-private helpers with their only responsibility: hero autonomy keeps
`advanceHeroActionsInPlace`, `blockedAutonomyDecision`, and `getAutonomyRealmId`;
hero progression keeps `saturatingAdd`; facility preview keeps
`boundedMultiplier`, `safeDurationSeconds`, `savedEquipmentLevel`, and
`facilityTaskEconomy`; expedition forecast keeps `emptyBattleResult`,
`clampSuccessChance`, `deterministicRoll`, and `expeditionDurationSeconds`
(exported only for direct expedition command/settlement use); expedition settlement keeps
`saturatingCounterAdd`,
`scaleResources`, `normalizeSettlementEfficiency`, `applyHeroExperience`, and
`grantEquipmentLevel`; intervention commands keep `isInterventionType` and
`isValidInterventionCharges`; settings commands keep `clampVolume`. Each moved
helper must preserve the current constants and numeric bounds exactly. If a helper
is needed by more than one feature module, move it to the named shared file instead
of duplicating it.

`emptyBattleResult` is forecast-only in the current source and therefore remains
private to `expedition/forecast.ts`; `syncHeroAction` is shared because facility
commands and settlement both call it. Do not export either helper through the
façade.

- [ ] **Step 4: Move hero operations and wire direct imports**

Move the implementation ranges currently containing `advanceHeroActions`
and its in-place helper `advanceHeroActionsInPlace`,
`getHeroNextAction`, `decideHeroAction`, `advanceHeroAutonomy`, `rejuvenateHero`,
and `getVillageHeroPower` into the two hero files. Replace same-file helper calls
with imports from `shared/` and `domain/contracts.ts`. Do not change function bodies
beyond import paths and removing code now owned by shared modules.

Add the façade re-exports:

```ts
export {
  advanceHeroActions,
  advanceHeroAutonomy,
  decideHeroAction,
  getHeroNextAction,
} from './domain/hero/autonomy';
export { getVillageHeroPower, rejuvenateHero } from './domain/hero/progression';
```

- [ ] **Step 5: Run focused tests and commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts src/village/__tests__/villageDomain.test.ts src/village/__tests__/useVillageGame.test.tsx
git diff --check
git add games/inflation-rpg/src/village/domain.ts games/inflation-rpg/src/village/domain/ games/inflation-rpg/src/village/__tests__/villageDomain.test.ts
git commit -m "refactor: extract village hero domain modules"
```

Expected: all focused tests pass and the façade identity assertions are green.

### Task 3: Extract facility preview, task, and upgrade modules

**Files:**
- Create: `games/inflation-rpg/src/village/domain/facility/preview.ts`
- Create: `games/inflation-rpg/src/village/domain/facility/tasks.ts`
- Create: `games/inflation-rpg/src/village/domain/facility/upgrade.ts`
- Modify: `games/inflation-rpg/src/village/domain.ts`
- Modify: `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts`
- Test: `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts`

**Interfaces:**
- Consumes: shared helpers and hero progression/autonomy modules from Task 2, plus current village data and equipment definitions.
- Produces: blacksmith preview, facility preview, facility task commands, agent rest, and upgrade functions with the signatures in `Public Interfaces Fixed Before Implementation`.

- [ ] **Step 1: Add facility boundary assertions before moving code**

```ts
import {
  getBlacksmithEquipmentOutput,
  getBlacksmithEquipmentRecommendation,
  getFacilityTaskPreview,
} from '../facility/preview';
import { cancelFacilityTask, restAgent, startFacilityTask } from '../facility/tasks';
import { getFacilityUpgradeCost, upgradeFacility } from '../facility/upgrade';

it('exposes facility operations through the façade without wrappers', () => {
  expect(facade.getBlacksmithEquipmentOutput).toBe(getBlacksmithEquipmentOutput);
  expect(facade.getBlacksmithEquipmentRecommendation).toBe(getBlacksmithEquipmentRecommendation);
  expect(facade.getFacilityTaskPreview).toBe(getFacilityTaskPreview);
  expect(facade.startFacilityTask).toBe(startFacilityTask);
  expect(facade.cancelFacilityTask).toBe(cancelFacilityTask);
  expect(facade.restAgent).toBe(restAgent);
  expect(facade.getFacilityUpgradeCost).toBe(getFacilityUpgradeCost);
  expect(facade.upgradeFacility).toBe(upgradeFacility);
});
```

- [ ] **Step 2: Run the boundary test and record the expected failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts
```

Expected: FAIL because the facility module paths do not exist.

- [ ] **Step 3: Move preview and task implementations**

Move `getBlacksmithEquipmentOutput`, `getBlacksmithEquipmentRecommendation`, and
`getFacilityTaskPreview` to `facility/preview.ts`. Move `startFacilityTask`,
`cancelFacilityTask`, and `restAgent` to `facility/tasks.ts`. Keep the current
`FacilityTaskPreview` and result types imported from `domain/contracts.ts`.

`facility/tasks.ts` may call `hero/progression.ts` and shared resource helpers, but
must not import `domain.ts`. Preserve the existing handling for invalid clocks,
missing facilities, active tasks, payment failure, and agent fatigue.

- [ ] **Step 4: Move upgrade implementation and update façade exports**

Move `upgradeFacility` and `getFacilityUpgradeCost` to `facility/upgrade.ts`. Add:

```ts
export {
  getBlacksmithEquipmentOutput,
  getBlacksmithEquipmentRecommendation,
  getFacilityTaskPreview,
} from './domain/facility/preview';
export { cancelFacilityTask, restAgent, startFacilityTask } from './domain/facility/tasks';
export { getFacilityUpgradeCost, upgradeFacility } from './domain/facility/upgrade';
```

Remove only the moved implementations and imports from `domain.ts`; leave unrelated
facility settlement code until Task 4.

- [ ] **Step 5: Run focused facility coverage and commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts src/village/__tests__/villageDomain.test.ts src/village/__tests__/TownHubScreen.test.tsx src/village/__tests__/ExpeditionScreen.test.tsx
pnpm exec madge --circular --extensions ts,tsx --ts-config tsconfig.madge.json apps packages games
git diff --check
git add games/inflation-rpg/src/village/domain.ts games/inflation-rpg/src/village/domain/ games/inflation-rpg/src/village/__tests__/villageDomain.test.ts
git commit -m "refactor: extract village facility domain modules"
```

Expected: focused tests pass and Madge reports no circular dependency.

### Task 4: Extract expedition forecast, commands, and settlement

**Files:**
- Create: `games/inflation-rpg/src/village/domain/expedition/forecast.ts`
- Create: `games/inflation-rpg/src/village/domain/expedition/commands.ts`
- Create: `games/inflation-rpg/src/village/domain/expedition/settlement.ts`
- Modify: `games/inflation-rpg/src/village/domain.ts`
- Modify: `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts`
- Test: `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts`
- Test: `games/inflation-rpg/src/village/__tests__/saveRecovery.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 contracts/shared helpers, facility task functions, current battle resolver, realm data, hero runtime, and story entries.
- Produces: deterministic forecast, expedition commands, and settlement functions with the exact signatures fixed above.

- [ ] **Step 1: Add expedition boundary assertions before moving implementation**

```ts
import {
  getExpeditionForecast,
  getExpeditionSuccessChance,
  getNextRealmId,
} from '../expedition/forecast';
import {
  confirmNextRealmUnlock,
  confirmPendingExpedition,
  startExpedition,
} from '../expedition/commands';
import {
  completeFacilityTaskNow,
  completeFacilityTasks,
} from '../expedition/settlement';

it('exposes expedition operations through the façade without wrappers', () => {
  expect(facade.getExpeditionForecast).toBe(getExpeditionForecast);
  expect(facade.getExpeditionSuccessChance).toBe(getExpeditionSuccessChance);
  expect(facade.getNextRealmId).toBe(getNextRealmId);
  expect(facade.startExpedition).toBe(startExpedition);
  expect(facade.confirmPendingExpedition).toBe(confirmPendingExpedition);
  expect(facade.confirmNextRealmUnlock).toBe(confirmNextRealmUnlock);
  expect(facade.completeFacilityTasks).toBe(completeFacilityTasks);
  expect(facade.completeFacilityTaskNow).toBe(completeFacilityTaskNow);
});
```

- [ ] **Step 2: Run the boundary test to verify the expected failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts
```

Expected: FAIL because the expedition module files are not present.

- [ ] **Step 3: Move forecast-only functions and deterministic helpers**

Move `getExpeditionSuccessChance`, `getExpeditionForecast`, `getNextRealmId`,
`deterministicRoll`, and `expeditionDurationSeconds` into `forecast.ts`.
Export `expeditionDurationSeconds` only for direct imports from expedition command
and settlement modules; do not re-export it through `domain.ts`. Keep the existing
default `encounterIndex = 2`, assigned-agent defaults, and `expeditionId` fallback
exactly. Do not introduce a random source or change the forecast roll key.

- [ ] **Step 4: Move commands and settlement as separate responsibilities**

Move `startExpedition`, `confirmPendingExpedition`, and `confirmNextRealmUnlock` to
`commands.ts`. Move `resolveExpedition`, `settleFacilityTasks`,
`completeFacilityTasks`, and `completeFacilityTaskNow` to `settlement.ts`.

`settlement.ts` is the only expedition module allowed to orchestrate facility task
completion, battle resolution, hero experience, equipment rewards, story entries,
and pending boss confirmation. It may import forecast and facility/hero modules
directly, but no sibling may import the façade.

- [ ] **Step 5: Run settlement regression coverage and commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts src/village/__tests__/villageDomain.test.ts src/village/__tests__/saveRecovery.test.ts src/village/__tests__/useVillageGame.test.tsx
pnpm exec madge --circular --extensions ts,tsx --ts-config tsconfig.madge.json apps packages games
git diff --check
git add games/inflation-rpg/src/village/domain.ts games/inflation-rpg/src/village/domain/ games/inflation-rpg/src/village/__tests__/villageDomain.test.ts games/inflation-rpg/src/village/__tests__/saveRecovery.test.ts
git commit -m "refactor: extract village expedition domain modules"
```

Expected: all save, expedition, and hook regression tests pass; no circular
dependency is introduced.

### Task 5: Extract remaining story, intervention, reward, and settings commands

**Files:**
- Create: `games/inflation-rpg/src/village/domain/story/choices.ts`
- Create: `games/inflation-rpg/src/village/domain/intervention/commands.ts`
- Create: `games/inflation-rpg/src/village/domain/rewards/offline.ts`
- Create: `games/inflation-rpg/src/village/domain/settings/commands.ts`
- Modify: `games/inflation-rpg/src/village/domain.ts`
- Modify: `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts`
- Test: `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts`
- Test: `games/inflation-rpg/src/village/__tests__/villageStory.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4 contracts/shared helpers and current `story.ts` entries.
- Produces: the remaining public domain operations with no implementation left in the façade.

- [ ] **Step 1: Add boundary assertions for the remaining operations**

```ts
import { chooseStoryChoice } from '../story/choices';
import { grantInterventionCharge, useIntervention } from '../intervention/commands';
import { grantOfflineResourceBonus } from '../rewards/offline';
import { setVillagePolicy, updateVillageSettings } from '../settings/commands';

it('exposes the remaining commands through the façade without wrappers', () => {
  expect(facade.chooseStoryChoice).toBe(chooseStoryChoice);
  expect(facade.grantInterventionCharge).toBe(grantInterventionCharge);
  expect(facade.useIntervention).toBe(useIntervention);
  expect(facade.grantOfflineResourceBonus).toBe(grantOfflineResourceBonus);
  expect(facade.setVillagePolicy).toBe(setVillagePolicy);
  expect(facade.updateVillageSettings).toBe(updateVillageSettings);
});
```

- [ ] **Step 2: Run the boundary test to verify the expected failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts
```

Expected: FAIL because the remaining module paths are not present.

- [ ] **Step 3: Move each command to its single-responsibility module**

Move `chooseStoryChoice` to `story/choices.ts` with the existing
`StoryDomainResult` return type imported from `../../story`, `grantInterventionCharge` and
`useIntervention` to `intervention/commands.ts`, `grantOfflineResourceBonus` to
`rewards/offline.ts`, and `setVillagePolicy`, `updateVillageSettings` to
`settings/commands.ts`. Keep story entry selection in the existing `village/story.ts`;
the new choices module only applies the selected result to a save.

- [ ] **Step 4: Remove all remaining implementations from `domain.ts` and add façade exports**

The façade must end with re-exports equivalent to:

```ts
export { chooseStoryChoice } from './domain/story/choices';
export { grantInterventionCharge, useIntervention } from './domain/intervention/commands';
export { grantOfflineResourceBonus } from './domain/rewards/offline';
export { setVillagePolicy, updateVillageSettings } from './domain/settings/commands';
export { getAvailableStoryChoice, hasVillageEpilogue } from './story';
```

Keep the existing story read-only exports from `village/story.ts` separate from
state-changing command modules.

- [ ] **Step 5: Run focused coverage and commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__/module-boundaries.test.ts src/village/__tests__/villageDomain.test.ts src/village/__tests__/villageStory.test.ts
pnpm exec madge --circular --extensions ts,tsx --ts-config tsconfig.madge.json apps packages games
git diff --check
git add games/inflation-rpg/src/village/domain.ts games/inflation-rpg/src/village/domain/ games/inflation-rpg/src/village/__tests__/villageDomain.test.ts games/inflation-rpg/src/village/__tests__/villageStory.test.ts
git commit -m "refactor: extract remaining village domain commands"
```

Expected: all focused tests pass, and `domain.ts` contains no private helper or
public function body.

### Task 6: Split domain tests by responsibility and enforce the façade boundary

**Files:**
- Create: `games/inflation-rpg/src/village/domain/__tests__/hero.test.ts`
- Create: `games/inflation-rpg/src/village/domain/__tests__/facility.test.ts`
- Create: `games/inflation-rpg/src/village/domain/__tests__/expedition.test.ts`
- Create: `games/inflation-rpg/src/village/domain/__tests__/commands.test.ts`
- Modify: `games/inflation-rpg/src/village/__tests__/villageDomain.test.ts`
- Modify: `games/inflation-rpg/src/village/domain/__tests__/module-boundaries.test.ts`
- Modify: `games/inflation-rpg/src/village/domain.ts`

**Interfaces:**
- Consumes: all direct modules from Tasks 2–5 and the current test fixtures.
- Produces: one focused test file per domain responsibility, plus a small façade compatibility test.

- [ ] **Step 1: Identify test groups by imported public operation**

Use the current import list in `villageDomain.test.ts` as the source of truth. Move
tests calling hero functions to `hero.test.ts`, facility functions to `facility.test.ts`,
expedition and settlement functions to `expedition.test.ts`, and story/intervention/
policy/settings functions to `commands.test.ts`. Keep save creation and cross-boundary
round-trip tests in `villageDomain.test.ts` only when they exercise the façade contract.

- [ ] **Step 2: Update each new test file to import direct modules**

For example, `hero.test.ts` must import from:

```ts
import { advanceHeroActions, advanceHeroAutonomy, decideHeroAction, getHeroNextAction } from '../hero/autonomy';
import { getVillageHeroPower, rejuvenateHero } from '../hero/progression';
```

`facility.test.ts`, `expedition.test.ts`, and `commands.test.ts` use the corresponding
paths from the public interface list. Tests must retain their existing fixtures,
expected errors, timestamps, and deterministic seeds.

- [ ] **Step 3: Add a static façade import guard**

Extend `module-boundaries.test.ts` with a source scan that fails if a production file
under `src/village/domain/` imports the `domain.ts` façade. Keep test files out of the
scan so their intentional façade compatibility imports are allowed. Use this exact
portable traversal and assertion shape:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const domainRoot = fileURLToPath(new URL('..', import.meta.url));
const facadeImport = /(?:from\s+|import\s*\(\s*)['"](?:\.\.\/)+domain(?:\.ts)?['"]/;

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

it('does not allow production domain modules to import the façade', () => {
  const violations = listTypeScriptFiles(domainRoot)
    .filter((filePath) => !relative(domainRoot, filePath).includes('__tests__'))
    .flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const match = source.match(facadeImport);
      return match
        ? [{ filePath: relative(domainRoot, filePath), importText: match[0] }]
        : [];
    });

  expect(violations).toEqual([]);
});
```

The failure output must include each offending relative file path and matching
import text when the assertion fails.

- [ ] **Step 4: Run all moved tests and remove duplicate coverage only after green**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/village/domain/__tests__ src/village/__tests__/villageDomain.test.ts
```

Expected: every moved test passes. Only after this result, delete duplicated test
blocks from `villageDomain.test.ts`; do not delete assertions solely because a test
file became smaller.

- [ ] **Step 5: Commit the test boundary change**

```bash
git diff --check
git add games/inflation-rpg/src/village/domain/__tests__ games/inflation-rpg/src/village/__tests__/villageDomain.test.ts games/inflation-rpg/src/village/domain.ts
git commit -m "test: split village domain coverage by responsibility"
```

### Task 7: Verify the completed domain decomposition and update architecture evidence

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/작업-현황.md`
- Modify: `docs/BACKLOG.md`
- Verify: all files created and modified by Tasks 1–6

**Interfaces:**
- Consumes: completed domain façade and direct modules, current verification scripts, and the approved design document.
- Produces: documented domain boundary with reproducible verification evidence; no product behavior change.

- [ ] **Step 1: Verify the façade size and implementation absence**

```bash
wc -l games/inflation-rpg/src/village/domain.ts
rg -n '^export (async )?function|^function |^const [A-Za-z_].*=|^interface |^type ' games/inflation-rpg/src/village/domain.ts
```

Expected: the file is at or below the 120-line target, and the second command finds
no implementation declarations beyond re-export/type lines allowed by the façade.

- [ ] **Step 2: Verify dependency and product boundaries**

```bash
pnpm exec madge --circular --extensions ts,tsx --ts-config tsconfig.madge.json apps packages games
node --test scripts/autonomy/product-identity.test.mjs
git diff --name-only 4fd30c10..HEAD -- games/inflation-rpg/src/systems/paradoxSpiral.ts games/inflation-rpg/src/systems/paradoxSpiral.test.ts games/inflation-rpg/src/systems/paradoxSpiralBalance.test.ts output tmp
git status --short -- games/inflation-rpg/src/systems/paradoxSpiral.ts games/inflation-rpg/src/systems/paradoxSpiral.test.ts games/inflation-rpg/src/systems/paradoxSpiralBalance.test.ts output tmp
```

Expected: no circular dependency, identity tests pass, and the protected-file list is
empty for the entire sequence of domain refactor commits. `4fd30c10` is the approved
design baseline at which this plan begins.

- [ ] **Step 3: Run the complete verification suite**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
pnpm e2e
pnpm build
pnpm typecheck
pnpm lint
pnpm circular
git diff --check 4fd30c10..HEAD
```

Expected: all commands exit 0. The exact test and build counts are recorded from the
command output rather than guessed.

- [ ] **Step 4: Update Korean architecture/status evidence**

Document the final façade path, direct module layout, preserved storage boundary,
verification date, and the fact that core promotion remains gated by a second game.
Update `QA-01` only with the actual command results from Step 3; do not add a new
cycle report or a score.

- [ ] **Step 5: Commit documentation and final domain decomposition**

```bash
git diff --check
git add docs/ARCHITECTURE.md docs/작업-현황.md docs/BACKLOG.md
git commit -m "docs: record village domain decomposition boundary"
```

## Completion Checklist

- [ ] `domain.ts` is a compatibility façade with no implementation body.
- [ ] Hero, facility, expedition, story, intervention, rewards, and settings public operations are independently importable.
- [ ] Shared helpers have specific names and no generic dumping-ground module exists.
- [ ] No domain module imports the façade.
- [ ] Existing save key, schema, clone semantics, errors, deterministic forecast, and result shapes remain unchanged.
- [ ] Domain tests are grouped by responsibility without losing assertions.
- [ ] RPG-specific core contracts remain outside `@forge/core` after the separate core plan; this plan does not silently add new core exports.
- [ ] Focused and workspace verification commands pass.
- [ ] Protected files and user `output/`, `tmp/` remain untouched.

## Follow-up Plan Boundaries

After this plan's final commit is verified, write separate plans for:

1. Moving RPG-only contracts out of `@forge/core`.
2. Splitting `village/save.ts` into schema, persistence, recovery, and offline modules.
3. Splitting `useVillageGame.ts` into a React adapter and command/bridge modules.
4. Splitting `src/types.ts` and auditing unused seasonal/cycle pure modules.

Those plans must consume this plan's façade and module contracts rather than bypassing
them with a parallel architecture.
