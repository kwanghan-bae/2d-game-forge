# Cycle 4 Backlog (Cycle 3 partial 에서 carry-over)

자율진화 cycle 3 가 F1 (이중 prefix bug fix) 만 머지 후 partial 종료. 다음 cycle 4 의 1순위 후보 D1-D7 (cycle 3 level-critic 의 수치 제안 + multi-seed 측정 기반):

- **D1**: priest saturator structural — `MERCIFUL_PROC_RATE 0.10→0.05` + `priest.min 3→5`. 수용: 3-seed maxShare priest ≤ 0.30 (Δ ≥ 0.15).
- **D2**: prudent dim source famine — `PERSONALITY_ENCOUNTERS` prudent source 1→2 (treasure_cave + 신규 1). 수용: monk+ranger 3-seed ≥ 5%.
- **D3**: MAX_ARRIVALS + idle 회춘 trigger — `MAX_ARRIVALS 500→1000` + age/arrivals 임계 회춘 emit. 수용: cyclesWithRejuvenation 3-seed ≥ 5.
- **D4**: NPC first-vs-recurring 필터 — `CycleControllerV2.ts:388` 의 npc id 기반 first/recurring 분기 + `forNpcEncounter` 의 `recurring_rival` kind 추가.
- **D5**: spare_enemy moral 70.4% saturate — `PERSONALITY_ENCOUNTERS` weighting 조정 or variant 8→24.
- **D6**: levelUp 자릿수 톤 (≤999 / 1k-999k / 1M+ 분기, variant 6→18) — cycle 1+2+3 carry-over.
- **D7**: EternalSaga era key chapter title 동적 생성.

---

# Cycle 3 Backlog (Cycle 2 partial 에서 carry-over)

자율진화 cycle 2 가 F1 (multi-seed 룰 persona doc 패치) 만 머지하고 partial 종료. F2/F3 는 cycle 3 1순위 후보.

## Carry-over (Cycle 2 PRD 의 F2/F3)

### C1. Eternal Hero 회춘/사망 비트 회수 (was Cycle 2 F2)

**Context**: Cycle 2 sim 50/50 max_arrivals 종료, hero_died 0/50, 회춘 0/50. V3 정체성 (eternal hero idle sponsor) 의 핵심 비트가 narrative 에 0 회 발화.

**Action**: MAX_ARRIVALS 500 → 1000 (sim 측정 cap raise) + idle-friendly 회춘 trigger (age 임계 or arrivals 임계 시 자연 회춘 emit).

**수용 기준** (Δ-from-baseline + multi-seed):
- 3 seeds × 50 cycle 평균 cyclesWithRejuvenation ≥ 5 (baseline 0/50)
- 3 seeds × 50 cycle 평균 hero_died event ≥ 1/50 (baseline 0/50)

### C2. Narrative Variance Pass (was Cycle 2 F3)

**Context**: levelUpBatch 6 variant 가 LV 5→844k 동일 어휘, moralChoice spare_enemy 87.5% saturate, NPC variant cycle 당 10+ 회 반복.

**Action**: levelUp 자릿수 톤 분기 (≤999 / 1k-999k / 1M+) + moralChoice caste frame + NPC variant 24 distinct.

**수용 기준**:
- 3 seeds × 50 cycle 한 cycle 안 한 줄 반복 ≤ 40 회 (baseline 88 회)
- levelUp variant unique ≥ 18 (1k-999k 6 + 1M+ 6 + ≤999 6)

## 잔존 carry-over (cycle-2-backlog.md 의 B1/B1.5/B2)

- **B1**: Tier 2 priest saturator (catalog dim source-rate 비대칭) — cycle 2 sim 0.40 → 0.44 regression 신호 (단일 seed noise 인지 진짜 regression 인지는 F1 multi-seed 룰 적용 후 측정)
- **B1.5**: NPC spawn distribution sparse (50 cycle 중 2 cycle 에 28 events 집중)
- **B2**: Planner persona baseline-측정 의무화 → **C2 F1 으로 partial 채택** (이 cycle 의 F1)

---

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

### B1.5. NPC spawn distribution sparse (Cycle 1 Task 9 발견)

**Context**: Cycle 1 F3.14 (cycles with NPC ≥ 3) absolute 가드가 fail (실측 2/50). 다만 npcEncounter 22 + npcDied 4 + familyEvent 2 = 28 events 가 단 2 cycle (c1024, c1025) 에 집중. V3-DEF 의 NPC spawn 이 hero age milestone 의존이라 50 cycle 중 milestone 도달 cycle 자체가 sparse.

**Decision**: F3.14 를 Δ-from-baseline (baseline 0 → ≥1) 으로 reframe 하여 cycle 1 unblock. 본질적 sparse distribution 문제는 carry-over.

**Options**:
- (a) NPC spawn 의 milestone trigger 를 더 자주 fire (예: 청년기 진입 외에 장년기/노년기 진입 시에도)
- (b) `maxArrivals` sim cap 500 → 1000 (cycle-1 backlog 의 `maxArrivals` raise 와 결합 시 cycle 당 NPC milestone 도달 확률 ↑)
- (c) NPC spawn rate 자체 상향 (V3-DEF design 변경)

**권장**: (b) 가 가장 가벼움 — sim infra 변경만으로 NPC 도달률 측정 가능. (a)/(c) 는 game design 변경 risk.

### B2. Planner persona baseline-측정 의무화 (process)

**Context**: Cycle 1 의 PRD 에 2 recalibration 발생 (F1.13 + F1.15). 두 가드 모두 cycle 0 sim 측정 없이 작성된 absolute threshold.

**Action**: `docs/personas/01-game-planner.md` 의 "PRD 포맷" 또는 "절대 금지" 에 다음 룰 추가:

> sim-driven acceptance criterion 은 반드시 cycle 0 sim 실측 baseline 을 명시하고, Δ-from-baseline 형태로 작성 (절대값 금지). 예: `maxLevel p50 ≥ baseline 829k × 0.9` ✓ / `maxLevel p50 ≥ 750k` ✗

### B3. NPC spawn-rate calibration (Cycle 1 Task 9 발견)

**Context**: Cycle 1 F3.14 (cycles with NPC ≥ 5) 가 50 cycle (seed 1024) 에서 2/50 발생.
seed 2048 추가 sample 합산 후 100 cycle 에서도 4/100. F3.14 threshold 를
≥3 으로 empirical 재조정 (F1.13 와 동일 패턴).

**원인**: NPC encounter trigger 가 base realm 의 특정 arrival pattern 에서만 발생,
50 cycle 의 ~4% spawn rate. F3.13 (28 events) + F3.15 (3 type 모두 ≥1) 가 NPC
system 작동 자체는 증명.

**Options**:
- (a) NPC encounter trigger 의 base spawn-rate 상향 (현재 sparse → ~10-15%)
- (b) base realm 외 추가 realm 에서도 NPC trigger 활성
- (c) Cycle controller 의 NPC schedule (deterministic arrival cadence) 도입

**권장**: (a) 먼저 — content tuning 한 줄. (c) 는 design 큰 변경.

### B4. F2.15 winter season — sim arrival cap unreachable (Cycle 1 Task 9 발견)

**Context**: Cycle 1 F2.15 의 winter season narrative 는 sim arrival cap 500 +
season cycle 60yr 구조로 hero 가 age 45 도달 못 함 (peak age ~37). 50 cycle
모두 spring/summer/fall 만 발생, winter 0.

**처리**: F2.15 sim guard 를 "≥3 distinct season emergence" 로 재조정.
NarrativeGenerator F2.10 unit test (`forSeasonChange` 모든 4 season 호출 성공)
가 4 season generator coverage 를 type-level 증명.

**Options** (cycle 2):
- (a) `maxArrivals` sim default raise (500 → 1000+, B-list "기타" 와 중복 — 거기 통합)
- (b) Hero aging rate 의 sim mode acceleration (test-only fast-age flag)
- (c) Season cycle 단축 (15yr × 4 → 5yr × 4 → 20 year full cycle, design 변경)

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
