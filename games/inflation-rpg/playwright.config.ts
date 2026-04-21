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
