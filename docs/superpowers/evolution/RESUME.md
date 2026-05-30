# RESUME — v7

## 상태
- Cycle: 662
- Target: 680 (이번 세션 목표)
- Last commit: 50ef827 (C662 sim guard tests)
- Vitest: 1909+ passed (6 pre-existing failures) | E2E: 60 passed

## 레이어 카운터 (이번 6-cycle era: C657~C662 — COMPLETE)
- 밸런스: 2 (C657, C662)
- 구조: 2 (C658, C661)
- 시스템: 1 (C659)
- UI/UX: 1 (C660)
- 비주얼: 0
- Era start: C657

## 제약
- cycles_since_collab: 0 (C660 협의 완료)
- Next era: C663~C668
- File budget (C657-C662): {constants-progression.ts, EncounterEngine.ts, VillageResolver.ts+test, CombatCalculator.ts+tests, BattleOutcomeBadgeLogic.ts+test+component, cycle-657-collab.md}
- EncounterEngine: 2213→2157 lines (net -56, VillageResolver 추출)

## 달성 사항 (C657-C662)
- ATK cap prestige-linked liberation (10+p×2, max 30)
- VillageResolver 추출 (context pattern, 4 tests)
- CombatCalculator pure functions (computeHeroAtk + computeFlatAtk, 8 tests)
- BattleOutcomeBadge (5 variants: quick/endurance/critical/close/normal)
- Sim guard tests (prestige 0 backward compat + prestige 5 >= prestige 0)

## 캐리오버 (미완료)
- [ ] EncounterEngine.ts 2157줄 → 1900줄 (combat loop 추출 필요)
- [ ] CombatResolver 추출 (hit loop ~300줄, side-effect 얽힘)
- [ ] ExpCalculator 추출 (~184줄)
- [ ] GoldCalculator 추출 (~177줄)
- [ ] UI: BattleOutcomeBadge를 OverworldRunner에 실제 연결
- [ ] DamageFloater + Badge 간 z-index 조정
- [ ] Combo decay double-application bug (death: 0.25 × 0.3)

## 알려진 기술 부채
- 6 pre-existing test failures (fateRoll, OverworldRunner, sim-cycle-v2)
- EncounterEngine.ts line 16: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- ATK mul accumulation section (L460-L655): side-effect 섞여 pure 추출 불가
- forge-ui 미사용 (OverworldRunner 100% inline style)
