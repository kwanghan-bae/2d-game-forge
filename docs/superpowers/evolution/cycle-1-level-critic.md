# Cycle 1 비평 (Level Designer)

평가 대상: main HEAD `64bb6e7` (V3-H Depth+Polish 머지 직후)
시드 sim: `/tmp/cycle-1-sim/` — 50 cycle, seed 1024–1073, `maxArrivals=500`
페르소나: `docs/personas/06-level-designer.md`

## 곡선 health (sim N=50)

| 지표 | 분포 | 정상 범위 | 판정 |
|---|---|---|---|
| maxLevel p50 / p90 | 829,189 / 849,225 (avg 800,867 / min 612,149) | 수십만 ~ 백만 단위 (inflation §11.5) | **OK** (heaven 50K–500K 범위 안착, chaos 500K–5M 진입은 측정 외) |
| realm_unlocked rate | sea/volcano 100% / underworld 78% / heaven 52% / chaos 24% | sea/volcano ≥ 80% / heaven ≥ 50% / chaos sim-artifact 가능 | **부분 OK** (heaven 절반만 도착, chaos는 sim-config 한계) |
| hero_died rate | 1/50 = 2% | 5–20% | **봉인** (penalty 활성됐는데 발생률 미달 — V3-G sweep 시 lifesteal/회복 추적 필요) |
| saga_pages p50 (`moralChoices`+`drops`+`skills`+`shrine` proxy) | moralChoices 80 / drops 176 / 21 skills / shrine 1.4 | events ≥ 12 | **OK** (per-cycle 100+ saga 기록) |
| arrivals p50 | 500 / 500 cap = 100% | < cap (autonomy 좋음) | **sim-artifact** (모든 cycle timeout, 자연 cycle 종료 미발생) |
| jobUnlocks | min/max/avg = 2/2/2 | Tier 1+2+3 = 3 | **봉인 + sim-artifact** (아래 분리) |

### sim-artifact 분리 박스 (game balance 문제 ≠ 측정 인공물)

- **모든 50 cycle 이 `endCause=max_arrivals`** (49) + `전사` (1). `maxArrivals=500` 은 sim 의 default config, game design 아님.
- **HeroLifecycle 산수**: 1000 actions = age 70 (END_AGE). age 50 (Tier 3 milestone) = `actionsForAge(50) = ceil((50-5)/(70-5) × 1000)` = **693 actions**.
- 따라서 `maxArrivals=500` 의 sim은 **반-수명 (age 5 → ~37)** 만 측정 중. Tier 3 unlock 0건 / heaven·chaos 진입율 저조는 **부분적으로 sim-artifact** — 다음 cycle 수치 제안표에 "sim config 권고" 셀로 분리.

## 봉인 / outlier

- **`monk` 0% / `ranger` 2% / Tier 2 monk·ranger 슬롯이 사실상 dead** — sim 50 cycle 중 unlock 한 번도 없음. 근거: `JobSystem.evaluate` 의 tie-break `score > best.score` (strict). pious min:3 mage 가 monk (pious min:5) 보다 JOBS 배열에서 **먼저 평가** → 같은 `Math.abs(val)` 일 때 mage 가 항상 이김. 위치: `games/inflation-rpg/src/hero/JobSystem.ts:25` + `data/jobs.ts:29–33`. **V1c-1 phase 의 saint blind-spot 회귀 패턴 동일**.
- **`skillsLearned` p50/p90 = 21/21** (모든 cycle 모든 스킬 학습) — variance 0, 21 skill catalog 가 500 arrival 안에 완전 saturate. SkillLearningSystem 의 후보 풀 소진. 위치: `EncounterEngine.ts:117` (`SHRINE_SKILL_GRANT_RATE=0.48`) + `EncounterEngine.ts:96` (level_up 마다 `tryLearn`).
- **`trial_resolved` 승률 87%** (50 cycle, win 201 / lose 30) — V3-H F5 의 "fieldLv × 2 시련" 이 hero에게 cake walk. 위치: `CycleControllerV2.ts:402`. 게다가 승리 보상 `level += 3` 는 hero level 800k 환경에서 **0.0004%** 상승. 디자인 의도 (`고위험 고보상`) 와 측정 양쪽 다 미충족.
- **`Tier 1 job` 분포 편향**: warrior 44% / archer 28% / rogue 18% / apprentice 10%. 4 job 균등이면 25%/25%/25%/25% 이상이 정상. **heroic dim 이 다른 dim 보다 prior 가 크거나 가산이 빠름** (PersonalityState 의 trait priors + cave/ruin 의 moral 자극 외에는 heroic 자극이 적은데도). 추가 cycle 측정 필요.
- **`Tier 2 job` 분포 편향**: mage 46% / priest 26% / paladin 22% / assassin 4% / ranger 2% / monk 0%. mage 의 압도는 위 tie-break + pious min:3 의 **낮은 threshold** + shrine meditation (pious +3) 의 가산 효과 복합.

## 약점 TOP 3 (밸런스)

1. **monk·ranger 봉인 (JobSystem tie-break)** — Tier 2 milestone 에서 monk(pious≥5) 가 mage(pious≥3) 와 항상 충돌, JOBS 배열 순서로 mage 가 strict 부등호 ties 모두 이김. 50 cycle / monk unlock 0건. 제안: `mage.requiredPersonality.min: 3 → 5` (이유: pious≥3 valley 비워 priest·apprentice 가 차지, pious≥5 영역만 mage/monk 분기. monk 는 `dim: 'pious' → 'prudent', min: 5` 로 valley 분리하여 ranger 와 같은 dim 충돌 발생 — 추가 round 측정).
2. **skill catalog 1-cycle 완전 소진 + variance 0** — 21 skill 모두 50/50 cycle 학습. 컨텐츠 소모율: **1 cycle = 21 skill = catalog 100%**. 일주일 cohort 가 매 cycle 같은 21 skill 본다 — burnout 보장. 제안: `SHRINE_SKILL_GRANT_RATE: 0.48 → 0.20` (V3-H F2 +20% 이전 0.4 보다 더 낮춰서 cycle 후반 milestone 도달 시 unique sense). 추가로 catalog 확장 (21 → 35) 권장 — sim 으로 확인 필요.
3. **trial 승률 87% + reward 0.0004%** — `fieldLv × 2` 가 hero 의 over-leveled 상황에서 무력. 제안: `trialLv = fieldLv * 2 → fieldLv * 3.5` (난이도 상향) + 보상 `level += 3 → level *= 1.05` (percent-based, 800k 환경에서도 40k lv 보상 의미 부여) + 패배 `× 0.85 → × 0.80` (이유: reward 가 큰 만큼 패배 비용도 무거워야 high-risk 정체성 유지).

## 차기 cycle 수치 제안표

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `JOBS.mage.requiredPersonality.min` | 3 | 5 | pious≥3 valley 를 비워 monk 와의 tie-break 충돌 해소 |
| `JOBS.monk.requiredPersonality.dim` | `pious` | `prudent` | mage 와의 same-dim 충돌 영구 분리 (단, ranger 와 새 충돌 — round 2 측정 후 결정) |
| `JOBS.ranger.requiredPersonality.min` | 4 | 6 | prudent≥4 valley 를 archer 가 이미 흡수 중, ranger 는 prudent≥6 으로 상향 |
| `SHRINE_SKILL_GRANT_RATE` (`EncounterEngine.ts:21`) | 0.48 | 0.20 | catalog 1-cycle saturate 해소. V3-H F2 +20% 변경 명시적 reverse |
| `MERCIFUL_PROC_RATE` (`EncounterEngine.ts:23`) | 0.15 | 0.10 | moralChoices avg 80 의 다수 발원. 도덕 가산이 너무 풍부해 personality threshold 가 의미 약화 |
| `trialLv = fieldLv * N` (`CycleControllerV2.ts:402`) | 2 | 3.5 | 87% 승률 → ~55% 목표 (high-risk 정체성 회복) |
| trial win reward (`CycleControllerV2.ts:418`) | `level += 3` | `level *= 1.05` (`floor(level * 1.05)`) | percent-based 로 inflation curve 정합. 800k 환경에서도 +40k lv |
| trial lose penalty (`CycleControllerV2.ts:430`) | `× 0.85` | `× 0.80` | reward 가 큰 만큼 비용도 무거움 (대칭) |
| `MAX_ARRIVALS` (sim default, `sim-cycle-v2.ts:354`) | 500 | **1000** | sim-config 변경 (game 평탄화 아님). age 70 도달까지 측정 → Tier 3 봉인 실측, heaven/chaos 진입율 실측, hero_died rate 실측 |
| `expGainForKill` curve `k_gain` (`inflationCurve.ts:14`) | 1.8 | **유지** | 광부의 손 부재 (1600 lv/arrival) 우려 있으나 inflation 정체성 위배 위험. V3-G sweep 의 1만시간 곡선 정합 확인 후 결정 |

## 컨텐츠 소모 예상

- **Skill catalog 21종** — 현재 1 cycle 안에 100% 학습. 일주일 cohort (가정: 하루 평균 5 cycle × 7일 = 35 cycle) 동안 **신규 학습 = 0**. 첫 cycle 이후 새로운 skill 학습 narrative 부재. **권장**: `SHRINE_SKILL_GRANT_RATE 0.48 → 0.20` 으로 1 cycle 당 평균 12 skill 학습 + catalog 확장 21 → 35 (cycle 당 cumulative 18, 일주일 누적 30, 2주 saturate). 산술: `0.20 × (shrine_visits 1.4 + level_milestone ~10) ≈ 2.3 grant/cycle` 외에 level milestone bonus 추가 학습.
- **Tier 3 job 6종** (hero/archmage/dark_lord/saint/grandmaster/sage) — 현재 sim에서 측정 불가 (age 50 미도달). `maxArrivals=1000` 으로 측정 재현 후 V1c-1 saint blind-spot 회귀 확인 필요. 만약 saint 만 다시 0건이면 `JOBS.archmage.requiredPersonality.min: 6 → 8` 같은 valley 분리 적용.
- **Trial altar 5종** (sea/volcano/underworld/heaven/chaos 각 1개) — 현재 cycle 당 5 trial × 87% win = 무난한 +15 level 보상. 제안값 적용 시 cycle 당 5 trial × 55% win × 5% level = **+13.75% level** 보너스 (의미 있는 boost). 약 8 cycle (1.5일) 에 한 번 패배 → 매 cycle 새로운 narrative.
- **Realm 6종** — 현재 heaven 까지 entered avg 26/50, chaos 12/50. `maxArrivals=1000` sim 후 chaos 진입율 ≥ 60% 가 정상. 미달 시 `fieldLevelRange` 재검토 (현재 chaos 500K–5M, hero avg 800k).

## 표류 경보

**없음.** 현재 V3-H 곡선은 inflation 정체성 (1 → 수십만 레벨) 유지 중. 제안 사항 모두 곡선 평탄화 / 레벨 cap 도입 / 일반 RPG 30–50 lv 기준 아님. `k_gain 1.8` 도 유지 권고 (V3-G sweep 결정 사항). `maxArrivals` 변경은 **sim-config 조정**이지 game 평탄화 아니므로 정체성 위배 아님.

## 후속 cycle 권고 순서

1. **sim re-run with `maxArrivals=1000`** — Tier 3 봉인 / heaven·chaos 진입율 / hero_died rate 실측. 위 수치 제안 검증의 prerequisite.
2. **JobSystem mage/monk/ranger 수정 + sim re-run** — Tier 2 분포 평탄화 확인 (mage 46% → 25% 목표).
3. **Trial + Shrine 수정 + sim re-run** — 21 skill saturation 해소 + trial 승률 55% 도달 확인.
4. **V3-G 1만 시간 곡선 sweep** (별도 phase) — k_gain / k_req / k_atk / k_hp / k_eHp / k_eAtk 6 차원 sweep. 위 1-3 의 fix 가 반영된 baseline 으로.
