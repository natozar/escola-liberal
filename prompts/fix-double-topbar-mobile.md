Tarefa: No mobile (iOS e Android) estão aparecendo DUAS barras superiores. Unificar em uma barra única, eficiente e bonita. Leia app.html (linhas 1-250 e linhas 650-780), app.css (linhas 1000-1230), app.js (funções updateMobileHeader e updateBottomNav) ANTES de alterar. Execute sem perguntar. Commit e deploy ao final.

### DIAGNÓSTICO DO PROBLEMA

Existem TRÊS causas sobrepostas criando a barra dupla:

**Causa 1 — Dois elementos de header no HTML:**
- `#mobileHeader` (app.html ~linha 202): barra fixa no topo com back, título, XP, debate, avatar
- Pode existir outro header ou div fixa que aparece acima/abaixo (verificar linhas 201-220 e 770-780)

**Causa 2 — Safe area duplicada:**
- `body` tem `padding: env(safe-area-inset-top)` (app.css ~linha 1187)
- `.mobile-header` tem `padding-top: calc(.5rem + env(safe-area-inset-top))` (app.css ~linha 1010)
- `.main` tem `padding-top: calc(64px + env(safe-area-inset-top))` (app.css ~linha 1192)
- Resultado: safe-area-inset-top é aplicado 3 VEZES, criando espaço enorme no topo

**Causa 3 — Botão Debate duplicado:**
- `#debateTopBtn` no mobile header (~linha 209)
- `#debateTopBtnDesktop` em outro lugar (~linha 774)
- Ambos podem estar visíveis ao mesmo tempo

### SOLUÇÃO: UMA BARRA ÚNICA

Reescrever o mobile header para ser UMA barra compacta com tudo que o aluno precisa:

```
┌─────────────────────────────────────────────┐
│ ← Voltar   💬 Debate [12]   🔥7  ⭐850  👤 │
│            (destaque central)                │
└─────────────────────────────────────────────┘
```

Layout da barra:
- **Esquerda**: botão voltar (← aparece só em sub-telas, some no dashboard)
- **Centro**: botão Debate com badge online (destaque visual, gradient verde)
- **Direita**: streak (🔥), XP (⭐), avatar do user (mini)
- **Altura total**: máximo 52px + safe-area-inset-top (NÃO MAIS)

### IMPLEMENTAÇÃO HTML

Substituir TODO o conteúdo do `#mobileHeader` no app.html por:

```html
<header id="mobileHeader" class="mobile-header">
  <!-- Esquerda: voltar -->
  <div class="mh-left">
    <button id="mhBack" class="mh-btn mh-back" onclick="history.back()" style="display:none">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <span id="mhTitle" class="mh-title"></span>
  </div>

  <!-- Centro: debate (destaque) -->
  <button id="debateTopBtn" class="debate-btn-top has-activity" onclick="goDebate()">
    <span class="debate-icon">💬</span>
    <span class="debate-label">Debate</span>
    <span class="live-dot"></span>
    <span class="online-count" id="debateOnlineCount">0</span>
  </button>

  <!-- Direita: stats + avatar -->
  <div class="mh-right">
    <span class="mh-streak" id="mhStreak" title="Streak">🔥 <span id="mhStreakVal">0</span></span>
    <span class="mh-xp" id="mhXP" title="XP">⭐ <span id="mhXPVal">0</span></span>
    <button id="mhAvatar" class="mh-avatar-btn" onclick="typeof goProfile==='function'?goProfile():null">
      <span id="mhAvatarEmoji">🧑‍🎓</span>
    </button>
    <button id="mhUpdateBtn" class="mh-btn mh-update" style="display:none" onclick="applyUpdate()" title="Atualizar app">🔄</button>
  </div>
</header>
```

### REMOVER ELEMENTOS DUPLICADOS

1. Procurar `#debateTopBtnDesktop` (~linha 774) — REMOVER ou esconder com CSS no mobile
2. Procurar qualquer outro `<header>`, `<nav>`, ou `<div>` fixo no topo que NÃO seja `#mobileHeader` — REMOVER se for duplicata
3. Se existir um `#topBar` ou `.top-bar` separado do `#mobileHeader` — unificar no `#mobileHeader`
4. Verificar se app.js cria headers dinamicamente (createElement) — se sim, garantir que não duplica

### CSS — UMA BARRA SÓ

Substituir TODOS os estilos do mobile header. Remover safe-area-inset-top do body. Aplicar UMA VEZ no header:

```css
/* ===== RESET: Remover safe-area duplicada do body ===== */
/* ENCONTRAR E REMOVER qualquer padding-top com safe-area no body */
/* body NÃO deve ter padding-top com env(safe-area-inset-top) */
/* Apenas manter padding lateral e bottom se necessário */

/* ===== MOBILE HEADER — Barra Única ===== */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 250;
  background: var(--bg-secondary, #fff);
  border-bottom: 1px solid var(--border, #e5e7eb);

  /* Safe area aplicada UMA VEZ aqui */
  padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 8px;

  /* Layout flex: 3 zonas */
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  /* Sombra sutil */
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);

  /* Transição suave para theme change */
  transition: background 0.2s, border-color 0.2s;
}

/* Mostrar no mobile */
@media (max-width: 1024px) {
  .mobile-header { display: flex; }
}

/* Zona esquerda */
.mh-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 1;
}

.mh-back {
  background: none;
  border: none;
  color: var(--text, #1a1a1a);
  padding: 4px;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.mh-back:active { opacity: 0.6; }

.mh-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* Centro: botão debate */
.debate-btn-top {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 6px 14px;
  font-weight: 800;
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(16,185,129,0.3);
  transition: all 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.debate-btn-top:active { transform: scale(0.95); }
.debate-btn-top .debate-icon { font-size: 0.95rem; }
.debate-btn-top .debate-label { font-size: 0.78rem; }
.debate-btn-top .online-count {
  background: rgba(255,255,255,0.9);
  color: #059669;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 900;
  min-width: 18px;
  text-align: center;
}
.debate-btn-top .live-dot {
  width: 6px;
  height: 6px;
  background: #4ade80;
  border-radius: 50%;
  animation: livePulse 1.5s ease-in-out infinite;
}
.debate-btn-top.has-activity {
  animation: debatePulse 2.5s ease-in-out infinite;
}
@keyframes debatePulse {
  0%, 100% { box-shadow: 0 2px 10px rgba(16,185,129,0.3); }
  50% { box-shadow: 0 2px 18px rgba(16,185,129,0.5); }
}
@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.6); }
}

/* Zona direita */
.mh-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mh-streak, .mh-xp {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted, #6b7280);
  white-space: nowrap;
}

.mh-avatar-btn {
  background: none;
  border: 2px solid var(--border, #e5e7eb);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.mh-avatar-btn:active { opacity: 0.7; }

.mh-update {
  background: none;
  border: none;
  font-size: 1rem;
  padding: 2px;
  cursor: pointer;
  animation: spin 2s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Telas pequenas: esconder label do debate */
@media (max-width: 360px) {
  .debate-btn-top .debate-label { display: none; }
  .debate-btn-top { padding: 6px 10px; }
  .mh-streak, .mh-xp { font-size: 0.7rem; }
  .mh-title { max-width: 80px; }
}

/* Dark mode */
[data-theme="dark"] .mobile-header {
  background: var(--bg-secondary, #1f2937);
  border-bottom-color: var(--border, #374151);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
[data-theme="dark"] .debate-btn-top {
  background: linear-gradient(135deg, #059669, #047857);
}
[data-theme="dark"] .debate-btn-top .online-count {
  background: rgba(255,255,255,0.15);
  color: #6ee7b7;
}
[data-theme="dark"] .mh-avatar-btn {
  border-color: var(--border, #374151);
}
```

### CSS — MAIN CONTENT PADDING

O `#main` ou `.main` precisa de padding-top que considere APENAS a altura do header (52px) + safe-area UMA VEZ:

```css
@media (max-width: 1024px) {
  .main, #main {
    /* 52px do header + safe-area UMA VEZ */
    padding-top: calc(52px + env(safe-area-inset-top, 0px)) !important;
    /* 64px da bottom nav + safe-area bottom */
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
```

### CSS — BODY SEM SAFE-AREA DUPLICADA

Encontrar no app.css qualquer regra no `body` que tenha `padding` ou `padding-top` com `env(safe-area-inset-top)`. REMOVER essa parte. O safe-area-inset-top deve ser aplicado SOMENTE:
- No `.mobile-header` (padding-top)
- No `.main` (padding-top, para compensar o header fixo)

NÃO no body, NÃO em headers JS criados dinamicamente.

O safe-area-inset-bottom deve ser aplicado SOMENTE:
- No `.bottom-nav` (padding-bottom)
- No `.main` (padding-bottom, para compensar o nav fixo)

### JS — updateMobileHeader()

Procurar a função `updateMobileHeader()` no app.js (~linha 3956). Verificar que ela atualiza os novos IDs:

```javascript
function updateMobileHeader(title, showBack) {
  var mhTitle = document.getElementById('mhTitle');
  var mhBack = document.getElementById('mhBack');
  var mhStreakVal = document.getElementById('mhStreakVal');
  var mhXPVal = document.getElementById('mhXPVal');
  var mhAvatarEmoji = document.getElementById('mhAvatarEmoji');

  if (mhTitle) mhTitle.textContent = title || '';
  if (mhBack) mhBack.style.display = showBack ? 'flex' : 'none';
  if (mhStreakVal && typeof S !== 'undefined') mhStreakVal.textContent = S.streak || 0;
  if (mhXPVal && typeof totalXP === 'function') mhXPVal.textContent = totalXP();
  else if (mhXPVal && typeof S !== 'undefined') mhXPVal.textContent = S.xp || 0;
  if (mhAvatarEmoji && typeof S !== 'undefined') mhAvatarEmoji.textContent = S.avatar || '🧑‍🎓';
}
```

Se a função não existir, criar. Se existir com IDs diferentes, adaptar para os novos IDs.

Garantir que `updateMobileHeader()` é chamada em:
- `goDash()` → updateMobileHeader('', false)
- `goMod(i)` → updateMobileHeader('Módulo X', true)
- `openL()` → updateMobileHeader('Aula X', true)
- `goDebate()` → updateMobileHeader('Debate', true)
- `goRoom()` → updateMobileHeader(room.name, true)
- `goPerf()` → updateMobileHeader('Desempenho', true)
- `goBadges()` → updateMobileHeader('Conquistas', true)
- `goGlossary()` → updateMobileHeader('Glossário', true)
- `goFlashcards()` → updateMobileHeader('Flashcards', true)
- `goStudyPlan()` → updateMobileHeader('Plano de Estudo', true)
- `goGame()` → updateMobileHeader('Jogo', true)

### JS — REMOVER HEADERS DUPLICADOS

Procurar no app.js por:
- `document.createElement('header')`
- `document.createElement('nav')` (que cria nav no topo)
- `innerHTML` que contenha `mobile-header` ou `top-bar`
- Qualquer código que duplique o header

Se encontrar, REMOVER. O header é UNO, definido no HTML.

### DESKTOP: BOTÃO DEBATE NO SIDEBAR

No desktop (>1024px) o `#mobileHeader` some. O debate precisa estar acessível no sidebar:

- Verificar que "💬 Debate" existe como item do sidebar
- Se não existir, adicionar na seção de ferramentas do sidebar
- O `#debateTopBtnDesktop` pode virar um item normal do sidebar (não precisa ser botão flutuante)

### BOTTOM NAV — VERIFICAR QUE NÃO TEM DEBATE DUPLICADO

O debate está no top bar. NÃO deve estar na bottom nav também (poluiria). Verificar que a bottom nav tem apenas:
1. Início (casa)
2. Módulos (livro)
3. Praticar / Quiz (central, destaque)
4. Ranking (troféu)
5. Perfil/Menu (...)

Se o debate estiver na bottom nav, REMOVER de lá (ele vive no topo).

### VERIFICAÇÃO FINAL

Após todas as mudanças, verificar que:

```
320px (iPhone SE):
- [ ] UMA barra no topo (não duas)
- [ ] Debate btn visível (ícone + count, sem label)
- [ ] XP e streak visíveis
- [ ] Avatar visível
- [ ] Sem sobreposição com conteúdo

375px (iPhone 14):
- [ ] UMA barra no topo
- [ ] Label "DEBATE" visível
- [ ] Tudo legível

390px (iPhone 14 Pro com notch):
- [ ] UMA barra no topo
- [ ] Safe area do notch respeitada (conteúdo não vai atrás do notch)
- [ ] Sem espaço extra / barra fantasma

414px (iPhone 14 Plus):
- [ ] UMA barra no topo
- [ ] Tudo OK

768px (iPad):
- [ ] Header unificado ou transição para sidebar

1024px+ (Desktop):
- [ ] Mobile header SOME
- [ ] Sidebar com link Debate funciona
```

### REGRAS

- NUNCA quebrar OFFLINE_MODE
- Dark/light theme respeitado
- Zero npm dependencies
- Safe area iOS: aplicada UMA VEZ no header, UMA VEZ no bottom nav, UMA VEZ no padding do main
- Incrementar SW_VERSION no sw.js
- Não alterar fluxo de pagamento
- Não remover funcionalidades (apenas reorganizar)

### COMMIT E DEPLOY

```bash
git add app.html app.css app.js sw.js
git commit -m "fix: unify mobile top bar — single header with debate, stats, avatar. Remove duplicate safe-area"
git push origin main
```

### ANOTAR NO CLAUDE.md

Na seção Bugs Conhecidos, adicionar:
```
13. **Barra dupla mobile corrigida** — Unificado em um header único: ← Voltar | 💬 Debate [N] | 🔥streak ⭐xp 👤avatar. Safe-area-inset aplicada uma vez só (no header e no bottom nav). Desktop usa sidebar.
```
