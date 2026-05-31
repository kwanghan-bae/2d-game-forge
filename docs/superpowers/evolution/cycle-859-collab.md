# Cycle 859 Collab Record

## 참여 에이전트
- **Critic**: 31.5/40 (±0)
- **Level Designer**: Stack degeneration 분석 + BUFF_STACK_CAP 제안
- **Planner**: C860-C862 PRD (early momentum + EXP extraction + crossroads rebalance)

## 점수 변동
31.5 → **31.5/40** (±0)
- 흥행성 8.0 (+0.5): buff 중첩 "폭발 순간" 시각 쾌감
- 재미 8.5 (+0.5): overlap variance 유효하게 넓어짐
- 몰입성 7.5 (−0.5): storm drain 시각 피드백 부재
- 플레이타임 7.5 (−0.5): 3-stack dead content, 새 콘텐츠 없음

## 핵심 발견

### 1. Storm+Crossroads 실 overlap 확률 ~1-2% per run (Level Designer)
- Weather exclusivity + duration overlap 필요 → "가끔 오는 축제"
- ×1.593은 1-hit boundary를 넘기에 충분하지만 4-fight 한정 → 안전

### 2. Storm Drain → Crossroads Gold Path 강제 (Level Designer + Critic)
- Storm 4-fight drain 24% + combat damage → HP < 40% 도달 가능
- Crossroads AI가 gold path 강제 선택 → storm+crossroads ATK stack 차단
- **의도적 glass cannon tradeoff로 건강** (문서화 필요)

### 3. N-Stack Degeneration: 4+ = degenerate (Level Designer)
- 2-stack (1.593) safe, 3-stack (1.99) borderline, 4+ (2.39) progression skip
- 향후 BUFF_STACK_CAP = 2.00 도입 권장 (C860 backlog)

### 4. Rebalance 보수적 → variance 압축 (Critic)
- 구조 변경의 임팩트를 수치 보수성이 상쇄
- Storm 1.35→1.38 복원 또는 ClearSky 1.12→1.15 복원 고려 (C862 backlog)

## C860-C862 합의 계획

### C860 [system]: Early-game Momentum
- Fight 1-50 구간, comboStreak 5회마다 micro-reward
- 5-streak: ATK +3% (2 fights), 10-streak: EXP ×1.15 (3 fights), 15-streak: Gold burst
- ActiveAtkBuffs에 earlyMomentum 추가
- Fight 51+ 비활성 (hard cap)

### C861 [structure]: buildPostVictoryExpContext extraction
- L1158-1169 inline multiplier chain → pure function
- Params: baseExpGain, expMul, dsm components, sfm, mentorActive, crossroadsExpRemaining, heroLevel
- Returns: { rawExp, cappedExp }
- 6+ unit test cases

### C862 [balance+collab]: Crossroads rate + gold rebalance
- CROSSROADS_CHANCE: 0.05→0.03 (84%→65% trigger rate)
- CROSSROADS_GOLD_BURST_MUL: 50→120 (gold path = 8 fights income equivalent)

## Backlog
- BUFF_STACK_CAP = 2.00 (future-proofing, not needed yet)
- Crossroads HP threshold 0.4→0.35 (storm+crossroads combo opportunity)
- Storm drain visual feedback (OverworldEvent emit)
- Test constants import vs hardcoded values
