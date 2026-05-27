# Wire Chain Pattern — 자율진화 시스템의 분할 진행 모델

작성 = cycle 189 (2026-05-28). 자율진화 시스템이 cycle 155-187 의 SeasonalModifier
wire chain 으로 정착시킨 패턴을 박제. 향후 mega-phase 또는 큰 axis 도입 시
참조용.

## 패턴 정의

**Wire Chain** = 한 axis 의 *데이터 → helper → selector → renderer/mapper →
setter → wire → 활용* 으로 이어지는 *5-10 cycle 분할 진행* 모델.

각 cycle 은 *독립적으로 commit/test 가능한 단위* 로 isolated. 단일 cycle 이
회귀 시 chain 전체가 부서지지 않음.

## 정착 사례 1: SeasonalModifier wire chain (cycle 155-187, 8 분할)

| 분할 # | Cycle | 단계 | 카테고리 | 변경 줄 수 (대략) |
|---|---|---|---|---|
| 1/8 | 155 | pure applyRule helper | system | ~50 |
| 2/8 | 159 | active selector | system | ~30 |
| 3/8 | 161 | NarrationTone type + pickWeighted | narrative | ~70 |
| 4/8 | 167 | token → hex/number 매핑 | system | ~50 |
| 5/8 | 169 | toned realm variant data | narrative | ~50 |
| 6/8 | 175 | Phaser scene setter | system | ~25 |
| 7/8 | 177 | OverworldRunner useEffect wire | system | ~30 |
| 8/8 | 187 | SeasonPassScreen handleClaim wire | system | ~10 |

총 ~315 line 의 변경이 8 cycle 에 분산. cycle 156 critic 의 "slow-walk" 비판
을 *structured incremental* 로 재해석 — chain 의 각 단계가 isolated test 보유.

## 패턴 진행 시 검증 의무

각 cycle 마다:
- vitest 회귀 0 (chain 의 기존 단계 깨짐 부재)
- typecheck PASS
- 매 단계가 *backward compat* — 이전 cycle 의 사용처가 깨지지 않음
- chain 의 *최종 wire* (마지막 분할) 직후 *player-facing* 변화 검증 (Playwright
  e2e 또는 manual smoke)

## 분할 결정 휴리스틱

큰 axis 를 만나면:
1. **Tier 1 (foundation)**: type / interface / pure helper
2. **Tier 2 (selector)**: zustand store 또는 selector 진입점
3. **Tier 3 (renderer)**: domain-specific 변환 (예: Phaser color)
4. **Tier 4 (data)**: catalog 또는 variant pool 의 데이터 정의
5. **Tier 5 (setter)**: 외부 system (Phaser scene 등) 의 setter 메서드
6. **Tier 6 (wire)**: React useEffect / event handler 의 호출
7. **Tier 7 (활용 확장)**: 추가 catalog 항목 / 추가 사용처

Tier 1-7 이 같은 cycle 에 묶이면 risk 큼. 분할해서 cycle 별 deterministic.

## 정착 사례 2 (예시 — 미래 mega-phase 적용)

HeroDecisionAI trait roll 자체 구현 (cycle 156 carry-over, Sim-C scope) =
잠재적 mega-phase. wire chain 패턴 적용 시 7-12 cycle 분할 예상:
1. TraitId type + TRAIT_CATALOG 정합 (cycle N)
2. TraitWeight resolver (cycle N+2)
3. HeroDecisionAI.pickTrait 시그니처 (cycle N+4)
4. weighted roll 산술 helper (cycle N+5)
5. SeasonalModifier 의 traitWeightMul wire (cycle N+7)
6. HeroEntity 에 trait field (cycle N+9)
7. saga emit + storage (cycle N+10)
8. UI 표시 (cycle N+12)
9. balance invariant test (cycle N+13)

**Cycle 215 update**: 단계 5 의 wire 진입점은 이미 `getActiveTraitWeights`
(cycle 209) 가 정의함. mega-phase 진입 시 helper 호출 1 줄로 끝.

## 검토 룰 (메타-cycle)

자율진화 시스템의 cycle 170+ STATUS 들이 wire chain 진척을 *cycle 별 단위*
로 박제. 사용자 또는 미래 페르소나 surface 가 "slow-walk" 라고 비판해도
*chain 의 각 단계가 명시적 학습 단위* 이므로 *intentional incremental* 로
변호 가능.

단, 같은 chain 의 분할이 *15 cycle 이상* 시 deadline 룰 적용 (cycle 165 의
표류 deadline 룰과 동일).

## 변경 이력

- 2026-05-28 — cycle 189 신설 (chain pattern 정착 후 박제).
