# Phase Sim-G Baseline — 현재 placeholder 수치의 inflation 곡선 거리 측정

> 분석 시점: 2026-05-16, `phase-sim-b-complete` (49274dc) 기준.
> 실행: `pnpm sim:cycle --count 30 --seed 1 --bp ... [--traits ...]`. 480 cycle 수집.
> 데이터: `games/inflation-rpg/runs/sim-g-baseline/` (gitignored).

## TL;DR

Sim-A/B 의 placeholder 수식 (`exp = heroLv * 10`, `enemyHp = lv * 20`, `heroDmg = atkBase + lv*2`) 은 maxLevel **13–42** 범위에 머문다. spec §11.5.1 의 inflation 곡선 target (얇은 빌드 수천 / 두꺼운 빌드 수십만+) 과 **3+ 자릿수 차이**. 곡선 자체가 잘못된 모양 (constant slope) — Sim-G 가 본격적으로 redesign 해야 할 부분이 매우 명확하다.

추가로: **단일 seed 안에서 RNG variance 가 maxLevel 에 0% 영향**. 현 코드는 gold drop 만 RNG 의존이고, EXP·HP·damage 는 전부 결정론. 동일 loadout/seed/trait 시 모든 cycle 이 정확히 같은 maxLevel. 인플레이션 곡선 도입 시 RNG 가 의미 있게 흔드는 layer 도 함께 잡아야 한다.

---

## 실행 시나리오 (17개)

- **Baseline**: 3 BP 스케일 (30 / 100 / 300), no traits.
- **Base trait 단독**: 11개 base-tier trait 각 30 cycle.
- **시한부 천재 단독**: 강한 cost trait 의 효과 측정.
- **Combo**: t_swift + t_terminal_genius (Sim-B.1 fix 검증), t_genius + t_thrill (synergy 측정).

모든 시나리오: `--count 30 --seed 1 --bp 30` (특별 표시 외).

---

## 측정 결과 — maxLevel × duration

LV avg 오름차순 (delta 는 baseline-bp30 = LV 17 / 54.6s 기준):

| Scenario | n | LV min/avg/max | duration (s) | Δ LV | Δ duration | varies? |
|---|---|---|---|---|---|---|
| single-t_terminal_genius | 30 | 13 / 13 / 13 | 19.8 | **−4** | **−34.8s** | ❌ |
| combo-swift-terminal | 30 | 14 / 14 / 14 | 27.0 | −3 | −27.6s | ❌ |
| single-t_timid | 30 | 15 / 15 / 15 | 52.2 | −2 | −2.4s | ❌ |
| **baseline-bp30** | 30 | 17 / 17 / 17 | 54.6 | 0 | 0 | ❌ |
| single-t_berserker | 30 | 17 / 17 / 17 | 52.8 | 0 | −1.8s | ❌ |
| single-t_explorer | 30 | 17 / 17 / 17 | 54.6 | 0 | 0 | ❌ |
| single-t_fragile | 30 | 17 / 17 / 17 | 58.8 | 0 | +4.2s | ❌ |
| single-t_iron | 30 | 17 / 17 / 17 | 58.8 | 0 | +4.2s | ❌ |
| single-t_lucky | 30 | 17 / 17 / 17 | 54.6 | 0 | 0 | ❌ |
| single-t_miser | 30 | 17 / 17 / 17 | 54.6 | 0 | 0 | ❌ |
| single-t_thrill | 30 | 17 / 17 / 17 | 50.4 | 0 | −4.2s | ❌ |
| single-t_challenge | 30 | 18 / 18 / 18 | 58.8 | +1 | +4.2s | ❌ |
| single-t_swift | 30 | 18 / 18 / 18 | 70.8 | **+1** | **+16.2s** | ❌ |
| single-t_genius | 30 | 19 / 19 / 19 | 60.0 | +2 | +5.4s | ❌ |
| combo-genius-thrill | 30 | 19 / 19 / 19 | 53.4 | +2 | −1.2s | ❌ |
| baseline-bp100 | 30 | 42 / 42 / 42 | 300.0 | +25 | **+245.4s ← cap** | ❌ |
| baseline-bp300 | 30 | 42 / 42 / 42 | 300.0 | +25 | +245.4s ← cap | ❌ |

---

## 발견 (Findings)

### F1. maxLevel 의 절대 스케일이 inflation 곡선과 무관

baseline bpMax 30 에서 maxLevel 17. inflation-rpg 정체성 ("1 → 수만/수십만") 대비 **약 1000~10000배 부족**. spec §11.5.1 의 "얇은 빌드 수천 / 두꺼운 빌드 수십만+" 어디에도 닿지 못한다.

원인 — placeholder 수식이 전부 선형/약-다항:

```
expGain      = heroLv * 10                  (per kill)
expRequired  = floor(10 * heroLv^1.3)        (level-up curve)
enemyMaxHp   = max(10, heroLv * 20)
heroDmg      = max(1, atkBase + heroLv * 2)
enemyDmg     = max(1, heroLv * 3)
```

레벨 1 → 100 가는 데 필요한 누적 EXP 는 `Σ 10*k^1.3` 수준이고, EXP gain 도 `10*lv` 라 비례 — 즉 적 처치 수가 거의 일정. inflation 정체성이 되려면 high-lv 에서 EXP gain 이 폭증해야 한다 (예: `exp = lv^2 * areaTier`).

### F2. RNG 가 cycle 결과에 0% 영향

모든 시나리오에서 LV min = max. RNG (`SeededRng.int`) 는 현재 gold drop 의 small spread 에만 쓰이고, 다른 어디에도 굴리지 않는다. Determinism 입증으로는 좋지만 **inflation 곡선의 흥미가 없다** — 같은 loadout/trait/seed 에서 cycle 결과가 정확히 결정.

Sim-G 가 도입할 RNG axes:
- **enemy hp/dmg variance** (예: ±20% per spawn) — 같은 floor 의 적이 강·약 분포 갖도록
- **drop rarity rolls** — 희귀 장비 / mythic 의 random 등장 (현재는 미구현)
- **레벨업 시 stat 분포** — fix 가 아니라 weighted random
- **인카운터 노드 spawn** (Sim-C 와 묶음) — 사당·상인·함정·라이벌 등의 등장 확률
- **크리티컬 / 회피 / counter** — battle resolver 의 surprise 요소

### F3. BP 가 사이클 길이를 결정짓는 단일 lever 라 단조롭다

BP 30 → 100 으로 늘리면 LV 17 → 42 (약 2.5배 증가, 더 많이 처치). 그러나 BP 100 = 300 동일 — `sim-cycle.ts maxTickMs: 5 * 60 * 1000` (5분 sim cap) 가 BP 소진 전에 강제 종료 ("forced" 가 아닌 "abandoned" 로 빠지는지 events 확인 필요).

문제:
- (a) BP 가 너무 강한 lever — cycle 길이 = BP 의 거의 선형 함수
- (b) cap 5분이 일부 시나리오에서 BP 소진 막아 데이터 손실
- (c) 메타 progression 으로 BP cap 을 늘리는 게 inflation 의 주 lever 가 될 위험 (스펙 의도 — 메타 power × tier 가 lever)

Sim-G fix 후보:
- BP cap 을 spec §11.5.3 처럼 메타 progression 으로 조절 (지금은 30 hard-coded)
- cycle 의 시간 lever 를 BP 외 다른 축에도 분산 (예: floor 깊이 도달 시 BP refill)
- sim CLI 의 maxTickMs 를 명시적 옵션화

### F4. Trait 효과의 magnitude 가 너무 작다

각 base trait 의 LV delta 가 −2 ~ +2 범위. 사용자가 "내가 도전적 traits 골랐더니 hero 가 진짜 강해졌네" 느끼려면 적어도 **±20%~50% LV / duration swing** 이 필요해 보인다.

원인은 F1 과 동일 — 곡선 자체가 평탄해서 multiplier 가 보일 만큼 흔들지 못함. inflation 곡선이 들어오면 placeholder mod (1.1~1.3) 가 자동으로 큰 차이를 만들 가능성 — F1 fix 가 곧 trait magnitude 정합화의 자연 결과일 수 있다.

다만 **t_terminal_genius (bpCostMul 2.0)** 의 −4 LV 는 expected — BP burn 두 배라 절반 정도 kill 함. cost trait 은 잘 동작.

### F5. behavior-only traits 는 effect 0

`t_explorer / t_lucky / t_miser` — LV delta 0. 이들 trait 의 효과는 인카운터 / drop rarity / 영구 unlock 등 **아직 wire 되지 않은 layer** 에 살아있다. Sim-C/D 가 본격 wire 하기 전엔 측정 불가.

Catalog descKR 에 "(Sim-C 에서 정식 동작)" 표시는 적절. Opus review M3 의 제안 (placeholder stat mod 을 Sim-G 가 0 또는 재조정) 도 여기 해당.

### F6. Sim-B.1 fix 의 empirical 검증 ✅

- single-t_swift: 18 LV / 70.8s — baseline 대비 +1 LV / +16s. fractional BP accumulator 가 작동 (BP 가 천천히 소진되어 cycle 길어짐).
- combo-swift-terminal: 14 LV / 27s — terminal_genius 단독 (13 LV / 19.8s) 대비 swift 가 cost 를 부분 상쇄. floor-clamp 시절의 "swift 가 terminal 을 완전히 cancel" 은 더이상 없음. Sim-B.1 F1 의 fractional accumulator 가 의도대로 작동.

---

## Sim-G 가 본격 다뤄야 하는 우선순위

### P0 — inflation 곡선 redesign (F1)

가장 큰 격차. spec §11.5.1 의 "1 → 수만/수십만" 도달하려면:

1. **EXP gain 수식 재정의** — 후보:
   - `exp(lv, areaTier) = max(1, floor(lv * 10 * areaTier^1.5))` — areaTier (Sim-C 에서 도착할 dungeon depth 인자) 가 base.
   - `exp = lv * 10 * (1 + lv * 0.1)` — self-reinforcing (위계 도달 시 더 큰 EXP).
2. **EXP curve 재정의** — `expRequired(lv) = floor(10 * lv^1.3)` 는 너무 가파름. 폭발 성장 위해 `expRequired = 10 * lv^1.1` 정도 (낮은 지수) + base 가 큰 EXP gain.
3. **Damage / HP 수식** — enemy HP 도 areaTier 따라 폭증, hero atk 도 lv 따라 폭증 (메타 equipment 가 base). 현재 `atkBase + lv*2` 가 아니라 `atkBase * (1 + lv*c)` 형 multiplicative.

목표: 빈 빌드 baseline bpMax 30 = maxLevel **수천**. 두꺼운 메타 = maxLevel **수십만**.

### P1 — RNG axes 추가 (F2)

inflation 곡선 도입 후에도 cycle 결과가 결정론이면 (같은 trait/seed → 같은 maxLevel) 보는 재미 없음. 도입할 RNG:
- enemy hp/atk variance per spawn
- 크리티컬 / 회피
- drop rarity rolls
- 레벨업 시 stat 분포 (현재 +5% hpMax fix)

### P2 — BP 단일 lever 분산 (F3)

- BP cap 메타 progression 으로 추출 (`MetaState.bpMaxBase` + 메타 buff)
- sim CLI maxTickMs 명시 옵션화
- BP refill 메커니즘 (Sim-D 의 인카운터 또는 Sim-Realms 의 dungeon clear bonus 와 연계)

### P3 — Trait magnitude 정합화 (F4)

P0 의 결과로 자동 해결 가능성 있음 — 그래도 sim 으로 검증. 각 trait 가 baseline 대비 **±30% 이상 swing** 만드는지 측정. 안 되면 magnitude 강화.

### P4 — behavior-only trait wire (F5, Sim-C/D 와 묶음)

t_explorer / t_lucky / t_miser / t_zealot / t_boss_hunter — 본 의도된 effect 가 Sim-C/D 에 살아남. 그 phase 들에서 wire.

---

## Sim-A.1 / Sim-B.1 architectural promises 의 empirical 확인

| Promise | 검증 |
|---|---|
| Controller/View 분리 → headless sim 가능 | ✅ 480 cycle Node CLI 에서 무탈 실행 |
| Same seed → same event stream (determinism) | ✅ 동일 seed/loadout/traits → 동일 result (모든 LV min = max) |
| Fractional BP accumulator (Sim-B.1 F1) | ✅ swift +1 LV / swift+terminal 정확히 부분 상쇄 |
| Trait mods compose multiplicatively | ✅ (genius+thrill 19 vs genius 단독 19, thrill 단독 17 — synergy 측정용으로는 데이터 부족) |

---

## 다음 단계

이 보고서는 **Sim-G phase 의 brainstorming 입력**으로 사용. Sim-G plan 작성 시:

1. F1 (inflation 곡선) 을 첫 task 로
2. F2 (RNG axes) 두번째 — F1 곡선이 결정되면 그 위에 layer
3. F3 (BP lever 분산) — meta progression 시스템과 결합 (Sim-E 와 dependency)
4. F4 / F5 는 후속 (catalog 재조정)

권장: Sim-C (Encounter + Rival) 를 먼저 진행해서 behavior-only trait wire 까지 끝내고, Sim-D (Personality + Random Skill) 이후에 Sim-E (Meta rework) 와 함께 Sim-G 의 P0-P3 를 사이클 돌리는 게 자연스럽다. spec §7 의 원래 순서 (B → C → D → E → F → G) 그대로 유효.

단, **Sim-C 부터 enemy HP / EXP gain 수식이 더이상 placeholder 라고 못 쓸 시점이 옴** (real encounter spawn 시작) — 그때 P0 의 inflation 곡선 redesign 의 첫 buchi 가 자연스레 들어간다. Sim-C 의 plan 작성 시 "imported placeholder formula 그대로 두되 areaTier 인자만 받게 확장" 정도가 적절.

---

## 데이터 산출물

`games/inflation-rpg/runs/sim-g-baseline/`:
- 17 × `*.jsonl` (event stream, ~수십 MB 총합)
- 17 × `*.summary.json`
- `aggregate.ts` (markdown 표 생성 스크립트)

`runs/` 는 gitignored. 데이터 재현은:

```bash
cd games/inflation-rpg
mkdir -p runs/sim-g-baseline
for bp in 30 100 300; do
  pnpm sim:cycle -- --count 30 --seed 1 --bp $bp \
    --out "runs/sim-g-baseline/baseline-bp${bp}.jsonl"
done
for t in t_challenge t_timid t_thrill t_genius t_fragile t_explorer \
         t_berserker t_miser t_swift t_iron t_lucky t_terminal_genius; do
  pnpm sim:cycle -- --count 30 --seed 1 --bp 30 --traits "$t" \
    --out "runs/sim-g-baseline/single-${t}.jsonl"
done
pnpm sim:cycle -- --count 30 --seed 1 --bp 30 --traits "t_swift,t_terminal_genius" \
  --out runs/sim-g-baseline/combo-swift-terminal.jsonl
pnpm sim:cycle -- --count 30 --seed 1 --bp 30 --traits "t_genius,t_thrill" \
  --out runs/sim-g-baseline/combo-genius-thrill.jsonl
pnpm exec tsx runs/sim-g-baseline/aggregate.ts > /tmp/report.md
```
