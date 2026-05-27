# HeroDecisionAI Mega-phase Spec — 2026-05-28

작성 cycle = **278/355** (사용자 새 100-cycle 의 23/100). cycle 280 deadline 의 사전 spec entry.

## 배경

cycle 156 PRD 의 carry-over (Sim-C scope). 100 cycle (cycle 156-255) 동안 코드 진입 0. cycle 256 critic #2 의 결정적 비판:

> production `decisionAI/HeroDecisionAI.ts` 의 `chooseDestination` 1 책임만 노출. spec §6.2 의 4 책임 (`chooseTargetEnemyId`/`shouldRetreat`/`chooseSkillId`/`chooseEncounterNode`) 이 production 에 부재.

본 spec = 4 책임 + trait wire 의 mega-phase 진입점 정의.

## 현재 production 상태 (grep 결과)

- `decisionAI/HeroDecisionAI.ts:33` = 1 책임 (`chooseDestination`). trait 인자 받지만 DestinationResolver 에 전달.
- `decisionAI/DestinationResolver.ts:42-89` = personality 3축 (heroic/pious/prudent) × landmark 9 kind weighted RNG. **ctx.traits 받지만 미사용** (선언만, 적용 0).
- 4 책임 중 production 부재:
  - `chooseTargetEnemyId` (다중 적 중 표적 선택)
  - `shouldRetreat` (HP/SP 낮을 때 후퇴 결정)
  - `chooseSkillId` (스킬 사용 결정)
  - `chooseEncounterNode` (encounter 분기 결정)

## Sub-phase 분할 (mega-phase 의 sub-cycle 분할)

mega-phase 한 cycle 안에 안 끝남. 5 sub-phase 로 분할 — wire chain pattern 답습.

### Sub-phase α (cycle 280 진입, 2-3 cycle)

**TraitWire 활성** — DestinationResolver 의 `ctx.traits` 미사용 axis 활성.

- 변경 file: `decisionAI/DestinationResolver.ts:42-89`
- TraitId catalog (현재 16) 의 weight modifier 적용. 예:
  - `t_brave` → boss/enemy weight +30%
  - `t_pious` → shrine weight +30%
  - `t_curious` → cave/treasure_cave +30%
  - `t_swift` → exit weight +20%
- production-consumed 검증 = chained sim 50-cycle 의 boss-pick 비율 변동 측정 (cycle 257 baseline 대비 ≥ 5% Δ).

### Sub-phase β (cycle 285+, 2 cycle)

**chooseSkillId 신설**. 현재 hero 의 skill 사용 = 1-skill rotation (queue 1 또는 randomized). HeroDecisionAI 에 `chooseSkillId(availableSkills, ctx)` method 신설.

- ctx = HP ratio / SP ratio / 적 수 / personality
- weight 식 (heuristic) — `bless` 사용 시 HP < 0.5, `divine_judgment` 사용 시 boss target, etc.
- ULT 분기 = cooldown / 우위 / situational.

### Sub-phase γ (cycle 290+, 2 cycle)

**shouldRetreat 신설**. 현재 hero 자동 사망. *retreat* = HP < 0.2 + 다음 arrival 지연 (회복 시간 벌이).

### Sub-phase δ (cycle 295+, 1-2 cycle)

**chooseTargetEnemyId 신설**. multi-enemy 시 가장 약한 적 / 가장 강한 적 / 가장 가까운 적 등 personality 분기.

### Sub-phase ε (cycle 300+, 1 cycle)

**chooseEncounterNode 신설**. encounter branch (cave, ruin, etc) 의 분기 선택.

## Sim-C scope (trait roll mechanism)

cycle 156 carry-over 의 "HeroDecisionAI trait roll" 의 진짜 의미 = *trait 의 자동 획득*. 현재 trait 는 *수동 시스템* (어디서 부여? grep 결과 = catalog 만 있고 hero 에 부여 path 부재).

Sub-phase σ (cycle 320+, 3 cycle) = trait auto-roll:
- hero level-up 시 chance 기반 trait roll
- 각 character 별 starting trait set
- trait swap mechanic

이는 sub-phase α의 *전제 조건* — trait 자체가 hero 에 부여되지 않으면 weight wire 의 effect 0.

→ **수정된 분할**: sub-phase σ 가 *cycle 280 진입* 의 첫 단계. trait wire (α) 는 σ 후.

## 정정된 진입 순서

1. **σ (cycle 280+, 3-4 cycle)** = trait auto-roll mechanism + hero.traits field 활성
2. **α (cycle 285+, 2-3 cycle)** = DestinationResolver trait wire
3. β, γ, δ, ε = 후속 sub-phase

## 메타-rule 의 영향

본 spec entry 자체 = cycle 278 의 substantive cycle (doc only 이지만 mega-phase 진입의 첫 1 step).

cycle 280 STATUS 에 mega-phase 진입 명시 의무. spec deadline 충족 = 본 cycle 278 의 spec doc.

## Risk

- R1 (medium): trait auto-roll 의 catalog 의 16 trait 가 hero personality 와 직교. trait roll 시 personality 비례 weight 부여? 또는 균등 random?
- R2 (high): cycle 단위 sub-phase 의 8 cycle 누적 budget. cycle 280-320 의 약 40 cycle 중 mega-phase sub 가 8 cycle 차지 → 그 외 32 cycle 의 카테고리 회전 유지 필요.
- R3 (medium): sub-phase α 의 production-consumed 검증 = sim baseline 의 직접 측정. cycle 285 의 sim 강제 (메타-rule 2 다음 강제 = cycle 296). 일치 안 함 — sub-phase α 의 검증 sim 따로.

## 다음 cycle (279)

cycle 279 = sub-phase σ 진입의 *plan doc*. sub-phase σ 의 file:line 분석 + task 분할. category: meta.

## 사용자 명시 목표 진척

> "게임이 자율진화하는것이 목표이며, 달성조건은 다시한번 100사이클이 돌았을때다"

cycle 278 = **23/100**. mega-phase 진입 첫 step.
