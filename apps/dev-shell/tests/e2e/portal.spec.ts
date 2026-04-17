import { expect, test } from '@playwright/test';

test('portal lists registered games', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /조선 인플레이션 RPG/ }),
  ).toBeVisible();
});

test('unknown game slug renders 404', async ({ page }) => {
  const response = await page.goto('/games/does-not-exist');
  expect(response?.status()).toBe(404);
});
