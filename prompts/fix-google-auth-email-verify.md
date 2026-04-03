Tarefa: Corrigir 2 bugs CRÍTICOS de autenticação. BUG 1: Login com Google falha — após selecionar conta, tela trava em "Conectando..." e nunca redireciona para o app. BUG 2: Login por email/senha precisa de verificação de e-mail para evitar contas falsas/anônimas. Leia auth.html, supabase-client.js, app.js e src/boot.js INTEIROS antes de alterar. Execute sem perguntar. Commit e deploy ao final.

ATENÇÃO: O login com Google é PRIORIDADE MÁXIMA. É o que os governos vão usar na apresentação.

---

### BUG 1 — GOOGLE OAUTH NÃO COMPLETA

#### CAUSA RAIZ IDENTIFICADA

O arquivo auth.html está INCOMPLETO. O fluxo é:

```
1. User clica "Entrar com Google"
2. handleGoogle() chama signInGoogle() do supabase-client.js
3. signInWithOAuth redireciona para Google
4. User seleciona conta no Google
5. Google redireciona de volta para auth.html com #access_token=xxx no hash
6. auth.html detecta o hash e mostra spinner "Conectando..."
7. initSupabase() carrega o SDK e lê o token do hash
8. ❌ MAS NÃO EXISTE onAuthStateChange listener que redirecione para app.html
9. ❌ doRedirect() existe mas NUNCA é chamada
10. ❌ User fica preso no spinner eternamente
```

#### CORREÇÃO

No auth.html, APÓS a inicialização do Supabase SDK, adicionar o listener de auth state change que redireciona para app.html:

```javascript
// Adicionar DENTRO da função init() do auth.html, APÓS initSupabase():

function setupAuthListener() {
  if (typeof sbClient === 'undefined' || !sbClient || !sbClient.auth) {
    // SDK não carregou — tentar de novo em 500ms (máximo 10 tentativas)
    if (!window._authRetries) window._authRetries = 0;
    window._authRetries++;
    if (window._authRetries < 10) {
      setTimeout(setupAuthListener, 500);
    } else {
      showError('Erro ao conectar. Tente novamente.');
    }
    return;
  }

  sbClient.auth.onAuthStateChange(function(event, session) {
    console.log('[Auth] Event:', event, 'Session:', !!session);

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (session && session.user) {
        console.log('[Auth] Login OK:', session.user.email);

        // Salvar dados básicos no localStorage para uso offline
        try {
          var userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Aluno',
            avatar: session.user.user_metadata?.avatar_url || '🧑‍🎓',
            provider: session.user.app_metadata?.provider || 'email'
          };
          localStorage.setItem('escola_user', JSON.stringify(userData));
          localStorage.setItem('escola_debate_auth', JSON.stringify({
            name: userData.name,
            avatar: userData.avatar,
            timestamp: Date.now()
          }));
        } catch(e) {
          console.warn('[Auth] Erro ao salvar dados locais:', e);
        }

        // Verificar se veio do debate
        var debateReturn = sessionStorage.getItem('escola_debate_return');

        // Redirecionar para app.html
        doRedirect();
      }
    }

    if (event === 'TOKEN_REFRESHED') {
      console.log('[Auth] Token atualizado');
    }

    if (event === 'SIGNED_OUT') {
      console.log('[Auth] Deslogado');
      localStorage.removeItem('escola_user');
    }
  });
}
```

#### VERIFICAR doRedirect()

A função doRedirect() deve existir e fazer:

```javascript
function doRedirect() {
  // Se veio do debate, voltar direto para o debate
  var debateReturn = sessionStorage.getItem('escola_debate_return');
  if (debateReturn) {
    sessionStorage.removeItem('escola_debate_return');
    window.location.href = 'app.html#room-' + debateReturn;
    return;
  }

  // Redirect normal para app
  window.location.href = 'app.html';
}
```

#### VERIFICAR DETECÇÃO DO HASH

Na função init() do auth.html, quando detecta `#access_token` no hash:

```javascript
function init() {
  var hash = window.location.hash;

  // Detectar callback OAuth
  if (hash && (hash.indexOf('access_token') !== -1 || hash.indexOf('refresh_token') !== -1)) {
    // Mostrar loading
    showLoading('Conectando sua conta Google...');

    // Inicializar Supabase (o SDK vai ler o token do hash automaticamente)
    initSupabase();

    // Configurar listener para detectar quando login completa
    setupAuthListener();

    // Fallback: se não redirecionar em 10 segundos, mostrar erro
    setTimeout(function() {
      if (window.location.pathname.indexOf('auth.html') !== -1) {
        hideLoading();
        showError('Login demorou demais. Tente novamente.');
        // Limpar hash para evitar loop
        history.replaceState(null, '', window.location.pathname);
      }
    }, 10000);

    return; // Não mostrar formulário de login
  }

  // Detectar erro no hash
  if (hash && hash.indexOf('error') !== -1) {
    var errorDesc = '';
    try {
      var params = new URLSearchParams(hash.substring(1));
      errorDesc = params.get('error_description') || 'Erro desconhecido';
    } catch(e) {
      errorDesc = 'Erro na autenticação';
    }
    showError('Erro no login: ' + decodeURIComponent(errorDesc));
    history.replaceState(null, '', window.location.pathname);
    return;
  }

  // Sem callback — mostrar formulário de login normal
  initSupabase();
  setupAuthListener();
  showTab('login');
}
```

#### VERIFICAR signInGoogle() no supabase-client.js

A função deve estar correta, mas verificar:

```javascript
async function signInGoogle() {
  if (typeof sbClient === 'undefined' || !sbClient) {
    throw new Error('Supabase não inicializado');
  }

  // Construir base URL (sem hash, sem query)
  var base = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');

  var { data, error } = await sbClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: base + 'auth.html',
      queryParams: {
        prompt: 'select_account'
      }
    }
  });

  if (error) throw error;
  return data;
}
```

**VERIFICAÇÕES CRÍTICAS:**

1. `redirectTo` deve apontar para `auth.html` (NÃO para app.html)
2. `prompt: 'select_account'` deve estar presente
3. O domínio do `redirectTo` deve estar na lista de Redirect URLs do Supabase Dashboard
4. `flowType: 'implicit'` deve estar no config do Supabase client
5. `detectSessionInUrl: true` deve estar no config

#### FUNÇÃO showLoading / hideLoading / showError

Se não existirem, criar:

```javascript
function showLoading(msg) {
  var container = document.getElementById('authContainer') || document.body;
  var existing = document.getElementById('authLoading');
  if (existing) existing.remove();

  var div = document.createElement('div');
  div.id = 'authLoading';
  div.style.cssText = 'text-align:center;padding:60px 20px;';
  div.innerHTML =
    '<div style="font-size:2rem;margin-bottom:16px;">⏳</div>' +
    '<div style="font-size:1.1rem;font-weight:700;color:#1a1a1a;margin-bottom:8px;">' + (msg || 'Carregando...') + '</div>' +
    '<div style="font-size:0.85rem;color:#6b7280;">Aguarde um momento...</div>';
  container.innerHTML = '';
  container.appendChild(div);
}

function hideLoading() {
  var el = document.getElementById('authLoading');
  if (el) el.remove();
}

function showError(msg) {
  hideLoading();
  var container = document.getElementById('authContainer') || document.body;
  var div = document.createElement('div');
  div.style.cssText = 'text-align:center;padding:40px 20px;';
  div.innerHTML =
    '<div style="font-size:2rem;margin-bottom:12px;">⚠️</div>' +
    '<div style="font-size:1rem;color:#991b1b;margin-bottom:16px;">' + msg + '</div>' +
    '<button onclick="window.location.href=\'auth.html\'" style="padding:10px 24px;border-radius:10px;background:#10b981;color:white;border:none;font-weight:700;cursor:pointer;">Tentar Novamente</button>';
  container.appendChild(div);
}
```

---

### BUG 2 — LOGIN POR EMAIL SEM VERIFICAÇÃO

Atualmente, qualquer pessoa pode criar conta com email falso. Para garantir identidade real:

#### CORREÇÃO 1: Habilitar confirmação de email no Supabase

Instruções para o CLAUDE.md (configuração manual no Dashboard):

```
Supabase Dashboard → Authentication → Settings → Email Auth:
- Enable email confirmations: ON
- Confirm email: Required
- Secure email change: ON
- Double confirm email changes: ON
```

#### CORREÇÃO 2: Fluxo de signup com verificação

Modificar a função de cadastro no auth.html:

```javascript
async function handleSignup(email, password, name) {
  try {
    // Validar email
    if (!email || !email.includes('@') || !email.includes('.')) {
      showError('Digite um e-mail válido.');
      return;
    }

    // Validar senha
    if (!password || password.length < 6) {
      showError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }

    // Validar nome
    if (!name || name.trim().length < 2) {
      showError('Digite seu nome (mínimo 2 letras).');
      return;
    }

    showLoading('Criando sua conta...');

    var result = await signUpEmail(email, password, name.trim());

    if (result.error) {
      hideLoading();
      if (result.error.message.includes('already registered')) {
        showError('Este e-mail já está cadastrado. Tente fazer login.');
      } else {
        showError('Erro: ' + result.error.message);
      }
      return;
    }

    // Supabase com confirmação: user criado mas precisa confirmar email
    if (result.data && result.data.user && !result.data.user.email_confirmed_at) {
      hideLoading();
      showEmailConfirmation(email);
      return;
    }

    // Se email já confirmado (ex: OAuth anterior), redirecionar
    doRedirect();

  } catch(e) {
    hideLoading();
    showError('Erro ao criar conta: ' + e.message);
  }
}
```

#### CORREÇÃO 3: Tela de confirmação de email

```javascript
function showEmailConfirmation(email) {
  var container = document.getElementById('authContainer') || document.body;
  container.innerHTML =
    '<div style="text-align:center;padding:40px 20px;max-width:400px;margin:0 auto;">' +
      '<div style="font-size:3rem;margin-bottom:16px;">📧</div>' +
      '<h2 style="font-size:1.3rem;margin:0 0 12px;">Verifique seu e-mail</h2>' +
      '<p style="font-size:0.95rem;color:#4b5563;margin:0 0 8px;">Enviamos um link de confirmação para:</p>' +
      '<p style="font-size:1rem;font-weight:700;color:#1a1a1a;margin:0 0 20px;">' + escapeHTML(email) + '</p>' +
      '<p style="font-size:0.85rem;color:#6b7280;margin:0 0 24px;">Clique no link do e-mail para ativar sua conta. Depois, volte aqui e faça login.</p>' +
      '<button onclick="showTab(\'login\')" style="padding:12px 28px;border-radius:12px;background:#10b981;color:white;border:none;font-weight:700;font-size:1rem;cursor:pointer;margin-bottom:12px;width:100%;">Já confirmei, fazer login</button>' +
      '<button onclick="resendConfirmation(\'' + escapeHTML(email) + '\')" style="padding:10px 24px;border-radius:10px;background:transparent;color:#6b7280;border:1px solid #e5e7eb;font-size:0.85rem;cursor:pointer;width:100%;">Reenviar e-mail</button>' +
      '<p style="font-size:0.75rem;color:#9ca3af;margin-top:16px;">Verifique também a pasta de spam.</p>' +
    '</div>';
}

async function resendConfirmation(email) {
  try {
    if (typeof sbClient === 'undefined' || !sbClient) return;
    var { error } = await sbClient.auth.resend({
      type: 'signup',
      email: email
    });
    if (error) {
      showError('Erro ao reenviar: ' + error.message);
    } else {
      showDebateToast ? showDebateToast('E-mail reenviado!', 'info') : alert('E-mail reenviado!');
    }
  } catch(e) {
    showError('Erro: ' + e.message);
  }
}

function escapeHTML(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
```

#### CORREÇÃO 4: Login por email — verificar se confirmou

```javascript
async function handleLogin(email, password) {
  try {
    if (!email || !password) {
      showError('Preencha e-mail e senha.');
      return;
    }

    showLoading('Entrando...');

    var result = await signInEmail(email, password);

    if (result.error) {
      hideLoading();
      if (result.error.message.includes('Email not confirmed')) {
        showEmailConfirmation(email);
        return;
      }
      if (result.error.message.includes('Invalid login credentials')) {
        showError('E-mail ou senha incorretos.');
        return;
      }
      showError('Erro: ' + result.error.message);
      return;
    }

    // Login OK — salvar dados e redirecionar
    if (result.data && result.data.user) {
      try {
        var userData = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.user_metadata?.full_name || result.data.user.user_metadata?.name || email.split('@')[0],
          avatar: '🧑‍🎓',
          provider: 'email'
        };
        localStorage.setItem('escola_user', JSON.stringify(userData));
        localStorage.setItem('escola_debate_auth', JSON.stringify({
          name: userData.name,
          avatar: userData.avatar,
          timestamp: Date.now()
        }));
      } catch(e) {}
    }

    doRedirect();

  } catch(e) {
    hideLoading();
    showError('Erro ao entrar: ' + e.message);
  }
}
```

#### CORREÇÃO 5: signUpEmail no supabase-client.js

Verificar que signUpEmail envia o nome como metadata:

```javascript
async function signUpEmail(email, password, name) {
  if (typeof sbClient === 'undefined') throw new Error('Supabase não inicializado');

  return await sbClient.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: name,
        name: name
      },
      emailRedirectTo: window.location.origin + '/auth.html'
    }
  });
}
```

---

### INTEGRAÇÃO COM DEBATE

Após login (Google ou email), quando o user voltar para o app.html:

No app.js, na inicialização ou no `initAfterAuth()`, verificar se tem `escola_user` no localStorage e atualizar o state:

```javascript
function syncAuthToState() {
  try {
    var userData = JSON.parse(localStorage.getItem('escola_user') || 'null');
    if (userData && userData.name && typeof S !== 'undefined') {
      if (!S.name || S.name === 'Visitante' || S.name === 'Aluno') {
        S.name = userData.name;
      }
      if (userData.avatar && userData.avatar !== '🧑‍🎓' && typeof S.avatar !== 'undefined') {
        S.avatar = userData.avatar;
      }
      if (typeof save === 'function') save();
    }
  } catch(e) {}
}
```

Chamar `syncAuthToState()` no boot do app.js (após load()).

---

### DEBATE LOGIN FUNCTIONS

Atualizar `debateLoginGoogle()` e `debateLoginEmail()` no app.js para usar o fluxo correto:

```javascript
function debateLoginGoogle(roomId) {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    showDebateOfflineLogin(roomId);
    return;
  }

  // Salvar para qual sala voltar após login
  sessionStorage.setItem('escola_debate_return', roomId);

  // Se Supabase disponível, redirecionar para auth.html
  window.location.href = 'auth.html?action=google&debate=' + roomId;
}

function debateLoginEmail(roomId) {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    showDebateOfflineLogin(roomId);
    return;
  }

  sessionStorage.setItem('escola_debate_return', roomId);
  window.location.href = 'auth.html?action=login&debate=' + roomId;
}
```

No auth.html, ao carregar, checar se tem `?action=google`:

```javascript
// Dentro de init():
var params = new URLSearchParams(window.location.search);
var action = params.get('action');
var debateRoom = params.get('debate');

if (debateRoom) {
  sessionStorage.setItem('escola_debate_return', debateRoom);
}

if (action === 'google') {
  // Iniciar Google login automaticamente
  handleGoogle();
  return;
}
```

---

### RETORNO PÓS-LOGIN PARA DEBATE

No app.js, no boot sequence (DOMContentLoaded ou initAfterAuth):

```javascript
// Verificar se veio de login do debate
function checkDebateReturn() {
  var roomId = sessionStorage.getItem('escola_debate_return');
  if (roomId) {
    sessionStorage.removeItem('escola_debate_return');
    // Esperar um tick para o app terminar de inicializar
    setTimeout(function() {
      if (typeof goRoom === 'function') goRoom(roomId);
    }, 500);
  }

  // Também checar hash
  if (window.location.hash && window.location.hash.indexOf('room-') !== -1) {
    var hash = window.location.hash.replace('#room-', '');
    setTimeout(function() {
      if (typeof goRoom === 'function') goRoom(hash);
    }, 500);
    history.replaceState(null, '', window.location.pathname);
  }
}
```

---

### VERIFICAÇÃO FINAL

Testar CADA cenário:

```
GOOGLE LOGIN:
1. Clicar "Entrar com Google" no auth.html
   → [ ] Redireciona para Google
   → [ ] Após selecionar conta, volta para auth.html
   → [ ] Spinner "Conectando..." aparece
   → [ ] Em 2-3 segundos, redireciona para app.html
   → [ ] Nome e avatar do Google aparecem no app
   → [ ] Zero erros no console

2. Clicar "Entrar com Google" dentro do debate (app.html)
   → [ ] Redireciona para auth.html → Google
   → [ ] Após login, volta para app.html direto na sala de debate
   → [ ] Input de mensagem está liberado

3. Clicar "Entrar com Google" no perfil
   → [ ] Mesmo fluxo, retorna para o app

GOOGLE LOGIN — CENÁRIOS DE ERRO:
4. Cancelar na tela do Google (clicar X ou voltar)
   → [ ] Volta para auth.html sem crash
   → [ ] Mensagem de erro amigável aparece
   → [ ] Pode tentar novamente

5. OAuth com conta sem permissão
   → [ ] Erro tratado, mensagem amigável

EMAIL/SENHA — CADASTRO:
6. Preencher email + senha + nome e clicar Cadastrar
   → [ ] Mensagem "Verifique seu e-mail" aparece
   → [ ] Email de confirmação enviado (checar inbox)
   → [ ] Botão "Reenviar" funciona
   → [ ] Antes de confirmar: login retorna "Email not confirmed"
   → [ ] Depois de confirmar: login funciona normalmente

7. Tentar cadastrar com email já existente
   → [ ] Mensagem "Este e-mail já está cadastrado"

8. Tentar cadastrar com email inválido
   → [ ] Mensagem "Digite um e-mail válido"

EMAIL/SENHA — LOGIN:
9. Login com email confirmado + senha correta
   → [ ] Redireciona para app.html
   → [ ] Nome aparece no app

10. Login com senha errada
    → [ ] Mensagem "E-mail ou senha incorretos"

11. Login sem confirmar email
    → [ ] Tela de "Verifique seu e-mail" aparece

OFFLINE_MODE:
12. Debate com OFFLINE_MODE = true
    → [ ] Login offline pede nome + avatar (sem Google/email)
    → [ ] Funciona sem rede
```

---

### CONFIGURAÇÃO NO SUPABASE DASHBOARD (documentar no CLAUDE.md)

```
1. Authentication → URL Configuration:
   - Site URL: https://escolaliberal.com.br
   - Redirect URLs:
     - https://escolaliberal.com.br/auth.html
     - https://www.escolaliberal.com.br/auth.html
     - http://localhost:5173/auth.html
     - http://localhost:4173/auth.html

2. Authentication → Settings → Email:
   - Enable email confirmations: ON
   - Confirm email: REQUIRED

3. Authentication → Providers → Google:
   - Enabled: ON
   - Client ID: (da Google Cloud Console)
   - Client Secret: (da Google Cloud Console)
   - Authorized redirect URI (copiar do Supabase e colar no Google Console):
     https://hwjplecfqsckfiwxiedo.supabase.co/auth/v1/callback
```

---

### REGRAS

- NUNCA quebrar OFFLINE_MODE (login offline continua funcionando com nome+avatar)
- NUNCA expor senhas ou tokens no console.log
- Timeout de 10s no callback OAuth (não deixar user preso infinito)
- Fallback gracioso para todos os erros
- Salvar dados no localStorage para funcionar offline após primeiro login
- Zero npm dependencies
- Incrementar SW_VERSION se alterar assets cacheados

### COMMIT E DEPLOY

```bash
git add auth.html supabase-client.js app.js sw.js CLAUDE.md
git commit -m "fix: Google OAuth callback handler, email verification flow, debate auth integration"
git push origin main
```

### ANOTAR NO CLAUDE.md

```
15. **Google OAuth corrigido** — auth.html agora tem onAuthStateChange listener que redireciona para app.html após login Google. Callback com hash detection, timeout 10s, tratamento de erros. Login por email exige confirmação (Supabase email confirmation ON). Debate redireciona para auth.html e retorna à sala após login via sessionStorage.
```
