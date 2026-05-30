# RESUME — v7

## 상태
- Cycle: 684
- Target: 706 (이번 세션 목표)
- Last commit: 3d3fff8 (C684 compound enemy scaling + sacrifice cooldown)
- Vitest: 1985 pass / 0 fail
- E2E: 60 passed
- EncounterEngine: 1878 lines

## 레이어 카운터 (C673-C684 era — IN PROGRESS)
- 구조: 3 (C674 GoldCalc extract, C680 GoldCalc wiring, C683 ExpCalc wiring)
- 시스템: 1 (C675 PostCombatEventResolver wiring)
- UI/UX: 2 (C676 AtkBreakdownLogic, C682 StatDeltaPopup wiring)
- 밸런스: 2 (C678 test fix + sacrifice rate, C684 compound enemy scaling)
- 비주얼: 1 (C679 StatDeltaPopupLogic)
- 콜라보: 3 (C673, C677, C681)

## 제약
- cycles_since_collab: 3 (C682, C683, C684 since C681)
- Next collab: C685 (NOW DUE)
- EncounterEngine: 1878 lines (sub-1900 achieved!)
- Layer lock: collab (next)

## 다음 3사이클 (C685 협의에서 확정 예정)
1. [collab] C685: critic + planner + level-designer
2. TBD
3. TBD

## 달성 사항 (C673-C684)
- C673-C677: [see cycle-677-collab.md]
- C678 [balance]: 3 pre-existing test fix + LEVEL_SACRIFICE_RATE 0.25→0.18
- C679 [visual]: StatDeltaPopupLogic (5 tests)
- C680 [structure]: GoldCalculator engine wiring (-128 lines)
- C681 [collab]: critic(6/10)+planner+level-designer + waveAccumulatorMul bug fix
- C682 [UI/UX]: StatDeltaPopup React component wired to OverworldRunner
- C683 [structure]: ExpCalculator extraction (-101 lines, engine 1878)
- C684 [balance]: Compound enemy scaling (1.12^P) + sacrifice cooldown 50→30

## 캐리오버 (미완료)
- [x] GoldCalculator engine wiring — DONE C680
- [x] EncounterEngine sub-1900 — DONE C683 (1878 lines)
- [x] StatDeltaPopupLogic React wiring — DONE C682
- [x] Enemy HP compound scaling — DONE C684
- [ ] ExpCalculator further slimming (engine still has side-effect preamble)
- [ ] AtkBreakdownLogic React tooltip component
- [ ] BattleOutcomeBadge 실데이터 연결
- [ ] TRAP_AVOID_COMBO 15→12
- [ ] FeedbackDispatcher (crit sound/haptic) — backlog

## 알려진 기술 부채
- EncounterEngine.ts: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- ATK mul accumulation (L460-L655): side-effect 섞여 pure 추출 불가
- forge-ui 미사용 (OverworldRunner 100% inline style)
