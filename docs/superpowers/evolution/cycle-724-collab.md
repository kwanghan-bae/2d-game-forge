# Cycle 724 Collaboration Record

## 참가자
- **Critic** (6/5/6/7 = 24/40): 740 constants 플레이어 체감 0, AI stub 421 cycle 방치, Weather/Night UI wire 0
- **Planner**: C725 UI/UX (WeatherHud+BattleOutcome wire), C726 balance (mythic gap), C727 system (EnemyTurnCalc)
- **Level-Designer**: EXP post-170 평탄화 acceptable, AI BET_HIGH threshold 도달 lv35-45 적정, fog crit penalty 0.50 과도

## 합의 사항

### 즉시 반영 (C725-C727)

1. **C725 [UI/UX]**: WeatherHudIndicator + BattleOutcomeBadge real data wire
   - 날씨 pill badge (☀️🌧️🌫️⛈️ + 효과 한줄)
   - EncounterEngine onBattleOutcome emit → BattleOutcomeBadge props 연결
   - "보이지 않는 시스템은 존재하지 않는 시스템" (critic 만장일치)

2. **C726 [balance]**: Fog crit penalty 완화 + AI BET_HIGH threshold 상향
   - WEATHER_FOG_CRIT_PENALTY: 0.50 → 0.70 (DPS loss 21%→15%)
   - AI_BET_HIGH_GOLD_RATIO: 3 → 5 (threshold 3000→5000, prestige 후 즉시 BET_HIGH 방지)
   - EXP_DECAY_CAP 0.35 유지 (level-designer: acceptable, 수많은 EXP mul이 상쇄)

3. **C727 [system]**: EnemyTurnCalc 순수 함수 추출
   - EncounterEngine ~80줄 inline enemy damage → pure module
   - HeroTurnCalc(C719) 동일 패턴
   - Engine 목표: 1835→~1755줄

### Backlog 조정
- **chooseEncounterNode AI 개선** (critic: 421 cycle 방치) → C728+ 격상
- **Constants phase profile tagging** → C730+ chore cycle
- **Gambler ALL_IN 3rd option** (level-designer 제안) → C730+ 검토

## 수치 변경 합의

| param | 현재 | C726 target | 근거 |
|---|---|---|---|
| WEATHER_FOG_CRIT_PENALTY | 0.50 | 0.70 | 이중 패널티 과도, crit build 봉인 완화 |
| AI_BET_HIGH_GOLD_RATIO | 3 | 5 | prestige 후 즉시 BET_HIGH 방지 |
| EXP_DECAY_CAP | 0.35 | 0.35 (유지) | post-170 OK, mul chain이 상쇄 |

## 표류 경보
- **AI BET_HIGH가 플레이어 도박 선택권 잠식** (critic): idle 자동화와 "의미 있는 개입" 경계선 설계 필요. C728+ chooseEncounterNode 개선 시 함께 처리.
