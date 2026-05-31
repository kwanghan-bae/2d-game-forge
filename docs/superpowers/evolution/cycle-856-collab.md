# Cycle 856 Collab Record

## 참여 에이전트
- **Critic**: 31.5/40 (+0.5)
- **Level Designer**: ATK ternary 우선순위 역전 + Crossroads trigger rate 분석
- **Planner**: C857-C859 composable ATK buff stack PRD

## 점수 변동
31.0 → **31.5/40** (+0.5)
- 흥행성 7.5 (+0.5): Crossroads의 once-per-run 서사적 무게감
- 재미 8.0 (+0.5): 3-path variance로 run 간 분기
- 몰입성 8.0 (+0.5): window 분리로 event timeline이 narrative처럼 읽힘
- 플레이타임 8.0 (±0): 신규 콘텐츠 없이 수치 조정만

## 핵심 발견

### 1. ATK Ternary Priority Bug (Critic + Level Designer 합의)
- `stormNexus > clearSky > crossroads` 순서로 exclusive 적용
- Clear Sky(×1.15) 가 Crossroads(×1.20) 보다 우선 → 희소한 buff가 덮임
- **해법**: exclusive → composable multiplicative stacking

### 2. Weather Exclusivity = Natural Cap (Planner 발견)
- Storm Nexus 는 `weather: 'storm'` 필요
- Clear Sky Path 는 `weather: 'normal'` 필요
- 둘은 동시 불가 → 실제 max 2-stack (어느 하나 + crossroads)
- 3-stack은 이론상 불가능

### 3. Crossroads AI Auto-Choice (Critic 지적)
- "once-per-run 선택"이지만 AI가 deterministic 선택 → player agency = 0
- 현 단계에선 idle 특성상 수용 가능하나, 장기적으로 personality trait 분기 필요

### 4. Gold Burst Path 열등 (Level Designer)
- level×50 ≈ 3.3 fights income, ATK/EXP 복리 대비 1/3-1/4 가치
- 향후 level×120으로 상향 고려 (C860+ backlog)

## C857-C859 합의 계획

### C857 [system]: Composable ATK Buff Stack
- L1803-1806 ternary → multiplicative chain
- `heroAtk = base × (storm ? 1.35 : 1) × (clearSky ? 1.12 : 1) × (crossroads ? 1.18 : 1)`
- Weather exclusivity가 natural cap (max 2-stack = ×1.593)

### C858 [structure]: Extract computeBuffedHeroAtk
- Pure function in CombatCalculator.ts
- Interface: `ActiveAtkBuffs = { stormNexus, clearSky, crossroads }`
- 8-case unit test (2³ combinations)

### C859 [balance]: Stacking Rebalance
- STORM_NEXUS_ATK_MUL: 1.40 → 1.35
- CLEAR_SKY_PATH_ATK_MUL: 1.15 → 1.12
- CROSSROADS_ATK_MUL: 0.20 → 0.18
- STORM_NEXUS_HP_DRAIN_RATE: 0.05 → 0.06
- Max 2-stack: 1.593 (storm+cross) or 1.322 (clear+cross)

## Backlog (미적용)
- Crossroads chance 0.05→0.03 (trigger rate 84%→66%)
- Gold burst level×50→120
- Sparring max 129→94
- Mercenary min 115→131
- DurationBuffManager 대규모 추출
