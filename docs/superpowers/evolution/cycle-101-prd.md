# Cycle 101 PRD — Realm-Specific Narrative Tone

## 한 줄
6 realm 의 narrative 어휘 차별화. cycle 35-42 의 `ageTone()` dispatcher 패턴을 realm 차원으로 확장해 battle/levelUp/drop 3 핵심 채널에 sea/volcano/underworld/heaven/chaos realm 어휘 layer 를 주입한다. cycle 52 deferred spec 의 첫 increment.

## 평가 핀포인트
- **스토리작가 (cycle 1 story-critic 3/10 → cycle 2 6/10 → cycle 3 5/10)**: `"realm 별 톤 차이가 0. base/sea/volcano/... 어디에 있든 모든 narration 이 동일 톤. enemyNameKR 만 갈리고 narrator 의 시선·문체는 그대로."` Cycle 2 의 F2 hook (realmEnter line) 으로 첫인상은 해소됐지만 `"hook 은 있고 sustain 이 없음 — 화산 진입 line 1줄 직후에도 (10세) 늑대를 압도했다 같은 들판 어휘가 그대로"`. 3 cycle 연속 등장 → 페르소나 §3-rule 의 우선순위 1 조건 충족.
- **게임비평가 (cycle 89 narrative final)**: 6 age tier × 4 variant × 9 channel = ~1080 permutation cover 완료. 그러나 realm 차원은 미터치. **age tone 의 6 tier × 4 variant 가 realm 차원과 곱해지면 ~6480 으로 진화 여지 명확**.
- **레벨디자이너**: maxLevel p50 ~6.96M (cycle 17+) 안정. balance metric 회귀 위험 0. 본 cycle 은 narrative-only — combat path 무영향.

## Baseline 측정 (Δ-from-baseline 의 근거)

**Grep evidence — realm-specific 어휘는 REALM_ENTER + SEASON_REALM_PREFIX 외 ZERO**:

```bash
grep -n "파도\|용암\|황천\|구름\|혼돈\|들판\|심해\|차가운 손" \
  games/inflation-rpg/src/data/narrationVariants.ts
```

결과 line 인용:
```
127:    (c) => `${c.age}세에 들판의 풀이 처음으로 발끝을 스쳤다.`,
128:    (c) => `${c.age}세에 바람이 동쪽에서 불어왔다 — 시작의 들판이다.`,
134:    (c) => `${c.age}세에 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다.`,
135:    (c) => `${c.age}세에 파도가 발목을 적셨다, 그 너머로 검은 물결이 솟았다.`,
143:    (c) => `${c.age}세에 멀리서 용암이 강처럼 흘렀다.`,
148:    (c) => `${c.age}세에 발 아래로 길이 사라졌다 — 황천의 입구였다.`,
149:    (c) => `${c.age}세에 빛이 꺼지고, 차가운 손이 어깨를 스쳤다.`,
155:    (c) => `${c.age}세에 발이 구름을 디뎠다 — 천공의 영토에 도달했다.`,
162:    (c) => `${c.age}세에 모든 방향이 한 점으로 모였다 — 혼돈의 중심이다.`,
172:  base: '들판 위로',
174:  volcano: '용암 위로',
176:  heaven: '구름 위로',
```

11 hit 모두 `REALM_ENTER_VARIANTS` (line 125-168) 와 `SEASON_REALM_PREFIX` (line 171-178) 안에만 존재. **BATTLE_VARIANTS / LEVELUP_VARIANTS / DROP_VARIANTS / SHRINE_*  / MORAL_VARIANTS / SKILL_VARIANTS / JOB_VARIANTS / REJUVENATION_VARIANTS 전체 catalog 에서 realm-specific 어휘 0 회**. Baseline = 0 확정.

## Cycle 35-42 의 ageTone() 패턴 — realm 차원으로 확장 방법

본 PRD 는 기존 dispatcher 패턴을 그대로 mimic 한다. 같은 shape, 다른 차원.

```
ageTone(text, age, seed):
  age === 5     → age5Tone        (3 variants, cycle 35)
  age <= 12     → ageYoungTone    (3 variants, cycle 39)
  age <= 29     → ageYoungAdultTone (3 variants, cycle 41)
  age <= 49     → ageMatureTone   (3 variants, cycle 41)
  age <= 69     → ageElderTone    (3 variants, cycle 42)
  else (70+)    → ageFinalTone    (3 variants, cycle 42)
```

`realmTone(text, realm, seed)` 도 동일 dispatcher 형태:

```
realmTone(text, realm, seed):
  realm === 'base'       → realmBaseTone       (3 variants)
  realm === 'sea'        → realmSeaTone        (3 variants)
  realm === 'volcano'    → realmVolcanoTone    (3 variants)
  realm === 'underworld' → realmUnderworldTone (3 variants)
  realm === 'heaven'     → realmHeavenTone     (3 variants)
  realm === 'chaos'      → realmChaosTone      (3 variants)
  realm === null/undef   → text (no-op)
```

차이점 (의도된 분리):
- **ageTone**: prefix `^${age}세에 ` 영역을 **replace** (예: "15세에 " → "15세 청춘에 ").
- **realmTone**: 본문 끝에 사이절 어휘를 **append** (예: ". 파도 곁에서.").

이 분리는 R3 (composition order regression) 의 mitigation. ageTone 의 regex 영역 (line head) 과 realmTone 의 영역 (line tail) 이 겹치지 않으므로 둘이 동시 적용되어도 충돌 0.

호출 sequence:

```typescript
// NarrationVariants.battle 안:
const out = pick(BATTLE_VARIANTS, ctx, seed);  // catalog 선택
const aged = ageTone(out, ctx.age, seed);       // prefix swap
return realmTone(aged, ctx.realm, seed);        // suffix append
```

Seed 한 개로 catalog / age / realm 세 차원 모두 결정 — variant 결합 ~6480 (9 channel × 6 age tier × 4 age variant × 6 realm × 4 realm variant ≈ 1080 × 6 ≈ 6480).

## 우선순위
1. **F1. `realmTone(text, realm, seed)` dispatcher + 6 realm × 4 variant catalog** — cycle 35-42 의 `ageTone()` 패턴 그대로 확장. seed=0 backward compat. ageTone 과의 composition order 강제.
2. **F2. battle / levelUp / drop 3 핵심 채널 wiring + controller realm 전달** — `CycleControllerV2` 가 `this.currentRealmId` 를 이미 보유 (line 56). 9 channel 중 가장 빈도 높은 3 채널만 우선. 나머지 6 channel 은 backlog.

(스코프 = 2 feature. 페르소나 §absolute "한 cycle 에 3 feature 초과 금지" 준수.)

## 기능 요구사항

### F1. `realmTone(text, realm, seed)` dispatcher + 6 realm × 4 variant catalog

- **목적**: `ageTone()` 의 prefix-replace 패턴을 realm 차원으로 확장. narrative 본문에 realm-specific 분위기 어휘를 주입해 sustain 부재 (cycle 2 story-critic 6/10) 해소.

- **동작**:
  - `narrationVariants.ts` 에 `realmTone(text: string, realm: RealmId, seed: number): string` 함수 추가.
  - 6 realm × 4 variant catalog. variant 0 = 원문 그대로 (backward compat). variant 1-3 = realm-specific suffix 또는 sub-clause 주입.
  - 어휘 spec (cycle 52 spec §제안 확장 — variant 0 = 원문, variant 1-3 = 신규 어휘):
    - **base**:
      - v0 = (원문 그대로 — backward compat)
      - v1 = "들판에서"
      - v2 = "바람에 흔들리며"
      - v3 = "흙냄새 속에서"
    - **sea**:
      - v0 = (원문 그대로)
      - v1 = "파도 곁에서"
      - v2 = "심해의 침묵 속"
      - v3 = "갯바람을 가르며"
    - **volcano**:
      - v0 = (원문 그대로)
      - v1 = "용암의 열기 속"
      - v2 = "검은 재 위에서"
      - v3 = "붉은 빛을 받으며"
    - **underworld**:
      - v0 = (원문 그대로)
      - v1 = "황천의 그림자 속"
      - v2 = "차가운 손 사이"
      - v3 = "꺼진 빛 너머에서"
    - **heaven**:
      - v0 = (원문 그대로)
      - v1 = "빛의 다리 위"
      - v2 = "구름의 결 사이"
      - v3 = "별빛 가루를 밟으며"
    - **chaos**:
      - v0 = (원문 그대로)
      - v1 = "혼돈의 중심에서"
      - v2 = "시간을 잊은 곳"
      - v3 = "경계가 흐려진 자리에서"
  - **Composition order 강제**: `realmTone` 은 어휘를 **본문 끝에 사이절 형태로 append** (예: `"15세에 늑대를 압도했다. 파도 곁에서."`). `ageTone` 의 `^${age}세에` prefix-replace 영역과 절대 충돌 안 함. 호출 순서는 `pick → ageTone → realmTone` (catalog → age prefix → realm suffix).
  - seed=0 → 항상 variant 0 (원문 그대로). 모든 기존 test fixture 호환.
  - `realm: null` 인 경우 (early hero spawn 전) 원문 그대로.

- **수용 기준**:
  - Δ-from-baseline (multi-seed, ≥3 seeds = 1024/2048/4096, 각 50-cycle headless sim):
    - **per-realm 어휘 출현률**: baseline 0 (cycle 100 narrationVariants catalog 측정) 대비 Δ ≥ 1 per realm visit. 즉 sea realm 진입 후 발생한 battle/levelUp/drop saga line 중 최소 1 줄 이상에 sea 어휘 (파도/심해/갯바람 중 하나) 등장.
    - **3 seed 합산 sea+volcano+underworld+heaven+chaos 5 realm 의 어휘 출현 line 수**: baseline 0 대비 Δ ≥ 15 line (즉 평균 3 line per non-base realm, 3 seeds 합산 시 5×3=15 floor).
  - Vitest unit test: 6 realm × 4 variant × seed 1-3 = 18 case 새로 추가. fixture 회귀 0 (seed=0 → variant 0 보장).
  - typecheck PASS, lint PASS, circular baseline 1 유지.

- **반대 기준 (NOT this)**:
  - REALM_ENTER_VARIANTS 추가 변형 금지 (이미 cover 됨).
  - SEASON_CHANGE catalog 수정 금지 (별도 차원).
  - `ageTone` 의 prefix-replace 의미 변경 금지 — compose only.
  - personality / saint tier / job tier 차원의 tone layer 추가 금지 (별도 cycle backlog).

### F2. battle / levelUp / drop 3 핵심 채널 wiring + controller realm 전달

- **목적**: F1 의 helper 가 실제 saga 에 출력되도록 controller 호출점에 `realm` ctx 전달. 9 channel 중 빈도 최상위 3 채널 (battle/levelUp/drop) 만 우선 wire — 나머지 6 채널 (shrine/moral/skill/job/rejuv/family) 은 backlog. **YAGNI 원칙**: 첫 increment 는 "sustain 의 핵심" 인 battle 만으로도 cycle 2 story-critic 6/10 → 7/10 회복 가능. 3 채널 wire 가 효과 검증 가능 최소 단위.

- **동작**:
  - `narrationVariants.ts` 의 `NarrationVariants.battle / levelUp / levelUpBatch / drop` ctx 에 `realm?: RealmId | null` 옵셔널 필드 추가. 호출자가 누락하면 원문 그대로 (graceful degrade).
  - `NarrativeGenerator.forBattle / forLevelUp / forLevelUpBatch / forDrop` 의 opts 에 동일 `realm?: RealmId | null` 추가.
  - `CycleControllerV2.ts` 의 4 호출점 (line 201, 211, 292, +levelUp 단일 path) 에서 `realm: this.currentRealmId` 전달.
  - 내부적으로 `pick → ageTone → realmTone(realm)` 순서. realm 이 null/undefined 이면 realmTone 우회 (원문 보존).
  - **Sim driver mirror**: `sim-cycle-v2.ts` 는 `CycleControllerV2` 를 직접 instantiate 하므로 자동 mirror — controller 의 realm 전달이 곧 sim driver 측 mirror. 별도 sim-driver 코드 변경 불필요 (advisor §1 Sim-real parity 확인 line):

    ```bash
    grep -n "currentRealmId\|NarrativeGenerator\." \
      games/inflation-rpg/src/overworld/CycleControllerV2.ts
    ```

    인용:
    ```
    56:  private currentRealmId: import('../types').RealmId | null = null;
    111:  getCurrentRealmId(): import('../types').RealmId | null { return this.currentRealmId; }
    201:          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR }, this.rng.int(100000)),
    211:            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR }, this.rng.int(100000)),
    292:        narrativeText: NarrativeGenerator.forLevelUpBatch({
    ```

    controller 가 단일 source of truth. sim ↔ real 분기 위험 0.

- **수용 기준**:
  - **Sim measurement (multi-seed ≥3 = seeds 1024/2048/4096, headless 50-cycle each)**:
    - 5 non-base realm 진입 후 발생한 battle/levelUp/drop saga line 중 realm 어휘 포함 line 수: baseline 0 대비 **3-seed 합산 Δ ≥ 30 lines** (평균 ≥ 2 lines per realm per seed × 5 realm × 3 seeds = 30 floor).
    - sea/volcano realm 단독: 각 3-seed 합산 Δ ≥ 6 lines (sea/volcano 가 cycle 17 측정 시 가장 빈번한 non-base realm — short-session UX path).
    - underworld/heaven/chaos: 각 3-seed 합산 Δ ≥ 3 lines (도달률 낮은 realm — multi-seed 합산으로도 0 인 seed 존재 허용).
    - **산술 충돌 검증 (페르소나 §rule 7)**: 5 realm × 3 seeds × 평균 도달률 ≥ 60% (cycle 17 측정 baseline) × 50 cycle × 평균 3-line 어휘 등장 가능 행수 ≈ 135 line × 0.6 = ~80 expected. Δ ≥ 30 floor 는 expected 의 ~37%, 부족 도달률 realm 까지 cover. underworld/heaven/chaos 의 Δ ≥ 3 도 도달률 20% 가정 시 3 seeds × 50 × 0.2 × 1 line ≈ 30 expected 의 10%, 충돌 없음.
  - **Sim-real parity smoke (Playwright dev server 1× 속도 90s 또는 10× 속도 30s, 페르소나 §rule 6)**: dev server 진입 후 첫 비-base realm 도달 시점부터 saga book 텍스트에 realm 어휘 ≥ 1 줄 등장 확인. **smoke 측정값 = sim 측정 metric 과 동일** (realm 어휘 line 수 ≥ 1). smoke 가 0 이면 sim PASS 가 false PASS 로 처리 → PRD 반려.
  - Vitest baseline 1236+ 유지, 신규 unit 18 + integration 3 (battle/levelUp/drop 각 1) = 총 21 추가. 회귀 0.
  - Saga book filter (한글 검색) 정상 동작 — 어휘 append 가 josa 규칙 violation 안 함.

- **반대 기준 (NOT this)**:
  - 9 channel 전체 wiring 금지 (shrine/moral/skill/job/rejuv/family 는 cycle 102+ backlog).
  - F2 wiring 이 ctx 비-realm 호출자 (예: legacy test) 를 break 하면 안 됨 — `realm?: ... | null` optional 강제.
  - `currentRealmId` getter 변경 금지 (V3-H Bug C 복구 후 stable).
  - sim driver `sim-cycle-v2.ts` 의 별도 mirror 코드 추가 금지 — controller direct instantiation 으로 자동 mirror.
  - `realmTone` 결과를 storage 에 cache 또는 memoize 금지 — 순수 함수로 stateless.

## 우선순위 외 backlog
- shrine/moral/skill/job/rejuv/family 6 channel wiring (cycle 102, F2 의 확장).
- personality tone (pious/merciful — cycle 1 story-critic 의 두 번째 약점, 1 회 등장이라 §3-rule 미충족 → backlog).
- saga book per-realm filter UI (front-end concern, cycle 86 i18n summary 와 결합).
- NPC encounter 의 realm context (cycle 3 story-critic §NPC 톤 위반 부채, D3 NPC filter 와 합쳐 cycle 103+).
- realmTone 의 age × realm matrix (예: 70+ in chaos = `"마지막 호흡으로 ... 경계가 흐려진 자리에서"`) — 별도 cycle, expected 효과 ≤ 5% line 증가, YAGNI.

## 비고

### 리스크
- **R1 — saga book filter 충돌**: `realmTone` 이 append 한 어휘 ("파도 곁에서" 등) 가 enemyNameKR/itemNameKR 한글 검색에 noise 추가 가능. mitigation = unit test 에 한글 검색 case 추가 (F2 §수용 기준).
- **R2 — multi-seed Δ unfalsifiable risk**: 도달률 낮은 realm (chaos = cycle 17 측정 ~5-10%) 은 3 seeds × 50 cycle 합산해도 entry 0 가능. Δ ≥ 3 floor 가 entry 자체 부재 시 자동 fail 처리. PRD §F2 수용 기준은 "도달한 경우" 조건부 없음 — 도달 안 하면 fail (강한 기준). cycle 88 balance snapshot 의 P1 (boss-pick weight 3→5) 후 sea+ 도달률 ~40%+ 이미 검증되어 chaos 도달은 별도 carry-over.
- **R3 — ageTone vs realmTone composition order regression**: `^${age}세에 ` prefix 가 realmTone 호출 전 이미 replace 되어야 함. 순서 강제 + unit test 의 일부 case 가 ageTone 만 / realmTone 만 / 둘 다 통과 검증.

### 의존성
- 없음. `CycleControllerV2.currentRealmId` (V3-H Bug C, cycle 81bea39) 가 이미 stable.
- `NarrativeGenerator` 의 forBattle/forLevelUp/forDrop signature 가 optional realm 추가만 — call site 9 곳 중 3 곳만 변경, 나머지 6 곳 unchanged.

### 컨셉 가드 메모
- **V3 정체성 (eternal hero idle sponsor) 무영향**: combat balance 무관, lifecycle 무관, sponsor gold 무관. narrative-only.
- **"1 → 수십만 레벨 폭발" 무영향**: maxLevel p50 측정 ≠ narrative metric. cycle 88 의 "balance 변경이 maxLevel cap 에 영향 없음" finding 적용 — narrative 변경도 동일.
- **3 의 규칙 (CLAUDE.md)**: realmTone 은 1 게임 (inflation-rpg) 에만 적용. `@forge/core` 로 승격 금지. 워크스페이스 내부 유지.

### Persona doc 8 rules 자가 검증
1. **Δ-from-baseline**: ✓ baseline 0 grep-증거 명시, Δ ≥ 1/3/15/30 형식.
2. **R1 grep query**: ✓ §F2 동작 grep + 결과 line 4 줄 인용.
3. **Multi-seed acceptance**: ✓ ≥ 3 seeds (1024/2048/4096), 합산 측정.
4. **Mode 실증 재해석**: ✓ N/A (이번 cycle 은 mode 변경 없음).
5. **Negative claim 검증**: ✓ baseline 0 가 grep-사실, 가설 아님.
6. **Sim-real parity**: ✓ §F2 grep + Playwright smoke ≥ 1 line 측정 의무.
7. **PRD 산술 충돌 사전 검증**: ✓ Δ ≥ 30 floor 와 도달률 60% baseline 의 expected 80 line 산술 확인, 충돌 없음.
8. **Sim smoke 누적 slow-down**: ✓ headless 50-cycle 유지 (cycle 20 baseline 600s 안 늘림). 신규 sim 측정은 별도 vitest case 로 작은 N (50 cycle × 3 seeds = 150 total) — 기존 default smoke 와 별 file.

### Implementation 비계 (planner → executor 인계용)
- 변경 파일 추정:
  - `games/inflation-rpg/src/data/narrationVariants.ts` — realmTone 함수 + 6 realm × 4 variant catalog + battle/levelUp/levelUpBatch/drop 4 export 의 ctx 확장.
  - `games/inflation-rpg/src/saga/NarrativeGenerator.ts` — forBattle/forLevelUp/forLevelUpBatch/forDrop 4 method 의 opts 에 realm 추가.
  - `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — line 201, 211, 292 호출점 3 곳에 `realm: this.currentRealmId` 전달.
  - `games/inflation-rpg/src/data/__tests__/narrationVariants.test.ts` (예상 path) — 18 unit + 3 integration case 추가.
  - `games/inflation-rpg/e2e/realm-tone-smoke.spec.ts` (신규) — Playwright dev server smoke, 90s @ 1× 또는 30s @ 10×.
- 변경 line 수 추정: +120 / -5. 신규 file 1 (e2e smoke).
- 예상 cycle 시간: 1 mega-phase (subagent-driven), ~6-10 task.

### 산출 후 self-check
1. `pnpm --filter @forge/game-inflation-rpg test` — vitest 1236+ → 1257+ (21 추가) PASS.
2. `pnpm --filter @forge/game-inflation-rpg e2e -- --grep "realm-tone-smoke"` — smoke PASS, realm 어휘 ≥ 1 line.
3. `pnpm circular` — baseline 1 유지.
4. `pnpm typecheck` / `pnpm lint` — 0 error.
5. cycle-101-result.md 작성 시 sim 측정 raw (per-realm line count per seed) 첨부 + smoke screenshot 또는 saga book DOM dump 첨부.
