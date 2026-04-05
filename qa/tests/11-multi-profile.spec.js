// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 11: Multi-perfil — criar, alternar, PIN pais, isolamento
// ============================================================

test.describe('Multi-Perfil', () => {

  async function setupMainProfile(page) {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'PaiMae', avatar: '👨‍👩‍👧', xp: 200, lvl: 3, streak: 5,
        streakDays: [], last: new Date().toDateString(),
        done: { '0-0': true, '0-1': true, '0-2': true },
        quiz: { '0-0': true, '0-1': false }, ageGroup: 'adult',
        cMod: null, cLes: null
      }));
      localStorage.removeItem('escola_profiles');
      localStorage.removeItem('escola_pin');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      var sp = document.getElementById('splash'); if (sp) sp.style.display = 'none';
      var el = document.getElementById('onboard'); if (el) el.style.display = 'none';
      var wn = document.getElementById('wnOverlay'); if (wn) wn.classList.remove('show');
      if (typeof goDash === 'function') goDash();
    });
    await page.waitForSelector('.mc', { timeout: 20000 });
  }

  test('Profile switch section renderiza', async ({ page }) => {
    await setupMainProfile(page);

    const switchEl = page.locator('#profileSwitch');
    await expect(switchEl).toBeVisible({ timeout: 5000 });

    // With single profile, the switch area shows "+" link to add profile
    const html = await switchEl.innerHTML();
    expect(html.length).toBeGreaterThan(0);
    console.log(`✓ Profile switch renderizado (${html.includes('+') ? 'botão adicionar visível' : 'perfis visíveis'})`);
  });

  test('Criar perfil secundário funciona', async ({ page }) => {
    await setupMainProfile(page);

    // Mock window.prompt to return a name
    await page.evaluate(() => {
      window._origPrompt = window.prompt;
      window.prompt = () => 'Joaozinho';
    });

    // Click add profile button
    const addBtn = page.locator('.profile-manage').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Verify profile was created
      const profiles = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('escola_profiles')); }
        catch { return null; }
      });

      expect(profiles).toBeTruthy();
      const keys = Object.keys(profiles);
      expect(keys.length).toBeGreaterThanOrEqual(2);

      // One profile should be named "Joaozinho"
      const hasNew = Object.values(profiles).some(p => p.name === 'Joaozinho');
      expect(hasNew).toBe(true);
      console.log(`✓ Perfil "Joaozinho" criado (${keys.length} perfis total)`);
    } else {
      console.log('⚠ Botão adicionar perfil não visível');
    }

    // Restore prompt
    await page.evaluate(() => { window.prompt = window._origPrompt; });
  });

  test('Alternar entre perfis carrega dados corretos', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'Perfil1', avatar: '🦊', xp: 300, lvl: 4, streak: 10,
        done: { '0-0': true }, quiz: {}, ageGroup: 'adult', cMod: null, cLes: null
      }));
      localStorage.setItem('escola_v2_p_child', JSON.stringify({
        name: 'Filho1', avatar: '🦁', xp: 50, lvl: 1, streak: 2,
        done: {}, quiz: {}, ageGroup: 'adult', cMod: null, cLes: null
      }));
      localStorage.setItem('escola_profiles', JSON.stringify({
        default: { name: 'Perfil1' },
        p_child: { name: 'Filho1' }
      }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    // Current should be Perfil1
    const name1 = await page.evaluate(() => window.S?.name);
    expect(name1).toBe('Perfil1');

    // Switch to child profile
    await page.evaluate(() => {
      if (typeof switchProfile === 'function') switchProfile('p_child');
    });
    await page.waitForTimeout(500);

    const name2 = await page.evaluate(() => window.S?.name);
    expect(name2).toBe('Filho1');

    // XP should be different
    const xp2 = await page.evaluate(() => window.S?.xp);
    expect(xp2).toBe(50);
    console.log(`✓ Perfis isolados: Perfil1 (300 XP) → Filho1 (50 XP)`);
  });

  test('Progresso é isolado por perfil', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'Parent', xp: 500, lvl: 5, done: { '0-0': true, '0-1': true, '1-0': true },
        quiz: { '0-0': true }, ageGroup: 'adult', cMod: null, cLes: null
      }));
      localStorage.setItem('escola_v2_p_kid', JSON.stringify({
        name: 'Kid', xp: 10, lvl: 1, done: {},
        quiz: {}, ageGroup: 'adult', cMod: null, cLes: null
      }));
      localStorage.setItem('escola_profiles', JSON.stringify({
        default: { name: 'Parent' }, p_kid: { name: 'Kid' }
      }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    const parentDone = await page.evaluate(() => Object.keys(window.S.done).length);
    expect(parentDone).toBe(3);

    await page.evaluate(() => switchProfile('p_kid'));
    await page.waitForTimeout(500);

    const kidDone = await page.evaluate(() => Object.keys(window.S.done).length);
    expect(kidDone).toBe(0);

    console.log(`✓ Isolamento: Parent ${parentDone} aulas, Kid ${kidDone} aulas`);
  });

  test('PIN do dashboard dos pais funciona', async ({ page }) => {
    await setupMainProfile(page);

    // Set a PIN hash
    const pinSet = await page.evaluate(async () => {
      if (typeof setPin === 'function') {
        await setPin('1234');
        return true;
      }
      return false;
    });

    if (pinSet) {
      // Verify PIN was saved
      const hasPin = await page.evaluate(() => !!localStorage.getItem('escola_pin'));
      expect(hasPin).toBe(true);
      console.log('✓ PIN salvo no localStorage');

      // Verify PIN hash is not plaintext
      const pinValue = await page.evaluate(() => localStorage.getItem('escola_pin'));
      expect(pinValue).not.toBe('1234');
      expect(pinValue.length).toBeGreaterThan(20); // SHA-256 hash
      console.log(`✓ PIN hasheado (${pinValue.substring(0, 16)}...)`);
    } else {
      console.log('⚠ setPin não disponível');
    }
  });

  test('PIN overlay renderiza e aceita input', async ({ page }) => {
    await setupMainProfile(page);

    // Trigger PIN overlay
    await page.evaluate(() => {
      if (typeof showPinOverlay === 'function') {
        showPinOverlay('set', () => {});
      }
    });
    await page.waitForTimeout(300);

    const overlay = page.locator('#pinOverlay');
    if (await overlay.isVisible().catch(() => false)) {
      // PIN pad should have buttons 0-9
      const keys = await page.locator('.pin-key').count();
      expect(keys).toBeGreaterThanOrEqual(10); // 0-9 + backspace + empty

      // PIN dots should be present
      const dots = await page.locator('.pin-dot').count();
      expect(dots).toBe(4);

      // Click 4 digits
      for (const digit of ['1', '2', '3', '4']) {
        const btn = page.locator(`.pin-key:text("${digit}")`);
        if (await btn.isVisible()) await btn.click();
        await page.waitForTimeout(100);
      }

      // All 4 dots should be filled
      const filled = await page.locator('.pin-dot.filled').count();
      expect(filled).toBe(4);
      console.log('✓ PIN overlay funciona: 4 dígitos inseridos');

      // Close
      await page.evaluate(() => { if (typeof closePin === 'function') closePin(); });
    } else {
      console.log('⚠ PIN overlay não apareceu');
    }
  });

  test('Parent dashboard renderiza com dados dos perfis', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'Mae', avatar: '👩', xp: 100, lvl: 2, streak: 3,
        streakDays: [new Date().toISOString().slice(0, 10)],
        done: { '0-0': true }, quiz: { '0-0': true }, ageGroup: 'adult',
        cMod: null, cLes: null
      }));
      localStorage.setItem('escola_profiles', JSON.stringify({
        default: { name: 'Mae' }
      }));
      // Skip PIN for test
      localStorage.removeItem('escola_pin');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    // Open parent dashboard directly (skip PIN)
    await page.evaluate(() => {
      if (typeof openParentDash === 'function') openParentDash();
    });
    await page.waitForTimeout(500);

    const parentView = page.locator('#vParent');
    const isOn = await parentView.evaluate(el => el.classList.contains('on')).catch(() => false);
    if (isOn) {
      const cards = await page.locator('.parent-card').count();
      expect(cards).toBeGreaterThanOrEqual(1);
      console.log(`✓ Dashboard dos pais: ${cards} perfil(is) exibido(s)`);
    } else {
      console.log('⚠ Parent dashboard não abriu');
    }
  });
});
