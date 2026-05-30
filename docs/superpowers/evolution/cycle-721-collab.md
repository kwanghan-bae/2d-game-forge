# Cycle 721 Collaboration Record

## 참여자
- **Critic** (6/5/6/7): 흥행6/재미5/몰입6/플레이타임7
- **Planner**: C722-C724 road map (UI/system/balance)
- **Level-Designer**: Drop diminish + EXP decay 산술 분석

## 합의 사항

### 1. 🔴 EXP_DECAY_CAP Lv 150 grind wall
- Level-Designer 발견: `EXP_DECAY_PER_LEVEL=0.01` + `cap=0.50` → Lv 150에서 cap 도달
- Lv 150+ 에서 EXP 영구 반감 → inflation 정체성 훼손
- **합의**: `PER_LEVEL 0.01→0.005`, `CAP 0.50→0.35` (cap 도달 Lv 170→270, magnitude 30% 완화)

### 2. 🟡 DROP_DIMINISH cap 너무 빠름
- Level-Designer: Lv 833에서 cap 도달 후 영구 flat → braking 효과 소멸
- **합의**: `PER_100 0.03→0.015`, `CAP 0.25→0.40` (cap Lv 833→2667, 최종 diminish 40%)
- 효과: 점진적 braking 지속, 최종 rate 0.36*0.60=0.216

### 3. 🟢 AI BET_HIGH 조건부 (Planner F1)
- `heroGold > 3 × nextUpgradeCost` → BET_HIGH 선택
- 이하 BET_LOW 유지
- **합의**: C723 system layer에서 구현

### 4. 🟢 WeatherSystem combat 확장 (Planner F2)
- rain: dodgeMul 1.05 (아군 회피 상승)
- fog: speedMul 0.90 (행동 지연)
- **합의**: C723 system layer 또는 C724 balance

### 5. Critic 핵심 지적 (장기 과제)
- 740 상수 → headless sim 없이 밸런스 검증 불가 (장기 부채)
- 플레이어 에이전시 부재 (전투 중 선택 0) → micro-choice 1개 추가 검토
- EncounterEngine 1900줄 god-class 잔존

## 다음 3-cycle 확정

| Cycle | Layer | 내용 |
|-------|-------|------|
| C722 | balance | EXP_DECAY + DROP_DIMINISH cap 조정 (grind wall 긴급 수정) |
| C723 | system | AI BET_HIGH 조건부 + WeatherSystem dodge/speed 확장 |
| C724 | UI/UX | WeatherHudIndicator + BattleOutcomeBadge real wire |

## 캐리오버
- EnemyTurnCalc 추출 (C723+ system backlog)
- Constants phase profile 태깅 (C727+)
- Mythic 장비 percent gap 완화 (1500→1000)
- Equipment modifier system 활성화
- 전투 중 micro-choice (빌드 선택 극적 분기)
