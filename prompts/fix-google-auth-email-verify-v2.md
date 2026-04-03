# Prompt: Corrigir Google OAuth + Verificação de Email (V2 — Definitivo)

## Problemas Reportados
1. **Google OAuth falha**: Usuário clica "Entrar com Google", seleciona conta, volta para auth.html e fica preso no spinner infinito. Nunca redireciona para app.html.
2. **Email/senha sem verificação**: Usuário cria conta com email fake e acessa tudo. Precisa verificar email para evitar anonimato.

---

## DIAGNÓSTICO COMPLETO

### Bug 1 — Google OAuth: `doRedirect()` NUNCA é chamada

**Arquivo:** `auth.html` (linhas 522-534)

O fluxo atual:
1. User clica "Entrar com Google" → `signInGoogle()` redireciona para Google
2. Google retorna para `auth.html#access_token=xxx`
3. `auth.html` detecta `access_token` no hash → mostra spinner "Conectando..."
4. `initSupabase()` é chamado → cria o `sbClient` com `detectSessionInUrl:true`
5. SDK detecta o token, valida, dispara `onAuthStateChange('SIGNED_IN', session)`
6. O listener em `supabase-client.js` (linha 38) chama `onSignIn(user)`
7. **`onSignIn()` tenta acessar `S`, `save()`, `updateAuthUI()` — NENHUM existe em auth.html**
8. `onSignIn()` falha silenciosamente (try/catch)
9. **`doRedirect()` está definida mas NADA a chama** — script termina na linha 534
10. Resultado: spinner infinito, usuário preso

### Bug 2 — Email signup sem verificação

**Arquivo:** `supabase-client.js` (linhas 77-92)

- `signUpEmail()` retorna `needsConfirmation: !data.session`
- Se Supabase estiver com "Confirm email" DESABILITADO → `data.session` existe → `needsConfirmation = false` → user entra direto sem verificar
- Mesmo com "Confirm email" HABILITADO, quando user clica no link de verificação e volta para `auth.html#access_token=...`, cai no mesmo bug do spinner infinito

### Bug 3 — `onSignIn()` incompatível com auth.html

**Arquivo:** `supabase-client.js` (linhas 152-198)

A função `onSignIn()` assume contexto de `app.js`:
- `S` (state object) — não existe em auth.html
- `save()` — não existe em auth.html
- `updateAuthUI()` — não existe em auth.html
- `ui()` — não existe em auth.html
- `showToast()` — não existe em auth.html

Precisa de um guard para contexto auth.html.

---

## SOLUÇÃO COMPLETA

### PASSO 1 — Completar auth.html: wiring do doRedirect()

Abrir `auth.html` e localizar o final do script (linha ~534, logo após a definição de `doRedirect()`).

**O script está incompleto — falta o código que chama doRedirect().** Adicionar IMEDIATAMENTE após `doRedirect()`:

```javascript
  // ============================================================
  // 9. SETUP AUTH STATE LISTENER — redirecionar após login OK
  // ============================================================
  // Polling approach: mais robusto que depender apenas do onAuthStateChange
  // porque o listener em supabase-client.js chama onSignIn() que falha aqui

  if (isOAuthCallback) {
    // Estratégia 1: Polling curto com getSession()
    var pollCount = 0;
    var maxPolls = 40; // 40 × 500ms = 20 segundos max
    var pollInterval = setInterval(function() {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        // Timeout — mostrar erro e botão de retry
        document.querySelector('.auth-card').innerHTML =
          '<div style="text-align:center;padding:2rem 1rem">'
          + '<p style="color:var(--coral);font-size:1rem;margin-bottom:1rem">⚠️ Tempo esgotado ao conectar com Google.</p>'
          + '<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1.5rem">Isso pode acontecer por instabilidade na rede.</p>'
          + '<button onclick="location.href=\'auth.html\'" style="padding:.6rem 1.5rem;background:var(--sage);color:#fff;border:none;border-radius:8px;font-size:.9rem;cursor:pointer">Tentar novamente</button>'
          + '</div>';
        return;
      }

      // Checar se sbClient existe e tem sessão válida
      if (typeof sbClient !== 'undefined' && sbClient) {
        sbClient.auth.getSession().then(function(result) {
          if (result.data && result.data.session && result.data.session.user) {
            clearInterval(pollInterval);
            console.log('[Auth] Sessão detectada via polling! User:', result.data.session.user.email);
            doRedirect();
          }
        }).catch(function(e) {
          console.warn('[Auth] Polling getSession erro:', e.message);
        });
      }
    }, 500);
  }

  // Estratégia 2: Listener direto no onAuthStateChange (backup)
  // Roda APÓS initSupabase() já ter sido chamado
  if (typeof sbClient !== 'undefined' && sbClient) {
    // Registrar listener ADICIONAL específico para auth.html
    sbClient.auth.onAuthStateChange(function(event, session) {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.user) {
        console.log('[Auth] onAuthStateChange detectou login:', event, session.user.email);
        doRedirect();
      }
    });
  }

  // Estratégia 3: Sessão já existente (user voltou para auth.html logado)
  if (!isOAuthCallback && typeof sbClient !== 'undefined' && sbClient) {
    sbClient.auth.getSession().then(function(result) {
      if (result.data && result.data.session && result.data.session.user) {
        console.log('[Auth] Sessão existente encontrada, redirecionando...');
        doRedirect();
      }
    }).catch(function(){});
  }

})(); // <-- FECHAR a IIFE que começa em (function init(){
```

**ATENÇÃO:** Verificar se a IIFE `(function init(){` (linha 489) está sendo fechada corretamente com `})();`. O script original termina sem fechar. O código acima inclui o `})();` no final.

---

### PASSO 2 — Proteger onSignIn() contra contexto auth.html

Abrir `supabase-client.js` e localizar `async function onSignIn(user)` (linha ~152).

**ADICIONAR guard no início da função:**

```javascript
async function onSignIn(user) {
  // ===== GUARD: Se estamos em auth.html, não executar lógica de app.js =====
  // auth.html tem seu próprio redirect handler (polling + onAuthStateChange)
  if (window.location.pathname.includes('auth.html') || window.location.pathname.endsWith('auth')) {
    console.log('[Supabase] onSignIn chamado em auth.html — ignorando (auth.html tem próprio handler)');
    return;
  }

  // Salvar uid e dados do perfil Google/email no estado local
  if (typeof S !== 'undefined') {
    S.uid = user.id;
    // ... resto do código existente permanece inalterado ...
```

**NÃO alterar o resto da função** — apenas adicionar o guard no topo.

---

### PASSO 3 — Implementar verificação de email obrigatória

#### 3A — Habilitar "Confirm email" no Supabase Dashboard

> **AÇÃO MANUAL (Renato):** Ir em Supabase Dashboard → Authentication → Settings → Email Auth:
> - ✅ Enable Email Confirmations = ON
> - Redirect URL: `https://escolaliberal.com.br/auth.html`
> - Adicionar `https://escolaliberal.com.br` na lista de Redirect URLs permitidas

#### 3B — Melhorar UX de confirmação no auth.html

Localizar a função `handleSignup()` em `auth.html`. Após o signup retornar `needsConfirmation: true`, **SUBSTITUIR** a mensagem simples por uma tela de verificação completa:

```javascript
// LOCALIZAR este trecho em handleSignup():
if (result.needsConfirmation) {
  showSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
}

// SUBSTITUIR POR:
if (result.needsConfirmation) {
  // Mostrar tela de verificação de email
  document.querySelector('.auth-card').innerHTML =
    '<div style="text-align:center;padding:2rem 1rem">'
    + '<div style="font-size:3rem;margin-bottom:1rem">📧</div>'
    + '<h2 style="color:var(--text-primary);font-size:1.2rem;margin-bottom:.75rem">Verifique seu email</h2>'
    + '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:.5rem">Enviamos um link de confirmação para:</p>'
    + '<p style="color:var(--sage);font-weight:700;font-size:1rem;margin-bottom:1.5rem">' + email + '</p>'
    + '<p style="color:var(--text-muted);font-size:.82rem;margin-bottom:1.5rem">Clique no link do email para ativar sua conta. Verifique também a pasta de spam.</p>'
    + '<div style="display:flex;flex-direction:column;gap:.75rem;max-width:280px;margin:0 auto">'
    + '  <button id="resendBtn" onclick="resendConfirmation(\'' + email + '\')" style="padding:.6rem 1rem;background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;font-size:.85rem;cursor:pointer">Reenviar email</button>'
    + '  <button onclick="location.reload()" style="padding:.6rem 1rem;background:none;color:var(--text-muted);border:none;font-size:.82rem;cursor:pointer;text-decoration:underline">Voltar ao login</button>'
    + '</div>'
    + '</div>';
  return;
}
```

#### 3C — Adicionar função resendConfirmation() em auth.html

Adicionar esta função no `<script>` de auth.html (antes da IIFE `init`):

```javascript
// ========== REENVIAR EMAIL DE CONFIRMAÇÃO ==========
async function resendConfirmation(email) {
  var btn = document.getElementById('resendBtn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    if (typeof sbClient === 'undefined' || !sbClient) throw new Error('SDK não disponível');

    var { error } = await sbClient.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'auth.html'
      }
    });

    if (error) throw error;

    btn.textContent = '✓ Email reenviado!';
    btn.style.color = 'var(--sage)';
    setTimeout(function() {
      btn.textContent = 'Reenviar email';
      btn.style.color = '';
      btn.disabled = false;
    }, 30000); // Cooldown 30s para evitar spam

  } catch(e) {
    btn.textContent = 'Erro ao reenviar';
    btn.style.color = 'var(--coral)';
    console.error('[Auth] Resend error:', e.message);
    setTimeout(function() {
      btn.textContent = 'Reenviar email';
      btn.style.color = '';
      btn.disabled = false;
    }, 5000);
  }
}
```

#### 3D — Bloquear login por email sem verificação

Em `auth.html`, localizar a função `handleLogin()`. Após o `signInEmail()` retornar com sucesso, **ADICIONAR** verificação:

```javascript
// LOCALIZAR em handleLogin() o trecho de sucesso:
if (result.success) {
  // ANTES de redirecionar, verificar se email está confirmado
  var user = result.data.user || result.data.session?.user;
  if (user && !user.email_confirmed_at) {
    // Deslogar imediatamente — email não confirmado
    if (typeof sbClient !== 'undefined' && sbClient) {
      await sbClient.auth.signOut();
    }
    showError('Seu email ainda não foi verificado. Verifique sua caixa de entrada e clique no link de confirmação.');
    return;
  }
  // Email confirmado — redirecionar normalmente
  window.location.href = 'app.html';
}
```

**Nota:** O Supabase com "Confirm email" habilitado normalmente bloqueia o login antes da confirmação. Mas este check adicional é uma camada de segurança extra.

---

### PASSO 4 — Corrigir botão Google em TODAS as telas

#### 4A — auth.html: botão Google deve chamar signInGoogle()

Verificar que o botão Google em auth.html chama a função correta:

```html
<!-- O onclick deve ser exatamente: -->
<button class="google-btn" onclick="handleGoogle()">
  <img src="assets/icons/google.svg" alt="Google" width="20" height="20">
  Entrar com Google
</button>
```

E a função `handleGoogle()` deve ser:

```javascript
async function handleGoogle() {
  // Desabilitar botão para evitar double-click
  var btn = document.querySelector('.google-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }

  try {
    var result = await signInGoogle();
    if (!result.success) {
      showError(result.error || 'Erro ao conectar com Google. Tente novamente.');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
    // Se success, o browser foi redirecionado para Google OAuth (não chega aqui)
  } catch(e) {
    showError('Erro inesperado: ' + e.message);
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}
```

#### 4B — app.html (Debate/Perfil): login modal deve redirecionar para auth.html

Se existir um modal de login dentro de `app.html` ou `app.js` (para debate ou perfil), o botão Google dentro dele **NÃO deve tentar fazer OAuth in-place**. Deve redirecionar para auth.html:

```javascript
// Em qualquer botão "Entrar com Google" dentro do app.js:
function loginViaGoogle() {
  // Salvar destino pós-login (debate, perfil, etc.)
  sessionStorage.setItem('postLoginRedirect', window.location.hash || '#dash');
  // Redirecionar para auth.html (que tem o fluxo OAuth completo)
  window.location.href = 'auth.html';
}
```

Em `auth.html`, no `doRedirect()`, **VERIFICAR** se tem redirect salvo:

```javascript
function doRedirect() {
  if (_redirecting) return;
  var npf = document.getElementById('newPassForm');
  if (npf && npf.style.display === 'block') return;
  _redirecting = true;

  // Verificar se tem destino pós-login salvo
  var postLogin = sessionStorage.getItem('postLoginRedirect');
  sessionStorage.removeItem('postLoginRedirect');

  var target = 'app.html';
  if (postLogin) {
    target = 'app.html' + postLogin; // ex: app.html#debate
  }

  console.log('[Auth] Redirecionando para:', target);
  window.location.replace(target);
}
```

---

### PASSO 5 — Configurar Redirect URLs no Supabase

> **AÇÃO MANUAL (Renato):** Supabase Dashboard → Authentication → URL Configuration:
>
> **Site URL:** `https://escolaliberal.com.br`
>
> **Redirect URLs (adicionar TODOS):**
> - `https://escolaliberal.com.br/auth.html`
> - `https://escolaliberal.com.br/app.html`
> - `http://localhost:5173/auth.html` (dev)
> - `http://localhost:5173/app.html` (dev)
> - `http://localhost:4173/auth.html` (preview)
>
> **NÃO incluir** URLs com `#` ou query params — Supabase não aceita.

---

### PASSO 6 — Verificar Google OAuth no Google Cloud Console

> **AÇÃO MANUAL (Renato):** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client:
>
> **Authorized redirect URIs (DEVE conter):**
> - `https://<SEU_PROJETO>.supabase.co/auth/v1/callback`
>
> (NÃO a URL do seu site — o redirect vai para Supabase primeiro, que depois redireciona para seu site)
>
> **Authorized JavaScript origins:**
> - `https://escolaliberal.com.br`
> - `http://localhost:5173`

---

### PASSO 7 — Limpar hash da URL após detecção

Após o SDK processar o token, limpar o hash para evitar reprocessamento:

Em `auth.html`, dentro do polling (PASSO 1), logo após detectar sessão válida:

```javascript
// Já está no código do PASSO 1, mas reforçar:
if (result.data && result.data.session && result.data.session.user) {
  clearInterval(pollInterval);
  // Limpar hash da URL antes de redirecionar
  window.history.replaceState({}, '', window.location.pathname);
  console.log('[Auth] Sessão detectada! Redirecionando...');
  doRedirect();
}
```

---

### PASSO 8 — Testar fluxo completo de email/senha

O handleSignup() deve validar campos antes de enviar:

```javascript
async function handleSignup() {
  var name = document.getElementById('signupName').value.trim();
  var email = document.getElementById('signupEmail').value.trim();
  var pass = document.getElementById('signupPass').value;
  var passConfirm = document.getElementById('signupPassConfirm').value;

  // Validações
  if (!name || name.length < 2) { showError('Nome deve ter pelo menos 2 caracteres.'); return; }
  if (!email || !email.includes('@') || !email.includes('.')) { showError('Email inválido.'); return; }
  if (!pass || pass.length < 6) { showError('Senha deve ter pelo menos 6 caracteres.'); return; }
  if (pass !== passConfirm) { showError('As senhas não coincidem.'); return; }

  // Bloquear emails descartáveis (opcional mas recomendado)
  var disposableDomains = ['tempmail.com','guerrillamail.com','mailinator.com','yopmail.com','throwaway.email','temp-mail.org','10minutemail.com','trashmail.com'];
  var emailDomain = email.split('@')[1];
  if (disposableDomains.includes(emailDomain)) {
    showError('Emails temporários não são permitidos. Use um email real.');
    return;
  }

  // Desabilitar botão
  var btn = document.querySelector('#signupForm .auth-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Criando conta...'; }

  try {
    var result = await signUpEmail(email, pass, name);

    if (!result.success) {
      var msg = result.error || 'Erro ao criar conta.';
      // Traduzir erros comuns do Supabase
      if (msg.includes('already registered')) msg = 'Este email já está cadastrado. Tente fazer login.';
      if (msg.includes('password')) msg = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      if (msg.includes('rate limit')) msg = 'Muitas tentativas. Aguarde alguns minutos.';
      showError(msg);
      if (btn) { btn.disabled = false; btn.textContent = 'Criar Conta'; }
      return;
    }

    if (result.needsConfirmation) {
      // TELA DE VERIFICAÇÃO (código do PASSO 3B)
      document.querySelector('.auth-card').innerHTML =
        '<div style="text-align:center;padding:2rem 1rem">'
        + '<div style="font-size:3rem;margin-bottom:1rem">📧</div>'
        + '<h2 style="color:var(--text-primary);font-size:1.2rem;margin-bottom:.75rem">Verifique seu email</h2>'
        + '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:.5rem">Enviamos um link de confirmação para:</p>'
        + '<p style="color:var(--sage);font-weight:700;font-size:1rem;margin-bottom:1.5rem">' + email + '</p>'
        + '<p style="color:var(--text-muted);font-size:.82rem;margin-bottom:1.5rem">Clique no link do email para ativar sua conta.<br>Verifique também a pasta de spam.</p>'
        + '<div style="display:flex;flex-direction:column;gap:.75rem;max-width:280px;margin:0 auto">'
        + '  <button id="resendBtn" onclick="resendConfirmation(\'' + email.replace(/'/g,"\\'") + '\')" style="padding:.6rem 1rem;background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;font-size:.85rem;cursor:pointer">Reenviar email</button>'
        + '  <button onclick="location.reload()" style="padding:.6rem 1rem;background:none;color:var(--text-muted);border:none;font-size:.82rem;cursor:pointer;text-decoration:underline">Voltar ao login</button>'
        + '</div>'
        + '</div>';
      return;
    }

    // Email já confirmado (ou confirmação desabilitada) — redirecionar
    doRedirect();

  } catch(e) {
    showError('Erro inesperado: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Criar Conta'; }
  }
}
```

---

### PASSO 9 — Formulário de login por email

A função handleLogin() precisa de tratamento robusto:

```javascript
async function handleLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPass').value;

  if (!email) { showError('Digite seu email.'); return; }
  if (!pass) { showError('Digite sua senha.'); return; }

  var btn = document.querySelector('#loginForm .auth-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }

  try {
    var result = await signInEmail(email, pass);

    if (!result.success) {
      var msg = result.error || 'Erro ao fazer login.';
      if (msg.includes('Invalid login')) msg = 'Email ou senha incorretos.';
      if (msg.includes('Email not confirmed')) msg = 'Email não verificado. Verifique sua caixa de entrada.';
      if (msg.includes('rate limit')) msg = 'Muitas tentativas. Aguarde alguns minutos.';
      showError(msg);
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
      return;
    }

    // Verificar se email está confirmado
    var user = result.data.user || result.data.session?.user;
    if (user && !user.email_confirmed_at) {
      // Forçar logout
      if (typeof sbClient !== 'undefined') {
        try { await sbClient.auth.signOut(); } catch(e){}
      }
      showError('Seu email ainda não foi verificado. Verifique sua caixa de entrada e clique no link de confirmação.');
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
      return;
    }

    // Login OK — redirecionar
    doRedirect();

  } catch(e) {
    showError('Erro inesperado: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
  }
}
```

---

### PASSO 10 — Recuperação de senha

Verificar que `handleForgotPassword()` existe e funciona:

```javascript
async function handleForgotPassword() {
  var email = document.getElementById('loginEmail').value.trim();
  if (!email) { showError('Digite seu email no campo acima primeiro.'); return; }

  var btn = document.querySelector('.forgot-link');
  if (btn) { btn.style.opacity = '.5'; btn.style.pointerEvents = 'none'; }

  try {
    var { error } = await sbClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'auth.html'
    });

    if (error) throw error;
    showSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
  } catch(e) {
    showError('Erro ao enviar email de recuperação: ' + e.message);
  }

  setTimeout(function() {
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }, 30000);
}
```

---

### PASSO 11 — OFFLINE_MODE: auth não deve travar

Se `OFFLINE_MODE = true`, a tela de login não deve depender de Supabase:

Em `auth.html`, no `init()`:

```javascript
// ANTES de initSupabase(), verificar OFFLINE_MODE:
if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
  // No modo offline, não tem login real — redirecionar direto
  document.querySelector('.auth-card').innerHTML =
    '<div style="text-align:center;padding:2rem 1rem">'
    + '<p style="color:var(--text-primary);font-size:1rem;margin-bottom:1rem">📡 Modo Apresentação</p>'
    + '<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1.5rem">Login desabilitado no modo offline.</p>'
    + '<button onclick="location.href=\'app.html\'" style="padding:.6rem 1.5rem;background:var(--sage);color:#fff;border:none;border-radius:8px;font-size:.9rem;cursor:pointer">Abrir App →</button>'
    + '</div>';
  return;
}
```

---

### PASSO 12 — Incrementar SW_VERSION

Em `sw.js`, incrementar a versão para forçar cache refresh:

```javascript
const SW_VERSION = XX + 1;
```

---

## CHECKLIST DE VERIFICAÇÃO

### Google OAuth
- [ ] Clicar "Entrar com Google" → redireciona para Google
- [ ] Selecionar conta Google → volta para auth.html com spinner
- [ ] Spinner dura no máximo 5-10 segundos → redireciona para app.html
- [ ] User está logado no app.html (nome/avatar do Google aparece)
- [ ] Refresh de app.html mantém login (sessão persistida)
- [ ] Logout funciona (volta para estado deslogado)
- [ ] Re-login funciona sem erros

### Email/Senha
- [ ] Signup com email válido → tela "Verifique seu email" aparece
- [ ] Email de confirmação chega na caixa de entrada
- [ ] Clicar no link de confirmação → volta para auth.html → redireciona para app.html
- [ ] Tentar login ANTES de confirmar → mensagem de erro clara
- [ ] Reenviar email de confirmação funciona (botão com cooldown 30s)
- [ ] Login após confirmação → entra normalmente
- [ ] Recuperação de senha → email chega → nova senha funciona

### Debate → Login
- [ ] Entrar em sala de debate sem login → prompt de login aparece
- [ ] Clicar "Google" no prompt → vai para auth.html → OAuth → volta para app.html no debate
- [ ] sessionStorage postLoginRedirect funciona (user volta para debate)

### Edge Cases
- [ ] Double-click no botão Google → não dispara 2 redirects
- [ ] Voltar com browser back durante OAuth → não quebra
- [ ] Timeout de 20s → mostra erro com botão retry
- [ ] OFFLINE_MODE → auth.html mostra mensagem e botão para app

## ARQUIVOS ALTERADOS

| Arquivo | Ação |
|---------|------|
| `auth.html` | Completar doRedirect() wiring, polling OAuth, email verification UX, resendConfirmation(), handleSignup/Login robusto, OFFLINE guard |
| `supabase-client.js` | Guard em onSignIn() para ignorar em auth.html |
| `sw.js` | Incrementar SW_VERSION |

## AÇÕES MANUAIS DO RENATO (Supabase Dashboard)

1. **Authentication → Settings → Email Auth:** Enable Email Confirmations = ON
2. **Authentication → URL Configuration:** Adicionar redirect URLs (produção + dev)
3. **Verificar Google Cloud Console:** Redirect URI aponta para `supabase.co/auth/v1/callback`
