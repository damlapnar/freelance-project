// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'tests/report', open: 'never' }]],
  webServer: {
    command: 'node node_modules/serve/build/main.js . -l 3737 --no-clipboard',
    url: 'http://localhost:3737',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  use: {
    baseURL: 'http://localhost:3737',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
});
