# Cycle 256 비평 (Level Designer)

cycle 156-255 의 100-cycle 자율진화 완주 직후 cycle 256 시작. 본 critic 은
**실측 50-cycle headless sim** (`pnpm --filter @forge/game-inflation-rpg sim:v3
-- --chained --seed 100 --count 50`) 결과 (`/tmp/cycle-256-sim/summary.json`)
와 catalog 산술 동반. cycle 145/156 의 carry-over status update 포함.

페르소나 룰 (`.claude/agents/level-designer.md`): inflation 정체성 사수 / sim
mirror 또는 산술 우선 / 수치는 셀 단위. 본 cycle 은 신규 sim **실측** 수행
— 100-cycle 자율진화의 silent regression 위험 검증이 cycle 핵심.

## 곡선 health (sim N=50 chained, seed=100)

| 지표 | 분포 (실측) | baseline (cycle 17/100/156) | 정상 범위 | 판정 |
|---|---|---|---|---|
| maxLevel p50 | **4,887,360** | 6,913,463 / 6,860,000 / 6,920,000 | baseline ±10% | **-29% 침식** |
| maxLevel p90 | 7,004,396 | 6,976,261 | baseline ±10% | OK (개인 high 보존) |
| maxLevel min | 4,203,456 | — | — | — |
| arrivals p50 | 1,003 | — | ≤ 1200 cap | OK |
| arrivals p90 | 1,154 | — | ≤ 1200 cap | OK |
| 자연사 ratio | **50 / 50 (100%)** | 100% (cycle 17) | ≥ 30% | OK |
| hero_died ratio | 0 / 50 | — | 5-20% | **dead path** |
| rejuvCount p50/min/max | **2 / 2 / 2** (cap saturated) | — | — | flat |
| cyclesWithAnyRejuv | 50 / 50 | — | — | 100% rejuv |
| jobUnlocks p50 | 3 | — | 3 (Tier 1→2→3) | OK |
| skillsLearned p50 | 9 | — | 8-12 | OK |
| shrineVisits p50 | 0 (p90 = 1) | — | — | low engagement |
| moralChoices p50 | 74 | — | — | OK |
| drops p50 | 365 | — | — | OK |

### Job 분포 (jobsUnlocked 최종 직업, 50 cycle)

| Job | Tier | atkMul | hpMul | 빈도 | 비중 |
|---|---|---|---|---|---|
| **saint** | 3 | 2.5 | 3.0 | 40 | **80%** |
| sage | 3 | 2.8 | 2.8 | 7 | 14% |
| dark_lord | 3 | 3.8 | 2.2 | 1 | 2% |
| hero | 3 | 3.0 | 2.5 | 1 | 2% |
| archmage | 3 | 3.5 | 2.0 | 1 | 2% |
| **grandmaster** | 3 | 3.2 | 2.5 | **0** | **0%** (미관측) |
| Tier-2 6 job | — | — | — | 0 | 미진행 |
| Tier-1 4 job | — | — | — | 0 | 미진행 |

**5 / 16 job 만 sim 에 도달 (31%)**. 11 / 16 미관측. 비핵심 13 char 차별화
sim 측정 = *제로*.

### Skill 학습 분포 (50 cycle, total 학습 시도 = 440)

| Skill | jobIds | atkMul | 학습 cycle 수 | 비중 |
|---|---|---|---|---|
| **second_wind** | apprentice/sage/priest | 1.00 | **49** | **98%** |
| **bless** | priest/saint/paladin | 1.05 | **43** | 86% |
| **heal** | priest/saint | 1.00 | **42** | 84% |
| **divine_judgment** | paladin/saint/hero | 1.28 | **41** | 82% |
| inner_focus | apprentice/sage | 1.05 | 26 | 52% |
| wind_walk | archer/ranger/rogue | 1.05 | 25 | 50% |
| strike | warrior/paladin/hero | 1.10 | 20 | 40% |
| multishot | archer/ranger | 1.12 | 19 | 38% |
| aim | archer/ranger | 1.15 | 18 | 36% |
| cleave | warrior/paladin | 1.08 | 18 | 36% |
| shield_wall | warrior/paladin | 1.02 | 17 | 34% |
| poison | rogue/assassin | 1.10 | 17 | 34% |
| backstab | rogue/assassin | 1.20 | 15 | 30% |
| soul_drain | dark_lord/mage | 1.20 | 15 | 30% |
| arcane_mastery | mage/archmage/sage | 1.22 | 15 | 30% |
| meditation | monk/grandmaster/sage | 1.10 | 13 | 26% |
| shadow_step | rogue/assassin/dark_lord | 1.13 | 12 | 24% |
| **fireball** | mage/archmage | 1.18 | 11 | 22% |
| **icebolt** | mage/archmage | 1.15 | 10 | 20% |
| **palm_strike** | monk/grandmaster | 1.18 | **7** | **14%** |
| **curse** | dark_lord/assassin | 1.15 | **7** | **14%** |
| (`*`) heroSkills 22 정의, 본 50-cycle 에 21 학습 |

상위 4 skill (second_wind / bless / heal / divine_judgment) = priest/saint
계열. 학습 cohort 의 *85%+* 가 saint 친화 pool. 하단 4 skill (palm_strike /
curse / icebolt / fireball) = 비핵심 archetype dead surface (≤ 22%).

### 학습 시도의 cross-archetype pollution

- saint dominant cycle 의 학습 history 가 *과거 job* 의 pool 누적 (Tier-1
  apprentice/archer/warrior + Tier-2 paladin/priest). saint 최종 직업의
  hero (c100/c125 MD sample) 도 aim / multishot / shield_wall 학습.
- 결과: saint 80% dominance + heroSkills 의 *generic top-4 saturation* 양
  방향 spiral. cycle 156 V1c-2 의 saint 58.5% blind spot 이 *deepen*.

## 봉인 / outlier

- **maxLevel p50 6.92M → 4.89M (-29% 침식)** (★ NEW critical)
  - cycle 17 (`STATUS-2026-05-25-cycle-17.md`) 의 baseline `chained 50-cycle,
    maxArrivals=1200, seed=300` p50 = 6,913,463. cycle 100/156 도 동일 range.
  - 본 cycle (cycle 256, seed=100, 동일 옵션) p50 = 4,887,360. **silent
    regression -29%**.
  - 산술 검증: saint 80% atkMul 2.5 + sage 14% atkMul 2.8 + 기타 6% atkMul ~3.4
    = 평균 **2.60**. equal-dist (6 tier-3 job 균등) = 평균 **3.13**. 차 17%.
  - heroSkills 학습 pool 의 saint top-4 (second_wind 1.00 / bless 1.05 / heal
    1.00 / divine_judgment 1.28) 평균 atkMul = **1.083**. 광범위 학습 평균 (22
    skill) = **1.116** (atk 위주 8 skill 평균 1.18). saint 학습 pool 평균이
    *3% 더 낮음*.
  - 결합: atk 평균 17% × pool 평균 3% = **약 20% atk 침식** → maxLevel ^1.0
    이므로 ≈ 20% 곡선 압축. 관측 -29% 의 *2/3 설명*.
  - 잔여 ~9% 침식: shrineVisits p50 = 0 (engagement axis 잠수) / cross-realm
    progression 침식 / inflation curve 의 비선형 잔재 — verify 권장.

- **saint 80% (cycle 156 의 58.5% 가 *deepen* 으로 회귀)**
  - cycle 156 critic 의 V1c-2 finding ("saint 58.5% blind spot") 가 100 cycle
    동안 *해소되지 않고 21.5%p 악화*. 표류 deadline 룰 (cycle 145 → cycle 165
    회수) 도 본 outlier 에는 적용 안 됨.
  - 원인 = jobs.ts:39 `requiredPersonality.merciful min: 7` 의 도달 가능성이
    *너무 낮은 임계*. PersonalityState 의 max-roll cap 이 +10 인데 saint 만
    7 으로 nearby (sage 는 unconditional fallback). hero/archmage/dark_lord
    의 min = 8/6/-8 (dark_lord 는 negative 임계라 prudent 0+ vs heroic 0 의
    surface 가 발생 어려움).

- **rejuvCount 2/2 saturated**
  - cycle 11 의 C10-B 의 max-cap 2 가 50 cycle 전체에서 2 도달. aging axis 의
    *flat plateau*. 다음 axis = max-cap 상향 (3 / 4) 또는 rejuv 의 magnitude
    스케일 (77 → 100 actions / rejuv) 또는 *완전 다른 axis 도입*.
  - inflation 정체성 측면: rejuv 가 cycle 진행을 *연장* 만 하지 atk 곡선에
    기여 0 — atk 보상은 cycle 17 atk-bound invariant 유지. 정체성 위배 아님.

- **shrineVisits p50 = 0 (p90 = 1) dead surface**
  - 50 cycle 평균 0.14 visit. 90% cycle 이 0 visit. 사당 노드의 placement
    가능성 / decision AI 의 score 가중 / personalityEncounters wire 어느
    레이어에서 *학습 가능 신호* 부재.
  - cycle 156 carry-over 의 #2 (HeroDecisionAI wire) 가 cycle 175 narrative
    chain 으로 부분 도달했지만 *shrine 가중* 은 별도 axis. cycle 257+ surface
    권장.

- **11 / 16 job 미관측 (비핵심 13 차별화 = 0)**
  - Tier-1 4 (warrior / archer / rogue / apprentice) → Tier-2 6 (paladin /
    mage / assassin / priest / ranger / monk) 모두 progress 통과 후 Tier-3
    도달. 최종 job 만 surface 되므로 본 finding 은 *최종 시점 측정 한계*.
  - 그러나 ULT 12 (3 char × 4) 가 정의된 char (hwarang / mudang / choeui)
    의 sim 진입조차 측정 안 됨 — char 시스템 자체가 hero pipeline 의 *별도
    axis* (charactersSelectScreen 사전 선택 필요). sim chained mode 가 char
    sub-axis 진입 안 함.

- **palm_strike / curse 14% 학습 (dead skill tail)**
  - palm_strike (monk/grandmaster) 14% — grandmaster job 0 / 50 관측의 직접
    결과. monk Tier-2 도달 가능하지만 학습 시점에 다른 skill 우선.
  - curse (dark_lord/assassin) 14% — dark_lord 1 / 50 + assassin 0 / 50 관측.
  - 두 skill 의 atkMul 1.18 / 1.15 은 healthy 수치. 학습 트리거 axis (job
    history) 가 좁아서 dead. heroSkills 의 jobIds 확장 또는 progression 통과
    시 *retroactive 학습 가능 mark* 필요.

- **achievementsCatalog.ts:20 stale 14% 주석 (cycle 156 carry-over)**
  - cycle 156 critic 의 약점 #3 이 100 cycle 동안 여전히 *미정정*. 자율진화
    의 docs piggy-back 룰이 100 cycle 누적되어도 본 1-line edit 회수 0.
  - 차기 cycle 의 어느 docs slot 에도 piggy-back 가능 — 이번 cycle 256 의
    final commit 에 포함 권장.

## 약점 TOP 3 (밸런스)

### 1. maxLevel p50 -29% silent regression (★ critical)

**Magnitude caveat (verify 필요)**: 본 측정은 `seed=100` 단일 50-cycle.
cycle 17 baseline `chained 50 cycle, 1200 cap, p50=6,976,261` 의 정확한 seed
는 STATUS-2026-05-25-cycle-17 grep 에서 확정 안 됨. seed 변동만으로 p50 가
20-30% 흔들 수 있어 -29% magnitude 자체는 cycle 257 의 `seed=300` 재현
측정으로 확정 필요. 단 다음 두 독립 근거가 *regression 가설*을 강하게
지지함:
- **p90 안정 vs p50 침식 발산**: 본 sim 의 p90 = 7,004,396 ≈ baseline p90
  6,976,261 정합. 균일 seed variance 면 p90 도 떨어진다. p90 보존 + p50
  하락 = *분포의 왼쪽 꼬리 두꺼워짐* = saint 클러스터 가설과 정합.
- **saint 80% × atkMul 2.5 = 평균 2.60 vs 균등 3.13 = 17%** 의 산술이
  관측 -29% 의 ~2/3 를 비-우연적으로 설명.

따라서 magnitude 가 -29% / -15% / 부분-결합 중 어느 값이든 **약점 #1 + #2
의 채택 방향성은 unchanged**.

cycle 156-255 의 100-cycle 동안 inflation 곡선 *silent regression*. cycle
17/100/156 의 baseline 6.86-6.92M 에서 본 cycle 4.89M. inflation 정체성 위배
의 첫 surface.

**원인 가설 (sim diff 안 했음 — verify 필요)**:
- saint 80% dominance × saint atkMul 2.5 (최저) = 평균 atk 17% 부족
- saint pool top-4 skill atkMul 1.083 (전체 평균 1.116 대비 3% 낮음)
- 두 axis 결합 ≈ 20% maxLevel 압축. 관측 -29% 의 ~2/3 설명.

**제안 A (선호 / 약점 #2 와 결합)**: `saint.atkMul: 2.5 → 2.8` (sage 와 동률).
- 산술 추정: saint 80% × 2.8 + sage 14% × 2.8 + 기타 6% × 3.4 = 평균 **2.84**.
  현재 2.60 → 2.84 = +9.2%. maxLevel 4.89M × 1.092 = **5.34M** 회복.
- 회복은 -29% → -23% (부족). 결합 axis 필요.

**제안 B (강력)**: 약점 #2 의 saint 빈도 nerf 와 결합. saint 80% → 35% 목표
(균등 50%/dominant 50% 의 healthy 분포).
- 균등 axis 도달 시 평균 atkMul = 3.13 → maxLevel 4.89M × 3.13/2.60 = **5.89M**.
  -15% 회복.
- 추가로 `saint.atkMul: 2.5 → 2.8` 결합 시 평균 atkMul 3.21 → **6.04M** (-13%).

**제안 C (carry-over verify)**: cycle 257 의 sim diff = cycle 145 baseline 의
seed 별 cycle bisect. 어느 cycle 의 micro polish 가 catalyst 인지 확정 필요.
git log oneline -100 의 commit 별 sim p50 측정.

- category: balance (cycle 255 직후 fresh 100-cycle, 룰 9 안전)

### 2. saint 80% dominance (cycle 156 의 58.5% 가 +21.5%p deepen)

cycle 156 V1c-2 finding 의 100-cycle 표류. saint 단일 job 의 dominance 가 *4
다른 Tier-3 job + 비핵심 grandmaster 의 surface 0%* 와 짝.

**제안 A (필수)**: `saint.requiredPersonality.merciful min: 7 → 9`.
- merciful dim 의 max-roll +10 cap 에 더 가까이 → saint 도달 빈도 감소.
- sim 추정: merciful 7-8 cycle 이 sage (unconditional) 로 fall-back → sage
  비중 14% → 25-30% 분산.

**제안 B (보조)**: `sage.requiredPersonality` null → `{ dim: 'pious', min: 6 }`.
- 현재 sage 가 saint 미달의 *catch-all*. pious 6 임계 추가하면 sage 도 specific
  axis 가 되고 fallback 은 새 mech 필요 (예: tier-3 단순 default 또는 personality
  외 axis).
- 산술: pious min 6 도달은 ~30% cycle. sage 비중 25-30% → 8-10% 예상.

**제안 C (조심)**: dark_lord moral min: -8 → -6 / archmage pious min: 6 → 5.
- 비핵심 Tier-3 의 도달 가능성 직접 상향. 그러나 *현재 dominance 의 원인이
  fall-back 부재인지 임계 부재인지* 분기 안 됨 → 제안 A 단독 채택 후 carry-over.

권장 = **제안 A 단독**. saint min 7 → 9. cycle 257 sim 재측정 후 sage axis
확장 검토.

- category: balance (약점 #1 과 함께 cycle 256 의 catalyst)

### 3. ULT_CATALOG 12 / 32 gap (4 char 정의 missing → 비핵심 13 axis 침묵)

V3-DEF mega-phase 의 spec 은 `16 char × 2 ult = 32 ult`. 실제 catalog
(`jobskills.ts`) = `3 char (hwarang/mudang/choeui) × 4 ult = 12`. *13 char 의
ULT 미정의*.

heroSkills 22 가 *passive job-affinity stat-only* axis 임. cooldown / multi-hit
/ aoe / heal / buff / execute 가 정의된 active skill 은 ULT 12 만. 즉:
- saint 가 final job 으로 50 cycle 의 80% 인데 saint 의 ULT 정의 = **0**.
- 시스템 정의상 saint 의 active skill 시전 빈도 = 0 (catalog 부재).

**제안 (컨텐츠 axis)**: Tier-3 alt 4 char (`hero / archmage / dark_lord /
grandmaster`) 의 ULT 4 ult/char 정의. 16 ULT 신규 → 28 / 32 도달.
- 산술 (컨텐츠 소모율):
  - 평균 hero 가 1-2 char 핵심 사용 시 평생 8 ULT 노출 (현재 정의 12 중
    8 만 도달 가능).
  - +16 ULT = total 28 / 32, *carry-over 20 ULT* (8 노출 기준 250% headroom).
  - 비핵심 char 의 ULT 가 saint dominance 깨는 axis 와 정렬 (hero atkMul 3.0
    / archmage 3.5 / dark_lord 3.8 / grandmaster 3.2 — saint 2.5 보다 모두 높음).
- magnitude 예: hero_ult_1 = `execute` mult 6 cooldown 8s / archmage_ult_1 =
  `aoe` mult 4 targets 8 / dark_lord_ult_1 = `multi_hit` mult 3 targets 5 /
  grandmaster_ult_1 = `reflect` 90% × 4s.

- category: 컨텐츠 (cycle 257-265 의 5+ cycle work — 본 critic 의 mega-phase
  진입 시그널). cycle 256 의 즉시 balance fix 가 아닌 mid-term backlog.

## 차기 cycle 수치 제안표

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `saint.atkMul` (jobs.ts:39) | 2.5 | **2.8** | maxLevel -29% 침식의 ~9% 회복 (산술) |
| `saint.requiredPersonality.merciful.min` (jobs.ts:39) | 7 | **9** | saint 80% → 35% 목표. sage fall-back 활용 |
| `sage.requiredPersonality` (jobs.ts:41) | null | **`{dim:'pious', min:6}`** (boundary) | catch-all 해소 — *carry-over*, 약점 #2 채택 후 |
| `divine_judgment.atkMul` (heroSkills.ts:41) | 1.28 | **유지** | top-tier saint skill 의 atk 보존 (nerf 시 saint dominance 보조 axis) |
| `palm_strike.jobIds` (heroSkills.ts:45) | monk/grandmaster | **+sage 추가** | sage 학습 pool 확장 (saint 의존도 분산) |
| `curse.jobIds` (heroSkills.ts:48) | dark_lord/assassin | **+mage 추가** | curse 14% → 25-30% 회복 |
| `rejuvCount` cap (hero/rejuvenation.ts) | 2 | **3** *carry-over* | aging plateau 해소, cycle 258+ |
| `inflation-flash-100x` 임계 (carry-over) | 3 | **(측정 후)** | cycle 145+ carry-over, telemetry 부재 |
| `aging-master-10` 임계 (carry-over) | 10 | **7** | cycle 145 carry-over 잔존 |
| `achievementsCatalog.ts:20` 주석 | "~14%" stale | **"4.89M maxLevel + saint 80% (cycle 256 측정)"** | cycle 156 carry-over docs piggy-back |
| ULT_CATALOG (jobskills.ts) | 12 (3 char) | **+16 (4 alt char)** | 비핵심 axis backlog — *mega-phase 진입* |

권장 채택 분배:
- **cycle 256 (balance)**: 약점 #1 + #2 동시 적용. `saint.atkMul 2.5 → 2.8`
  + `saint.merciful min 7 → 9`. cycle 257 sim 재측정으로 회복도 검증.
- **cycle 257 (verify)**: 50-cycle sim 재실행. saint 분포 검증 + maxLevel p50
  baseline 회복 검증. 6.0M+ 도달 시 healthy.
- **cycle 258-260 (carry-over)**: rejuvCount cap 3 / shrineVisits axis / sage
  personality 임계. 1 cycle 1 axis 분할.
- **cycle 261-270+ (mega-phase)**: ULT_CATALOG +16 정의 (4 char × 4 ult).
  분할 chain 가능 (1 char / cycle).

## 컨텐츠 소모 예상

### 본 cycle 의 sim measurement 의 새 사용자 시간 산술

- 본 sim chained 50 cycle 의 평균 = 1,032 arrivals / cycle.
- **action_time / arrival** 측정 없음 (sim 은 logical step). 게임 *실시간*
  10× speed (OverworldScene.initialSpeed=10) 기준 추정 = 평균 0.3 sec /
  arrival → 1032 × 0.3 = **약 5.2 분 / cycle**.
- 50 cycle × 5.2 min = **260 분 = 약 4.3 시간**.
- 본 sim 의 maxLevel p50 4.89M 도달 = **4.3 시간 unattended play** (auto-battler
  10× speed 기준).
- 사용자 prompt "maxLevel 6.86M 까지 며칠 걸리는가" 의 답: 본 baseline 회복 후
  6.86M 도달 = 약 50 cycle × 5.2 min × 1.4 ratio = **6.0 시간**. 1 일 1.5
  시간 idle play 가정 시 **4 일**.

### ULT_CATALOG 12 / 32 gap 의 컨텐츠 소모

- 현재 12 ULT 중 1 char 핵심 사용 시 평생 노출 4 ULT (1 char × 4 ult). 평균
  user 1-2 char → 4-8 ULT 노출.
- **현재 소모 = 67% (8/12) — 매우 빠른 소모율, 신규 user 며칠 만에 모두 노출**.
- +16 ULT (4 alt char) 추가 → total 28 ULT. 평균 1-2 char 노출 = 4-8 / 28 =
  14-29% 소모. **carry-over headroom 250%**. healthy.
- 만약 16 char 전부 ULT 정의 (32) → 12-25% 소모 = mid-term healthy.

### saint dominance 해소 후 char 다양성 소모

- 본 sim 의 jobsUnlocked = 5 job (31%). 약점 #2 채택 후 sage 25-30% + saint
  35% + tier-3 alt (hero/archmage/dark_lord) 각 8-12% 추정.
- 단일 user 의 cycle 별 final job *체감* 다양성: 현재 80% saint = "거의 always
  saint". 채택 후 35% saint + 30% sage + 35% 기타 = "3 회마다 다른 job" 의 mid
  variety. 5 cycle window 의 unique job count 1 → 3-4 예상.
- 컨텐츠 소모율 측면 16 job 의 surface = 30 cycle window 에서 9-11 / 16 unique
  도달 추정 (현재 5 / 16). 컨텐츠 axis *2 배 확장* 효과.

### SeasonalModifier rotation cohort (cycle 178 의 8-12 catalog)

- cycle 156 critic 의 "consumer wire 시차" 가 cycle 161/169/175/177 분할 chain
  으로 cycle 255 시점 완전 해소 (STATUS-cycle-255 의 "cosmetic landing").
- 1 년 user 의 modifier 노출: cycle 178 의 8-12 catalog × 30 일 = 1 년 12 modifier
  도달 가능 (cycle 145 carry-over 목표 달성).
- 본 cycle 의 새 finding 없음. 100-cycle 의 자율진화 wire chain 성과.

## cycle 156 carry-over status update

| carry-over | 최종 상태 (cycle 255 STATUS 기준) |
|---|---|
| `saint.requiredPersonality.merciful min` 강화 | **미적용** — 본 cycle 의 약점 #2 로 다시 surface |
| `tokenToCrack` 5:1 → 3:1 (realistic 1.56% sub-margin) | **유지 5:1** (cycle 145 carry-over) |
| `HeroDecisionAI.pickTrait` wire | **완료** (cycle 161-175 chain) |
| `achievementsCatalog.ts:20` 주석 정정 | **여전히 stale** — 본 cycle 약점 #3 |
| ULT_CATALOG 12 → 32 | **미진행** — 본 cycle 의 mid-term backlog |
| `rejuvCount` cap 상향 | **carry-over** (본 sim 의 새 finding 검증) |

## 표류 경보

- **inflation 정체성 silent 회귀** (cycle 256 의 가장 무거운 finding) —
  baseline maxLevel p50 6.92M → 4.89M (-29%). 100 cycle 자율진화의 micro
  polish 누적 어디선가 catalyst 발생. cycle 17 의 atk-bound invariant 가
  자율진화 시스템의 가드에서 *측정 누락*. cycle 257 의 sim diff 권장.

- **saint dominance deepen** — cycle 156 V1c-2 의 58.5% blind spot 이 100
  cycle 표류 deadline 룰에도 회수 안 되고 *21.5%p 악화*. 자율진화 시스템의
  carry-over deadline 룰의 첫 명백한 위반.

- **레벨 cap / 평탄화 시도 0** — inflation 정체성 보존 정합. maxLevel 회복
  방향의 모든 제안이 *상향* (saint.atkMul 2.5 → 2.8) — 정체성 위배 0.

- **MAX_ARRIVALS / fieldLevelRange invariant 보존** — sim arrivals p90 = 1154
  ≤ 1200 cap. realm boundary 회귀 0.

- **자율진화 측정 누락 패턴** — 100 cycle 동안 maxLevel baseline 측정이 cycle
  17/100/156 의 3 회로 그침. 본 critic 의 cycle 256 측정이 *4 회째*, 그 사이
  100 cycle 의 silent regression catch 가 cycle 245 (deadline 100 cycle) 의
  *완전 미발견*. 자율진화 시스템의 *sim baseline 매 N cycle 강제 측정 룰* 의
  도입 권장 — 본 cycle 의 메타-finding.

## 한 줄

cycle 156 의 saint 58.5% V1c-2 가 100-cycle 자율진화 후 **80% deepen** + 같은
기간 inflation 곡선 **-29% silent 침식** 의 두 critical finding. 두 finding 의
원인 가설은 *결합* (saint atkMul 2.5 가 모든 Tier-3 중 최저). 차기 cycle 256
의 적용 = `saint.atkMul: 2.5 → 2.8` + `saint.merciful min: 7 → 9` 셀 단위
2 line edit + cycle 257 sim 재측정. ULT_CATALOG 12 / 32 gap 은 cycle 261+ 의
mega-phase backlog 로 carry-over.
