# Sim-G v1a Inflation Curve Tuning — Report

**Date:** 2026-05-21
**Branch:** `feat/hero-simulator-v2-pivot`
**Target engine:** `CycleControllerV2` (V1a actual game flow, not Sim-A/B legacy)

## 0. Why this exists

V1a 의 cycle 이 "1 → 수만/수십만" inflation identity 를 깬다. 사용자가 dev shell
로 직접 관찰해서 "BP 끝까지 태워도 레벨 2" 라는 피드백을 줬다. 첫 측정 결과
도 그 진단을 뒷받침했다. 이 문서는 baseline → success bar → curve redesign →
tuning round → final params 의 전체 절차를 기록한다.

## 1. Baseline (V1a as merged at `571ec0c`)

**Command:**
```bash
pnpm --filter @forge/game-inflation-rpg exec npx tsx scripts/sim-cycle-v2.ts \
  --count 100 --seed 1 --bp 30 --hp 100 --atk 50 \
  --out runs/2026-05-21-baseline.jsonl
```

**Summary (100 cycles):**

| Metric        | min | p50 | p90 | max | avg  |
|---------------|----:|----:|----:|----:|-----:|
| maxLevel      |   2 |   6 |   6 |   6 | 5.12 |
| arrivals      |   2 |  13 |  16 |  18 | 11.7 |
| kills (total) |   1 |  11 |  13 |  14 | 9.74 |
| bpRemaining   |  16 |  18 |  27 |  28 |20.02 |

**endCauses:** `{ "전사": 100 }` (combat death). **100/100 cycles never reach
BP exhaustion** — hero is killed by enemies before BP runs out.

**Root cause diagnosis (from code reading):**

- `HeroEntity.gainExp` 가 `hpMax` 만 5% growth 시키고 **`atk` 는 영구히
  `heroAtkBase=50` 으로 고정.**
- `EncounterEngine` 의 enemy stats:
  - `enemy.hp(lv) = 30 · (1 + 0.4·lv)` — 선형
  - `enemy.atk(lv) = 8 · (1 + 0.3·lv)` — 선형
- 결과: lv 5-7 부터 hero.atk(50) 로 enemy.hp 를 한 번에 못 잡음 → enemy
  retaliation 누적 → hero 사망.
- `expGain(lv) = 12 · (1 + 0.2·lv)` 와 `expReq(lv) = 10 · lv^1.3` 도 폭발
  성장을 일으키지 않는 선형/저차 power.

**3 자릿수 부족** (target P50 ≥ 1,000 vs 측정 P50 = 6).

## 2. Success bar (locked)

Sim-G 의 stopping criteria. 모두 만족하면 종료.

1. **maxLevel P50 ≥ 1,000** — inflation identity ("1 → 수만/수십만" 의
   conservative 첫 step. P90 가 1만 단위 도달하면 bonus).
2. **endCauses 의 자연사 (BP 소진) 비율 ≥ 80%** — "용사의 일대기" 가
   환경 압박이 아니라 자연 수명으로 마감되어야 한다.
3. **arrivals P50 ∈ [80, 150]** — cycle 호흡 (현재 ~13 → 6-10x 확장).
4. **Determinism preserved** — 같은 seed → 같은 결과 (smoke test 통과).
5. **`pnpm test` 와 `pnpm typecheck` 통과** — 회귀 0.

Hard time-box: 3 tuning round 내 미수렴 시 curve family 재고.

## 3. Curve redesign (parametric exponents)

| Variable             | Old formula                       | New formula                              | New exponent |
|----------------------|-----------------------------------|------------------------------------------|--------------|
| `hero.atk(lv)`       | `atkBase` (constant)              | `atkBase · lv^k_atk`                     | `k_atk`      |
| `hero.hpMax(lv)`     | `hpBase · 1.05^(lv-1)` (5% step)  | `hpBase · lv^k_hp`                       | `k_hp`       |
| `enemy.hp(lv)`       | `30 · (1 + 0.4·lv)`               | `30 · lv^k_eHp`                          | `k_eHp`      |
| `enemy.atk(lv)`      | `8 · (1 + 0.3·lv)`                | `8 · lv^k_eAtk`                          | `k_eAtk`     |
| `expGain(lv)`        | `12 · (1 + 0.2·lv)` (enemy)       | `12 · lv^k_gain` (enemy)                 | `k_gain`     |
| `expReq(lv)`         | `10 · lv^1.3`                     | `10 · lv^k_req`                          | `k_req`      |

Boss multipliers 그대로: `BOSS_HP_MUL=4`, `BOSS_ATK_MUL=2`. EXP boss = 60 base.

**Round 1 candidate exponents** (보수적 start):

| Exponent | Value | Rationale                                                                |
|----------|------:|--------------------------------------------------------------------------|
| `k_atk`  |  1.0  | 선형 hero atk 성장 — enemy hp 선형과 매칭 → kill count 안정                  |
| `k_eHp`  |  1.0  | enemy hp 도 선형 → atk 와 매칭. 1-hit kill 유지 (no retaliation)               |
| `k_eAtk` |  0.8  | enemy atk 가 hero hp 보다 살짝 천천히 — boss 외엔 안 죽음                      |
| `k_hp`   |  0.7  | hero hp 성장 — boss retaliation 견딜 정도                                    |
| `k_gain` |  1.5  | exp gain 폭발 성장                                                          |
| `k_req`  |  1.2  | exp req 도 폭발 성장하되 gain 보다 느림 (gap = 0.3) → 1 kill 당 level 가속 |

**예상 동작 분석:**

- Lv 100: hero.atk=5,000 / enemy.hp=3,000 (1-hit) / enemy.atk=8·39.8≈318 /
  hero.hp=100·25=2,500. Boss 2-hit kill, retaliation 1,275 → 견딤.
- Lv 1,000: hero.atk=50,000 / enemy.hp=30,000 (1-hit) / boss.hp=120,000
  (2-3 hit). Boss.atk=2·8·251≈4,000 / hero.hp=100·125=12,500. Boss 2
  retaliation = 8K → 견딤.
- ratio of `gain/req` at Lv N = `12/10 · lv^(0.3) = 1.2·lv^0.3`. Lv 10 → 2.4x.
  Lv 100 → 4.8x. Lv 1000 → 9.5x. Per-kill level gain 가속.

## 4. Tuning rounds

### Round 1 — base curve only (bpMax = 30)

Exponents per §3 table. `--count 100 --seed 1 --bp 30 --hp 100 --atk 50`.

| Metric | p50 | p90 | min | max | avg |
|--------|----:|----:|----:|----:|----:|
| maxLevel | **97** | 106 | 86 | 116 | 97.34 |
| arrivals | **29** | 32 | 25 | 34 | 29.41 |
| bpRemaining | 0 | 0 | 0 | 0 | 0 |

`endCauses: { "자연사": 100 }` — ✅ bar #2 (BP exhaustion ≥ 80%) 통과.
`maxLevel` 은 baseline 6 대비 16x 개선이나 bar #1 (≥ 1,000) 까지 10x 부족.
`arrivals` 도 bar #3 (80-150) 까지 3x 부족 — `bpMax=30` ceiling 이 limiting.

**진단:** curve 자체는 baseline 대비 폭발 성장을 만들지만, BP 가 cycle
arrivals 를 30 으로 고정해 maxLevel 가 ~100 에서 멈춤. `bpMax` 도 lifespan
의 부분이므로 같이 올려야 진짜 "1 → 수만" 곡선이 그려진다.

### Round 2 — bpMax 30→100 + k_gain 1.5→1.8

| Variable | R1 | R2 |
|----------|----|----|
| `bpMax`  | 30 | **100** |
| `k_gain` | 1.5 | **1.8** |

`--count 100 --seed 1 --bp 100 --hp 100 --atk 50`.

| Metric | p50 | p90 | min | max | avg |
|--------|----:|----:|----:|----:|----:|
| maxLevel | **14,315** | 14,919 | 13,526 | 15,274 | 14,278.57 |
| arrivals | **98** | 103 | 96 | 104 | 98.89 |
| bpRemaining | 0 | 0 | 0 | 0 | 0 |

`endCauses: { "자연사": 100 }`. **모든 success bar 통과:**

| Bar | Target | R2 결과 | 통과 |
|-----|--------|---------|------|
| #1 maxLevel P50 | ≥ 1,000 | 14,315 | ✅ |
| #2 자연사 비율 | ≥ 80% | 100% | ✅ |
| #3 arrivals P50 | 80-150 | 98 | ✅ |
| #4 Determinism | preserved | smoke test ✅ | ✅ |
| #5 typecheck/test | 회귀 0 | 814 vitest passed | ✅ |

`maxLevel` 분포는 좁다 (min/max 11% range). RNG variance 가 가벼운 영향만
주는 구조 — encounter outcome 의 dispersion 은 Sim-C/D 의 RNG axes (crit,
enemy variance, rarity) 가 다룬다.

## 5. Final params

`src/cycle/inflationCurve.ts`:

```ts
export const CURVE = {
  k_atk:   1.0, // hero.atk = atkBase * lv^k_atk
  k_hp:    0.7, // hero.hpMax = hpBase * lv^k_hp
  k_eHp:   1.0, // enemy.hp = baseHp * lv^k_eHp
  k_eAtk:  0.8, // enemy.atk = baseAtk * lv^k_eAtk
  k_gain:  1.8, // expGain = baseGain * lv^k_gain
  k_req:   1.2, // expReq = baseReq * lv^k_req
} as const;
```

게임 측 default:
- `CyclePrepV2.tsx` — `bpMax = 100`, `heroHpMax = 100`, `heroAtkBase = 50` (`bpMax` 30→100 변경).

## 6. 알려진 한계 / 후속 작업

- **장비 dead-stat:** `HeroEntity.addEquipment` 가 `equipment[]` 에 push 만
  하고 `atk`/`hpMax` 에 적용 안 됨. V1b 의 직업/스킬 plan 과 함께 wire 한다.
- **AI variance 제로:** 모든 cycle 이 동일 chooseDestination weight 를 쓰
  므로 maxLevel 분포가 narrow. Sim-C (encounter) + Sim-D (personality 가
  AI 결정에 영향) 에서 확장.
- **P50 14K vs user vision "10만~20만":** 사용자 narrative target 은 "수만
  ~수십만". 현재 R2 가 "수만" 의 첫 자릿수 (~14K). 한 자릿수 더 끌어올리
  려면 (k_gain → 2.0) 또는 V1b 의 equipment stat / job multiplier / skill
  passive 가 합쳐져서 자연스럽게 20만~50만 도달 가능. 지금 단계에서 over-
  engineer 하지 않고, equipment / job 의 multiplicative effect 를 V1b 에서
  쌓는다.

## 7. Reproduction

```bash
pnpm --filter @forge/game-inflation-rpg exec npx tsx scripts/sim-cycle-v2.ts \
  --count 1000 --seed 1 --bp 100 --hp 100 --atk 50 \
  --out runs/2026-05-21-sim-g-final.jsonl
```

`runs/` 는 gitignored. Commit 되는 것: 이 report, `scripts/sim-cycle-v2.ts`,
수정된 `HeroEntity.ts` / `EncounterEngine.ts`, 신규 `inflationCurve.ts` /
`mapLayout.ts`, 업데이트된 `CyclePrepV2.tsx` (bpMax 100), cycle-driver
regression guard test.
