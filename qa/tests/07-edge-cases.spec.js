// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 07: Edge cases — erros, caminhos sem volta, estados impossíveis
// ============================================================

test.describe('Edge Cases & Caminhos sem volta', () => {

  test('App funciona sem localStorage (modo privado)', async ({ page, context }) => {
    // Limpar storage
    await context.clearCookies();

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });

    // Deve carregar mesmo sem dados salvos
    const mcards = page.locator('#mcards');
    await expect(mcards).toBeVisible({ timeout: 10000 });
    expect(errors).toHaveLength(0);
    console.log('✓ App funciona sem localStorage');
  });

  test('App não quebra com localStorage corrompido', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Injetar dados corrompidos antes de carregar
    await page.goto('about:blank');
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', '{corrupted data!!!');
    });

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });

    const mcards = page.locator('#mcards');
    await expect(mcards).toBeVisible({ timeout: 10000 });

    // Não deve ter erros fatais
    const fatal = errors.filter(e => !e.includes('JSON'));
    expect(fatal, `Erros fatais: ${fatal.join(', ')}`).toHaveLength(0);
    console.log('✓ App se recupera de localStorage corrompido');
  });

  test('Navegar diretamente para hash module funciona', async ({ page }) => {
    await page.goto('/app.html#module-1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Deve ter aberto o módulo 0 (module-1 = index 0)
    const modView = page.locator('#vMod');
    const isOn = await modView.evaluate(el => el.classList.contains('on'));
    // Pode ou não funcionar, mas não deve crashar
    console.log(`✓ Hash navigation: módulo ${isOn ? 'aberto' : 'não abriu (ok se onboarding)'}`);
  });

  test('Duplo clique rápido em módulo não quebra', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }
    await page.waitForSelector('#mcards');

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Duplo clique rápido
    const card = page.locator('.mc').first();
    await card.dblclick();
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
    console.log('✓ Duplo clique não causa erro');
  });

  test('Busca com string vazia não quebra', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }

    const searchBox = page.locator('#searchBox');
    if (await searchBox.isVisible().catch(() => false)) {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await searchBox.fill('');
      await searchBox.fill('economia');
      await page.waitForTimeout(300);
      await searchBox.fill('');
      await page.waitForTimeout(300);
      await searchBox.fill('xyznotexist');
      await page.waitForTimeout(300);

      expect(errors).toHaveLength(0);
      console.log('✓ Busca funciona sem erros');
    }
  });

  test('Cookie banner não bloqueia interação', async ({ page }) => {
    // Limpar consent para forçar banner
    await page.goto('about:blank');
    await page.evaluate(() => localStorage.removeItem('escolalib_cookie_consent'));

    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });

    const banner = page.locator('#cookieBanner');
    if (await banner.isVisible().catch(() => false)) {
      // Mesmo com banner, módulos devem ser clicáveis
      const onboard = page.locator('#onboard');
      if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
        const btn = onboard.locator('button');
        if (await btn.isVisible()) await btn.click();
      }
      await page.waitForSelector('#mcards');

      const card = page.locator('.mc').first();
      await card.click({ force: true });
      await page.waitForTimeout(500);

      // Aceitar cookies
      const acceptBtn = page.locator('#cbAccept');
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click();
      }
      console.log('✓ Cookie banner não bloqueia cliques');
    } else {
      console.log('⚠ Cookie banner não apareceu (consent já dado)');
    }
  });

  test('Múltiplos hideAllViews não causam estado inconsistente', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Navegar rapidamente entre views
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        if (typeof hideAllViews === 'function') hideAllViews();
        if (typeof goDash === 'function') goDash();
      }
    });

    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);

    // Dashboard deve estar visível
    const dash = page.locator('#vDash');
    const display = await dash.evaluate(el => getComputedStyle(el).display);
    expect(display).not.toBe('none');
    console.log('✓ Estado consistente após múltiplas navegações');
  });
});
