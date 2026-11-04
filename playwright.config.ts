import { defineConfig, devices } from '@playwright/test';

/**
 * E2E на собранной версии (vite preview): так проверяется и Service Worker.
 * Браузер: встроенный Chromium Playwright, либо системный (PW_CHANNEL=msedge / chrome).
 */
const channel = process.env.PW_CHANNEL;
const withChannel = channel ? { channel } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  // Сценарии с реальным временем чувствительны к нагрузке на машину — не больше двух браузеров сразу.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'ru-RU',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...withChannel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...withChannel } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
