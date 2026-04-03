# Prompt: Corrigir Sidebar Desktop + Navegação Web (Windows/macOS)

## Problema Principal
A barra lateral (sidebar) no desktop NÃO rola. Quando o conteúdo excede a viewport, o usuário não consegue acessar itens abaixo da dobra. Além disso, há problemas de navegação em browsers desktop (Chrome, Edge, Firefox, Safari).

---

## FASE 1 — CORRIGIR SCROLL DA SIDEBAR (CAUSA RAIZ CRÍTICA)

### 1.1 — Adicionar constraint de altura na sidebar desktop

O problema: `.side` tem `overflow-y:auto` mas **sem limite de altura** no desktop. O container se expande infinitamente com o conteúdo, então o scroll nunca ativa.

Em `app.css`, localizar a regra `.side` (linha ~101):

```css
/* ATUAL: */
.side{background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:1.25rem;overflow-y:auto}
```

**SUBSTITUIR por:**

```css
.side{background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:1.25rem;overflow-y:auto;overflow-x:hidden;height:100vh;height:100dvh;position:sticky;top:0;scrollbar-width:thin;scrollbar-color:var(--scrollbar-thumb) transparent}
```

**O que mudou:**
- `height:100vh` + `height:100dvh` → limita a sidebar à altura da viewport (dvh é fallback moderno para mobile bars)
- `position:sticky;top:0` → sidebar fica fixa enquanto `.main` rola independente
- `scrollbar-width:thin` → scrollbar discreta no Firefox
- `scrollbar-color` → usa a variável de tema existente
- `overflow-x:hidden` → previne scroll horizontal

### 1.2 — Estilizar scrollbar da sidebar (WebKit: Chrome, Edge, Safari)

Adicionar APÓS a regra `.side`:

```css
.side::-webkit-scrollbar{width:6px}
.side::-webkit-scrollbar-track{background:transparent}
.side::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:3px}
.side::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.15)}
[data-theme="light"] .side::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.2)}
```

### 1.3 — Corrigir `.shell` grid para sidebar sticky

A regra `.shell` (linha ~81) precisa permitir que `.side` seja sticky:

```css
/* ATUAL: */
.shell{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh;min-height:100dvh}
```

**SUBSTITUIR por:**

```css
.shell{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh;min-height:100dvh;align-items:start}
```

**O que mudou:**
- `align-items:start` → permite que `.side` tenha `position:sticky` funcional (sem stretch, o default de grid que impede sticky)

### 1.4 — Corrigir `.main` para scroll independente

Verificar a regra `.main` (linha ~156):

```css
/* DEVE ter: */
.main{padding:calc(2rem + 28px) 2rem 2rem;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;max-height:100vh;max-height:100dvh;box-sizing:border-box}
```

**Se `max-height:100vh` não existir, adicionar.** Isso garante que `.main` e `.side` rolam independentemente.

---

## FASE 2 — CORRIGIR SIDEBAR NO MOBILE

### 2.1 — Mobile sidebar: remover `inset:0`, usar coordenadas explícitas

Localizar a media query mobile da sidebar (app.css, dentro de `@media(max-width:900px)`):

```css
/* ATUAL (possivelmente): */
.side{transform:translateX(-100%);transition:transform .3s var(--ease);position:fixed;z-index:200;inset:0;width:300px;box-shadow:none}
```

**SUBSTITUIR por:**

```css
.side{transform:translateX(-100%);transition:transform .3s var(--ease);position:fixed;z-index:200;top:0;left:0;bottom:0;width:300px;height:100vh;height:100dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;box-shadow:none}
```

**O que mudou:**
- `inset:0` removido → conflitava com `width:300px`
- `top:0;left:0;bottom:0` → posicionamento explícito (mais compatível)
- `height:100vh` + `100dvh` → garante altura total
- `-webkit-overflow-scrolling:touch` → scroll suave no iOS

### 2.2 — Sidebar aberta no mobile: padding correto

```css
.side.open{transform:translateX(0);box-shadow:8px 0 24px rgba(0,0,0,.3)}
```

Confirmar que `padding-top` no `.side.open` do mobile respeita o header:
```css
.side.open{padding-top:calc(var(--mobile-header-h,56px) + env(safe-area-inset-top))}
```

---

## FASE 3 — CORRIGIR ACCORDIONS DA SIDEBAR (max-height)

### 3.1 — Disciplinas: accordion com max-height realista

Localizar em `app.css`:

```css
/* ATUAL: */
.disc-group-body{max-height:0;overflow:hidden;transition:max-height .3s ease}
.disc-group.open .disc-group-body{max-height:600px}
```

**SUBSTITUIR por:**

```css
.disc-group-body{max-height:0;overflow:hidden;transition:max-height .35s ease}
.disc-group.open .disc-group-body{max-height:2000px}
```

**Por quê:** 600px pode truncar disciplinas com muitos módulos. O valor 2000px é seguro porque o scroll da sidebar limita o que aparece.

### 3.2 — Tool/Config sections: mesma correção

```css
/* ATUAL: */
.side-section:not(.collapsed){max-height:600px}
```

**SUBSTITUIR por:**

```css
.side-section:not(.collapsed){max-height:2000px}
```

---

## FASE 4 — NAVEGAÇÃO DESKTOP: HISTORY API E DEEP LINKING

### 4.1 — Garantir pushState em TODAS as views

Em `app.js`, verificar que CADA função de navegação tem `history.pushState`:

```javascript
// Dashboard
function goDash() {
  // ... código existente ...
  try{history.pushState({view:'dash'},'')}catch(e){}
  setNav('nDash');
}

// Módulo
function goMod(i) {
  // ... código existente ...
  try{history.pushState({view:'mod',mod:i},'')}catch(e){}
  setNav('nM'+i);
}

// Aula
function openL(mi,li) {
  // ... código existente ...
  try{history.pushState({view:'lesson',mod:mi,les:li},'')}catch(e){}
}

// Glossário
function goGlossary() {
  // ... código existente ...
  try{history.pushState({view:'glossary'},'')}catch(e){}
}

// Flashcards
function goFlashcards() {
  // ... código existente ...
  try{history.pushState({view:'flashcards'},'')}catch(e){}
}

// Performance
function goPerf() {
  // ... código existente ...
  try{history.pushState({view:'perf'},'')}catch(e){}
}

// Badges
function goBadges() {
  // ... código existente ...
  try{history.pushState({view:'badges'},'')}catch(e){}
}

// Study Plan
function goStudyPlan() {
  // ... código existente ...
  try{history.pushState({view:'studyplan'},'')}catch(e){}
}

// Game
function goGame() {
  // ... código existente ...
  try{history.pushState({view:'game'},'')}catch(e){}
}

// Debate
function goDebate() {
  // ... código existente ...
  try{history.pushState({view:'debate'},'')}catch(e){}
}

// Debate Room
function goRoom(roomId) {
  // ... código existente ...
  try{history.pushState({view:'debateroom',room:roomId},'')}catch(e){}
}
```

### 4.2 — Atualizar popstate handler para cobrir TODAS as views

Localizar o `window.addEventListener('popstate', ...)` em app.js e **substituir** por:

```javascript
window.addEventListener('popstate', function(e) {
  const s = e.state;
  if (!s || !s.view) { goDash(); return; }

  switch(s.view) {
    case 'dash':       goDash(); break;
    case 'mod':        if(M[s.mod]) goMod(s.mod); else goDash(); break;
    case 'lesson':     if(M[s.mod] && M[s.mod].lessons && M[s.mod].lessons[s.les]) openL(s.mod,s.les); else goDash(); break;
    case 'glossary':   if(typeof goGlossary==='function') goGlossary(); else goDash(); break;
    case 'flashcards': if(typeof goFlashcards==='function') goFlashcards(); else goDash(); break;
    case 'perf':       if(typeof goPerf==='function') goPerf(); else goDash(); break;
    case 'badges':     if(typeof goBadges==='function') goBadges(); else goDash(); break;
    case 'studyplan':  if(typeof goStudyPlan==='function') goStudyPlan(); else goDash(); break;
    case 'game':       if(typeof goGame==='function') goGame(); else goDash(); break;
    case 'debate':     if(typeof goDebate==='function') goDebate(); else goDash(); break;
    case 'debateroom': if(typeof goRoom==='function' && s.room) goRoom(s.room); else goDash(); break;
    default:           goDash();
  }
});
```

---

## FASE 5 — ACTIVE STATE DA SIDEBAR

### 5.1 — Garantir highlight correto ao navegar

A função `setNav(id)` já existe. Verificar que CADA view atualiza o active state:

```javascript
// Em goDash(): setNav('nDash')         ✓ já implementado
// Em goMod(i): setNav('nM'+i)          ✓ já implementado
// Em goGlossary(): setNav('nGloss')    → VERIFICAR
// Em goFlashcards(): setNav('nFlash')   → VERIFICAR
// Em goPerf(): setNav('nPerf')          → VERIFICAR
// Em goBadges(): setNav('nBadges')      → VERIFICAR
// Em goStudyPlan(): setNav('nStudy')    → VERIFICAR
// Em goGame(): setNav('nGame')          → VERIFICAR
// Em goDebate(): setNav('nDebate')      → VERIFICAR
```

Para cada view que NÃO chama `setNav()`, adicionar a chamada com o ID correto do `<a>` ou `<button>` correspondente na sidebar.

### 5.2 — Scroll sidebar para item ativo

Quando o usuário navega para um módulo profundo na lista, a sidebar deve auto-scrollar para mostrar o item ativo:

```javascript
// Adicionar no final de setNav():
function setNav(id) {
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const e = document.getElementById(id);
  if (e) {
    e.classList.add('active');
    // Auto-scroll sidebar para item ativo (desktop only)
    if (window.innerWidth > 900) {
      e.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
```

---

## FASE 6 — ACESSIBILIDADE: NAVEGAÇÃO POR TECLADO NA SIDEBAR

### 6.1 — Accordion de disciplinas: suporte a Enter/Space

Localizar onde o accordion de disciplina é renderizado (provavelmente em `buildSidebar()` ou `toggleDiscGroup()`). Os headers de grupo devem ter:

```javascript
// No HTML gerado para cada disc-group header:
// Adicionar role="button" tabindex="0" aria-expanded="false/true"

// E no JS, adicionar event listener:
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    const el = document.activeElement;
    if (el && el.classList.contains('disc-group-header')) {
      e.preventDefault();
      el.click(); // Dispara o toggle existente
    }
    if (el && el.classList.contains('side-section-toggle')) {
      e.preventDefault();
      el.click();
    }
  }
});
```

### 6.2 — Tab order lógico na sidebar

Verificar que todos os itens navegáveis da sidebar têm `tabindex="0"` ou são naturalmente focáveis (`<a>`, `<button>`).

---

## FASE 7 — CROSS-BROWSER: WINDOWS (Chrome, Edge, Firefox)

### 7.1 — Testar no Chrome Windows
- [ ] Sidebar rola com mousewheel
- [ ] Sidebar rola com drag na scrollbar
- [ ] Click nos itens navega corretamente
- [ ] Back/Forward do browser funciona
- [ ] Ctrl+Click abre em nova aba (links devem ser `<a href>`)

### 7.2 — Testar no Edge Windows
- Mesmos testes do Chrome (engine Chromium)
- [ ] Verificar smooth scrolling (Edge tem implementação própria)

### 7.3 — Testar no Firefox Windows
- [ ] `scrollbar-width:thin` funciona (propriedade Firefox-nativa)
- [ ] Accordion transitions suaves
- [ ] Focus ring visível nos itens da sidebar (`:focus-visible`)
- [ ] `overflow-y:auto` funciona com `position:sticky`

---

## FASE 8 — CROSS-BROWSER: macOS (Safari, Chrome)

### 8.1 — Testar no Safari macOS
- [ ] `position:sticky` funciona (Safari tem bugs conhecidos com sticky em grid)
- [ ] Se sticky falhar, fallback para `position:fixed`:

```css
/* Fallback Safari se sticky não funcionar em grid: */
@supports not (position:sticky) {
  .side{position:fixed;top:0;left:0;width:var(--sidebar-w);height:100vh}
  .shell{grid-template-columns:var(--sidebar-w) 1fr;margin-left:0}
  .main{margin-left:0}
}
```

### 8.2 — dvh units no Safari
- Safari 15.4+ suporta `dvh` (dynamic viewport height)
- Fallback `100vh` vem primeiro na regra (progressive enhancement ✓)

### 8.3 — Trackpad smooth scroll
- [ ] Sidebar responde ao scroll de dois dedos no trackpad
- [ ] Momentum scrolling funciona (`-webkit-overflow-scrolling:touch` — apenas iOS, mas não causa erro em macOS)

---

## FASE 9 — RESPONSIVIDADE NOS BREAKPOINTS

### 9.1 — Verificar transição 900px

Redimensionar a janela no breakpoint 900px e confirmar:
- **> 900px:** Sidebar visível, posição sticky, grid 2 colunas
- **≤ 900px:** Sidebar escondida (translateX(-100%)), header mobile visível, bottom nav visível
- **Sem flickering** na transição

### 9.2 — Sidebar em telas estreitas desktop (901-1024px)

A sidebar com `--sidebar-w:260px` pode comprimir muito o `.main` em telas de 901-1024px. Considerar:

```css
@media(min-width:901px) and (max-width:1024px){
  :root{--sidebar-w:220px}
  .side{padding:.75rem}
  .side .ni{font-size:.82rem;padding:.45rem .6rem}
}
```

---

## FASE 10 — OVERFLOW E SCROLL FIXES GERAIS

### 10.1 — Prevenir scroll bleed (quando sidebar e main competem)

```css
.side{overscroll-behavior:contain}
.main{overscroll-behavior-y:contain}
```

Isso impede que o scroll "vaze" de um container para outro quando chega no fim.

### 10.2 — Horizontal overflow na sidebar

Disciplinas com nomes longos podem causar overflow horizontal:

```css
.ni{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.disc-group-header span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:calc(var(--sidebar-w) - 60px)}
```

---

## FASE 11 — INCREMENTAR SW_VERSION

Em `sw.js`:

```javascript
const SW_VERSION = XX; // Incrementar +1
```

---

## FASE 12 — CHECKLIST FINAL

Após aplicar TODAS as correções:

### Sidebar Scroll
- [ ] Sidebar rola no Chrome Windows
- [ ] Sidebar rola no Firefox Windows
- [ ] Sidebar rola no Edge Windows
- [ ] Sidebar rola no Safari macOS
- [ ] Sidebar rola no Chrome macOS
- [ ] Scrollbar visível e discreta (thin)
- [ ] Scroll não "vaza" para o main
- [ ] Main e sidebar rolam independentemente

### Navegação
- [ ] Click em disciplina → abre módulos (accordion funciona)
- [ ] Click em módulo → renderiza cards no main
- [ ] Click em aula → abre aula no main
- [ ] Back browser → volta para view anterior
- [ ] Forward browser → avança para view seguinte
- [ ] Item ativo na sidebar tem highlight visual
- [ ] Sidebar auto-scrolla para item ativo quando necessário

### Responsividade
- [ ] > 900px: sidebar visible, sticky, scrollable
- [ ] ≤ 900px: sidebar hidden, mobile header + bottom nav visíveis
- [ ] Transição sem flicker no breakpoint 900px
- [ ] 901-1024px: sidebar não comprime demais o main

### Teclado (Desktop)
- [ ] Tab navega pelos itens da sidebar
- [ ] Enter/Space abre accordion de disciplina
- [ ] Focus ring visível nos itens focados
- [ ] Escape fecha sidebar aberta (mobile)

### Geral
- [ ] Dark mode: scrollbar respeita tema
- [ ] Light mode: scrollbar respeita tema
- [ ] Sem erros no console
- [ ] SW_VERSION incrementado
- [ ] Build produção funciona: `npm run build`

## Arquivos Alterados

| Arquivo | Ação |
|---------|------|
| `app.css` | Fix scroll sidebar (height, sticky, scrollbar styling, overflow, accordion max-height, mobile sidebar, breakpoints) |
| `app.js` | Fix pushState em todas views, popstate handler completo, setNav com auto-scroll, keyboard handlers |
| `sw.js` | Incrementar SW_VERSION |

## Regra de Ouro

**Desktop sidebar = `position:sticky; top:0; height:100vh; overflow-y:auto`**
**Mobile sidebar = `position:fixed; top:0; left:0; bottom:0; width:300px; overflow-y:auto; transform:translateX(-100%)`**

Sem `height` explícita, `overflow-y:auto` é inútil — o container simplesmente cresce com o conteúdo.
