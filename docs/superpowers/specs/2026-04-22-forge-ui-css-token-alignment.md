# 설계 스펙: Forge-UI CSS 토큰 정렬

이 문서는 `2d-game-forge`의 UI 디자인 시스템 기반 작업을 정의한다.
기존 `2026-04-21-unified-css-design-system-forge.md` 스펙을 보강하여
"3의 규칙"을 준수하는 현실적인 접근 방식을 확정한다.

## 1. 아키텍처 결정

### 1.1. 핵심 원칙

기존 계획서(`2026-04-21-forge-ui-foundation.md`)는 `@forge/ui-core`와
`@forge/theme-retro` 패키지를 게임 #2 없이 선제 생성하는 방식이었다.
이는 ARCHITECTURE.md §3 "3의 규칙"을 위반한다.

**이 스펙이 채택하는 접근 방식 (접근 B):**

```
현재                                    이 작업 이후
──────────────────────────────────────────────────────────
games/inflation-rpg/
  src/styles/game.css   →  forge-ui 규격 리네이밍 (파일 위치 유지)
  src/screens/*.tsx     →  반복 패턴만 .forge-* 클래스로 교체

packages/2d-core/
  src/                  →  CSS 토큰 TypeScript 타입만 추가
                            (구현 코드 없음, 순수 계약)

게임 #2 도착 시:
  game.css → git mv → packages/theme-retro/src/index.css
  @forge/core 타입 → 실제 패키지 구조로 전환
```

### 1.2. 의존성 흐름 (변경 없음)

```
games/* → genre cores + plugins → 2d-core → (phaser, react)
```

새 패키지를 만들지 않으므로 의존성 그래프에 변화 없음.

### 1.3. 외부 라이브러리 채택 없음

- **NES.css 채택 안 함**: inflation-rpg의 어두운 게임 UI 스타일과 NES.css의
  밝은 8bit 픽셀 보더 스타일이 근본적으로 불일치.
- **Tailwind v4 확장 사용 안 함**: 현재 codebase는 globals.css에만 Tailwind를
  import하고 실제 컴포넌트에서는 거의 사용하지 않음. 외부 CSS 추상화 레이어
  추가는 불필요한 복잡도.
- 순수 커스텀 CSS 변수 기반 "Custom Dark Retro" 테마 유지.

## 2. CSS 토큰 네이밍 규격

### 2.1. CSS 변수 — `--forge-` 네임스페이스

모든 CSS 변수를 `--forge-` 접두사로 통일한다. 미래 패키지 분리 시 네임스페이스
충돌을 방지한다.

| 현재 | 변경 후 |
|---|---|
| `--bg-base` | `--forge-bg-base` |
| `--bg-panel` | `--forge-bg-panel` |
| `--bg-card` | `--forge-bg-card` |
| `--accent` | `--forge-accent` |
| `--accent-dim` | `--forge-accent-dim` |
| `--danger` | `--forge-danger` |
| `--text-primary` | `--forge-text-primary` |
| `--text-secondary` | `--forge-text-secondary` |
| `--text-muted` | `--forge-text-muted` |
| `--border` | `--forge-border` |
| `--hp-color` | `--forge-stat-hp` |
| `--atk-color` | `--forge-stat-atk` |
| `--def-color` | `--forge-stat-def` |
| `--agi-color` | `--forge-stat-agi` |
| `--luc-color` | `--forge-stat-luc` |
| `--bp-color` | `--forge-stat-bp` |

### 2.2. CSS 클래스 — `.forge-*` 플랫 구조

BEM 없이 단순 `.forge-*` 네이밍. modifier는 `.forge-btn.primary` 형태로.

| 현재 | 변경 후 |
|---|---|
| `.game-root` | `.forge-ui-root` |
| `.screen` | `.forge-screen` |
| `.panel` | `.forge-panel` |
| `.btn-primary` | `.forge-btn.primary` |
| `.btn-secondary` | `.forge-btn.secondary` |
| `.scroll-list` | `.forge-scroll-list` |
| (없음) | `.forge-gauge` (신규 추출 — 진행 바 컨테이너: `position: relative`, `border-radius`, `overflow: hidden`) |
| (없음) | `.forge-inventory-grid` (신규 추출 — `display: grid`, `grid-template-columns: repeat(2, 1fr)`, `gap`) |

## 3. @forge/core TypeScript 계약 (구현 없음)

`packages/2d-core/src/ui-tokens.ts`를 신규 생성한다.
CLAUDE.md가 허용하는 "타입·계약 선제 정의"에 해당한다.

```ts
// 전체 CSS 토큰 타입 맵 (자동완성 지원용)
export interface ForgeCSSTokens {
  '--forge-bg-base': string;
  '--forge-bg-panel': string;
  '--forge-bg-card': string;
  '--forge-accent': string;
  '--forge-accent-dim': string;
  '--forge-danger': string;
  '--forge-text-primary': string;
  '--forge-text-secondary': string;
  '--forge-text-muted': string;
  '--forge-border': string;
  '--forge-stat-hp': string;
  '--forge-stat-atk': string;
  '--forge-stat-def': string;
  '--forge-stat-agi': string;
  '--forge-stat-luc': string;
  '--forge-stat-bp': string;
}

// 스탯 토큰 유니언 (타입 안전한 stat 참조)
export type ForgeStatToken = 'hp' | 'atk' | 'def' | 'agi' | 'luc' | 'bp';

// 컴포넌트 prop 계약 (구현 없음 — 미래 @forge/ui-core를 위한 인터페이스)
export interface ForgeButtonProps {
  variant?: 'primary' | 'secondary' | 'disabled';
}

export interface ForgePanelProps {
  variant?: 'inset' | 'elevated';
}

export interface ForgeGaugeProps {
  value: number;       // 0-100
  stat?: ForgeStatToken;
  label?: string;
}

export interface ForgeInventoryGridProps {
  columns?: 2 | 3 | 4;
  children?: React.ReactNode;
}
```

`@forge/core`의 `src/index.ts`에서 re-export 추가.

## 4. 컴포넌트 마이그레이션 범위

### 4.1. 클래스화 대상 (반복 구조 패턴)

| 패턴 | 적용 컴포넌트 |
|---|---|
| `.forge-btn` | 모든 screen의 버튼 |
| `.forge-panel` | 모달, 카드 컨테이너 |
| `.forge-screen` | 모든 screen 루트 div |
| `.forge-gauge` | StatAlloc 스탯 바 |
| `.forge-inventory-grid` | Inventory 2열 그리드 |
| `.forge-scroll-list` | Shop, Inventory 스크롤 영역 |

### 4.2. 인라인 유지 대상 (동적·상태 기반)

```tsx
// 이런 패턴은 그대로 유지 —
style={{ background: selected ? 'var(--forge-accent-dim)' : 'var(--forge-bg-card)' }}
style={{ color: `var(--forge-stat-${stat})` }}
style={{ opacity: isLocked ? 0.4 : 1 }}
style={{ width: `${pct}%` }}
```

동적 값이 들어가는 인라인 스타일은 CSS 변수 참조만 `--forge-*`로 교체.

### 4.3. 영향 파일 목록

```
packages/2d-core/src/ui-tokens.ts          (신규)
packages/2d-core/src/index.ts              (re-export 추가)
games/inflation-rpg/src/styles/game.css    (변수·클래스 리네이밍)
games/inflation-rpg/src/app/globals.css    (.forge-ui-root 루트 설정)
games/inflation-rpg/src/screens/MainMenu.tsx
games/inflation-rpg/src/screens/ClassSelect.tsx
games/inflation-rpg/src/screens/Inventory.tsx
games/inflation-rpg/src/screens/Shop.tsx
games/inflation-rpg/src/screens/Battle.tsx
games/inflation-rpg/src/screens/WorldMap.tsx
games/inflation-rpg/src/screens/RegionMap.tsx
games/inflation-rpg/src/screens/GameOver.tsx
games/inflation-rpg/src/components/StatAlloc.tsx
```

## 5. 테스트 전략

### 5.1. 작업 순서 (안전한 순서)

```
Step 1: game.css CSS 변수 리네이밍
        → 컴포넌트 var(--forge-*) 일괄 치환
        → pnpm test 통과 확인

Step 2: CSS 클래스 리네이밍 (.forge-* 적용)
        → 컴포넌트 className 일괄 치환
        → pnpm test 통과 확인

Step 3: @forge/core ui-tokens.ts 추가
        → pnpm typecheck 통과 확인

Step 4: 최종 검증
        → pnpm e2e (full-game-flow 통과)
        → pnpm lint (boundaries 위반 없음)
```

### 5.2. 사전 체크

구현 시작 전 기존 테스트의 className 참조 여부를 확인한다:
```bash
grep -r "btn-primary\|game-root\|scroll-list\|--accent\|--bg-base" \
  games/inflation-rpg/src --include="*.test.*"
```
발견 시 CSS 변경과 동반 수정.

### 5.3. 완료 기준

- `pnpm test` — 기존 60개 전부 통과
- `pnpm typecheck` — 0 errors
- `pnpm e2e` — full-game-flow 통과
- `pnpm lint` — boundaries 위반 없음
- `pnpm circular` — 순환 의존 없음

## 6. 게임 #2 도착 시 승격 경로

이 작업이 완료되면 테마 패키지 분리는 기계적 절차가 된다.

```bash
# 1. 테마 패키지 디렉터리 생성
mkdir -p packages/theme-retro/src

# 2. game.css 이동 (복사 아님)
git mv games/inflation-rpg/src/styles/game.css \
        packages/theme-retro/src/index.css

# 3. package.json 생성
#    { "name": "@forge/theme-retro", "main": "src/index.css" }

# 4. 두 게임 모두 import 교체
#    - import '../styles/game.css' → import '@forge/theme-retro'

# 5. @forge/core ui-tokens.ts는 이미 존재 → 그대로 유지
```

**승격이 쉬운 이유:**
- CSS 변수가 이미 `--forge-*` → 두 게임 간 충돌 없음
- 클래스명이 이미 `.forge-*` → 두 게임 모두 동일 클래스 사용
- TypeScript 계약이 이미 `@forge/core`에 있음 → 구현만 추가

## 7. 기존 스펙과의 관계

`2026-04-21-unified-css-design-system-forge.md`의 장기 비전(멀티 테마,
장르별 UI 프리팹)은 유효하다. 이 스펙은 그 비전으로 가는 **첫 번째 단계**를
"3의 규칙"을 준수하는 방식으로 재정의한다.

| 기존 계획서 | 이 스펙 |
|---|---|
| `@forge/ui-core` 패키지 즉시 생성 | `@forge/core`에 타입만 추가 |
| `@forge/theme-retro` 패키지 즉시 생성 | `game.css` 위치 유지, 리네이밍만 |
| NES.css 의존성 | 없음 |
| Tailwind v4 `@apply` 추상화 | 없음 |
| inflation-rpg 테스트 통합 | 기존 60개 테스트 regression 방지 명시 |
