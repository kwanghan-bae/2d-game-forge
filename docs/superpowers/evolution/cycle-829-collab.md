# Cycle 829 Collaboration Record

## 점수
- Critic: **27/40** (7+6+7+7) — **+1** from C826
- 핵심: Toast 패턴 일관성(몰입+1), Fairy 150+ 중반 밀도 개선

## 합의 사항

### Critic
1. Risk Gambit에 player agency 없음 — policy toggle 필요 (3회 연속 지적)
2. Fight 100-250 이벤트 다양성 정체 — 새 id 추가 0건
3. Momentum T3 cap 2.8 inline literal → constants 추출 필요

### Level Designer
1. Fairy share @200 = 9.1% → 적절 (과다 아님)
2. @550 with T3: total 0.851 → cap 미도달 (안전)
3. Fight 149→150 fairy 2x jump → smooth ramp (120-200 linear) 권장
4. T3 threshold 10 → "dead mechanic" 위험 (발동률 2.8%). 8로 하향 + dur 15 제안
5. Echo 0.03→0.04 @250+, duration 10→12 제안

### Planner
1. C830 [system]: Risk Gambit Policy Toggle (always/never/above_threshold)
2. C831 [structure]: CombatResolver extraction (EE→~2220)
3. C832 [balance+collab]: Wandering Merchant (fight 100-250, 3%)

## C830-C832 계획 (합의 + 조정)
| Cycle | Layer | 내용 | 근거 |
|-------|-------|------|------|
| C830 | system | Risk Gambit Policy Toggle | Critic 3회, 3의 규칙 |
| C831 | structure | CombatResolver 또는 hot-path extraction | EE 2305→~2220 |
| C832 | balance+collab | Mid-game event + Echo/T3 tuning | Critic #2 + LD #4/#5 |

## 캐리오버
- [ ] Fairy linear ramp (120-200) — LD 권장, 저우선
- [ ] T3 threshold 10→8 + dur 20→15 — LD 제안
- [ ] Echo 0.03→0.04 @250+, dur 10→12 — LD 제안
- [ ] T3 cap 2.8 → constant 추출 — Critic 제안
- [ ] Storm/snow VFX
