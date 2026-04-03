Tarefa: Corrigir TODOS os problemas de navegação do app quando acessado via browser no Windows (Chrome, Edge, Firefox) e macOS (Safari, Chrome). Testar cada botão, cada transição, cada view. Se encontrar erro, corrigir IMEDIATAMENTE. Leia app.js, app.html, app.css INTEIROS antes de alterar. Execute sem perguntar. Commit e deploy ao final.

CONTEXTO: O app é PWA mas também é acessado diretamente pelo browser no desktop. No desktop (>1024px), o mobile header some e aparece o sidebar. A navegação precisa funcionar 100% em ambos os cenários.

---

### FASE 1 — DIAGNÓSTICO DESKTOP

Abrir app.html no browser desktop (largura > 1024px). Verificar CADA item:

```
LAYOUT BÁSICO:
- [ ] Sidebar aparece à esquerda
- [ ] Conteúdo principal (#main) aparece à direita
- [ ] Mobile header (#mobileHeader) está ESCONDIDO
- [ ] Bottom nav (#bottomNav) está ESCONDIDO
- [ ] Nenhuma barra duplicada visível
- [ ] Zero erros no console

Se sidebar NÃO aparece: verificar CSS @media(min-width:1024px), verificar display do sidebar
Se mobile header aparece no desktop: verificar @media(max-width:1024px) { .mobile-header { display:flex } }
Se bottom nav aparece no desktop: verificar @media(max-width:1024px) { .bottom-nav { display:flex } }
```

---

### FASE 2 — SIDEBAR: TESTAR CADA LINK

Clicar em CADA item do sidebar, um por um. Para cada um:

```
ITEM → FUNÇÃO → VERIFICAR

Dashboard/Início → goDash()
  → [ ] Grid de módulos renderiza no #main
  → [ ] XP e stats visíveis
  → [ ] Zero erros

Módulos → (verificar qual função)
  → [ ] Lista de módulos renderiza
  → [ ] Zero erros

Debate → goDebate()
  → [ ] Lista de 15 salas renderiza
  → [ ] Contagem online visível
  → [ ] Zero erros

Desempenho → goPerf()
  → [ ] Tela de performance renderiza
  → [ ] Zero erros

Conquistas → goBadges()
  → [ ] Badges renderizam
  → [ ] Zero erros

Glossário → goGlossary()
  → [ ] Lista de termos renderiza
  → [ ] Zero erros

Flashcards → goFlashcards()
  → [ ] Flashcards renderizam
  → [ ] Zero erros

Plano de Estudo → goStudyPlan()
  → [ ] Plano renderiza
  → [ ] Zero erros

Jogo → goGame()
  → [ ] Jogo renderiza
  → [ ] Zero erros

Timeline → goTimeline()
  → [ ] Timeline renderiza
  → [ ] Zero erros

Perfil → (verificar qual função)
  → [ ] Perfil/modal renderiza
  → [ ] Zero erros

Tema Dark/Light → toggleTheme()
  → [ ] Tema muda visualmente
  → [ ] Zero erros
```

Se QUALQUER link não funciona:
1. Verificar o onclick/event no HTML do sidebar
2. Verificar que a função existe no escopo global do app.js
3. Se a função não existe, verificar se foi removida acidentalmente — restaurar
4. Corrigir e testar novamente

---

### FASE 3 — DEBATE NO DESKTOP

```
3.1 Clicar "Debate" no sidebar → goDebate()
  → [ ] 15 salas aparecem em grid 3 colunas
  → [ ] Cada sala clicável
  → [ ] Back link "← Início" aparece no topo do conteúdo
  → [ ] Zero erros

3.2 Clicar numa sala → goRoom('economia')
  → [ ] Chat abre no #main (NÃO em modal, NÃO em nova página)
  → [ ] Back link "← Salas" aparece no topo
  → [ ] Mensagens visíveis
  → [ ] Input de texto (se logado) ou login prompt (se não)
  → [ ] Sidebar continua visível e funcional
  → [ ] Zero erros

3.3 Clicar "← Salas" → goDebate()
  → [ ] Volta para lista de salas
  → [ ] Zero erros

3.4 Clicar "← Início" ou "Dashboard" no sidebar → goDash()
  → [ ] Volta para dashboard
  → [ ] Zero erros

3.5 DENTRO do chat, clicar "Módulos" no sidebar
  → [ ] Sai do debate e mostra módulos
  → [ ] Sem trava, sem tela branca
  → [ ] Zero erros
```

---

### FASE 4 — MÓDULOS E AULAS NO DESKTOP

```
4.1 Clicar num módulo → goMod(0)
  → [ ] Lista de aulas aparece no #main
  → [ ] Sidebar continua visível
  → [ ] Zero erros

4.2 Clicar numa aula → openL(0, 0)
  → [ ] Conteúdo da aula renderiza
  → [ ] Quiz funciona
  → [ ] Sidebar continua visível
  → [ ] Zero erros

4.3 Próxima aula (nextL)
  → [ ] Funciona com botão na tela
  → [ ] Funciona com seta → do teclado (se implementado)
  → [ ] Zero erros

4.4 Voltar para módulo
  → [ ] Click no back link ou breadcrumb
  → [ ] Lista de aulas reaparece
  → [ ] Zero erros

4.5 Voltar para dashboard
  → [ ] Click em "Dashboard" no sidebar
  → [ ] Grid de módulos reaparece
  → [ ] Zero erros
```

---

### FASE 5 — TECLADO (WINDOWS E MACOS)

Testar atalhos de teclado e navegação por keyboard:

```
- [ ] Tab navega entre elementos interativos (botões, links, inputs)
- [ ] Enter ativa botões e links (foco visível)
- [ ] Escape fecha modais (se existirem)
- [ ] Setas ← → navegam entre aulas (se implementado)
- [ ] Ctrl+F / Cmd+F (buscar) funciona no browser sem conflito
- [ ] F5 / Cmd+R (recarregar) não quebra o app
- [ ] Backspace NÃO navega para trás no browser (pode causar perda de dados)
- [ ] Input de debate: Enter envia mensagem
- [ ] Input de debate: Shift+Enter NÃO envia (se textarea multilinha)
```

---

### FASE 6 — BROWSER BACK/FORWARD (HISTORY API)

Testar o botão voltar e avançar do browser:

```
6.1 Dashboard → Debate → Sala → Botão VOLTAR do browser
  → [ ] Volta para lista de salas (não para dashboard direto)
  → [ ] Zero erros

6.2 Outro voltar do browser
  → [ ] Volta para dashboard
  → [ ] Zero erros

6.3 Botão AVANÇAR do browser
  → [ ] Avança para onde estava
  → [ ] Zero erros

6.4 Dashboard → Módulo → Aula → Voltar → Voltar → Voltar
  → [ ] Cada voltar retorna uma tela
  → [ ] Não fica em loop infinito
  → [ ] Não sai do app (não vai para google.com ou tab anterior)
```

Se history back não funciona:
- Verificar que goDebate(), goRoom(), goMod(), openL() fazem `history.pushState()`
- Verificar que existe handler `window.addEventListener('popstate', ...)`
- Se não existe, adicionar:

```javascript
window.addEventListener('popstate', function(e) {
  if (!e.state) { goDash(); return; }
  var v = e.state.view;
  if (v === 'dash') goDash();
  else if (v === 'debate') goDebate();
  else if (v === 'room' && e.state.roomId) goRoom(e.state.roomId);
  else if (v === 'mod' && typeof e.state.modIdx !== 'undefined') goMod(e.state.modIdx);
  else if (v === 'lesson' && typeof e.state.modIdx !== 'undefined') openL(e.state.modIdx, e.state.lessonIdx);
  else if (v === 'perf') goPerf();
  else if (v === 'badges') goBadges();
  else if (v === 'glossary') goGlossary();
  else if (v === 'flashcards') goFlashcards();
  else if (v === 'studyplan') goStudyPlan();
  else if (v === 'game') goGame();
  else if (v === 'timeline') goTimeline();
  else goDash();
});
```

E cada função de navegação deve fazer pushState:

```javascript
// Dentro de goDash():
history.pushState({ view: 'dash' }, '', '#');

// Dentro de goDebate():
history.pushState({ view: 'debate' }, '', '#debate');

// Dentro de goRoom(roomId):
history.pushState({ view: 'room', roomId: roomId }, '', '#room-' + roomId);

// Dentro de goMod(i):
history.pushState({ view: 'mod', modIdx: i }, '', '#mod-' + i);

// Dentro de openL(mi, li):
history.pushState({ view: 'lesson', modIdx: mi, lessonIdx: li }, '', '#lesson-' + mi + '-' + li);

// Dentro de goPerf():
history.pushState({ view: 'perf' }, '', '#perf');

// Dentro de goBadges():
history.pushState({ view: 'badges' }, '', '#badges');

// goGlossary, goFlashcards, goStudyPlan, goGame, goTimeline → mesmo padrão
```

IMPORTANTE: Se já existe pushState ou hash routing no app.js, NÃO duplicar. Integrar com o sistema existente.

---

### FASE 7 — WINDOWS: BROWSERS ESPECÍFICOS

#### Chrome Windows
```
- [ ] App carrega sem erros
- [ ] Todas as navegações funcionam
- [ ] Debate funciona (salas, chat, envio)
- [ ] Dark mode funciona
- [ ] Ctrl+Scroll (zoom) não quebra layout
- [ ] 100%, 125%, 150% zoom: layout OK
```

#### Edge Windows
```
- [ ] App carrega sem erros (Edge usa Chromium, deve funcionar igual Chrome)
- [ ] Verificar que nenhum polyfill está faltando
- [ ] Todas as navegações funcionam
```

#### Firefox Windows
```
- [ ] App carrega sem erros
- [ ] CSS variables funcionam (Firefox suporta)
- [ ] Flexbox/Grid renderiza corretamente
- [ ] Safe-area-inset: Firefox desktop ignora (OK, não tem notch)
- [ ] Debate funciona
- [ ] Web Speech API (🎤): Firefox pode não suportar — toast informativo se não
```

---

### FASE 8 — MACOS: BROWSERS ESPECÍFICOS

#### Safari macOS
```
- [ ] App carrega sem erros
- [ ] Service Worker registra (Safari 11.1+)
- [ ] CSS backdrop-filter funciona (-webkit-backdrop-filter)
- [ ] Scroll smooth funciona
- [ ] Todas as navegações funcionam
- [ ] Debate funciona
- [ ] Input de debate: teclado funciona normalmente
- [ ] Dark mode: prefers-color-scheme detecta
- [ ] Pinch-to-zoom não quebra layout
- [ ] Cmd+Left Arrow NÃO conflita com navegação do app
```

#### Chrome macOS
```
- [ ] Mesmo que Chrome Windows — tudo OK
- [ ] Retina display: ícones e textos nítidos
- [ ] Trackpad swipe (2 dedos) funciona para history back/forward
```

---

### FASE 9 — RESPONSIVIDADE DESKTOP

Redimensionar a janela do browser e testar transições:

```
1200px+ (desktop full)
  → [ ] Sidebar visível, bottom nav escondido, layout 2 colunas
  → [ ] Grid de salas: 3 colunas
  → [ ] Grid de módulos: 3-4 colunas

1024px (breakpoint)
  → [ ] Transição suave entre mobile e desktop
  → [ ] Sem sobreposição de sidebar com bottom nav
  → [ ] Sem flash de layout

800px (tablet horizontal)
  → [ ] Sidebar some, mobile header aparece, bottom nav aparece
  → [ ] Grid de salas: 2 colunas
  → [ ] Tudo clicável e funcional

600px (tablet vertical)
  → [ ] Layout mobile completo
  → [ ] Tudo OK

Redimensionar DE VOLTA para 1200px+
  → [ ] Sidebar reaparece
  → [ ] Bottom nav some
  → [ ] Conteúdo não ficou bugado
  → [ ] Zero erros no console
```

---

### FASE 10 — SCROLL E OVERFLOW

```
- [ ] Nenhum scroll horizontal em nenhuma tela (overflow-x hidden onde necessário)
- [ ] Scroll vertical suave em listas longas (módulos, salas, mensagens)
- [ ] Debate chat: scroll funciona com mousewheel e trackpad
- [ ] Debate chat: auto-scroll ao receber/enviar mensagem
- [ ] Listas de módulos: scroll não fica preso
- [ ] Em dark mode: scrollbar estilizada ou neutra (não branca em fundo escuro)
```

Se houver scroll horizontal indesejado:
```css
html, body { overflow-x: hidden; }
.main, #main { overflow-x: hidden; }
```

---

### FASE 11 — SIDEBAR ATIVO STATE

O item ativo no sidebar deve ter visual diferente (fundo, cor, indicador):

```
- [ ] Ao clicar "Dashboard": item Dashboard fica destacado
- [ ] Ao clicar "Debate": item Debate fica destacado
- [ ] Ao clicar "Módulos": item Módulos fica destacado
- [ ] Ao navegar para sub-tela (aula), o módulo pai continua destacado
- [ ] Ao navegar para sala de debate, "Debate" continua destacado
```

Se não existe active state no sidebar, adicionar:

```javascript
function updateSidebarActive(viewName) {
  var items = document.querySelectorAll('.sidebar-nav-item, .sidebar-link, [data-nav]');
  items.forEach(function(item) {
    item.classList.remove('active');
    if (item.getAttribute('data-nav') === viewName || item.textContent.toLowerCase().indexOf(viewName) !== -1) {
      item.classList.add('active');
    }
  });
}
```

Chamar dentro de cada função de navegação:
```javascript
// goDash() → updateSidebarActive('inicio')
// goDebate() → updateSidebarActive('debate')
// goMod() → updateSidebarActive('modulos')
// goPerf() → updateSidebarActive('desempenho')
// goBadges() → updateSidebarActive('conquistas')
// etc.
```

CSS:
```css
.sidebar-nav-item.active, .sidebar-link.active, [data-nav].active {
  background: var(--active-bg, rgba(16,185,129,0.1));
  color: var(--active-color, #10b981);
  font-weight: 700;
  border-right: 3px solid var(--active-color, #10b981);
}
```

---

### FASE 12 — LINK DIRETO POR URL

Testar acesso direto por URL (bookmark, compartilhamento):

```
app.html#debate     → [ ] Abre lista de salas
app.html#room-economia → [ ] Abre chat da sala economia
app.html#mod-0      → [ ] Abre módulo 0
app.html#perf       → [ ] Abre desempenho
app.html#badges     → [ ] Abre conquistas
app.html            → [ ] Abre dashboard
```

Se deep linking não funciona, adicionar no boot do app.js:

```javascript
function handleInitialHash() {
  var hash = window.location.hash.replace('#', '');
  if (!hash) return; // dashboard padrão

  if (hash === 'debate') return goDebate();
  if (hash.indexOf('room-') === 0) return goRoom(hash.replace('room-', ''));
  if (hash.indexOf('mod-') === 0) return goMod(parseInt(hash.replace('mod-', '')));
  if (hash === 'perf') return goPerf();
  if (hash === 'badges') return goBadges();
  if (hash === 'glossary') return goGlossary();
  if (hash === 'flashcards') return goFlashcards();
  if (hash === 'studyplan') return goStudyPlan();
  if (hash === 'game') return goGame();
  if (hash === 'timeline') return goTimeline();
}

// Chamar após loadLessons() e ui() no boot sequence
handleInitialHash();
```

---

### REGRAS

- NUNCA quebrar OFFLINE_MODE
- NUNCA quebrar mobile (testar que mobile continua OK após mudanças desktop)
- Sidebar é APENAS para desktop (>1024px)
- Mobile header + bottom nav é APENAS para mobile (<=1024px)
- Dark/light theme em todas as telas
- History API: pushState em cada navegação, popstate handler completo
- Zero npm dependencies
- Incrementar SW_VERSION se alterar assets cacheados

### COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js
git commit -m "fix: desktop navigation — sidebar links, history API, browser back/forward, deep linking, cross-browser compatibility"
git push origin main
```
