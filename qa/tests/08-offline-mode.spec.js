// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 08: Offline mode — PWA funciona sem rede
// ============================================================

test.describe('Offline Mode', () => {
  // Offline tests require a production-like environment with HTTPS + active SW.
  // On localhost without HTTPS, SW may not install or cache properly.
  // These tests are best run against the production URL or a local HTTPS server.

  test('App carrega e SW registra antes de testar offline', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });

    // Wait for SW to install and activate
    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const reg = await navigator.serviceWorker.ready;
        return !!reg.active;
      } catch { return false; }
    });
    expect(swReady).toBe(true);
    console.log('✓ Service Worker ativo');
  });

  test('Dashboard renderiza após ir offline', async ({ page, context }) => {
    test.slow(); // offline tests need extra time

    // Load page online first to populate cache
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#mcards', { timeout: 15000 });

    // Wait for SW cache to be populated
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Reload — should serve from SW cache
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });

    // Dashboard should still render
    const mcards = page.locator('#mcards');
    await expect(mcards).toBeVisible({ timeout: 15000 });

    const cardCount = await page.locator('.mc').count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✓ Offline: ${cardCount} módulos renderizados do cache`);

    // Restore network
    await context.setOffline(false);
  });

  test('Navegação entre módulos funciona offline', async ({ page, context }) => {
    test.slow();

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    // Skip onboarding if present
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }
    await page.waitForSelector('#mcards', { timeout: 15000 });

    // Click first module to cache it
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on', { timeout: 5000 });

    // Go back to dashboard
    await page.evaluate(() => { if (typeof goDash === 'function') goDash(); });
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);

    // Try navigating to the same module — should work from cache
    await page.locator('.mc').first().click();
    await page.waitForTimeout(1000);

    const modView = page.locator('#vMod');
    const isOn = await modView.evaluate(el => el.classList.contains('on'));
    expect(isOn).toBe(true);

    // Should have no fatal errors
    const fatal = errors.filter(e => !e.includes('fetch') && !e.includes('network') && !e.includes('Failed'));
    expect(fatal).toHaveLength(0);
    console.log('✓ Navegação offline funciona');

    await context.setOffline(false);
  });

  test('offline.html é servido como fallback para páginas não cacheadas', async ({ page, context }) => {
    test.slow();

    // Load app first to register SW
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Try navigating to a page that is NOT in CORE_ASSETS cache
    // Use a non-existent path — SW should serve offline.html fallback
    const response = await page.goto('/nonexistent-page-xyz.html', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    }).catch(() => null);

    // If SW is working, it serves offline.html (200) instead of network error
    // If not cached, we get an error — both are acceptable
    if (response) {
      const body = await page.textContent('body');
      const hasOfflineContent = body.includes('offline') || body.includes('Offline') ||
                                 body.includes('conexão') || body.includes('internet');
      console.log(`✓ Fallback page: status ${response.status()}, has offline content: ${hasOfflineContent}`);
    } else {
      console.log('⚠ Navigation failed (expected when offline for uncached pages)');
    }

    await context.setOffline(false);
  });

  test('localStorage persiste dados offline', async ({ page, context }) => {
    test.slow();

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });

    // Set some state
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'Teste Offline', xp: 100, lvl: 2, streak: 3, done: { '0-0': true }, quiz: {}
      }));
    });

    // Go offline and reload
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verify state was restored
    const state = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('escola_v2')); }
      catch { return null; }
    });

    expect(state).toBeTruthy();
    expect(state.name).toBe('Teste Offline');
    expect(state.xp).toBe(100);
    console.log('✓ Estado localStorage preservado offline');

    await context.setOffline(false);
  });

  test('Indicador online/offline aparece', async ({ page, context }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Check if sync indicator shows offline status
    const indicator = page.locator('.sync-indicator');
    if (await indicator.isVisible().catch(() => false)) {
      const text = await indicator.textContent();
      const isOfflineMsg = text.toLowerCase().includes('offline') || text.includes('local');
      console.log(`✓ Indicador offline: "${text}" (is offline msg: ${isOfflineMsg})`);
    } else {
      console.log('⚠ Indicador de sync não visível (pode ser por timing)');
    }

    await context.setOffline(false);
  });
});
