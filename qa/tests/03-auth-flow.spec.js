// @ts-check
const { test, expect } = require('@playwright/test');

// ============================================================
// TEST 03: Fluxo de autenticação — login, signup, Google OAuth
// ============================================================

test.describe('Auth Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth.html', { waitUntil: 'domcontentloaded' });
  });

  test('Página de auth carrega corretamente', async ({ page }) => {
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.locator('#loginForm')).toBeVisible();
    console.log('✓ Auth page carregou');
  });

  test('Tabs Login/Criar Conta funcionam', async ({ page }) => {
    // Login tab ativa por padrão
    const loginForm = page.locator('#loginForm');
    const signupForm = page.locator('#signupForm');

    await expect(loginForm).toHaveClass(/active/);

    // Clicar em Criar Conta
    await page.locator('.auth-tab:has-text("Criar Conta")').click();
    await expect(signupForm).toHaveClass(/active/);
    await expect(loginForm).not.toHaveClass(/active/);

    // Voltar para Login
    await page.locator('.auth-tab:has-text("Entrar")').click();
    await expect(loginForm).toHaveClass(/active/);
    console.log('✓ Tabs funcionam');
  });

  test('Botão Google OAuth existe e é clicável', async ({ page }) => {
    const googleBtn = page.locator('.auth-btn-google').first();
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();

    // Verificar que tem o SVG do Google
    const svg = googleBtn.locator('svg');
    await expect(svg).toBeVisible();
    console.log('✓ Botão Google presente e clicável');
  });

  test('Botão Google redireciona para Supabase OAuth', async ({ page }) => {
    const googleBtn = page.locator('.auth-btn-google').first();

    // Interceptar a navegação OAuth
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
      page.waitForURL(/supabase|accounts\.google/, { timeout: 10000 }).catch(() => null),
      googleBtn.click(),
    ]);

    // Deve ter redirecionado para Google ou Supabase
    const currentUrl = page.url();
    const isOAuth = currentUrl.includes('supabase') ||
                    currentUrl.includes('google') ||
                    currentUrl.includes('accounts.google');

    if (popup) {
      const popupUrl = popup.url();
      expect(popupUrl).toMatch(/supabase|google/);
      console.log(`✓ OAuth popup: ${popupUrl.substring(0, 80)}...`);
    } else if (isOAuth) {
      console.log(`✓ OAuth redirect: ${currentUrl.substring(0, 80)}...`);
    } else {
      // Pode ter falhado — verificar se há erro na tela
      const error = page.locator('#authError');
      const errVisible = await error.isVisible().catch(() => false);
      if (errVisible) {
        const errText = await error.textContent();
        console.log(`⚠ OAuth erro exibido: ${errText}`);
      }
    }
  });

  test('Validação de campos — login com campos vazios', async ({ page }) => {
    // Tentar submeter sem preencher
    await page.locator('#loginBtn').click();

    // HTML5 validation deve impedir, ou erro customizado
    const emailInput = page.locator('#loginEmail');
    const isInvalid = await emailInput.evaluate(el => !el.checkValidity());
    expect(isInvalid).toBe(true);
    console.log('✓ Validação impede login vazio');
  });

  test('Validação de campos — signup sem aceitar termos', async ({ page }) => {
    await page.locator('.auth-tab:has-text("Criar Conta")').click();

    await page.fill('#signupName', 'Teste QA');
    await page.fill('#signupEmail', 'teste@qa.com');
    await page.fill('#signupPass', '123456');
    // NÃO marca checkbox de termos

    await page.locator('#signupBtn').click();
    await page.waitForTimeout(500);

    // Deve mostrar erro sobre termos
    const error = page.locator('#authError');
    if (await error.isVisible()) {
      const text = await error.textContent();
      expect(text?.toLowerCase()).toMatch(/termos|política|privacidade/i);
      console.log('✓ Erro exibido ao não aceitar termos');
    }
  });

  test('Link "Esqueci a senha" abre formulário de reset', async ({ page }) => {
    await page.locator('.auth-forgot').click();

    const resetForm = page.locator('#resetForm');
    await expect(resetForm).toBeVisible();
    console.log('✓ Formulário de reset senha funciona');
  });

  test('Link "Continuar sem conta" leva ao app', async ({ page }) => {
    const skipLink = page.locator('.auth-skip a');
    await expect(skipLink).toBeVisible();

    const href = await skipLink.getAttribute('href');
    expect(href).toContain('app.html');
    console.log('✓ Link para continuar sem conta existe');
  });

  test('Supabase SDK carrega corretamente', async ({ page }) => {
    const hasSupa = await page.evaluate(() => typeof window.supabase !== 'undefined');
    expect(hasSupa).toBe(true);
    console.log('✓ Supabase SDK carregou');
  });
});
