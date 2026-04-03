Tarefa: Melhorar visual do botão de Debate no topo e remover o tutor IA da sala de debate. Leia app.js, app.html e app.css ANTES de alterar. Não quebre OFFLINE_MODE. Execute sem perguntar. Commit e deploy ao final.

### 1. REMOVER TUTOR DA SALA DE DEBATE

Procurar no app.js qualquer referência ao chat tutor (initChat, addBotMsg, askAITutor, chat-container, tutor) dentro das funções goDebate() e goRoom(). Se o tutor estiver aparecendo dentro da view de debate, remover. O debate é entre alunos, não com IA.

Verificar também:
- Se há algum botão de "Tutor" ou "Perguntar ao Tutor" renderizado dentro de goRoom()
- Se há inicialização do chat tutor quando entra numa sala de debate
- Se há sobreposição visual do container do tutor com a área de debate

Remover TUDO relacionado ao tutor dentro do contexto de debate. O tutor continua funcionando nas aulas normais — só não aparece no debate.

### 2. BOTÃO DEBATE NO TOPO — REDESIGN BONITO

O botão precisa ser o destaque visual da barra superior. Deve parecer premium e convidativo. Aplicar este design:

```css
.debate-btn-top {
  position: relative;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 7px 18px;
  font-weight: 800;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(16, 185, 129, 0.35), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.debate-btn-top:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 20px rgba(16, 185, 129, 0.45), 0 2px 6px rgba(0, 0, 0, 0.12);
}

.debate-btn-top:active {
  transform: scale(0.96);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

/* Ícone do chat com efeito */
.debate-btn-top .debate-icon {
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
}

/* Badge de contagem online */
.debate-btn-top .online-count {
  background: rgba(255, 255, 255, 0.95);
  color: #059669;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 900;
  min-width: 22px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  line-height: 1.3;
}

/* Pulso quando tem gente online */
.debate-btn-top.has-activity {
  animation: debatePulse 2.5s ease-in-out infinite;
}

@keyframes debatePulse {
  0%, 100% { box-shadow: 0 3px 12px rgba(16, 185, 129, 0.35); }
  50% { box-shadow: 0 3px 20px rgba(16, 185, 129, 0.55), 0 0 30px rgba(16, 185, 129, 0.15); }
}

/* Bolinha verde pulsante de "ao vivo" */
.debate-btn-top .live-dot {
  width: 7px;
  height: 7px;
  background: #4ade80;
  border-radius: 50%;
  animation: livePulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 4px rgba(74, 222, 128, 0.6);
}

@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

/* Dark mode */
[data-theme="dark"] .debate-btn-top {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 3px 12px rgba(5, 150, 105, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .debate-btn-top .online-count {
  background: rgba(255, 255, 255, 0.15);
  color: #6ee7b7;
}
```

### 3. HTML DO BOTÃO

Substituir o botão atual por esta estrutura mais rica:

```html
<button id="debateTopBtn" class="debate-btn-top has-activity" onclick="goDebate()">
  <span class="debate-icon">💬</span>
  <span class="debate-label">Debate</span>
  <span class="live-dot"></span>
  <span class="online-count" id="debateOnlineCount">0</span>
</button>
```

### 4. POSICIONAMENTO NA BARRA SUPERIOR

O botão deve estar centralizado na barra superior do mobile header e do desktop top bar. Verificar que:
- Não está sendo empurrado para os cantos
- Tem espaço visual suficiente dos outros elementos (back button, XP, etc.)
- Está verticalmente centralizado na barra
- Em telas muito pequenas (<320px), reduzir padding e esconder a palavra "Debate" (mostrar só ícone + count)

```css
@media (max-width: 340px) {
  .debate-btn-top .debate-label {
    display: none;
  }
  .debate-btn-top {
    padding: 7px 12px;
  }
}
```

### 5. CARDS DAS SALAS — POLISH

Se os cards das salas já existem, melhorar o visual:

```css
.debate-room-card {
  background: var(--card-bg, #fff);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  border-left: 4px solid var(--room-color);
  position: relative;
  overflow: hidden;
}

.debate-room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.debate-room-card:active {
  transform: scale(0.98);
}

.debate-room-icon {
  font-size: 2rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--room-color-light, #f0fdf4);
  border-radius: 12px;
  flex-shrink: 0;
}

.debate-room-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text, #1a1a1a);
  line-height: 1.3;
}

.debate-room-online {
  font-size: 0.78rem;
  color: #10b981;
  font-weight: 600;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.debate-room-preview {
  font-size: 0.78rem;
  color: var(--text-muted, #9ca3af);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

/* Dark mode cards */
[data-theme="dark"] .debate-room-card {
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

[data-theme="dark"] .debate-room-icon {
  background: rgba(255,255,255,0.05);
}
```

Na função goDebate(), ao renderizar cada card, usar inline style para setar --room-color:

```javascript
html += `<div class="debate-room-card" onclick="goRoom('${room.id}')" style="--room-color:${room.color};--room-color-light:${room.color}15">`;
```

### 6. ÁREA DE CHAT — VISUAL LIMPO

Melhorar visual das mensagens no chat:

```css
.debate-msg {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
  border-radius: 8px;
  transition: background 0.15s;
}

.debate-msg:hover {
  background: var(--hover-bg, rgba(0,0,0,0.02));
}

.debate-msg-avatar {
  font-size: 1.6rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.debate-msg-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text, #1a1a1a);
}

.debate-msg-time {
  font-size: 0.68rem;
  color: var(--text-muted, #9ca3af);
  font-weight: 500;
}

.debate-msg-text {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text, #374151);
  word-break: break-word;
}

/* Input area refinado */
.debate-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  background: var(--card-bg, #fff);
  border-top: 1px solid var(--border, #e5e7eb);
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
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
  padding: 10px 20px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
}

.debate-send-btn:hover {
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35);
}

.debate-send-btn:active {
  transform: scale(0.95);
}

[data-theme="dark"] .debate-input-area {
  box-shadow: 0 -2px 8px rgba(0,0,0,0.15);
}
```

### 7. REGRAS

- NUNCA quebrar OFFLINE_MODE
- Respeitar dark/light theme
- Zero npm dependencies
- Safe area iOS
- Não alterar outras features
- Incrementar SW_VERSION se alterar assets cacheados

### 8. COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js
git commit -m "fix: polish debate button, improve room cards and chat UI, remove tutor from debate"
git push origin main
```
