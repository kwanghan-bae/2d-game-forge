import { expect, test } from '@playwright/test';

test('portal lists registered games', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /신의 마을: 영원의 후원자/ }),
  ).toBeVisible();
});

test('Village manifest route mounts the Village product entrypoint', async ({ page }) => {
  await page.goto('/games/inflation-rpg');

  await expect(page).toHaveTitle('신의 마을: 영원의 후원자');
  await expect(page.getByTestId('game-title')).toHaveText('신의 마을: 영원의 후원자');
  await expect(page.getByTestId('village-app')).toBeVisible();
  await expect(page.getByTestId('village-app').getByRole('heading', { name: '신의 마을: 영원의 후원자' })).toBeVisible();
});

test('portal navigation replaces the previous game root', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /신의 마을: 영원의 후원자/ }).click();
  await expect(page.getByTestId('village-app')).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await page.getByRole('link', { name: /신의 마을: 영원의 후원자/ }).click();
  await expect(page.getByTestId('village-app')).toBeVisible();
});

test('unknown game slug renders 404', async ({ page }) => {
  const response = await page.goto('/games/does-not-exist');
  expect(response?.status()).toBe(404);
});
