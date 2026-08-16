// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 14: Jogo Cidade Livre (jogo.html) — 2026-08-10
// Fluxo real: capa -> mandato -> decisão -> semana avança.
// O storageState global já semeia adulto verificado (escola_v2).
// ============================================================

test.describe('Cidade Livre — fluxo principal (adulto verificado)', () => {

  test('jogo.html carrega sem erros JS e mostra a capa', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const response = await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Capa: primeira carta com foto da cidade
    await expect(page.locator('#carta h2')).toHaveText('A cidade é sua');
    await expect(page.locator('.opcao', { hasText: 'Assumir o mandato' })).toBeVisible();

    // Sem overlay de age gate (perfil adulto semeado)
    await expect(page.locator('#ageGate')).toHaveCount(0);
    expect(errors, `Erros JS: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('foto da capa carrega de assets/jogo (alta resolução)', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    const img = page.locator('#carta .momento img');
    await expect(img).toBeVisible();
    const largura = await img.evaluate(el => {
      const i = /** @type {HTMLImageElement} */(el);
      return i.complete ? i.naturalWidth
        : new Promise(r => { i.onload = () => r(i.naturalWidth); i.onerror = () => r(-1); });
    });
    expect(largura, 'imagem hi-res deve ter >= 2000px').toBeGreaterThanOrEqual(2000);
  });

  test('decidir avança a semana e persiste no localStorage', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });

    await page.locator('.opcao', { hasText: 'Assumir o mandato' }).click();
    await expect(page.locator('#carta h2')).toHaveText('A cratera da Rua Principal');

    await page.locator('.opcao', { hasText: 'Consertar agora' }).click();
    await expect(page.locator('#semana')).toContainText('Semana 3');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('escola_jogo_cidade_v1') || '{}'));
    expect(save.semana).toBe(3);
    expect(save.jogadas).toContain('a1-01');
  });

  test('medidores começam com aprovação e caixa (painel econômico oculto)', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.medidor:not(.oculto)')).toHaveCount(2);
    await expect(page.locator('.medidor', { hasText: 'Aprovação' }).first()).toBeVisible();
  });
});

test.describe('Cidade Livre — age gate 18+', () => {
  // Sem o seed: visitante desconhecido precisa se declarar
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visitante sem verificação vê a autodeclaração', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#ageGate')).toBeVisible();
    await expect(page.locator('#ageSim')).toContainText('18 anos ou mais');
  });

  test('menor declarado é bloqueado', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#ageNao').click();
    await expect(page.locator('#ageGate')).toContainText('maiores de 18 anos');
    await expect(page.locator('#ageGate button')).toHaveCount(0);
  });

  test('adulto declarado entra e a escolha persiste', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#ageSim').click();
    await expect(page.locator('#ageGate')).toHaveCount(0);
    await expect(page.locator('#carta h2')).toHaveText('A cidade é sua');
    const flag = await page.evaluate(() => localStorage.getItem('jogo_age_ok'));
    expect(flag).toBe('1');
  });
});

test.describe('Cidade Livre — subdomínio', () => {
  test('LP do jogo responde com HTTPS válido', async ({ request }) => {
    const res = await request.get('https://jogo.escolaliberal.com.br/');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('CIDADE');
  });

  test('jogo do subdomínio serve as mesmas fotos', async ({ request }) => {
    const res = await request.get('https://jogo.escolaliberal.com.br/assets/jogo/crise.jpg');
    expect(res.status()).toBe(200);
    expect(Number(res.headers()['content-length'] || 0)).toBeGreaterThan(200000);
  });
});

// ============================================================
// Administração manual (2026-08-10): tabuleiro de lotes + Vitalício
// ============================================================
test.describe('Cidade Livre — tabuleiro de gestão', () => {

  test('a cidade renderiza 9 lotes clicáveis (com prefeitura)', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.removeItem('escola_jogo_cidade_v1'); location.reload(); });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.predio.lote')).toHaveCount(9);
    await expect(page.locator('.predio.lote', { hasText: 'prefeitura' })).toHaveCount(1);
    await expect(page.locator('.predio.lote', { hasText: 'lote vazio' })).toHaveCount(2);
  });

  test('tocar num lote abre o painel de ações', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.predio.lote', { hasText: 'praça' }).click();
    await expect(page.locator('#loteSheet')).toBeVisible();
    await expect(page.locator('#loteSheet .opcao').first()).toBeVisible();
    // fecha tocando fora
    await page.locator('#loteSheet .ls-pano').click();
    await expect(page.locator('#loteSheet')).toHaveCount(0);
  });

  test('a rua começa precisando de manutenção (pressão de gestão)', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    // limpa qualquer save anterior deste contexto e recomeça
    await page.evaluate(() => { localStorage.removeItem('escola_jogo_cidade_v1'); location.reload(); });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.predio.lote.ruim')).toHaveCount(1);
    await page.locator('.predio.lote.ruim').click();
    await expect(page.locator('#loteSheet .opcao', { hasText: 'equipe de obras' })).toBeVisible();
  });

  test('link de duelo abre a carta-convite e aceitar entra na mesma cidade', async ({ page }) => {
    const payload = Buffer.from(JSON.stringify({ s: 20263301, c: 'nova', p: 3, n: 'QA Duelo' }))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await page.goto('/jogo.html?duelo=' + payload, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#carta h2')).toHaveText('QA Duelo te desafiou');
    await expect(page.locator('.opcao', { hasText: 'Aceitar o duelo' })).toBeVisible();

    await page.locator('.opcao', { hasText: 'Aceitar o duelo' }).click();
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('escola_jogo_cidade_v1') || '{}'));
    expect(save.modo).toBe('vitalicio');
    expect(save.seed).toBe(20263301);
    expect(save.duelo?.score).toBe(3);
  });

  test('payload de duelo adulterado é ignorado sem quebrar o jogo', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/jogo.html?duelo=%%%lixo%%%', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.removeItem('escola_jogo_cidade_v1'); location.reload(); });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#carta h2')).toHaveText('A cidade é sua');
    expect(errors, `Erros JS: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Prefeito Vitalício aparece bloqueado para quem não venceu a campanha', async ({ page }) => {
    await page.goto('/jogo.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('escola_jogo_cidade_v1');
      localStorage.removeItem('escola_jogo_meta_v1');
      location.reload();
    });
    await page.waitForLoadState('domcontentloaded');
    const trancado = page.locator('.opcao', { hasText: 'Prefeito Vitalício' });
    await expect(trancado).toBeVisible();
    await expect(trancado).toBeDisabled();
  });
});
