# Cycle 105 비평 (Level Designer)

> v1 100 cycle 완주 + v2 cycle 101-104 narrative tone 수렴 직후, game critic
> 의 cycle-105-critic.md 가 N1-N5 5 개 NEW 방향을 surface 한 뒤의 level
> designer 시각 평가. 콘텐츠 소모율 + 카탈로그 dead path + inflation 정체성
> mechanical 봉인 측 분석.

## 척추 finding — 카탈로그 dead path 정정

user 요청 §2 의 "monster 61 / equipment 41 / boss 109 / skill 32 / dungeon
120 area × 5-10 stage" 의 size 는 **모두 V2 floor + BattleScene path 잔여**다.
V3 OverworldRunner + AutoBattleController + realm rotation flow 에서 reachable
한 catalog 는 별도다:

| 카탈로그 | 파일 | total | V3 active 소비 | dead path |
|---|---|---:|---:|---:|
| monsters | `monsters.ts` | 61 | **0** (V2 BattleScene 전용) | 61 |
| bosses | `bosses.ts` | 109 | **0** (V2 floor boss 전용) | 109 |
| equipment | `equipment.ts` | 41 | 0 직접 — meta atk/hp bonus 만 | 41 |
| skills (active) | `skills.ts` | 32 | 0 (BattleScene SkillSystem) | 32 |
| jobskills (ULT) | `jobskills.ts` | 13 | 0 직접 | 13 |
| relics / mythics | `relics.ts` + `mythics.ts` | 11 + 31 | 0 (BattleScene proc) | 42 |
| dungeons / floors | `dungeons.ts` + `floors.ts` | 8 + curve | 0 | all |
| **realm enemyRoster** | `realms.ts` | **6 realm × 4 = 24** | **24** | 0 |
| **base realm enemy** | `realms.ts` base 추가 | **6** | **6** | 0 |
| **realm boss** | `realms.ts` bossId | **6** | **6** | 0 |
| traits | `traits.ts` | 17 | **16** (V3 HeroDecisionAI) | 1 |
| jobs / sponsorBuffs | `jobs.ts` + spendModal | 6 + 7 | 6 + 7 | 0 |
| stories / quests | `stories.ts` + `quests.ts` | 27 + 29 | 0 (V2 region/quest UI) | 56 |
| **narrative tone permutation** | `narrationVariants.ts` 등 | — | **~1080** (6 realm × 6 age × 9 channel) | 0 |

V3 active mechanical catalog total = **30 enemy entity id + 6 boss id + 16 trait
+ 7 buff + 6 job + ~1080 narrative permutation**. user 가 알려준 "61/41/109/32"
는 V2 잔재로 inflation 6.96M 여정에 쓰이지 않는다. 따라서 §2 콘텐츠 소모량 분석
은 *V2 catalog 기준이 아니라 V3 active catalog 30 enemy 기준* 으로 다시 한다.

## 곡선 health (sim N=30, seed=1024, chained 1200 arrival)

cycle 16+17 baseline 인용 — cycle 105 시점 신규 sim 미실행.

| 지표 | 분포 | 정상 범위 | 판정 |
|---|---|---|---|
| maxLevel p50 / p90 | 6.96M / ~7.2M | ≥ 1M | PASS |
| polynomial degree (log-log) | **0** | ≤ 1.0 | PASS — 거의 linear time |
| realm_unlocked rate | 100% (6/6 organic by cycle 50 chained) | ≥ 80% | PASS |
| natural-death rate | 99.3% | 80-95% | **HIGH** — Hard cap 작동 |
| auto-rejuv rate | 99.3% | 50-90% | **HIGH** — light 가용 |
| age ending median | 70 | 60-80 | PASS |
| arrival p50 / cap | ~1154 / 1200 | — | **cap 근접** — cycle 17 finding |
| atkBonus impact on maxLevel | ratio 1.01 | ≥ 1.10 | **FAIL — atk-bound 봉인** |
| start-realm σ/mean (rotation) | 5.66% | ≥ 5% | PASS (cycle 16) |

봉인 신호 = (1) arrival cap 1200 근접 + (2) atkBonus 누적 1336 이 maxLevel 에
+1% 만 기여 → cycle 17 결론 "real cap = aging 자연사 + atk flat 의 dynamic
range 부족". inflation 정체성은 *숫자상* 안전 (degree 0 = 거의 linear), 그러나
*mechanical depth* 는 빈약.

## 콘텐츠 소모율 — V3 active catalog 기준 산술

cycle 1 = 1200 arrival, 자연사로 종료. 1 arrival ≈ 1 enemy encounter (landmark
간 이동 포함). 30 enemy id 전체에 균등 분배 시:

| 메트릭 | 산식 | 값 |
|---|---|---|
| arrivals per cycle | 측정 baseline | 1154 |
| enemies per cycle | landmark 별 spawn 1 | ≈ 1154 |
| unique enemy id | realm enemyRoster | **30** |
| encounter / enemy id / cycle | 1154 / 30 | **38.5** |
| narrative permutation total | 6 realm × 6 age × 9 channel | 1080 |
| narrative coverage / cycle | sample p50 | ~120-180 (10-17%) |
| narrative full sweep | 1080 / 150 | **~7 cycle** |

**판정**: enemy id 의 mechanical variety 는 38.5 encounter/enemy/cycle 으로 1
cycle 안에 모두 노출 — *수평 폭의 첫 cycle 완료*. narrative 1080 은 cycle 7
부터 sweep 완료. **cycle 8 이후의 신규 자극 = 0**. cycle 17 의 atk_bonus
1% 효과 == 자극 0 의 mechanical confirm.

## 재방문 곡선 — eternal hero realm 재방문 분석

cycle 15 의 rotation 66.7% 가 의미하는 것을 정확히 분리한다:

- **시작 realm variance** (rotation 측정값) = `unlocked[n % unlocked.length]`,
  cycle N+1 의 *spawn* 만 변동. σ/mean 5.66%.
- **신규 콘텐츠 비율 per revisit** = chained 50-cycle 측정에서 unlockedRealms
  6/6 organic 완료 → cycle 5+ 부터 *모든 realm 이 익숙*. revisit 시 신규 enemy
  / boss / narrative permutation **0%**.
- 즉 rotation = *시작점 variety* 일 뿐, *콘텐츠 신규성* 은 아니다.

advisor 권고 인용: "cycle 간 신규 콘텐츠 비율 = 0%, rotation = 시작점 variety
일 뿐". cycle 8+ 부터의 retention 은 *narrative texture 누적* (saga
permutation log) + *trait/sponsor combinatorics* + *RNG 변동* 에 100% 의존.

## 봉인 / outlier

- **enemyRoster 30 = inflation 정체성 mechanical 봉인** — 6.96M level span 에
  대해 30 enemy entity 가 균등하게 펴짐. realm 별 4 enemy 가 *level scale 1
  → 5M* 의 dynamic range 를 cover. 즉 같은 emoji 의 적이 lv 1 과 lv 5M 에서
  같은 sprite/이름 으로 등장 → *체험상 인플레이션 invisible*. 근거: critic 의
  약점 §1 "체험 환원 부재" 와 같은 root.
- **atk_bonus 0 → 1336 의 maxLevel 영향 ≤ 1.01×** (cycle 17 측정) — sponsor
  gold spend (player decision) 의 outcome 이 측정 불가. 근거: cycle 17 의 다중
  seed 재현.
- **arrival cap 1200 = cycle 길이 hard cap** — natural death 99.3% 이지만 실
  종료 원인은 arrival 소진 + age 70 동시. 이 cap 이 maxLevel 의 진짜 lid.

## N1-N5 content cost — 셀 단위

| 방향 | enemy | boss | equipment | skill | trait | narrative | asset (VFX/sound) | code line (추정) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **N1 Inflation VFX** | 0 | 0 | 0 | 0 | 0 | 0 | **8 milestone preset** (lv 100/1k/10k/100k/1M/10M/100M/1G) + 8 sound stinger + screen shake curve | ~250 (`InflationMilestoneVFX.tsx` + detector + event bus wire) |
| **N2 Mid-cycle decision** | 0 | 0 | 0 | 0 | 0 | **3 modal kind × ~6 path = ~18 narrative line** | 1 modal pause icon + 3 transition sound | ~400 (`MidCycleDecisionModal.tsx` + controller pause/resume + 3 trigger hook) + data **+15 buff card definition** + **+6 realm fork path** |
| **N3 Hall + Leaderboard** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ~200 (`SagaHallScreen.tsx` + `HallStorage.ts` top-50 + 즐겨찾기 schema) |
| **N4 Run Stats + Curve** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ~150 (`InflationCurveChart.tsx` + 60-sample ring buffer) |
| **N5 Live Ops** | **+8 enemy seasonal variant** | **+4 seasonal boss** | +0 (modifier 만) | +0 (trait modifier 만) | **+16 yr seasonal modifier** | **+30 achievement narrative** | 5-10 token tier icon + season banner | ~1500+ (catalog + engine + screen + persist v25) |

콘텐츠 추가 부담 순서: N3 < N4 < N1 < N2 < N5. N2 는 catalog (15 buff + 6 fork)
도 함께 늘어 medium-heavy. N5 만 단독 mega.

## 추가 콘텐츠 needs — narrative covered, mechanical 부족

cycle 41-42 + 101-104 로 narrative texture 는 6×6×9=1080 permutation 으로
포화. 그러나 mechanical depth 는 다음이 비어있다:

| 영역 | 현재 | 부족분 | 영향 |
|---|---|---|---|
| enemy entity per realm | 4 | 8-12 필요 — level span 5,000× 동안 같은 sprite | 인플레이션 *체험* 부재 (critic §A) |
| realm count | 6 (cap 5M) | 7-9 realm — 5M-50M-500M tier | 6.96M 도달 후 *영역상 endgame*. lv 50M 가도 시각상 chaos realm 동일 |
| boss tier per realm | 1 | 2-3 (mini + main + ascended) | 한 realm 첫 진입 = 첫 boss kill = 영구 endgame. 재방문 boss 동일 |
| sponsor buff catalog | 7 | 12-16 — player decision 의 outcome variance 확대 (cycle 17 봉인 해소 보조) | atk_bonus 1% 한계 |
| mid-cycle decision surface | 1 (SpendModal) | 3-5 (N2 보스 진입 / fate roll / realm fork) | critic 약점 §2 |
| inflation milestone marker | 0 (sim 산출만) | 6-8 tier visual (N1) | critic 약점 §1 |

narrative 가 cover 됐다는 가정 하에 1순위는 **enemy roster 확장 + realm 7+
추가**. 시각상 inflation 을 *체험* 하려면 같은 lv 5M 적이 lv 5 적과 sprite 가
달라야 한다.

## 콘텐츠 inflation 곡선 — 정체성 강화 mechanical 변화 제안

레벨 cap 제안 금지 룰 준수. 모두 *확장* + *가속* 방향.

### 1. 7th-9th realm 도입 (chaos 위 tier 확장)

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `REALM_CATALOG.length` | 6 (cap 5M) | **8** (cap 500M) | 6.96M maxLevel p50 위에 2 realm 확장 = endgame 의 *재진입 가능 새 sprite* |
| 7th realm `fieldLevelRange` | — | `[5_000_000, 50_000_000]` | inflation 정체성 *체험* 가능한 새 시각 영역 |
| 7th realm enemyRoster | — | 4 신규 entity id | sprite/emoji 가 lv 5M 부터 변화 — critic §A 직접 해소 |
| 8th realm `fieldLevelRange` | — | `[50_000_000, 500_000_000]` | 9-color 폭발 endgame |

콘텐츠 cost: **enemy 8 + boss 2 + narrative 6 age × 9 channel × 2 realm = 108
신규 line**. dungeon-floor 시스템 의 1200 arrival cap 은 그대로. arrival 분배
는 unlocked realm 균등 → 8 realm 시 cycle 당 enemy/realm 38.5 → 28.9 (약간
완화).

### 2. Inflation milestone tier — 영구 균열석 보상 + arrival 가속

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| milestone tier 도달 시 균열석 | 0 (V3 에 균열석 inactive) | lv 100k / 1M / 10M / 100M = 균열석 +1 / +3 / +5 / +10 | inflation 정체성 *수치적 보상* |
| arrival per cycle | 1200 | lv 1M 돌파 시 cycle 당 +200 | cycle 17 의 arrival cap 진짜 lid 해소. *체험 가속* |
| MAX_ARRIVALS (controller cap) | 1200 | **1500** (post-milestone) | sim cycle 17 의 ratio 1.01 → 예상 1.05-1.10 (다음 cycle 측정 필요) |

### 3. Power spike event — level ×10 jump tier

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `level / prevLevel ≥ 10` 감지 시 | passive readout | **screen flash + 1-cycle atkBaseBonus×2** (사가 highlight) | critic §A + §B 합쳐 해소 |
| trigger 빈도 (sim 측정 필요) | ? | 3-5 회/cycle 예상 | inflation 곡선 polynomial degree 0 = 시간상 균등 → 트리거 너무 잦지 않음 |

### 4. Enemy entity tier-up — 같은 realm 안 mid-tier 등장

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| realm 당 enemy id | 4 | **8** (low + high tier 각 4) | level 1-50 base 와 level 5M chaos 의 sprite 가 다르듯, 같은 realm 안에서도 hero level 이 mid 일 때 high-tier swap |
| 신규 enemy entity total | 30 | **62** (8 realm × 7 + base 6) | mechanical variety + inflation 체험. cost: 32 신규 entity id |

### 5. Mid-cycle decision (N2 보조)

cycle 17 의 atk_bonus 1% 봉인 해소 보조 — sponsor gold 가 *cycle 중* 결정으로
환원되면 outcome variance 가 maxLevel 에 finally 반영. spec 단계에서 boss-room
buff card 의 효과 magnitude 를 atk +50% / hp +50% / lifesteal 등 *수치형* 으로
정의 (atk_bonus +N 같은 flat 아님).

## 차기 cycle 수치 제안표 (셀 단위)

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `REALM_CATALOG.length` | 6 | **8** | inflation realm cap 5M → 500M 확장 |
| 7th realm fieldLevelRange | — | `[5e6, 5e7]` | endgame realm 신규 sprite |
| 8th realm fieldLevelRange | — | `[5e7, 5e8]` | 9-color tier |
| enemyRoster per realm | 4 | 8 (low+high) | mid-cycle sprite swap |
| 총 enemy entity id | 30 | **62** | sprite variety |
| MAX_ARRIVALS | 1200 | 1500 (lv 1M 후) | cycle 17 arrival cap 완화 |
| milestone reward (lv 100k) | 0 | 균열석 +1 | 영구 보상 axis |
| milestone reward (lv 1M) | 0 | 균열석 +3 | |
| milestone reward (lv 10M) | 0 | 균열석 +5 | |
| milestone reward (lv 100M) | 0 | 균열석 +10 | |
| power spike atk burst | 0 | ×2 1 cycle (level ×10 jump 시) | inflation 체험 |
| sponsor buff catalog size | 7 | 12-16 | decision outcome variance |
| boss tier per realm | 1 | 2 (mini + main) | revisit 가치 |

## 컨텐츠 소모 예상

| 신규 기능 | sweep 시간 | 권장 cooldown / 희소성 |
|---|---|---|
| 7th-8th realm + 32 신규 enemy | 1 hero cycle (1200 arrival, 모두 노출) | enemy spawn 가중치 = realm 등장 차수 별 다른 high-tier 추첨 |
| 8 milestone tier (N1 VFX) | hero 평생 가능 = 1 cycle (lv 1G 도달은 sim 미검증) | 8 tier 모두 본 hero = cycle ~10+ 누적 = 100h 이상 |
| 15 buff card (N2) | 1 cycle 안에 보스 ~5회 마주침 → 5 card 노출 = **3 cycle 만에 sweep** | 카드 등급 (common/rare/legendary) + cooldown — 등급별 등장률 조정 필요 |
| 1080 narrative permutation 신규 8 realm × 6 age × 9 channel = 432 추가 | 7 cycle (현재와 동일 rate) | narrative 추가 곡선 변동 없음 — 자율진화 cycle 41-42 패턴 따라 |

## 표류 경보

**Yellow → Red 임계.** 4 cycle 연속 narrative tone (101-104) 후 v2 가 *새 100
cycle* 인데 mechanical 콘텐츠 추가 0. critic 의 룰 9 제안 (카테고리 4 연속 후
강제 pivot) 미적용 시 cycle 105+ 가 *narrative 5 연속* 으로 가면 inflation
정체성 회귀 risk. cycle 105 entry = **N1 (VFX) 또는 7th realm + enemy 확장**
의 mechanical 카테고리 강제 권고. critic 의 추천 N1 우선은 level designer 도
동의 — scope 1 cycle / inflation 체험 직접 환원 / catalog 추가 0 으로 가장
저비용 high-impact.

## 마무리 한 줄

> **cycle 105 = N1 (Inflation Milestone VFX)**. cycle 106-110 = N2 (mid-cycle
> decision, 15 buff card 추가 cost 동반). cycle 111+ = **7th-8th realm + 32
> enemy 확장** (이 critic 에서 신규 surface — N2 의 mid-cycle decision 의
> outcome 이 새 realm sprite 와 결합될 때 inflation 의 *체험 + 보상* 양축이
> 처음 닫힘). N3/N4 는 사이드 phase, N5 는 mega-phase 별도.
