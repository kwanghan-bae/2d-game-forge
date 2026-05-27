# Sub-phase σ Plan — Trait Auto-Roll Mechanism (HeroDecisionAI Mega-phase)

작성 cycle = 279/355 (사용자 새 100-cycle 의 24/100). spec = `../specs/2026-05-28-hero-decision-ai-mega-phase.md`.

## 현재 production grep 결과

- `cycle/traits.ts:5-23` = TraitId 16 union + TraitModifiers interface
- `CycleControllerV2.ts:173` = `this.traits = opts.traits` (생성자 인자, hero entity 부재)
- `CycleControllerV2.ts:397/1282` = realm fork auto-choice 에 trait 사용
- `decisionAI/HeroDecisionAI.ts:9` = `traits: readonly TraitId[]` (HeroDecisionAIOpts)
- `cycle/HeroDecisionAI.ts:32` = `return this.traits` (sim-only, legacy Sim-A)

**핵심 발견**: hero entity 에 traits field 없음. CycleControllerV2 의 opts.traits 만 — 즉 trait 는 *cycle 생성 시점에 외부에서 주입*. roll mechanism 자체 부재 = cycle 156 critic 의 misdiagnosis 회수 확정.

## Sub-phase σ task 분할 (sub-cycle plan)

### T1 — HeroEntity.traits field 신설 (cycle 281, 1 cycle)

- file: `hero/HeroEntity.ts`
- field 추가: `private traits: TraitId[] = []`
- getter: `getTraits(): readonly TraitId[]`
- serialize/deserialize 회로 (persist 회로)
- 신규 test: traits 초기 빈 array + getter + serialize/deserialize round-trip

### T2 — Trait roll selector (cycle 282, 1 cycle)

- file 신설: `hero/TraitRoller.ts`
- pure function: `rollTrait(rng, existingTraits, level): TraitId | null`
- rules:
  - level 5 / 15 / 30 milestone 에 1 trait roll chance 30%
  - 중복 방지 (existingTraits 와 disjoint)
  - 균등 random (사이드 effect 0 — personality 비례는 미래 cycle)
- 신규 test: 3 milestone trigger + 중복 방지 + 비결정성 (rng 결정성)

### T3 — HeroLifecycle level-up wire (cycle 283, 1 cycle)

- file: `hero/HeroLifecycle.ts` 의 level-up path
- level milestone 도달 시 `TraitRoller.rollTrait` 호출 + `hero.addTrait(traitId)`
- 신규 test: milestone level-up → trait 추가 + 같은 cycle 의 다른 level-up → 누적

### T4 — Sim 검증 (cycle 284, 1 cycle, optional)

- chained 50-cycle sim 의 평균 trait 누적 수 측정
- cycle 257/276 baseline 의 traits 부재 vs σ wire 후 50-cycle 중 hero 의 trait 평균 수
- 가드: 평균 0.3+ trait (cycle 50 의 hero 가 milestone 도달 시점)

## Sub-phase α plan (cycle 285+ 진입)

σ T1-T3 완료 후 진입:
- DestinationResolver.choose 의 `ctx.traits` 활성 — weight modifier 추가
- 각 trait 의 weight 식 (PRD outline)

## Risk

- R1 (medium): T1 의 persist 회로 v24 migration. 기존 save 의 traits field 부재 → 빈 array default
- R2 (low): T2 의 randomized 분포 검증. 비결정성 test 의 noise band
- R3 (high): T4 sim 12분 budget — cycle 284 가 sim budget cycle. 메타-rule 1 검증 (cycle 280 STATUS) 의 substantive 비율 ↑

## 다음 cycle (280)

cycle 280 = third 10-cycle STATUS + mega-phase 진입 명시 + chain accountability table (cycle 271-279).

20-cycle (cycle 261-280) milestone 의 메타-rule 1 첫 검증 — micro mode 비율 정량 산정 의무.
