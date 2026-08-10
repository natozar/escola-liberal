// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 02: Fluxos de navegação — módulos e aulas são clicáveis
// ============================================================

test.describe('Dashboard → Módulos → Aulas', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    // Pular onboarding se aparecer
    const onboard = page.locator('#onboard');
    if (await onboard.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btn = onboard.locator('button');
      if (await btn.isVisible()) await btn.click();
    }
    // Esperar dashboard carregar
    await page.waitForSelector('#mcards', { timeout: 10000 });
  });

  test('Dashboard exibe cards de módulos', async ({ page }) => {
    const cards = page.locator('.mc');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✓ ${count} módulos encontrados no dashboard`);
  });

  test('Todos os módulos são clicáveis', async ({ page }) => {
    const cards = page.locator('.mc');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const onclick = await card.getAttribute('onclick');
      // Cada card deve ter onclick com goMod() ou showPaywall()
      expect(onclick, `Card ${i} não tem onclick`).toBeTruthy();
      expect(onclick).toMatch(/goMod\(\d+\)|showPaywall\(\d+\)/);
    }
    console.log(`✓ Todos os ${count} módulos têm handler de clique`);
  });

  test('Clicar em módulo abre lista de aulas', async ({ page }) => {
    // Clicar no primeiro módulo
    const firstCard = page.locator('.mc').first();
    await firstCard.click();

    // Verificar que a view de módulo apareceu
    const modView = page.locator('#vMod');
    await expect(modView).toHaveClass(/on/, { timeout: 5000 });

    // Verificar que há aulas listadas
    const lessons = page.locator('.lsn');
    const count = await lessons.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✓ Módulo 1 tem ${count} aulas listadas`);
  });

  test('Todas as aulas dentro de um módulo são clicáveis', async ({ page }) => {
    // Abrir primeiro módulo
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on', { timeout: 5000 });

    const lessons = page.locator('.lsn');
    const count = await lessons.count();

    for (let i = 0; i < count; i++) {
      const lsn = lessons.nth(i);
      const onclick = await lsn.getAttribute('onclick');
      expect(onclick, `Aula ${i} não tem onclick`).toBeTruthy();
      expect(onclick).toMatch(/openL\(\d+,\d+\)/);

      // Verificar cursor pointer (não está locked)
      const cursor = await lsn.evaluate(el => getComputedStyle(el).cursor);
      expect(cursor, `Aula ${i} tem cursor ${cursor} ao invés de pointer`).toBe('pointer');
    }
    console.log(`✓ Todas as ${count} aulas são clicáveis`);
  });

  test('Clicar em aula abre conteúdo da lição', async ({ page }) => {
    // Abrir módulo → aula
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on', { timeout: 5000 });

    await page.locator('.lsn').first().click();

    // Verificar que a view de lição apareceu
    const lesView = page.locator('#vLes');
    await expect(lesView).toHaveClass(/on/, { timeout: 5000 });

    // Verificar que tem conteúdo
    const body = page.locator('#lvBody');
    const text = await body.textContent();
    expect(text?.length).toBeGreaterThan(50);
    console.log(`✓ Aula aberta com ${text?.length} caracteres de conteúdo`);
  });

  test('Navegar entre aulas com botões Anterior/Próxima', async ({ page }) => {
    // Abrir módulo → primeira aula
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on');
    await page.locator('.lsn').first().click();
    await page.waitForSelector('#vLes.on');

    // Botão Anterior deve estar desabilitado na primeira aula
    const prevBtn = page.locator('#bPrev');
    await expect(prevBtn).toBeDisabled();

    // Botão Próxima deve estar habilitado
    const nextBtn = page.locator('#bNext');
    await expect(nextBtn).toBeEnabled();

    // Clicar em Próxima
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Agora Anterior deve estar habilitado
    await expect(prevBtn).toBeEnabled();
    console.log('✓ Navegação entre aulas funciona');
  });

  test('Botão Voltar retorna ao módulo', async ({ page }) => {
    await page.locator('.mc').first().click();
    await page.waitForSelector('#vMod.on');
    await page.locator('.lsn').first().click();
    await page.waitForSelector('#vLes.on');

    // Clicar em "← Módulo"
    await page.locator('button:has-text("Módulo")').first().click();

    // Deve voltar para view do módulo
    const modView = page.locator('#vMod');
    await expect(modView).toHaveClass(/on/, { timeout: 5000 });
    console.log('✓ Botão Voltar funciona');
  });

  test('Percorrer TODOS os módulos e verificar que aulas existem', async ({ page }) => {
    const cards = page.locator('.mc');
    const totalModules = await cards.count();
    const results = [];

    for (let i = 0; i < totalModules; i++) {
      // Voltar ao dashboard
      await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
      const onboard = page.locator('#onboard');
      if (await onboard.isVisible({ timeout: 1000 }).catch(() => false)) {
        const btn = onboard.locator('button');
        if (await btn.isVisible()) await btn.click();
      }
      await page.waitForSelector('#mcards');

      // Clicar no módulo i
      const card = page.locator('.mc').nth(i);
      const title = await card.locator('h3').textContent();
      await card.click();

      try {
        await page.waitForSelector('#vMod.on', { timeout: 5000 });
        const lessons = page.locator('.lsn');
        const count = await lessons.count();
        results.push({ module: title, lessons: count, ok: count > 0 });
      } catch {
        results.push({ module: title, lessons: 0, ok: false });
      }
    }

    console.log('\n📊 RELATÓRIO DE MÓDULOS:');
    console.table(results);

    const broken = results.filter(r => !r.ok);
    expect(broken, `Módulos sem aulas: ${broken.map(b => b.module).join(', ')}`).toHaveLength(0);
  });
});
