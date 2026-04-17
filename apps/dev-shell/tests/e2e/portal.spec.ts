import { expect, test } from '@playwright/test';

test('portal shows empty state when no games are registered', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(page.getByTestId('no-games')).toContainText(
    '아직 등록된 게임이 없습니다',
  );
});

test('unknown game slug renders 404', async ({ page }) => {
  const response = await page.goto('/games/does-not-exist');
  expect(response?.status()).toBe(404);
});
