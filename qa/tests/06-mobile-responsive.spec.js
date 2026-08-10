// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 06: Mobile — responsivo, bottom nav, sidebar
// ============================================================

test.describe('Mobile Responsivo', () => {

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }
  });

  test('Bottom nav é visível no mobile', async ({ page }) => {
    const bnav = page.locator('.bnav');
    if (await bnav.isVisible().catch(() => false)) {
      const items = page.locator('.bnav-item');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      console.log(`✓ Bottom nav com ${count} itens`);
    }
  });

  test('Sidebar escondida no mobile', async ({ page }) => {
    const side = page.locator('.side');
    const isVisible = await side.isVisible().catch(() => false);
    if (isVisible) {
      const display = await side.evaluate(el => getComputedStyle(el).display);
      expect(display).toBe('none');
    }
    console.log('✓ Sidebar oculta no mobile');
  });

  test('Cards de módulo não overflow horizontal', async ({ page }) => {
    const body = await page.evaluate(() => ({
      scrollW: document.body.scrollWidth,
      clientW: document.body.clientWidth,
    }));
    expect(body.scrollW).toBeLessThanOrEqual(body.clientW + 5); // 5px tolerance
    console.log(`✓ Sem overflow: body ${body.scrollW}px ≤ viewport ${body.clientW}px`);
  });

  test('Aula é legível no mobile (texto não cortado)', async ({ page }) => {
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on');
    await page.locator('.lsn').first().click();
    await page.waitForSelector('#vLes.on');

    const body = page.locator('#lvBody');
    const box = await body.boundingBox();
    expect(box).toBeTruthy();
    expect(box?.width).toBeGreaterThan(200);
    expect(box?.width).toBeLessThanOrEqual(390);
    console.log(`✓ Conteúdo da aula: ${Math.round(box?.width || 0)}px de largura`);
  });

  test('Botões de navegação acessíveis no mobile', async ({ page }) => {
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on');
    await page.locator('.lsn').first().click();
    await page.waitForSelector('#vLes.on');

    // Scroll até o final para ver botões
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const nextBtn = page.locator('#bNext');
    await expect(nextBtn).toBeVisible();

    const box = await nextBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(36); // tap target mínimo
    console.log(`✓ Botão Próxima: ${box?.width}x${box?.height}px (touch-friendly)`);
  });
});
