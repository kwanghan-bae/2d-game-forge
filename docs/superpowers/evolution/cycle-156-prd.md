# Cycle 156 PRD — 이중 호칭 bug fix + critic #1 misdiagnosis surface

category: narrative

## 한 줄

`CLAIM_NARRATION_VARIANTS[0]` 의 자체 vocative `'용사여, '` 를 제거하여 `TIER_VOCATIVE_PREFIX` 합성 시 발생하는 이중 호칭 bug 를 1-line 으로 해소하고, 동시에 game-critic 의 권고 #1 ("HeroDecisionAI trait pick wire") 이 *wire target 부재* 의 misdiagnosis 였음을 PRD 비고에 명시한다.

## 컨텍스트

- cycle 155 = SeasonalModifier pure consumer (`seasonalModifierApply.ts`) 만 ship. 실제 wire 0. game-critic 약점 #1 = "분할 1/3 slow-walk 패턴".
- cycle 156 계획 후보 = critic 권고 #1 의 *분할 2/3* (HeroDecisionAI 에 `getTraitWeightMul` 주입).
- **사전 검증으로 발견**: `pickTrait` / `rollTrait` / trait 자동 roll 함수 자체가 코드에 없음. `applyTraitMods` 는 *이미 결정된* trait 을 *적용* 만 한다. `traitsUnlocked` 도 unlock 로직 없이 `BASE_TRAIT_IDS` 그대로. **critic 권고 #1 의 wire target 이 코드에 존재하지 않음** (cycle 156 advisor reconcile).
- 즉 catalog 의 4/8 `trait_weight` modifier 는 *triple-dormant* (catalog ✓ / helper ✓ / consumer system **부재**). cycle 155 의 helper 가 wire 될 system 자체가 아직 안 만들어졌다.
- pivot 결과: cycle 156 은 critic 권고 #1 분할 2/3 대신 story-writer 약점 #2 (이중 호칭 bug) 의 1-line fix 로 진입. slow-walk 패턴은 *carry-over 0 의 단일 cycle 완결* 로 끊는다.

## 평가 통합 — 6 페르소나 핵심

| 페르소나 | surface | 본 cycle 처리 |
|---|---|---|
| game-critic #1 | "분할 1/3 slow-walk — HeroDecisionAI 에 `getTraitWeightMul` 주입 필요" | **misdiagnosis (wire target 부재) — 비고에 surface, cycle 161 carry-over 로 변형 재진입** |
| game-critic #2 | "5:1 + TIER_UNLOCK_REWARD compound 의 50-cycle sim 검증 0" | cycle 163 carry-over (balance sim) |
| game-critic #3 | "10/10 cycle N5 cluster, hero loop 본체 0 진입 — 정체성 침묵" | cycle 165 까지 진입 *데드라인* carry-over — 미진입 시 자율진화 review flag |
| story-writer #1 | "`getNarrativeWeightMul` doubly-dormant, `narrationVariants.ts` 430 줄에 tone tag 0" | cycle 161 carry-over (분할 3/3 narrationVariants tone tag — 데이터 추가 + wire 동시, scope ~100 줄) |
| **story-writer #2** | "이중 호칭 bug — `CLAIM_NARRATION_VARIANTS[0]` 의 자체 vocative + `TIER_VOCATIVE_PREFIX` 합성" | **본 cycle 채택 (1-line fix)** |
| story-writer #3 | "realm-aware sub-pool — 11 cycle 표류" | cycle 165 carry-over (story-writer #1 묶음) |
| level-designer #1 | "tokenToCrack 5:1 → 3:1, realistic 1.56% → 2.59%" | cycle 158 carry-over (balance) |
| level-designer (stale) | "`achievementsCatalog.ts:20` 주석 14% stale" | cycle 158 의 piggy-back |
| web-researcher invention | "EternalCodex (영구 multiplier + non-expiring layer)" | 별도 mega-phase 후보 (carry-over 외) |
| ui-ux-designer 권고 A | "MainMenu pulse dot + 44px 픽스 + ARIA + focus trap" | cycle 159 carry-over (UI) |
| asset-investigator | "`docs/CREDITS.md` 신설 + Lucide `Ticket`" | cycle 164 carry-over (docs/chore) |

## 우선순위

1. **F1 — 이중 호칭 bug fix** (1-line, narrative): seed=0 deterministic 노출 + 1/12 무작위 노출의 *결정적 출력 결함*. 신참 tier 신규 사용자 첫 인상 직격.
2. **비고 — critic #1 misdiagnosis surface**: 사전 검증으로 발견된 wire target 부재를 PRD 비고와 INDEX 둘 다에 박아 자율진화 시스템이 같은 권고를 반복하지 않도록.
3. **carry-over 9 슬롯 — cycle 157-165 backlog** 명시 + 카테고리 회전 검증표.

## F1. CLAIM_NARRATION_VARIANTS[0] vocative 제거

- **목적**: `'용사여, 그대의 노고를 치하한다'` 의 자체 vocative 와 `TIER_VOCATIVE_PREFIX` 합성으로 발생하는 이중 호칭 bug 해소. 신참 tier = `'용사여, 용사여, 그대의 노고를 치하한다'`, 전설 = `'오랜 동반자여, 용사여, 그대의 노고를 치하한다'` 출력 결함 차단.

- **변경 file:line**:
  - `games/inflation-rpg/src/data/claimNarrationVariants.ts:13` — `'용사여, 그대의 노고를 치하한다'` → `'그대의 노고를 치하한다'`.
  - `games/inflation-rpg/src/data/__tests__/claimNarrationVariants.test.ts:19,36,41,42` — `expect(pickClaimNarration(0)).toBe(CLAIM_NARRATION_VARIANTS[0])` assertion 들은 *그대로 통과* (배열 reference 비교라 fix 후에도 정합). 신규 assertion 1 개 추가: `pickClaimNarration(0, '신참').split(', ').length` ≤ 2 (이중 호칭이면 3 이상).

- **동작**:
  - 풀 크기 = **12 유지** (line 13 의 한 줄 텍스트만 교체).
  - 톤 변화 = 0 — 호칭은 `TIER_VOCATIVE_PREFIX` 가 담당. 신참 player 에게는 `'용사여, 그대의 노고를 치하한다'`, 전설 에게는 `'오랜 동반자여, 그대의 노고를 치하한다'` 가 깔끔하게 출력.
  - 다른 11 줄 = 변경 0. anticipation 4 (cycle 147) + closure 7 (cycle 134/142) = 11 줄 모두 vocative 부재로 prefix 합성 정합.
  - `pickClaimNarration(seed, tier)` 시그니처 / 호출처 변경 0. `SeasonPassScreen.tsx` 의 handleClaim path 변경 0.

- **수용 기준**:
  - **F1.1 (핵심 — 이중 호칭 제거 정합)**: cycle 148 의 test `pickClaimNarration(0, '신참')` 결과 = `'용사여, 그대의 노고를 치하한다'` (호칭 1 회). 수정 전 = `'용사여, 용사여, 그대의 노고를 치하한다'` (호칭 2 회, fix 의 대상). 신규 assertion `pickClaimNarration(0, tier).split('용사여').length` 를 *cycle 156 회귀 가드* 로 박는다 — 신참 tier 시 splits = 2 (분리 1 회), 다른 tier 시 splits = 1 (분리 0 회, base 에 `'용사여'` 부재).
  - **F1.2 (legacy test 통과)**: 기존 8 assertion (`claimNarrationVariants.test.ts:6-50`) 모두 변경 0 통과. `pickClaimNarration(0)` 의 *값* 은 변경되지만 (`'그대의 노고를 치하한다'`), assertion 은 `CLAIM_NARRATION_VARIANTS[0]` reference 비교라 자동 정합. test 본문 수정 0.
  - **F1.3 (풀 크기 12 유지)**: `CLAIM_NARRATION_VARIANTS.length === 12`. cycle 142 의 12 라인 invariant 보존. line 추가/제거 0.
  - **F1.4 (50 자 invariant)**: 수정된 line 의 글자 수 = 14 자 (`'그대의 노고를 치하한다'`), 기존 50자 룰 통과.
  - **F1.5 (SeasonPassScreen 회귀 0)**: SeasonPassScreen 의 handleClaim path 의 feedback 출력 형태가 한 글자 변동 (`'용사여, '` 1 회 제거) 외 변경 0. e2e 추가 없음 — 1-line text fix 라 unit test 만으로 충분.

- **반대 기준 (NOT this)**:
  - **풀 확장 (NOT add new variant)**: 본 cycle 은 *기존 12 줄* 의 line 13 *한 줄만* 교체. anticipation/closure 톤 추가 / 풀 12 → 13/14 확장 금지. tone 다양성 확장은 cycle 161 의 carry-over (story-writer #1 의 tone tag 묶음).
  - **realm-aware sub-pool (NOT realm-aware variant)**: story-writer 약점 #3 의 realm-aware sub-pool 추가는 본 cycle 외. cycle 165 carry-over.
  - **tone tag 부착 (NOT metadata expansion)**: story-writer #1 의 `tone: 'elegy' | 'ode' | ...` 메타 부착은 cycle 161 분할 3/3 으로 분리. 본 cycle 의 surface 는 *line 13 텍스트만*.
  - **TIER_VOCATIVE_PREFIX 변경 (NOT prefix retune)**: cycle 148 의 5 tier prefix (`'용사여' / '오랜 길손이여' / ...`) 는 변경 0. 신참 tier 의 `'용사여'` 가 본 fix 의 *의도된* 호칭 출처.
  - **pickClaimNarration 시그니처 확장 (NOT API change)**: 본 cycle 은 *데이터 한 줄 교체* 의 좁은 scope. 함수 시그니처 / 반환형 변경 0.

## 반대 기준 (PRD 의 *틀림*을 falsify 할 5 가지)

PRD 가 *틀렸음*을 증명하는 산술/관측 기준 5 가지:

1. **F1.1 falsification**: fix 후 `pickClaimNarration(0, '신참')` 의 출력에 `'용사여'` 가 2 회 이상 등장 → fix 실패. (예상 = 1 회. 신참 tier prefix `'용사여'` 1 회 + base 의 vocative 제거됨.)
2. **풀 크기 falsification**: `CLAIM_NARRATION_VARIANTS.length !== 12` → 풀 변동 발생 = scope 위반.
3. **legacy test break falsification**: 본 cycle 의 1-line fix 가 cycle 134/142/148 의 기존 8 assertion 중 1 개라도 break → 회귀. test 본문 변경 의무 0 가 깨졌다는 신호.
4. **vitest count falsification**: `pnpm --filter @forge/game-inflation-rpg test` 결과 PASS count 가 1486 → 1487 (신규 assertion 1 개 추가) 이외의 값 → unintended 회귀 또는 scope drift.
5. **SeasonPassScreen e2e falsification**: dev server 1× 30 초 manual smoke 에서 claim 시 feedback 영역에 *이중* `'용사여'` 가 노출 → 코드 변경이 production path 에 닿지 않음 (build 부재 또는 import 잘못).

## carry-over backlog (cycle 157-165)

| cycle | task | category | rule 9 check |
|---|---|---|---|
| **156** | F1 이중 호칭 fix | **narrative** | 155 system → 156 narrative (전환 OK) |
| 157 | `tokenToCrack` 5:1 → 3:1 + `achievementsCatalog.ts:20` 주석 정정 (level-designer #1 + stale) | balance | narrative → balance (전환 OK) |
| 158 | MainMenu `btn-season-pass` pulse dot + 44px 픽스 + ARIA + focus trap (ui-ux-designer 권고 A) | UI | balance → UI (전환 OK) |
| 159 | SeasonalModifier `getCosmeticTint` → OverworldScene wire (cosmetic_tint 2 종 — `field-cosmetic-spring`, `sea-cosmetic-aqua` 만 wire 가능, trait_weight 는 wire target 부재로 cycle 161 으로) | system | UI → system (전환 OK) |
| 160 | milestone STATUS (v3 5/100, 사용자 새 100-cycle 30/100) | meta | system → meta (전환 OK) |
| 161 | narrationVariants tone tag 부착 + `getNarrativeWeightMul` wire (story-writer #1, 데이터 추가 + wire 동시 ~100 줄). 동시에 critic #1 misdiagnosis 의 *변형 재진입* — trait_weight wire 가 아닌 narrative_weight wire 로 axis pivot | narrative | meta → narrative (전환 OK) |
| 162 | TierCelebrationOverlay (ui-ux-designer 권고 B cycle 157 분) — cycle 106 milestone VFX 패턴 차용. tier 진입 시 fullscreen celebration | VFX | narrative → VFX (전환 OK) |
| 163 | 5:1 + TIER_UNLOCK_REWARD compound 50-cycle headless sim 검증 (game-critic #2). `pnpm sim:cycle -- --cycles 50 --seed 163` 균열석 누적 곡선 vs cycle 145 baseline ±5% (Δ-from-baseline 형식) | balance | VFX → balance (전환 OK) |
| 164 | `docs/CREDITS.md` 신설 (asset-investigator) + Lucide `Ticket` 도입 (`pnpm add lucide-react`) + SeasonPassScreen 🎫 emoji → `<Ticket/>` 1 회 swap | chore | balance → chore (전환 OK) |
| 165 | realm-aware claim narration sub-pool 2-3 줄 (story-writer #3, cycle 161 의 tone tag 위에 layer). **데드라인**: cycle 165 까지 hero loop 본체 (monster/equip/skill catalog) 진입 0 시 자율진화 review flag | narrative | chore → narrative (전환 OK) |

## 카테고리 회전 검증표 (룰 9)

| cycle | category | 직전 streak | rule 9 verdict |
|---|---|---|---|
| 151 | balance | 149 balance 후 2 연속 | OK |
| 152 | system | balance → system | OK |
| 153 | system | system 1 | OK |
| 154 | UI | system → UI | OK |
| 155 | system | UI → system | OK |
| **156** | **narrative** | system → narrative | **OK (전환)** |
| 157 | balance | narrative → balance | OK |
| 158 | UI | balance → UI | OK |
| 159 | system | UI → system | OK |
| 160 | meta | system → meta | OK |
| 161 | narrative | meta → narrative | OK |
| 162 | VFX | narrative → VFX | OK |
| 163 | balance | VFX → balance | OK |
| 164 | chore | balance → chore | OK |
| 165 | narrative | chore → narrative | OK |

cycle 157-165 의 9 슬롯 모두 직전 2 cycle 과 다른 카테고리 = 룰 9 안전. 9-cycle 어떤 windows 도 3 연속 발생 0.

## 비고

### critic #1 misdiagnosis surface (필수 — 자율진화 review flag)

cycle 156 의 *원래 계획* 은 critic #1 의 "HeroDecisionAI trait pick 에 `getTraitWeightMul` 주입" (분할 2/3). 사전 검증 grep 으로 발견된 사실:

```
grep -rn "pickTrait\|rollTrait\|chooseTrait\|trait.*pick\|trait.*roll" \
  games/inflation-rpg/src --include='*.ts' --include='*.tsx' \
  | grep -v "__tests__\|\.test\."
```

결과 = empty. `applyTraitMods` (`cycle/traits.ts:54-79`) 는 *이미 결정된* trait 을 적용만 한다. `TraitSelector.tsx` 는 player 수동 선택 UI. **trait 자동 roll 로직 자체가 코드에 없다** — Sim-C 가 wire 할 예정이었으나 (cycle/HeroDecisionAI.ts:9 주석 "Sim-C wires real trait-driven bodies") 그 system 은 미구현. 따라서:

- catalog 의 `trait_weight` 4/8 modifier (`fire-trait-boost`, `npc-encounter-boost`, `legendary-buff-card-bias`, `underworld-shadow-trait-boost`) 는 **triple-dormant**: catalog ✓ / helper ✓ / consumer system 부재.
- cycle 155 의 `getTraitWeightMul` pure helper 는 *wire 할 진원지가 없다* — `seasonalModifierTypes.ts:32` 의 "HeroDecisionAI 의 trait roll 확률 분포 (cycle 131 wire)" 주석은 *Sim-C 가 미완 상태에서 적은 future tense 약속*.
- cycle 145 critic + cycle 156 critic 두 회의 #1 권고는 *코드 검증 누락 상태에서 작성됨*. 향후 cycle 의 game-critic dispatch 시 첫 grep = `pickTrait\|rollTrait` 의무화 필요.

대신 가능한 wire path:
- **`getCosmeticTint` → OverworldScene** (catalog 의 `cosmetic` 2 종 — `field-cosmetic-spring`, `sea-cosmetic-aqua`). `seasonBgTint` 와 분리된 *modifier-driven realm tint overlay*. cycle 159 carry-over.
- **`getNarrativeWeightMul` → NarrationVariants** (catalog 의 `narrative_weight` 2 종 — `chaos-narrative-elegy`, `heaven-narrative-ode`). 단 story-writer #1 이 surface 한 *tone tag 0* 문제 동반 — 데이터 추가 + wire 동시 진행. cycle 161 carry-over.
- **`getTraitWeightMul` → ???**: wire target 부재. trait-roll system 신설은 Sim-C scope 의 mega-phase. 자율진화 cycle 단위 처리 불가. 별도 spec 필요.

### Δ-from-baseline 룰 미적용

본 cycle 의 수용 기준은 *데이터 한 줄 교체* + *test assertion 1 줄 추가* 단위. sim-driven 측정 0. multi-seed sim Δ-guard 본 cycle scope 외.

### Sim-real parity 검증 룰 미적용

sim-driven acceptance 아님. dev server 1× 30 초 smoke 는 manual confirm (`pnpm --filter @forge/game-inflation-rpg dev` → `/inflation-rpg` → 임의 cycle 진행 후 claim → feedback 영역에 이중 `'용사여'` 부재 육안 확인) — Playwright 자동화 의무 X.

### PRD 산술 충돌 사전 검증

본 cycle 의 다항 수용 기준 (F1.1 ~ F1.5) 은 *상호 보강* (호칭 1 회 + 풀 크기 12 + legacy test 통과 + vitest 1487 + e2e 통과). 산술 충돌 0.

### 컨셉 가드 (V3 eternal hero idle sponsor)

V3 의 후원자/eternal hero 관계는 **호칭 정합성** 으로 표현된다. cycle 148 의 5 tier prefix (`'용사여'` → `'오랜 동반자여'`) 가 *관계의 진척감* 을 narrative 로 표현하는 핵심 비트. 이중 호칭 bug 는 이 정체성 표현을 *기괴한 텍스트 출력* 으로 손상. 본 fix 는 V3 정체성 보강의 *결정적 bug fix*. 새 캐릭터/세계관 추가 0 — persona 절대 금지 준수.

### 리스크

- **R1 (low)**: `pickClaimNarration(0)` 의 반환 *값* 이 `'용사여, 그대의 노고를 치하한다'` → `'그대의 노고를 치하한다'` 로 변경. cycle 134 의 test (line 19) assertion `expect(pickClaimNarration(0)).toBe(CLAIM_NARRATION_VARIANTS[0])` 는 *array reference 비교* 라 자동 통과. legacy save 의 *과거에 표시된 feedback 텍스트* 영향 0 (텍스트는 stateless).
- **R2 (low)**: 신참 tier 가 *너무* 깔끔해질 우려. fix 후 신참 = `'용사여, 그대의 노고를 치하한다'` 가 *유일한* 정상 호칭. 다른 11 줄 은 prefix only (`'용사여, 한 페이지가 더 채워졌다'` 등). 톤 다양성 손상 아님 — 이전 1/12 의 *bug 출력* 이 제거된 것뿐.
- **R3 (low)**: critic #1 misdiagnosis surface 가 cycle 157+ 의 critic dispatch 에 영향. 본 PRD 의 비고 + INDEX cycle 156 entry 두 곳에 박아 다음 critic 이 같은 권고를 *반복* 하지 않도록.

### 의존성

- `claimNarrationVariants.ts` (cycle 134/142/147/148) — 변경 대상 line 13.
- `claimNarrationVariants.test.ts` (cycle 134/148) — 변경 대상 (신규 assertion 1 추가, 기존 assertion 변경 0).
- `SeasonPassScreen.tsx` (cycle 131+) — 호출처, 변경 0.
- `TIER_VOCATIVE_PREFIX` (cycle 148) — 변경 0.

### 변경 surface 추정

| file | 변경 | 줄 수 |
|---|---|---|
| `claimNarrationVariants.ts:13` | text 14 자 → 12 자 (한 줄 교체) | -2 자 (line count 0) |
| `claimNarrationVariants.test.ts` | 신규 assertion 1 줄 추가 (이중 호칭 가드) | +5 ~ +8 줄 |
| **총** | 1-line text fix + 1 unit test 추가 | **~5-10 줄** |

cycle 131 의 추정 (+150 ~ +180 줄) 의 ~3% 수준. cycle scope 의 *최소 자릿수*. slow-walk 패턴 끊는 *완결 단일 cycle* 의 무게.

### 검증 명령 (cycle 156 종료 시점)

- `pnpm --filter @forge/game-inflation-rpg test` — 1486 → 1487 (assertion 1 추가).
- `pnpm --filter @forge/game-inflation-rpg typecheck` — 0 exit.
- `grep -n "용사여" games/inflation-rpg/src/data/claimNarrationVariants.ts` — 1 hit only (`TIER_VOCATIVE_PREFIX.신참 = '용사여'` line 32), variant 풀 line 11-27 에는 0 hit.
- manual smoke (선택): dev server → 임의 cycle 진행 → claim → feedback 에 이중 `'용사여'` 부재.

### INDEX cycle 156 entry 권장 형식

```
- Cycle 156 (2026-MM-DD): story-writer #2 권고 — `CLAIM_NARRATION_VARIANTS[0]` 자체 vocative 제거. 이중 호칭 bug 해소 (seed=0 deterministic + 1/12 무작위). 1-line text fix + 신규 assertion 1. **추가**: critic #1 권고 ("HeroDecisionAI trait pick wire") 가 *wire target 부재* misdiagnosis 임을 grep 검증 — `applyTraitMods` 는 적용만, trait roll 로직 자체 미구현 (Sim-C scope). cycle 159 (cosmetic) / cycle 161 (narrative_weight) 으로 axis pivot. category: narrative (155 system 후 전환). vitest 1487 (+1). v2 56/100.
```

### PRD 본문 길이 정당화

1-line fix scope 임에도 본문이 ~280 줄 인 이유: (a) critic #1 misdiagnosis surface 의무 (자율진화 review flag), (b) carry-over 9 슬롯 backlog + 카테고리 회전 검증표, (c) 6 페르소나 통합 표. 코드 변경 단위 (~5 줄) 와 PRD 본문 길이 (~280 줄) 의 비대칭은 *자율진화 시스템 review* 가 본 cycle 의 1차 deliverable 이라 정당. 향후 cycle 161 의 분할 3/3 (~100 줄) 진입 시 PRD 본문은 더 짧아진다.

### 컨셉 가드 재확인

V3 의 "eternal hero idle sponsor" 정체성 = 후원자/hero 관계의 *호칭 정합성*. inflation-rpg 의 정체성 (1 → 수십만 레벨 폭발) 과 무관한 인터랙션 변경. balance / 곡선 수정 0. atk-bound invariant 보존. spec drift 0.
