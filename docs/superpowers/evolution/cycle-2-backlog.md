# Cycle 2 Backlog (Cycle 1 에서 carry-over)

자율진화 cycle 1 (`feat/cycle-1-variance-tone-saga`) 의 후행 candidate.

## Structural / 즉시 후보

### B1. Tier 2 catalog asymmetric source-rate (Cycle 1 Task 3 발견)

**Context**: Cycle 1 F1.13 (Tier 2 single-job share 감소) 는 threshold lever (mage.min 3→5→6→7→8) 만으로 absolute 0.35 도달 불가 — v3/v4 bit-identical jobsUnlocked 분포로 lever exhaustion 검증. 현재 priest 가 새 saturator (0.40).

**원인**: 5 dim × 7 Tier 2 job + 비대칭 dim source-rate (예: `holy_ruin` 같은 pious source 가 다른 dim 의 source 보다 많은 변동성/빈도) 의 whack-a-mole 구조.

**Options** (한 cycle 의 F 단위):
- (a) Tier 2 catalog 축소 (priest 또는 mage 하나 제거 — design 영향 큼)
- (b) `priest.requiredPersonality.dim` 을 다른 dim 으로 분리 (mage 식 분리 패턴)
- (c) personalityEncounters 의 dim source-rate symmetrization (catalog 데이터 변경)
- (d) JobSystem.evaluate 에 `tier2 single-job share cap` 메커니즘 (큰 변경, V3 컨셉 위배 risk)

**권장**: (c) 먼저 시도 — 데이터 변경만으로 가장 가벼움. (b) 는 백업.

**baseline (Cycle 1 post-F1 sim)**:
- 분포: `{paladin:14, mage:11, priest:20, assassin:4, ranger:1, monk:0}` (50 cycle)
- maxShare: priest 0.40, mage 0.22, paladin 0.28, assassin 0.08, ranger 0.02, monk 0.00

### B2. Planner persona baseline-측정 의무화 (process)

**Context**: Cycle 1 의 PRD 에 2 recalibration 발생 (F1.13 + F1.15). 두 가드 모두 cycle 0 sim 측정 없이 작성된 absolute threshold.

**Action**: `docs/personas/01-game-planner.md` 의 "PRD 포맷" 또는 "절대 금지" 에 다음 룰 추가:

> sim-driven acceptance criterion 은 반드시 cycle 0 sim 실측 baseline 을 명시하고, Δ-from-baseline 형태로 작성 (절대값 금지). 예: `maxLevel p50 ≥ baseline 829k × 0.9` ✓ / `maxLevel p50 ≥ 750k` ✗

## 기타 (Cycle 1 PRD 의 backlog 그대로 carry-over)

- Realm Chapter 게이지 + chapter boss trigger (Loop Hero 식, research invention 의 component 3)
- Personality × job-tag × realm-tag 3 축 modifier (Wildermyth, research invention 의 component 2)
- levelUp variant 15+ + 구간별 톤 (≤999 / 1k-999k / 1M+)
- Moral choice variant 확장 (8 → 24+) + caste tagging
- Trial 난이도/보상 rebalance
- Skill catalog 확장 (21 → 35)
- `maxArrivals` sim default raise (500 → 1000)
- V3-G 1만 시간 곡선 sweep
- EternalSaga era key 의 chapter title 동적 생성
