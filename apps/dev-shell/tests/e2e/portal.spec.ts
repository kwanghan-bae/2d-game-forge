import { expect, test } from '@playwright/test';

test('portal lists registered games', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /신의 마을: 영원의 후원자/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /조선 인플레이션 RPG/ }),
  ).toBeVisible();
});

test('V4 manifest route mounts the V4 product entrypoint', async ({ page }) => {
  await page.goto('/games/inflation-rpg');

  await expect(page.getByTestId('game-title')).toHaveText('신의 마을: 영원의 후원자');
  await expect(page.getByTestId('v4-app')).toBeVisible();
  await expect(page.getByTestId('v4-app').getByRole('heading', { name: '신의 마을: 영원의 후원자' })).toBeVisible();
});

test('legacy manifest route mounts the preserved V3 entrypoint', async ({ page }) => {
  await page.goto('/games/inflation-rpg-legacy');

  await expect(page.getByTestId('game-title')).toHaveText('조선 인플레이션 RPG (Legacy)');
  await expect(page.getByTestId('main-menu')).toBeVisible();
});

test('unknown game slug renders 404', async ({ page }) => {
  const response = await page.goto('/games/does-not-exist');
  expect(response?.status()).toBe(404);
});
