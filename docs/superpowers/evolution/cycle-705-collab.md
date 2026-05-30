# Cycle 705 — Collaboration Record

## Critic (Fun 5/10)

핵심 진단: "양쪽 다 EV+ 도박 = 리스크 없는 free money"
- BET_HIGH EV = +17.5%G, BET_LOW EV = +20%G → 항상 베팅이 정답, choice variance 0
- Priority cascade가 event diversity 질식 — trap(4%)+shrine(8%)가 먼저 소비
- Altar 10-fight duration이 inflation scale에서 무의미 수준
- C702 default 변경으로 이벤트 "발화"는 성공 — 방향성 긍정

제안: BET_HIGH lose를 전액 상실로, event roll 독립화, altar duration 40+ or prestige-scaled

## Planner (C706-C708)

| Cycle | Layer | Task |
|-------|-------|------|
| C706 | structure | StreakTracker 추출 (12+ streak fields → 순수 class, -250~350 lines) |
| C707 | UI/UX | ExpBreakdownBadge + EventChoiceToast wire into OverworldRunner |
| C708 | balance | Weather wind EXP 반영 + event frequency 튜닝 |

의존: C706→C707→C708 (순차)

## Level-Designer

분석 결과:
- BET_LOW: arithmetic +20%G, geometric +13.7%/bet. 5.4 bets → median gold ×2.0. **적정**
- BET_HIGH: geometric EV-negative (×0.933/bet). 합리적 AI는 선택 안 함. 존재 의의 약화
- Altar SACRIFICE: HP gate 0.40 해결함. EV-positive (10f×faster kills = +35% net HP savings)
- Merchant priority: +7.5% effective rate (1.19%→1.28%). 체감 불가, cosmetic 개선
- 전체 event economy: net +1,236g/run. 건강

표류 경보: 없음. Gold inflation 곡선 강화 방향.

## 합의 — 플래너 C706-C708 채택 + critic 피드백 반영

1. **C706 [structure]**: StreakTracker 추출 (planner 원안 채택)
2. **C707 [UI/UX]**: Badge + Toast wire (planner 원안 채택)
3. **C708 [balance]**: Gambler BET_HIGH lose penalty 강화 (critic 제안 반영) + altar duration 확대

Critic의 "event roll 독립화"는 구조 변경 범위가 크므로 C709+ 으로 보류.
Level-designer의 "BET_HIGH WIN_RATE 0.48" 제안은 C708에서 함께 검토.
