import { defineConfig } from '@playwright/test';

// UI behavior uses mocked API responses; real authorization/persistence are covered by AgendaApiTests.
export default defineConfig({
  testDir: './e2e', testMatch: 'agenda-ui.spec.ts', workers: 1, timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5082', trace: 'retain-on-failure',
    launchOptions: { args: ['--disable-gpu', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=128'] } },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5082',
    url: 'http://127.0.0.1:5082', reuseExistingServer: false,
  },
});
