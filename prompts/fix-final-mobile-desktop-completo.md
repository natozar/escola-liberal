# PROMPT FINAL ABSOLUTO: Corrigir Mobile + Desktop — Revisão Completa

## INSTRUÇÕES PARA O AGENTE

Este é um prompt de CORREÇÃO E REVISÃO COMPLETA. O objetivo é deixar o app funcionando perfeitamente no mobile (iOS/Android) e desktop (Windows/macOS). Use seus melhores agentes de layout, navegação e testes.

**REGRAS:**
1. Leia CADA arquivo antes de alterar
2. NÃO termine sem testar TUDO
3. Se encontrar QUALQUER problema adicional, corrija imediatamente
4. Faça build de produção e valide
5. Reporte CADA alteração, arquivo por arquivo

---

## ESTADO ATUAL (auditoria feita)

### O QUE JÁ ESTÁ CORRETO ✓
- `app.html` linha 269: link Disciplinas chama `goAulasTab()` ✓
- `app.html` bottom nav: 5 botões com handlers corretos ✓
- `app.js`: `goAulasTab()`, `renderDiscGrid()`, `toggleDiscMobile()` existem e estão expostos no `window` ✓
- `app.css`: CSS de `.disc-grid`, `.disc-grid-card`, `.aulas-view` existem ✓
- `app.css` linha 81: `.shell` SEM `align-items:start` ✓
- `app.css` linha 101: `.side` com `position:sticky;height:100vh;align-self:start` ✓
- `app.css` linha 1205: mobile `.main` com padding `56px` correto ✓
- `scripts/append-mobile-css.js`: bloco mobile simplificado ✓
- `hideAllViews()`: esconde `vAulas` com `display:none` ✓
- SW_VERSION = 'v63'

### O QUE PRECISA SER CORRIGIDO ✗

1. **`goAulasTab()` falta:** `setNav('nDisc')`, `history.pushState`, guards para funções mobile
2. **`popstate` handler:** NÃO tem cases para `aulas` nem `disc`
3. **`buildSidebar()`:** Ainda gera accordion completo no `#modNav` (que está `display:none`) — trabalho desperdiçado
4. **`ui()` linha ~297:** Itera `nM0`, `nM1`... que podem não existir no DOM
5. **Bola verde cortada:** Botão debate pode estar com overflow no header
6. **Build pode não ter sido executado:** O `npm run build` precisa rodar para aplicar tudo
7. **SW_VERSION:** Precisa incrementar para forçar atualização nos devices

---

## CORREÇÃO 1 — goAulasTab() com suporte desktop

Abrir `app.js`, localizar `function goAulasTab()` (linha ~4000):

```javascript
function goAulasTab(){
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  updateBottomNav('aulas');
  updateMobileHeader('Disciplinas',false);
  _mobileBackFn=null;
  renderDiscGrid();
  closeSideMobile();
}
```

**SUBSTITUIR POR:**

```javascript
function goAulasTab(){
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  // Mobile UI (com guards — no desktop essas funções podem não existir)
  if(typeof updateBottomNav==='function') try{updateBottomNav('aulas')}catch(e){}
  if(typeof updateMobileHeader==='function') try{updateMobileHeader('Disciplinas',false)}catch(e){}
  if(typeof _mobileBackFn!=='undefined') _mobileBackFn=null;
  renderDiscGrid();
  if(typeof closeSideMobile==='function') try{closeSideMobile()}catch(e){}
  // Desktop: active state na sidebar + history
  if(typeof setNav==='function') setNav('nDisc');
  try{history.pushState({view:'aulas'},'')}catch(e){}
  // Atualizar subtítulo com contagem real
  try{
    const discs=new Set();
    M.forEach(m=>discs.add(m.discipline||'economia'));
    const sub=document.getElementById('aulasSubtitle');
    if(sub) sub.textContent=discs.size+' disciplinas · '+M.length+' módulos · '+M.reduce((s,m)=>s+m.lessons.length,0)+' aulas';
  }catch(e){}
  // Scroll main to top
  try{document.querySelector('.main').scrollTop=0}catch(e){}
}
```

---

## CORREÇÃO 2 — toggleDiscMobile() com history

Localizar `function toggleDiscMobile(disc)` (linha ~4062). No FINAL da função, ANTES do `}` de fechamento, ADICIONAR:

```javascript
  // Desktop/history support
  if(typeof setNav==='function') setNav('nDisc');
  try{history.pushState({view:'disc',disc:disc},'')}catch(e){}
```

---

## CORREÇÃO 3 — popstate handler

Localizar `window.addEventListener('popstate', ...)` (linha ~4245):

```javascript
window.addEventListener('popstate',function(e){
  const s=e.state;
  if(!s||!s.view){goDash();return}
  if(s.view==='mod'&&M[s.mod])goMod(s.mod);
  else if(s.view==='lesson'&&M[s.mod]&&M[s.mod].lessons[s.les])openL(s.mod,s.les);
  else if(s.view==='leaderboard')goLeaderboard();
  else if(s.view==='studyplan')goStudyPlan();
  else goDash();
});
```

**SUBSTITUIR POR:**

```javascript
window.addEventListener('popstate',function(e){
  const s=e.state;
  if(!s||!s.view){goDash();return}
  if(s.view==='dash') goDash();
  else if(s.view==='aulas') goAulasTab();
  else if(s.view==='disc'&&s.disc) toggleDiscMobile(s.disc);
  else if(s.view==='mod'&&M[s.mod]) goMod(s.mod);
  else if(s.view==='lesson'&&M[s.mod]&&M[s.mod].lessons[s.les]) openL(s.mod,s.les);
  else if(s.view==='leaderboard'&&typeof goLeaderboard==='function') goLeaderboard();
  else if(s.view==='studyplan'&&typeof goStudyPlan==='function') goStudyPlan();
  else if(s.view==='debate'&&typeof goDebate==='function') goDebate();
  else if(s.view==='perf'&&typeof goPerf==='function') goPerf();
  else if(s.view==='badges'&&typeof goBadges==='function') goBadges();
  else if(s.view==='glossary'&&typeof goGlossary==='function') goGlossary();
  else if(s.view==='flashcards'&&typeof goFlashcards==='function') goFlashcards();
  else if(s.view==='game'&&typeof goGame==='function') goGame();
  else goDash();
});
```

---

## CORREÇÃO 4 — Simplificar buildSidebar()

O `buildSidebar()` (linha ~162) gera HTML para `#modNav` que está com `display:none`. Desperdiça CPU.

**SUBSTITUIR toda a função `buildSidebar()` + `toggleDiscGroup()` (linhas ~162-201) POR:**

```javascript
// Build sidebar — just update discipline count (accordion removed, using goAulasTab view)
function buildSidebar(){
  try{
    const discs=new Set();
    M.forEach(m=>discs.add(m.discipline||'economia'));
    const el=document.getElementById('discSubtitle');
    if(el) el.textContent=discs.size+' disciplinas · '+M.length+' módulos';
  }catch(e){}
}
function toggleDiscGroup(){}  // stub — no longer used
```

---

## CORREÇÃO 5 — Limpar ui() de referências mortas

Na função `ui()` (linha ~297), localizar o bloco que itera módulos na sidebar:

```javascript
  // Sidebar module progress
  M.forEach((m,mi)=>{
    const el=_origById('nM'+mi);
    if(!el)return;
```

Os elementos `nM0`, `nM1`... existem no `#modNav` que está `display:none`. O Proxy Safe DOM evita crash, mas é trabalho desnecessário.

**OPÇÃO A (recomendada):** Adicionar early-return:

```javascript
  // Sidebar module progress (skip if modNav hidden)
  const _modNav=_origById('modNav');
  if(_modNav && _modNav.style.display!=='none'){
    M.forEach((m,mi)=>{
      const el=_origById('nM'+mi);
      if(!el||el.__isNull)return;
```

**OPÇÃO B:** Se causar problemas, simplesmente comentar o bloco.

---

## CORREÇÃO 6 — Bola verde cortada (debate button)

### 6A — Verificar o `.mobile-header` tem `overflow:visible`

Em `app.css` (linha ~1013), o mobile header deve ter:

```css
.mobile-header{...overflow:visible;align-items:center;justify-content:space-between}
```

**VERIFICAR:** Se a auditoria mostra que já tem `overflow:visible` e `align-items:center`, OK. Se não, adicionar.

### 6B — Reduzir botão debate em telas pequenas

Verificar se já existe em `app.css`:

```css
@media(max-width:400px){
  .debate-btn-top{padding:5px 10px;font-size:.72rem;gap:4px}
}
```

Se não existir, ADICIONAR após as regras `.debate-btn-top` (linha ~1076).

### 6C — Desktop: version bar overflow

Verificar `.app-version-bar` e `.avb-right` — adicionar `overflow:visible` se não existir:

```css
.app-version-bar{...overflow:visible}
.avb-right{overflow:visible}
```

---

## CORREÇÃO 7 — Remover `<div id="modNav">` escondido (opcional)

Em `app.html`, se existir:

```html
<div id="modNav" style="display:none"></div>
```

**REMOVER** — não serve mais.

**MAS** verificar antes que `buildSidebar()` não faz `document.getElementById('modNav')` e espera encontrar. Se o novo `buildSidebar()` (Correção 4) não usa mais `modNav`, pode remover.

---

## CORREÇÃO 8 — CSS responsivo para disc-grid desktop

Verificar se já existem media queries para 3-4 colunas no desktop. Na auditoria, o `.disc-grid` é `repeat(2,1fr)`.

**ADICIONAR se não existir** (em `app.css`, após `.disc-grid`):

```css
@media(min-width:600px){.disc-grid{grid-template-columns:repeat(3,1fr);gap:1rem}}
@media(min-width:1024px){
  .disc-grid{grid-template-columns:repeat(4,1fr);gap:1.25rem}
  .disc-grid-card{min-height:155px;padding:1.5rem 1rem}
  .disc-grid-card .dg-icon{font-size:2.8rem}
  .disc-grid-card .dg-name{font-size:1rem}
  .tools-grid{grid-template-columns:repeat(5,1fr);gap:.85rem}
}
```

---

## CORREÇÃO 9 — Incrementar SW_VERSION

Em `sw.js` (linha 3):

```javascript
// DE:
const SW_VERSION = 'v63';
const CACHE_NAME = 'escola-liberal-v63';
const STATIC_CACHE = 'escola-static-v63';

// PARA:
const SW_VERSION = 'v64';
const CACHE_NAME = 'escola-liberal-v64';
const STATIC_CACHE = 'escola-static-v64';
```

---

## CORREÇÃO 10 — BUILD E TESTE

```bash
# 1. Garantir que o append-mobile-css está correto
node scripts/append-mobile-css.js

# 2. Build de produção
npm run build

# 3. Servir localmente para testar
npm run preview
```

---

## TESTE COMPLETO — NÃO TERMINE SEM VERIFICAR TUDO

### MOBILE (simular com DevTools: Responsive Mode, 375x812 iPhone)

**Dashboard (Home):**
- [ ] Welcome message visível
- [ ] Cards de módulos visíveis com ícone, título, progresso
- [ ] Streak calendar visível
- [ ] Busca funciona
- [ ] Scroll funciona (conteúdo não cortado pelo header/footer)

**Aba Aulas (bottom nav "📚 Aulas"):**
- [ ] Grid de disciplinas aparece (2 colunas no mobile)
- [ ] Cards com ícone, nome, qtd módulos, barra de progresso
- [ ] Ferramentas aparecem abaixo
- [ ] Clicar disciplina → módulos da disciplina aparecem
- [ ] Clicar módulo → aulas do módulo
- [ ] Clicar aula → conteúdo renderiza

**Aba Praticar (⚡):**
- [ ] Bottom sheet abre com opções

**Aba Ranking (🏆):**
- [ ] Leaderboard renderiza

**Aba Perfil (👤):**
- [ ] Tela de perfil/login aparece

**Debate (botão no header):**
- [ ] Salas de debate abrem
- [ ] Bola verde visível (não cortada)

**Navegação:**
- [ ] Back do celular volta para view anterior
- [ ] Bottom nav atualiza active state corretamente
- [ ] Mobile header mostra título correto em cada view
- [ ] Botão "← Voltar" funciona

**Layout:**
- [ ] Header colado no topo (SEM gap)
- [ ] Bottom nav visível no rodapé
- [ ] Conteúdo não fica atrás do header nem do footer
- [ ] Dark mode funciona
- [ ] Light mode funciona

### DESKTOP (>900px, Chrome/Firefox/Safari)

**Dashboard:**
- [ ] Sidebar visível à esquerda com scroll
- [ ] Cards de módulos na área central
- [ ] Welcome, streaks, todas as seções

**Disciplinas:**
- [ ] Link "📚 Disciplinas" na sidebar funciona
- [ ] Tela exclusiva com grid de disciplinas (3-4 colunas)
- [ ] Cards coloridos com hover effect (elevação + sombra)
- [ ] Ferramentas abaixo dos cards
- [ ] Clicar disciplina → módulos
- [ ] Clicar módulo → aulas
- [ ] "Dashboard" restaura a home

**Navegação:**
- [ ] Back/Forward do browser funciona em TODAS as views
- [ ] Sidebar active state correto (highlight no item ativo)
- [ ] Sidebar rola com mousewheel
- [ ] Scrollbar discreta visível

**Layout:**
- [ ] Bola verde do debate NÃO cortada
- [ ] Version bar no topo sem overflow
- [ ] Debate button no header funciona

### CONSOLE

- [ ] Zero erros JavaScript no console
- [ ] Zero warnings críticos
- [ ] Tela de erro (#errorScreen) NÃO aparece

### BUILD

- [ ] `npm run build` executa sem erros
- [ ] SW_VERSION = v64
- [ ] OFFLINE_MODE funciona

---

## RESUMO DAS ALTERAÇÕES

| # | Arquivo | Linha(s) | Ação |
|---|---------|----------|------|
| 1 | `app.js` | ~4000 | `goAulasTab()`: adicionar setNav, pushState, guards, subtítulo |
| 2 | `app.js` | ~4090 | `toggleDiscMobile()`: adicionar setNav + pushState |
| 3 | `app.js` | ~4245 | `popstate`: adicionar aulas, disc, debate, perf, badges, etc. |
| 4 | `app.js` | ~162 | `buildSidebar()`: simplificar (só atualiza contagem) |
| 5 | `app.js` | ~297 | `ui()`: guard para nM* inexistentes |
| 6 | `app.css` | ~1013 | mobile-header: confirmar overflow:visible |
| 7 | `app.css` | ~1076 | debate button: reduzir em telas <400px |
| 8 | `app.css` | ~1350 | disc-grid: media queries 3/4 colunas desktop |
| 9 | `app.html` | ~273 | Remover `<div id="modNav">` se existir |
| 10 | `sw.js` | 3-5 | Incrementar v63→v64 |
| 11 | build | — | `node scripts/append-mobile-css.js && npm run build` |

---

## PRIORIDADE DE EXECUÇÃO

1. **PRIMEIRO:** Correções 1-3 (goAulasTab + popstate) — restaura navegação
2. **SEGUNDO:** Correção 4-5 (cleanup buildSidebar + ui) — remove código morto
3. **TERCEIRO:** Correção 6-8 (bola verde + CSS responsivo) — polish visual
4. **POR ÚLTIMO:** Correção 9-10 (SW + build + teste completo)

**NÃO TERMINE sem rodar o checklist completo de testes.**
