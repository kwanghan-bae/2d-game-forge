---
title: Korean Documentation Rewrite Design
date: 2026-04-18
status: approved (initial)
---

# 한국어 문서화 재작성 — 설계 스펙

## §0 개요

기존 문서가 영문 위주로 작성되어 있어 모국어가 한국어인 사용자(본인)의
유지보수·재방문 비용이 높다. 모든 사용자 대면 문서를 한국어로 (재)작성하고,
신규로 필요한 진입점 문서를 추가한다.

스코프는 사용자가 작성하거나 자주 보는 모든 마크다운 문서. 코드 주석,
커밋 메시지, 코드 안의 식별자는 대상이 아니다.

## §1 문서 인벤토리 (총 9개)

| # | 경로 | 상태 | 대상 독자 | 분량 가이드 |
|---|---|---|---|---|
| 1 | `README.md` (루트) | 신규 | 처음 접하는 사람, 셋업하는 사람 | 한 화면 (200줄 이내). 한 줄 소개 → quick start → 디렉터리 맵 → 더 읽을 것 링크 |
| 2 | `docs/ARCHITECTURE.md` | 신규 | 코드를 만지는 모든 사람 | 4계층 케이크 그림, 의존성 단방향 규칙, "3의 규칙" 승격 프로토콜, dev/release 모드, `StartGame(config)` 계약, `assetsBasePath` 흐름. 깊이 있게 쓰되 상세는 spec으로 위임 |
| 3 | `docs/CONTRIBUTING.md` | 신규 | 새 게임 추가하는 사람 | "공장에서 게임 찍어내는 절차" — 워크스페이스 만들기, 매니페스트, 등록, 에셋 심링크, 테스트, 빌드, 자주 하는 실수 |
| 4 | `apps/dev-shell/README.md` | 신규 | 포털 손대는 사람 | 짧음. 포털 라우팅 구조, 게임 등록 위치, 환경 게이트 |
| 5 | `packages/2d-core/README.md` | 재작성 | 코어 라이브러리 사용자 | 현재 영문을 한국어로. 어떤 상태이고 어떤 식으로 자라는지 |
| 6 | `games/inflation-rpg/README.md` | 재작성 | 이 게임 빌드/디버그하는 사람 | 현재 영문을 한국어로. 스크립트, 의존, 알려진 부채 |
| 7 | `docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md` | 검토 + 미세조정 | 설계 의도 확인하는 사람 | 이미 한국어. 일관성 정리 + Phase 1 결정 반영 |
| 8 | `docs/superpowers/plans/2026-04-17-phase0-bootstrap.md` | 재작성 | 재현 또는 회고하는 사람 | 한국어 산문 + 영문 코드/명령 |
| 9 | `docs/superpowers/plans/2026-04-17-phase1-inflation-rpg-port.md` | 재작성 | 재현 또는 회고하는 사람 | 동일 |

### 추가 안 하는 것 (YAGNI)

- `CHANGELOG.md` — git log를 source of truth로 사용한다.
- `LICENSE` — 외부 공개 시점에 결정한다.
- `CODE_OF_CONDUCT` — 1인 기여 단계라 불필요하다.
- `docs/PHASES.md`, `PROMOTION_PROTOCOL.md` 같은 별도 문서 — `ARCHITECTURE.md`
  안에 통합한다.

### 읽기 흐름

- 처음: `README.md` → `docs/ARCHITECTURE.md`
- 게임 추가: `docs/CONTRIBUTING.md` → 기존 게임 README 참조
- 디버그/유지보수: 해당 패키지/앱/게임 README

## §2 표기 컨벤션

### 톤

- 본문은 **평서문 ~다체**를 사용한다 ("공장은 4계층으로 구성된다", "이 명령을
  실행한다"). 격식체(~합니다)도 반말체(~해)도 아닌 한국 기술 문서 표준 톤.
- 루트 `README.md`만 약간 더 부드러운 평문체를 허용한다 ("이 프로젝트는 ~다")
  — 처음 보는 외부인이 어색하지 않도록.

### 전문 용어 — 영어 보존 원칙

한국 개발자 관용을 따른다. 강제 번역하지 않는다.

- **그대로 영어**: monorepo, workspace, Turbopack, Vite, Phaser, Capacitor,
  manifest, dynamic import, hook, registry, scaffold, refactor, lint,
  typecheck, E2E, Playwright, Vitest, boundary, plugin, dependency, alias,
  lockfile, snapshot, smoke test, pipeline, payload, wrapper, factory,
  singleton.
- **번역 OK**: 게임/패키지/계층/장르/콘텐츠/공장/이식/승격/큐레이션/검증/배포/
  세이브/플레이어/장면(scene).
- **혼용**: "디렉터리 구조" / "directory layout" 같은 곳은 자연스러운 쪽을
  선택한다.

### 코드/명령/파일 경로 — 그대로

- 인용된 코드, 명령, 파일 경로, 변수명, 커밋 메시지: 모두 영어 그대로.
- 코드 안의 한국어 문자열(예: `'조선 인플레이션 RPG'`)도 그대로.

### 구조 컨벤션

- 본문 헤딩: H1 (문서 제목) → H2 (섹션) → H3 (서브). 마크다운 표준.
- 강조: **굵게**, *기울임* 최소.
- 불릿: `-` (대시). 번호: `1.` (마침표).
- 코드 블록: 언어 명시 (\`\`\`bash, \`\`\`ts, \`\`\`json).
- 표: 컨셉 비교/매핑이 명확할 때만.
- 다이어그램: ASCII art (spec에서 쓰던 4-layer cake 박스 형태). 외부 이미지
  의존하지 않는다.

### 파일 헤더 (frontmatter)

- spec/plan: 기존 frontmatter 유지 (`---\ntitle\ndate\nstatus\n---`).
- 그 외(`README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`): frontmatter 없이
  H1 제목으로 시작.

### 링크

- 같은 레포 내부 링크는 상대 경로: `[ARCHITECTURE](docs/ARCHITECTURE.md)`.
- 외부 URL은 인라인 링크 형태로.

## §3 작업 순서와 커밋 전략

### 브랜치

`docs/korean-rewrite` 피처 브랜치. 머지는 no-ff (이전 Phase들과 동일 스타일).

### 작업 순서 (의존 + 가치순)

| 순서 | 문서 | 이유 |
|---|---|---|
| 1 | 루트 `README.md` (신규) | 첫 방문자의 진입점. 가장 자주 보임. 독립적 |
| 2 | `docs/ARCHITECTURE.md` (신규) | README가 링크할 곳. 모든 다른 문서의 멘탈 모델 기반 |
| 3 | `docs/CONTRIBUTING.md` (신규) | 다음 게임 추가 시 즉시 필요. ARCHITECTURE 의존 |
| 4 | `apps/dev-shell/README.md` (신규) | 짧음. 독립적 |
| 5 | `packages/2d-core/README.md` (재작성) | 짧음. 독립적 |
| 6 | `games/inflation-rpg/README.md` (재작성) | 짧음. 독립적 |
| 7 | spec 검토 + 미세조정 | 기존 한국어, 일관성/Phase 1 결정 반영만 |
| 8 | Phase 0 plan 한국어 재작성 | 큰 분량 (~1190 줄) |
| 9 | Phase 1 plan 한국어 재작성 | 가장 큰 분량 (~1455 줄) + 알려진 부채 메모 추가 |

### 커밋 전략

각 문서 완성 시 즉시 커밋. 문서당 1 커밋 원칙.

- 신규: `docs: add Korean <name>` (예: `docs: add Korean README`)
- 재작성: `docs: rewrite <name> in Korean` (예: `docs: rewrite @forge/core README in Korean`)
- 검토: `docs: align spec with Phase 1 outcomes`

plan 2개는 묶어서 한 커밋도 허용한다 — 어차피 함께 회고된다.

### 도구 선택

- 신규 짧은 문서 (4, 5, 6): 직접 작성.
- 신규 큰 문서 (1, 2, 3): 직접 작성 + 자체 리뷰.
- spec 미세조정 (7): 직접.
- plan 재작성 (8, 9): 서브에이전트 위임. 분량이 크고 단일 책임(영문→한국어
  변환)이라 에이전트가 spec/plan 원문 + 컨벤션을 받아서 변환한다.

### 검증 게이트

문서별로:

- 마크다운 렌더 확인 (헤딩 구조, 표, 코드블록).
- 깨진 링크 검사 (`grep "](.*\.md)"` 단순 검사).
- 자기 검토: "처음 보는 사람이 이 문서만 읽고 다음 행동을 알 수 있는가?"

전체 끝나면:

- 영문 잔재 검사: 사용자 대면 문서에 영문 산문이 남아 있는지 확인.
- main 머지 전 한 번 더 훑기.

## §4 비목표 (do not)

- 코드 주석, 커밋 메시지, 변수명, 파일명을 한국어로 바꾸지 않는다.
- 자동 번역기를 사용하지 않는다 — 의역과 컨텍스트가 중요하다.
- 새 기능을 추가하지 않는다 (예: 다이어그램용 Mermaid, 자동 lint). 순수
  문서화 작업이다.
- 외부 호스팅(GitHub Pages 등) 설정하지 않는다.

## §5 성공 기준

1. 신규 4개 문서가 작성되어 커밋된다 (README, ARCHITECTURE, CONTRIBUTING,
   dev-shell README).
2. 재작성 4개 문서가 한국어로 교체되어 커밋된다 (2 패키지 README + 2 plan).
3. spec 1개 문서가 일관성 검토 + Phase 1 반영 미세조정된다.
4. 모든 문서가 §2 컨벤션을 따른다.
5. 처음 본 사람이 `README.md`만 읽고 `pnpm dev`로 포털을 띄울 수 있다.
6. 새 게임을 추가하려는 사람이 `docs/CONTRIBUTING.md`만 읽고 워크스페이스
   생성 → 매니페스트 → 등록 → 첫 부팅까지 갈 수 있다.

`docs/korean-rewrite` 브랜치 → 검토 → main 머지로 완료.
