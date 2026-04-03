Tarefa: Ao selecionar uma sala de debate, verificar se o aluno está logado. Se NÃO estiver, mostrar tela de login ANTES de abrir o chat. Só liberar input de texto e áudio após login confirmado. Quem não logar pode VER as mensagens mas não pode participar. Leia app.js, app.html, app.css e supabase-client.js ANTES de alterar. Não quebre OFFLINE_MODE. Execute sem perguntar. Commit e deploy ao final.

### FLUXO CORRETO

```
User clica "💬 Debate" no topo
→ goDebate() mostra 15 salas (SEM exigir login — qualquer um pode ver)
→ User clica numa sala
→ goRoom() verifica: está logado?
  → SIM: abre chat completo (mensagens + input texto + áudio)
  → NÃO: abre chat em modo leitura (mensagens visíveis, input bloqueado)
       → Mostra banner/modal: "Faça login para participar do debate"
       → Botão "Entrar com Google" e "Entrar com E-mail"
       → Após login bem-sucedido: libera input automaticamente
```

### IMPLEMENTAÇÃO

#### 1. Função de verificação de auth

```javascript
function isDebateAuthenticated() {
  // Em OFFLINE_MODE, checar se tem nome/perfil no state local
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    return (typeof S !== 'undefined' && S.name && S.name !== '' && S.name !== 'Visitante');
  }
  // Online: checar Supabase auth
  if (typeof sbClient !== 'undefined' && sbClient.auth) {
    var session = sbClient.auth.getSession ? sbClient.auth.getSession() : null;
    // getSession retorna Promise, mas checamos de forma síncrona pelo state
    var user = sbClient.auth.getUser ? sbClient.auth.getUser() : null;
    return !!user;
  }
  return false;
}
```

#### 2. goRoom() com auth gate

Modificar a função goRoom() para incluir verificação. NÃO impedir de ver a sala — apenas bloquear o envio:

```javascript
function goRoom(roomId) {
  var room = null;
  for (var i = 0; i < DEBATE_ROOMS.length; i++) {
    if (DEBATE_ROOMS[i].id === roomId) { room = DEBATE_ROOMS[i]; break; }
  }
  if (!room) return goDebate();

  var c = document.getElementById('main');
  if (!c) return;
  c.innerHTML = '';
  c.scrollTop = 0;
  window.scrollTo(0, 0);
  window._currentDebateRoom = roomId;

  // Back link
  if (typeof renderBackLink === 'function') renderBackLink('main', '← Salas', goDebate);

  // Header da sala
  var count = (window._debatePresence && window._debatePresence[roomId]) ? window._debatePresence[roomId] : Math.floor(Math.random() * 12) + 1;
  var roomHeader = document.createElement('div');
  roomHeader.className = 'debate-chat-header';
  roomHeader.style.borderBottomColor = room.color;
  roomHeader.innerHTML =
    '<div class="debate-chat-title"><span>' + room.icon + '</span> <span>' + room.name + '</span></div>' +
    '<div class="debate-chat-online"><span class="debate-live-dot"></span> ' + count + ' online</div>';
  c.appendChild(roomHeader);

  // Banner de regras (se não dispensou)
  var rulesKey = 'escola_debate_rules_dismissed';
  if (!sessionStorage.getItem(rulesKey)) {
    var banner = document.createElement('div');
    banner.className = 'debate-rules-banner';
    banner.innerHTML =
      '<span>📋 Fale apenas sobre o tema. Respeite todos. Não compartilhe dados pessoais.</span>' +
      '<button class="debate-rules-close" onclick="this.parentElement.remove();sessionStorage.setItem(\'' + rulesKey + '\',\'1\')">✕</button>';
    c.appendChild(banner);
  }

  // Área de mensagens (TODOS podem ver)
  var msgsContainer = document.createElement('div');
  msgsContainer.className = 'debate-messages';
  msgsContainer.id = 'debateMsgs';
  c.appendChild(msgsContainer);

  // Verificar auth
  var isLogged = isDebateAuthenticated();

  if (isLogged) {
    // LOGADO: mostrar input completo
    renderDebateInput(c, roomId);
  } else {
    // NÃO LOGADO: mostrar banner de login no lugar do input
    renderDebateLoginPrompt(c, roomId);
  }

  // Carregar mensagens (todos veem)
  loadDebateMessages(roomId);
}
```

#### 3. Input para usuários logados

```javascript
function renderDebateInput(container, roomId) {
  // Remover login prompt se existir
  var oldPrompt = document.getElementById('debateLoginPrompt');
  if (oldPrompt) oldPrompt.remove();

  // Remover input antigo se existir
  var oldInput = document.getElementById('debateInputArea');
  if (oldInput) oldInput.remove();

  var inputArea = document.createElement('div');
  inputArea.className = 'debate-input-area';
  inputArea.id = 'debateInputArea';
  inputArea.innerHTML =
    '<button class="debate-audio-btn" id="debateAudioBtn" onclick="toggleDebateAudio(\'' + roomId + '\')" title="Falar">' +
      '🎤' +
    '</button>' +
    '<input type="text" id="debateMsgInput" class="debate-msg-input" ' +
      'placeholder="Digite sua opinião..." maxlength="500" autocomplete="off" ' +
      'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendDebateMessage(\'' + roomId + '\')}" />' +
    '<button class="debate-send-btn" onclick="sendDebateMessage(\'' + roomId + '\')">Enviar</button>';
  container.appendChild(inputArea);

  // Focar no input
  setTimeout(function() {
    var input = document.getElementById('debateMsgInput');
    if (input) input.focus();
  }, 300);
}
```

#### 4. Prompt de login para visitantes

```javascript
function renderDebateLoginPrompt(container, roomId) {
  var prompt = document.createElement('div');
  prompt.className = 'debate-login-prompt';
  prompt.id = 'debateLoginPrompt';
  prompt.innerHTML =
    '<div class="debate-login-icon">🔐</div>' +
    '<div class="debate-login-text">' +
      '<strong>Faça login para participar do debate</strong>' +
      '<span>Você pode ler as mensagens, mas precisa estar logado para enviar.</span>' +
    '</div>' +
    '<div class="debate-login-buttons">' +
      '<button class="debate-login-btn google" onclick="debateLoginGoogle(\'' + roomId + '\')">' +
        '<svg width="18" height="18" viewBox="0 0 18 18" style="margin-right:8px;vertical-align:middle"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>' +
        'Entrar com Google' +
      '</button>' +
      '<button class="debate-login-btn email" onclick="debateLoginEmail(\'' + roomId + '\')">' +
        '✉️ Entrar com E-mail' +
      '</button>' +
    '</div>';
  container.appendChild(prompt);
}
```

#### 5. Funções de login do debate

```javascript
function debateLoginGoogle(roomId) {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    // Em offline mode, simular login pedindo nome
    showDebateOfflineLogin(roomId);
    return;
  }

  // Supabase Google OAuth
  if (typeof sbClient !== 'undefined' && sbClient.auth) {
    sbClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth.html',
        queryParams: { prompt: 'select_account' }
      }
    });
  } else {
    showDebateToast('Login indisponível no momento.', 'warning');
  }
}

function debateLoginEmail(roomId) {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    showDebateOfflineLogin(roomId);
    return;
  }

  // Redirecionar para auth.html com retorno para debate
  sessionStorage.setItem('escola_debate_return', roomId);
  window.location.href = 'auth.html';
}

// Login simplificado para OFFLINE_MODE (pedir só nome)
function showDebateOfflineLogin(roomId) {
  var overlay = document.createElement('div');
  overlay.className = 'debate-offline-login-overlay';
  overlay.id = 'debateOfflineLoginOverlay';
  overlay.innerHTML =
    '<div class="debate-offline-login-modal">' +
      '<h3>👋 Como você se chama?</h3>' +
      '<p>Seu nome aparecerá nas mensagens do debate.</p>' +
      '<input type="text" id="debateOfflineName" class="debate-offline-name-input" ' +
        'placeholder="Seu nome..." maxlength="30" autocomplete="off" ' +
        'onkeydown="if(event.key===\'Enter\')confirmDebateOfflineLogin(\'' + roomId + '\')" />' +
      '<div class="debate-offline-avatars" id="debateAvatarPicker">' +
        '<span class="debate-avatar-option selected" onclick="pickDebateAvatar(this,\'🧑‍🎓\')">🧑‍🎓</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👩‍🎓\')">👩‍🎓</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👨‍🎓\')">👨‍🎓</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👩‍💻\')">👩‍💻</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'🧑‍🔬\')">🧑‍🔬</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'👨‍🚀\')">👨‍🚀</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'🦸‍♀️\')">🦸‍♀️</span>' +
        '<span class="debate-avatar-option" onclick="pickDebateAvatar(this,\'🧙‍♂️\')">🧙‍♂️</span>' +
      '</div>' +
      '<button class="debate-offline-confirm-btn" onclick="confirmDebateOfflineLogin(\'' + roomId + '\')">Entrar no Debate</button>' +
      '<button class="debate-offline-cancel-btn" onclick="document.getElementById(\'debateOfflineLoginOverlay\').remove()">Cancelar</button>' +
    '</div>';
  document.body.appendChild(overlay);

  setTimeout(function() {
    var nameInput = document.getElementById('debateOfflineName');
    if (nameInput) nameInput.focus();
  }, 200);
}

window._debateSelectedAvatar = '🧑‍🎓';

function pickDebateAvatar(el, avatar) {
  window._debateSelectedAvatar = avatar;
  var options = document.querySelectorAll('.debate-avatar-option');
  options.forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
}

function confirmDebateOfflineLogin(roomId) {
  var nameInput = document.getElementById('debateOfflineName');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name || name.length < 2) {
    showDebateToast('Digite seu nome (mínimo 2 letras)', 'warning');
    if (nameInput) nameInput.focus();
    return;
  }

  // Salvar no state local
  if (typeof S !== 'undefined') {
    S.name = name;
    S.avatar = window._debateSelectedAvatar || '🧑‍🎓';
    if (typeof save === 'function') save();
  }

  // Salvar flag de debate auth
  localStorage.setItem('escola_debate_auth', JSON.stringify({
    name: name,
    avatar: window._debateSelectedAvatar || '🧑‍🎓',
    timestamp: Date.now()
  }));

  // Fechar modal
  var overlay = document.getElementById('debateOfflineLoginOverlay');
  if (overlay) overlay.remove();

  // Recarregar a sala com input liberado
  goRoom(roomId);
}
```

#### 6. Atualizar isDebateAuthenticated para checar login offline do debate

```javascript
function isDebateAuthenticated() {
  // 1. Checar login offline do debate
  var debateAuth = localStorage.getItem('escola_debate_auth');
  if (debateAuth) {
    try {
      var auth = JSON.parse(debateAuth);
      if (auth.name && auth.name.length >= 2) return true;
    } catch(e) {}
  }

  // 2. Checar state local do app
  if (typeof S !== 'undefined' && S.name && S.name !== '' && S.name !== 'Visitante' && S.name !== 'Aluno') {
    return true;
  }

  // 3. Em OFFLINE_MODE, só os checks acima
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    return false;
  }

  // 4. Checar Supabase auth
  if (typeof sbClient !== 'undefined' && sbClient.auth) {
    try {
      var session = sbClient.auth.session ? sbClient.auth.session() : null;
      return !!session;
    } catch(e) {}
  }

  return false;
}
```

#### 7. Retorno pós-login do Supabase

Se o aluno fez login via auth.html e tinha `escola_debate_return` no sessionStorage, redirecionar de volta para a sala:

No auth.html ou no onSignIn callback do app.js, adicionar:

```javascript
// Após login bem-sucedido, checar se veio do debate
var debateReturn = sessionStorage.getItem('escola_debate_return');
if (debateReturn) {
  sessionStorage.removeItem('escola_debate_return');
  // Se estamos no app.html, ir direto para a sala
  if (typeof goRoom === 'function') {
    goRoom(debateReturn);
  }
}
```

### CSS DO LOGIN PROMPT E MODAL

```css
/* Banner de login no chat */
.debate-login-prompt {
  background: var(--card-bg, #fff);
  border-top: 1px solid var(--border, #e5e7eb);
  padding: 20px 16px;
  text-align: center;
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin-bottom: 60px;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.06);
}

.debate-login-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.debate-login-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.debate-login-text strong {
  font-size: 0.95rem;
  color: var(--text, #1a1a1a);
}

.debate-login-text span {
  font-size: 0.8rem;
  color: var(--text-muted, #6b7280);
}

.debate-login-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
  margin: 0 auto;
}

.debate-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.debate-login-btn.google {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.debate-login-btn.google:active { background: #f3f4f6; transform: scale(0.97); }

.debate-login-btn.email {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 6px rgba(16,185,129,0.25);
}
.debate-login-btn.email:active { transform: scale(0.97); opacity: 0.9; }

/* Modal de login offline */
.debate-offline-login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.debate-offline-login-modal {
  background: var(--bg, white);
  color: var(--text, #1a1a1a);
  border-radius: 20px;
  padding: 28px 24px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
}

.debate-offline-login-modal h3 {
  margin: 0 0 6px;
  font-size: 1.2rem;
}

.debate-offline-login-modal p {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
}

.debate-offline-name-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid var(--border, #e5e7eb);
  background: var(--input-bg, #f9fafb);
  color: var(--text, #1a1a1a);
  font-size: 1rem;
  text-align: center;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;
}
.debate-offline-name-input:focus {
  border-color: var(--debate-accent, #10b981);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
}

/* Seletor de avatar */
.debate-offline-avatars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.debate-avatar-option {
  font-size: 1.6rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.15s;
  background: var(--input-bg, #f3f4f6);
}
.debate-avatar-option:active { transform: scale(0.9); }
.debate-avatar-option.selected {
  border-color: var(--debate-accent, #10b981);
  background: rgba(16,185,129,0.1);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
}

.debate-offline-confirm-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 10px;
  box-shadow: 0 3px 10px rgba(16,185,129,0.3);
  transition: all 0.15s;
}
.debate-offline-confirm-btn:active { transform: scale(0.97); }

.debate-offline-cancel-btn {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted, #6b7280);
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Dark mode */
[data-theme="dark"] .debate-login-btn.google {
  background: var(--card-bg, #1f2937);
  border-color: #374151;
  color: #e5e7eb;
}
[data-theme="dark"] .debate-offline-login-modal {
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
```

### REGRAS

- NUNCA quebrar OFFLINE_MODE
- Em OFFLINE_MODE: login simplificado (pedir nome + avatar, sem Supabase)
- Quando online: Google OAuth ou email via auth.html
- TODOS podem VER mensagens sem login
- NINGUÉM envia sem estar identificado
- Respeitar dark/light theme
- Zero npm dependencies
- Safe area iOS
- Não alterar outras features
- Incrementar SW_VERSION se alterar assets cacheados

### COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js
git commit -m "feat: debate auth gate — login required to participate, read-only for visitors, offline login with name+avatar"
git push origin main
```
