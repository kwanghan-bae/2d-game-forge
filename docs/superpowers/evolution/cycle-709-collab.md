# Cycle 709 Collaboration Record

## 참여자
- **Critic**: 6/5/4/5 (Fun 향상, 몰입성 저하 — Toast 라벨 버그 발견)
- **Level-Designer**: BET_HIGH geometric ruin 분석, altar early-snowball 확인
- **Planner**: C710-C712 task plan (PostCombatHealCalc → DropResolver → HealBadge)

## 핵심 발견

### Critic
1. **Toast 라벨 버그**: `event_gambler_lose` → '골드 반감' 표시이나 실제 BET_HIGH는 전액 손실
2. 이벤트 조우 빈도 낮음 (합산 ~8.5%/전투) → pity timer 제안
3. BET_HIGH가 EV -10% + geometric ruin = "never pick" → dominated strategy

### Level-Designer
1. BET_HIGH: geometric EV = 0 (단 1회 패배 = 파산). Loss floor 80% 제안
2. Altar 30-fight duration → early sacrifice = 60% run coverage = snowball
3. **추천**: altar duration 30→20 (단일 조정으로 snowball 억제)
4. BET_HIGH loss 80% floor (보수적: win rate 유지 0.45, EV ≈ +0.01g ≈ zero-sum)

### Planner
- C710 [system]: PostCombatHealCalc 순수 함수 추출 (~80 lines, heal 4종)
- C711 [structure]: DropResolver 순수 함수 추출 (~60 lines, drop 5조건)
- C712 [UI/UX]: HealBreakdownBadge (Logic + React, ~90 lines)

## 합의 사항

### 즉시 적용 (C710 밸런스 hotfix로 포함)
1. Toast 라벨 분기: `event_gambler_lose_high` / `event_gambler_lose_low` 구분
2. BET_HIGH loss floor: 100% → 80% (geometric ruin 제거, EV ≈ 0)
3. Altar duration: 30 → 20 (early-snowball 억제)

### C710-C712 실행 계획
- C710 [system]: PostCombatHealCalc + balance hotfix (Toast fix + BET_HIGH floor + altar 20)
- C711 [structure]: DropResolver extraction
- C712 [UI/UX]: HealBreakdownBadge

### Backlog (C713+ 고려)
- Event pity timer (N+15 전투 이벤트 미등장 시 guaranteed trigger)
- BET_HIGH 추가 보상 (relic 확률 등으로 dominated strategy 해소)
- In-combat HealCalc 추출
- Event roll 독립화
