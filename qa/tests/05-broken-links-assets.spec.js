// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 05: Links quebrados, assets 404, console errors
// ============================================================

test.describe('Links e Assets', () => {

  test('App.html — sem requests 404', async ({ page }) => {
    const failed = [];
    page.on('response', res => {
      if (res.status() >= 400) {
        failed.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (failed.length > 0) {
      console.log('❌ Requests com erro:');
      console.table(failed);
    }
    expect(failed, `${failed.length} requests falharam`).toHaveLength(0);
  });

  test('Auth.html — sem requests 404', async ({ page }) => {
    const failed = [];
    page.on('response', res => {
      if (res.status() >= 400) {
        failed.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('/auth.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (failed.length > 0) {
      console.log('❌ Requests com erro:');
      console.table(failed);
    }
    expect(failed, `${failed.length} requests falharam`).toHaveLength(0);
  });

  test('Index.html — sem requests 404', async ({ page }) => {
    const failed = [];
    page.on('response', res => {
      if (res.status() >= 400) {
        failed.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (failed.length > 0) {
      console.log('❌ Requests com erro:');
      console.table(failed);
    }
    expect(failed, `${failed.length} requests falharam`).toHaveLength(0);
  });

  test('Ícones do PWA existem', async ({ page }) => {
    const icons = [
      '/assets/icons/icon-192.png',
      '/assets/icons/icon-512.png',
      '/assets/icons/favicon.svg',
    ];

    for (const icon of icons) {
      const res = await page.goto(icon);
      expect(res?.status(), `${icon} retornou ${res?.status()}`).toBe(200);
    }
    console.log('✓ Todos os ícones PWA acessíveis');
  });

  test('CSS e JS carregam sem erro', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const resources = [];
    page.on('response', res => {
      const url = res.url();
      if (url.endsWith('.css') || url.endsWith('.js') || url.includes('.css?') || url.includes('.js?')) {
        resources.push({ url: url.split('/').pop(), status: res.status() });
      }
    });

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });

    console.log('📦 Resources carregados:');
    console.table(resources);

    const broken = resources.filter(r => r.status >= 400);
    expect(broken, `Resources quebrados: ${broken.map(b => b.url).join(', ')}`).toHaveLength(0);
  });
});
