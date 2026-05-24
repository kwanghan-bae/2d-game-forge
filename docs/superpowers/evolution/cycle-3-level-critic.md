# Cycle 3 비평 (Level Designer)

평가 대상: main HEAD `ced7631` (Cycle 2 partial 머지 후 — F1 만 land, B1/B2/B3 carry-over 상태)
시드 sim (multi-seed aggregate, 150 cycles 총):
- seed 1024: `/tmp/cycle-1-f1-sim-final/` — F1 적용 후 첫 sim
- seed 2048: `/tmp/cycle-2-sim/` — 50 cycle (seed 2048–2097)
- seed 4096: `/tmp/cycle-3-sim-s4096/` — 50 cycle (seed 4096–4145)
- 모두 동일 코드 (HEAD `ced7631`), `maxArrivals=500`

페르소나: `docs/personas/06-level-designer.md`
직전 baseline: cycle 2 (seed 2048 단일) — `docs/superpowers/evolution/cycle-2-level-critic.md`
Cycle 0 reference: pre-F1 seed 1024 (`/tmp/cycle-1-sim/`) — `mage 0.46` dominant + `skillsLearned p50 = 21`

## Cycle 3 의 성격 — measurement-only

Cycle 2 의 result.md 가 명시: **F1 만 partial-merged**, B1 (priest fix) / B2 (prudent source) / B3 (chaos trial) 는 carry-over. Cycle 3 는 신규 param land 없는 **multi-seed 검증 cycle**. 본 critic 의 역할은 (1) F1 견고성 N=150 재확인, (2) cycle 2 backlog 가 N=150 에서도 유효한지 확정, (3) single-seed 1024 의 0.40 priest share 가 outlier 였음을 공식화.

## 곡선 health (sim N=150, 3-seed aggregate, Δ-from-Cycle-0)

| 지표 | Cycle 0 baseline (pre-F1, seed 1024) | Cycle 3 multi-seed (N=150) | Δ-from-Cycle-0 | 판정 |
|---|---|---|---|---|
| maxLevel p50 avg | 829,189 | **825,021** | **-0.5%** (seed variance 내부) | **OK** (inflation 정체성 유지) |
| maxLevel p50 per-seed | 829,189 | 828,794 / 816,565 / 828,603 | spread ±1.5% | **OK** (3-seed variance 합리적) |
| skillsLearned p50 / p90 | 21 / 21 | **9 / 11** | **-12** | **OK** (F1 의 가장 큰 win, N=150 견고) |
| skillsLearned avg | 21.0 | 9.02 (=8.92+8.88+9.26)/3 | -12.0 | **OK** |
| moralChoices p50 avg | 56 | **54.7** ((56+55+54)/3) | -1.3 | **OK** |
| Tier 2 maxShare | mage 0.460 (23/50) | **priest 0.4533** (68/150) | **-0.007** | **transfer, not fix** (아래 봉인 #1) |
| Tier 2 jobsUnlocked distinct | 5 (mage 23, paladin 11, priest 13, assassin 2, ranger 1) | **6** (priest 68, paladin 36, mage 28, assassin 17, ranger 1, monk 0) | +1 (monk 0 → 0, ranger 1 → 1, mage→priest 흡수) | **부분 OK** (mage min 3→6 의 mage cap 효과 ✓ — 다만 valley 가 priest 로) |
| monk + ranger 합 | 1/50 = 2.0% | **1/150 = 0.67%** | **-1.33pp** (희박화) | **악화 (B2 carry-over)** |
| hero_died rate | 1/50 = 2.0% | **1/150 = 0.7%** | -1.3pp | **sim-artifact** (MAX_ARRIVALS=500 cap, 회춘 0/150 동일 원인) |
| endCauses.max_arrivals | 49/50 = 98% | **149/150 = 99.3%** | +1.3pp | **sim-artifact 강화** (회춘 비트 측정 불가 carry-over) |
| 회춘 이벤트 발생 | 측정 안 됨 | **0/150** | — | **dead path 확정** (age 50+ 도달 cycle 0 — V3 design 비트 미발화) |

### sim-artifact 분리 박스 (cycle 2 와 동일 carry-over)

- 150/150 cycle 의 99.3% 가 `max_arrivals` 로 종료 → peak age ~37 까지만 도달 → V3 design 의 회춘 (age 50+) / Tier 3 unlock (age 50 milestone) 모두 측정 불가.
- 단일 hero death (1/150) 은 seed 1024 의 cycle 1 회 발생. 페르소나 정상 범위 (5-20%) 와 큰 거리 — 이는 회춘 사이클 미발화로 인한 측정 봉인이지 사망률 자체가 너무 낮다는 의미 아님 (long-run sim 필요).
- `MAX_ARRIVALS 500 → 1000` 은 cycle 1 → 2 → 3 세 cycle 연속 carry-over. cycle 3 가 본 봉인의 **3 의 규칙 dominant** 확정 (sim 측정 인프라 부채).

## 봉인 / outlier

- **Saturator transfer (mage → priest)** — N=150 확정. Cycle 0 의 mage 0.460 / Cycle 3 의 priest 0.4533 — 차이 -0.007. **F1 의 `mage.min 3 → 6` 은 mage 가 Tier 2 dominant 슬롯을 비우게 만들었지만, priest 가 그 valley 를 거의 그대로 흡수**. 봉인의 **구조적 원인은 job 이 아니라 (threshold-low + high-frequency source) 결합**: `priest.requiredPersonality.min = 3` (낮음) × `MERCIFUL_PROC_RATE = 0.10` × 모든 non-boss 처치 (cycle 당 ~460) 마다 fire = ~46 procs/cycle. abs(merciful) ≥ 3 을 cycle 거의 매번 달성. 위치: `data/jobs.ts:31` + `EncounterEngine.ts:23,77`. **single-seed 1024 의 0.40 priest share 는 outlier 였고 진실은 0.4533** (cycle 2 critic 의 "악화 +0.04" 평가는 N=50 의 seed noise — 실제로는 변화 거의 없음).
- **prudent dim 의 source-rate famine 심화** — monk(prudent≥5) + ranger(prudent≥6) 합 1/150 = 0.67%. cycle 0 (1/50 = 2%) 보다 **희박화**. ranger 1/150 (seed 1024) 단 1 cycle 만 unlock, monk 0/150 완전 봉인. 근거: prudent dim 의 source 가 `treasure_cave` landmark **단일** (cycle 당 1-2 spawn), 반면 priest 의 merciful source 는 모든 처치 (~460/cycle). source 비율 ~1:230. 결국 prudent ≥5 도달이 산수적으로 거의 불가능. `data/personalityEncounters.ts` 의 prudent positive source 평탄화 필요 (cycle 2 B2 carry-over 의 N=150 재확인).
- **trial 1M tier 측정 불가 (chaos realm 미도달)** — cycle 2 에서 9/50 = 18% chaos 진입했으나 cycle 3 의 추가 seed 2/4096 의 chaos 진입율은 jsonl spot-check 필요. 본 cycle 의 핵심 발견은 chaos 자체 도달 빈도 부족 → `MAX_ARRIVALS=500` 봉인이 1M trial 측정 prerequisite. cycle 2 의 "1M tier 100% lose (0/19)" 는 그대로 carry-over 하지만 cycle 3 sim 으로 추가 evidence 못 더함.

## 약점 TOP 3 (밸런스)

1. **B1 mage → priest saturator transfer (N=150 확정)** — F1 의 mage cap 은 효과가 있었으나 saturator 가 priest 로 이동했을 뿐 Tier 2 concentration (~0.45) 은 그대로. **구조적 fix 필요**: source-rate 와 threshold 가 둘 다 priest 에게 너무 유리. Cycle 2 의 처방 (`MERCIFUL_PROC_RATE 0.10 → 0.05` + `priest.min 3 → 5`) 을 N=150 confidence 로 재제안. 목표: priest share 0.4533 → ≤ 0.30 (cycle 2 의 목표와 동일). 위치: `EncounterEngine.ts:23` + `data/jobs.ts:31`.
2. **B2 prudent dim source famine (N=150 에서 ranger 1 / monk 0)** — cycle 2 의 "0/50 monk, 1/50 ranger" 가 N=150 으로 ranger 1/150, monk 0/150 으로 **희박화 확정**. cycle 2 B2 처방 (prudent source 추가 1종) 을 N=150 confidence 로 재제안. 일주일 cohort (35 cycle) 에서 ranger+monk 합 ≥ 5 회 unlock 목표. magnitude 변경 없음 — source 1 → 2, delta:3 (treasure_cave 와 동일).
3. **MAX_ARRIVALS=500 sim-config 봉인 (3 cycle 연속 carry-over → dominant)** — cycle 1/2/3 모두 99% 이상 max_arrivals 로 종료, 회춘 0/150 / Tier 3 0/150 / chaos 진입율 부분 측정. 이는 **balance 봉인이 아니라 측정 인프라 봉인**이지만, 본 cycle 3 multi-seed 가 (1) eternal hero 회춘 dead path, (2) Tier 3 saturation 미측정, (3) chaos trial 보상 narrative 부재를 모두 **한 sim-config flag** 에 막혀 있음을 확정. cycle 4 의 **prerequisite**. 위치: `sim/sim-cycle-v2.ts` (or wherever `maxArrivals` default).

## 차기 cycle 수치 제안표

수치 자체는 cycle 2 권고와 동일 magnitude (N=150 으로 confidence 강화). **새로운 magnitude 제안 없음 — cycle 3 는 measurement-only**.

| param | 위치 | 현재 | 제안 | Δ-from-baseline (Cycle 0) | 이유 |
|---|---|---|---|---|---|
| `MERCIFUL_PROC_RATE` | `EncounterEngine.ts:23` | 0.10 | **0.05** | cycle 0 0.15 → cycle 1 F1 0.10 → cycle 4 제안 0.05 | cycle 당 procs 46 → 23. priest 의 fire-on-kill source-rate 를 prudent(1 sparse)·moral(1 sparse)·heroic(1 sparse) 와 정합. N=150 confidence |
| `JOBS.priest.requiredPersonality.min` | `data/jobs.ts:31` | 3 | **5** | cycle 0 3 → cycle 4 제안 5 | F1 의 `mage.min 3→6` 패턴 재적용. proc-rate 감소와 결합하면 priest share 0.4533 → ≤ 0.30 목표 |
| `PERSONALITY_ENCOUNTERS` prudent source | `data/personalityEncounters.ts` | 1 (`treasure_cave`) | **2** (신규 landmark 또는 sightseeing variant) | cycle 0 1 → cycle 4 제안 2 | source-rate 평탄화. monk + ranger 합 0.67% → ≥ 5% (35 cycle cohort 5 회) 목표. delta:3 (treasure_cave 동일) |
| `trialLv = fieldLv * N` (chaos 한정) | `CycleControllerV2.ts:461` | 2 (all realms) | **1.5 (chaos), 2 (others)** | — | cycle 2 carry-over. 단 본 cycle 의 측정 데이터 부족 (MAX_ARRIVALS 봉인 해소 후 재확인) |
| `MAX_ARRIVALS` sim default | `sim/sim-cycle-v2.ts` | 500 | **1000** | — | **3 cycle 연속 carry-over → 본 cycle 의 highest-leverage 권고**. 회춘 / Tier 3 / chaos / death-rate 4 봉인 동시 해소 prerequisite |

### 단일 신규 magnitude (cycle 3 발견)

| param | 위치 | 현재 | 제안 | 이유 |
|---|---|---|---|---|
| sim 멀티 시드 N | `sim/sim-cycle-v2.ts` runner 또는 wrapper | N=50 single | **N=150 3-seed default** | cycle 3 가 N=50 의 seed noise 가 0.04 단위로 편차 (single-seed 1024 의 0.40 priest 가 N=150 의 0.4533 진실과 차이) 를 만든다는 점을 입증. acceptance 기준 멀티시드 의무화 |

## 컨텐츠 소모 예상

- **Tier 2 6 job (paladin/mage/assassin/priest/ranger/monk)** — N=150 에서 priest 68 (45%) / paladin 36 (24%) / mage 28 (19%) / assassin 17 (11%) / ranger 1 (0.7%) / monk 0 (0%). 이상 분포는 1/6 = 16.7% × 6. 5 job 가 일주일 cohort (35 cycle) 의 normal range 안에 들고 monk + ranger 두 job 이 dead content. B1+B2 fix 후 sim 재측정 목표: priest 0.30 / paladin 0.20 / mage 0.18 / assassin 0.15 / ranger 0.10 / monk 0.07 (총합 1.0).
- **Skill catalog 21 종** — F1 적용으로 cycle 당 9 학습 (cycle 0 21 = saturation 의 정반대). 21 skill 중 평균 9 학습 = 적정 차별화 회복. 21 skill 모두 N=150 에서 적어도 10 회 학습됨 (`palm_strike` 최저 10) — dead skill 0. **F1 결과는 게임 #2 까지 carry 가능한 robust 패턴** ("3 의 규칙" 의 반대 — 3 cycle 연속 작동 = promote candidate).
- **회춘 + Tier 3 컨텐츠** — V3 design 의 핵심 콘텐츠가 N=150 에서 0/150 발화. **컨텐츠 소모 측정 자체 불가**. MAX_ARRIVALS=1000 적용 후 1주일 cohort (35 cycle) 의 평균 회춘 횟수 / Tier 3 unlock 횟수 측정이 cycle 4 의 highest-priority deliverable.

## 표류 경보

**없음.** Cycle 3 의 모든 제안 (proc-rate 감소, threshold 상향, source 평탄화, sim N 증가, MAX_ARRIVALS 증가) 은 모두 **inflation 곡선 유지**. 레벨 cap / 평탄화 / 일반 RPG 기준 적용 0 건. 1M trial winnable 화는 hero level 800k 환경의 적정 damping 정합이지 cap 도입 아님. priest threshold 5 와 prudent source 2 는 source-rate 와 threshold 간의 산술 정합화이지 캐릭터 약화 아님.

## 후속 cycle 권고 순서

1. **MAX_ARRIVALS 500 → 1000 sim re-run** (highest leverage — 3 cycle carry-over) — Tier 3 unlock 빈도, 회춘 발생 빈도, chaos 진입율, hero_died rate 4 개 봉인 한 번에 측정.
2. **B1 priest fix + B2 prudent source 추가 + sim re-run (multi-seed N=150)** — Tier 2 share 분포 측정. priest ≤ 0.30 + monk/ranger 합 ≥ 5% 검증.
3. **B3 chaos trial realm-aware difficulty** — 단 (1) 적용 후 chaos 진입율 충분 확인 후. 1M trial winnable 화, chaos realm narrative pacing 회복.
4. **N=150 multi-seed 를 사im runner default 로 영구화** — F1 의 multi-seed 룰 (`df8b3a0`) 의 코드 측 enforcement. cycle 4 부터는 single-seed sim 결과를 acceptance 에서 reject.
5. **Tier 1 heroic 편향 분석 carry-over** — warrior 48% 가 priest+prudent fix 후에도 유지면 cycle 5 candidate. cycle 3 에서는 측정만 (PersonalityState prior + watchtower 단독 source).

## Cycle 3 핵심 결론

- **F1 (skill saturation 해소) 는 N=150 견고** — 21 → 9 학습수 변화가 3 seed 모두 일관 (p50=9 균일). game #2 carry candidate.
- **mage → priest saturator transfer 가 N=150 으로 구조적 결함 확정** — F1 식 단일 job nerf 가 아니라 (source-rate + threshold) 두 cell 동시 조정 필요.
- **MAX_ARRIVALS=500 가 본 cycle 의 highest-leverage 봉인** — balance debt 가 아니라 measurement infra debt. 4 개 sub-symptom (회춘 / Tier 3 / chaos / death) 의 단일 root cause.
- **single-seed 1024 의 priest 0.40 outlier 는 multi-seed 에서 0.4533 으로 정정** — F1 의 multi-seed 룰 (`df8b3a0`) 의 첫 실효성 입증. cycle 1 의 priest 0.40 share 보고가 N=50 seed noise 였음 공식화.
