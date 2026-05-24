# 자율진화 (Autonomous Evolution) — 8-Persona 루프 설계

> Status: draft (2026-05-24)
> Owner: kwanghan-bae
> Predecessor: V3-H Depth + Polish (`phase-v3-h-complete`, 81bea39)

## 한 줄

8 페르소나 (기획자 / QA / UI-UX / 비평가 / 스토리작가 / 레벨디자이너 / 웹리서처 / 무료에셋조사관) 가 매 cycle 평가→PRD→검증설계→구현→머지→self-check 의 폐쇄 루프를 돌려, **inflation-rpg 의 V3 컨셉 (eternal hero idle sponsor, 1→수십만 레벨 폭발)** 을 토큰 소진 시점까지 자율로 진화시킨다.

## 컨셉 정합 (왜 지금)

V3-H 가 base 락 3-bug compound 까지 해소해 게임은 **기능 측면에서 ship-ready**. 다음 진화 축은 **밸런스 / 컨텐츠 변주 / 서사 풍부도 / UI 폴리시 / 외부 트렌드 흡수** 등 **수직 깊이**. 단일 사람-주도로는 8 직무를 동시에 보기 어렵다. **페르소나 분담 + 평가-기반 PRD** 가 자연스러운 해법.

## 8 페르소나 정의

- **01 게임기획자** (`docs/personas/01-game-planner.md`) — PRD 작성, 평가 통합, 우선순위
- **02 QA** (`02-qa.md`) — PRD → test plan 분해, 회귀 위험 표면화
- **03 UI/UX 디자이너** (`03-ui-ux-designer.md`) — wireframe, 토큰/컴포넌트 가이드
- **04 게임비평가** (`04-game-critic.md`) — 흥행/재미/몰입/플레이타임 4 축 평가
- **05 스토리작가** (`05-story-writer.md`) — narrative variance / 톤 / 캐릭터 일관성 평가
- **06 레벨디자이너** (`06-level-designer.md`) — 50-cycle sim 기반 곡선/봉인/소모율 분석
- **07 웹리서처** (`07-web-researcher.md`) — 유사 컨셉 게임 + 트렌드 + 안티-패턴 조사
- **08 무료에셋 조사관** (`08-free-asset-investigator.md`) — PRD 의 에셋 요구 → CC0/CC-BY 후보 + 통합 명령

## Cycle 구조

각 cycle 은 7 phase 의 순차/병렬 혼합. 산출물은 모두 `docs/superpowers/evolution/cycle-N-*.md` 로 저장.

### Phase A — 평가 (병렬, 3 subagent)

**입력**: 직전 cycle 의 STATUS / vitest / e2e / 50-cycle sim 결과 + 현재 코드 상태.

병렬 dispatch (`dispatching-parallel-agents` 스킬):

- **A1 게임비평가** → `cycle-N-critic.md`
- **A2 스토리작가** → `cycle-N-story-critic.md`
- **A3 레벨디자이너** → `cycle-N-level-critic.md` (50-cycle sim 실행 포함)

### Phase B — 외부 리서치 (조건부 병렬, 1-2 subagent)

평가에서 약점 카테고리가 분명하면 트리거. 트리비얼 (예: 단순 typo 패치) cycle 은 skip.

- **B1 웹리서처** → `cycle-N-research.md` (직전 약점이 컨텐츠/UX/narrative 일 때)
- **B2 무료에셋 조사관** → 이 phase 에서는 아직 dispatch 안 함 (PRD 가 나와야 요구 추출 가능 → Phase D 에서)

### Phase C — 기획 (단일 subagent)

- **C1 게임기획자** — A1/A2/A3 + B1 를 통합 → `cycle-N-prd.md`
  - **3 의 규칙**: 같은 약점이 3 회 이상 cycle 에 등장하면 우선순위 1
  - **스코프 가드**: feature 3 개 초과 금지
  - **컨셉 가드**: V3 컨셉 (eternal hero idle sponsor) 표류 검출

### Phase D — 검증 설계 + 에셋 (병렬, 3 subagent)

PRD 가 확정된 직후 병렬:

- **D1 QA** → `cycle-N-test-plan.md`
- **D2 UI/UX 디자이너** → `cycle-N-ui-guide.md` (UI 영향 없는 cycle 이면 short note)
- **D3 무료에셋 조사관** → `cycle-N-assets.md` (에셋 요구 없는 cycle 이면 "없음" 한 줄)

### Phase E — 구현 (writing-plans → subagent-driven-development)

- 평가→PRD→QA→UI 가 모두 준비된 시점에 `superpowers:writing-plans` 호출
- 결과 plan 을 `docs/superpowers/plans/<date>-cycle-N-<topic>.md` 로 저장
- `superpowers:subagent-driven-development` 로 plan 의 task 들을 dispatch
- feature branch 명: `feat/cycle-N-<short-topic>`

### Phase F — 검증 + 머지 (자동 가드)

다음 명령 모두 0 exit + 회귀 없음 일 때만 main 머지:

```bash
pnpm typecheck && pnpm lint
pnpm test                 # vitest 100%
pnpm --filter @forge/game-inflation-rpg e2e   # Playwright 100%
pnpm circular             # 0 circular
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --cycles 50  # regression 없음
```

**Regression 정의** (sim 기준):

- `maxLevel p50` 가 직전 main 의 90% 이상
- `realm_unlocked rate` 가 직전 main 의 95% 이상
- `hero_died rate` 가 5-30% 구간 이탈 시 검토

가드 깨지면 자동 머지 정지 + 다음 turn 에서 사용자 호출.

`--no-ff` 머지 + `cycle-N-complete` 태그 + STATUS 갱신.

### Phase G — Self-check + 다음 cycle 결정

- 모든 페르소나 입력의 약점 TOP 3 가 비어 있거나 컨셉 위배만 남으면 → **자연 종료**
- 직전 3 cycle 의 평가 점수가 모두 9+/10 이면 → 자연 종료
- 사용자가 명시적으로 정지 요청 → 즉시 종료 (남은 cycle 산출물 정리 + 최종 STATUS)
- 그 외 → 다음 cycle 진입 (cycle 번호 증가, Phase A 로 회귀)

## State Persistence

`docs/superpowers/evolution/` 아래로 모두 저장:

```
docs/superpowers/evolution/
├── INDEX.md                # cycle 별 한 줄 요약 + 산출물 링크
├── cycle-1-critic.md
├── cycle-1-story-critic.md
├── cycle-1-level-critic.md
├── cycle-1-research.md     # optional
├── cycle-1-prd.md
├── cycle-1-test-plan.md
├── cycle-1-ui-guide.md     # optional 시 "no-ui" 한 줄
├── cycle-1-assets.md       # optional
├── cycle-1-result.md       # phase F 직후 — 머지 SHA, 가드 결과, 변경 요약
├── cycle-2-*.md
└── ...
```

`INDEX.md` 는 매 cycle 마지막에 한 줄 추가:

```markdown
- Cycle N (YYYY-MM-DD, `<sha>`): <한 줄 요약>. 약점: <카테고리>. 곡선: maxLevel p50 X → Y.
```

## 머지 정책 (사용자 결정 사항 — 완전 자율)

- **자동 머지**: Phase F 의 모든 가드 통과 시 `git merge --no-ff` + `cycle-N-complete` 태그
- **자동 중단**: 가드 깨짐 (어떤 종류든) → main 머지 안 함 + 다음 turn 사용자 호출 + branch 는 보존
- **롤백 안 함**: 머지된 commit 은 revert 하지 않고 다음 cycle 에서 fix-forward
- **branch 청소**: 머지 직후 local branch 삭제 (remote 없음 — 이 레포는 origin push 없음)

## Halting Condition (토큰 소진의 실용 정의)

`/goal` 의 명시 조건은 "모든 토큰이 소모되었을때". 실용 해석:

1. **Hard halt**: harness 가 context-window / quota 한계로 자동 종료 → 강제 정지. 마지막 cycle 의 부분 산출물은 보존, INDEX 에 "partial" 표기.
2. **Soft halt** (페르소나 신호): Phase G 의 self-check 가 자연 종료 조건 충족 → 정리 commit + 최종 STATUS 갱신.
3. **User halt**: 사용자가 명시적으로 "stop" / "/goal clear" 요청 → 즉시 정지.

매 cycle 시작 직전 self-budget check (간단 휴리스틱):

- 직전 cycle 의 turn 수 / context 사용량 추정
- 다음 cycle 1 회 + 정리 commit 까지의 여유가 충분치 않다고 판단되면 → soft halt 트리거

## 안전 가드

- **destructive 금지**: git reset --hard / branch -D / push --force / history rewrite 자동 실행 금지. 페르소나 어느 누구도 이 명령을 자율 호출하지 않음.
- **secrets 보호**: `.env`, credentials 류 자동 commit 금지. `git add -A` 대신 명시 파일.
- **테스트 우회 금지**: `--no-verify`, `xit`, `it.skip` 자동 도입 금지. 가드 깨지면 멈춤이 정답.
- **컨셉 표류 검출**: 기획자가 V3 컨셉 위배 (예: 매뉴얼 조작 도입 / 레벨 cap / PvP) 감지 시 reject + 사용자 호출.
- **persist version**: 모든 store/save 변경은 STORE_VERSION 증가 + migration 동반. 누락 시 가드 fail.

## 첫 cycle 부트스트랩 (Cycle 1)

- 시드 평가 대상 = 현재 V3-H 머지 직후 main (81bea39)
- 시드 sim: `pnpm --filter @forge/game-inflation-rpg sim:cycle -- --cycles 50`
- 시드 STATUS: `STATUS-2026-05-24.md`
- Phase A 부터 정상 진행

## 비고 / 리스크

- **3 의 규칙 vs 자율**: 페르소나는 "같은 약점 3 회면 우선순위 1" 이지만, 자율 모드에선 사람의 backlog 판단이 없다 → 평가가 같은 약점을 계속 지적하면 무한 반복 위험. **3 cycle 연속 같은 약점이 1순위면 Phase G 의 soft halt 신호로 처리**.
- **sim 비용**: 50-cycle sim 이 cycle 마다 1-2 분. 누적 시 부담 → 평가 cycle 외에는 sim 생략 (Phase A 에만 실행).
- **외부 fetch 의존**: 웹리서처 / 에셋조사관은 WebSearch/WebFetch 필요. 네트워크 차단 환경에서는 두 페르소나 skip + 내부 인사이트만으로 진행.
- **머지 가드 false-negative**: regression 판정 한계값이 너무 엄격하면 머지 못 함. 첫 1-2 cycle 결과 보고 한계값 튜닝.
- **persona Drift**: 페르소나가 시간이 지나며 "조심성" 으로 흘러 평가가 둔감해질 수 있음 → 매 5 cycle 마다 짧은 calibration ("이 game 의 정체성은 X 다. 약점 솔직히 찾아라") prefix 추가.

## 성공 정의

종료 시점에:

1. **N ≥ 5 cycle 머지 성공** (5 cycle 미만이면 시스템 검증 부족 → 다음 세션 재개 권장)
2. **곡선 health 유지**: maxLevel p50 / realm_unlocked rate / hero_died rate 가 시드 (Cycle 0 = 81bea39) 대비 모두 개선 또는 비등
3. **컨셉 표류 없음**: V3 컨셉 (eternal hero idle sponsor) 정합
4. **`docs/superpowers/evolution/INDEX.md`** 가 cycle 별 한 줄 요약으로 완성
5. **`STATUS-2026-MM-DD.md`** 가 최신 머지 직후로 갱신
