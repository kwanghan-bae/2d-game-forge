# RESUME — v7

## 상태
- Cycle: 653
- Target: 680 (이번 세션 목표)
- Last commit: b976b22 (C653 improve combo/momentum HUD visibility)
- Vitest: 1889 passed (6 pre-existing failures) | E2E: 60 passed

## 레이어 카운터 (이번 6-cycle era: C651~C656)
- 구조: 2 (C651, C652)
- 시스템: 0
- UI/UX: 1 (C653)
- 비주얼: 0
- 밸런스: 0
- Era start: C651

## 제약
- Layer lock: UI (다음은 UI 외 레이어)
- cycles_since_collab: 0 (C654 협의 완료)
- File budget (6-cycle): {EncounterEngine.test.ts: 1, EncounterContext.ts: 1, OverworldRunner.tsx: 1, CombatOverlay.tsx: 1}

## 다음 3사이클 (C651 협의에서 확정)
1. [구조] Characterization snapshot + combo 5경로 test + milestone cap test
2. [구조] RewardCalculator 추출 (~220줄) + EncounterContext 타입
3. [UI] comboDisplay/momentumDisplay HUD 렌더 + forge-gauge + CombatOverlay 가독성

## 캐리오버 (미완료)
- [ ] EncounterEngine.ts 2229줄 → 800줄 분리
- [ ] ExpCalculator 추출 (~184줄)
- [ ] GoldCalculator 추출 (~177줄)
- [ ] CombatResolver 추출 (~173줄) — 가장 결합도 높음, 마지막
- [ ] UI: ActiveBuffBar, DamageFloater, ProgressionHUD
- [ ] 시스템: EventChoiceEngine (자동→수동 전환)
- [ ] ATK cap prestige 연동 (구조 추출 완료 후)

## 알려진 기술 부채
- 6 pre-existing test failures (fateRoll, OverworldRunner, sim-cycle-v2)
- EncounterEngine.ts line 14: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- combo decay 5경로 중 1개만 테스트됨
- killMilestone cap(50) 미테스트
- forge-ui 미사용 (OverworldRunner 100% inline style)
