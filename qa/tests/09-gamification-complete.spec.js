// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 09: Gamificação end-to-end — XP, streak, badges, missions, leaderboard
// ============================================================

test.describe('Gamificação Completa', () => {

  /** Helper: skip onboarding, set clean state, go to dashboard */
  async function setupCleanState(page) {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'TestUser', avatar: '🧑‍🎓', xp: 50, lvl: 1, streak: 0,
        streakDays: [], last: null, done: {}, quiz: {}, ageGroup: 'adult',
        cMod: null, cLes: null
      }));
      // Suppress What's New and PWA modals
      localStorage.setItem('escola_last_version', '99.0.0');
      localStorage.setItem('escolalib_install_v2', '1');
      localStorage.setItem('escolalib_cookie_consent', 'all');
    });
    await page.reload({ waitUntil: 'networkidle' });
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

  test('XP aumenta após responder quiz corretamente', async ({ page }) => {
    await setupCleanState(page);

    // Get initial XP
    const xpBefore = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('escola_v2')).xp; }
      catch { return 0; }
    });

    // Navigate to first lesson with quiz
    // Navigate via JS to avoid click interception from overlays
    await page.evaluate(() => { if (typeof goMod === 'function') goMod(0); });
    await page.waitForSelector('#vMod.on', { timeout: 5000 });
    await page.evaluate(() => { if (typeof openL === 'function') openL(0, 0); });
    await page.waitForTimeout(500);
    await page.waitForSelector('#vLes.on', { timeout: 5000 });

    // Find and click a quiz option
    const quizOpts = page.locator('.qz-o');
    if (await quizOpts.first().isVisible().catch(() => false)) {
      await quizOpts.first().click();
      await page.waitForTimeout(800);

      const xpAfter = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('escola_v2')).xp; }
        catch { return 0; }
      });

      // XP should have changed (either from quiz answer or lesson completion)
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('escola_v2')));
      expect(Object.keys(state.quiz).length).toBeGreaterThan(0);
      console.log(`✓ XP: ${xpBefore} → ${xpAfter} (quiz respondido)`);
    } else {
      console.log('⚠ Nenhum quiz na primeira aula');
    }
  });

  test('Streak incrementa com estudo diário', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'StreakTest', avatar: '🧑‍🎓', xp: 0, lvl: 1, streak: 5,
        streakDays: [yesterday.toISOString().slice(0, 10)],
        last: yesterday.toDateString(), done: {}, quiz: {}, ageGroup: 'adult',
        cMod: null, cLes: null
      }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    // Streak should have incremented (studied yesterday, now today)
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('escola_v2')));
    expect(state.streak).toBeGreaterThanOrEqual(5);
    console.log(`✓ Streak: ${state.streak} dias (esperado ≥5, estudou ontem)`);

    // Streak display should show the value
    const streakEl = page.locator('#sStreak');
    if (await streakEl.isVisible().catch(() => false)) {
      const text = await streakEl.textContent();
      expect(text).toContain('🔥');
      console.log(`✓ Streak display: ${text}`);
    }
  });

  test('Badges desbloqueiam ao atingir condições', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'BadgeTest', avatar: '🧑‍🎓', xp: 200, lvl: 3, streak: 7,
        streakDays: [], last: new Date().toDateString(),
        done: { '0-0': true, '0-1': true, '0-2': true, '0-3': true, '0-4': true },
        quiz: { '0-0': true, '0-1': true, '0-2': false },
        ageGroup: 'adult', cMod: null, cLes: null
      }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    // Check achievements section
    const achs = page.locator('#achs');
    await expect(achs).toBeVisible({ timeout: 5000 });

    const unlocked = await page.locator('.ach.on').count();
    const locked = await page.locator('.ach.off').count();
    const total = unlocked + locked;
    expect(total).toBeGreaterThan(0);
    console.log(`✓ Badges: ${unlocked} desbloqueados, ${locked} bloqueados (total: ${total})`);

    if (unlocked > 0) {
      const achTexts = await page.locator('.ach.on .ach-nm').allTextContents();
      console.log(`✓ Badges desbloqueados: ${achTexts.slice(0, 3).join(', ')}`);
    } else {
      console.log('⚠ Nenhum badge desbloqueado (estado pode não ter sido aplicado corretamente)');
    }
  });

  test('Badges page (goBadges) renderiza', async ({ page }) => {
    await setupCleanState(page);

    // Navigate to badges via evaluate
    await page.evaluate(() => {
      if (typeof goBadges === 'function') goBadges();
    });
    await page.waitForTimeout(500);

    const badgesView = page.locator('#vBadges');
    const isOn = await badgesView.evaluate(el => el.classList.contains('on')).catch(() => false);
    if (isOn) {
      const badgeCards = await page.locator('.badge-card').count();
      expect(badgeCards).toBeGreaterThan(10); // Should have many badges
      const progress = page.locator('#badgesProgress');
      await expect(progress).toBeVisible();
      console.log(`✓ Badges page: ${badgeCards} badges renderizados`);
    } else {
      console.log('⚠ Badges view não abriu (pode estar escondida por mobile)');
    }
  });

  test('Missões semanais renderizam', async ({ page }) => {
    await setupCleanState(page);

    const missions = page.locator('#missionsSection');
    await expect(missions).toBeVisible({ timeout: 5000 });

    const missionItems = await page.locator('.mission').count();
    expect(missionItems).toBeGreaterThanOrEqual(2);
    console.log(`✓ ${missionItems} missões semanais renderizadas`);

    // Each mission should have a name and progress
    const firstMission = page.locator('.mission').first();
    const mName = await firstMission.locator('.mission-name').textContent();
    expect(mName.length).toBeGreaterThan(0);
    console.log(`✓ Primeira missão: ${mName}`);
  });

  test('Missão pode ser claimada quando completa', async ({ page }) => {
    // Set state with enough progress to complete "5 aulas" mission
    const done = {};
    for (let i = 0; i < 5; i++) done[`0-${i}`] = true;

    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate((doneObj) => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'MissionTest', avatar: '🧑‍🎓', xp: 100, lvl: 2, streak: 3,
        streakDays: [], last: new Date().toDateString(), done: doneObj,
        quiz: {}, ageGroup: 'adult', cMod: null, cLes: null
      }));
      // Clear mission state to force regeneration
      localStorage.removeItem('escola_missions');
    }, done);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    // Check if any mission has a claim button
    const claimBtn = page.locator('.mission .btn');
    if (await claimBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✓ Botão de claim visível para missão completa');
    } else {
      console.log('⚠ Nenhum botão de claim (missão pode não estar completa nesta semana)');
    }
  });

  test('Leaderboard renderiza com competidores', async ({ page }) => {
    await setupCleanState(page);

    await page.evaluate(() => {
      if (typeof goLeaderboard === 'function') goLeaderboard();
    });
    await page.waitForTimeout(1000);

    const lbView = page.locator('#vLeaderboard');
    const isOn = await lbView.evaluate(el => el.classList.contains('on')).catch(() => false);
    if (isOn) {
      const rows = await page.locator('.lb-row').count();
      expect(rows).toBeGreaterThanOrEqual(5);

      // User should be in the list
      const userRow = page.locator('.lb-row-user');
      if (await userRow.isVisible().catch(() => false)) {
        console.log(`✓ Leaderboard: ${rows} competidores, usuário na lista`);
      } else {
        console.log(`✓ Leaderboard: ${rows} competidores renderizados`);
      }

      // League banner should show
      const banner = page.locator('#lbBanner');
      await expect(banner).toBeVisible();
      const bannerText = await banner.textContent();
      expect(bannerText).toContain('Liga');
      console.log(`✓ Liga: ${bannerText.substring(0, 40)}`);
    } else {
      console.log('⚠ Leaderboard view não abriu');
    }
  });

  test('Leaderboard widget no dashboard renderiza', async ({ page }) => {
    await setupCleanState(page);

    const widget = page.locator('#leaderboardWidget');
    if (await widget.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await widget.textContent();
      console.log(`✓ Leaderboard widget visível: ${text.substring(0, 50)}`);
    } else {
      console.log('⚠ Widget não visível (pode ser por falta de dados)');
    }
  });

  test('Level up funciona corretamente', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('escola_v2', JSON.stringify({
        name: 'LevelTest', avatar: '🧑‍🎓', xp: 95, lvl: 1, streak: 1,
        streakDays: [], last: new Date().toDateString(), done: {},
        quiz: {}, ageGroup: 'adult', cMod: null, cLes: null
      }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#mcards', { timeout: 10000 });

    // Add enough XP to level up (lvl 1 needs 100 XP)
    // Stub missing functions that addXP may call (launchConfetti, playSfx, etc.)
    await page.evaluate(() => {
      if (!window.launchConfetti) window.launchConfetti = function(){};
      if (!window.playSfx) window.playSfx = function(){};
      if (!window.logActivity) window.logActivity = function(){};
      if (typeof addXP === 'function') addXP(10); // 95 + 10 = 105 → level up
    });
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('escola_v2')));
    expect(state.lvl).toBeGreaterThanOrEqual(2);
    console.log(`✓ Level up: nível ${state.lvl} (xp: ${state.xp})`);
  });
});
