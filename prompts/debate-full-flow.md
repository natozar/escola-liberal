Tarefa: Reescrever o fluxo completo do Debate. Ao clicar no botão Debate, o aluno PRIMEIRO vê a lista de todas as 15 salas com contagem de alunos online em cada uma. Só DEPOIS de escolher uma sala é que abre o chat com área de mensagens, input de texto com teclado e botão de áudio. Leia app.js, app.html e app.css ANTES de alterar. Não quebre OFFLINE_MODE. Execute sem perguntar. Commit e deploy ao final.

### PROBLEMA ATUAL

O fluxo está quebrado ou incompleto. O comportamento correto tem 2 telas separadas:

**TELA 1 — Lista de Salas (goDebate)**
User clica "💬 Debate" → vê grid com 15 salas → cada sala mostra quantos alunos estão online

**TELA 2 — Chat da Sala (goRoom)**
User clica numa sala → abre chat com mensagens + input de texto + botão enviar + botão áudio

### DIAGNÓSTICO OBRIGATÓRIO

Antes de alterar, ler app.js e responder:
1. A função goDebate() existe? Renderiza cards das salas no #main?
2. A função goRoom(roomId) existe? Renderiza chat no #main?
3. DEBATE_ROOMS está definido como array?
4. MOCK_MESSAGES está definido como objeto com mensagens por sala?
5. As funções estão no escopo global?
6. O CSS das salas e do chat existe no app.css?

Se alguma dessas coisas NÃO existe, criar do zero. Se existe mas está bugada, reescrever.

### IMPLEMENTAÇÃO COMPLETA — TELA 1: LISTA DE SALAS

Substituir ou criar a função goDebate() inteira:

```javascript
function goDebate() {
  const c = document.getElementById('main');
  if (!c) return;
  c.innerHTML = '';
  c.scrollTop = 0;
  window.scrollTo(0, 0);

  // Back link desktop
  if (typeof renderBackLink === 'function') renderBackLink('main', '← Início', goDash);

  // Header
  const header = document.createElement('div');
  header.className = 'debate-list-header';
  header.innerHTML = '<h2>💬 Salas de Debate</h2><p>Escolha um tema e entre na discussão</p>';
  c.appendChild(header);

  // Total online
  let totalOnline = 0;

  // Grid
  const grid = document.createElement('div');
  grid.className = 'debate-rooms-grid';
  grid.id = 'debateRoomsGrid';

  DEBATE_ROOMS.forEach(room => {
    const count = (window._debatePresence && window._debatePresence[room.id]) ? window._debatePresence[room.id] : Math.floor(Math.random() * 18) + 1;
    totalOnline += count;

    const lastMsg = getLastMessagePreview(room.id);

    const card = document.createElement('div');
    card.className = 'debate-room-card';
    card.setAttribute('data-room', room.id);
    card.style.cssText = '--room-color:' + room.color + ';--room-color-light:' + room.color + '15';
    card.onclick = function() { goRoom(room.id); };
    card.innerHTML =
      '<div class="debate-room-icon-wrap" style="background:' + room.color + '15">' +
        '<span class="debate-room-icon">' + room.icon + '</span>' +
      '</div>' +
      '<div class="debate-room-info">' +
        '<div class="debate-room-name">' + room.name + '</div>' +
        '<div class="debate-room-meta">' +
          '<span class="debate-room-online"><span class="debate-live-dot"></span> ' + count + ' online</span>' +
        '</div>' +
        (lastMsg ? '<div class="debate-room-preview">' + lastMsg + '</div>' : '') +
      '</div>' +
      '<div class="debate-room-arrow">›</div>';
    grid.appendChild(card);
  });

  c.appendChild(grid);

  // Atualizar badge do topo
  const badge = document.getElementById('debateOnlineCount');
  if (badge) badge.textContent = totalOnline;

  // Se online, subscribe presence real
  if (typeof OFFLINE_MODE !== 'undefined' && !OFFLINE_MODE && typeof sbClient !== 'undefined') {
    subscribeAllPresence();
  }
}

function getLastMessagePreview(roomId) {
  if (typeof MOCK_MESSAGES !== 'undefined' && MOCK_MESSAGES[roomId] && MOCK_MESSAGES[roomId].length > 0) {
    var last = MOCK_MESSAGES[roomId][MOCK_MESSAGES[roomId].length - 1];
    var preview = last.user_name + ': ' + last.text;
    return preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
  }
  return '';
}
```

### IMPLEMENTAÇÃO COMPLETA — TELA 2: CHAT DA SALA

Substituir ou criar a função goRoom() inteira:

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

  // Guardar sala atual
  window._currentDebateRoom = roomId;

  // Back link desktop
  if (typeof renderBackLink === 'function') renderBackLink('main', '← Salas', goDebate);

  // Header da sala
  var count = (window._debatePresence && window._debatePresence[roomId]) ? window._debatePresence[roomId] : Math.floor(Math.random() * 12) + 1;
  var roomHeader = document.createElement('div');
  roomHeader.className = 'debate-chat-header';
  roomHeader.style.borderBottomColor = room.color;
  roomHeader.innerHTML =
    '<div class="debate-chat-title">' +
      '<span>' + room.icon + '</span> ' +
      '<span>' + room.name + '</span>' +
    '</div>' +
    '<div class="debate-chat-online"><span class="debate-live-dot"></span> ' + count + ' online</div>';
  c.appendChild(roomHeader);

  // Banner de regras
  var rulesKey = 'escola_debate_rules_dismissed';
  if (!sessionStorage.getItem(rulesKey)) {
    var banner = document.createElement('div');
    banner.className = 'debate-rules-banner';
    banner.innerHTML =
      '<span>📋 Regras: Fale apenas sobre o tema da sala. Respeite todos. Não compartilhe dados pessoais.</span>' +
      '<button class="debate-rules-close" onclick="this.parentElement.remove();sessionStorage.setItem(\'' + rulesKey + '\',\'1\')">✕</button>';
    c.appendChild(banner);
  }

  // Área de mensagens
  var msgsContainer = document.createElement('div');
  msgsContainer.className = 'debate-messages';
  msgsContainer.id = 'debateMsgs';
  c.appendChild(msgsContainer);

  // Área de input (texto + áudio + enviar)
  var inputArea = document.createElement('div');
  inputArea.className = 'debate-input-area';
  inputArea.id = 'debateInputArea';
  inputArea.innerHTML =
    '<button class="debate-audio-btn" id="debateAudioBtn" onclick="toggleDebateAudio(\'' + roomId + '\')" title="Enviar áudio">' +
      '🎤' +
    '</button>' +
    '<input type="text" id="debateMsgInput" class="debate-msg-input" ' +
      'placeholder="Digite sua opinião..." maxlength="500" autocomplete="off" ' +
      'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendDebateMessage(\'' + roomId + '\')}" />' +
    '<button class="debate-send-btn" id="debateSendBtn" onclick="sendDebateMessage(\'' + roomId + '\')">' +
      'Enviar' +
    '</button>';
  c.appendChild(inputArea);

  // Carregar mensagens
  loadDebateMessages(roomId);

  // Focar no input
  setTimeout(function() {
    var input = document.getElementById('debateMsgInput');
    if (input) input.focus();
  }, 300);
}
```

### MENSAGENS — CARREGAR E EXIBIR

```javascript
function loadDebateMessages(roomId) {
  var container = document.getElementById('debateMsgs');
  if (!container) return;
  container.innerHTML = '';

  // Pegar mensagens (mock ou real)
  var msgs = [];
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    msgs = (typeof MOCK_MESSAGES !== 'undefined' && MOCK_MESSAGES[roomId]) ? MOCK_MESSAGES[roomId] : [];
  } else if (typeof sbClient !== 'undefined') {
    // TODO: carregar do Supabase quando online
    msgs = (typeof MOCK_MESSAGES !== 'undefined' && MOCK_MESSAGES[roomId]) ? MOCK_MESSAGES[roomId] : [];
  } else {
    msgs = (typeof MOCK_MESSAGES !== 'undefined' && MOCK_MESSAGES[roomId]) ? MOCK_MESSAGES[roomId] : [];
  }

  if (msgs.length === 0) {
    container.innerHTML = '<div class="debate-empty">Nenhuma mensagem ainda. Seja o primeiro a debater! 🎯</div>';
    return;
  }

  msgs.forEach(function(msg) { appendDebateMessage(container, msg); });
  container.scrollTop = container.scrollHeight;
}

function appendDebateMessage(container, msg) {
  if (!container) container = document.getElementById('debateMsgs');
  if (!container) return;

  var time = new Date(msg.created_at);
  var hh = String(time.getHours()).padStart(2, '0');
  var mm = String(time.getMinutes()).padStart(2, '0');

  var div = document.createElement('div');
  div.className = 'debate-msg';
  div.innerHTML =
    '<div class="debate-msg-avatar">' + (msg.user_avatar || '🧑‍🎓') + '</div>' +
    '<div class="debate-msg-body">' +
      '<div class="debate-msg-header">' +
        '<span class="debate-msg-name">' + escapeDebateHTML(msg.user_name) + '</span>' +
        '<span class="debate-msg-time">' + hh + ':' + mm + '</span>' +
      '</div>' +
      '<div class="debate-msg-text">' + escapeDebateHTML(msg.text) + '</div>' +
    '</div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeDebateHTML(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
```

### ENVIAR MENSAGEM (TEXTO)

```javascript
function sendDebateMessage(roomId) {
  var input = document.getElementById('debateMsgInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  // Moderação (se existir)
  if (typeof moderateMessage === 'function') {
    var mod = moderateMessage(text, roomId);
    if (!mod.allowed) {
      showDebateToast(mod.reason, 'warning');
      return;
    }
  }

  var msg = {
    user_name: (typeof S !== 'undefined' && S.name) ? S.name : 'Você',
    user_avatar: (typeof S !== 'undefined' && S.avatar) ? S.avatar : '🧑‍🎓',
    text: text,
    created_at: new Date().toISOString()
  };

  // Em OFFLINE_MODE, adicionar local
  appendDebateMessage(null, msg);
  input.value = '';
  input.focus();

  // Se online e logado, enviar para Supabase
  if (typeof OFFLINE_MODE !== 'undefined' && !OFFLINE_MODE && typeof sbClient !== 'undefined') {
    // TODO: sbClient.from('debate_messages').insert(...)
  }
}

function showDebateToast(message, type) {
  var existing = document.querySelector('.mod-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'mod-toast ' + (type || 'info');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 4000);
}
```

### FUNÇÃO DE ÁUDIO (SPEECH-TO-TEXT)

Usar a Web Speech API nativa do browser (sem dependências):

```javascript
var _debateRecognition = null;
var _debateRecording = false;

function toggleDebateAudio(roomId) {
  if (_debateRecording) {
    stopDebateAudio();
    return;
  }

  // Checar suporte
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showDebateToast('Seu navegador não suporta reconhecimento de voz.', 'info');
    return;
  }

  _debateRecognition = new SpeechRecognition();
  _debateRecognition.lang = 'pt-BR';
  _debateRecognition.continuous = false;
  _debateRecognition.interimResults = false;
  _debateRecognition.maxAlternatives = 1;

  _debateRecognition.onresult = function(event) {
    var transcript = event.results[0][0].transcript;
    var input = document.getElementById('debateMsgInput');
    if (input) {
      input.value = (input.value ? input.value + ' ' : '') + transcript;
      input.focus();
    }
    stopDebateAudio();
  };

  _debateRecognition.onerror = function(event) {
    if (event.error === 'not-allowed') {
      showDebateToast('Permissão de microfone negada. Habilite nas configurações.', 'warning');
    } else if (event.error !== 'aborted') {
      showDebateToast('Erro no reconhecimento de voz. Tente novamente.', 'info');
    }
    stopDebateAudio();
  };

  _debateRecognition.onend = function() {
    stopDebateAudio();
  };

  _debateRecognition.start();
  _debateRecording = true;

  // Visual feedback
  var btn = document.getElementById('debateAudioBtn');
  if (btn) {
    btn.classList.add('recording');
    btn.innerHTML = '🔴';
  }

  showDebateToast('Ouvindo... fale agora', 'info');
}

function stopDebateAudio() {
  _debateRecording = false;
  if (_debateRecognition) {
    try { _debateRecognition.stop(); } catch(e) {}
    _debateRecognition = null;
  }
  var btn = document.getElementById('debateAudioBtn');
  if (btn) {
    btn.classList.remove('recording');
    btn.innerHTML = '🎤';
  }
}
```

### MOCK_MESSAGES (se não existir, criar)

Verificar se MOCK_MESSAGES já está definido no app.js. Se NÃO existir, criar com mensagens para todas as 15 salas. Se já existir, manter como está. Cada sala deve ter 3-5 mensagens mockadas com debates relevantes ao tema.

### DEBATE_ROOMS (se não existir, criar)

Verificar se DEBATE_ROOMS já está definido. Se NÃO existir, criar:

```javascript
var DEBATE_ROOMS = [
  { id: 'economia',    name: 'Economia & Livre Mercado',   icon: '📊', color: '#f59e0b' },
  { id: 'filosofia',   name: 'Filosofia & Ética',          icon: '🏛️', color: '#8b5cf6' },
  { id: 'historia',    name: 'História & Revisionismo',     icon: '📜', color: '#ef4444' },
  { id: 'politica',    name: 'Política & Estado',           icon: '⚖️', color: '#3b82f6' },
  { id: 'educacao',    name: 'Educação & Homeschool',       icon: '📚', color: '#10b981' },
  { id: 'tecnologia',  name: 'IA & Tecnologia',             icon: '🤖', color: '#06b6d4' },
  { id: 'direito',     name: 'Direito & Liberdade',         icon: '🔒', color: '#6366f1' },
  { id: 'midia',       name: 'Mídia & Fake News',           icon: '📡', color: '#ec4899' },
  { id: 'financas',    name: 'Finanças & Investimento',     icon: '💰', color: '#eab308' },
  { id: 'psicologia',  name: 'Psicologia & Comportamento',  icon: '🧠', color: '#a855f7' },
  { id: 'ciencias',    name: 'Ciências & Clima',            icon: '🔬', color: '#22c55e' },
  { id: 'empreender',  name: 'Empreendedorismo',            icon: '🚀', color: '#f97316' },
  { id: 'cultura',     name: 'Cultura & Sociedade',         icon: '🎭', color: '#e11d48' },
  { id: 'saude',       name: 'Saúde & Bem-estar',           icon: '❤️', color: '#dc2626' },
  { id: 'logica',      name: 'Lógica & Argumentação',       icon: '♟️', color: '#64748b' }
];
```

Se já existir, NÃO duplicar.

### CSS COMPLETO

Adicionar ou substituir no app.css (verificar se já existe para não duplicar):

```css
/* ===== DEBATE — Lista de Salas ===== */
.debate-list-header {
  padding: 16px 16px 8px;
}
.debate-list-header h2 {
  font-size: 1.3rem;
  margin: 0 0 4px;
  color: var(--text, #1a1a1a);
}
.debate-list-header p {
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
  margin: 0;
}

.debate-rooms-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 8px 14px 120px;
}
@media(min-width:600px) { .debate-rooms-grid { grid-template-columns: 1fr 1fr; } }
@media(min-width:900px) { .debate-rooms-grid { grid-template-columns: 1fr 1fr 1fr; } }

.debate-room-card {
  background: var(--card-bg, #fff);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border-left: 4px solid var(--room-color, #10b981);
}
.debate-room-card:active { transform: scale(0.97); }

.debate-room-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.debate-room-icon { font-size: 1.6rem; }
.debate-room-info { flex: 1; min-width: 0; }
.debate-room-name { font-weight: 700; font-size: 0.92rem; color: var(--text, #1a1a1a); }
.debate-room-meta { margin-top: 3px; }
.debate-room-online {
  font-size: 0.78rem;
  color: #10b981;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.debate-room-preview {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.debate-room-arrow {
  font-size: 1.4rem;
  color: var(--text-muted, #9ca3af);
  font-weight: 300;
  flex-shrink: 0;
}

/* Bolinha verde pulsante */
.debate-live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  background: #22c55e;
  border-radius: 50%;
  animation: livePulse 1.5s ease-in-out infinite;
}
@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

/* ===== DEBATE — Chat da Sala ===== */
.debate-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 1rem;
  border-bottom: 3px solid #10b981;
  color: var(--text, #1a1a1a);
}
.debate-chat-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.debate-chat-online {
  font-size: 0.8rem;
  color: #10b981;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Banner de regras */
.debate-rules-banner {
  background: var(--warning-bg, #fef3c7);
  color: var(--warning-text, #92400e);
  padding: 8px 12px;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.debate-rules-close {
  background: none;
  border: none;
  color: var(--warning-text, #92400e);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.7;
}

/* Mensagens */
.debate-messages {
  overflow-y: auto;
  padding: 8px 12px;
  min-height: 300px;
  max-height: calc(100vh - 260px);
  scroll-behavior: smooth;
}

.debate-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted, #9ca3af);
  font-size: 0.95rem;
}

.debate-msg {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
}
.debate-msg + .debate-msg {
  border-top: 1px solid var(--border, rgba(0,0,0,0.06));
}

.debate-msg-avatar {
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.debate-msg-body { flex: 1; min-width: 0; }
.debate-msg-header {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 2px;
}
.debate-msg-name { font-weight: 700; font-size: 0.83rem; color: var(--text, #1a1a1a); }
.debate-msg-time { font-size: 0.68rem; color: var(--text-muted, #9ca3af); }
.debate-msg-text {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text, #374151);
  word-break: break-word;
}

/* Input area */
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
  margin-bottom: 60px; /* espaço para bottom nav */
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
  align-items: center;
}

.debate-msg-input {
  flex: 1;
  padding: 10px 16px;
  border-radius: 24px;
  border: 2px solid var(--border, #e5e7eb);
  background: var(--input-bg, #f9fafb);
  color: var(--text, #1a1a1a);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.debate-msg-input:focus {
  border-color: var(--debate-accent, #10b981);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  background: var(--bg, #fff);
}
.debate-msg-input::placeholder {
  color: var(--text-muted, #9ca3af);
}

.debate-send-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 24px;
  padding: 10px 18px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
}
.debate-send-btn:active { transform: scale(0.95); opacity: 0.9; }

/* Botão de áudio */
.debate-audio-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid var(--border, #e5e7eb);
  background: var(--card-bg, #fff);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.debate-audio-btn:active { transform: scale(0.9); }
.debate-audio-btn.recording {
  border-color: #ef4444;
  background: #fef2f2;
  animation: recordPulse 1s ease-in-out infinite;
}
@keyframes recordPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}

/* Toast de moderação */
.mod-toast {
  position: fixed;
  bottom: 160px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  z-index: 9999;
  max-width: 90vw;
  text-align: center;
  animation: toastIn 0.3s ease;
}
.mod-toast.warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.mod-toast.danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.mod-toast.info { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

/* Dark mode debate */
[data-theme="dark"] .debate-room-card { box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
[data-theme="dark"] .debate-input-area { box-shadow: 0 -2px 8px rgba(0,0,0,0.15); }
[data-theme="dark"] .debate-audio-btn.recording { background: #451a1a; }
[data-theme="dark"] .debate-rules-banner { background: #422006; color: #fcd34d; }
```

### PRESENCE (CONTAGEM ONLINE)

Inicializar objeto global para contagens:

```javascript
window._debatePresence = {};

function subscribeAllPresence() {
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) return;
  if (typeof sbClient === 'undefined') return;

  DEBATE_ROOMS.forEach(function(room) {
    var channel = sbClient.channel('debate:' + room.id, {
      config: { presence: { key: (typeof S !== 'undefined' && S.name) ? S.name : 'anon-' + Math.random().toString(36).slice(2) } }
    });
    channel.on('presence', { event: 'sync' }, function() {
      var count = Object.keys(channel.presenceState()).length;
      window._debatePresence[room.id] = count;
      updateRoomCountUI(room.id, count);
      updateTotalOnlineUI();
    });
    channel.subscribe(function(status) {
      if (status === 'SUBSCRIBED') {
        channel.track({ user: (typeof S !== 'undefined' && S.name) || 'Visitante' });
      }
    });
  });
}

function updateRoomCountUI(roomId, count) {
  var card = document.querySelector('[data-room="' + roomId + '"] .debate-room-online');
  if (card) card.innerHTML = '<span class="debate-live-dot"></span> ' + count + ' online';
}

function updateTotalOnlineUI() {
  var total = 0;
  for (var key in window._debatePresence) {
    total += window._debatePresence[key] || 0;
  }
  var badge = document.getElementById('debateOnlineCount');
  if (badge) badge.textContent = total;
  var btn = document.getElementById('debateTopBtn');
  if (btn) {
    if (total > 0) btn.classList.add('has-activity');
    else btn.classList.remove('has-activity');
  }
}
```

### REGRAS

- NUNCA quebrar OFFLINE_MODE — tudo funciona com mock
- Respeitar dark/light theme
- Zero npm dependencies — vanilla JS, Web Speech API nativa
- Safe area iOS: env(safe-area-inset-bottom)
- Não duplicar código que já existe (verificar antes)
- Não remover features existentes
- Incrementar SW_VERSION no sw.js
- Não alterar fluxo de pagamento

### COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js
git commit -m "feat: debate full flow — room list with online count, chat with text input and voice, clean UI"
git push origin main
```
