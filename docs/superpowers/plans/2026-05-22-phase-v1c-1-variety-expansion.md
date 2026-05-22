# Phase V1c-1: Variety Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. TDD per task.

**Goal:** STATUS-2026-05-21.md §2 의 3 known limit 중 2개 — sage fallback 지배 + sponsorGold 비효용 — 를 해결한다. RNG axes / balance fix 는 V1c-2 로 분리.

- Cycle 마다 5 dim 모두 drift 가능 → tier-3 직업이 sage 외에도 자연히 unlock
- sponsorGold 가 endCycle 직후 자동 spend → 메타 누적이 실제 cycle outcome 에 반영 (현재는 누적만, spend 시점 없음)

**Architecture:** V1a/V1b 의 `CycleControllerV2.handleArrival` flow 에 새 LandmarkKind 5개를 얹는다. `moral_choice` event type 의 `dim: PersonalityDim` 필드가 이미 5 dim 모두 지원 — 새 event type 불필요. `DestinationResolver.WEIGHT_BASE` 가 `Record<LandmarkKind, number>` 라 새 kind 추가 시 컴파일 에러로 강제됨. AI weighting + placement count + drift magnitude 의 곱이 criterion #4 (5 dim × ±6 ≥5 hero) 를 deterministic 하게 만족시키도록 설계.

**중요한 제약 (HeroSpawner 검사 결과):**
- `HeroSpawner.spawn` 은 **2 dim 만** non-zero prior 부여 (range ±[1,5]). 나머지 3 dim 은 0 시작.
- 새 landmark 는 `consumed=true` 후 respawn 안 됨 (enemy 만 respawn) → cycle 당 1 instance 1 visit.
- 따라서 각 새 kind 별 **2 instance 배치** + **drift ±3** 로 prior=0 dim 도 2 visit × ±3 = ±6 달성 가능.
- 각 encounter 는 `consumeBp(0)` + damage 없음 → criterion #3 (자연사 ≥80%) 영향 없음.
- 모든 RNG 는 `SeededRng` 사용 (determinism 유지).

**Tech Stack:** TypeScript / Vitest / Phaser (view only — 새 landmark 의 emoji 만 OverworldScene 이 자동 렌더링). Zustand 5 (persist v18 그대로 — 신 schema 변경 없음).

---

## V1c-1 Success Criteria (모두 통과해야 main 머지)

200-cycle sim (`scripts/sim-cycle-v2.ts --count 200 --seed 1 --md-every 50`):
1. **jobsUnlocked 다양성**: sage 비율 **< 50%** (V1b baseline ~99%). 최종 job 종류 **≥ 6**.
2. **maxLevel P50 ≥ 1,000** 유지 (Sim-G success bar 회귀 금지).
3. **자연사 ≥ 80%** 유지.
4. **personality drift 다양성**: 5 dim 각각 ±6 이상 도달 hero ≥ 5명.
5. **858+ vitest / typecheck / lint / build:web clean**, migration e2e PASS.

---

## Task Breakdown

각 task = 1 subagent dispatch + spec compliance review + code quality review.

### Task 1 — New LandmarkKinds + LANDMARK_TYPES + WEIGHT_BASE

**Files:**
- Modify: `games/inflation-rpg/src/data/landmarks.ts`
- Modify: `games/inflation-rpg/src/decisionAI/DestinationResolver.ts`
- Test: `games/inflation-rpg/src/data/__tests__/landmarks.test.ts` (신규)
- Test: `games/inflation-rpg/src/decisionAI/__tests__/DestinationResolver.test.ts` (기존 update 또는 신규)

새 LandmarkKind 4개 추가 (`merciful` 은 새 kind 없이 battle_won proc 으로 처리):
- `watchtower` — heroic drift
- `treasure_cave` — prudent drift
- `holy_ruin` — pious drift
- `crossroads` — moral drift (cave/ruin 와 별개)

**Steps:**
- [ ] **Step 1**: `landmarks.ts` 의 `LandmarkKind` union 에 4 새 kind 추가
- [ ] **Step 2**: `LANDMARK_TYPES` 에 4 새 entry 추가 (id/nameKR/emoji/kind):
  - watchtower 🗼 망루 — heroic
  - treasure_cave 💎 보물동굴 — prudent
  - holy_ruin ⛩️ 신성유적 — pious
  - crossroads 🚦 갈림길 — moral
- [ ] **Step 3**: `DestinationResolver.WEIGHT_BASE` 에 4 새 kind 의 base weight 추가 (각 3) — 컴파일러가 강제
- [ ] **Step 4**: WEIGHT_BASE 가중치 — 새 kind 별 personality dim 가중치 추가 (`watchtower` → `heroic` × 0.8, etc.) — 깊게 안 가도 됨, base 만으로도 visit OK
- [ ] **Step 5**: 새 테스트 — `LANDMARK_TYPES` 가 새 kind 모두 포함하는지, `WEIGHT_BASE` 가 모든 kind 의 entry 가짐
- [ ] **Step 6**: `pnpm --filter @forge/game-inflation-rpg typecheck && test` clean

### Task 2 — Personality encounters catalog

**Files:**
- Create: `games/inflation-rpg/src/data/personalityEncounters.ts`
- Test: `games/inflation-rpg/src/data/__tests__/personalityEncounters.test.ts`

각 dim 별 encounter spec — sign-branched choice (양수 prior → 한 분기 / 음수 또는 0 prior → 반대 분기). Drift magnitude **±3**.

```ts
// personalityEncounters.ts
import type { PersonalityDim } from '../hero/PersonalityState';
import type { LandmarkKind } from './landmarks';

export interface PersonalityEncounter {
  kind: LandmarkKind;
  dim: PersonalityDim;
  /** Positive branch: choice id, narrative nameKR template, drift magnitude. */
  positive: { choice: string; nameKR: string; delta: number };
  /** Negative branch: choice id, narrative nameKR, drift magnitude (already negative). */
  negative: { choice: string; nameKR: string; delta: number };
}

export const PERSONALITY_ENCOUNTERS: readonly PersonalityEncounter[] = [
  {
    kind: 'watchtower', dim: 'heroic',
    positive: { choice: 'defend_village', nameKR: '망루에서 마을을 지켜 영웅의 길을 따랐다', delta: +3 },
    negative: { choice: 'flee_attack',     nameKR: '습격을 피해 도망쳐 비겁의 그림자를 안았다', delta: -3 },
  },
  {
    kind: 'treasure_cave', dim: 'prudent',
    positive: { choice: 'safe_path',      nameKR: '의심스러운 보물을 멀리하여 신중함을 길렀다', delta: +3 },
    negative: { choice: 'reckless_greed', nameKR: '위험한 보물에 손대며 충동이 깊어졌다',       delta: -3 },
  },
  {
    kind: 'holy_ruin', dim: 'pious',
    positive: { choice: 'deep_prayer', nameKR: '폐허의 제단에서 깊은 기도로 신앙이 두터워졌다', delta: +3 },
    negative: { choice: 'skip_ritual', nameKR: '신성한 유적을 외면하며 세속에 가까워졌다',     delta: -3 },
  },
  {
    kind: 'crossroads', dim: 'moral',
    positive: { choice: 'help_traveler', nameKR: '길 위 행인을 도와 영혼이 정화되었다', delta: +3 },
    negative: { choice: 'rob_traveler',  nameKR: '길 위 행인을 약탈하여 영혼이 어두워졌다', delta: -3 },
  },
];

/** Decides branch by current personality value on the encounter's dim.
 *  >= 0 → positive (이미 양수 또는 중립 → 강화). < 0 → negative. */
export function selectBranch(current: number, enc: PersonalityEncounter):
  { choice: string; nameKR: string; delta: number } {
  return current >= 0 ? enc.positive : enc.negative;
}
```

**Steps:**
- [ ] **Step 1**: 신규 테스트 — 5 dim 중 4 dim cover (heroic/prudent/pious/moral) 각 1 entry, selectBranch 가 sign 분기
- [ ] **Step 2**: 구현
- [ ] **Step 3**: typecheck && test clean

**Note:** `merciful` dim 은 새 landmark 없이 Task 4 의 battle_won proc 으로 처리.

### Task 3 — mapLayout placement

**Files:**
- Modify: `games/inflation-rpg/src/overworld/mapLayout.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/` 의 mapLayout 관련 테스트 (있다면)

각 새 kind 별 **2 instance** 배치 (cycle 당 2 visit 가능 → prior=0 dim 도 ±6 도달).

**Steps:**
- [ ] **Step 1**: 신규 테스트 — `generateMapLayout(seed)` 결과에서 4 새 kind 각 ≥ 2 placement
- [ ] **Step 2**: 4 새 kind × 2 instance 배치 (zone 분포 적절히 — watchtower 마을 근처, treasure_cave 산악, holy_ruin 신비, crossroads 평원)
- [ ] **Step 3**: typecheck && test clean

### Task 4 — EncounterEngine wire new kinds + battle_won merciful proc

**Files:**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts`
- Test: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts` (신규)

**Steps:**
- [ ] **Step 1**: 신규 테스트 — 4 새 kind 각각 `moral_choice` event 를 적절한 dim/delta 로 발행
- [ ] **Step 2**: `resolveEncounter` 에 4 새 kind branch 추가 — `PERSONALITY_ENCOUNTERS` lookup → `selectBranch` → `hero.personality.adjust(dim, delta)` → `events.push({ type: 'moral_choice', choice, dim, delta, nameKR })` → `hero.consumeBp(0)` (damage 없음)
- [ ] **Step 3**: 신규 테스트 — `enemy` 처치 후 (잡몹 한정, boss 제외) merciful proc 가 fire 하는 시나리오
- [ ] **Step 4**: `resolveEncounter` 의 `enemy` branch 의 `battle_won` 직후, **잡몹 한정 + `rng.chance(0.15)`** 일 때 merciful proc 발행:
  - 현재 `merciful` 값 ≥ 0 → 'spare_enemy' nameKR '쓰러진 적을 살려보내며 자비가 깊어졌다' delta +3
  - < 0 → 'execute_enemy' nameKR '쓰러진 적을 처형하여 잔혹함이 굳어졌다' delta -3
- [ ] **Step 5**: typecheck && test clean

### Task 5 — SponsorGold auto-spend in cycleSliceV2

**Files:**
- Modify: `games/inflation-rpg/src/overworld/cycleSliceV2.ts`
- Test: `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.autoSpend.test.ts` (신규)

`endCycle` 의 sponsorGold 누적 직후, **누적된 총 sponsorGold 를 'balanced' strategy 로 spend** → `atkBaseBonus` / `hpBaseBonus` 증가 + remaining gold 가 새 sponsorGold.

**중요:** sim 격리 검증 — `scripts/sim-cycle-v2.ts` 는 store 안 거치고 ctrl 직접 만드므로 auto-spend 안 일어남. comparison 결과 영향 없음. (기존 multi-scenario sim 은 자체 spend strategy 사용.)

**Steps:**
- [ ] **Step 1**: 신규 테스트 — `endCycle` 후 store 의 `sponsorGold` 감소 / `atkBaseBonus` 또는 `hpBaseBonus` 증가 (spend output 반영)
- [ ] **Step 2**: `endCycle` 에 `spend({ gold: total, atkBaseBonus: meta.atkBaseBonus, hpBaseBonus: meta.hpBaseBonus, strategy: 'balanced' })` 추가
- [ ] **Step 3**: `useGameStore.setState` 결과 = `{ sponsorGold: out.goldRemaining, atkBaseBonus: out.atkBaseBonus, hpBaseBonus: out.hpBaseBonus }`
- [ ] **Step 4**: typecheck && test clean

### Task 6 — CyclePrepV2 표시 업데이트

**Files:**
- Modify: `games/inflation-rpg/src/screens/CyclePrepV2.tsx`

자동 spend 결과를 보이게 — 기존 "ATK+0 HP+0" 표시는 V1b 에서 추가됐음. atk/hpBaseBonus 가 실제 변하는지만 확인 + 텍스트 자연스럽게 (예: "후원금: N gold / 영구 ATK+N HP+N").

**Steps:**
- [ ] **Step 1**: 컴포넌트 read + meta state 의 atk/hpBaseBonus 표시 확인 + 필요시 라벨 자연스럽게
- [ ] **Step 2**: typecheck && test clean (existing tests)

### Task 7 — Sim 검증 (criteria #1-5)

**Files:**
- 신규: `docs/superpowers/reports/2026-05-22-phase-v1c-1-report.md`

**Steps:**
- [ ] **Step 1**: `pnpm --filter @forge/game-inflation-rpg typecheck && test && lint && build:web` 모두 clean (criterion #5)
- [ ] **Step 2**: `pnpm --filter @forge/game-inflation-rpg exec npx tsx scripts/sim-cycle-v2.ts --count 200 --seed 1 --md-every 50 --out-dir runs/2026-05-22-v1c1` 실행
- [ ] **Step 3**: `runs/2026-05-22-v1c1/summary.json` 분석 — criteria #1-4 확인. 미통과 시 advisor 호출.
  - **#1** `summary.jobsUnlocked` 에서 sage 비율 + 종류 ≥ 6
  - **#2** `summary.maxLevel.p50 ≥ 1000`
  - **#3** `summary.endCauses.자연사 ≥ 160` (200 의 80%)
  - **#4** 각 results 의 `personality` snapshot 분석 — 5 dim 별 |값| ≥ 6 hero 카운트 ≥ 5
- [ ] **Step 4**: migration e2e (`pnpm --filter @forge/game-inflation-rpg exec playwright test tests/e2e/v9-migration.spec.ts`) PASS 확인
- [ ] **Step 5**: 보고서 작성 — Sim-G v1a 보고서 패턴 따름 (요약 / 변경 / criteria 결과 / 다음 단계)

### Task 8 — Finishing

**Steps:**
- [ ] **Step 1**: 모든 변경 commit 정리 (feature commit + report commit + plan commit 별도)
- [ ] **Step 2**: `--no-ff` main 머지 (브랜치 유지)
- [ ] **Step 3**: `phase-v1c-1-complete` tag
- [ ] **Step 4**: `STATUS-2026-05-22.md` 신규 작성 — 다음 세션 진입점. V1c-2 진행 여부 (advisor 합의) 에 따라 §4c 도 적절히.
- [ ] **Step 5**: Memory update — `project_session_2026_05_22_v1c1.md` + MEMORY.md index
- [ ] **Step 6**: V1c-2 진행 결정 — 시간 여유 + criteria 통과 시 advisor 와 합의 후 진행. 미진행 시 종료.

---

## Risks / mitigation

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Criterion #2 회귀 (maxLevel P50) — 새 landmark 가 BP 안 먹어도 enemy 방문 share 줄어 indirectly | Med | 첫 sim round 후 P50 측정. 1000 margin 은 14K 대비 1.4% — 충분. 떨어지면 placement 줄임 (2→1). |
| Criterion #3 회귀 (자연사) — 새 encounter 가 damage 의도치 않게 추가 | Low | `consumeBp(0)` + damage 없음 강제. EncounterEngine.personality.test.ts 가 boundary 검증. |
| Criterion #4 미달 — drift 가 부족 | Med | 2 instance × ±3 drift = ±6 (deterministic worst case). prior +5 dim 은 1 visit 으로 +8 달성. 미달 시 instance 3 로 증가 또는 drift 매그니튜드 +4 로 조정. |
| Sim 격리 깨짐 — auto-spend 가 sim 결과 오염 | Low | sim-cycle-v2.ts 는 store 안 거침 — `runSimV2` 가 `CycleControllerV2` 직접 instantiate. cycleSliceV2.endCycle 만 store 변경. |
| V1c-2 미진행 결정 — criterion #6 (strategy 별 maxLevel 차이) 평가 안 됨 | N/A | V1c-1 이 #6 안 가짐. V1c-2 로 명시 분리됨. |

---

## Out of scope (V1c-2 또는 그 이후)

- 곡선 tune (k_eHp / BOSS_MUL) — V1c-2 (B)
- RNG axes (crit / drop tier / variance) — V1c-2 (C)
- multi-scenario maxLevel divergence 측정 — V1c-2 (E2 + criterion #6)
- UI cinematic / saga book viewer / spend gold UI — STATUS §4b
- v2-vertical-slice e2e timeout fix — STATUS §2e
- V2 narrative depth (rivals / mentors / family) — STATUS §4d

---

## 자율 세션 시간 박스

- V1c-1 만 완료 후 stop = OK (3-4h)
- V1c-1 + V1c-2 = bonus (6h hard cap)
- 미수렴 시 STATUS update 하고 stop, advisor 보고 포함

— Plan author: Claude Code 자율 세션 (2026-05-22)
