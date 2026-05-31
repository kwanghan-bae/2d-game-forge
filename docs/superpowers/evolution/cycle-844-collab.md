# Cycle 844 Collab Record

## 참여 에이전트
- Critic (game-critic)
- Level Designer (level-designer)
- Planner (game-planner)

## Critic 평가: 30.0/40 (+0.5)
| 축 | 점수 |
|---|---|
| 흥행성 | 7.5 |
| 재미 | 7.0 |
| 몰입성 | 7.5 |
| 플레이타임 | 8.0 |

### Top 3 Issues
1. **RunStats UI 부재** — computeHighlights() 로직 완성 but .tsx 호출 없음
2. **Player Agency 부재 (80-250)** — Sparring/Merchant 모두 AI 자동 해결
3. **Merchant Gamble 허상 variance** — 35% AI pick, 플레이어 decision space 기여 0

### 핵심 발견
- Fight 250+ void는 오진 — Abyssal/Titan/Crimson/GoldCrucible/Astral/SoulForge 6종 존재
- getLateGameDensityMul ×1.5→×2.5 가 250-550 구간 보상

## Level Designer 분석
- Sparring/Merchant 중첩 (125-129): 합산 7%/fight, P(≥1 in 5)=30.4% → **건강**
- Merchant Gamble: EV-neutral (safe=1.80, gamble=1.80), variance play로 건강
- Sparring E[encounters]=2.0/run, miss rate 13% (C841 대비 29%→13% 개선)
- fight 125-130 밀도 cluster: Mentor+Sparring+Merchant+Colosseum = 15%/fight (최고점)
- Mentor(130)/Sparring(129) 동시 종료 → fight 131 cliff 주의

### 수치 제안
- WANDERING_MERCHANT_GAMBLE_LOSS_GOLD: 0→50 (narrative 공백 해소)
- 3 cycle 관찰 후 조정 (3의 규칙)

## Planner 제안: C845-C847

| Cycle | Layer | 내용 |
|---|---|---|
| C845 | system | LateGameEventScheduler — pity timer + density data class |
| C846 | structure | tickSacrificeSubsystem → SacrificeSubsystem.ts 추출 |
| C847 | balance+collab | Late-game density 1.5→1.8 + event_echo_convergence 신규 |

## 합의

### 수렴점
- Fight 250+ void는 실제 부재 → 대신 density 미세 조정으로 체감 개선
- RunStats UI는 backend-only 제약으로 backlog 유지
- Merchant gamble EV-neutral 구조 유지 (건강한 디자인)
- EncounterEngine 추가 추출 계속 (2310→~2260 목표)

### C845-C847 확정 계획
1. **C845 [system]**: LateGameEventScheduler — fights 250+ pity/density 관리 데이터 클래스
2. **C846 [structure]**: SacrificeSubsystem 추출 (gold burn, combo reset, exp offering, danger bet, health tax)
3. **C847 [balance+collab]**: Late density 1.5→1.8 at 250+ + gamble loss consolation gold 50
