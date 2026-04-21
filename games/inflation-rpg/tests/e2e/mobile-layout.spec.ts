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
