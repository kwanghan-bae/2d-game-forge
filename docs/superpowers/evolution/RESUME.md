# RESUME — v7

## 상태
- Cycle: 743
- Target: 600+ (연속 진화)
- Last commit: C743 Healer/Echo events + night dmg revert
- Vitest: 2165 pass / 0 fail
- E2E: 60 passed
- EncounterEngine: ~1830 lines

## 레이어 카운터 (C737-C743 era)
- 시스템: 3 (C737 realm-based difficulty, C741 heroLevel pipeline, C742 Storm/Snow)
- 구조: 0
- UI/UX: 1 (C739 TraitInfluenceBadge)
- 밸런스: 2 (C738 night tuning, C743 Healer/Echo events)
- 콜라보: 2 (C740, C744)

## 제약
- cycles_since_collab: 0 (C744 is collab NOW)
- Next collab: C747
- EncounterEngine: ~1830 lines
- Layer lock: collab (current)

## 다음 3사이클 (C744 협의에서 확정 예정)
1. [collab] C744: critic + planner + level-designer
2. C745 [system] TBD
3. C746 [structure] TBD

## 달성 사항 (C705-C716)
- C705 [collab]: critic(6/5/4/5) + planner + level-designer
- C706 [balance]: NPC tuning (C705 feedback)
- C707 [UI/UX]: ExpBreakdownBadge + EventChoiceToast wired to OverworldRunner
- C708 [balance]: BET_HIGH 100% gold loss + altar duration 30
- C709 [collab]: BET_HIGH→80% floor, altar 30→20, toast label split consensus
- C710 [system]: PostCombatHealCalc pure module + balance hotfix
- C711 [structure]: DropResolver pure module extraction
- C712 [UI/UX]: HealBreakdownBadge (재생/흡혈/과살/생존 pill badges)
- C713 [collab]: BET_HIGH 3x rework + pity timer + heal rebalance consensus
- C714 [balance]: BET_HIGH 3x/0.40/0.60 + EVENT_PITY_THRESHOLD=20
- C715 [balance]: Heal rebalance (regen +50% early, -40% late ceiling)
- C716 [UI/UX]: HealBreakdownBadge conditional (5% threshold) + dominant highlight
- C717 [collab]: pity-trap 버그 전원 발견, heal floor 3 합의, AI BET_HIGH backlog
- C718 [system]: pity-trap 수정 (trap은 pity 제외) + heal flat floor 1→3
- C719 [structure]: HeroTurnCalc 순수 함수 추출 (crit 판정 + ATK 연산, 10 테스트)
- C720 [balance]: Drop diminish -3%/100lv (cap -25%), 고레벨 gear inflation 억제
- C721 [collab]: EXP grind wall 발견, drop diminish cap 조기, AI BET_HIGH 합의
- C722 [balance]: EXP_DECAY 0.005/0.35 + DROP_DIMINISH 0.015/0.40 (grind wall 해소)
- C723 [system]: AI BET_HIGH (gold>3×threshold) + Weather dodge(rain+5%)/speed(fog-10%)
- C724 [collab]: WeatherHud 필수, fog crit 완화 합의, AI ratio 상향, EnemyTurnCalc 로드맵
- C725 [UI/UX]: WeatherHudIndicator pill badge + engine.getWeather() getter
- C726 [balance]: Fog crit 0.50→0.70, AI BET_HIGH ratio 3→5 (threshold 5000)
- C727 [system]: EnemyTurnCalc 순수 함수 추출 (boss rage/enrage/timer)
- C728 [collab]: fog crit 완화 합의, boss timer 완화 + BET_HIGH ratio, chooseEncounterNode 우선
- C729 [UI/UX]: DestinationBadge pill badge (landmark 도착 표시)
- C730 [balance]: Boss enrage timer 10→15 / mul 2.0→1.5, AI BET_HIGH ratio 5→12
- C731 [system]: chooseEncounterNode stub→trait-weighted (DestinationResolver 위임)
- C732 [collab]: 25/40. Night visual 우선, boss_hunter 안전장치, RelicEffectResolver 합의
- C733 [structure]: RelicEffectResolver extraction (relic 쿼리/뮤테이션 순수 클래스)
- C734 [balance]: boss_hunter weight 1.5→1.3 + difficulty gate (heroLevel×1.5)
- C735 [UI/UX]: Night indicator 🌙 (EXP ×2 표시, weather 우선)
- C736 [collab]: 평가 진행 중

## 캐리오버 (미완료)
- [x] EXP breakdown badge wire into OverworldRunner — DONE C707
- [x] EventChoiceToast wire into OverworldRunner — DONE C707
- [x] PostCombatHealCalc extraction — DONE C710
- [x] DropResolver extraction — DONE C711
- [x] HealBreakdownBadge — DONE C712
- [x] Event pity timer — DONE C714
- [x] BET_HIGH additional reward — DONE C714 (3x rework)
- [x] Pity-trap 버그 — DONE C718
- [x] Heal flat floor — DONE C718
- [x] HeroTurnCalc extraction — DONE C719
- [x] Drop diminish — DONE C720
- [ ] WeatherSystem 추가 효과 (rain=dodge+, storm=crit-, snow=slow)
- [ ] BattleOutcomeBadge + StatDelta gold display
- [ ] RelicEffectResolver extraction
- [ ] AI BET_HIGH 조건부 로직
- [ ] Constants phase profile 분류 (740개)
- [x] chooseEncounterNode trait-weighted — DONE C731
- [ ] CombatLoop enemy turn 추출
- [ ] FeedbackDispatcher (crit sound/haptic) — backlog

## 알려진 기술 부채
- EncounterEngine.ts: 16KB 단일 import line (barrel 경유)
- Constants 분할이 line-number 기반 (semantic 재배치 필요)
- forge-ui 미사용 (OverworldRunner 100% inline style)
