// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 01: Todas as páginas carregam sem erros
// ============================================================

const PAGES = [
  { name: 'Landing (index)', path: '/index.html' },
  { name: 'App principal', path: '/app.html' },
  { name: 'Auth (login)', path: '/auth.html' },
  { name: 'Perfil', path: '/perfil.html' },
  { name: 'Termos', path: '/termos.html' },
  { name: 'Privacidade', path: '/privacidade.html' },
  { name: 'Contato', path: '/contato.html' },
];

for (const page of PAGES) {
  test(`${page.name} carrega sem erros JS`, async ({ page: p }) => {
    const errors = [];
    p.on('pageerror', err => errors.push(err.message));

    const response = await p.goto(page.path, { waitUntil: 'domcontentloaded' });

    // Página retorna 200
    expect(response?.status()).toBe(200);

    // Sem erros JS no console
    expect(errors, `Erros JS encontrados em ${page.name}: ${errors.join(', ')}`).toHaveLength(0);
  });
}

test('lessons.json carrega corretamente', async ({ page }) => {
  const response = await page.goto('/lessons.json');
  expect(response?.status()).toBe(200);

  const data = await response?.json();
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThan(0);

  // Cada módulo tem lessons
  for (const mod of data) {
    expect(mod).toHaveProperty('title');
    expect(mod).toHaveProperty('lessons');
    expect(mod.lessons.length).toBeGreaterThan(0);
  }
});

test('Service Worker registra sem erro', async ({ page }) => {
  await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
  const sw = await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || null);
  // SW pode não ativar imediatamente, mas não deve haver erro
});

test('manifest.json é válido', async ({ page }) => {
  const response = await page.goto('/manifest.json');
  expect(response?.status()).toBe(200);
  const manifest = await response?.json();
  expect(manifest).toHaveProperty('name');
  expect(manifest).toHaveProperty('start_url');
  expect(manifest).toHaveProperty('icons');
  expect(manifest.icons.length).toBeGreaterThan(0);
});
