# Cycle 1 Test Plan

PRD: [`docs/superpowers/evolution/cycle-1-prd.md`](./cycle-1-prd.md)
직전 main HEAD: `c107c3b` / 직전 phase: V3-H Depth + Polish (`81bea39`)
대상 워크스페이스: `@forge/game-inflation-rpg`

## 회귀 위험

- `src/overworld/EncounterEngine.ts` — `SHRINE_SKILL_GRANT_RATE 0.48 → 0.20`, `MERCIFUL_PROC_RATE 0.15 → 0.10` — 기존 테스트 (`src/overworld/__tests__/EncounterEngine.test.ts`, `EncounterEngine.personality.test.ts`) 의 chance fixture 가 stub seed 의존이라 두 상수 변경이 직접 깨뜨릴 가능성 큼.
- `src/hero/JobSystem.ts` — `JOBS.mage.min 3→5`, `JOBS.monk.dim pious→prudent`, `JOBS.ranger.min 4→6` — `src/hero/__tests__/JobSystem.test.ts` 의 mage/monk/ranger tie-break fixture 직격.
- `src/saga/NarrativeGenerator.ts` — F2 의 `forRealmEnter` / `forSeasonChange` + F3 의 `forNpcEncounter` / `forNpcDeath` / `forFamilyEvent` 신규 export — 기존 `NarrativeGenerator.test.ts` (battle/shrine/levelUp/levelUpBatch/drop/rejuvenation/death 11 case) 회귀 없음 필요.
- `src/overworld/CycleControllerV2.ts` — `handleArrival` 의 `npc_encounter`/`npc_died`/`family_event` 분기에 `recordToStore` 추가 — V3-H 의 `hero_died` dead path fix 와 동일 패턴, `src/overworld/__tests__/CycleControllerV2.test.ts` 의 arrival driver 케이스가 spy 카운트 변경.
- `src/saga/EternalSaga.ts` — `appendEvent` / `recordRealmTransition` 사용 빈도 증가 — `src/saga/__tests__/EternalSaga.test.ts` 의 `appendEvent` / `recordRealmTransition` 패턴이 F3 wire 검증 템플릿.
- `src/screens/SagaBookModal.tsx` — 현재 `matchesFilter('npc')` 가 `moralChoice + shrine` 만 인지, F3 의 신규 event type 4 종이 노출되려면 filter 매핑 확장 필요 — PRD 미명시 항목 → 회귀 위험 표면화.
- `src/store/persist.ts` — F2/F3 가 `SagaEventType` 에 신규 type (`realm_entered`/`season_changed`/`npc_encounter`/`npc_died`/`family_event`) 만 추가 시 schema 호환이면 migration 불필요. 그러나 신규 event 가 saga slice 의 zod schema 에 enum literal 로 들어가면 `STORE_VERSION` bump + migration 추가 필요 — implementer 가 결정.
- `tests/e2e/v3-h-depth-polish.spec.ts` — base→sea 50초 sim. F1 의 SHRINE_SKILL_GRANT_RATE 하향이 pacing 변화 가능성 (회귀 가능성 낮음, golden path 보존 확인).
- 시드 sim regression — `pnpm sim:v3` seed=1024 50 cycle 기준 `maxLevel` p50 829k / `endCause=max_arrivals` 49/50 / death rate 2% — F1 의 JobSystem + grant rate 변경이 곡선 평탄화로 새지 않음을 별도 통과 기준으로 가드.

## 신규 케이스 매트릭스

### F1. Build / Cycle Variance Pass

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F1.1 | `SHRINE_SKILL_GRANT_RATE` 상수가 `0.20` 으로 변경 | unit | `expect(SHRINE_SKILL_GRANT_RATE).toBe(0.20)` 또는 코드 grep | `src/overworld/__tests__/EncounterEngine.test.ts` |
| F1.2 | `MERCIFUL_PROC_RATE` 상수가 `0.10` 으로 변경 | unit | `expect(MERCIFUL_PROC_RATE).toBe(0.10)` | same |
| F1.3 | shrine encounter 1000 회 seeded RNG → skill grant 실측 횟수 | unit | `expect(grantCount).toBeGreaterThanOrEqual(170)` AND `toBeLessThanOrEqual(230)` (mean 200 ± 15%) | same |
| F1.4 | encounter 1000 회 seeded RNG → merciful proc 실측 횟수 | unit | `expect(mercifulCount).toBeGreaterThanOrEqual(85)` AND `toBeLessThanOrEqual(115)` (mean 100 ± 15%) | `src/overworld/__tests__/EncounterEngine.personality.test.ts` |
| F1.5 | `JOBS.mage.requiredPersonality.min === 5` | unit | `expect(JOBS.find(j=>j.id==='mage')!.requiredPersonality!.min).toBe(5)` | `src/hero/__tests__/JobSystem.test.ts` |
| F1.6 | `JOBS.monk.requiredPersonality.dim === 'prudent'` | unit | `expect(JOBS.find(j=>j.id==='monk')!.requiredPersonality!.dim).toBe('prudent')` | same |
| F1.7 | `JOBS.ranger.requiredPersonality.min === 6` | unit | `expect(JOBS.find(j=>j.id==='ranger')!.requiredPersonality!.min).toBe(6)` | same |
| F1.8 | tie-break: hero `pious=4 prudent=2` Tier 2 후보 → mage 탈락 (min 5 미만) | unit | `expect(evaluate(hero, 'tier2').id).not.toBe('mage')` | same |
| F1.9 | tie-break: hero `prudent=6` Tier 2 후보 → ranger 후보에 포함 | unit | `expect(candidates.some(c=>c.id==='ranger')).toBe(true)` | same |
| F1.10 | tie-break: hero `pious=5 prudent=5` → monk 후보 포함 (dim=prudent 분리 후) | unit | `expect(candidates.some(c=>c.id==='monk')).toBe(true)` | same |
| F1.11 | sim 50 cycle (seed 1024–1073, maxArrivals=500) → `skillsLearnedCount` p50 | sim | `expect(p50).toBeLessThanOrEqual(14)` (PRD primary 수용 기준) | manual: `pnpm sim:v3 -- --count 50 --seed 1024 --out-dir /tmp/cycle-1-post-sim` |
| F1.12 | 동일 sim → `skillsLearnedCount` p50 회귀 floor | sim | `expect(p50).toBeLessThanOrEqual(18)` (사용자 회귀 신호 — V3-H 21 대비 3 이상 감소 보장) | same |
| F1.13 | 동일 sim → Tier 2 `jobUnlocks` single-job share | sim | `expect(maxShare).toBeLessThanOrEqual(0.35)` (V3-H mage 0.46 대비 11pp 감소) | same |
| F1.14 | 동일 sim → `monk + ranger` 합산 unlock 횟수 | sim | `expect(monkCount + rangerCount).toBeGreaterThanOrEqual(1)` (현재 0/50 + 0/50 → 1+) | same |
| F1.15 | 동일 sim → `moralChoices` p50 over-correction guard | sim | `expect(p50).toBeGreaterThanOrEqual(60)` AND `toBeLessThanOrEqual(80)` | same |
| F1.16 | 동일 sim → `maxLevel` p50 곡선 평탄화 가드 | sim | `expect(p50).toBeGreaterThanOrEqual(746_000)` (829k × 0.9) AND `toBeLessThanOrEqual(1_078_000)` (829k × 1.3) | same |
| F1.17 | 동일 sim → death rate (`endCause==='dead'` 비율) | sim | `expect(deathRate).toBeLessThanOrEqual(0.05)` (회복 OP 유지 가드) | same |
| F1.18 | 회귀 golden path: 기존 `EncounterEngine.test.ts` 의 chance fixture 21 case 전부 통과 | unit | 기존 케이스 0 깨짐 | `src/overworld/__tests__/EncounterEngine.test.ts`, `.personality.test.ts` |

### F2. Realm Tone Narrator

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F2.1 | `forRealmEnter('sea', 13)` → 문자열 반환 | unit | `expect(typeof result).toBe('string')` AND `result.length > 0` | `src/saga/__tests__/NarrativeGenerator.test.ts` |
| F2.2 | `forRealmEnter('sea', age)` 100회 호출 → 5+ unique variant | unit | `expect(new Set(results).size).toBeGreaterThanOrEqual(5)` | same |
| F2.3 | `forRealmEnter('volcano', age)` 100회 호출 → 5+ unique variant | unit | `expect(new Set(results).size).toBeGreaterThanOrEqual(5)` | same |
| F2.4 | `forRealmEnter('underworld', age)` 100회 호출 → 5+ unique variant | unit | `expect(new Set(results).size).toBeGreaterThanOrEqual(5)` | same |
| F2.5 | `forRealmEnter('heaven', age)` 100회 호출 → 5+ unique variant | unit | `expect(new Set(results).size).toBeGreaterThanOrEqual(5)` | same |
| F2.6 | `forRealmEnter('chaos', age)` 100회 호출 → 5+ unique variant | unit | `expect(new Set(results).size).toBeGreaterThanOrEqual(5)` | same |
| F2.7 | `forRealmEnter('base', age)` 100회 호출 → 5+ unique variant (PRD: 6 realm × 5 = 30 줄 catalog) | unit | `expect(new Set(results).size).toBeGreaterThanOrEqual(5)` | same |
| F2.8 | `forRealmEnter` 반환 문자열에 `age` 가 포함됨 (예: `(13세)` 또는 `13세에`) | unit | `expect(result).toMatch(/\d+세/)` | same |
| F2.9 | `forSeasonChange('spring', age, 'base')` → 문자열 반환 | unit | `expect(typeof result).toBe('string')` AND `result.length > 0` | same |
| F2.10 | `forSeasonChange` 4 season 모두 (`spring`/`summer`/`autumn`/`winter`) 호출 시 0 throw | unit | `expect(() => forSeasonChange(s, 20, 'base')).not.toThrow()` (각 season) | same |
| F2.11 | `forSeasonChange` realm-flavor prefix: `(season='summer', realm='sea')` 와 `(season='summer', realm='volcano')` 결과가 서로 다름 (각 30회 sampling) | unit | `expect(seaSet).not.toEqual(volcanoSet)` (intersection 비교, 완전 동일 아님) | same |
| F2.12 | `OverworldRunner` 의 hard-coded `"계절이 바뀌었다 — 여름"` 문자열이 코드에서 제거됨 | unit | `grep -F '계절이 바뀌었다 — 여름' src/screens/OverworldRunner.tsx` 결과 0 line | manual grep step + `src/screens/__tests__/OverworldRunner.test.tsx` 의 season tick assertion 회귀 없음 |
| F2.13 | `SagaEventType` 에 `realm_entered` 와 `season_changed` 등록됨 | unit | TS type check + `expect(SAGA_EVENT_TYPES.includes('realm_entered')).toBe(true)` (또는 동등 lookup) | `src/saga/__tests__/EternalSaga.test.ts` (또는 SagaTypes 대응 테스트) |
| F2.14 | 50 cycle sim → `realm_unlocked` event 가 narrative line 1 줄 이상 동반 | sim | `expect(realmEnterNarrativeLines.length).toBeGreaterThanOrEqual(4)` (base 제외 5 realm 중 ≥ 4) | `pnpm sim:v3` aggregate `c<seed>.md` grep |
| F2.15 | 동일 sim → `season_changed` event 가 4 season 모두에서 narrative line 발화 | sim | `expect(new Set(seasonsWithNarrative)).toEqual(new Set(['spring','summer','autumn','winter']))` | same aggregate grep |
| F2.16 | SagaBookModal `여정` (`saga-filter-all` 또는 적절한 filter) 에서 realm 진입 line 가시 | e2e | playwright click `saga-filter-all` → `expect(modal).toContainText('심해의 문이 열렸다')` (또는 6 realm catalog 중 1) | `tests/e2e/cycle-1-variance-realm-npc.spec.ts` (신규) |

### F3. NPC Saga Dead Path 회수

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F3.1 | `forNpcEncounter(npc, 22, 'mentor')` → 문자열 반환 | unit | `expect(typeof result).toBe('string')` AND `result.length > 0` | `src/saga/__tests__/NarrativeGenerator.test.ts` |
| F3.2 | `forNpcEncounter` 3 kind (`mentor`/`rival`/`passerby`) 각각 3+ variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(3)` (각 kind, 100회 sampling) | same |
| F3.3 | `forNpcDeath(npc, 50, cause)` → 문자열 반환 + 3+ variant | unit | `expect(typeof result).toBe('string')` AND `new Set(samples).size >= 3` | same |
| F3.4 | `forFamilyEvent({type:'marriage'}, 30)` → 문자열 반환 | unit | `expect(typeof result).toBe('string')` AND `result.length > 0` | same |
| F3.5 | `forFamilyEvent` 3 type (`marriage`/`child_born`/`child_grown`) 각각 2+ variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(2)` (각 type) | same |
| F3.6 | `forNpcEncounter` 반환에 `age` 포함 | unit | `expect(result).toMatch(/\d+세/)` | same |
| F3.7 | `CycleControllerV2.handleArrival` 가 `npc_encounter` arrival 처리 시 `recordToStore` 1회 호출 (V3-H `hero_died` test 패턴) | unit | spy/mock → `expect(recordToStoreSpy).toHaveBeenCalledTimes(1)` AND 인자 `type==='npc_encounter'` | `src/overworld/__tests__/CycleControllerV2.test.ts` |
| F3.8 | `handleArrival` `npc_died` arrival 처리 시 `recordToStore` 1회 호출 | unit | spy → `toHaveBeenCalledWith(expect.objectContaining({ type: 'npc_died' }))` | same |
| F3.9 | `handleArrival` `family_event` arrival (marriage) 처리 시 `recordToStore` 1회 호출 | unit | spy → `toHaveBeenCalledWith(expect.objectContaining({ type: 'family_event' }))` | same |
| F3.10 | `SagaEventType` 에 `npc_encounter`/`npc_died`/`family_event` 모두 등록됨 | unit | TS type check + literal union 포함 확인 | `src/saga/__tests__/EternalSaga.test.ts` |
| F3.11 | `EternalSaga.appendEvent` 에 NPC event 4 종 push → era chapter 의 `events` 배열에 들어감 | unit | `expect(saga.chaptersByEra['어린시절-0'].events.some(e=>e.type==='npc_encounter')).toBe(true)` | same |
| F3.12 | `SagaBookModal.matchesFilter('npc', ...)` 가 신규 NPC event type 4종 포함 (PRD 미명시 회귀 위험) | unit | `expect(matchesFilter('npc_encounter', 'npc')).toBe(true)` AND same for `npc_died`/`family_event` | `src/screens/__tests__/SagaBookModal.test.tsx` (신규 또는 기존 확장) |
| F3.13 | 50 cycle sim → NPC keyword (`결혼`/`자식`/`라이벌`/`멘토`/`행인`) aggregate ≥ 20 회 등장 | sim | `expect(npcKeywordCount).toBeGreaterThanOrEqual(20)` | `pnpm sim:v3` aggregate `.md` grep |
| F3.14 | 동일 sim → NPC narrative 가 ≥ 5 cycle 에 등장 (현재 0/50) | sim | `expect(cyclesWithNpcLine).toBeGreaterThanOrEqual(5)` | same |
| F3.15 | 동일 sim → NPC event 4 종 모두 50-cycle aggregate 에서 0 회 초과 등장 | sim | `expect(npcEncounterCount).toBeGreaterThan(0)` AND same for `npc_died`/`family_event` | same |
| F3.16 | SagaBookModal `saga-filter-npc` 클릭 → NPC 이름 1+ 노출 (e2e) | e2e | playwright → `expect(modal).toContainText(/멘토|라이벌|행인|결혼|자식/)` | `tests/e2e/cycle-1-variance-realm-npc.spec.ts` |

## 검증 명령

```bash
# unit + integration
pnpm --filter @forge/game-inflation-rpg test

# e2e (chromium + iphone14 projects 전부)
pnpm --filter @forge/game-inflation-rpg e2e

# repo-wide static checks
pnpm typecheck && pnpm lint && pnpm circular

# F1/F2/F3 sim regression (50 cycle, seed 1024–1073, maxArrivals=500 default)
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 1024 --out-dir /tmp/cycle-1-post-sim

# F2 narrative aggregate grep (sim 산출물 검증)
grep -E "심해|용암|황천|천공|혼돈|봄|여름|가을|겨울" /tmp/cycle-1-post-sim/c10*.md | wc -l

# F3 NPC narrative aggregate grep
grep -E "결혼|자식|라이벌|멘토|행인" /tmp/cycle-1-post-sim/c10*.md | wc -l

# F2.12 manual: hard-coded season 문자열 제거 확인
grep -F '계절이 바뀌었다 — 여름' games/inflation-rpg/src/screens/OverworldRunner.tsx
# 기대 exit: 1 (no match)
```

수동 verify 1 건 (자동화 불가):
- F2 수용 기준 "SagaBookModal `여정` filter 에서 realm 진입 line 이 chapter 헤더 직후 시각적으로 식별 가능" — F2.16 e2e 가 텍스트 노출은 잡지만 "시각적 chapter 경계 식별" 은 수동. `pnpm dev` → `localhost:3000/games/inflation-rpg` → SagaBookModal 열고 base→sea 진입 직후 line 가 chapter 헤더 바로 아래에 들어가는지 눈으로 확인.

## 통과 기준

- vitest pass rate: 100% (기존 1044 + F1/F2/F3 신규 case 전부)
- e2e (chromium + iphone14): 100% (기존 50 + F2.16/F3.16 신규 spec 포함)
- `pnpm typecheck` 0 exit
- `pnpm lint` 0 exit
- `pnpm circular` 0 exit
- F1 sim regression: `skillsLearnedCount` p50 ≤ 14 (PRD primary) 그리고 `skillsLearnedCount` p50 ≤ 18 (회귀 floor); Tier 2 single-job share ≤ 0.35; `monk + ranger` unlock ≥ 1/50; `moralChoices` p50 ∈ [60, 80]
- F1 곡선 가드: `maxLevel` p50 ≥ 746k AND ≤ 1.08M; death rate ≤ 0.05
- F2 narrative 발화: realm_enter narrative ≥ 4 realm (base 제외); season_change narrative 4 season 모두
- F2 catalog: `forRealmEnter` 6 realm × 5 = 30 변형 + `forSeasonChange` 4 season + realm-flavor 코드 존재
- F3 dead path 회수: NPC keyword aggregate ≥ 20 회; NPC narrative ≥ 5 cycle 등장; NPC event 4 종 모두 > 0 회 등장
- F3 wire: `recordToStore` 호출이 `npc_encounter`/`npc_died`/`family_event` 4 종 모두에 spy 검증으로 확인
- F2/F3 modal 노출: SagaBookModal e2e 가 NPC 이름 1+ 노출 + realm 진입 line 1+ 노출
