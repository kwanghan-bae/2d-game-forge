# Autonomous Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8 페르소나의 자율진화 루프를 부트스트랩하고, Cycle 1 을 끝까지 자율 실행한 뒤, halting 조건이 트리거될 때까지 Cycle 2..N 을 반복한다.

**Architecture:** 직접 main 세션에서 페르소나별 Agent subagent 를 dispatch (병렬 가능 phase 는 한 메시지 multi-tool-call). 각 cycle 의 산출물은 `docs/superpowers/evolution/cycle-N-*.md` 에 누적. Phase E (구현) 만 재귀적으로 `writing-plans` + `subagent-driven-development` 사용. Phase F 머지 가드는 정확한 명령 시퀀스로 강제.

**Tech Stack:** pnpm + Turbo + Vitest + Playwright + Madge + tsx (sim runner) + git. 페르소나는 마크다운 파일 (`docs/personas/01..08-*.md`) 로 정의 — subagent 의 system identity.

**Spec:** `docs/superpowers/specs/2026-05-24-autonomous-evolution-design.md`

---

## File Structure

- Create: `docs/superpowers/evolution/INDEX.md` — cycle 별 한 줄 요약 + 산출물 링크
- Create (cycle 별 N 회): `docs/superpowers/evolution/cycle-N-{critic,story-critic,level-critic,research,prd,test-plan,ui-guide,assets,result}.md`
- Modify (cycle 별 N 회): root branch + Cycle N 의 feature branch `feat/cycle-N-<short-topic>`
- Modify (cycle 별 N 회): `STATUS-YYYY-MM-DD.md` (최신 머지 직후 갱신)
- 게임 코드 변경: cycle 의 PRD 가 결정 — task 시점에 미리 명시 못 함

---

## Task 1: 자율진화 부트스트랩

**Files:**
- Create: `docs/superpowers/evolution/INDEX.md`
- Create: `docs/superpowers/evolution/README.md`

- [ ] **Step 1: evolution 디렉토리 + INDEX 골격 작성**

`docs/superpowers/evolution/INDEX.md`:

```markdown
# Autonomous Evolution Cycle Index

8-페르소나 자율진화 루프의 cycle 별 한 줄 요약. spec: `../specs/2026-05-24-autonomous-evolution-design.md`.

## Cycle log

(아직 cycle 시작 전. Cycle 1 완료 시 첫 줄 추가)
```

`docs/superpowers/evolution/README.md`:

```markdown
# Autonomous Evolution Artifacts

이 디렉토리는 자율진화 루프의 cycle 별 산출물이다.

## 파일 명명 규칙

- `cycle-N-critic.md` — 게임비평가 평가 (Phase A1)
- `cycle-N-story-critic.md` — 스토리작가 평가 (Phase A2)
- `cycle-N-level-critic.md` — 레벨디자이너 평가 (Phase A3)
- `cycle-N-research.md` — 웹리서처 (Phase B1, 조건부)
- `cycle-N-prd.md` — 게임기획자 PRD (Phase C)
- `cycle-N-test-plan.md` — QA 테스트 계획 (Phase D1)
- `cycle-N-ui-guide.md` — UI/UX 가이드 (Phase D2)
- `cycle-N-assets.md` — 무료에셋 (Phase D3)
- `cycle-N-result.md` — Phase F 직후 머지 SHA + 가드 결과

## Cycle 진행 상태

INDEX.md 참조.
```

- [ ] **Step 2: 커밋**

```bash
git add docs/superpowers/evolution/INDEX.md docs/superpowers/evolution/README.md
git commit -m "chore(autonomous-evolution): bootstrap evolution artifacts directory

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Cycle N — Phase A 평가 (병렬 3 subagent)

> **N 의 값**: 첫 진입 시 N=1. 이후 회귀 시 직전 cycle 번호 + 1.

**페르소나 dispatch prompt 공통 prefix** (각 페르소나마다 subagent_type=general-purpose, 한 메시지에 3 tool call 병렬):

```
당신은 `docs/personas/<persona-file>.md` 의 페르소나다.
시작 전에 그 파일을 Read 도구로 읽고, 그 정체성/사고 방식/책임/출력 포맷/금지 사항을 정확히 따른다.

## 평가 대상
- 현재 main HEAD: `git log -1 --format=%H` 의 commit
- 직전 cycle 산출물: docs/superpowers/evolution/ 의 직전 cycle-(N-1)-*.md 들 (N=1 이면 시드)
- 시드 STATUS: docs/STATUS-2026-05-24.md (V3-H 머지 직후 — N=1 일 때만 사용)
- 50-cycle headless sim: `pnpm --filter @forge/game-inflation-rpg sim:cycle -- --cycles 50` 실행 후 JSON 파싱

## 산출물
`docs/superpowers/evolution/cycle-<N>-<persona-slug>.md` 를 작성. 페르소나 파일의 "평가 포맷" 섹션을 정확히 따른다.

## 보고
완료 시 산출물 경로 + 약점 TOP 3 의 한 줄 요약을 main 세션에 회신한다.
```

- [ ] **Step 1: 50-cycle sim 실행 (cycle 시작 시 1 회만)**

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --cycles 50 > /tmp/cycle-<N>-sim.json 2>&1
```

Expected: 0 exit, JSON 출력 (`{"results": [...]}` 등). 실패 시 멈춤 + 사용자 호출.

- [ ] **Step 2: 3 페르소나 병렬 dispatch (한 메시지에 3 Agent tool call)**

각 Agent 호출:

1. **A1 게임비평가** (subagent_type=general-purpose, description="Cycle N critic eval", prompt = 공통 prefix + persona-file=`04-game-critic.md` + persona-slug=`critic`)
2. **A2 스토리작가** (description="Cycle N story eval", persona-file=`05-story-writer.md`, persona-slug=`story-critic`)
3. **A3 레벨디자이너** (description="Cycle N level eval", persona-file=`06-level-designer.md`, persona-slug=`level-critic`, sim JSON 경로 prompt 에 명시)

- [ ] **Step 3: 산출물 3 종 존재 검증**

```bash
ls docs/superpowers/evolution/cycle-<N>-critic.md \
   docs/superpowers/evolution/cycle-<N>-story-critic.md \
   docs/superpowers/evolution/cycle-<N>-level-critic.md
```

Expected: 3 파일 모두 존재. 누락 시 해당 페르소나 dispatch 재시도.

- [ ] **Step 4: 가벼운 commit (Phase 단위)**

```bash
git add docs/superpowers/evolution/cycle-<N>-{critic,story-critic,level-critic}.md
git commit -m "chore(cycle-<N>): Phase A 평가 3종 (critic + story + level)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Cycle N — Phase B 리서치 (조건부, 0-1 subagent)

**판정**: 직전 Task 2 의 3 평가에서 약점 TOP 3 중 **컨텐츠 / UX / narrative / 트렌드** 카테고리가 1개 이상 → B1 dispatch. 모두 순수 밸런스 / 코드 부채면 skip.

- [ ] **Step 1: 트리거 판정**

3 산출물의 "약점 TOP 3" 섹션을 읽고 카테고리 분류:

- 컨텐츠 / UX / narrative / 트렌드 → trigger=true
- 밸런스 / 코드 부채 / 회귀 → trigger=false

trigger=false → 빈 placeholder 파일 1 줄 작성하고 다음 task:

```markdown
# Cycle <N> 웹리서치 (skipped)

직전 평가의 약점이 순수 밸런스 / 코드 부채로 외부 리서치 트리거 안 됨.
```

→ commit 후 Task 4 로.

- [ ] **Step 2: trigger=true 시 웹리서처 dispatch**

Agent 호출 (subagent_type=general-purpose):

prompt = 공통 prefix + persona-file=`07-web-researcher.md` + persona-slug=`research`

추가:
```
## 조사 주제
직전 cycle 평가의 약점 카테고리 (구체 인용 1-2 줄). 그 영역에서 최근 6-12 개월 유사 컨셉 hit 또는 cult 3-5 개 + 트렌드 + 안티-패턴. 출처 링크 필수.
```

도구: WebSearch + WebFetch 사용 권한 있음.

- [ ] **Step 3: 산출물 검증**

```bash
test -s docs/superpowers/evolution/cycle-<N>-research.md
```

- [ ] **Step 4: commit**

```bash
git add docs/superpowers/evolution/cycle-<N>-research.md
git commit -m "chore(cycle-<N>): Phase B 웹리서치

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Cycle N — Phase C PRD 통합 (단일 subagent)

- [ ] **Step 1: 게임기획자 dispatch**

Agent 호출 (subagent_type=general-purpose, description="Cycle N PRD"):

prompt = 공통 prefix + persona-file=`01-game-planner.md` + persona-slug=`prd`

추가:
```
## 통합 대상
- docs/superpowers/evolution/cycle-<N>-critic.md
- docs/superpowers/evolution/cycle-<N>-story-critic.md
- docs/superpowers/evolution/cycle-<N>-level-critic.md
- docs/superpowers/evolution/cycle-<N>-research.md (skipped 일 수도 있음)
- 이전 cycle 들의 backlog (`cycle-(N-1)-prd.md` 의 "우선순위 외 backlog" 섹션)

## 가드
- 스코프: feature 3 개 초과 금지
- 3 의 규칙: 같은 약점이 이번까지 3 cycle 연속 1순위로 등장하면 → 즉시 명시 + Phase G self-check 에서 soft halt 후보로 기록
- 컨셉: V3 (eternal hero idle sponsor, 1→수십만 레벨 폭발) 위배 검출 시 reject
```

- [ ] **Step 2: 산출물 검증**

```bash
test -s docs/superpowers/evolution/cycle-<N>-prd.md
grep -E '^### F[0-9]\.' docs/superpowers/evolution/cycle-<N>-prd.md | wc -l
```

Expected: feature 개수 1-3.

- [ ] **Step 3: commit**

```bash
git add docs/superpowers/evolution/cycle-<N>-prd.md
git commit -m "chore(cycle-<N>): Phase C PRD 통합

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Cycle N — Phase D 검증설계 + 에셋 (병렬 3 subagent)

PRD 확정 직후, 한 메시지에 3 Agent tool call 병렬:

- [ ] **Step 1: 3 페르소나 병렬 dispatch**

1. **D1 QA** (description="Cycle N QA plan", persona-file=`02-qa.md`, persona-slug=`test-plan`)

   prompt 추가:
   ```
   ## PRD
   docs/superpowers/evolution/cycle-<N>-prd.md 의 모든 F1..F3 에 대해 test case matrix.
   ## 회귀 위험
   직전 cycle 의 STATUS / vitest / e2e 핫스팟 식별.
   ```

2. **D2 UI/UX 디자이너** (description="Cycle N UI guide", persona-file=`03-ui-ux-designer.md`, persona-slug=`ui-guide`)

   prompt 추가:
   ```
   ## PRD
   docs/superpowers/evolution/cycle-<N>-prd.md.
   UI 영향이 없는 cycle 이면 산출물에 "No UI impact this cycle" 한 줄만 + 이유.
   ```

3. **D3 무료에셋 조사관** (description="Cycle N assets", persona-file=`08-free-asset-investigator.md`, persona-slug=`assets`)

   prompt 추가:
   ```
   ## PRD
   docs/superpowers/evolution/cycle-<N>-prd.md.
   에셋 요구 없는 cycle 이면 산출물에 "No new assets this cycle" + 기존 재사용 확인 한 줄.
   ```

- [ ] **Step 2: 3 산출물 검증**

```bash
ls docs/superpowers/evolution/cycle-<N>-test-plan.md \
   docs/superpowers/evolution/cycle-<N>-ui-guide.md \
   docs/superpowers/evolution/cycle-<N>-assets.md
```

- [ ] **Step 3: commit**

```bash
git add docs/superpowers/evolution/cycle-<N>-{test-plan,ui-guide,assets}.md
git commit -m "chore(cycle-<N>): Phase D 검증설계+에셋

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cycle N — Phase E 구현 (writing-plans 재귀 + 구현)

- [ ] **Step 1: feature branch 생성**

PRD 의 "한 줄 컨셉" 에서 short-topic kebab-case 추출 (예: "saint blind spot 완화" → `saint-blindspot`).

```bash
git checkout -b feat/cycle-<N>-<short-topic>
```

- [ ] **Step 2: 구현 plan 작성 (재귀 writing-plans)**

`superpowers:writing-plans` 스킬 호출:

- 입력: `cycle-<N>-prd.md` + `cycle-<N>-test-plan.md` + `cycle-<N>-ui-guide.md` + `cycle-<N>-assets.md`
- 출력: `docs/superpowers/plans/2026-MM-DD-cycle-<N>-<short-topic>.md`
- 이 plan 의 task 들은 PRD 의 F1..F3 + test plan 의 매트릭스를 정확히 반영. 페르소나 dispatch 가 아닌 일반 구현 task.

- [ ] **Step 3: 구현 plan 실행**

`superpowers:subagent-driven-development` 스킬로 plan 의 task 들을 dispatch. 각 task 완료마다 가벼운 commit.

- [ ] **Step 4: 누락 검증**

```bash
# 구현 plan 의 모든 task 가 완료되었는지 확인
grep -c '^- \[x\]' docs/superpowers/plans/2026-MM-DD-cycle-<N>-<short-topic>.md
grep -c '^- \[ \]' docs/superpowers/plans/2026-MM-DD-cycle-<N>-<short-topic>.md
```

Expected: 미체크 박스 0.

미체크가 있으면 가드 fail 로 처리하고 Phase F 의 머지 거부.

---

## Task 7: Cycle N — Phase F 검증 + 머지 (자동 가드)

> **결정적 게이트**. 어느 단계든 fail → 자동 머지 중단 + branch 보존 + 다음 turn 사용자 호출. 우회 금지 (--no-verify, xit, it.skip).

- [ ] **Step 1: typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: 0 exit.

- [ ] **Step 2: vitest 전체**

```bash
pnpm test
```

Expected: 모든 워크스페이스 vitest 0 exit + fail 0.

- [ ] **Step 3: e2e Playwright**

```bash
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: 0 exit (chromium + iphone14 모두).

- [ ] **Step 4: circular**

```bash
pnpm circular
```

Expected: "No circular dependency found".

- [ ] **Step 5: 50-cycle sim regression**

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --cycles 50 > /tmp/cycle-<N>-post-sim.json 2>&1
```

비교: Task 2 의 시작 시 sim (`/tmp/cycle-<N>-sim.json`) 대비:
- `maxLevel p50` ≥ 시작 시 p50 × 0.90 → PASS
- `realm_unlocked rate` ≥ 시작 시 × 0.95 → PASS
- `hero_died rate` 5-30% 구간 → PASS

Regression 시 어떤 지표가 깨졌는지 STDOUT 에 출력.

- [ ] **Step 6: persist version 가드**

PRD 가 store/save schema 를 건드린 경우만:

```bash
grep -E 'STORE_VERSION|saveEnvelopeSchema' games/inflation-rpg/src/store/*.ts | head -5
```

Expected: STORE_VERSION 이 직전 main 대비 +1 + migration 함수 동반.

- [ ] **Step 7: 모든 가드 PASS 시 main 머지**

```bash
git checkout main
git merge --no-ff feat/cycle-<N>-<short-topic> -m "Merge feat/cycle-<N>-<short-topic>: <PRD 한 줄 컨셉>"
git tag "cycle-<N>-complete"
git branch -d feat/cycle-<N>-<short-topic>
```

- [ ] **Step 8: STATUS + result + INDEX 갱신**

`docs/STATUS-2026-MM-DD.md` 갱신 (오늘 날짜):
- 최신 머지 SHA + 변경 한 줄 요약
- 가드 결과 (vitest N passed / e2e N passed / sim regression PASS)

`docs/superpowers/evolution/cycle-<N>-result.md` 새 파일:

```markdown
# Cycle <N> 결과

- 머지 SHA: `<sha>`
- 머지 시각: <ISO 8601>
- 시작 commit: `<sha>` (Phase A 시작 시 main)
- 변경 한 줄: <PRD 한 줄>
- 가드:
  - typecheck/lint: PASS
  - vitest: N passed
  - e2e: N passed
  - circular: 0
  - sim: maxLevel p50 X → Y, realm_unlocked R%, hero_died D%
- 변경 파일 수: N
```

`docs/superpowers/evolution/INDEX.md` 에 한 줄 추가:

```markdown
- Cycle <N> (YYYY-MM-DD, `<sha>`): <한 줄 요약>. 약점: <카테고리>. 곡선: maxLevel p50 X → Y.
```

- [ ] **Step 9: commit (STATUS + result + INDEX)**

```bash
git add docs/STATUS-*.md docs/superpowers/evolution/cycle-<N>-result.md docs/superpowers/evolution/INDEX.md
git commit -m "docs(cycle-<N>): result + STATUS + INDEX 갱신

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 10: 가드 실패 처리 (실패 시에만)**

어느 step 이든 실패 시:
- main 으로 checkout 하지 않음
- feature branch 보존 (delete 금지)
- `docs/superpowers/evolution/cycle-<N>-result.md` 에 fail 사유 명시
- 메인 세션에 fail 사유 + branch 명 보고 + 다음 turn 사용자 호출

---

## Task 8: Cycle N — Phase G self-check + 다음 cycle 결정

- [ ] **Step 1: halt 신호 평가**

3 신호 중 1+ 충족 시 → soft halt:

1. **약점 고갈**: 이번 cycle 평가 (cycle-N-critic + story + level) 의 약점 TOP 3 가 모두 "표류 없음" 또는 점수 9+/10 만 등장
2. **3 연속 같은 1순위**: cycle-(N-2), cycle-(N-1), cycle-N 의 PRD 1순위 feature 가 같은 카테고리 (3 의 규칙)
3. **자원 추정**: 다음 cycle 1 회 + 정리 commit 까지의 turn 여유 부족 추정 (휴리스틱: 직전 cycle turn 수가 평균 30+ 이고 남은 context 가 ~30% 이하면 halt)

추가로:

4. **사용자 halt**: 사용자가 명시적 "stop" / "/goal clear" 입력 시 즉시 halt
5. **Hard halt**: harness 가 context-window / quota 한계 → 자동 정지 (사람-개입 불가)

- [ ] **Step 2: halt 시 정리**

`docs/superpowers/evolution/FINAL.md` 작성:

```markdown
# Autonomous Evolution — 최종 상태

- 시작: 2026-05-24 (V3-H 머지 직후 81bea39)
- 종료: <YYYY-MM-DD>
- halt 사유: <약점 고갈 / 3 연속 / 자원 / 사용자 / hard>
- 완료 cycle: <N>
- 마지막 cycle SHA: `<sha>`
- 곡선 변화: maxLevel p50 (시드 X → 최종 Y), realm_unlocked rate (R0 → R1), hero_died rate (D0 → D1)
- 컨셉 표류: 없음 / <있다면 사유>
- INDEX.md 의 전체 cycle log 참조
```

commit:

```bash
git add docs/superpowers/evolution/FINAL.md
git commit -m "docs(autonomous-evolution): FINAL — N cycle 완료, halt: <사유>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: continue 시 회귀**

Halt 신호 없음 → N := N + 1 → **Task 2 로 회귀**. 이 plan 의 Task 2-8 은 cycle 변수 N 에 대해 일반화되어 있으므로 동일 task 시퀀스를 재실행.

회귀 시 가벼운 진행 log (chat):

```
Cycle N 머지 완료. 약점 카테고리 = X. 다음 cycle (N+1) 진입.
```

---

## Self-Review

**Spec coverage:**
- Phase A → Task 2 ✓
- Phase B → Task 3 ✓
- Phase C → Task 4 ✓
- Phase D → Task 5 ✓
- Phase E → Task 6 ✓
- Phase F → Task 7 ✓
- Phase G → Task 8 ✓
- 머지 정책 → Task 7 Step 7 ✓
- Halting 3 종 → Task 8 Step 1 ✓
- State persistence → Task 1 + 각 phase commit ✓
- 안전 가드 (destructive 금지, persist version, --no-verify 금지) → Task 7 Step 6/10 ✓
- 첫 cycle 부트스트랩 → Task 1 + Task 2 N=1 분기 ✓

**Placeholder scan:** 없음 (모든 step 에 실제 명령 / template / 검증 기준).

**Type consistency:** cycle 산출물 파일명 일관 (`cycle-<N>-<slug>.md` 형식). 페르소나 file 경로 일관 (`docs/personas/0X-*.md`).
