# Forge-UI 통합 디자인 시스템 구축 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `2d-game-forge`의 모든 게임에서 공통으로 사용할 수 있는 CSS 기반 UI 프레임워크와 Retro 테마 패키지의 기초를 설계하고 구축한다.

**Architecture:** 
- `@forge/ui-core`: 표준 클래스 규격 및 React 공통 컴포넌트 라이브러리.
- `@forge/theme-retro`: NES.css/PSone.css를 래핑한 실제 스타일 패키지.
- Tailwind CSS v4의 `@theme` 및 `@apply` 기능을 활용하여 외부 라이브러리 스타일을 표준 클래스(`.forge-btn` 등)로 추상화한다.

**Tech Stack:** React 19, Tailwind CSS v4, TurboRepo, TypeScript.

---

### Task 1: `@forge/ui-core` 패키지 스켈레톤 생성

**Files:**
- Create: `packages/ui-core/package.json`
- Create: `packages/ui-core/src/index.ts`
- Create: `packages/ui-core/src/styles/base.css`

- [ ] **Step 1: `package.json` 정의**
- [ ] **Step 2: 표준 CSS 변수 및 베이스 스타일 작성**
- [ ] **Step 3: `pnpm install`로 워크스페이스 동기화**

### Task 2: `@forge/theme-retro` 테마 패키지 구축

**Files:**
- Create: `packages/theme-retro/package.json`
- Create: `packages/theme-retro/src/index.css`

- [ ] **Step 1: `package.json` 정의 (NES.css 의존성 포함)**
- [ ] **Step 2: 외부 라이브러리 연동 및 표준 클래스 매핑 작성**

### Task 3: `@forge/ui-core` 베이스 컴포넌트 구현

**Files:**
- Create: `packages/ui-core/src/components/ForgeButton.tsx`
- Create: `packages/ui-core/src/components/ForgePanel.tsx`
- Modify: `packages/ui-core/src/index.ts` (export 추가)

- [ ] **Step 1: `ForgeButton` React 컴포넌트 작성**
- [ ] **Step 2: `ForgePanel` React 컴포넌트 작성**

### Task 4: `inflation-rpg` 테스트 통합

**Files:**
- Modify: `games/inflation-rpg/package.json`
- Modify: `games/inflation-rpg/src/App.tsx`

- [ ] **Step 1: 신규 UI 패키지 의존성 추가**
- [ ] **Step 2: 메인 App에 테마 로드 및 테스트 컴포넌트 배치**
- [ ] **Step 3: `pnpm dev` 실행 및 디자인 시스템 적용 확인**

