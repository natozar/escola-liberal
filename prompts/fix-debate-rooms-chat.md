Tarefa: O botão de Debate no topo foi implementado mas está quebrado — ao clicar, as salas NÃO aparecem. E ao selecionar uma sala, o chat com teclado para digitar NÃO funciona. Corrija tudo. Leia app.js, app.html, app.css e src/boot.js ANTES de alterar. Não quebre OFFLINE_MODE. Execute sem perguntar. Commit e deploy ao final.

### DIAGNÓSTICO OBRIGATÓRIO

Antes de alterar qualquer código, faça:

1. Procurar no app.js a função `goDebate()` — ela existe? Está renderizando HTML no container `#main`?
2. Procurar a função `goRoom(roomId)` — ela existe? Está renderizando a área de chat?
3. Verificar se `DEBATE_ROOMS` está definido como array de objetos
4. Verificar se o botão `#debateTopBtn` no app.html tem `onclick="goDebate()"`
5. Verificar se o container `#main` existe e é o mesmo usado por `goDash()`, `goMod()`, etc.
6. Verificar se `goDebate` e `goRoom` estão acessíveis no escopo global (não presas dentro de IIFE ou bloco)
7. Checar o console do browser por erros (abrir DevTools > Console)

### O QUE DEVE FUNCIONAR

**Fluxo completo:**
```
User clica "💬 Debate" no topo
→ goDebate() renderiza grid de 15 salas no #main
→ Cada sala mostra: ícone + nome + "🟢 X online"
→ User clica numa sala
→ goRoom('economia') renderiza chat completo no #main
→ Mensagens mockadas aparecem (OFFLINE_MODE)
→ Input de texto + botão Enviar no bottom
→ User digita e envia → mensagem aparece no chat
→ Botão voltar → goDebate()
```

### CORREÇÃO 1: goDebate() deve renderizar no #main

A função goDebate() DEVE seguir o mesmo padrão de renderização das outras views do app (goDash, goMod, goPerf, etc.). Verificar como elas renderizam e seguir o mesmo padrão. Geralmente é:

```javascript
function goDebate() {
  const c = document.getElementById('main');
  if (!c) return;

  // Limpar view anterior
  c.innerHTML = '';

  // Back link (desktop)
  renderBackLink('main', '← Início', goDash);

  // Título
  c.innerHTML += '<h2 style="margin:16px 0 12px;font-size:1.3rem;">💬 Salas de Debate</h2>';

  // Grid de salas
  let html = '<div class="debate-rooms-grid">';
  DEBATE_ROOMS.forEach(room => {
    const count = window._debatePresence?.[room.id] || Math.floor(Math.random() * 12) + 1;
    html += `
      <div class="debate-room-card" onclick="goRoom('${room.id}')" style="border-left:4px solid ${room.color}">
        <div class="debate-room-icon">${room.icon}</div>
        <div class="debate-room-info">
          <div class="debate-room-name">${room.name}</div>
          <div class="debate-room-online">🟢 ${count} online</div>
        </div>
      </div>`;
  });
  html += '</div>';
  c.innerHTML += html;

  // Scroll para o topo
  c.scrollTop = 0;
  window.scrollTo(0, 0);
}
```

### CORREÇÃO 2: goRoom() deve renderizar chat funcional

```javascript
function goRoom(roomId) {
  const room = DEBATE_ROOMS.find(r => r.id === roomId);
  if (!room) return goDebate();

  const c = document.getElementById('main');
  if (!c) return;
  c.innerHTML = '';

  // Back link
  renderBackLink('main', '← Salas', goDebate);

  // Header da sala
  const count = window._debatePresence?.[roomId] || Math.floor(Math.random() * 8) + 1;
  c.innerHTML += `
    <div class="debate-room-header" style="border-bottom:3px solid ${room.color}">
      <span>${room.icon} ${room.name}</span>
      <span class="debate-room-online">🟢 ${count} online</span>
    </div>`;

  // Área de mensagens
  c.innerHTML += '<div id="debateMsgs" class="debate-messages"></div>';

  // Input de mensagem (FIXO no bottom da área de chat, acima da bottom nav)
  c.innerHTML += `
    <div class="debate-input-area" id="debateInputArea">
      <input type="text" id="debateMsgInput" class="debate-msg-input"
        placeholder="Digite sua mensagem..." maxlength="500"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendDebateMessage('${roomId}')}" />
      <button class="debate-send-btn" onclick="sendDebateMessage('${roomId}')">Enviar</button>
    </div>`;

  // Carregar mensagens
  loadDebateMessages(roomId);
}
```

### CORREÇÃO 3: Carregar e exibir mensagens

```javascript
function loadDebateMessages(roomId) {
  const container = document.getElementById('debateMsgs');
  if (!container) return;

  // Em OFFLINE_MODE, usar mensagens mockadas
  // MOCK_MESSAGES deve estar definido (do prompt anterior)
  const msgs = (typeof MOCK_MESSAGES !== 'undefined' && MOCK_MESSAGES[roomId])
    ? MOCK_MESSAGES[roomId]
    : [{ user_name: 'Sistema', user_avatar: '🤖', text: 'Seja o primeiro a debater nesta sala!', created_at: new Date().toISOString() }];

  container.innerHTML = '';
  msgs.forEach(msg => appendDebateMessage(container, msg));

  // Auto-scroll para última mensagem
  container.scrollTop = container.scrollHeight;
}

function appendDebateMessage(container, msg) {
  if (!container) container = document.getElementById('debateMsgs');
  if (!container) return;

  const time = new Date(msg.created_at);
  const hh = String(time.getHours()).padStart(2,'0');
  const mm = String(time.getMinutes()).padStart(2,'0');

  const div = document.createElement('div');
  div.className = 'debate-msg';
  div.innerHTML = `
    <span class="debate-msg-avatar">${msg.user_avatar || '🧑‍🎓'}</span>
    <div class="debate-msg-body">
      <div class="debate-msg-header">
        <span class="debate-msg-name">${msg.user_name}</span>
        <span class="debate-msg-time">${hh}:${mm}</span>
      </div>
      <div class="debate-msg-text">${escapeHTML(msg.text)}</div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Escape HTML para prevenir XSS
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

### CORREÇÃO 4: Enviar mensagem

```javascript
function sendDebateMessage(roomId) {
  const input = document.getElementById('debateMsgInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Em OFFLINE_MODE, adicionar mensagem localmente
  const msg = {
    user_name: (typeof S !== 'undefined' && S.name) ? S.name : 'Você',
    user_avatar: (typeof S !== 'undefined' && S.avatar) ? S.avatar : '🧑‍🎓',
    text: text,
    created_at: new Date().toISOString()
  };

  appendDebateMessage(null, msg);
  input.value = '';
  input.focus();
}
```

### CORREÇÃO 5: CSS completo para salas e chat

Adicionar no app.css (se não existir ou estiver incompleto):

```css
/* Grid de salas */
.debate-rooms-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 0 12px 100px;
}
@media(min-width:600px) { .debate-rooms-grid { grid-template-columns: 1fr 1fr; } }
@media(min-width:900px) { .debate-rooms-grid { grid-template-columns: 1fr 1fr 1fr; } }

/* Card de sala */
.debate-room-card {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.debate-room-card:active { transform: scale(0.97); }
.debate-room-icon { font-size: 1.8rem; }
.debate-room-name { font-weight: 700; font-size: 0.95rem; color: var(--text, #1a1a1a); }
.debate-room-online { font-size: 0.8rem; color: #10b981; margin-top: 2px; }

/* Header da sala de chat */
.debate-room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 8px;
}

/* Área de mensagens */
.debate-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 8px;
  max-height: calc(100vh - 280px);
  min-height: 300px;
}

/* Mensagem individual */
.debate-msg {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.debate-msg:last-child { border-bottom: none; }
.debate-msg-avatar { font-size: 1.5rem; flex-shrink: 0; }
.debate-msg-body { flex: 1; min-width: 0; }
.debate-msg-header { display: flex; gap: 8px; align-items: baseline; margin-bottom: 2px; }
.debate-msg-name { font-weight: 700; font-size: 0.85rem; color: var(--text, #1a1a1a); }
.debate-msg-time { font-size: 0.7rem; color: var(--text-muted, #9ca3af); }
.debate-msg-text { font-size: 0.9rem; line-height: 1.4; color: var(--text, #1a1a1a); word-break: break-word; }

/* Input de mensagem */
.debate-input-area {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: var(--card-bg, #fff);
  border-top: 1px solid var(--border, #e5e7eb);
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
}
.debate-msg-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 24px;
  border: 1px solid var(--border, #d1d5db);
  background: var(--input-bg, #f9fafb);
  color: var(--text, #1a1a1a);
  font-size: 0.9rem;
  outline: none;
}
.debate-msg-input:focus {
  border-color: var(--debate-accent, #10b981);
  box-shadow: 0 0 0 2px rgba(16,185,129,0.2);
}
.debate-send-btn {
  background: var(--debate-accent, #10b981);
  color: white;
  border: none;
  border-radius: 24px;
  padding: 10px 18px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}
.debate-send-btn:active { opacity: 0.8; }
```

### CORREÇÃO 6: Garantir escopo global

Verificar que TODAS estas funções estão no escopo global (não dentro de if, IIFE, ou bloco):
- `goDebate`
- `goRoom`
- `loadDebateMessages`
- `appendDebateMessage`
- `sendDebateMessage`
- `escapeHTML`
- `DEBATE_ROOMS` (const no escopo global)
- `MOCK_MESSAGES` (const no escopo global)

Se alguma estiver dentro de um bloco, mover para fora.

### CORREÇÃO 7: Verificar bottom nav não sobrepõe o input

O input de mensagem deve ficar ACIMA da bottom nav. Adicionar padding-bottom suficiente:

```css
/* Se a bottom nav tem ~60px de altura */
.debate-input-area {
  margin-bottom: 60px; /* altura da bottom nav */
}
```

Ajustar conforme a altura real da `.bottom-nav` no app.css.

### VERIFICAÇÃO FINAL

Depois de corrigir, testar mentalmente o fluxo:
1. Abrir app.html
2. Clicar no botão 💬 Debate no topo → grid de 15 salas aparece
3. Clicar em "Economia & Livre Mercado" → chat abre com 4 mensagens mockadas
4. Digitar "Concordo com a Ana" + Enter → mensagem aparece no chat
5. Clicar voltar → volta para lista de salas
6. Clicar voltar → volta para dashboard

Se qualquer passo falhar, depurar e corrigir antes do commit.

### COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js
git commit -m "fix: debate rooms rendering and chat input — complete flow working"
git push origin main
```
