# Inflation RPG Phase 4a — MobileUX Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실기기(iOS/Android)에서 게임이 안전하게 동작하도록 Portrait 고정, Safe Area 대응, 터치 타겟 최소 크기, Phaser 반응형 스케일, 모바일 E2E 테스트를 구현한다.

**Architecture:** 새 파일 없음. 기존 CSS·config·Phaser 설정만 수정. Playwright에 iPhone 뷰포트를 추가해 모바일 레이아웃을 자동 검증한다. 모든 변경은 웹 dev-shell에서도 정상 동작해야 한다.

**Tech Stack:** Phaser 3 Scale Manager · CSS env(safe-area-inset-*) · Playwright · CapacitorJS

---

## File Map

| 파일 | 변경 종류 | 역할 |
|------|-----------|------|
| `games/inflation-rpg/tests/e2e/mobile-layout.spec.ts` | **Create** | 모바일 뷰포트 레이아웃 E2E 테스트 |
| `games/inflation-rpg/playwright.config.ts` | Modify | iPhone 14 프로젝트 추가 |
| `games/inflation-rpg/capacitor.config.ts` | Modify | Portrait 고정, backgroundColor |
| `games/inflation-rpg/src/app/layout.tsx` | Modify | viewport-fit=cover 메타 태그 |
| `games/inflation-rpg/src/app/globals.css` | Modify | overscroll-behavior: none |
| `games/inflation-rpg/src/styles/game.css` | Modify | 터치 타겟 44px, safe area padding |
| `games/inflation-rpg/src/battle/BattleGame.ts` | Modify | Phaser Scale.FIT 모드 |

---

## Task 1: Playwright에 iPhone 14 프로젝트 추가

**Files:**
- Modify: `games/inflation-rpg/playwright.config.ts`

- [ ] **Step 1: playwright.config.ts에 iPhone 14 프로젝트 추가**

```ts
// games/inflation-rpg/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SHELL_CWD = path.resolve(__dirname, '../../apps/dev-shell');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone14', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'pnpm --filter @forge/dev-shell dev',
    url: 'http://localhost:3000',
    cwd: DEV_SHELL_CWD,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: 커밋**

```bash
git add games/inflation-rpg/playwright.config.ts
git commit -m "test(game-inflation-rpg): add iPhone 14 Playwright project"
```

---

## Task 2: 모바일 레이아웃 실패 테스트 작성

**Files:**
- Create: `games/inflation-rpg/tests/e2e/mobile-layout.spec.ts`

- [ ] **Step 1: 실패 테스트 파일 작성**

```ts
// games/inflation-rpg/tests/e2e/mobile-layout.spec.ts
import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('Mobile layout — iPhone 14 viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();
    await page.waitForSelector('.game-root', { timeout: 10000 });
  });

  test('no horizontal overflow', async ({ page }) => {
    const result = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  });

  test('primary buttons meet 44px touch target height', async ({ page }) => {
    const buttons = page.locator('.btn-primary, .btn-secondary');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('viewport-fit=cover meta tag present', async ({ page }) => {
    const viewport = await page.$eval(
      'meta[name="viewport"]',
      (el) => el.getAttribute('content') ?? ''
    );
    expect(viewport).toContain('viewport-fit=cover');
  });

  test('game-root does not exceed viewport width', async ({ page }) => {
    const box = await page.locator('.game-root').boundingBox();
    const viewportSize = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(viewportSize.width);
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --project=iphone14 --grep "Mobile layout"
```

Expected: 여러 테스트 FAIL (viewport-fit 없음, 버튼 높이 부족 등)

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/tests/e2e/mobile-layout.spec.ts
git commit -m "test(game-inflation-rpg): add failing mobile layout E2E tests"
```

---

## Task 3: Portrait 고정 + viewport-fit=cover

**Files:**
- Modify: `games/inflation-rpg/capacitor.config.ts`
- Modify: `games/inflation-rpg/src/app/layout.tsx`

- [ ] **Step 1: capacitor.config.ts에 Portrait 고정**

```ts
// games/inflation-rpg/capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korea.inflationrpg',
  appName: 'KoreaInflationRPG',
  webDir: 'out',
  ios: {
    backgroundColor: '#0f0f14',
  },
  android: {
    backgroundColor: '#0f0f14',
  },
};

export default config;
```

Note: Capacitor의 orientation 고정은 `capacitor.config.ts`가 아니라 각 플랫폼 네이티브 설정에서 한다. iOS는 Xcode의 Deployment Info > Device Orientation, Android는 `AndroidManifest.xml`의 `android:screenOrientation="portrait"`. 이 단계에서는 backgroundColor만 추가.

- [ ] **Step 2: layout.tsx에 viewport-fit=cover 추가**

현재 layout.tsx의 `<html lang="en" suppressHydrationWarning>` 태그 안에 `<head>` 블록이 있다. `<head>` 내부에 viewport 메타 태그를 추가한다.

```tsx
// games/inflation-rpg/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "무한성장: 조선의 검",
  description: "A web-based remake of Inflation RPG with Korean aesthetics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 뷰포트 메타 테스트만 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --project=iphone14 --grep "viewport-fit"
```

Expected: PASS 1개

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/capacitor.config.ts games/inflation-rpg/src/app/layout.tsx
git commit -m "feat(game-inflation-rpg): add viewport-fit=cover and Capacitor background color"
```

---

## Task 4: Safe Area + Overscroll 방지 CSS

**Files:**
- Modify: `games/inflation-rpg/src/app/globals.css`
- Modify: `games/inflation-rpg/src/styles/game.css`

- [ ] **Step 1: globals.css에 overscroll-behavior 추가**

```css
/* games/inflation-rpg/src/app/globals.css */
/* 기존 내용 유지, html/body 블록에 아래 추가 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;        /* iOS pull-to-refresh, Android overscroll 방지 */
  -webkit-overflow-scrolling: auto; /* iOS momentum scroll 전역 비활성화 (개별 스크롤 영역에서 활성화) */
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
}

#game-container {
  width: 100vw;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
```

- [ ] **Step 2: game.css에 safe area padding 추가**

`.screen` 클래스에 safe area padding을 추가한다. `.game-root`가 아닌 `.screen`에 적용해 배경색은 엣지까지 채우되 콘텐츠는 safe area 안쪽에 위치하도록 한다.

```css
/* games/inflation-rpg/src/styles/game.css 전체 파일 */
:root {
  --bg-base: #0f0f14;
  --bg-panel: #1a1a24;
  --bg-card: #1e1e2e;
  --border: #2a2a38;
  --accent: #f0c060;
  --accent-dim: #2a2410;
  --text-primary: #e8e0d0;
  --text-secondary: #c8b88a;
  --text-muted: #666;
  --hp-color: #60e060;
  --atk-color: #e09060;
  --def-color: #60a0e0;
  --agi-color: #c060e0;
  --luc-color: #e0c060;
  --bp-color: #60c0f0;
  --danger: #e05050;
}

.game-root {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  /* Safe area: 콘텐츠가 노치·홈 인디케이터와 겹치지 않도록 */
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  box-sizing: border-box;
}

.btn-primary {
  background: var(--accent);
  color: #1a1a24;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 15px;
  min-height: 44px; /* iOS HIG 터치 타겟 최소값 */
  touch-action: manipulation; /* 더블탭 줌 방지 */
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 15px;
  min-height: 44px; /* iOS HIG 터치 타겟 최소값 */
  touch-action: manipulation;
}

.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}

/* Inventory·Shop 등 스크롤 가능한 목록 */
.scroll-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
```

- [ ] **Step 3: 수평 오버플로 + 버튼 높이 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --project=iphone14 --grep "Mobile layout"
```

Expected: 3개 PASS (viewport-fit, no horizontal overflow, button height). Phaser scale 테스트는 아직 FAIL일 수 있음.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/app/globals.css games/inflation-rpg/src/styles/game.css
git commit -m "feat(game-inflation-rpg): add safe area CSS, touch targets 44px, overscroll lock"
```

---

## Task 5: Phaser Scale.FIT 반응형 설정

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleGame.ts`

- [ ] **Step 1: BattleGame.ts Scale Manager 추가**

```ts
// games/inflation-rpg/src/battle/BattleGame.ts
import Phaser from 'phaser';
import { BattleScene } from './BattleScene';

interface BattleGameOptions {
  parent: string;
  onLevelUp: (newLevel: number) => void;
  onBattleEnd: (victory: boolean) => void;
  onBossKill: (bossId: string, bpReward: number) => void;
}

export function createBattleGame(opts: BattleGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    backgroundColor: '#0a1218',
    scene: BattleScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 360,
      height: 400,
    },
    callbacks: {
      postBoot: (game) => {
        game.scene.start('BattleScene', {
          onLevelUp: opts.onLevelUp,
          onBattleEnd: opts.onBattleEnd,
          onBossKill: opts.onBossKill,
        });
      },
    },
  });
}
```

- [ ] **Step 2: 타입체크 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/battle/BattleGame.ts
git commit -m "feat(game-inflation-rpg): use Phaser Scale.FIT for responsive battle canvas"
```

---

## Task 6: Inventory·Shop 스크롤 적용

**Files:**
- Modify: `games/inflation-rpg/src/styles/game.css` (`.game-root` overflow 수정)
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx` (items 컨테이너)
- Modify: `games/inflation-rpg/src/screens/Shop.tsx` (장비 목록 컨테이너)

`.game-root`가 `overflow: hidden`이라 모든 스크롤이 막혀있다. `overflow-x: hidden`으로 바꿔 세로 스크롤을 허용하고, 아이템 목록에 최대 높이를 준다.

- [ ] **Step 1: game.css의 .game-root overflow 수정**

```css
/* game.css — .game-root 블록 안의 overflow 줄만 변경 */
.game-root {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  overflow-x: hidden; /* hidden → overflow-x: hidden. Y 스크롤 허용 */
}
```

- [ ] **Step 2: Inventory.tsx 아이템 그리드에 scroll-list + maxHeight 추가**

`Inventory.tsx` 109번째 줄 — items 그리드 div:

```tsx
{/* Items — 기존 div에 className + maxHeight 추가 */}
<div
  className="scroll-list"
  style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, maxHeight: '45vh' }}
>
  {tabItems.map((item) => {
    const isEquipped = meta.equippedItemIds.includes(item.id);
    return (
      <EquipmentCard
        key={item.id}
        item={item}
        isEquipped={isEquipped}
        canEquip={!isFull && !isEquipped}
        onEquip={() => equipItem(item.id)}
        onUnequip={() => unequipItem(item.id)}
        onSell={() => sellEquipment(item.id, item.price)}
      />
    );
  })}
  {tabItems.length === 0 && (
    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
      장비가 없습니다
    </div>
  )}
</div>
```

- [ ] **Step 3: Shop.tsx 장비 목록에 scroll-list + maxHeight 추가**

`Shop.tsx` 66번째 줄 — 장비 목록 div:

```tsx
{/* 장비 구매 */}
<div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>⚔️ 장비</div>
<div className="scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '55vh' }}>
  {EQUIPMENT_CATALOG.map((item) => {
    const canBuy = run.goldThisRun >= item.price && canDrop(meta.inventory, item.slot);
    const statStr = Object.entries(item.stats.percent ?? {})
      .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
      .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
      .join(' ');
    return (
      <div key={item.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
          <div style={{ fontSize: 11, color: 'var(--atk-color)' }}>{statStr}</div>
        </div>
        <button
          disabled={!canBuy}
          onClick={() => buyEquipment(item.id, item.price)}
          style={{
            background: canBuy ? 'var(--accent)' : 'var(--bg-card)',
            color: canBuy ? '#1a1a24' : 'var(--text-muted)',
            border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
            cursor: canBuy ? 'pointer' : 'default',
          }}
        >
          {item.price.toLocaleString()}G
        </button>
      </div>
    );
  })}
</div>
```

- [ ] **Step 4: 타입체크 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/styles/game.css games/inflation-rpg/src/screens/Inventory.tsx games/inflation-rpg/src/screens/Shop.tsx
git commit -m "feat(game-inflation-rpg): enable Y-scroll and fix item list overflow for mobile"
```

---

## Task 7: 전체 테스트 통과 확인

- [ ] **Step 1: 모바일 E2E 전체 실행**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --project=iphone14
```

Expected: 모든 mobile-layout 테스트 PASS

- [ ] **Step 2: 기존 Desktop E2E 회귀 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --project=chromium
```

Expected: 기존 full-run 테스트 모두 PASS

- [ ] **Step 3: 유닛 테스트 회귀 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모든 Vitest 테스트 PASS

- [ ] **Step 4: 타입체크**

```bash
pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 5: 최종 커밋 (필요 시)**

모든 테스트 통과 후 미커밋 파일이 있으면:
```bash
git add -A
git commit -m "feat(game-inflation-rpg): complete MobileUX layer — Phase 4a"
```

---

## 수동 검증 체크리스트 (기기 테스트)

코드 구현 완료 후 실기기에서 확인할 항목. CI로 검증 불가.

```
iOS (Xcode Simulator 또는 실기기):
[ ] 노치/Dynamic Island 영역에 버튼·텍스트 침범 없음
[ ] 홈 인디케이터 영역에 버튼 침범 없음
[ ] 전투 Phaser 캔버스가 잘리지 않고 전체 표시됨
[ ] 스크롤 목록(인벤토리·상점)에서 스크롤 동작 확인
[ ] pull-to-refresh 없음 (overscroll 잠금 확인)
[ ] 오디오 Context 언락 없이도 UI 정상 동작

Android (에뮬레이터 또는 실기기):
[ ] 소프트 내비게이션 바 영역에 컨텐츠 침범 없음
[ ] 뒤로가기 제스처/버튼 — 앱이 종료되지 않음 (MainMenu에서는 종료 OK)
[ ] 전투 Phaser 캔버스 정상 표시
```

---

## 다음 단계

Phase 4a 완료 후:
- **Phase 4b** — `docs/superpowers/plans/2026-04-21-inflation-rpg-phase4b-sound.md` 작성
- 스펙 참조: `docs/superpowers/specs/2026-04-21-inflation-rpg-phase4-5-release-design.md`
