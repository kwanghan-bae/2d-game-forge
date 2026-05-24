# Cycle 3 비평 (Game Critic)

대상: main HEAD `ced7631` (cycle 2 partial 머지 `be1b8f7` = docs-only 직후, 코드는 post-F1/cycle-1 머지 `bd3ff10` 와 bit-identical — **세 cycle 연속 코드 0 변경**).
입력: **3-seed aggregate** = `/tmp/cycle-1-post-sim/summary.json` (seed 1024, 50 cycle) + `/tmp/cycle-2-sim/summary.json` (seed 2048, 50 cycle) + `/tmp/cycle-3-sim-s4096/summary.json` (seed 4096, 50 cycle). narrative 샘플: `c4096.md` + `c4121.md` (각 ~1200 줄). 참조: `EncounterEngine.ts`, `CycleControllerV2.ts`, `cycle-2-critic.md`, `cycle-2-backlog.md`.

**평가 컨텍스트 (필독)**: Cycle 3 의 본질은 **"코드 0 변경 + multi-seed 룰 첫 적용"**. cycle 1 의 F1.13 가드는 seed 1024 단일 측정값 (priest 0.40) 위에 reframe 됐고, cycle 2 가 seed 2048 에서 0.44 로 +0.04 후퇴를 발견했고, cycle 3 가 seed 4096 (0.52) 를 더해 3-seed 진실값 0.453 을 확정한다. **이 단일 사실이 cycle 3 의 가장 큰 finding** — single-seed 50-cycle aggregate 가 yellow flag threshold 폭과 같은 자릿수 noise 를 갖는다는 cycle 2 의 의심이 정량 확정됐다. 아래 점수는 (1) post-F1 정체성 충족도 + (2) 3-seed 진실 위에서 본 F1 win 의 실제 폭 의 두 축으로 매긴다.

## 3-seed aggregate (진실의 숫자)

| 지표 | seed 1024 | seed 2048 | seed 4096 | **3-seed avg** | baseline (cycle 0) | **Δ** |
|---|---|---|---|---|---|---|
| maxLevel p50 | 829,894 | 816,565 | 828,603 | **825,021** | 829,000 | -0.5% |
| skillsLearned p50 | 9 | 9 | 9 | **9.0** | 21 | **-12 (-57%)** |
| moralChoices p50 | 56 | 55 | 54 | **55.0** | 56 | -1.8% |
| shrineVisits p50 | 1.38→2 | 2 | 2 | **~1.9** | 1.4 | +35% |
| priest maxShare | 0.40 | 0.44 | 0.52 | **0.453** | mage 0.46 | **-0.007** |
| monk 합계 | 0/50 | 0/50 | 0/50 | **0/150 (0%)** | n/a | floor |
| ranger 합계 | 1/50 | 0/50 | 0/50 | **1/150 (0.7%)** | n/a | floor |
| endCause hero_died | 1/50 | 0/50 | 0/50 | **1/150 (0.7%)** | 0 | floor |

**3-seed 의 첫 finding**: Cycle 1 의 F1 의 핵심 win 두 개 중 하나는 multi-seed 견고, 다른 하나는 noise.

- **견고**: skillsLearned p50 = 9.0 (1024/2048/4096 모두 정확히 9). gating rate 0.20 의 효과는 3 seed × 50 cycle 위에서 분산 zero. **F1.skill gate 는 진짜 win**.
- **Noise**: priest maxShare. cycle 1 의 seed 1024 = 0.40 은 3-seed 진실 0.453 의 lower outlier. F1.13 가드가 통과시킨 폭 (Δ -0.06 = 0.46 → 0.40) 의 절반 (0.007) 만 실제 효과, 나머지 (0.053) 는 seed sampling. **F1.priest pivot 은 효과 0% — 단순 redistribution + noise window 통과**. cycle 2 critic 의 "yellow flag" 가 cycle 3 의 진실 위에서 "fail" 로 확정.

## 점수

| 축 | 점수 | 근거 |
|---|---|---|
| 흥행성 | **6/10** | 3-seed maxLevel p50 825,021 (range 617k~865k, p90 853k @ seed 4096) — 첫 5-15세 LV 1 → 80-150 폭발의 hook 자릿수가 150 cycle 위에서 견고. inflation-rpg 정체성의 첫 50 줄 패턴은 multi-seed 검증됨. 다만 endCauses 진실: max_arrivals **149/150** (99.3%) / hero_died 1/150 (0.7%) / 자연사·회춘 narrative 비트 **0/150**. "37세에 인생이 끝났다 — 영웅이 사망" 의 cycle 마무리 비트가 150 cycle 위에서 1 회 — cycle 2 critic 이 의심한 "death rate floor" 가 정량 확정 (95% 신뢰구간 0.0001 ~ 0.038). 30 분 후 친구에게 추천할 last beat 영구 봉인 확정. |
| 재미 | **5/10** | F1.skill gate 진짜 win (skillsLearned p50 9.0, 분산 0, baseline 대비 -57% 견고). F1.priest pivot 은 noise (Δ -0.007, threshold 폭 0.05 의 1/7). monk 0/150 + ranger 1/150 — cycle 2 critic 이 의심한 "monk/ranger 봉인" 이 stochastic miss 가설을 거부할 정량 증거 (3 seed × 50 cycle 위에서 (0+0+0)/150 = 0 / (1+0+0)/150 = 0.7%). Tier 2 의 6 job 중 priest+paladin+mage+assassin = 67+36+28+17 = 148/150 (98.7%) — 디자인이 의도한 "6 직업 fair pivot" 이 multi-seed 진실 위에서 **4 직업 게임 + 2 dead slot** 으로 확정. decision space 의 build 차원은 cycle 1 의 측정값 이상으로 좁고, 그 좁음의 폭이 sampling noise 가 아니라 카탈로그 source-rate 의 구조적 imbalance 임이 확정. |
| 몰입성 | **6/10** | NPC dead path wire 는 살아 있음 (c4096: 라이벌·멘토·결혼·자식·행인 grep 22 hit, c4121: 2 hit — sparse 분포는 cycle 2 와 동일). 다만 같은 한 줄 "시야 끝에서 같은 표정의 그림자가 나타났다 — 라이벌이었다" 가 c4096 안에서 **15-19세 사이 6 회** 반복 + age prefix 중복 ("(15세) (15세)") 의 텍스트 버그가 cycle 2 와 동일 자리에서 재발견 — cycle 2 critic 약점 #2 (NPC variant pool 고갈) 가 third seed 에서 똑같이 발사. realm 진입 narrative 의 cycle-별 0~22 hit (c4096 22 vs c4121 5 의 4× 분산) 도 cycle 2 의 0~4 분산 폭을 확장 — hero 진행도 의존이라 dead path 아닌데 측정 noise 가 cycle 별 큼. winter season 0/150 (3 seed 연속) — cycle 1 backlog B4 가 carry-over 한 자리. |
| 플레이 타임 | **6/10** | 3-seed maxLevel: 1024 = 829,894 / 2048 = 816,565 / 4096 = 828,603 — seed 간 변동 ±1.6% (좁음). p90/p50 ratio 평균 1.030 — curve gradient 의 cycle 내 변동도 좁음, "어떤 cycle 폭발 / 어떤 cycle 정체" 의 분기 없음. shrineVisits p50 ~1.9 (1024 의 1.38 보다 약간 개선) 은 seed variance 범위. content density (8 적 + 9 장비 + 21 skill 중 9 학습 + 4 계절 + trial + sightseeing + meditation + NPC 4 종) 는 충분하지만 모든 cycle 이 max_arrivals=500 cap 으로 잘려 같은 깊이 같은 속도. plays-the-same problem 이 **3 seed × 50 = 150 cycle 위에서 sim cap 의 직접 함수로 재확인** — cycle 2 critic 의 의심을 진실로 확정. |

## 약점 TOP 3

1. **인공 타이머 종료 149/150 — eternal hero 자연사·회춘 비트 영구 봉인 (cycle 2 #1 carry-over, 정량 확정)** — `endCauses` 3-seed 합산: max_arrivals 149 / hero_died 1 / 자연사 0 / 회춘 0. cycle 2 critic 이 의심한 "death rate floor" 가 multi-seed 위에서 0.7% (95% 신뢰구간 0.0001~0.038) 로 확정. V3 spec 의 "eternal hero idle sponsor + 자연사 후 회춘" 정체성이 **150 cycle 위에서 회춘 marker 0 회**. EternalSaga 의 `재생 #N` era key 가 차곡차곡 쌓여야 "무한 saga" 정체성이 살지만, 실측 0. V3-H 가 추가한 death penalty -10% + auto-rejuv 5년 메커니즘이 150 cycle 동안 단 1 회 발사. **Δ-from-baseline**: cycle 1 의 0.02 → cycle 2 의 0.00 → cycle 3 의 0.00. 3-seed 진실 0.7% 는 sim cap 의 직접 함수 — 코드의 사망률 자체가 낮은 게 아니라 hero 가 살아서 max_arrivals 에 닿는 게 너무 빠르다. 해결 방향: **maxArrivals sim cap 500 → 1500~2000 (cycle 2 backlog B1.5/B4 의 권장 (b))** + V3 spec §6 의 chapter 별 사망률 curve (장년기 ~5% / 노년기 ~25% / 자연사 100% age≥80) 를 spec 화 후 implement. **cycle 3 PRD 1 순위 후보** — cycle 2 critic 의 동일 권고가 multi-seed 진실 위에서 강화됨.

2. **F1.priest pivot 의 효과 noise 확정 + monk/ranger 봉인 정량 확정 (cycle 2 #3 carry-over, multi-seed 결론)** — 3-seed 진실: priest maxShare 0.453 (baseline mage 0.46 → Δ -0.007). cycle 1 의 F1.13 가드 통과 폭 Δ -0.06 중 **0.053 (88%) 은 seed noise, 0.007 (12%) 이 실제 효과**. F1 의 핵심 fix 중 priest pivot 부분이 multi-seed 위에서 사실상 zero. 동시에 monk 0/150 + ranger 1/150 = Tier 2 6-job 중 2 dead slot 의 정량 확정 — cycle 2 critic 의 "stochastic miss 가능성 ≥ 진짜 봉인 가능성" 의 hedge 를 거부하고 **봉인 확정** (0/150 + 1/150 의 분포는 0 hypothesis 의 정상 결과). priest+paladin+mage+assassin = 98.7% 의 4-직업 게임. 카탈로그 source-rate 구조의 imbalance 가 cycle 1 의 F1 에서 한 자리 redistribution 됐을 뿐 (mage saturator → priest saturator) 근본 해결 안 됨. **해결 방향**: dim source-rate balance pass (카탈로그 데이터만, 코드 변경 최소) + Tier 2 valley 측정 (어떤 personality 분포가 monk/ranger 흡수해야 하는지 sim sweep). cycle 3 PRD 2 순위 후보. **추가**: planner persona 의 acceptance criterion 에서 single-seed Δ 가드 폐기 후 multi-seed (≥3 seed × ≥50 cycle = ≥150 cycle) Δ 가드 의무화 (process change).

3. **NPC narrative variant pool 고갈 + age prefix 중복 버그 — 3 seed 연속 재현 (cycle 2 #2 carry-over, third-seed reproduction)** — c4096 에서 "시야 끝에서 같은 표정의 그림자가 나타났다 — 라이벌이었다" 가 **15-19세 사이 6 회 반복** (cycle 2 의 c2048 10 회 와 자릿수 일치). 더해서 `(15세) (15세)` 처럼 **age prefix 가 중복 출력되는 텍스트 버그** 가 c4096 에서 22 회 발견 — cycle 2 critic 이 변동성 0 으로만 잡았던 자리에 cycle 3 가 코드 버그 한 줄을 추가 발견 (NPC dispatcher 가 age 를 narrator + raw template 두 곳에서 prepend 하는 double-prefix). variant pool 3-4 개로 15-20세 라이벌 6-9 회 발사 처리는 multi-seed 위에서 구조적으로 불가능. moral choice levelUp 6-variant 즉시 고갈 (cycle 1 backlog) + NPC variant 동일 패턴 (cycle 2 backlog) + age prefix double bug (cycle 3 new) = narrative variance 부채가 3 cycle 누적. **해결 방향**: (a) forNpcEncounter rival 3 → 8 variant + age-bucket 톤 modifier (15-20세 첫 등장 / 30+세 재회 / 노년 추모) + forNpcDeath 3 → 6, (b) age prefix double-prefix bug 한 줄 fix. cycle 3 PRD 3 순위 후보. **이 약점은 multi-seed 룰 도입의 부산물로 발견된 텍스트 bug 가 추가** — single-seed 였으면 cycle 2 critic 의 한 줄에 묻혔을 자리.

## 강점 (다음에도 유지)

- **F1.skill gate 의 multi-seed 견고성 확정**: skillsLearned p50 = 9.0 (1024/2048/4096 모두 9, 분산 zero). baseline 21 대비 -57% 가 sampling noise 위로 robust. cycle 1 의 가장 큰 win 이 cycle 3 의 multi-seed 진실 위에서 살아남았다. **이건 cycle 3 의 강점이라기보다 cycle 1 의 win 이 진실 위에서 검증된 것** — F1 의 두 fix 중 하나는 진짜였음이 확정.
- **첫 5-15세 hook 자릿수의 multi-seed 견고**: LV 1 → 80~150 폭발이 150 cycle 일관 (range 617k~865k, p50 825k). inflation-rpg 정체성의 첫 50 줄 패턴은 3-seed 검증 끝.
- **NPC + realm wire dead path 아님 재확인**: c4096 NPC 22 hit + realm 6 hit / c4121 realm 5 hit — 두 번째 seed batch 의 검증이 third seed 에서도 작동 (variance 는 hero 진행도 의존, dead path 아님).

## 표류 경보

- **multi-seed 룰의 첫 적용이 single-seed 측정 위에 쌓인 cycle 1 의 가드를 부분 무효화** — cycle-2-backlog B2 (planner persona baseline 측정 의무화) 의 강한 버전이 cycle 3 의 진실 위에서 필수 확정. **acceptance criterion 의 sim measurement 는 ≥3 seed × ≥50 cycle = ≥150 cycle aggregate 위에 작성**. 단일 seed 위에서 Δ ≥ 0.05 가드를 통과시키면, 다음 seed 에서 +0.04, 그 다음 seed 에서 +0.08 (1024 → 2048 → 4096 의 priest maxShare 0.40 → 0.44 → 0.52 가 정확히 그 패턴) 의 monotone drift 도 측정 불가. cycle 3 PRD 작성 전 process change 필수 (`docs/personas/02-planner.md` §"sim-driven acceptance" 에 multi-seed 룰 추가). **이건 표류 경보의 가장 큰 항목** — evolution loop 가 자기 검증 신호를 잃지 않으려면 cycle 마다 single-seed 측정 위에 가드 쌓는 패턴을 멈춰야 한다.

- **eternal hero 정체성의 측정 봉인 — 3 seed 연속 확정**: 회춘·노년·자연사 narrative 비트가 150 cycle 위에서 0 회. V3 spec 이 정의한 "1만 시간 idle sponsor" 의 핵심 cycle 흐름이 sim 환경에서 측정 불가. **코드가 이 비트를 emit 하긴 하지만, sim cap 이 너무 빨라서 측정 안 됨**. cycle 2 critic 이 "측정 infra 의 표류" 로 명시한 자리가 cycle 3 의 multi-seed 위에서 "0/150" 의 정량 확정으로 강화. V3 spec 정체성이 cycle 마다 측정되지 않으면 evolution loop 가 정체성을 보호할 신호를 잃는다 — cycle 3 의 약점 #1 의 maxArrivals raise 가 컨셉 표류 방지 차원에서도 1 순위.

- **컨셉 자체는 표류 아님 (3 cycle 연속 확정)**: 1 → 825k 폭발 (multi-seed 진실), idle 의 죄책감 없음, eternal hero 의 narrative wire 가 코드에 박혀 있다. 위 두 항목은 *측정/관측 infra* + *planner process* 의 표류이지, 게임이 다른 게임이 되어가는 신호는 아직 없다.
