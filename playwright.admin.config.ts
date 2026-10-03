import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'admin-ui.spec.ts', workers: 1, timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5180', trace: 'retain-on-failure',
    launchOptions: { args: ['--disable-gpu', '--renderer-process-limit=1'] } },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5180 --strictPort',
    url: 'http://127.0.0.1:5180', reuseExistingServer: false },
});
