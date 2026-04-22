# 설계 스펙: Forge-UI Opus 재설계

> **상태**: Draft, 2026-04-22
> **결정권자**: kwanghan-bae
> **작성 배경**: Haiku/Sonnet 이 2026-04-21 에 작성한
> [unified-css-design-system-forge.md](./2026-04-21-unified-css-design-system-forge.md) 스펙 +
> [forge-ui-foundation.md](../plans/2026-04-21-forge-ui-foundation.md) 플랜 을
> Opus 관점에서 밑바닥부터 재검토한 결과물. 원본 스펙의 방향성(NES.css/RPGUI/Arwes 통합)은
> 2024-2026 오픈소스 지형과 어긋나 있어, shadcn registry 모델 기반으로 재설계한다.

## 0. 요약 (TL;DR)

- 한 스펙에 **세 레이어** 를 담는다: **A** 공용 규격 / **B** inflation-rpg 적용 / **C** scaffold.
- 각 레이어는 `CLAUDE.md` 의 **"3의 규칙"** 을 서로 다른 수준으로 준수한다 — 특히 Layer C 는
  **설계만 작성하고 구현은 게임 #2 도착 시까지 보류**.
- 기술 스택은 다음 조합으로 확정:
  - **L3 Component contract** (React 컴포넌트가 1차 인터페이스)
  - **M2 shadcn registry 모델** (패키지 승격 없이 소스 복사 기반 공용화)
  - **Tailwind v4 T-β 점진 마이그레이션** (기존 `game.css` grandfathered, 신규 승격분만 `@theme` 표준)
  - **Local registry hosting R-α** (`packages/registry/r/*.json`, `file:` 경로로 add)
- 외부 CSS 오픈소스 (NES.css, RPGUI, Arwes 등) 는 **직접 의존하지 않는다**. 대부분 4-10 년 방치
  상태이며, 2024-2026 표준은 shadcn registry 기반 컴포넌트 복사 모델 (Pixelact UI, 8bitcn).

---

## 1. 맥락 (Context)

### 1.1. 실제 현재 상태 vs 원본 스펙의 갭

원본 스펙은 `@forge/ui-core` + `@forge/theme-retro/fantasy/scifi` 다중 패키지 + NES.css/RPGUI/Arwes
통합 + Phaser-React EventBridge 를 목표로 한 야심찬 설계였다. 실제로 구현된 것은 다음과 같다:

- `packages/2d-core/src/ui-tokens.ts` — TypeScript contract 선제 정의 (타입/계약은 3의 규칙 예외로 허용)
- `games/inflation-rpg/src/styles/game.css` — 내부 CSS 변수 및 클래스를 `--forge-*` / `.forge-*` 네이밍으로 리네임
- **외부 오픈소스 미통합**, **새 테마 패키지 미생성**, **`@forge/ui-core` 미생성**

즉 원본 스펙 (웅장) 과 실제 구현 (보수적, 3의 규칙 안전지대로 후퇴) 사이에 큰 갭이 있다.
Opus 재검토는 이 갭의 원인 — **"공용화" 요구와 "3의 규칙" 제약의 충돌** — 을 해결하는 것이 핵심 과제.

### 1.2. 리서치로 밝혀진 오픈소스 지형 (2024-2026)

원본 스펙이 통합 대상으로 지목한 라이브러리는 대부분 방치 상태:

| 라이브러리 | 최신 릴리스 | 상태 | 판정 |
| --- | --- | --- | --- |
| NES.css | v2.3.0, 2019-12 | 4 년 + 방치, 42 issues / 37 PR 밀림 | 직접 의존 비권장 |
| RPGUI | v1.0.3, 2016-02 | 10 년 방치, 25KB CSS/JS + 1.35MB 이미지 | 미학 참고만 |
| nes-ui-react | no releases | 61 commits, SCSS 기반, 완성도 불확실 | 참고 불가 |
| Arwes | React 컴포넌트 | 판타지 RPG 에 미적 부적합 | inflation-rpg 밖의 게임용 |

반면 2024-2025 에 등장한 shadcn registry 기반 컴포넌트 라이브러리는 활발:

| 라이브러리 | 설치 방식 | 상태 | 판정 |
| --- | --- | --- | --- |
| Pixelact UI | `npx shadcn@latest add https://pixelactui.com/r/{name}.json` | 활성, MIT, Tailwind 기반 | 참고 원천 |
| 8bitcn (TheOrcDev) | `pnpm dlx shadcn@latest add @8bitcn/button` | 활성, 1.8k stars, v2 | 참고 원천 |
| RetroUI | shadcn 방식 | 활성, neo-brutalism (픽셀 아트 아님) | 후속 게임용 옵션 |

이 **shadcn registry 모델** 이 원본 스펙의 "다중 테마 패키지" 야망과 "3의 규칙" 제약을 동시에 해결하는
열쇠다. 컴포넌트 소스를 npm 패키지로 묶지 않고 **레지스트리에서 게임으로 복사** 하므로,
"선제 구현 승격" 이라는 3의 규칙 경계에 걸리지 않으면서도 공용 소스를 관리할 수 있다.

### 1.3. 재설계 목표

사용자 (kwanghan-bae) 의 원래 의도 — **"CSS 오픈소스를 적용해서 프레임워크 고도화"** — 를 실현하되,
현실에 맞는 기술 스택과 "3의 규칙" 준수를 모두 만족하는 설계를 정의한다.

---

## 2. Layer A — 공용 규격 (토큰·컴포넌트·테마)

### 2.1. 아키텍처 단방향 흐름

```
games/* → @forge/registry (shadcn add 로 소스 복사) → @forge/core (타입·계약·브릿지)
games/* → theme-* css (registry 에서 add)
Phaser Scene ↔ @forge/core/theme-bridge  (canvas 내부에서 CSS 변수 소비)
```

기존 [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) §2 의 4 계층 흐름과 충돌하지 않는다.
`@forge/registry` 는 게임의 상위 의존이 아니라 "빌드타임 복사 소스" 이므로 런타임 의존성 그래프에
들어가지 않는다. ESLint `boundaries` v5 룰에 `registry` element type 을 추가하되, 복사된 소스는
이미 게임 패키지 내부 파일로 편입되므로 별도 분류 필요 없음.

### 2.2. `packages/registry/` 워크스페이스 구조

```
packages/registry/
├── package.json              # @forge/registry, private: true
├── registry.json             # shadcn registry 루트: { items: [...] }
├── r/                        # 각 아이템의 메타데이터 JSON
│   ├── forge-button.json
│   ├── forge-panel.json
│   ├── forge-gauge.json
│   ├── forge-inventory-grid.json
│   ├── forge-screen.json
│   └── theme-modern-dark-gold.json
├── src/
│   ├── ui/                   # 컴포넌트 소스 (복사될 대상)
│   │   ├── forge-button.tsx
│   │   ├── forge-panel.tsx
│   │   ├── forge-gauge.tsx
│   │   ├── forge-inventory-grid.tsx
│   │   └── forge-screen.tsx
│   └── themes/
│       └── modern-dark-gold.css    # @theme { --forge-* } 블록
└── README.md                 # 각 아이템 사용법 + 추가 절차
```

각 게임의 `components.json` 은 `@forge/registry` 를 `aliases.ui` 로 지목하고, 아이템 추가는 다음과 같이:

```bash
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-button.json
pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-modern-dark-gold.json
```

### 2.3. `@forge/core/theme-bridge.ts` — Phaser ↔ React 토큰 브릿지

선제 승격을 **얇은 유틸 + 타입 수준** 으로만 허용하여 3의 규칙 경계 안에 머문다. 이전에 선제 정의된
`ForgeCSSTokens` 인터페이스 ([`packages/2d-core/src/ui-tokens.ts`](../../../packages/2d-core/src/ui-tokens.ts)) 를 재사용.

```typescript
// packages/2d-core/src/theme-bridge.ts

import type { ForgeCSSTokens } from './ui-tokens';

/**
 * Read a CSS custom property from :root and parse as 0xRRGGBB.
 * Phaser Graphics / Text 객체의 fillColor / color 속성에 바로 주입 가능.
 * Client-only — Phaser Scene.create() 시점에서만 호출.
 * 제약: CSS 변수 값은 6자리 hex (#RRGGBB) 전제. 3자리 hex / rgb() / hsl() 등은 지원하지 않는다.
 *       토큰 테마 CSS 작성 시 이 제약을 준수해야 한다.
 */
export function readForgeToken(name: keyof ForgeCSSTokens): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return parseInt(raw.replace('#', ''), 16);
}

export interface ForgeThemeBridge {
  bg: number;       // --forge-bg-base
  panel: number;    // --forge-bg-panel
  card: number;     // --forge-bg-card
  border: number;   // --forge-border
  accent: number;   // --forge-accent
  text: number;     // --forge-text-primary
  hp: number;       // --forge-stat-hp
  atk: number;      // --forge-stat-atk
  def: number;      // --forge-stat-def
  agi: number;      // --forge-stat-agi
  luc: number;      // --forge-stat-luc
  bp: number;       // --forge-stat-bp
  danger: number;   // --forge-danger
}

/**
 * 편의 팩토리: Phaser Scene 이 한 번에 여러 토큰 소비할 때 사용.
 * 내부적으로 readForgeToken 을 여러 번 호출하는 얇은 wrapper.
 * 구현: ForgeThemeBridge 의 각 필드를 대응하는 --forge-* 토큰으로부터 readForgeToken 으로 채움.
 */
export function resolveForgeTheme(): ForgeThemeBridge;
```

**판정 근거**: 이 파일은 대략 30-40 줄 수준의 얇은 유틸 + 타입 선언이다. `CLAUDE.md` §1 에 명시된
"구현 선제 승격 금지" 는 `SaveManager`, `EventBus`, `I18nManager` 같은 두꺼운 엔진/매니저급에 대한
경계이므로, 본 파일은 "계약 + 최소 유틸" 범주로 허용.

**기각된 대안**: `readForgeToken(name, override?)` — override 파라미터는 사용처가 지금 없고
"테스트에서 쓸 수도" 는 가설. YAGNI 로 제거. 필요해지면 추가.

### 2.4. 첫 컴포넌트 세트 (5 + 1 테마)

**선정 기준**: inflation-rpg 에 **실제로 실존하는 `.forge-*` 클래스 + `ForgeXxxProps` 인터페이스** 만
승격한다. 실존 검증 없이 추측으로 승격하지 않는다.

| 아이템 | 관련 파일 (inflation-rpg) | 기존 인터페이스 |
| --- | --- | --- |
| `forge-button` | [`styles/game.css:42-65`](../../../games/inflation-rpg/src/styles/game.css) | `ForgeButtonProps` — primary/secondary/disabled |
| `forge-panel` | [`styles/game.css:67-72`](../../../games/inflation-rpg/src/styles/game.css) | `ForgePanelProps` — inset/elevated |
| `forge-gauge` | [`styles/game.css:80-84`](../../../games/inflation-rpg/src/styles/game.css) | `ForgeGaugeProps` — value/stat/label |
| `forge-inventory-grid` | [`styles/game.css:86-90`](../../../games/inflation-rpg/src/styles/game.css) | `ForgeInventoryGridProps` — columns |
| `forge-screen` | [`styles/game.css:31-40`](../../../games/inflation-rpg/src/styles/game.css) | 클래스는 실존, `ForgeScreenProps` 인터페이스는 ui-tokens.ts 에 신규 추가 필요 (빈 객체 또는 safe-area 플래그 수준) |
| `theme-modern-dark-gold` | `:root` 섹션 [`styles/game.css:1-18`](../../../games/inflation-rpg/src/styles/game.css) | `ForgeCSSTokens` 전체 구현 |

**보류**: `ForgeDialog` — 원본 스펙에만 존재, inflation-rpg 에 아직 구현 없음. 3의 규칙 준수하여
Layer A 첫 세트에서 제외. 실제 필요 게임이 나타날 때 추가.

### 2.5. Tailwind v4 + `@theme` 표준 (T-β 점진)

**기본 원칙**:
- 모든 **신규 승격 아이템** 은 Tailwind v4 + `@theme` 블록 + `@apply` 합성 표준을 따른다.
- inflation-rpg 의 **기존 `game.css` 는 grandfathered** — 강제 마이그레이션 하지 않는다.
- Layer B 에서 inflation-rpg 의 `:root { --forge-*: ... }` 블록만 `@theme` 블록으로 이식
  (`.forge-*` 클래스 선언은 유지). 나머지는 점진.

**`theme-modern-dark-gold.css` 예시**:

```css
/* packages/registry/src/themes/modern-dark-gold.css */
@import "tailwindcss";

@theme {
  --color-forge-bg-base: #0f0f14;
  --color-forge-bg-panel: #1a1a24;
  --color-forge-bg-card: #1e1e2e;
  --color-forge-border: #2a2a38;
  --color-forge-accent: #f0c060;
  --color-forge-text-primary: #e8e0d0;
  /* ... ForgeCSSTokens 전체 */
}
```

Tailwind v4 의 `@theme` 는 자동으로 CSS custom property 와 utility class (`bg-forge-bg-base`,
`text-forge-accent` 등) 를 동시에 생성한다. Phaser 의 `readForgeToken` 은 CSS 변수 쪽을, React
컴포넌트는 utility class 쪽을 소비한다.

### 2.6. 테마 스왑 (런타임은 미래)

현재 설계는 **초기 1 회 로드** 만 지원. 런타임 테마 교체 (예: 설정 화면에서 "Dark" → "NES Pixel" 토글)
는 다음이 필요:

- React 셸: HTML root 의 class 토글로 테마 CSS 교체 (Tailwind v4 내장 지원)
- Phaser Scene: EventBus 구독 후 `resolveForgeTheme()` 재호출 → `hpBarFill.fillColor = theme.hp` 재주입

이 기능은 **게임 #2 가 실제 요구할 때** 추가. 지금 구현하면 3의 규칙 위반.

---

## 3. Layer B — inflation-rpg 미적 업그레이드

Layer A 완료 후, inflation-rpg 를 registry 의 **첫 소비자** 로 전환. 이 과정은 "Layer A 가 실제로
작동하는가" 를 검증하는 수단이기도 하다.

### 3.1. 마이그레이션 단계

**B1. `components.json` 생성 + registry 연결**
- [`games/inflation-rpg/components.json`](../../../games/inflation-rpg/) 신규 생성
- `aliases.ui = '@/components/ui'`, registry 경로 설정

**B2. `theme-modern-dark-gold` add**
- `pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-modern-dark-gold.json`
- inflation-rpg 의 `globals.css` 에서 생성된 테마 파일 import

**B3. forge-\* 컴포넌트 5 개 add**
- 각 컴포넌트 registry 에서 add → `src/components/ui/` 에 복사됨
- 기존 인라인 JSX (`<div className="forge-panel">` 직접 사용) 를 점진적으로 `<ForgePanel>` 로 교체
- **한 번에 전부 교체 강제하지 않는다** — 점진적

**B4. Phaser BattleScene hex 치환**
- 현재 상태: [`battle/BattleScene.ts`](../../../games/inflation-rpg/src/battle/BattleScene.ts) 의
  hard-code hex 3 개
  - `0x0a1218` (bg rectangle, line 45)
  - `0x1a1a2a` (hpBarBg, line 63)
  - `0xe03030` (hpBarFill, line 64)
- 목표 상태:
  ```typescript
  import { resolveForgeTheme } from '@forge/core';

  create() {
    const theme = resolveForgeTheme();
    this.add.rectangle(0, 0, 360, 600, theme.bg).setOrigin(0);
    this.hpBarBg = this.add.rectangle(16, 44, 320, 10, theme.panel).setOrigin(0);
    this.hpBarFill = this.add.rectangle(16, 44, 320, 10, theme.hp).setOrigin(0);
  }
  ```
- **실제 값 drift 주의**: `0x0a1218` → `0x0f0f14` 등 미세한 색상 변화 발생 가능. 시각 회귀 테스트로 확인.

**B5. `game.css` 의 `:root` 블록 이식**
- 기존 `:root { --forge-*: ... }` 를 `theme-modern-dark-gold.css` 로 이동
- inflation-rpg 의 `game.css` 에서는 중복 선언 제거
- `.forge-*` 클래스 정의는 그대로 유지 (grandfathered)

**B6. 시각 회귀 검증**
- 기존 Playwright E2E smoke (iPhone 14 뷰포트) 갱신
- 전체 화면 screenshot diff 로 색상 drift 확인
- 허용 임계값: 색상 차이 < 5% (hard-code hex → token 변환의 미세 차이 수용)

### 3.2. Layer B 성공 기준

- `pnpm --filter @forge/game-inflation-rpg build:web` 성공
- `pnpm --filter @forge/game-inflation-rpg typecheck` 0 exit
- `pnpm --filter @forge/game-inflation-rpg test` 60 기존 Vitest 테스트 통과
- `pnpm --filter @forge/game-inflation-rpg e2e` smoke 통과 + 시각 회귀 허용 범위 내
- `theme-modern-dark-gold.css` 를 다른 테마로 교체하는 것이 빌드 수준에서 가능 (아직 다른 테마 없으므로 검증 불가, 설계 수준만)

---

## 4. Layer C — scaffold (설계만, 구현 보류)

**중요 선언**: 본 Layer 는 **설계 문서만 작성** 하고 **실제 구현은 유보** 한다. 이유:

1. 현재 게임이 inflation-rpg 1 개뿐이므로 "게임 #2 를 찍어낼 공통 패턴" 의 데이터가 없다.
2. CLAUDE.md §1 "3의 규칙" 이 명시한 "게임 #2 가 실제 쓰기 전까지 승격 금지" 는 scaffold CLI /
   템플릿 복제 로직에도 적용된다.
3. 가설에 기반한 scaffold 는 게임 #2 도착 시 대부분 버려지고 재작성될 가능성이 높다.

본 Layer 의 산출물은 **문서** 이며, 구현 착수 조건이 명시된다.

### 4.1. "canonical forge-app" 디렉토리 계약 (문서화 대상)

새 게임 워크스페이스가 반드시 가져야 할 최소 구조를 `docs/CONTRIBUTING.md` §12 의 확장으로
문서화한다:

```
games/<new-game>/
├── package.json              # @forge/game-<name>, workspace deps
├── tsconfig.json             # extends ../../tsconfig.base.json
├── next.config.ts            # output: 'export', ...
├── capacitor.config.ts       # ios/android 타겟
├── components.json           # shadcn registry pointer
├── playwright.config.ts
├── vitest.config.ts
├── .eslintrc.cjs             # boundaries v5 element: game
├── public/
│   └── manifest.json         # @forge/core GameManifest
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── globals.css       # @import "@/components/ui/themes/<theme>.css"
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/               # ← registry 에서 add 된 forge-* 컴포넌트 복사본
│   ├── startGame.ts          # StartGameFn 구현
│   └── ...
└── e2e/
    └── smoke.spec.ts
```

### 4.2. `create-game` CLI 계약 스케치

**개념 스케치** 만 작성. 실제 패키지 `@forge/create-game` 은 구현 유보.

```bash
pnpm dlx @forge/create-game my-new-game \
    --theme=modern-dark-gold \
    --components=forge-button,forge-panel,forge-gauge,forge-screen \
    --genre=rpg
```

예상 동작:
1. `games/my-new-game/` 디렉토리 생성, canonical 구조 템플릿 복제
2. `pnpm dlx shadcn add` 로 선택된 테마 + 컴포넌트 registry 에서 복사
3. `package.json` 의 `name`, `@forge/*` workspace deps 자동 설정
4. `pnpm install` 실행
5. `apps/dev-shell/src/lib/registry.ts` / `.server.ts` 에 새 게임 매니페스트 등록

### 4.3. 구현 착수 조건

본 Layer 의 CLI / 템플릿 실제 구현은 다음 조건이 모두 충족될 때 착수:

- [ ] 게임 #2 가 실존 (별도 워크스페이스로 존재)
- [ ] inflation-rpg 와 게임 #2 사이에 **공통 scaffold 패턴** 이 **3 개 이상** 실제 나타남
  - 예: 테마 선택 방식, Phaser Scene 부트 시퀀스, E2E smoke 구조, Capacitor 설정 등
- [ ] 두 게임이 Layer A 의 registry 를 각각 소비하며 공통 병목이 식별됨

조건 미충족 상태에서 구현 착수는 **CLAUDE.md §1 3의 규칙 위반**.

---

## 5. Cross-cutting 원칙

### 5.1. "3의 규칙" 판정 기준 (이 스펙 전용 해석)

- **타입 · 인터페이스 · Zod 스키마**: 선제 정의 OK (구현 강제하지 않음)
- **얇은 유틸** (~30-40 줄 이하, 의존성 최소): 선제 승격 OK (예: `theme-bridge.ts`)
- **registry 아이템** (소스 복사 방식): 선제 "등록" OK, 단 **inflation-rpg 에 실존하는 것만**
- **두꺼운 매니저 · 엔진 클래스**: 게임 #2 도착 + 공통 사용 3 회 확인 후 승격
- **CLI · 템플릿 복제 로직**: 게임 #2 실존 + 공통 패턴 3 개 확인 후 구현

### 5.2. 단방향 의존성

기존 [`ARCHITECTURE.md` §2](../../ARCHITECTURE.md) 의 4 계층 흐름을 유지한다. `@forge/registry` 는
**빌드타임 복사 소스** 이므로 런타임 의존 그래프에 포함되지 않지만, ESLint `boundaries` v5 룰에
`registry` element type 을 추가하여 다음 규칙 강제:

- `games/* → @forge/registry` 방향만 허용 (add 시점의 `file:` 경로 참조일 뿐 런타임 import 아님, 복사 후엔 게임 내부 파일로 편입)
- `@forge/registry → @forge/core` 허용 (registry 소스가 ForgeCSSTokens, ForgeButtonProps 등 타입 import 가능)
- `@forge/core → @forge/registry` **금지** (역방향)
- `@forge/registry → @forge/registry` **금지** (registry 아이템 간 상호 import — 복사 방식이라 상호 의존 불가)
- 순환 금지, `madge --circular` 가 CI 에서 강제

### 5.3. `StartGame(config)` 계약 불변

기존 [`ARCHITECTURE.md` §4](../../ARCHITECTURE.md) 의 `StartGame(config)` 계약은 본 스펙으로 변경되지 않는다:

- `config.assetsBasePath`: 기존 그대로
- `config.exposeTestHooks`: 기존 그대로
- **`config.theme` / `config.themeTokens`: 추가하지 않는다** — 테마는 CSS 변수 + Tailwind class 토글로 전달,
  Phaser 는 `resolveForgeTheme()` 가 DOM 에서 직접 읽음. config 확장 불필요.

---

## 6. 확장 로드맵 (미래 작업)

다음 항목들은 본 스펙에 포함되지 않지만, 각 조건 충족 시 별도 스펙으로 착수:

| 항목 | 착수 조건 |
| --- | --- |
| `forge-dialog` registry 아이템 | 어떤 게임이든 dialog UI 를 실제 구현한 후 |
| `forge-toast` registry 아이템 | 동일 |
| 런타임 테마 스왑 (EventBus + Scene.reload) | 게임 #2 가 테마 교체 기능을 요구 |
| 두 번째 테마 (예: `theme-nes-pixel`) | 게임 #2 가 픽셀 아트 미학을 요구 |
| 원격 registry 호스팅 (GitHub Pages) | 외부 공개 요구 발생 시 |
| `@forge/create-game` CLI 실제 구현 | Layer C §4.3 조건 충족 시 |
| Phaser 캔버스 내부 HP 바 · 데미지 숫자의 재사용 가능한 컴포넌트화 | 게임 #2 도 Phaser 전투를 사용하고 공통 패턴 식별 시 |

---

## 7. 알려진 리스크

| 리스크 | 완화 방안 |
| --- | --- |
| Tailwind v4 의 `@theme` + `@apply` 가 inflation-rpg 의 기존 `game.css` 와 충돌 | T-β 점진 — 기존 블록 grandfathered, 신규만 표준 적용 |
| shadcn CLI 의 `file:` 경로 로컬 add 안정성 미검증 | Layer A 에 smoke 테스트 추가: registry 아이템 하나를 더미 target 에 add 해보는 단위 검증 |
| Phaser hex → CSS 변수 파싱 엣지 케이스 (예: 3 자리 hex, `rgb()`) | `readForgeToken` 은 6 자리 hex 만 가정, 다른 포맷은 throw. 토큰 값 제약 명시 |
| 시각 회귀 — hex 3 개 치환 시 미세한 색상 drift | B6 단계에서 Playwright screenshot diff 허용 5% 임계 |
| Layer C 유보로 게임 #2 착수 시 큰 작업량 폭발 | Layer C 의 **문서 자체** 는 지금 작성하여, 게임 #2 때 "무엇을 만들지" 는 이미 설계됨 |
| `@forge/registry` 를 ESLint boundaries element 로 추가하는 것이 v5 룰과 호환되는지 미확인 | Layer A 구현 초반에 실험 — 호환 안 되면 단순히 package.json 의 private 속성으로 격리 |

---

## 8. 기각된 대안

| 대안 | 기각 사유 |
| --- | --- |
| M1 참고 원천만 (자체 전부 재구현) | 2024-2026 표준 (shadcn registry) 미활용, 작업량 최대 |
| M3 npm 직접 의존 (NES.css, RPGUI 등) | 대부분 4-10 년 방치, 유지보수 없음 |
| T-α Tailwind 전면 전환 | inflation-rpg 기존 게임 UI 코드 깨뜨릴 위험, 작업량 큼 |
| 원격 registry 호스팅 (지금) | YAGNI — 공개 요구 없음 |
| `readForgeToken` 의 override 파라미터 | 사용처 없음, "테스트에서 쓸 수도" 는 가설. 필요해지면 추가 |
| `<ForgeDialog>` 첫 세트 포함 | inflation-rpg 에 실구현 없음, 3의 규칙 위반 |
| 다중 테마 패키지 (`@forge/theme-retro` 등) 선제 분리 | 테마가 1 개뿐이라 분리 의미 없음, registry 아이템으로 충분 |
| `StartGame(config)` 에 `theme` / `themeTokens` 필드 추가 | CSS 변수 + Tailwind class 로 전달하면 됨, config 확장 불필요 |

---

## 9. 성공 기준 (Acceptance Criteria)

### Layer A
- [ ] `packages/registry/` 워크스페이스 생성, `pnpm install` 성공
- [ ] `registry.json` + 6 개 (5 컴포넌트 + 1 테마) `r/*.json` 작성
- [ ] 각 아이템을 더미 target 디렉토리에 `shadcn add` 가능 (smoke 검증)
- [ ] `@forge/core/theme-bridge.ts` 작성, typecheck 0 exit, 단위 테스트 (`readForgeToken` · `resolveForgeTheme`) 통과
- [ ] ESLint boundaries v5 룰 업데이트 및 CI 통과

### Layer B
- [ ] inflation-rpg 에 `components.json` 및 6 개 registry 아이템 add 완료
- [ ] `BattleScene.ts` 의 hex 3 개 → `resolveForgeTheme()` 로 치환
- [ ] 기존 60 개 Vitest 테스트 통과
- [ ] Playwright E2E smoke (iPhone 14) 통과, 시각 회귀 5% 이내
- [ ] `pnpm --filter @forge/game-inflation-rpg build:web` 성공

### Layer C
- [ ] `docs/CONTRIBUTING.md` §12 가 canonical forge-app 디렉토리 계약으로 확장됨
- [ ] `create-game` CLI 계약 스케치 문서화 완료
- [ ] **구현 착수 조건** (§4.3) 이 명시적으로 기록됨 — 게임 #2 도착 시 재검토 트리거

---

## 10. 오픈 질문 · 보류

- `forge-dialog` 가 승격될 첫 게임이 어느 것이 될지 미정. inflation-rpg 에 dialog UI 가 나중에
  추가되면 그때 첫 승격.
- `theme-nes-pixel` 의 첫 후보 게임이 게임 #2 일지 게임 #3 일지 미정.
- `@forge/registry` 를 **public npm 패키지로 publish** 할지는 본 스펙 범위 밖. 현재는 private workspace.
- inflation-rpg 의 Phaser 쪽 전투 HP 바 · 데미지 숫자 자체가 향후 공통 추상으로 승격될 가치가 있는지는
  게임 #2 의 전투 유무에 따라 결정.

---

## 11. 참고 자료

- [2026-04-21 원본 스펙 (Haiku/Sonnet)](./2026-04-21-unified-css-design-system-forge.md)
- [2026-04-21 원본 플랜 (미실행)](../plans/2026-04-21-forge-ui-foundation.md)
- [CLAUDE.md](../../../CLAUDE.md) — "3의 규칙" 원칙
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — 4 계층 단방향 의존성
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — 새 게임 추가 절차
- shadcn registry 예시: [Pixelact UI](https://www.pixelactui.com/), [8bitcn](https://www.8bitcn.com)
- Tailwind v4 `@theme`: [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)
