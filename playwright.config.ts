import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5081', trace: 'retain-on-failure',
    launchOptions: { args: ['--disable-gpu', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=128'] } },
  webServer: [
    { command: 'node scripts/e2e-api.mjs', url: 'http://127.0.0.1:5081/health/ready', timeout: 120_000, reuseExistingServer: false },
  ],
});
