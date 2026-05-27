# Cycle 256 PRD — forNpcDeath kind bug fix + 100-cycle substantive accountability

작성 = 2026-05-28. 새 100-cycle (cycle 256-355) 의 1/100. 직전 100-cycle (cycle 156-255) 의 final = `STATUS-2026-05-28-cycle-255.md`.

category: narrative

입력 페르소나 5 종 (모두 직접 read 완료):

- `cycle-256-critic.md` — 4축 3/3/6/4 (cycle 156 시점 5/4/6/5 대비 하향). 핵심 finding = "SeasonalModifier 5 axis 중 2 axis 만 wire — STATUS 의 'wire chain 8 분할 완성' 자축이 substantive misrepresentation".
- `cycle-256-story-critic.md` — 약점 3 종: (#1) emotional-peak pool 역경제 (claim 600+ vs 자연사 1줄), (#2) **`forNpcDeath` kind 미전달 BUG — 재현 가능**, (#3) `forDeath`/`forRejuvenation` 의 ageTone/realmTone composition 누락.
- `cycle-256-level-critic.md` — 실측 50-cycle sim: maxLevel p50 4.89M (baseline 6.86M 대비 **-29% 침식**), saint **80% dominance** (cycle 156 58.5% → +21.5%p 악화). magnitude caveat = 단일 seed 100, cycle 257 의 seed=300 재현 측정으로 확정 필요.
- `cycle-256-research.md` — Invention = **Lifebook** (life-cycle axis). EternalCodex 와 직교 — EternalCodex 의 폐기/supersede 후보로 surface.
- `cycle-256-assets.md` — discovery 만, 통합은 cycle 258+ 분할. 단기 ROI = 기존 BGM 3 → 6 realm rotation (자산 0).

## 한 줄

`forNpcDeath` 시그니처에 `kind: NpcKind` 인자를 추가하여 rival/mentor/family 사망 시 1/3 확률로 잘못된 화법이 출력되는 재현 가능 bug 를 1 sub-spec 으로 해소하고, 동시에 100-cycle critic finding (wire chain 자축 misrepresentation / saint dominance / EternalCodex 폐기 / 자율진화 메타-rule 3 종) 의 **substantive accountability** 를 PRD 에 박는다.

## 평가 핀포인트

| 페르소나 | surface | 본 cycle 처리 |
|---|---|---|
| game-critic #1 | "wire chain 8 분할 완성 자축 = cosmetic + claim modal 2/5 axis 한정 — substantive misrepresentation" | **메타-rule 3 박제 (자율진화 룰)** + critic 의 anti-misrepresentation 권고 5 수용 |
| game-critic #2 | "hero loop 100 cycle 변동 0 — trait wire 미도달 + spec §6.2 4 책임 production 부재" | **HeroDecisionAI mega-phase = defer carry-over** (Sim-C scope, cycle 단위 처리 불가) |
| game-critic #3 | "economy sim 100 cycle 연체" | **cycle 257 chain stage = seed=300 sim baseline 측정** |
| game-critic #4 | "micro mode 의 cycle-counter-as-goal 표류 + N5 cluster 124 cycle 누적" | **메타-rule 1 = micro mode 비율 ≤ 30% 박제** |
| game-critic #5 | "EternalCodex 100 cycle 코드 진입 0 — ambiguous listed" | **EternalCodex 폐기** (Lifebook 으로 supersede) |
| story-critic #1 | "emotional-peak pool 역경제 (claim 600+ vs 자연사 1줄)" | **cycle 258 chain stage = NATURAL_DEATH_VARIANTS 1 → 5** |
| **story-critic #2** | "`forNpcDeath` kind 미전달 BUG — rival 1/3 확률 멘토 화법, 재현 가능" | **본 cycle 256 채택 (F1)** |
| story-critic #3 | "`forDeath`/`forRejuvenation` 의 ageTone/realmTone composition 누락" | cycle 258 chain stage 와 묶음 (`pick → ageTone → realmTone` pipeline 통일) |
| level-critic #1 | "maxLevel p50 4.89M -29% silent regression" | **cycle 257 = seed=300 재현 측정**, cycle 259 = nerf 적용 (≥3 seeds) |
| level-critic #2 | "saint 80% dominance (+21.5%p deepen)" | **cycle 259 chain stage = `saint.atkMul: 2.5 → 2.8` + `merciful.min: 7 → 9` (≥3 seeds, Δ-guard)** |
| level-critic #3 | "ULT_CATALOG 12 / 32 gap" | mid-term backlog (cycle 261-270+ mega-phase 후보) |
| web-researcher invention | "**Lifebook** (life-cycle axis) — EternalCodex 와 직교, 더 직접 정합" | **carry-over 명단 신규 listed**, mega-phase 후보, spec deadline cycle 280 |
| asset-investigator 단기 ROI | "기존 BGM 3 → 6 realm rotation 매핑 (자산 0)" | cycle 257-260 chain 외 backlog (cycle 262 D+A 통합 후보) |

## 우선순위

본 cycle 256 surface = **단일 F1**. P1/P2 는 *우선순위* 가 아니라 chain stage (cycle 257/258/259). 페르소나 룰 "한 cycle 에 3 feature 초과 금지" + critic #1 의 wire chain misrepresentation 비판 모두 이 discipline 강제.

1. **F1 — `forNpcDeath` kind-aware 분기** (story-critic #2): 재현 가능 명백 bug. rival 사망 시 1/3 확률로 "멘토가 침대에서 일어나지 못했다" 출력. V3 정체성 (NPC 4 종 + EternalSaga) 의 캐릭터 일관성 직접 손상. callsite 3 곳 + signature 1 곳 = 1 sub-spec 안에서 fix.

## 기능 요구사항

### F1. `forNpcDeath` kind-aware 분기 + `NPC_DEATH_VARIANTS` Record 분기

- **목적**: `forNpcDeath({ age, realm }, seed)` 의 seed % 3 random pick 이 *NPC kind 무관* 으로 mentor/rival/passerby 3 줄에서 무작위 선택되어, rival 사망 시 1/3 확률 멘토 화법, mentor 사망 시 1/3 확률 rival 화법이 출력되는 deterministic + 재현 가능 캐릭터 일관성 bug 해소. story-critic 의 본 cycle 유일 명백 bug.

- **변경 file:line**:
  - `games/inflation-rpg/src/saga/NarrativeGenerator.ts:66` — `static forNpcDeath(opts: { age: number; realm?: RealmId | null }, seed = 0)` → `static forNpcDeath(opts: { age: number; kind: NpcEntity['kind']; realm?: RealmId | null }, seed = 0)`. kind 인자 추가, NarrationVariants 의 신규 method `npcDeath(ctx)` 로 위임. **NpcEntity['kind'] union = 6 kind** (rival/mentor/friend/family_parent/family_spouse/family_child) — `types.ts:198` 사전 grep 확정.
  - `games/inflation-rpg/src/data/narrationVariants.ts:341-345` (`NPC_DEATH_VARIANTS` array 3 줄) → `NPC_DEATH_VARIANTS_BY_KIND: Record<NpcEntity['kind'], Array<(c) => string>>` 변환. legacy 3 줄 (mentor / rival / passerby 화법) 중 **mentor[0] = `${age}세에 멘토가 침대에서 일어나지 못했다`**, **rival[0] = `${age}세에 라이벌의 마지막 칼은 자신의 것이었다`**, **passerby 줄은 NpcEntity.kind union 에 없으므로 friend[0] 로 재배치** (`${age}세에 친구의 부고를 멀리서 들었다 — 이름은 끝내 몰랐다`). 추가 = mentor 2 / rival 2 / friend 1 / family_parent 2 / family_spouse 2 / family_child 2 = **총 14 줄** (legacy 3 + 신규 11). story-critic 제안 #2 의 6 kind × 2-3 variant 답습. *family_spouse 의 "영웅의 회춘이 처음으로 죄스러웠다"* 가 eternal hero × 인간 NPC 비대칭의 narrative 핵심 비트.
  - `games/inflation-rpg/src/data/narrationVariants.ts:548` (`pick(NPC_DEATH_VARIANTS, ...)`) → `pick(NPC_DEATH_VARIANTS_BY_KIND[ctx.kind] ?? NPC_DEATH_VARIANTS_BY_KIND.friend, { age: ctx.age }, seed)`. fallback = friend (가장 일반적 어휘, "친구의 부고" 가 unknown kind 의 안전 catch-all). composition `ageTone → realmTone` 적용 (다른 NarrationVariants method 와 동일 pipeline). kind 인자 자체는 typecheck 로 강제되므로 `??` fallback 은 *defensive 안전망*.
  - `games/inflation-rpg/src/overworld/CycleControllerV2.ts:550, 831, 1334` (3 callsite) — 각 callsite 에 `kind: npc.kind` 인자 추가. NpcEntity 의 `kind` field 가 이미 정의되어 있음 (검증 완료 — `forNpcEncounter` 가 같은 kind 인자 사용).
  - `games/inflation-rpg/src/data/__tests__/narrationVariants.test.ts` (없으면 신설) — 신규 unit test 3 개: (a) kind 별 출력에 *해당 kind 어휘만 등장* 검증 (mentor → "멘토", rival → "라이벌"), (b) seed=0 deterministic 보존 검증 (legacy 3 줄이 각 kind 의 첫 entry 위치), (c) `NPC_DEATH_VARIANTS_BY_KIND` 의 모든 6 kind 가 ≥ 1 variant.

- **동작**:
  - 시그니처 = `forNpcDeath({ age, kind, realm }, seed)`. kind 부재 callsite 는 typecheck 가 강제 차단.
  - composition pipeline = `pick(kind 별 풀) → ageTone(70+ "마지막 호흡으로" suffix) → realmTone(realm 별 어휘 suffix)`. story-critic #3 의 composition 누락도 일괄 회수 (NPC death scope 한정).
  - kind 6 = `mentor / rival / friend / family_parent / family_spouse / family_child`. **NpcEntity['kind'] union 사전 grep 확정 (`games/inflation-rpg/src/types.ts:198`)** — passerby 는 union 외 (story-critic 의 legacy text label 오기, friend 로 재배치).
  - 풀 크기 = **14** (legacy 3 + 신규 11). 자연사 (NATURAL_DEATH_VARIANTS) 의 cycle 258 chain stage 와 별개.
  - seed=0 deterministic 보존 — legacy 3 줄 (mentor / rival / friend) 을 각 kind 풀의 0 번 entry 위치에 박아 cycle 156+ 의 deterministic test fixture 회귀 0. passerby 화법은 friend[0] 으로 *재배치*, 어휘 보존 (`"친구의 부고를 멀리서 들었다 — 이름은 끝내 몰랐다"`).

- **수용 기준**:
  - **F1.1 (kind 정합)**: rival 사망 → narration 에 "라이벌" 어휘 1+ 회 + "멘토" 어휘 0 회. mentor 사망 → "멘토" 1+ + "라이벌" 0. family_spouse 사망 → "반려" 1+. 6 kind × seed=0,1,2 = 18 case 모두 통과.
  - **F1.2 (composition pipeline)**: 70세 family_spouse 사망 + heaven realm → ageTone "마지막 호흡으로" prefix + realmTone "빛의 다리" suffix 동시 결합. 산술 = 14 variant × 4 ageTone × 6 realmTone = **336 variation**. claim 풀 (600+) 과 *동일 자릿수* 의 economy 회수.
  - **F1.3 (legacy 보존)**: cycle 156-255 의 기존 deterministic test fixture (seed=0 으로 mentor 화법 1 회, rival 화법 1 회, passerby 1 회 출력) 모두 통과. legacy 3 줄이 각 kind 풀의 entry 0 위치에 박혀 있어 seed=0 reproducibility 보존.
  - **F1.4 (vitest 회귀 0)**: `pnpm --filter @forge/game-inflation-rpg test` PASS count 1553 → 1556 (+3 신규 test). 기존 test 회귀 0. typecheck PASS (callsite 3 곳의 kind 인자 추가가 typecheck 로 강제됨).
  - **F1.5 (sim parity 검증 — 미적용 사유 명시)**: 본 fix 는 *데이터 분기 + 시그니처 변경* scope. maxLevel/saint 등 곡선 측정 무관. sim-driven acceptance 0 — Δ-from-baseline 룰 / multi-seed 룰 / sim-real parity 룰 본 cycle 미적용. 사유 = 본 fix 가 narrative 단위 (NPC kind 별 어휘 정합) 인플레이션 곡선과 직교 axis.

- **반대 기준 (NOT this)**:
  - **NATURAL_DEATH pool 확장 (NOT this cycle)** — story-critic 약점 #1 의 `forDeath` 자연사 pool 1 → 5 는 **cycle 258 chain stage**. 본 cycle 은 NPC death scope 한정.
  - **ageTone/realmTone composition 의 forDeath/forRejuvenation 적용 (NOT this cycle)** — story-critic 약점 #3 의 광범위 composition 통일은 cycle 258 chain stage. 본 cycle 은 `forNpcDeath` 의 composition 만 *NPC kind 분기에 부수적으로* 적용.
  - **family event narrative 의 marriage/child_born/child_grown 확장 (NOT this cycle)** — story-critic 제안 #2 의 family event 확장은 별도 cycle. 본 cycle 의 family_spouse / family_child 는 *death 비트* 한정.
  - **NpcEntity 의 kind type union 확장 (NOT this cycle)** — 본 fix 는 *기존* kind 7 종에 분기. 신규 kind 추가 0. type 확장은 별도 spec.
  - **SeasonalModifier wire (NOT this cycle)** — `npcEncounterMul` axis 의 production wire 는 critic 권고 3 (cycle 290+). 본 cycle 의 forNpcDeath 와 무관.
  - **saint/economy balance (NOT this cycle)** — level-critic 의 `saint.atkMul` / `merciful.min` 변경은 **cycle 259 chain stage**. 본 cycle 은 balance 0 변경.

## Carry-over chain (cycle 257-260) — narrative wire chain 1차

직전 cycle 156 PRD 의 carry-over 9 슬롯 패턴 답습. 단, *우선순위* 가 아닌 **chain stage** 로 재정의 — critic #1 의 wire chain misrepresentation 비판 수용. 각 stage 가 isolated commit 단위.

| cycle | task | category | rule 9 check |
|---|---|---|---|
| **256** | F1 forNpcDeath kind bug fix | **narrative** | 255 meta → 256 narrative (전환 OK, 253 narrative 후 2 cycle 격리) |
| 257 | seed=300 chained 50-cycle sim 재현 + EternalCodex 폐기 명시 + saint regression baseline 확정 (`docs/superpowers/evolution/cycle-257-sim-baseline.md` 첨부) | balance | narrative → balance (전환 OK) |
| 258 | `NATURAL_DEATH_VARIANTS` 1 → 5 + `NarrationVariants.naturalDeath` method 신설 (`forDeath` cause=natural 분기) + ageTone/realmTone composition 적용. story-critic 약점 #1 + #3 묶음 회수 | narrative | balance → narrative (전환 OK) |
| 259 | `saint.atkMul: 2.5 → 2.8` + `saint.requiredPersonality.merciful.min: 7 → 9` (jobs.ts:39) + **≥3 seeds (1024/2048/4096) Δ-guard 검증**. baseline = cycle 257 의 seed=300 결과. | balance | narrative → balance (전환 OK) |
| **260** | **첫 10-cycle STATUS** — `STATUS-2026-05-28-cycle-260.md`. chain accountability table 첨부 (M / N axis production-consumed 형식). cycle 256-260 5 cycle 의 substantive 진척 검증. | meta | balance → meta (전환 OK) |

### Chain accountability table (cycle 260 STATUS 첨부 의무 형식)

| cycle | axis 또는 system | production-consumed | misrepresentation 회피 표현 |
|---|---|---|---|
| 256 | NPC kind 분기 in `forNpcDeath` | 1/1 (`NarrativeGenerator.forNpcDeath` 단일 entry, 3 callsite 모두 wire) | "kind axis wired" (production callsite count 명시) |
| 257 | sim baseline measurement | 1/1 (sim file 첨부 + INDEX entry) | "baseline measured, regression Δ -29% magnitude TBD" |
| 258 | NATURAL_DEATH variant + composition | 1/1 (`forDeath` cause=natural 분기, `pick → ageTone → realmTone` 통일) | "natural death composition wired (peak pool 1 → 5)" |
| 259 | saint balance + multi-seed verify | 1/1 (jobs.ts:39 변경 + sim 3 seeds Δ-guard) | "saint balance applied + Δ-guard passed (3 seeds)" |
| 260 | meta STATUS | — | "5-cycle chain accountability table 첨부" |

cycle 156-255 의 "8 분할 완성" 자축 패턴 반복 금지. 각 stage 의 wire 가 *production consumer* 가 있는지 grep 검증 결과 STATUS 에 인용 의무.

## Mega-phase carry-over 결정 (3종)

자율진화 차원의 결정. critic 권고 5 (EternalCodex ambiguous 종결) 수용 + research-critic 의 Lifebook invention 반영.

### 1. HeroDecisionAI (Sim-C scope, cycle 156 carry-over) — **Defer 유지**

- 결정: **Y** carry-over 유지하되 *cycle 단위 처리 불가* — mega-phase scope (5-cycle window 필요).
- 이유: critic #2 finding = production `decisionAI/HeroDecisionAI.ts` 의 `chooseDestination` 1 책임만 노출. spec §6.2 의 4 책임 (`chooseTargetEnemyId`/`shouldRetreat`/`chooseSkillId`/`chooseEncounterNode`) 이 production 에 부재. wire 진입점 = `decisionAI/DestinationResolver.ts:67-78` 의 weight 식에 `ctx.traits` 미사용 상태. cycle 209 의 `getActiveTraitWeights` helper 가 이미 wire 진입점 마련.
- 진입 deadline: **cycle 280** (24 cycle window). cycle 280 까지 spec/plan 미진입 시 cycle 290 강제 진입. cycle 270-279 의 critic dispatch 시 첫 grep = `pickTrait\|rollTrait\|chooseTrait` 의무화 (cycle 156 PRD 비고의 misdiagnosis surface 룰 답습).
- 본 cycle 256 처리: 0 진입. mega-phase 후보 명단 유지.

### 2. EternalCodex (web-researcher invention, cycle 156 listed) — **폐기 (Lifebook 으로 supersede)**

- 결정: **N** carry-over 명단에서 제거.
- 이유: critic 권고 5 = "100 cycle 코드 진입 0, spec/plan 부재, ambiguous listed". 사전 grep 검증 = `grep -rn "EternalCodex"` 결과 STATUS/critic md 외 production code 0. 본 cycle 256 의 research-critic invention = **Lifebook** (life-cycle axis) 이 EternalCodex 의 *도전록 axis* placeholder name 의 superset 격 — 입력 변수 (death event = age × realm × cause) 와 출력 axis (HeroDecisionAI trait roll bias + realm 별 영구 multiplier + EternalSaga narrative entry) 가 inflation 정체성 (영원한 영웅) 에 더 직접 정합. 두 invention 의 carry-over 동시 유지 = 자율진화 시스템의 invention 명단 noise 증대.
- 본 cycle 256 처리: INDEX cycle 256 entry 에 "EternalCodex 폐기 결정 (Lifebook 으로 supersede)" 박제. cycle 156 PRD 의 carry-over 명단에서 제거. STATUS-cycle-255 의 "2 mega-phase carry-over" 표현은 cycle 260 STATUS 시점에 "1 mega-phase carry-over (HeroDecisionAI) + 1 신규 invention (Lifebook)" 으로 갱신.

### 3. Lifebook (web-researcher cycle 256 신규 invention) — **신규 listed**

- 결정: **Y** carry-over 명단 신규 추가, mega-phase 후보.
- scope: *life-cycle axis*. 단일 fan-out 노드 = `(death age, realm, cause)` 3-tuple. 영웅 사망 시마다 3 시스템에 동시 fan-out — (a) HeroDecisionAI trait roll bias (과거 N 번 생의 pool 에서 유전자 bias), (b) realm 별 영구 multiplier (LifeShards 가칭, AD 의 realm-별-독립-축 변형), (c) EternalSaga 영구 narrative entry. 자세한 mechanic = `cycle-256-research.md` 의 Invention 섹션.
- 진입 deadline: **cycle 280 spec 작성, cycle 290 plan, cycle 300+ vertical slice**. HeroDecisionAI 와 동일 deadline — 두 mega-phase 가 *Lifebook 의 (a)* 에서 직접 연결되므로 같은 window 에 검토.
- 본 cycle 256 처리: 0 진입. invention 명단 등록 + INDEX 에 reference link 박제. story-critic 제안 #3 의 EternalCodex narrative slot 예약은 *Lifebook 의 (c)* 와 axis 직접 정합 — narrative slot convention 은 Lifebook 진입 시 그대로 reuse.

## 자율진화 메타-rule 갱신 (3 종 — critic 권고 5 수용)

cycle 156-255 의 100-cycle 누적 finding 을 근거로 자율진화 시스템의 운영 룰 갱신. 추상 룰 거부, 구체 수치 + 검증 가능 형식.

### 메타-rule 1 — Micro mode 비율 ≤ 30% (game-critic 권고 4)

- 정의: cycle 256-355 의 100 cycle 중 *micro mode* (1-3 line 변경, helper / invariant / UI polish-only) cycle 의 비율 ≤ 30%.
- 검증: cycle 280, 300, 320, 340 의 milestone STATUS 에 직전 20 cycle 의 micro mode count 명시. 20 회 중 micro mode ≥ 7 회 (35%) 초과 시 *다음 cycle 강제 mega-phase 또는 hero loop 본체 진입*.
- hero loop 본체 = `HeroDecisionAI` / `NarrativeGenerator` / `EncounterEngine` / `BuffSystem` / catalog (monster / equipment / skill / realm) 중 1+ 변경.
- 근거: cycle 156-255 의 helper / invariant / UI polish 비율 55%+ 였고, cycle 145 critic 의 axis 다양성 룰 9 격상 권고가 100 cycle 동안 *3 회 재발*. 30% 상한 = 카테고리 회전 룰 9 의 *axis 확장 버전*.

### 메타-rule 2 — Sim baseline 매 20 cycle 강제 (level-critic 메타-finding)

- 정의: cycle 256, 276, 296, 316, 336, 356 의 6 회 강제 sim measurement. `pnpm --filter @forge/game-inflation-rpg sim:v3 -- --chained --seed 300 --count 50` 실행 + `docs/superpowers/evolution/cycle-N-sim-baseline.md` 첨부 의무.
- 검증: 직전 측정 cycle 과의 maxLevel p50 Δ-from-baseline + saint 비율 Δ-from-baseline 명시. Δ > ±10% (자릿수) 시 다음 3 cycle 안에 origin commit bisect.
- 측정 누락 시 = 다음 cycle 의 task 우선순위 1 = sim measurement.
- 근거: cycle 156-255 의 100 cycle 동안 maxLevel baseline 측정 0 — inflation 정체성 (-29% silent regression) 의 micro polish 누적 catalyst 가 cycle 245 (deadline) 의 *완전 미발견*. cycle 17/100/156 의 측정 간격 50+ cycle 이 silent regression 의 *측정 누락 패턴*.

### 메타-rule 3 — STATUS 자축 톤 = `M === N` only (critic 권고 5 + 표류 경보 3)

- 정의: STATUS 의 "완성/landing/완결/100% 회수" 표현은 *production-consumed axis M === N* 일 때만. 부분 wire 시 *반드시* "M / N axis production-consumed, remaining R axis pending (file:line cite)" 형식.
- 검증: 각 milestone STATUS 작성 시 wire chain 의 axis count 표 첨부 의무 (cycle 260 STATUS 의 Chain accountability table 형식 답습).
- 부분 wire 표현 = "M/N wired" / "remaining R pending" / "deferred to cycle Y". *misrepresentation 회피 어휘* 박제.
- 근거: `STATUS-2026-05-28-cycle-255.md:42-45` 의 "wire chain 8 분할 완성" 자축이 cosmetic axis + claim modal 2 axis 한정 wire 를 5 axis 전부 완성으로 misrepresent. critic 의 anti-misrepresentation 권고 5 의 *실효성 있는 정의* 박제.

## 비고

### 본 PRD 의 톤 — substantive accountability

cycle 156-255 의 STATUS 자축 ("100/100 완주 ★") 의 *substance 면* 을 critic 의 #1 finding 으로 인정. 본 PRD 는 *자축 톤 회피*. cycle 256 surface = 명백 bug fix 1 종 + 메타-rule 박제 + carry-over 결정 — *progress 가 아니라 accountability* 가 본 cycle 의 1차 deliverable.

### Δ-from-baseline 룰 — 본 cycle 미적용, cycle 259 적용

본 cycle 256 의 F1 = 데이터 분기 + 시그니처 변경. sim-driven acceptance 0 — Δ-from-baseline 룰 / multi-seed 룰 미적용 (사유 = inflation 곡선과 직교 axis).

cycle 259 chain stage 의 saint nerf 는 multi-seed Δ-guard 적용:

- baseline = `saint 비율 80% (cycle 256 seed 100 chained 50)` + `maxLevel p50 4,887,360 (cycle 256 seed 100 chained 50)` + cycle 257 의 seed=300 재현 (cycle 257 stage 완료 후 확정).
- 가드 형식 (cycle 259 PRD 시점 확정): `saint 비율: baseline 80% (cycle 256 seed 100) 대비 Δ ≤ -25%p` + `maxLevel p50: baseline 4.89M (cycle 256 seed 100) 대비 Δ ≥ +0.6M`. ≥ 3 seeds (1024, 2048, 4096) 평균.
- 측정 noise 자릿수 = 약 0.02-0.04 자릿수. saint 비율 Δ 25%p 는 noise 자릿수 초과 — 단일 seed 가능하지만 maxLevel p50 Δ +0.6M 은 noise 인접 — multi-seed 필수.

### Sim-real parity 검증 룰 — 본 cycle 미적용

본 cycle 의 F1 은 sim-driven 아님. cycle 257 sim baseline 측정은 sim 단독 (Playwright dev server 무관 — sim 자체가 1차 deliverable). cycle 259 의 nerf 적용 시 PRD 에 sim driver mirror 검증 grep + Playwright dev server 1-smoke 둘 다 첨부.

### PRD 산술 충돌 사전 검증

본 cycle 의 다항 수용 기준 (F1.1 ~ F1.5) 은 *상호 보강*: kind 정합 + composition pipeline + legacy 보존 + vitest 회귀 0 + sim parity 미적용 사유. 산술 충돌 0.

### 컨셉 가드 (V3 eternal hero idle sponsor)

V3 의 *eternal hero × 인간 NPC 의 시간 비대칭* 이 NPC 4 종 + EternalSaga 의 핵심 narrative axis. forNpcDeath 의 kind 미전달 bug = mentor/rival/family 의 정체성이 무작위 화법으로 흔들리는 *정체성 손상*. F1 fix = V3 정체성 보강의 *재현 가능 bug fix*. *family_spouse 사망 시 "영웅의 회춘이 처음으로 죄스러웠다"* 한 줄이 V3 의 *eternal hero × 인간 NPC 시간 비대칭* 을 narrative 로 처음 surface. 새 캐릭터/세계관 추가 0 — persona 절대 금지 준수.

### 리스크

- **R1 (해소)**: NpcEntity['kind'] union = **6 kind** (rival/mentor/friend/family_parent/family_spouse/family_child). `games/inflation-rpg/src/types.ts:198` 사전 grep 확정. passerby 는 union 외 (legacy text label) → friend 로 재배치. Record key 6 종 정합. callsite 3 곳의 `npc.kind` 인자 = NpcEntity['kind'] 와 typecheck 정합.
- **R2 (low)**: cycle 156-255 의 deterministic test fixture 가 `pickClaimNarration` / `forNpcDeath` 의 seed=0 출력에 의존하는지 사전 grep. legacy 3 줄을 각 kind 풀의 entry 0 위치에 박아 *backward compat* 보존.
- **R3 (low)**: composition pipeline `ageTone → realmTone` 적용 시 70+ 의 "마지막 호흡으로" prefix 와 NPC kind 어휘 ("멘토가 침대에서 일어나지 못했다") 의 자연어 결합 — 의미 충돌 가능성. cycle 258 chain stage 의 NATURAL_DEATH 와 같은 composition 이라 *동일 risk*. NPC death scope 한정으로 R3 noise 작음.
- **R4 (medium — 자율진화 시스템)**: 메타-rule 3 종이 cycle 256+ 의 PRD planner / STATUS 작성에 *강제력* 을 가지려면 INDEX 에 reference + cycle 260 STATUS 의 첫 적용 예시 필요. 본 PRD 의 박제만으로 부족 — cycle 260 의 STATUS 가 *Chain accountability table 형식 답습* 까지 확인.

### 의존성

- `saga/NarrativeGenerator.ts` (cycle 156-255) — 변경 대상 line 66 (forNpcDeath signature).
- `data/narrationVariants.ts` (cycle 134-253) — 변경 대상 line 341-345 (NPC_DEATH_VARIANTS) + line 548 (pick call). composition pipeline 의 `ageTone` / `realmTone` 은 변경 0.
- `overworld/CycleControllerV2.ts` — 변경 대상 line 550, 831, 1334 (3 callsite, kind 인자 추가).
- `data/__tests__/narrationVariants.test.ts` (없으면 신설) — 신규 unit test 3 개.
- NpcEntity type — *변경 0*, kind union 의 7 종을 *그대로 사용*.

### 변경 surface 추정

| file | 변경 | 줄 수 |
|---|---|---|
| `saga/NarrativeGenerator.ts:66` | signature 1 줄 + NarrationVariants 위임 1 줄 | +1 ~ +3 |
| `data/narrationVariants.ts:341-345 + 548` | array → Record (legacy 3 + 신규 11 = 14) + pick call kind 분기 | +35 ~ +45 |
| `overworld/CycleControllerV2.ts:550, 831, 1334` | 각 callsite kind 인자 1 줄 추가 | +3 |
| `data/__tests__/narrationVariants.test.ts` | 신규 unit test 3 개 | +30 ~ +50 |
| **총** | F1 단일 sub-spec | **~65-95 줄** |

cycle 156 PRD 의 추정 (+5 ~ 10 줄) 대비 크지만 NPC kind 분기 + Record 변환 + 3 callsite + 신규 test 3 개 = sub-spec 1 의 *완결* scope. micro mode 가 아님 — 메타-rule 1 의 30% 상한 카운트에서 *본 cycle 은 micro mode 아님*.

### 검증 명령 (cycle 256 종료 시점)

- `pnpm --filter @forge/game-inflation-rpg test` — 1553 → 1556 (+3 신규 test, 회귀 0).
- `pnpm --filter @forge/game-inflation-rpg typecheck` — 0 exit (callsite 3 곳의 kind 인자 추가가 typecheck 로 강제됨).
- `grep -n "forNpcDeath" games/inflation-rpg/src/overworld/CycleControllerV2.ts` — 3 hits 모두 `kind: npc.kind` 동반 (사전: 0 hit kind 동반).
- `grep -n "NPC_DEATH_VARIANTS_BY_KIND" games/inflation-rpg/src/data/narrationVariants.ts` — Record 정의 line 1 hit + pick call line 1 hit = 2 hits.
- manual smoke (선택): dev server 10× 30 초 → mentor/rival 사망 narration 노출 → 어휘 정합 육안 확인.

### INDEX cycle 256 entry 권장 형식

```
- Cycle 256 (2026-05-28): story-critic #2 권고 — `forNpcDeath` kind-aware 분기. rival/mentor/family 사망 시 1/3 확률 잘못된 화법 출력 bug 해소 (재현 가능, deterministic). NPC_DEATH_VARIANTS 3 → 14 (Record by 6 kind, NpcEntity['kind'] union 정합 — passerby 는 friend 로 재배치). composition pipeline `pick → ageTone → realmTone` 통일. callsite 3 (CycleControllerV2.ts:550,831,1334) + signature 1 (NarrativeGenerator.ts:66). 신규 test 3. **추가**: 100-cycle critic finding 4 종 박제 — (1) EternalCodex 폐기 (Lifebook 으로 supersede), (2) HeroDecisionAI Sim-C defer (deadline cycle 280), (3) Lifebook invention 신규 listed (research-critic), (4) 자율진화 메타-rule 3 종 (micro mode ≤ 30% / sim baseline 매 20 cycle / STATUS 자축 톤 M===N only). category: narrative (255 meta 후 전환, 253 narrative 후 2 cycle 격리, 룰 9 안전). vitest 1556 (+3). cycle 256 = 새 100-cycle 의 1/100.
```

## 다음 cycle (257) 의 첫 task

1. `pnpm --filter @forge/game-inflation-rpg sim:v3 -- --chained --seed 300 --count 50` 실행 + 결과를 `docs/superpowers/evolution/cycle-257-sim-baseline.md` 에 첨부. cycle 256 seed=100 의 maxLevel p50 4.89M / saint 80% 가 seed 변동만의 noise 인지 *진짜 regression* 인지 확정.
2. INDEX cycle 156 entry 의 carry-over 명단에서 EternalCodex 제거 + Lifebook 추가 + cycle 256 PRD 결정 reference link.
3. cycle 259 PRD 사전 작성 시 본 cycle 257 의 sim baseline 결과를 Δ-from-baseline 형식의 *baseline 값* 으로 인용.

category: **balance** (cycle 256 narrative → 257 balance, rule 9 안전). vitest 1556 baseline.
