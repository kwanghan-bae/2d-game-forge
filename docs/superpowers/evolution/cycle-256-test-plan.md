---
category: narrative
---

# Cycle 256 Test Plan — `forNpcDeath` kind-aware 분기 (F1) post-hoc 회귀 가드 + 메타-rule 3 종 측정 명령 박제

## 한 줄

PRD §F1 의 `forNpcDeath` signature 확장 (`kind: NpcEntity['kind']` required) + `NPC_DEATH_VARIANTS_BY_KIND` Record 변환 + production callsite 3 + 기존 test 호출 4 동반 수정 + 신규 unit test 4 종. **본 plan 작성 시점 = main HEAD `60c4cbd` (F1 fix 이미 commit 적용)** — plan 의 역할 = (a) 회귀 가드 baseline 박제, (b) chain 257-260 의 단계별 vitest/sim 누적 plan, (c) PRD 신규 메타-rule 3 종의 *구체 측정 명령*. 실측 vitest **1553 → 1557 (+4)**, PRD §F1.4 의 "+3" 보다 1 많음 (cycle 256 commit 의 추가 defensive test). category: narrative (255 meta → 256 narrative, rule 9 안전).

## 본 plan 의 시점

PRD 흐름은 brainstorming → spec → plan → implement. 본 cycle 256 은 **F1 fix 가 plan 작성 *전* 에 이미 commit (60c4cbd)** 된 상태로 진입. 따라서 본 plan 의 1차 역할 = *pre-implement test matrix* 가 아니라 **post-implement 회귀 가드 + chain 단계별 누적 plan + 메타-rule 측정 명령** 박제. 다음 cycle 257+ 의 plan 은 정상 흐름 (pre-implement) 복귀.

## Baseline grep evidence (cycle 256 commit 60c4cbd 직후 main HEAD, 2026-05-28 02:14)

### grep #1 — `forNpcDeath` 호출 9 hits

```bash
grep -rn "forNpcDeath" games/inflation-rpg/src/ --include="*.ts" | grep -v ".d.ts"
```

**실측**:

```
games/inflation-rpg/src/overworld/CycleControllerV2.ts:550:          narrativeText: NarrativeGenerator.forNpcDeath(
games/inflation-rpg/src/overworld/CycleControllerV2.ts:831:          narrativeText: NarrativeGenerator.forNpcDeath(
games/inflation-rpg/src/overworld/CycleControllerV2.ts:1335:          narrativeText: NarrativeGenerator.forNpcDeath(
games/inflation-rpg/src/saga/NarrativeGenerator.ts:66:  static forNpcDeath(opts: { age: number; kind: NpcEntity['kind']; realm?: RealmId | null }, seed = 0): string {
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:140:  it('F3.3: forNpcDeath → string + 3+ variant (Cycle 256: kind=mentor rotation)', () => {
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:144:      s.add(NarrativeGenerator.forNpcDeath({ age: 50 + i, kind: KINDS[i % KINDS.length]! }, i));
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:214:  it('forNpcDeath — 100 seed: leading "(N세) " prefix 부재', () => {
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:216:      const txt = NarrativeGenerator.forNpcDeath({ age: 50 + i, kind: 'mentor' }, i);
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:237:    expect(NarrativeGenerator.forNpcDeath({ age: 60, kind: 'mentor' })).toMatch(/\d+세/);
```

**해석**: 9 hits. signature 정의 1 (line 66, kind required) + production callsite 3 (CycleControllerV2.ts:550, 831, **1335** — PRD line 1334 와 1 줄 시프트, cycle 256 commit 후 file 길이 변동) + test 5 (it/describe header 2 + 실제 호출 3, 모두 kind 인자 동반). PRD §F1 의 callsite 3 + 기존 test 호출 수정 *모두 적용 완료*.

### grep #2 — `NPC_DEATH_VARIANTS_BY_KIND` Record 정의 2 hits

```bash
grep -n "NPC_DEATH_VARIANTS" games/inflation-rpg/src/data/narrationVariants.ts
```

**실측**:

```
346:const NPC_DEATH_VARIANTS_BY_KIND: Record<NpcEntity['kind'], Array<(c: { age: number }) => string>> = {
575:    const variants = NPC_DEATH_VARIANTS_BY_KIND[ctx.kind] ?? NPC_DEATH_VARIANTS_BY_KIND.friend;
```

**해석**: 2 hits — Record 정의 line 346 + npcDeath wrapper 의 pick call line 575 (defensive `??` fallback to friend). legacy `NPC_DEATH_VARIANTS` array 명은 0 hit (rename 됨, `\b` word boundary grep 검증):

```bash
grep -cn "NPC_DEATH_VARIANTS\b" games/inflation-rpg/src/data/narrationVariants.ts   # 결과: 0
```

### grep #3 — NpcEntity['kind'] union (Record key 정합)

```bash
grep -n "NpcEntity\['kind'\]\|kind: 'rival'" games/inflation-rpg/src/types.ts
```

**실측**:

```
198:  kind: 'rival' | 'mentor' | 'friend' | 'family_parent' | 'family_spouse' | 'family_child';
```

**해석**: union = **6 kind** (PRD line 51 정합, passerby 부재 — friend 로 재배치). cycle 256 commit message 의 풀 분포 = mentor *3* / rival 2 / friend 2 / family_parent 2 / family_spouse 2 / family_child 2 = **13 줄** (PRD line 51 의 14 와 1 차이, mentor 가 신규 2 가 아닌 신규 *3* 으로 commit 됨 — 본 plan 은 실측 13 기준).

### grep #4 — 음성 grep: kind 인자 미동반 호출 부재

```bash
grep -rn "forNpcDeath" games/inflation-rpg/src/ --include="*.ts" | \
  grep -v ".d.ts" | grep -v "kind:" | grep -v "static forNpcDeath\|return NarrationVariants"
```

**실측 (5 hits — 모두 multi-line 호출의 첫 줄 또는 describe header, false positive)**:

```
games/inflation-rpg/src/overworld/CycleControllerV2.ts:550:          narrativeText: NarrativeGenerator.forNpcDeath(
games/inflation-rpg/src/overworld/CycleControllerV2.ts:831:          narrativeText: NarrativeGenerator.forNpcDeath(
games/inflation-rpg/src/overworld/CycleControllerV2.ts:1335:          narrativeText: NarrativeGenerator.forNpcDeath(
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:140:  it('F3.3: forNpcDeath → string + 3+ variant (Cycle 256: kind=mentor rotation)', () => {
games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts:214:  it('forNpcDeath — 100 seed: leading "(N세) " prefix 부재', () => {
```

**해석**: production callsite 3 (line 550/831/1335) 은 multi-line 호출의 첫 줄만 매치 — 다음 줄 (`{ age, kind: npc.kind, realm }`) 에 kind 인자 동반 (실제 코드 인용으로 검증). test 2 줄은 it()/describe header (string literal). 즉 **실제 kind 미동반 호출 = 0**, 음성 grep 의 false positive 5 hits. multi-line aware 검증은 별도:

```bash
grep -A 2 "forNpcDeath(\s*$" games/inflation-rpg/src/overworld/CycleControllerV2.ts | grep "kind:" | wc -l
```

**실측: 3** (production callsite 3 모두 다음 줄에 `kind: npc.kind` 동반). 즉 kind 미동반 production callsite **0** 확정.

### grep #5 — 실측 vitest 1557 PASS

```bash
pnpm --filter @forge/game-inflation-rpg test
```

**실측 결과 (요약 줄)**:

```
 Test Files  142 passed (142)
      Tests  1557 passed (1557)
   Start at  02:16:10
   Duration  34.33s (transform 2.90s, setup 5.49s, import 6.80s, tests 43.54s, environment 2.68s)
```

**해석**: cycle 255 baseline = 1553 → cycle 256 commit 후 = **1557** (+4). PRD §F1.4 의 "+3" 보다 1 많음 (cycle 256 commit 의 추가 defensive test — commit message: "신규 unit test 4 (kind 정합 + 6 kind 모두 ≥ 1 variant defensive grep)"). 본 plan 의 chain 누적 baseline = **1557**.

## 회귀 위험

| 영역 | 기존 테스트 파일 | 위험 사유 | 본 cycle 처리 |
|---|---|---|---|
| **forNpcDeath 기존 호출 4 (typecheck 빨간색)** | `saga/__tests__/NarrativeGenerator.test.ts:140-144, 214-216, 237` | `kind: NpcEntity['kind']` required 화 시 typecheck 실패 위험 — *이미 cycle 256 commit 에서 fix 적용* (line 144 의 `KINDS[i % KINDS.length]` 회전 패턴, line 216/237 의 `kind: 'mentor'` 명시). | **해소 (60c4cbd 적용)**. 회귀 가드 = grep #1 의 9 hits 정합 유지. |
| **seed=0 deterministic 일부 변경** (passerby → friend 재배치) | NarrativeGenerator.test.ts F3.3 (line 140) | PRD line 51 의 어휘 변경 (`행인의 부고` → `친구의 부고`) — seed=0 출력 1 case 어휘 변경. | **의도** (PRD §F1.3 명시). mentor[0] / rival[0] 어휘 보존, friend[0] 의 재배치는 commit 60c4cbd 의 신규 정의 따름. |
| `forNpcEncounter` (sibling method) | NarrativeGenerator.test.ts F3.2, F3.6 (line 130, 165) | kind union = `'mentor' \| 'rival' \| 'passerby'` (NPC death 와 다른 *legacy 3 kind*). 본 cycle 변경 0 — encounter signature 손대지 않음. | **회귀 0** (commit 60c4cbd diff 검증). |
| `forFamilyEvent` (sibling method) | NarrativeGenerator.test.ts F3.4, F3.5 (line 149, 155) | type = `'marriage' \| 'child_born' \| 'child_grown'`. 본 cycle 변경 0. | **회귀 0**. |
| `forNpcDeath` 이중 prefix gate (cycle 3 회귀 가드) | NarrativeGenerator.test.ts:213-218 | `^\(\d+세\)` regex 가드. 신규 11 줄 모두 `${age}세에 ...` 자연어 prefix 컨벤션 유지 의무. | **vitest 1557 PASS 가 가드 통과 의미** (regex 위반 시 즉시 빨간색). |
| persist v22 round-trip | gameStore.persist.test.ts | 데이터 분기 + 시그니처 변경 only. persist version 변동 0 (v22 유지). | **회귀 0** (vitest 1557 PASS). |
| CycleControllerV2 3 callsite | (no direct test) | `npc.kind` 가 NpcEntity 의 정의된 field — typecheck 가 callsite 3 곳의 `kind: npc.kind` 정합 강제. | **해소 (60c4cbd 적용)**. grep #4 의 multi-line aware 검증으로 0 미동반 확정. |

## 신규 케이스 매트릭스 (cycle 256 commit 적용 분 + 향후 강화 후보)

### F1. `forNpcDeath` kind-aware 분기

신규 unit test 4 개 = `data/__tests__/narrationVariants.test.ts` 의 `describe('Cycle 256 F1 — NarrationVariants.npcDeath kind-aware 분기', ...)` block 안. 기존 it() 본문 수정 3 개 = `saga/__tests__/NarrativeGenerator.test.ts:144, 216, 237`.

| ID | 케이스 | type | 기대 결과 | 파일 / 상태 |
|---|---|---|---|---|
| F1.1 | **rival 어휘 정합 가드** | unit | `npcDeath({age, kind:'rival', realm:null}, seed)` 에 `'라이벌'` substring 1+ 회 + `'멘토'` 0 회. | `data/__tests__/narrationVariants.test.ts` — **commit 60c4cbd 신규 it #1** (`'rival 사망 → "라이벌" 어휘 등장, "멘토" 어휘 0'`) |
| F1.2 | **mentor 어휘 정합 가드** | unit | `npcDeath({age, kind:'mentor', ...}, seed)` 에 `'멘토'` 1+ + `'라이벌'` 0. | same — **commit 60c4cbd 신규 it #2** (`'mentor 사망 → "멘토" 어휘 등장, "라이벌" 어휘 0'`) |
| F1.3 | **family_spouse V3 비대칭 비트 가드** | unit | `npcDeath({age, kind:'family_spouse', ...}, seed)` 에 `'반려'` 1+ 회. eternal hero × NPC 시간 비대칭 narrative 핵심. | same — **commit 60c4cbd 신규 it #3** (`'family_spouse 사망 → "반려" 어휘 등장 (eternal hero 비대칭)'`) |
| F1.4 | **6 kind 모두 ≥ 1 variant defensive grep** | unit | `for (const kind of KINDS) { expect(NPC_DEATH_VARIANTS_BY_KIND[kind].length).toBeGreaterThanOrEqual(1); }`. Record key 6 종 정합 가드. | same — **commit 60c4cbd 신규 it #4** (`'NpcEntity 6 kind 모두 ≥ 1 variant — defensive grep'`) |
| F1.5 | **기존 호출 3 본문 수정 (회귀 가드)** | unit (existing) | `saga/__tests__/NarrativeGenerator.test.ts:144` → `KINDS[i % KINDS.length]` 회전 패턴. line 216 → `kind: 'mentor'` 명시. line 237 → 동일. describe header line 140 = string literal 변경. | **commit 60c4cbd 적용 완료** (실측 grep #1 검증, 본문 호출 3 + header 1) |
| F1.6 | **vitest 회귀 가드 (chain baseline)** | aggregate | `pnpm --filter @forge/game-inflation-rpg test` PASS = **1557** 정확. 1553 (no-op = scope drift, 60c4cbd revert 신호) / 1552↓ (회귀) / 1558↑ (scope creep, 본 cycle 256 종료 후 0 추가 의무). | repo-wide — **실측 통과** (grep #5) |
| F1.7 | **typecheck 강제 가드** | aggregate | `pnpm --filter @forge/game-inflation-rpg typecheck` 0 exit. signature `kind: NpcEntity['kind']` required + callsite 7 (production 3 + test 4) 모두 kind 인자 동반. | repo-wide — **실측 통과** (commit 60c4cbd 검증) |
| F1.8 | **runtime `??` fallback gate** (향후 강화 후보) | unit | typecheck 가 정상 path 차단하므로 cast 강제: `forNpcDeath({age:50, kind: undefined as unknown as NpcEntity['kind']}, 0)` → 빈 문자열 아님 + `'친구'` substring (friend 풀 fallback, narrationVariants.ts:575 `??`). | **commit 60c4cbd 에 미포함 (defensive 가드, cycle 257-260 chain 외 backlog)** |
| F1.9 | **composition pipeline 가드** — `realmTone` 결합 (향후 강화 후보) | unit | `forNpcDeath({age:75, kind:'family_spouse', realm:'heaven'}, 1)` 출력에 realmTone heaven 어휘 1+ ("빛" / "다리" 등). 풀 산술 = 13 variant × 6 realm = **78 variation** (PRD line 65 의 336 은 ageTone 4 곱 가정, 본 cycle commit 에는 `realmTone` 만 wire — ageTone 의 NPC death scope 적용은 cycle 258 chain stage). | **commit 60c4cbd 에 미포함, cycle 258 chain stage 의 `forDeath`/`forRejuvenation` composition 통일과 묶음 회수** |

**F1 invariant (cycle 256 commit 후 유지 의무)**:
- `NpcEntity['kind']` union 6 종 (types.ts:198) 변경 0 — Record key 정합 유지
- `NPC_DEATH_VARIANTS_BY_KIND` 의 6 kind 모두 ≥ 1 variant (F1.2 가 가드)
- cycle 3 회귀 가드 (`^\(\d+세\)` prefix 부재, NarrativeGenerator.test.ts:213-218)
- `forNpcEncounter` / `forFamilyEvent` signature 변경 0
- persist version 22 변동 0

## 검증 명령

```bash
# 1. vitest baseline 회귀 가드 (1557 정확)
pnpm --filter @forge/game-inflation-rpg test
# 기대: Tests 1557 passed (1557). 1557 외 시 회귀 또는 scope creep.

# 2. 영역 좁은 실행 (F1 신규 test 확인)
pnpm --filter @forge/game-inflation-rpg test src/saga/__tests__/NarrativeGenerator

# 3. typecheck — kind required 화 가 callsite 7 강제
pnpm --filter @forge/game-inflation-rpg typecheck

# 4. grep evidence #1 — forNpcDeath 호출 9 hits 모두 kind 정합
grep -rn "forNpcDeath" games/inflation-rpg/src/ --include="*.ts" | grep -v ".d.ts"
# 기대: 9 hits. signature 1 + production 3 + test 5 (describe/it header 2 + 실제 호출 3, 모두 kind 동반).

# 5. grep evidence #2 — NPC_DEATH_VARIANTS_BY_KIND Record 정의 + pick call
grep -n "NPC_DEATH_VARIANTS_BY_KIND" games/inflation-rpg/src/data/narrationVariants.ts
# 기대: 2 hits (Record 정의 line 346 + npcDeath wrapper pick call line 575)

# 6. grep evidence — legacy array 명 rename 검증
grep -cn "NPC_DEATH_VARIANTS\b" games/inflation-rpg/src/data/narrationVariants.ts
# 기대: 0 hit

# 7. 음성 grep (multi-line aware) — kind 미동반 production callsite 부재
grep -A 2 "forNpcDeath($" games/inflation-rpg/src/overworld/CycleControllerV2.ts | grep "kind:" | wc -l
# 기대: 3 (production callsite 3 모두 다음 줄에 kind 동반)

# 8. lint / circular (cycle 종료 의무)
pnpm --filter @forge/game-inflation-rpg lint
pnpm circular

# 9. (선택) dev smoke — 수동 검증
pnpm --filter @forge/game-inflation-rpg dev
# → http://localhost:3000/inflation-rpg → cycle 자동 진행 5+ 분 → NPC 사망 narration 어휘 정합 육안:
#    mentor → '멘토' 있음 + '라이벌' 없음 / rival → 반대 / family_spouse → '반려' 있음
```

## 통과 기준

- **vitest pass rate**: 100%, count = **1557** 정확. 1553 → 60c4cbd revert 신호, 1552↓ → 회귀, 1558↑ → scope creep.
- **typecheck**: 0 exit. signature `kind: NpcEntity['kind']` required 화 + callsite 7 모두 kind 인자 동반.
- **lint / circular**: 0 exit. data + saga + overworld + test file 변경 only — boundary 영향 0.
- **grep evidence (post-commit)**:
  - grep #1 `forNpcDeath` → **9 hits** (signature 1 + production 3 + test 5)
  - grep #2 `NPC_DEATH_VARIANTS_BY_KIND` → **2 hits**
  - grep #3 legacy `NPC_DEATH_VARIANTS\b` → **0 hit**
  - grep #4 multi-line aware kind 동반 → **3 / 3** (production callsite 모두 kind 동반)
- **manual smoke (선택)**: dev server NPC 사망 narration 어휘 정합 육안.
- **e2e**: 추가 없음. 기존 chromium + iphone14 100% PASS 유지 (텍스트 데이터 + signature 변경 단위, e2e 영향 0).
- **headless sim**: 측정 없음. PRD §"Δ-from-baseline 룰 미적용" + §"Sim-real parity 룰 미적용" 직접 회수.

## Sim-real parity 룰 적용 면제 사유 (PRD §168 직접 회수)

본 cycle 은 **sim-driven acceptance 0**. F1 acceptance 모두 unit test + typecheck + grep 단위. sim driver mirror 의무 / Playwright dual evidence 의무 모두 면제. 본 cycle 의 F1 = 데이터 분기 + 시그니처 변경 — *inflation 곡선과 직교 axis*. 향후 cycle 257 (sim baseline 측정) / cycle 259 (saint nerf multi-seed) 진입 시점에서 sim-real parity 룰 정식 적용.

## Chain 257-260 vitest / sim 누적 plan

PRD §"Carry-over chain (cycle 257-260)" 의 단계별 측정값 사전 박제.

| cycle | 변경 type | vitest delta | vitest 누적 | sim file 첨부 | category | rule 9 check |
|---|---|---|---|---|---|---|
| 256 | F1 narrative (data + signature + test +4) | **+4 (실측)** | **1557** | 없음 | narrative | 255 meta → 256 narrative OK |
| 257 | sim baseline (seed=300 chained 50) | 0 | 1557 | `cycle-257-sim-baseline.md` 의무 | balance | 256 narrative → 257 balance OK |
| 258 | NATURAL_DEATH 1→5 + composition (forDeath cause=natural 분기) | **+N** (≥3 신규 예상) | **≥1560** | 없음 | narrative | 257 balance → 258 narrative OK |
| 259 | saint nerf (jobs.ts:39 + multi-seed Δ-guard sim) | **+M** (0~2, sim file 첨부 시 vitest 변동 0) | **≥1560** | `cycle-259-saint-nerf-sim.md` 의무 (≥3 seeds: 1024/2048/4096) | balance | 258 narrative → 259 balance OK |
| 260 | meta STATUS (5-cycle chain accountability table) | 0 | ≥1560 | 없음 | meta | 259 balance → 260 meta OK |

**핵심 가드**: cycle 260 STATUS 작성 시 위 표가 *production-consumed* 형식으로 첨부 (PRD §메타-rule 3 의 misrepresentation 회피 어휘 "M/N wired", "remaining R pending"). cycle 156-255 의 "8 분할 완성" 자축 패턴 반복 금지.

## 메타-rule 3 종 검증 명령 (PRD 신규, cycle 256 부터 효력)

PRD §"자율진화 메타-rule 갱신" 의 추상 정의 → *구체 측정 명령* 박제.

### 메타-rule 1 — Micro mode 비율 ≤ 30%

분류 의무 = PRD 작성자가 §"변경 surface 추정" 표에 micro 여부 명시. cycle 256 PRD line 204 = "micro mode 가 아님 — 메타-rule 1 의 30% 상한 카운트에서 본 cycle 은 micro mode 아님" 박제 패턴 답습.

```bash
# 분류 룰: PRD 의 §"변경 surface 추정" 총 줄 수
#   - micro mode = 총 변경 ≤ 10 줄 OR helper/invariant/UI polish only
#   - non-micro = 총 변경 > 10 줄 (본 cycle 256 = ~65-95 줄 예상, 실측 commit 60c4cbd diff = stat 대조 — non-micro)

# 측정 명령 (cycle 280 milestone 시점, 직전 20 cycle 분류 카운트):
ls docs/superpowers/evolution/cycle-{261..280}-prd.md | wc -l   # 20 PRD 존재 검증
grep -l "micro mode\|+1 ~ +3\|1-line\|invariant only" docs/superpowers/evolution/cycle-{261..280}-prd.md | wc -l
# 기대: 결과 ≤ 6 (30% 상한). 20 회 중 micro ≥ 7 회 (35%+) 시 위반 → 다음 cycle 강제 mega-phase
```

위반 시 강제 액션 = "다음 cycle 의 task 우선순위 1 = mega-phase 또는 hero loop 본체 진입 (HeroDecisionAI / NarrativeGenerator / EncounterEngine / BuffSystem / catalog 중 1+)".

### 메타-rule 2 — Sim baseline 매 20 cycle 강제

```bash
# 측정 명령 (각 milestone cycle 277/297/317/337/357 의 첫 task):
for cycle in 257 277 297 317 337 357; do
  if [ -f "docs/superpowers/evolution/cycle-${cycle}-sim-baseline.md" ]; then
    echo "cycle ${cycle}: OK"
  else
    echo "cycle ${cycle}: MISSING — 다음 cycle task 우선순위 1 = sim measurement"
  fi
done

# sim 실행 명령 (cycle 257 의 첫 task):
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --chained --seed 300 --count 50
# 결과 → `docs/superpowers/evolution/cycle-257-sim-baseline.md` 첨부 의무
# 첨부 형식: maxLevel p50 / p90 / p10 + job distribution (saint 비율 포함) + magnitude vs cycle 256 의 seed=100 baseline (4.89M / 80%)
```

cycle 277 시점에서 측정 누락 시 cycle 278 의 task 우선순위 1 = sim measurement 강제.

### 메타-rule 3 — STATUS 자축 톤 = `M === N` only

```bash
# 측정 명령 (각 milestone STATUS 작성 후):
# dual grep — (a) 자축 표현 출현 카운트 N1 + (b) Chain accountability table 행 카운트 N2

grep -nE "완성|landing|완결|100%|★" \
  docs/superpowers/evolution/STATUS-2026-05-28-cycle-260.md
# 결과: 자축 어휘 hit 카운트 N1

grep -nE "production-consumed|M / N|axis count|wired chain|chain accountability" \
  docs/superpowers/evolution/STATUS-2026-05-28-cycle-260.md
# 결과: 분류 표 hit 카운트 N2

# 가드: N1 > 0 일 때 N2 ≥ N1 (자축 표현마다 accountability table 행 1+ 필요)
```

위반 판정 = 자축 어휘 출현 (N1 > 0) + accountability table 부재 (N2 == 0). cycle 260 STATUS 의 첫 적용 예시가 본 룰의 *실효성 시범*.

## 수동 검증 명령 (선택 — PRD §F1.5 manual smoke)

```bash
# 1. dev server 띄우기
pnpm --filter @forge/game-inflation-rpg dev

# 2. http://localhost:3000/inflation-rpg 진입, 자동 cycle 5+ 분 진행
# 3. cycle 진행 중 NPC 사망 narration 5+ 회 노출 시 어휘 정합 육안:
#    - mentor 사망: '멘토' 어휘 있음 + '라이벌' 없음
#    - rival 사망: '라이벌' 어휘 있음 + '멘토' 없음
#    - family_spouse 사망: '반려' 어휘 있음 + (선택) '회춘이 처음으로 죄스러웠다' 비트 1+ 회

# 4. (선택) Playwright snapshot — 의무 0
#    cycle 256 PRD §"Sim-real parity 룰 미적용" 직접 회수
```

## DoD 요약 (cycle 256 commit 60c4cbd 적용 분 + 본 plan 박제 분)

### 코드 변경 (60c4cbd 적용 완료)
- `saga/NarrativeGenerator.ts:66` signature 변경 — `kind: NpcEntity['kind']` required 추가
- `data/narrationVariants.ts:346` array → Record by 6 kind (legacy 3 + 신규 10 = **13 variant**, commit 분포: mentor 3 / rival 2 / friend 2 / family_parent 2 / family_spouse 2 / family_child 2)
- `data/narrationVariants.ts:575` npcDeath wrapper kind 분기 + `??` defensive fallback (friend 풀)
- `overworld/CycleControllerV2.ts:550, 831, 1335` 3 production callsite kind 인자 추가
- `saga/__tests__/NarrativeGenerator.test.ts:140 (describe header) + 144/216/237 (호출 3)` 본문 수정 (vitest count 변동 0)
- 신규 unit test 4 종 — `data/__tests__/narrationVariants.test.ts` 의 `describe('Cycle 256 F1 ...')` block 안: F1.1 rival / F1.2 mentor / F1.3 family_spouse / F1.4 6 kind defensive grep → vitest 1553 → **1557** (+4)
- typecheck / lint / circular 0 exit

### 본 plan 의 박제 (회귀 가드 + 메타-rule 측정 명령)
- grep #1~#5 baseline (post-commit 시점)
- chain 257-260 의 vitest/sim 누적 plan 표
- 메타-rule 3 종 (micro mode ≤ 30% / sim baseline 매 20 cycle / STATUS 자축 톤 M===N) 의 구체 측정 명령
- F1.7 (runtime `??` fallback gate) 와 F1.8 (composition pipeline) 의 향후 강화 후보 surface (cycle 258 chain stage 묶음 회수)

## 마무리 한 줄

> cycle 256 = **F1 단일 sub-spec (60c4cbd 적용 완료, ~65-95 줄 commit) + post-hoc 회귀 가드 + 메타-rule 3 종 측정 명령 박제**. deliverable 무게 = (1) story-critic #2 의 재현 가능 bug (rival 1/3 확률 멘토 화법) 해소 + V3 정체성 (eternal hero × 인간 NPC 시간 비대칭) narrative 비트 surface, (2) PRD §메타-rule 의 추상 정의 → 구체 측정 명령 변환, (3) chain 257-260 단계별 vitest/sim 누적 plan 사전 박제로 cycle 260 STATUS 의 *substantive accountability* 형식 의무화. 본 plan 의 정직성 = baseline grep evidence 5 종 모두 실측 (cycle 156 test-plan 의 답습 형식) + PRD 의 산수 (vitest +3, 14 variant) 와 commit 실측 (+4, 13 variant) 차이 명시. micro mode 아님 (메타-rule 1 의 30% 상한 카운트 제외). category: narrative (255 meta → 256 narrative, 253 narrative 후 2 cycle 격리, rule 9 안전).
