Tarefa: Corrigir 2 problemas CRÍTICOS no debate. PROBLEMA 1: Salas de debate permitem enviar mensagens sem login — qualquer anônimo pode teclar. PROBLEMA 2: Depois de entrar numa sala de debate, não tem como sair — navegação trava, não volta para as salas nem para as aulas. Leia app.js, app.html e app.css ANTES de alterar. Não quebre OFFLINE_MODE. Execute sem perguntar. Commit e deploy ao final.

ATENÇÃO: São 2 bugs. Corrija os 2. Teste os 2. Não faça commit até ambos estarem funcionando.

---

### PROBLEMA 1 — ANONIMATO: qualquer um envia mensagem sem login

O input de texto e o botão enviar estão SEMPRE visíveis, mesmo para quem não fez login. Isso não pode acontecer.

#### DIAGNÓSTICO

Abrir app.js e procurar a função `goRoom(roomId)`. Verificar:
1. Existe checagem de autenticação antes de renderizar o input?
2. A função `isDebateAuthenticated()` existe?
3. Se existe, está sendo chamada dentro de goRoom()?
4. O resultado da checagem está controlando se o input aparece ou não?

#### CORREÇÃO

A função `goRoom(roomId)` DEVE ter esta lógica:

```javascript
// Dentro de goRoom(), DEPOIS de renderizar as mensagens e ANTES de renderizar o input:

var isLogged = isDebateAuthenticated();

if (isLogged) {
  // Renderizar input de texto + áudio + enviar
  // (código do input area)
} else {
  // Renderizar prompt de login NO LUGAR do input
  // (código do login prompt com botões Google e Email)
}
```

Se `isDebateAuthenticated()` NÃO existe, criar:

```javascript
function isDebateAuthenticated() {
  // 1. Checar login offline do debate (nome salvo)
  var debateAuth = localStorage.getItem('escola_debate_auth');
  if (debateAuth) {
    try {
      var auth = JSON.parse(debateAuth);
      if (auth.name && auth.name.length >= 2) return true;
    } catch(e) {}
  }

  // 2. Checar state local do app (se user já tem nome definido)
  if (typeof S !== 'undefined' && S.name && S.name !== '' && S.name !== 'Visitante' && S.name !== 'Aluno') {
    return true;
  }

  // 3. Se OFFLINE_MODE, só os checks acima contam
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    return false;
  }

  // 4. Checar Supabase auth
  if (typeof sbClient !== 'undefined' && sbClient.auth) {
    try {
      var user = sbClient.auth.getUser ? sbClient.auth.getUser() : null;
      if (user && user.data && user.data.user) return true;
    } catch(e) {}
  }

  return false;
}
```

Se `isDebateAuthenticated()` EXISTE mas não está sendo usada em goRoom(), adicionar a chamada.

Se o input está sendo renderizado SEM a condicional, ADICIONAR a condicional.

#### PROMPT DE LOGIN (se não existe, criar)

Quando NÃO logado, no lugar do input mostrar:

```javascript
function renderDebateLoginPrompt(container, roomId) {
  var prompt = document.createElement('div');
  prompt.className = 'debate-login-prompt';
  prompt.id = 'debateLoginPrompt';
  prompt.innerHTML =
    '<div class="debate-login-content">' +
      '<span class="debate-login-icon">🔐</span>' +
      '<strong>Faça login para participar</strong>' +
      '<span class="debate-login-sub">Você pode ler as mensagens, mas precisa se identificar para enviar.</span>' +
      '<div class="debate-login-buttons">' +
        '<button class="debate-login-btn google" onclick="debateLoginGoogle(\'' + roomId + '\')">' +
          '🔵 Entrar com Google</button>' +
        '<button class="debate-login-btn email" onclick="debateLoginEmail(\'' + roomId + '\')">' +
          '✉️ Entrar com E-mail</button>' +
      '</div>' +
    '</div>';
  container.appendChild(prompt);
}
```

Em OFFLINE_MODE, os botões de login devem chamar `showDebateOfflineLogin(roomId)` que pede nome + avatar:

```javascript
function debateLoginGoogle(roomId) {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    showDebateOfflineLogin(roomId);
    return;
  }
  // Supabase OAuth...
  if (typeof sbClient !== 'undefined' && sbClient.auth) {
    sbClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth.html' } });
  }
}

function debateLoginEmail(roomId) {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    showDebateOfflineLogin(roomId);
    return;
  }
  sessionStorage.setItem('escola_debate_return', roomId);
  window.location.href = 'auth.html';
}

function showDebateOfflineLogin(roomId) {
  var overlay = document.createElement('div');
  overlay.className = 'debate-offline-login-overlay';
  overlay.id = 'debateOfflineLoginOverlay';
  overlay.innerHTML =
    '<div class="debate-offline-login-modal">' +
      '<h3>👋 Como você se chama?</h3>' +
      '<p>Seu nome aparecerá nas mensagens.</p>' +
      '<input type="text" id="debateOfflineName" class="debate-offline-name-input" placeholder="Seu nome..." maxlength="30" ' +
        'onkeydown="if(event.key===\'Enter\')confirmDebateOfflineLogin(\'' + roomId + '\')" />' +
      '<div class="debate-offline-avatars">' +
        '<span class="debate-avatar-option selected" onclick="pickDebateAvatar(this,\'🧑‍🎓\')">🧑‍🎓</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👩‍🎓\')">👩‍🎓</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👨‍🎓\')">👨‍🎓</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👩‍💻\')">👩‍💻</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'🧑‍🔬\')">🧑‍🔬</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👨‍🚀\')">👨‍🚀</span>' +
      '</div>' +
      '<button class="debate-offline-confirm-btn" onclick="confirmDebateOfflineLogin(\'' + roomId + '\')">Entrar no Debate</button>' +
      '<button class="debate-offline-cancel-btn" onclick="document.getElementById(\'debateOfflineLoginOverlay\').remove()">Cancelar</button>' +
    '</div>';
  document.body.appendChild(overlay);
  setTimeout(function() { var i = document.getElementById('debateOfflineName'); if (i) i.focus(); }, 200);
}

window._debateSelectedAvatar = '🧑‍🎓';

function pickDebateAvatar(el, avatar) {
  window._debateSelectedAvatar = avatar;
  document.querySelectorAll('.debate-avatar-option').forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
}

function confirmDebateOfflineLogin(roomId) {
  var input = document.getElementById('debateOfflineName');
  var name = input ? input.value.trim() : '';
  if (!name || name.length < 2) {
    showDebateToast('Digite seu nome (mínimo 2 letras).', 'warning');
    return;
  }
  if (typeof S !== 'undefined') { S.name = name; S.avatar = window._debateSelectedAvatar || '🧑‍🎓'; if (typeof save === 'function') save(); }
  localStorage.setItem('escola_debate_auth', JSON.stringify({ name: name, avatar: window._debateSelectedAvatar || '🧑‍🎓', timestamp: Date.now() }));
  var overlay = document.getElementById('debateOfflineLoginOverlay');
  if (overlay) overlay.remove();
  goRoom(roomId);
}
```

#### DUPLA VERIFICAÇÃO NO ENVIO

Mesmo que o input apareça, adicionar guard no sendDebateMessage():

```javascript
function sendDebateMessage(roomId) {
  // Guard: não envia se não autenticado
  if (!isDebateAuthenticated()) {
    showDebateToast('Faça login para enviar mensagens.', 'warning');
    return;
  }
  // ... resto da função
}
```

---

### PROBLEMA 2 — NAVEGAÇÃO TRAVA DENTRO DO DEBATE

Depois de entrar numa sala, o aluno não consegue sair. Nem voltar para lista de salas, nem para o dashboard, nem para as aulas. A navegação trava.

#### DIAGNÓSTICO

Procurar no app.js:
1. goRoom() usa `c.innerHTML = ''` para limpar #main? Se sim, ele remove o bottom nav ou o header?
2. goRoom() renderiza dentro de #main ou em outro container?
3. O bottom nav (#bottomNav) continua existindo no DOM após entrar na sala?
4. O mobile header (#mobileHeader) continua existindo após entrar na sala?
5. Os onclick dos botões da bottom nav ainda funcionam dentro do debate?
6. Existe `history.pushState` no goDebate/goRoom para suportar botão voltar?

#### CAUSAS PROVÁVEIS

**Causa A — goRoom() destroi o bottom nav ou header:**
Se goRoom() faz `document.body.innerHTML = ...` ou limpa um container pai que inclui o nav, a navegação morre.
→ FIX: goRoom() deve renderizar APENAS dentro de `#main`, nunca tocar no `#bottomNav` nem no `#mobileHeader`

**Causa B — goRoom() não tem botão de voltar:**
Se não há back button nem link para goDebate() ou goDash(), o user fica preso.
→ FIX: Adicionar botão de voltar no topo da sala de chat

**Causa C — CSS sobrepõe o bottom nav:**
Se a área de chat tem z-index alto ou position fixed que cobre a bottom nav.
→ FIX: Ajustar z-index e position para não cobrir a nav

**Causa D — history.pushState ausente:**
Se goDebate/goRoom não fazem pushState, o botão voltar do browser/Android não funciona.
→ FIX: Adicionar pushState

#### CORREÇÃO COMPLETA

**1. goRoom() deve renderizar SOMENTE no #main:**

Verificar que goRoom() começa com:
```javascript
var c = document.getElementById('main');
if (!c) return;
c.innerHTML = '';
```

E NÃO com:
```javascript
document.body.innerHTML = '...'; // ERRADO — mata tudo
document.getElementById('app').innerHTML = '...'; // ERRADO se #app contém o nav
```

**2. Botão voltar VISÍVEL no chat:**

goRoom() DEVE renderizar um botão de voltar no topo da sala:

```javascript
// Dentro de goRoom(), logo após limpar #main:
var backBar = document.createElement('div');
backBar.className = 'debate-back-bar';
backBar.innerHTML = '<button class="debate-back-btn" onclick="goDebate()">← Voltar às Salas</button>';
c.appendChild(backBar);
```

goDebate() DEVE ter botão de voltar ao dashboard:

```javascript
// Dentro de goDebate(), logo após limpar #main:
var backBar = document.createElement('div');
backBar.className = 'debate-back-bar';
backBar.innerHTML = '<button class="debate-back-btn" onclick="goDash()">← Voltar ao Início</button>';
c.appendChild(backBar);
```

CSS:
```css
.debate-back-bar {
  padding: 8px 12px;
}
.debate-back-btn {
  background: none;
  border: none;
  color: var(--text-muted, #6b7280);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 0;
  -webkit-tap-highlight-color: transparent;
}
.debate-back-btn:active { opacity: 0.5; }

/* Esconder no mobile se back do header funciona */
@media (max-width: 1024px) {
  /* Manter visível no debate porque é crítico para navegação */
}
```

**3. Bottom nav funciona dentro do debate:**

Verificar que #bottomNav NÃO está dentro de #main. O HTML deve ser:

```html
<div id="main" class="main">
  <!-- conteúdo dinâmico renderizado aqui -->
</div>

<nav id="bottomNav" class="bottom-nav">
  <!-- botões de nav — FORA do #main -->
</nav>
```

Se bottomNav está DENTRO de #main, MOVER para fora (irmão de #main, não filho).

Se bottomNav está fora mas fica escondido, verificar CSS:
```css
/* A bottom nav deve estar SEMPRE visível no mobile */
@media (max-width: 1024px) {
  .bottom-nav {
    display: flex !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 300;
  }
}
```

**4. Chat não deve sobrepor a bottom nav:**

```css
.debate-messages {
  /* Não ultrapassar a bottom nav */
  max-height: calc(100vh - 200px); /* header + input + bottom nav */
  overflow-y: auto;
}

.debate-input-area {
  position: sticky;
  bottom: 0;
  z-index: 10;
  /* Espaço para a bottom nav */
  margin-bottom: 64px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}

/* OU se bottom nav tem 60px de altura */
@media (max-width: 1024px) {
  .debate-input-area {
    margin-bottom: 64px;
  }
}
```

**5. History API para botão voltar do browser:**

```javascript
// Em goDebate():
function goDebate() {
  history.pushState({ view: 'debate' }, '', '#debate');
  // ... renderizar salas
}

// Em goRoom():
function goRoom(roomId) {
  history.pushState({ view: 'room', roomId: roomId }, '', '#room-' + roomId);
  // ... renderizar chat
}

// Handler de popstate (se não existir, adicionar):
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.view === 'debate') {
    goDebate();
  } else if (e.state && e.state.view === 'room') {
    goRoom(e.state.roomId);
  } else {
    // Default: voltar para dashboard
    if (typeof goDash === 'function') goDash();
  }
});
```

Se já existe um handler de popstate, ADICIONAR os cases de debate/room dentro dele — não criar outro listener.

**6. Mobile header — botão voltar:**

O botão voltar (←) no mobile header deve funcionar no debate:

```javascript
// Na função que controla o back button do header:
// Quando na sala de chat → voltar para lista de salas
// Quando na lista de salas → voltar para dashboard

// Verificar se updateMobileHeader() é chamado em goDebate() e goRoom():
// goDebate() → updateMobileHeader('Debate', true)  → back vai para goDash
// goRoom()   → updateMobileHeader(room.name, true)  → back vai para goDebate
```

Se o back button do header chama `history.back()`, o pushState acima resolve.
Se chama uma função específica, garantir que está mapeado corretamente.

---

### VERIFICAÇÃO FINAL

Testar este fluxo COMPLETO sem erros:

```
1. Dashboard → clicar 💬 Debate → lista de 15 salas aparece
   → [ ] Bottom nav visível e funcional
   → [ ] Botão "← Voltar ao Início" visível

2. Clicar em sala "Economia" → chat abre
   → [ ] Input bloqueado (se não logado)
   → [ ] Prompt de login aparece
   → [ ] Bottom nav visível e funcional
   → [ ] Botão "← Voltar às Salas" visível

3. (Se OFFLINE_MODE) Fazer login com nome + avatar
   → [ ] Input libera após login

4. Enviar mensagem → aparece no chat
   → [ ] Mensagem tem nome + avatar do login

5. Clicar "← Voltar às Salas" → lista de salas
   → [ ] OK

6. Clicar "← Voltar ao Início" → dashboard
   → [ ] OK

7. Clicar botão "Início" na bottom nav DENTRO do debate → dashboard
   → [ ] OK (bottom nav funciona dentro do debate)

8. Ir para debate → sala → clicar botão "Módulos" na bottom nav → módulos
   → [ ] OK (consegue sair do debate por qualquer botão)

9. Ir para debate → sala → clicar botão voltar do Android/browser
   → [ ] Volta para lista de salas (não trava)

10. Na lista de salas → botão voltar do Android/browser
    → [ ] Volta para dashboard (não trava)
```

Se QUALQUER passo falhar: debug, corrigir, testar novamente.

---

### REGRAS

- NUNCA quebrar OFFLINE_MODE
- goRoom() e goDebate() NUNCA destroem o #bottomNav ou #mobileHeader
- Input de mensagem NUNCA aparece sem autenticação
- Botão de voltar SEMPRE presente no debate
- Bottom nav SEMPRE funcional em todas as telas
- Zero npm dependencies
- Incrementar SW_VERSION se alterar assets cacheados

### COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js
git commit -m "fix: debate auth guard blocks anonymous posting, fix navigation trap in debate rooms"
git push origin main
```
