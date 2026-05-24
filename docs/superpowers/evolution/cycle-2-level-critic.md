# Cycle 2 비평 (Level Designer)

평가 대상: main HEAD `ac061d1` (Cycle 1 머지 후)
시드 sim: `/tmp/cycle-2-sim/` — 50 cycle, seed 2048–2097, `maxArrivals=500`
페르소나: `docs/personas/06-level-designer.md`
직전 baseline: cycle 1 (seed 1024, post-F1 sim) — `docs/superpowers/evolution/cycle-1-level-critic.md`

## Cycle 1 권고 적용 추적 (Δ-from-cycle-1)

| 권고 | 적용 여부 | 위치 |
|---|---|---|
| `SHRINE_SKILL_GRANT_RATE 0.48 → 0.20` | **적용** | `EncounterEngine.ts:21` |
| `MERCIFUL_PROC_RATE 0.15 → 0.10` | **적용** | `EncounterEngine.ts:23` |
| `JOBS.mage.requiredPersonality.min 3 → 5` | **적용 (3 → 6 까지 강화)** | `data/jobs.ts:29` |
| `pious positive delta 3 → 2` (cycle 1 F1 자체 추가) | **적용** | `data/personalityEncounters.ts:38` |
| `trialLv = fieldLv * 2 → 3.5` + percent reward | **미적용 (carry-over)** | `CycleControllerV2.ts:461,477` |
| `MAX_ARRIVALS 500 → 1000` (sim config) | **미적용 (carry-over)** | `sim-cycle-v2.ts` |

## 곡선 health (sim N=50, Δ-from-cycle-1)

| 지표 | Cycle 1 | Cycle 2 | Δ | 판정 |
|---|---|---|---|---|
| maxLevel p50 / p90 | 829,894 / 850,001 | 816,565 / 844,531 | -2% / -1% | **OK** (seed variance, inflation 정체성 유지) |
| skillsLearned p50 / p90 | 9 / 11 (post-F1) | 9 / 11 | 0 | **OK** (F1 변경 효과 안정화 — 21-skill cycle saturate 봉인 해소 유지) |
| moralChoices p50 | 56 | 55 | -1 | **OK** |
| Tier 2 maxShare | priest 0.40 | priest 0.44 | **+0.04 regression** | **악화 (B1 worsen)** |
| monk + ranger 합 | 1 (ranger 1) | 0 | **-1 regression** | **봉인 재확립** |
| hero_died rate | 1/50 = 2% | 0/50 = 0% | **-2pp** | **sim-artifact (arrivals=500 cap)** |
| realm_unlocked sea/volcano/underworld/heaven/chaos | 100/100/78/52/24% | 98/90/76/52/18% | 약간 ↓ chaos | **부분 OK** (chaos 진입 봉인 강화) |
| jobsUnlocked distinct (50 cycle 분포) | 5 (mage 11) | **4 (mage 7)** | mage 약화, priest dominance | **악화 (B1)** |

### sim-artifact 분리 박스
- 50 cycle 모두 `endCause=max_arrivals` (회춘/death 이벤트 발생 0). `arrivals=500` 으로는 peak age ~37 까지만 측정 → V3 design 의 회춘 비트 (age 50+) 도달 자체 불가. Cycle 1 backlog "기타" 의 `maxArrivals 500 → 1000` 은 prerequisite 으로 carry-over 한다.
- Tier 3 unlock 0건도 동일 sim-artifact (age50 milestone 미도달).

## 봉인 / outlier

- **`priest` Tier 2 saturator regression** — 50/50 cycle 중 22 cycle priest (0.44). cycle 1 의 0.40 → cycle 2 의 0.44. mage 는 `min: 6` 으로 강화되어 0.22 → 0.14 로 감소했으나 그 valley 를 priest 가 흡수. 근거: `MERCIFUL_PROC_RATE 0.10` 이 여전히 모든 non-boss 처치 (cycle 당 ~460 회) 마다 fire → 산술 ~46 procs/cycle × abs(δ)=1, prior=0 sign-branch 누적으로 merciful>=3 도달이 거의 보장. `data/jobs.ts:31` (`priest.requiredPersonality.min: 3`) + `EncounterEngine.ts:77` (proc 위치).
- **`monk`(prudent≥5) / `ranger`(prudent≥6) 둘 다 0/50** — Cycle 1 의 `mage.min 3→6` 수정으로 mage valley 가 빠졌지만, prudent dim 의 **source 가 `treasure_cave` landmark 단 하나** (sparse spawn) 이라 prudent ≥5 도달 자체가 희박. priest 가 모든 Tier 2 candidate 의 score 경쟁에서 abs(merciful) ≥ 3 으로 거의 확실하게 이김 (JobSystem.ts:25 strict `>`). 근거: cycle 2 jsonl spot-check (50/50 cycle 모두 priest score ≥ 모든 prudent score).
- **`trial_resolved` 1M tier 100% lose (0 win / 19 lose)** — **new finding** (cycle 1 에선 1M trial 도달 cycle 수 적었음). chaos realm 진입 9 cycle 중 1M trial 실제 발생 19회 모두 패배. damping 함수가 1M field 에서 hero 800k 를 적정 제압 불가. 위치: `CycleControllerV2.ts:461,463`. 결과: chaos realm 의 trial 은 사실상 **punitive-only** (level *0.85 ≈ -15% 영구) — high-risk 정체성은 OK 인데 high-reward 가 0 이라 비대칭.
- **Tier 1 분포 편향 변화 없음** — warrior 48% / archer 30% / rogue 16% / apprentice 6%. heroic dim source 만 watchtower 하나인데도 dominance — `heroic dim 의 prior 또는 PersonalityState.adjust` 의 sign-branch 가 다른 dim 보다 fire 빠른지 별도 측정 필요 (cycle 1 비평에도 동일 outlier 발견됨, 미해결 carry-over).

## 약점 TOP 3 (밸런스)

1. **B1 priest saturator regression (`merciful_proc` 모든 처치마다 fire + min:3 threshold 낮음)** — Cycle 1 backlog B1 option (c) source-rate symmetrization 미실행. 제안: `MERCIFUL_PROC_RATE: 0.10 → 0.05` (이유: pious_holy_ruin = sparse landmark 1 source 의 frequency 와 산수 정합. cycle 당 procs 46 → 23, abs(merciful) ≥ 3 도달 cycle 비율 sim 측정 필요) + `JOBS.priest.requiredPersonality.min: 3 → 5` (이유: cycle 1 mage 식 패턴 — threshold 를 source-rate 와 정합).
2. **prudent dim source-rate 봉인 (monk + ranger 0/50)** — Cycle 1 backlog B1 option (c) 의 다른 측면. prudent 의 source 가 `treasure_cave` landmark 단일 → spawn rate 자체가 cycle 당 1-2 회. 제안: `personalityEncounters` 에 prudent source 추가 1종 (예: `kind: 'merchant'` 같은 landmark) 또는 `PERSONALITY_ENCOUNTERS` 의 `holy_ruin` 처럼 sightseeing/shrine 등 기존 카테고리에 prudent positive 갈래 추가. magnitude 는 `treasure_cave` 와 동일 delta:3 (이유: pious 가 3 source / merciful 이 1 fire-on-kill source 인 비대칭을 prudent 에도 source 2 로 평탄화).
3. **chaos trial 100% lose + maxArrivals cap** — 1M trialLv 19/19 lose 의 `damping × heroAtk vs enemyHp/atk` 산수에서 hero(800k) 가 trial(1M = field × 2) 을 영구 패배. 제안: `trialLv = fieldLv * 2 → fieldLv * 1.5` (chaos realm 한정, 다른 realm 은 그대로). 이유: cycle 1 권고 "fieldLv*3.5 + percent reward" 는 적용 시 sea/volcano 도 같이 어려워지므로 realm-aware 가 더 안전. 추가로 `maxArrivals 500 → 1000` carry-over (Tier 3 unlock + 회춘 비트 측정 prerequisite).

## 차기 cycle 수치 제안표

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `MERCIFUL_PROC_RATE` (`EncounterEngine.ts:23`) | 0.10 | **0.05** | cycle 당 procs 46 → 23 으로 source-rate 평탄화. pious(2 source) / prudent(1 sparse) / moral(1 sparse) / heroic(1 sparse) 와 정합 |
| `JOBS.priest.requiredPersonality.min` (`data/jobs.ts:31`) | 3 | **5** | cycle 1 의 mage `min 3→6` 패턴 재적용. proc-rate 감소와 결합하면 priest share 0.44 → 0.25 목표 |
| `PERSONALITY_ENCOUNTERS` prudent source 추가 1종 | 1 (`treasure_cave`) | **2** (new landmark or sightseeing variant) | prudent dim source-rate 평탄화. monk(prudent≥5) / ranger(prudent≥6) 의 valley 활성 |
| `trialLv = fieldLv * N` (chaos 한정, `CycleControllerV2.ts:461`) | 2 (all realms) | **1.5 (chaos), 2 (others)** | 1M trial 100% lose → ~60% win 목표. realm-aware lookup |
| `MAX_ARRIVALS` sim default (`sim-cycle-v2.ts`) | 500 | **1000** | cycle 1 carry-over. Tier 3 milestone (age 50 = 693 actions) + 회춘 비트 측정 prerequisite. sim-config 변경이지 game 평탄화 아님 |
| `JOBS.priest`+prudent 추가 source 후 Tier 1 heroic 편향 재측정 | — | **observe only** | warrior 48% 가 priest 분배 후에도 유지면 cycle 3 candidate |

## 컨텐츠 소모 예상

- **Tier 2 7 job (paladin/mage/assassin/priest/ranger/monk + 1 hidden)** — cycle 2 에서 4 distinct unlocked. 이상적 분포는 cycle 당 평균 candidate share 1/6 = 0.166. priest 0.44 / paladin 0.30 / mage 0.14 / assassin 0.12 = 4-job 편향. 권장 수치 적용 시 sim 측정으로 priest 0.25, paladin 0.20, mage 0.15, assassin 0.15, ranger 0.10, monk 0.10 목표 (총합 0.95, fallback 0.05). 일주일 cohort (35 cycle) 에서 6 job 모두 ≥ 3회 unlock 정상.
- **Trial altar (5 tier: 2 / 100 / 1K / 10K / 100K / 1M)** — cycle 2 분포 51/41/40/48/55/19 = 254 trials/50 cycle = 5.1 trial/cycle 정상. 단 1M tier 보상 0 → chaos realm 의 narrative pacing 부재. `fieldLv*1.5` 적용 후 1M tier win rate ~60% 측정. 일주일 cohort 평균 35 × 5 = 175 trial 중 약 15 가 1M tier — 이 비율로 chaos boss 직전 보상 narrative 회복.
- **prudent source 추가 1종** — cycle 당 spawn 0.5-1 회 (`treasure_cave` 와 동일 freq). 50 cycle 누적 ~30 회 prudent positive proc → monk/ranger valley 가 cycle 당 평균 ~0.2 unlock 도달 (5 cycle 에 1 회). 일주일 cohort 35 cycle × 0.2 = ~7 monk/ranger unlock — saturation 없음.
- **Realm 6종 (base/sea/volcano/underworld/heaven/chaos)** — chaos 진입율 18% (9/50). `MAX_ARRIVALS 1000` 적용 시 hero age 50 도달 cycle 비율 ↑ → chaos 진입율 측정. 미달 시 chaos `fieldLevelRange` 또는 entry gate 재검토.

## 표류 경보

**없음.** Cycle 2 의 모든 제안 (proc-rate 감소, threshold 상향, source 추가, trial 난이도 realm-aware, sim arrivals raise) 은 모두 **inflation 곡선 유지**. 레벨 cap / 평탄화 / 일반 RPG 기준 적용 0건. 1M trial winnable 화는 hero level 800k 환경의 적정 damping 정합화이지 cap 도입 아님.

## 후속 cycle 권고 순서

1. **sim re-run with `maxArrivals=1000`** — cycle 1 carry-over. Tier 3 / 회춘 / chaos 진입율 실측. 본 cycle 수치 제안 검증의 prerequisite.
2. **B1 priest fix + prudent source 추가 + sim re-run** — Tier 2 단일 job share ≤ 0.30 목표 (cycle 1 의 absolute 0.35 가드를 Δ-from-baseline 0.44 → ≤ 0.30 으로 reframe).
3. **chaos trial realm-aware difficulty + sim re-run** — 1M trial winnable, chaos realm pacing 회복.
4. **Tier 1 heroic 편향 분석** — warrior 48% 의 source 측정. PersonalityState prior 또는 watchtower spawn 단독 원인 확인.
5. **V3-G 1만 시간 곡선 sweep** (별도 phase) — 위 1-4 fix 후 baseline 으로.
