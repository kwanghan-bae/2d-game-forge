# Cycle 2 Partial — Process Change (F1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Cycle 2 PRD 의 **F1 (Multi-seed Acceptance 룰 persona doc 패치)** 만 implement 후 머지. F2 (eternal hero 회춘) + F3 (narrative variance pass) 는 cycle 3 carry-over (자원 추정 soft-halt 신호 회피용 partial scope).

**Architecture:** 순수 docs 변경 — `docs/personas/01-game-planner.md` 의 "절대 금지" 또는 "사고 방식" 섹션에 multi-seed + Δ-from-baseline 룰 추가. 코드 변경 0.

**Why partial?** cycle 2 평가 → PRD → 검증설계 까지 진행 누적 + cycle 1 의 9-task subagent dispatch 가 ~80% context 소비. 자원 추정 trigger (cycle 1 result.md halting condition) — cycle 2 의 F2/F3 까지 끝까지 가면 hard halt 가능성. F1 만 머지 후 cycle 3 carry-over 가 정직.

**Spec / PRD:** `docs/superpowers/evolution/cycle-2-prd.md` (특히 F1 섹션).

---

## Task 1: Planner persona doc 패치 + cycle-3 backlog 갱신

**Files:**
- Modify: `docs/personas/01-game-planner.md` (multi-seed + Δ-from-baseline 룰 추가)
- Modify: `docs/superpowers/evolution/cycle-2-backlog.md` (cycle 3 carry-over 명세 — F2/F3 의 cycle 3 scope 명시) — 없으면 create

- [ ] **Step 1: 01-game-planner.md 의 "사고 방식" 섹션 확인 + Δ-룰 추가**

기존 4 bullet (컨셉의 일관성 / 3 의 규칙 / YAGNI / 승격 기준) 아래에 추가:

```markdown
- **Δ-from-baseline 룰 (Cycle 1 yellow flag 결과)**: sim-driven acceptance criterion 은 반드시 cycle N-1 (또는 cycle 0) 의 sim 실측 baseline 을 명시하고 Δ-from-baseline 형식으로 작성한다. 절대값 (예: `maxLevel p50 ≥ 750k`) 금지. 정확한 형식: `<metric>: baseline <X> (cycle <Y> seed <Z>) 대비 Δ <≥/≤> <delta>`.
- **Multi-seed acceptance (Cycle 2 finding)**: 단일 seed 50-cycle V3 sim 의 measurement noise 는 약 0.02-0.04 자릿수. Δ-guard threshold 가 그 자릿수보다 같거나 작으면 단일 seed sim 으로 측정 불가. 그 경우 PRD 의 수용 기준은 **≥ 3 seeds (예: 1024, 2048, 4096) 의 결과를 합산 또는 평균** 으로 측정해야 한다.
```

- [ ] **Step 2: "절대 금지" 섹션에 한 줄 추가**

```markdown
- sim-driven acceptance 의 **절대값 가드** (cycle 0 baseline 측정 없는 가설) — 반드시 Δ-from-baseline 형식. Cycle 1 의 3 recalibration (F1.13/F1.15/F3.14) 의 root cause.
```

- [ ] **Step 3: cycle-3 carry-over backlog 갱신**

`docs/superpowers/evolution/cycle-2-backlog.md` 에 cycle-3 section 추가 (기존 cycle-2 의 carry-over 위에):

```markdown
# Cycle 3 Backlog (Cycle 2 partial 에서 carry-over)

자율진화 cycle 2 가 F1 (multi-seed 룰 persona doc 패치) 만 머지하고 partial 종료. F2/F3 는 cycle 3 1순위 후보.

## Carry-over (Cycle 2 PRD 의 F2/F3)

### C1. Eternal Hero 회춘/사망 비트 회수 (was Cycle 2 F2)

**Context**: Cycle 2 sim 50/50 max_arrivals 종료, hero_died 0/50, 회춘 0/50. V3 정체성 (eternal hero idle sponsor) 의 핵심 비트가 narrative 에 0 회 발화.

**Action**: MAX_ARRIVALS 500 → 1000 (sim 측정 cap raise) + idle-friendly 회춘 trigger (age 임계 or arrivals 임계 시 자연 회춘 emit).

**수용 기준** (Δ-from-baseline + multi-seed):
- 3 seeds × 50 cycle 평균 cyclesWithRejuvenation ≥ 5 (baseline 0/50)
- 3 seeds × 50 cycle 평균 hero_died event ≥ 1/50 (baseline 0/50)

### C2. Narrative Variance Pass (was Cycle 2 F3)

**Context**: levelUpBatch 6 variant 가 LV 5→844k 동일 어휘, moralChoice spare_enemy 87.5% saturate, NPC variant cycle 당 10+ 회 반복.

**Action**: levelUp 자릿수 톤 분기 (≤999 / 1k-999k / 1M+) + moralChoice caste frame + NPC variant 24 distinct.

**수용 기준**:
- 3 seeds × 50 cycle 한 cycle 안 한 줄 반복 ≤ 40 회 (baseline 88 회)
- levelUp variant unique ≥ 18 (1k-999k 6 + 1M+ 6 + ≤999 6)

## 잔존 carry-over (cycle-2-backlog.md 의 B1/B1.5/B2)

- **B1**: Tier 2 priest saturator (catalog dim source-rate 비대칭) — cycle 2 sim 0.40 → 0.44 regression 신호 (단일 seed noise 인지 진짜 regression 인지는 F1 multi-seed 룰 적용 후 측정)
- **B1.5**: NPC spawn distribution sparse (50 cycle 중 2 cycle 에 28 events 집중)
- **B2**: Planner persona baseline-측정 의무화 → **C2 F1 으로 partial 채택** (이 cycle 의 F1)
```

- [ ] **Step 4: commit**

```bash
git add docs/personas/01-game-planner.md docs/superpowers/evolution/cycle-2-backlog.md
git commit -m "$(cat <<'EOF'
feat(personas): F1 — multi-seed acceptance + Δ-from-baseline 룰 (Cycle 2)

Cycle 1 yellow flag (3 PRD recalibrations F1.13/F1.15/F3.14) 의 root cause 를
planner persona 의 "사고 방식" 에 정착. cycle 1↔2 priest saturator Δ 0.04 가
seed variance 와 같은 자릿수라는 Cycle 2 critic 의 메타 finding 도 반영.

cycle-3 backlog 에 C1 (eternal hero 회춘) + C2 (narrative variance) 명세.
F1 만 partial 머지 — cycle 2 의 자원 추정 trigger 회피.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 머지 가드 + 머지

**Files:** (코드 변경 없음 — docs only)

- [ ] **Step 1: 머지 가드 — docs only 이므로 vitest/e2e/sim skip 가능**

다만 형식상 typecheck + lint + circular 는 실행:

```bash
pnpm typecheck && pnpm lint && pnpm circular
```

Expected: typecheck/lint 0 exit, circular baseline 1 (회귀 0).

- [ ] **Step 2: vitest 한 번 + e2e 1 retry (자율 cycle 표준)**

```bash
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e || pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: vitest 1088 PASS (cycle 1 baseline), e2e 12/14 PASS (known v2-vertical-slice 2 fail 분리).

- [ ] **Step 3: main 머지 + tag**

```bash
git checkout main
git merge --no-ff feat/cycle-2-process-rejuv-variance -m "Merge feat/cycle-2-process-rejuv-variance: Cycle 2 partial — F1 (multi-seed 룰)"
git tag cycle-2-partial-complete
git branch -d feat/cycle-2-process-rejuv-variance
```

- [ ] **Step 4: result + INDEX + STATUS 갱신 + commit**

`docs/superpowers/evolution/cycle-2-result.md` 새 파일 (cycle 1 result 형식 follow). Partial 명시.

`docs/superpowers/evolution/INDEX.md` 에 한 줄 추가.

`STATUS-2026-05-24-cycle-2-partial.md` 새 파일 (cycle 1 STATUS 형식 follow).

- [ ] **Step 5: 최종 commit**

```bash
git add docs/superpowers/evolution/cycle-2-result.md docs/superpowers/evolution/INDEX.md STATUS-*.md
git commit -m "docs(cycle-2): partial — F1 multi-seed 룰 머지 + cycle-3 carry-over"
```

---

## Self-Review

- spec coverage: PRD F1 ✓. F2/F3 는 cycle 3 backlog (C1/C2) 로 명시.
- placeholder: 없음.
- type consistency: file path 일관.
- partial 명시: cycle 2 result.md + INDEX.md 모두에 "partial" 명시.
