# Prompt FINAL: Restaurar Mobile + Tela Disciplinas Exclusiva + Polish Desktop

## SITUAÇÃO ATUAL

### Mobile — TUDO QUEBRADO (telas vazias)
### Desktop — quase perfeito, faltam ajustes menores

---

## DIAGNÓSTICO DETALHADO

### Por que o mobile está com telas vazias?

O prompt anterior fez estas mudanças que causaram os problemas:

1. **`app.html` linha 269:** Link "Disciplinas" chama `goDiscView()` — **essa função NÃO EXISTE em app.js**. Cada clique gera `ReferenceError: goDiscView is not defined`.

2. **`app.js` linha ~162:** `buildSidebar()` foi simplificado para só atualizar subtítulo, mas o `modNav` div está com `display:none`. O accordion antigo sumiu mas o `buildSidebar()` tenta escrever em `modNav` que não existe mais visivelmente. A função `ui()` (linha ~297) itera sobre `M.forEach((m,mi)=>{ const el=_origById('nM'+mi); ... })` — esses elementos `nM0`, `nM1`... **não existem mais** porque o accordion foi removido. Isso NÃO causa crash (o Proxy Safe DOM retorna _nullProxy), mas pode afetar o fluxo.

3. **Erro cascade:** O app tem `window.onerror` (linha ~3917) que mostra `#errorScreen` após 3+ erros em 2 segundos. Se o user clicar em algo que chame `goDiscView()`, os erros se acumulam e a tela de erro sobrepõe tudo.

4. **`scripts/append-mobile-css.js` (linhas 128-137):** Ainda tem regras que empurram o header pra baixo e sobrescrevem o padding do main com `!important`:
```css
.mobile-header{top:calc(26px + env(safe-area-inset-top,0px))!important}
.main{padding-top:calc(90px + env(safe-area-inset-top))!important}
```

### Bola verde cortada no desktop
O botão de debate no mobile header (`#debateTopBtn`) tem a `.live-dot` (bola verde 7px) + `.online-count`. No mobile header, o header tem `overflow` não definido, e o header usa `display:flex` com `gap:6px`, fazendo elementos ficarem cortados quando o espaço é insuficiente.

---

## EXECUÇÃO — ORDEM EXATA

---

## PASSO 1 — CORRIGIR `scripts/append-mobile-css.js` (URGENTE)

Abrir `scripts/append-mobile-css.js` e localizar o bloco `@media(max-width:900px)` no final (linhas ~128-137).

**ENCONTRAR:**
```javascript
@media(max-width:900px){
.app-version-bar{position:fixed;top:0;left:0;right:0;padding:.2rem .6rem calc(.2rem + env(safe-area-inset-top,0px));min-height:26px;font-size:.6rem}
.avb-logo{width:16px;height:16px}.avb-name{font-size:.58rem}
.avb-version{font-size:.5rem}.avb-status{font-size:.5rem;padding:.08rem .3rem}
.avb-check{width:20px;height:20px;font-size:.6rem}
.mobile-header{top:calc(26px + env(safe-area-inset-top,0px))!important}
.main{padding-top:calc(90px + env(safe-area-inset-top))!important}
.side.open{padding-top:calc(90px + env(safe-area-inset-top))}
.global-progress{top:calc(82px + env(safe-area-inset-top))}
}
```

**SUBSTITUIR POR:**
```javascript
@media(max-width:900px){
.app-version-bar{display:none!important}
}
```

**Por quê:** A version bar já é `display:none!important` no app.css para mobile. As outras regras (header top:calc(26px...), main padding:calc(90px...)) SOBRESCREVEM com `!important` os valores corretos do app.css, criando gap no header e padding errado. Removendo, o app.css cuida de tudo.

**Depois, executar:**
```bash
node scripts/append-mobile-css.js
```

---

## PASSO 2 — CORRIGIR `app.html` — Link Disciplinas

Localizar em `app.html` (linha ~269):

```html
<div class="ni" onclick="goDiscView()" id="nDisc" role="button" tabindex="0" style="margin-top:.75rem">
```

**SUBSTITUIR `goDiscView()` por `goAulasTab()`:**

```html
<div class="ni" onclick="goAulasTab()" id="nDisc" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goAulasTab()" style="margin-top:.75rem">
```

---

## PASSO 3 — CRIAR TELA EXCLUSIVA DE DISCIPLINAS (view dedicada, NÃO reutilizar vDash)

A view `#vAulas` já existe em `app.html` (linha 652) com `disc-grid` e `tools-grid`. Mas precisa ser melhorada visualmente para ser uma tela didática e intuitiva.

### 3A — Melhorar HTML da view `#vAulas` em `app.html`

Localizar (linha ~652):

```html
<!-- AULAS TAB VIEW (mobile disciplines + tools grid) -->
<div id="vAulas" style="display:none">
  <h2 class="aulas-title">Escolha uma Disciplina</h2>
  <div class="disc-grid" id="discGrid"></div>
  <h3 class="tools-title">Ferramentas</h3>
  <div class="tools-grid" id="toolsGrid"></div>
</div>
```

**SUBSTITUIR POR:**

```html
<!-- AULAS TAB VIEW — Discipline explorer (mobile + desktop) -->
<div id="vAulas" class="aulas-view" style="display:none">
  <div class="aulas-header">
    <h2 class="aulas-title">📚 Disciplinas</h2>
    <p class="aulas-subtitle" id="aulasSubtitle">Explore todas as áreas do conhecimento</p>
  </div>
  <div class="disc-grid" id="discGrid"></div>
  <div class="aulas-tools-section">
    <h3 class="tools-title">⚡ Ferramentas de Estudo</h3>
    <div class="tools-grid" id="toolsGrid"></div>
  </div>
</div>
```

### 3B — Adicionar CSS para a tela exclusiva

Em `app.css`, localizar o bloco `/* ====== AULAS TAB — DISCIPLINE GRID ====== */` (linha ~1340) e **SUBSTITUIR TODO o bloco** (de `.aulas-title` até `.tools-grid-item`) por:

```css
/* ====== AULAS TAB — DISCIPLINE EXPLORER ====== */
.aulas-view{max-width:960px;margin:0 auto;width:100%;padding:0 .5rem}
.aulas-header{margin-bottom:1.5rem;padding:0 .25rem}
.aulas-title{font-family:'DM Serif Display',serif;font-size:1.4rem;margin:0 0 .25rem;color:var(--text-primary)}
.aulas-subtitle{font-size:.85rem;color:var(--text-muted);margin:0}
.disc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.85rem;margin-bottom:2rem}
.disc-grid-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:1.25rem .75rem;min-height:130px;background:var(--bg-card);border:2px solid var(--border);border-radius:var(--r-xl);cursor:pointer;transition:all .2s var(--ease);-webkit-tap-highlight-color:transparent;text-align:center;position:relative;overflow:hidden}
.disc-grid-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.1);border-color:var(--border-hover)}
.disc-grid-card:active{transform:scale(.96)}
.disc-grid-card .dg-icon{font-size:2.2rem;line-height:1}
.disc-grid-card .dg-name{font-size:.88rem;font-weight:700;line-height:1.2;color:var(--text-primary)}
.disc-grid-card .dg-meta{font-size:.7rem;color:var(--text-muted);line-height:1.2}
.disc-grid-card .dg-prog{width:80%;height:4px;background:var(--bg-elevated);border-radius:2px;overflow:hidden;margin-top:.25rem}
.disc-grid-card .dg-prog-fill{height:100%;border-radius:2px;transition:width .3s var(--ease)}
.disc-grid-card[data-color="sage"]{border-color:var(--sage-muted)}.disc-grid-card[data-color="sage"]:hover{border-color:var(--sage)}
.disc-grid-card[data-color="sky"]{border-color:var(--sky-muted)}.disc-grid-card[data-color="sky"]:hover{border-color:var(--sky)}
.disc-grid-card[data-color="honey"]{border-color:var(--honey-muted)}.disc-grid-card[data-color="honey"]:hover{border-color:var(--honey)}
.disc-grid-card[data-color="coral"]{border-color:var(--coral-muted)}.disc-grid-card[data-color="coral"]:hover{border-color:var(--coral)}
.disc-grid-card[data-color="lavender"]{border-color:var(--lavender-muted)}.disc-grid-card[data-color="lavender"]:hover{border-color:var(--lavender)}
.disc-grid-card[data-color="mint"]{border-color:rgba(91,213,155,.15)}.disc-grid-card[data-color="mint"]:hover{border-color:#5bd59b}
.aulas-tools-section{margin-top:.5rem}
.tools-title{font-size:.85rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.75rem;padding:0 .25rem}
.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem;margin-bottom:2rem}
.tools-grid-item{display:flex;flex-direction:column;align-items:center;gap:.35rem;padding:.85rem .5rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);cursor:pointer;transition:all .15s var(--ease);-webkit-tap-highlight-color:transparent}
.tools-grid-item:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.08);border-color:var(--border-hover)}
.tools-grid-item:active{transform:scale(.96)}
.tools-grid-item .tg-icon{font-size:1.5rem}
.tools-grid-item .tg-label{font-size:.72rem;font-weight:600;color:var(--text-secondary)}

/* Desktop: 3-4 columns, larger cards */
@media(min-width:600px){
  .disc-grid{grid-template-columns:repeat(3,1fr);gap:1rem}
  .tools-grid{grid-template-columns:repeat(4,1fr)}
}
@media(min-width:1024px){
  .aulas-view{padding:0 1rem}
  .aulas-title{font-size:1.8rem}
  .aulas-subtitle{font-size:.9rem}
  .disc-grid{grid-template-columns:repeat(4,1fr);gap:1.25rem}
  .disc-grid-card{min-height:155px;padding:1.5rem 1rem}
  .disc-grid-card .dg-icon{font-size:2.8rem}
  .disc-grid-card .dg-name{font-size:1rem}
  .disc-grid-card .dg-meta{font-size:.78rem}
  .tools-grid{grid-template-columns:repeat(5,1fr);gap:.85rem}
  .tools-grid-item{padding:1rem .75rem}
  .tools-grid-item .tg-icon{font-size:1.8rem}
  .tools-grid-item .tg-label{font-size:.78rem}
}

/* Small phones */
@media(max-width:359px){
  .disc-grid{grid-template-columns:repeat(2,1fr);gap:.5rem}
  .disc-grid-card{min-height:100px;padding:.75rem .5rem}
  .disc-grid-card .dg-icon{font-size:1.6rem}
  .disc-grid-card .dg-name{font-size:.75rem}
  .tools-grid{grid-template-columns:repeat(3,1fr);gap:.4rem}
}
```

---

## PASSO 4 — Adaptar `goAulasTab()` para desktop + sidebar active

Em `app.js`, localizar `function goAulasTab()` (linha ~4000).

**SUBSTITUIR toda a função por:**

```javascript
function goAulasTab(){
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  // Mobile UI (guards para desktop onde podem não existir)
  if(typeof updateBottomNav==='function') updateBottomNav('aulas');
  if(typeof updateMobileHeader==='function') updateMobileHeader('Disciplinas',false);
  _mobileBackFn=null;
  renderDiscGrid();
  closeSideMobile();
  // Desktop: sidebar active state
  setNav('nDisc');
  // History API
  try{history.pushState({view:'aulas'},'')}catch(e){}
  // Update subtitle with counts
  const discs=new Set();
  M.forEach(m=>discs.add(m.discipline||'economia'));
  const sub=document.getElementById('aulasSubtitle');
  if(sub) sub.textContent=discs.size+' disciplinas · '+M.length+' módulos · '+M.reduce((s,m)=>s+m.lessons.length,0)+' aulas';
  // Scroll to top
  const mainEl=document.querySelector('.main');
  if(mainEl) mainEl.scrollTop=0;
}
```

---

## PASSO 5 — Adaptar `toggleDiscMobile()` com desktop support

Em `app.js`, localizar `function toggleDiscMobile(disc)` (linha ~4062).

No final da função, ADICIONAR (antes do `}`):

```javascript
  // Desktop: sidebar active + history
  setNav('nDisc');
  try{history.pushState({view:'disc',disc:disc},'')}catch(e){}
```

---

## PASSO 6 — Atualizar `popstate` handler

Localizar `window.addEventListener('popstate', ...)` em app.js e adicionar os cases:

```javascript
// Adicionar dentro do handler:
if(s.view==='aulas'){ goAulasTab(); return; }
if(s.view==='disc' && s.disc){ toggleDiscMobile(s.disc); return; }
```

---

## PASSO 7 — Simplificar `buildSidebar()`

O `buildSidebar()` atual (linhas ~162-194) gera HTML para `#modNav` que está com `display:none`. Simplificar:

**SUBSTITUIR toda `buildSidebar()` + `toggleDiscGroup()` (linhas ~162-201) por:**

```javascript
// Build sidebar — update discipline count
function buildSidebar(){
  const discs=new Set();
  M.forEach(m=>discs.add(m.discipline||'economia'));
  const el=document.getElementById('discSubtitle');
  if(el) el.textContent=discs.size+' disciplinas · '+M.length+' módulos';
}
```

---

## PASSO 8 — Limpar `ui()` de referências ao accordion morto

Em `app.js`, a função `ui()` (linha ~297) faz:
```javascript
M.forEach((m,mi)=>{
  const el=_origById('nM'+mi);
  if(!el)return;
  // ... atualiza progresso do módulo na sidebar
});
```

Os elementos `nM0`, `nM1`... não existem mais. O Proxy Safe DOM evita crash, mas gasta ciclos.

**Solução:** Envolver em try/catch ou remover o bloco:

Localizar na `ui()` (linha ~297-315) o bloco `M.forEach((m,mi)=>{ const el=_origById('nM'+mi);` e **REMOVER** ou **COMENTAR** todo o forEach.

**ALTERNATIVA mais segura:** Apenas adicionar um guard no início:

```javascript
// SUBSTITUIR:
M.forEach((m,mi)=>{
  const el=_origById('nM'+mi);
  if(!el)return;

// POR:
M.forEach((m,mi)=>{
  const el=_origById('nM'+mi);
  if(!el||el.__isNull)return;
```

---

## PASSO 9 — CORRIGIR BOLA VERDE CORTADA (Desktop)

O botão debate no mobile header (#debateTopBtn) tem elementos que podem ser cortados pelo overflow do header.

### 9A — Garantir que o mobile header NÃO corta overflow

Em `app.css`, localizar `.mobile-header` (linha ~1013):

```css
.mobile-header{display:none;position:fixed;top:0;left:0;right:0;background:var(--bg-secondary);border-bottom:1px solid var(--border);z-index:6500;padding:calc(6px + env(safe-area-inset-top)) 10px 6px;gap:6px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
```

**ADICIONAR `overflow:visible` e `display` flex alignment:**

```css
.mobile-header{display:none;position:fixed;top:0;left:0;right:0;background:var(--bg-secondary);border-bottom:1px solid var(--border);z-index:6500;padding:calc(6px + env(safe-area-inset-top)) 10px 6px;gap:6px;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:visible;align-items:center;justify-content:space-between}
```

### 9B — Reduzir tamanho do botão debate no mobile para caber

```css
@media(max-width:400px){
  .debate-btn-top{padding:5px 10px;font-size:.72rem;gap:4px;border-radius:16px}
  .debate-btn-top .debate-icon{font-size:.85rem}
  .debate-btn-top .live-dot{width:5px;height:5px}
  .debate-btn-top .online-count{padding:1px 5px;font-size:.6rem;min-width:16px}
}
```

### 9C — Se a bola verde no DESKTOP (version bar) está cortada

O botão debate também existe no desktop version bar (`#debateTopBtnDesktop`). Se o overflow está cortando:

```css
.app-version-bar{overflow:visible}
.avb-right{overflow:visible}
```

---

## PASSO 10 — REMOVER `modNav` div escondido

Em `app.html`, localizar (linha ~273):

```html
<div id="modNav" style="display:none"></div>
```

**REMOVER essa linha** — não serve mais para nada.

---

## PASSO 11 — Incrementar SW_VERSION

Em `sw.js`:
```javascript
const SW_VERSION = XX + 1;
```

---

## PASSO 12 — REBUILD E TESTAR

```bash
# 1. Primeiro, rodar o script que gera CSS final
node scripts/append-mobile-css.js

# 2. Build de produção
npm run build

# 3. Testar local
npm run preview
```

---

## CHECKLIST DE VERIFICAÇÃO

### MOBILE (PRIORIDADE MÁXIMA)
- [ ] Dashboard (Home) — welcome, cards de módulos, streaks VISÍVEIS
- [ ] Aba "Aulas" (bottom nav) — grid de disciplinas aparece
- [ ] Clicar disciplina → módulos da disciplina aparecem como cards
- [ ] Clicar módulo → lista de aulas
- [ ] Clicar aula → conteúdo da aula renderiza
- [ ] Aba "Praticar" → bottom sheet com opções
- [ ] Aba "Ranking" → leaderboard
- [ ] Aba "Perfil" → tela de perfil/login
- [ ] Debate (botão no header) → salas de debate
- [ ] Mobile header colado no topo SEM gap
- [ ] Bola verde do debate VISÍVEL e não cortada
- [ ] Back do celular funciona (volta view anterior)
- [ ] Sem tela de erro (#errorScreen) sobrepondo conteúdo
- [ ] ZERO erros no console JavaScript

### DESKTOP — Tela de Disciplinas
- [ ] Link "📚 Disciplinas" na sidebar funciona
- [ ] Clica → tela exclusiva com grid 4 colunas
- [ ] Cards coloridos (ícone grande, nome, progresso)
- [ ] Hover nos cards tem elevação + sombra
- [ ] Abaixo das disciplinas: seção "Ferramentas de Estudo"
- [ ] Clicar disciplina → mostra módulos
- [ ] Clicar módulo → mostra aulas
- [ ] Dashboard na sidebar → volta ao dashboard original
- [ ] Botão de debate no desktop SEM bola cortada

### NAVEGAÇÃO
- [ ] Back/Forward do browser funciona (todas as views)
- [ ] Sidebar active state correto ao navegar
- [ ] popstate handler cobre: dash, aulas, disc, mod, lesson

### GERAL
- [ ] Dark mode — sem regressão
- [ ] Light mode — sem regressão
- [ ] OFFLINE_MODE — funciona
- [ ] Build: `npm run build` sem erros
- [ ] SW_VERSION incrementado

---

## ARQUIVOS ALTERADOS

| Arquivo | Ação |
|---------|------|
| `scripts/append-mobile-css.js` | Simplificar bloco mobile (só display:none na version bar) |
| `app.html` (linha ~269) | Trocar `goDiscView()` por `goAulasTab()` |
| `app.html` (linha ~652) | Melhorar HTML do #vAulas (header, subtitle, seção ferramentas) |
| `app.html` (linha ~273) | Remover `<div id="modNav">` escondido |
| `app.css` (~1340) | CSS completo para tela de disciplinas (responsivo 2/3/4 colunas) |
| `app.css` (~1013) | Mobile header: overflow:visible, align-items:center |
| `app.css` (novo) | Debate button mobile menor em telas <400px |
| `app.css` (novo) | Version bar overflow:visible |
| `app.js` (goAulasTab ~4000) | Desktop support: setNav, pushState, subtitle |
| `app.js` (toggleDiscMobile ~4062) | Adicionar setNav + pushState |
| `app.js` (buildSidebar ~162) | Simplificar (só atualiza subtítulo) |
| `app.js` (ui ~297) | Guard para nM* que não existem mais |
| `app.js` (popstate) | Adicionar cases aulas + disc |
| `sw.js` | Incrementar SW_VERSION |

---

## ORDEM DE PRIORIDADE

1. **PRIMEIRO:** Passo 1 (append-mobile-css.js) + Passo 2 (goDiscView→goAulasTab) — RESTAURA O MOBILE
2. **SEGUNDO:** Passos 3-6 (tela disciplinas exclusiva com CSS responsivo)
3. **TERCEIRO:** Passos 7-9 (cleanup + bola verde)
4. **POR ÚLTIMO:** Passos 10-12 (limpeza + build + SW)
