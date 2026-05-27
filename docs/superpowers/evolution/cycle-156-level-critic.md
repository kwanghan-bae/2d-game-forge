# Cycle 156 비평 (Level Designer)

cycle 146-155 의 balance / 곡선 / 컨텐츠 소모 평가. 직전 cycle-145 의 권고 3 종
(#1 claimerTier 경계 / #2 tokenToCrack 환전 / #3 SeasonModifier axis 편향) 이
모두 cycle 146-151 에 적용됨 + cycle 152-154 의 game-critic #2 산물
TIER_UNLOCK_REWARD 까지 wire 완료. 본 critic 의 finding 은 *결합 ratio 분기*
와 *consumer wire-up 시차* 두 가지.

페르소나 룰 (`.claude/agents/level-designer.md`): inflation 정체성 사수 / sim
mirror 또는 산술 우선 / 수치는 셀 단위. 본 cycle 의 신규 sim 측정 0 — cycle
100 / 116 / 145 baseline 인용 + 산술 추정.

## 곡선 health (sim 미측정, cycle 145 baseline 인용)

| 지표 | 분포 (인용) | 정상 범위 | 판정 |
|---|---|---|---|
| maxLevel p50 | 6.92M (cycle 100 / 17 baseline) | 1 → 수십만+ 폭발 | OK |
| maxLevel p90 | 6.98M (cycle 17 측정) | p50 ×1.01-1.5 | OK |
| realm_unlocked rate | ≥ 80% (cycle 100+ 유지) | ≥ 80% | OK |
| hero_died rate | 5-20% (V3-H 안정) | 5-20% | OK |
| saga_pages p50 | ≥ 12 (cycle 100 milestone) | ≥ 12 | OK |
| organic 균열석 / 시즌 | 90 (cycle 116 baseline) | — | baseline |
| seasonToken / 시즌 (organic) | 13 (변동 0) | — | baseline |
| **token → 균열석 (organic)** | **2.6 / 시즌** (5:1, cycle 151) | — | 1.3 → 2.6 (×2) |
| **organic 보조 axis 기여도** | **2.89%** (2.6 / 90) | 3-5% healthy | **borderline** |
| TIER_UNLOCK_REWARD 누적 (lifetime) | 270 token (5+15+50+200) | — | 신규 axis |
| amortized (max rate 60 시즌) | +4.5 token/시즌 → +0.9 균열석 | — | — |
| **결합 ratio (max rate)** | **3.89%** (3.5 / 90) | 3-5% healthy | **OK** |
| **결합 ratio (realistic rate)** | **1.56%** (1.4 / 90) | 3-5% healthy | **미달** |

곡선 자체는 sim-impact 0 cycle (146-155 의 balance 만 catalog 정의 변경 /
환전 비율 / claimerTier 경계) 라 inflation 정체성 위배 0. atk/hp/MAX_ARRIVALS/
fieldLevelRange invariant 보존. cycle 17 atk-bound 봉인 invariant 보존.

**핵심 finding** = cycle 151 의 5:1 환전이 *max rate* 시나리오에서는 3.89%
healthy 진입에 성공, 하지만 *realistic rate* (시즌당 2 claim) 에서는 1.56%
여전히 sub-margin. engagement-sensitivity 의 분기.

## 봉인 / outlier

- **realistic-rate 결합 ratio 1.56% 잔여 sub-margin** (신규)
  - 5 starter reward 분포 (1 + 2 + 2 + 3 + 5 = 13) + max claim rate 5/시즌
    은 5 starter 전부 시즌마다 trigger 한다는 *상한* 가정.
  - 실제 starter 의 trigger 빈도 (cycle 145 분석):
    - `lv-10m-in-3-cycles` (hard rolling) — 1-2 회 / 시즌
    - `npc-collect-4-uniques` (cumulative) — 평생 1 회 (시즌 reset 미설계)
    - `realm-conquest-6` (hard single-cycle) — 0-1 회 / 시즌
    - `aging-master-10` (cumulative 60+ cycle) — 시즌당 0 회 다수
    - `inflation-flash-100x` (미측정) — 0 회 가정
  - 평균 2 claim / 시즌 = base 5-7 token / 시즌. amortized lifetime 270 /
    150 시즌 (전설 도달) = 1.8 token / 시즌. 합 7 token = 1.4 균열석 = **1.56%**.
  - cycle 145 의 healthy 3-5% 범위 미달. 시간이 지나면서 누적 보너스가 amortize
    되지만 그 amortization 이 매 시즌의 player-felt 보조 axis 로는 너무 얇음.

- **cycle 155 SeasonalModifier wire-up 시차 (carry-over 누락 위험)** (신규)
  - cycle 149 의 catalog 8 (axis 4/2/2) 균등화는 *데이터 상* 완료.
  - cycle 155 가 pure consumer (`seasonalModifierApply.ts`) 만 추가 — `HeroDecisionAI`
    의 trait pick, `narrationVariants` 의 tone 가중, `OverworldScene` 의 cosmetic
    tint 어느 것도 cycle 155 commit 시점에 wire 부재. cycle 157+ 분할 carry-over.
  - 결과: cycle 149 catalog 균등화의 **player-felt 변동 0**. SeasonPassScreen
    header 의 chip 만 표시 가능. cycle 145 의 game-critic 권고 #1 (wire-up
    부재) 가 catalog 균등화 cycle 9 후에도 잔존.

- **achievementsCatalog.ts L20 주석 산술 오류 stale** (cycle 145 carry-over)
  - L20: `cycle 116 organic 90/시즌 대비 ~14% 보조 axis.` 가 cycle 145 critic
    의 outlier #1 에서 1.44% 라고 정정됐으나, **cycle 146-155 어디서도 주석 변경
    commit 없음**. cycle 151 의 환전 5:1 갱신 후 실제는 2.89% — 주석은 여전히
    14% 로 거짓.
  - 영향: 차기 cycle 의 PRD 작성자가 이 주석을 baseline 으로 인용 시 ×4.85 과대
    추정. cycle 145 advisor §Gap 4 의 산술충돌 사전 검증 룰 회귀.

- **TIER_UNLOCK_REWARD 곡선 health (검토 결과 OK)**
  - 0 / 5 / 15 / 50 / 200 의 log-scale ratio = ∞ / 3 / 3.33 / 4 — 일관.
  - 첫 step (5 claim 후 +5 token) 이 노련 진입의 visceral reward — onboarding
    healthy.
  - 마스터→전설 (×4) 은 healthy plateau 후 long-term 충성도 reward.
  - 변경 권고 없음.

## 약점 TOP 3 (밸런스)

1. **realistic-rate 결합 ratio 1.56% 잔여 sub-margin** — cycle 151 의 5:1
   환전이 *max rate* 3.89% healthy 도달에는 성공했으나 평균 user 의 realistic
   rate (2 claim/시즌) 에서 1.56% 여전히 cycle 145 의 healthy 범위 미달.
   - 제안 A (선호): **`tokenToCrack` `5:1 → 3:1`**. realistic 1.4 → 2.33 균열석
     = 2.59% (borderline). max rate 3.5 → 5.83 균열석 = 6.48% (over). max 가
     ceiling 박힘 위험.
   - 제안 B (advisor 권장): **5 starter reward 합 `13 → 17`**. spread 1/2/3/3/8
     예시. realistic 2-claim 평균 token = 5.2 → 6.8, 합 8.6/시즌 = 1.72 균열석
     = **1.91%** (여전히 미달).
   - 제안 C: **starter 갯수 5 → 7** (2 신규 도전과제 추가, 시즌 reset cumulative
     설계 + token 합 13 → 22). realistic 3-claim 가능 시 token 10/시즌 = 2.0
     균열석 = 2.22%. 이 옵션은 컨텐츠 소모 expansion 동반.
   - 권장 = **제안 A 채택**. ratio 변경은 single-line cell edit (gameStore.ts
     L1588, SeasonPassScreen min/step), inflation invariant 0, max 6.48% 의
     ceiling 은 cycle 145 advisor 의 "starter 5 모두 trigger" 가정 비현실 (cumul
     ative 2 의 reset 부재로 평생 1 회) 이라 실제 ceiling = 4-5%.
   - category: balance (cycle 151 후 5 cycle 격리, 룰 9 안전).

2. **SeasonalModifier consumer wire 시차** — cycle 149 catalog 8 균등화의
   player-felt 0 잔존. cycle 155 pure consumer 만 wire, actual HeroDecisionAI /
   narrationVariants / cosmetic tint 는 cycle 157+ 분할.
   - 제안: cycle 157 dispatch 시 **HeroDecisionAI.pickTrait wire** 1 줄 우선.
     `seasonalModifierApply.getTraitWeightMul(activeRule, traitId)` 곱셈만 적용.
     narrative tone 과 cosmetic tint 는 cycle 158, 159 분할.
   - 이유: cycle 17 atk-bound invariant 보존 (trait pick 의 weight 만 변경,
     trait 의 final atk/hp 영향 0). player-felt 변동 즉시 활성. cycle 145
     game-critic #1 의 잔재 해소.
   - category: system (cycle 153, 155 system 후 154 UI / 156 balance 가
     중간에 들어가서 cycle 157 system 정상).

3. **achievementsCatalog.ts L20 주석 stale 14%** — 정정 commit 부재. 후속 PRD
   작성 시 ×4.85 과대 baseline.
   - 제안: 차기 carry-over commit (어떤 cycle 든 ach 관련) 에서 L20 주석을
     **`cycle 151 환전 5:1 → 2.6 균열석 = 2.89% 보조 axis. realistic rate
     1.56%.`** 으로 정정.
   - category: docs (1-line, 어떤 카테고리 cycle 에도 piggy-back 가능).

## 차기 cycle 수치 제안표

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `tokenToCrack` | 5:1 | **3:1** | realistic ratio 1.56% → 2.59% (borderline OK), max 3.89% → 6.48% (실제 ceiling 4-5%) |
| `HeroDecisionAI.pickTrait` weight wire | 미연결 | **getTraitWeightMul 적용** | cycle 149 catalog 균등화의 player-felt 0 해소 |
| `achievementsCatalog.ts:20` 주석 | "~14%" stale | **"2.89% (realistic 1.56%)"** | 산술 정정, PRD baseline 신뢰성 회복 |
| `aging-master-10` 임계 (carry-over) | 10 | **7** (cycle 145 carry-over) | 60+ cycle → 40+ cycle, 시즌 1 회 가능 영역 |
| `inflation-flash-100x` 임계 (carry-over) | 3 회 / cycle | **(측정 후)** | cycle 132+ telemetry 후 — 측정 권장 |
| SeasonModifier catalog (carry-over) | 8 | **(유지)** | 8 month rotation healthy, 12 ideal 은 차차 |

권장 채택 분배 (cycle 156-160): **약점 1 + 2 + 3** 한 cycle 씩 분할. 약점 1 =
cycle 156 (balance), 약점 2 = cycle 157 (system), 약점 3 = cycle 158+ 어느
docs piggy-back. cycle 145 carry-over (aging-master / inflation-flash) 는
계속 carry-over.

## cycle 145 carry-over status update

| carry-over | 채택 cycle | status (cycle 155 시점) |
|---|---|---|
| `claimerTier` 전설 1000 → 300 | cycle 146 | **완료** (`claimerTier.ts:12`) |
| `tokenToCrack` 10:1 → 5:1 | cycle 151 | **완료** (`gameStore.ts:1588`) — 단, realistic rate 미달 잔존 |
| SeasonModifier catalog 6 → 8 (axis 4/2/2) | cycle 149 | **완료** (`seasonalModifierCatalog.ts:82-101`) — 단, consumer wire 0 |
| `aging-master-10` 임계 10 → 7 | — | **미적용** (carry-over) |
| `inflation-flash-100x` 임계 측정 후 조정 | — | **미측정** (carry-over) |
| catalog 8 → 12 (1년 ideal rotation) | — | **carry-over** (cycle 149 = 8 도달, 12 는 차차) |
| `achievementsCatalog.ts:20` 주석 14% 정정 | — | **stale** (carry-over) |

## 컨텐츠 소모 예상

### TIER_UNLOCK_REWARD 누적 시간

- **신참 → 노련** (5 claim) — max 1 시즌 = **1 개월**, realistic 3 시즌 = 3 개월.
  visceral first reward.
- **노련 → 숙련** (20 claim) — max 4 시즌 = **4 개월**, realistic 8-10 시즌 = 8-10 개월.
- **숙련 → 마스터** (80 claim) — max 16 시즌 = **1.3 년**, realistic 30-40 시즌 = 2.5-3.3 년.
- **마스터 → 전설** (300 claim) — max 60 시즌 = **5 년**, realistic 150 시즌 = **12.5 년**.

cycle 145 의 1000 sentinel (13-80 년) 대비 도달 가능 영역으로 회복 — 정체성
(long-term 충성도 axis) 보존.

### TIER_UNLOCK_REWARD 결합 magnitude

- lifetime 270 token = **54 균열석** (5:1, 5 년 max rate 누적)
- amortized over 60 시즌 max = 4.5 token/시즌 = **0.9 균열석/시즌** 추가 보조
- amortized over 150 시즌 realistic = 1.8 token/시즌 = **0.36 균열석/시즌** 추가
- cycle 116 organic 90 대비 amortized 비중 0.4-1.0% — 단독으로는 sub-margin,
  organic 13 token 과 결합해야 healthy 진입.

### SeasonModifier rotation cohort (cycle 149 의 8 catalog)

- 8 modifier × 30 일 = **240 일 = 8 개월** full cycle (cycle 145 권고대로).
- 1 년 user 의 axis 노출: 4 trait + 2 narrative + 2 cosmetic = saturation × 1.5.
- 단, **cycle 155 consumer 미wire 로 player-felt 0** — rotation 의 의미가 UI
  의 chip text 변경에만 한정. cycle 157 의 HeroDecisionAI wire 가 도달해야
  rotation cohort 측정 가능.
- 1 년 ideal 12 modifier 도달 (cycle 145 carry-over) 은 cycle 160+ backlog.

## 표류 경보

- inflation 정체성 (1 → 수십만+ 폭발 곡선) **위배 없음**. cycle 146-155 모두
  sim-impact 0 의 balance / system / UI / narrative / VFX 작업. atk/hp/
  MAX_ARRIVALS/fieldLevelRange invariant 회귀 0.
- 레벨 cap / 평탄화 시도 **없음**.
- maxLevel p50 6.92M baseline 변동 없음.
- cycle 145 의 claimerTier sentinel 해소 (1000 → 300) 후 도달 가능 영역 회복
  — UI dead surface 해소 확정.
- **잔존 표류 1** = SeasonalModifier consumer wire 시차 (cycle 149 → cycle
  155+ 분할). 6 cycle 갭은 healthy persona 의 "단일 phase 안 wire 완결" 룰의
  사실상 위반. cycle 156 의 dispatch 우선 권고.
- **잔존 표류 2** = achievementsCatalog.ts:20 산술 주석 14% stale — PRD 신뢰성
  회로의 dead spot.
- **신규 sim 측정 cost 회피** — 본 평가는 cycle 100/116/145 baseline 인용 +
  산술 추정. cycle 157 (HeroDecisionAI wire) 적용 후 1 회 50-cycle sim 권장
  (axis weight 의 maxShare 변동 직접 측정).

## 한 줄

cycle 145 권고 3 종 모두 채택 + TIER_UNLOCK_REWARD wire 까지 완료로 *max rate*
결합 ratio 3.89% healthy 진입 성공. 하지만 *realistic rate* 1.56% 여전히 미달
+ cycle 149 catalog 균등화의 consumer wire 가 cycle 155 pure-helper 단계로
6-cycle 시차 잔존. 위 2 약점 모두 *현 invariant 보존* 으로 해소 가능
(`환전 5:1 → 3:1`, `HeroDecisionAI.pickTrait getTraitWeightMul wire`,
`주석 14% → 2.89%`).
