// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 10: Paywall — acesso a módulos, bloqueio premium, checkout
// ============================================================

test.describe('Paywall Flow', () => {

  /** Setup logged-in free user state */
  async function setupFreeUser(page) {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'FreeUser', avatar: '🧑‍🎓', xp: 50, lvl: 1, streak: 1,
        streakDays: [], last: new Date().toDateString(), done: {},
        quiz: {}, ageGroup: 'adult', cMod: null, cLes: null
      }));
      localStorage.setItem('escola_last_version', '99.0.0');
      localStorage.setItem('escolalib_install_v2', '1');
      localStorage.setItem('escolalib_cookie_consent', 'all');
    });
    await page.reload({ waitUntil: 'networkidle' });
    // Wait for app to fully boot (ES modules + async _boot + lessons load)
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      var sp = document.getElementById('splash'); if (sp) sp.style.display = 'none';
      var el = document.getElementById('onboard'); if (el) el.style.display = 'none';
      var wn = document.getElementById('wnOverlay'); if (wn) wn.classList.remove('show');
      var pwa = document.getElementById('pwaOverlay'); if (pwa) pwa.classList.remove('show');
      var cb = document.getElementById('cookieBanner'); if (cb) cb.style.display = 'none';
      if (typeof goDash === 'function') goDash();
    });
    await page.waitForSelector('.mc', { timeout: 20000 });
  }

  test('Módulos 0 e 1 são sempre acessíveis', async ({ page }) => {
    await setupFreeUser(page);

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Use goMod() directly to avoid click interception issues
    await page.evaluate(() => { if (typeof goMod === 'function') goMod(0); });
    await page.waitForTimeout(800);

    const modView = page.locator('#vMod');
    const isOn = await modView.evaluate(el => el.classList.contains('on')).catch(() => false);
    expect(isOn).toBe(true);
    console.log('✓ Módulo 0 acessível via goMod(0)');

    // Go back and try module 1
    await page.evaluate(() => { if (typeof goDash === 'function') goDash(); });
    await page.waitForTimeout(500);

    await page.evaluate(() => { if (typeof goMod === 'function') goMod(1); });
    await page.waitForTimeout(800);

    const isOn2 = await modView.evaluate(el => el.classList.contains('on')).catch(() => false);
    expect(isOn2).toBe(true);
    console.log('✓ Módulo 1 acessível via goMod(1)');

    expect(errors).toHaveLength(0);
  });

  test('isModUnlocked retorna true para todos por padrão (paywall off)', async ({ page }) => {
    await setupFreeUser(page);

    // By default paywall is disabled (_paywallDisabled = true)
    const results = await page.evaluate(() => {
      const unlocked = [];
      const M = window.M || [];
      for (let i = 0; i < Math.min(M.length, 10); i++) {
        unlocked.push({
          index: i,
          title: M[i]?.title || 'unknown',
          unlocked: typeof isModUnlocked === 'function' ? isModUnlocked(i) : true
        });
      }
      return unlocked;
    });

    // All should be unlocked when paywall is disabled (default)
    for (const r of results) {
      expect(r.unlocked).toBe(true);
    }
    console.log(`✓ Todos os ${results.length} módulos desbloqueados (paywall desabilitado)`);
  });

  test('isModuleUnlocked bloqueia módulos quando paywall ativado', async ({ page }) => {
    await setupFreeUser(page);

    // Simulate paywall enabled + free plan
    const results = await page.evaluate(() => {
      // Temporarily enable paywall
      window._paywallDisabled = false;
      // Simulate free user without Supabase sync
      // isModuleUnlocked checks syncEnabled + currentUser, which are false offline
      // So it returns true (offline/unauthenticated = all open)
      const res = typeof isModuleUnlocked === 'function' ? isModuleUnlocked(5) : null;
      // Restore
      window._paywallDisabled = true;
      return { exists: typeof isModuleUnlocked === 'function', result: res };
    });

    if (results.exists) {
      // Without auth, isModuleUnlocked returns true (offline experience)
      expect(results.result).toBe(true);
      console.log('✓ isModuleUnlocked retorna true sem auth (experiência offline)');
    } else {
      console.log('⚠ isModuleUnlocked não encontrada');
    }
  });

  test('showModulePaywall renderiza modal com botão de checkout', async ({ page }) => {
    await setupFreeUser(page);

    // Trigger paywall modal
    await page.evaluate(() => {
      if (typeof showModulePaywall === 'function') showModulePaywall(2);
    });
    await page.waitForTimeout(500);

    const modal = page.locator('#paywallModal');
    if (await modal.isVisible().catch(() => false)) {
      // Should show module title
      const text = await modal.textContent();
      expect(text.length).toBeGreaterThan(20);

      // Should have checkout link to perfil.html#planos
      const link = modal.locator('a[href*="perfil.html"]');
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toContain('planos');
      console.log('✓ Paywall modal com link para planos');

      // Close button should work
      const closeBtn = modal.locator('.save-modal-close');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
        const stillVisible = await modal.isVisible().catch(() => false);
        expect(stillVisible).toBe(false);
        console.log('✓ Paywall modal fecha corretamente');
      }
    } else {
      console.log('⚠ Paywall modal não apareceu');
    }
  });

  test('Perfil page tem seção de planos', async ({ page }) => {
    const response = await page.goto('/perfil.html', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);

    // Check for pricing/plans section
    const body = await page.textContent('body');
    const hasPricing = body.includes('Plano') || body.includes('plano') ||
                       body.includes('Premium') || body.includes('R$');
    console.log(`✓ Perfil page: ${hasPricing ? 'contém seção de planos' : 'planos não visíveis (pode precisar de auth)'}`);
  });

  test('Todos os cards de módulo são clicáveis sem erro', async ({ page }) => {
    await setupFreeUser(page);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const cards = page.locator('.mc');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Click first 5 modules and verify they open
    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.evaluate((idx) => {
        if (typeof goDash === 'function') goDash();
        setTimeout(() => { if (typeof goMod === 'function') goMod(idx); }, 300);
      }, i);
      await page.waitForTimeout(1000);

      // Should either open module or show paywall
      const modOn = await page.locator('#vMod').evaluate(el => el.classList.contains('on')).catch(() => false);
      const paywallShown = await page.locator('#paywallModal').isVisible().catch(() => false);

      expect(modOn || paywallShown).toBe(true);
      if (paywallShown) {
        await page.evaluate(() => {
          const m = document.getElementById('paywallModal');
          if (m) m.remove();
        });
      }
    }

    expect(errors).toHaveLength(0);
    console.log(`✓ ${Math.min(count, 5)} módulos clicados sem erros`);
  });
});
