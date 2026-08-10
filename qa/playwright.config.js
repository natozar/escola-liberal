// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { writeFileSync } = require('fs');
const { join } = require('path');

const BASE_URL = process.env.QA_URL || 'https://escolaliberal.com.br';

// ============================================================
// Seed de estado (2026-08-10): o app atual exige age gate 18+ e
// onboarding. Este storageState injeta um perfil adulto verificado
// em TODOS os testes, sem precisar tocar cada spec.
// ============================================================
const SEED = {
  cookies: [],
  origins: [{
    origin: BASE_URL,
    localStorage: [
      { name: 'escola_v2', value: JSON.stringify({
          name: 'QA Bot', avatar: '🤖', ageGroup: 'adult',
          onboardingDone: true, xp: 0, done: {}, quiz: {},
          theme: 'dark', consentLGPD: true
        }) },
      { name: 'jogo_age_ok', value: '1' },
      { name: 'escola_cookie_consent', value: 'accepted' }
    ]
  }]
};
const SEED_PATH = join(__dirname, '.qa-storage-state.json');
writeFileSync(SEED_PATH, JSON.stringify(SEED));

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  timeout: 25000,
  expect: { timeout: 7000 },
  use: {
    baseURL: BASE_URL,
    storageState: SEED_PATH,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 20000,
    actionTimeout: 10000,
  },
  // NOTA: o CI instala apenas chromium — projetos mobile usam
  // emulação chromium (Pixel 7). O antigo projeto iPhone 14 (WebKit)
  // travava o job inteiro tentando lançar um navegador inexistente.
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
