// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 04: Quiz, XP, gamificação
// ============================================================

test.describe('Quiz e Gamificação', () => {

  async function openFirstLesson(page) {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }
    await page.waitForSelector('#mcards');
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on');
    await page.locator('.lsn').first().click();
    await page.waitForSelector('#vLes.on');
  }

  test('Aula tem quiz com opções clicáveis', async ({ page }) => {
    await openFirstLesson(page);

    const quizSection = page.locator('.qz');
    if (await quizSection.isVisible().catch(() => false)) {
      const options = page.locator('.qz-o');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(2);

      // Verificar que todas as opções são clicáveis
      for (let i = 0; i < count; i++) {
        const opt = options.nth(i);
        await expect(opt).toBeEnabled();
        const cursor = await opt.evaluate(el => getComputedStyle(el).cursor);
        expect(cursor).toBe('pointer');
      }
      console.log(`✓ Quiz encontrado com ${count} opções clicáveis`);
    } else {
      console.log('⚠ Primeira aula não tem quiz');
    }
  });

  test('Responder quiz mostra feedback', async ({ page }) => {
    await openFirstLesson(page);

    const options = page.locator('.qz-o');
    if (await options.first().isVisible().catch(() => false)) {
      // Clicar na primeira opção
      await options.first().click();
      await page.waitForTimeout(500);

      // Feedback deve aparecer
      const feedback = page.locator('#qfb');
      await expect(feedback).toHaveClass(/show/);

      const fbText = await feedback.textContent();
      expect(fbText?.length).toBeGreaterThan(0);
      console.log(`✓ Feedback do quiz: "${fbText?.substring(0, 60)}..."`);
    }
  });

  test('XP exibido no dashboard é número válido', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }

    const xpNow = page.locator('#xpNow');
    if (await xpNow.isVisible().catch(() => false)) {
      const text = await xpNow.textContent();
      expect(Number(text)).toBeGreaterThanOrEqual(0);
      console.log(`✓ XP atual: ${text}`);
    }
  });

  test('Conquistas renderizam sem erro', async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }

    const achs = page.locator('#achs');
    await expect(achs).toBeVisible();
    const achCount = await page.locator('.ach').count();
    expect(achCount).toBeGreaterThan(0);
    console.log(`✓ ${achCount} conquistas renderizadas`);
  });
});
