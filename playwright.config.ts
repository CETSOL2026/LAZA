import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.LAZA_E2E_PORT ?? 8796);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && node server/indicator-api.mjs',
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { LAZA_API_PORT: String(port) },
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
