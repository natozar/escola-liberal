# Prompt DEFINITIVO V2: Disciplinas como Link + Reverter Mobile Quebrado

## CONTEXTO — O QUE QUEBROU

O prompt anterior aplicou mudanças parciais que quebraram o app:

1. **`app.css` linha 81** — Foi adicionado `align-items:start` no `.shell`. Isso impede o `.main` de esticar na vertical, colapsando as views (telas vazias no mobile e desktop).
2. **`scripts/append-mobile-css.js` linha 133** — Ainda empurra o header 26px pra baixo: `.mobile-header{top:calc(26px + ...)!important}`
3. **O `buildSidebar()` NÃO foi alterado** — ainda cria accordion que expande módulos inline na sidebar.

## O QUE FAZER

Duas coisas simples:

**A)** Reverter o CSS que quebrou o mobile (remover `align-items:start`)
**B)** Transformar "Disciplinas" em um link ÚNICO na sidebar (como "Plano de Estudos") que ao clicar mostra TODAS as disciplinas com seus módulos na área central

---

## PASSO 1 — REVERTER `align-items:start` DO `.shell` (FIX MOBILE URGENTE)

Em `app.css`, linha 81, localizar:

```css
.shell{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh;min-height:100dvh;align-items:start}
```

**SUBSTITUIR por (remover align-items:start):**

```css
.shell{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh;min-height:100dvh}
```

**Por quê:** `align-items:start` impede que `.main` se estique para preencher a grid cell. Como as views começam com `display:none`, o main colapsa para 0px de altura. Sem essa regra, o main volta a se esticar normalmente.

---

## PASSO 2 — CORRIGIR `.side` PARA SCROLL SEM QUEBRAR LAYOUT

A regra `.side` atual (linha ~101) tem `position:sticky` que pode conflitar sem `align-items:start`. Ajustar para funcionar com o grid padrão:

Localizar `.side` (linha ~101):

```css
.side{background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:1.25rem;overflow-y:auto;overflow-x:hidden;height:100vh;height:100dvh;position:sticky;top:0;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--scrollbar-thumb) transparent}
```

**MANTER como está** — `position:sticky; top:0; height:100vh` funciona em grid sem `align-items:start` porque o grid cell por padrão faz stretch, mas sticky com height explícita limita a sidebar à viewport. Isso é correto.

**Se o scroll da sidebar NÃO funcionar** após remover `align-items:start`, adicionar esta regra auxiliar:

```css
.side{align-self:start}
```

Isso aplica `align-self:start` apenas na sidebar (não no main), permitindo que sticky funcione enquanto o main faz stretch normal.

---

## PASSO 3 — CORRIGIR `scripts/append-mobile-css.js` (HEADER GAP)

Em `scripts/append-mobile-css.js`, localizar o bloco `@media(max-width:900px)` (linhas ~128-137):

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

**SUBSTITUIR todo o bloco por:**

```javascript
@media(max-width:900px){
.app-version-bar{display:none!important}
}
```

**Por quê:** A version bar é `display:none!important` no mobile (já definido em app.css linha 1203). Não precisa de posicionamento mobile. E as regras que empurram o header pra baixo (`top:calc(26px+...)`) criam o espaço vazio. Removendo tudo, o app.css cuida do mobile corretamente.

---

## PASSO 4 — SUBSTITUIR ACCORDION POR LINK ÚNICO "📚 Disciplinas"

### 4A — Em `app.html`, localizar o bloco de disciplinas (linhas ~268-270):

```html
    <!-- Módulos gerados dinamicamente por buildSidebar() — accordion por disciplina -->
    <div class="side-label" style="margin-top:.75rem">Disciplinas</div>
    <div id="modNav"></div>
```

**SUBSTITUIR por:**

```html
    <!-- Disciplinas — link único que abre view no center -->
    <div class="ni" onclick="goDiscView()" id="nDisc" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goDiscView()" style="margin-top:.75rem">
      <div class="ni-icon" style="background:var(--sage-muted);color:var(--sage)">📚</div>
      <div><div class="ni-txt">Disciplinas</div><div class="ni-sub" id="discSubtitle">21 disciplinas</div></div>
    </div>
```

**O que muda:** Em vez de 21 accordions expandíveis, agora é **1 link** igual a "Plano de Estudos", "Meu Progresso", etc.

### 4B — Em `app.js`, REMOVER `buildSidebar()` e `toggleDiscGroup()`:

Localizar `function buildSidebar()` (linha ~162) até `function toggleDiscGroup()` (linha ~201). **SUBSTITUIR todo o bloco** (linhas 162-201) por:

```javascript
// Build sidebar — update discipline count subtitle
function buildSidebar(){
  // Count unique disciplines
  const discs=new Set();
  M.forEach(m=>discs.add(m.discipline||'economia'));
  const el=document.getElementById('discSubtitle');
  if(el) el.textContent=discs.size+' disciplinas';
}
```

Pronto. `buildSidebar()` agora só atualiza o subtítulo do link. Sem accordion, sem HTML dinâmico pesado.

### 4C — Em `app.js`, CRIAR a função `goDiscView()`:

Adicionar esta função **logo após o novo `buildSidebar()`**:

```javascript
// Navigate to Disciplines view — shows all disciplines as cards with their modules
function goDiscView(){
  hideAllViews();
  clearDiscAccent();
  try{history.pushState({view:'disc'},'')}catch(e){}

  const vd=document.getElementById('vDash');
  if(!vd)return;
  vd.style.display='block';
  vd.classList.add('view-enter');
  setTimeout(()=>vd.classList.remove('view-enter'),350);

  // Group modules by discipline
  const grouped={};const order=[];
  M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!grouped[disc]){grouped[disc]=[];order.push(disc)}
    grouped[disc].push({mod:m,idx:i});
  });

  // Build discipline cards
  let html='<h2 style="font-size:var(--fs-h1);font-weight:800;margin-bottom:1.5rem">📚 Disciplinas</h2>';

  order.forEach(disc=>{
    const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
    const mods=grouped[disc];
    const totalL=mods.reduce((s,x)=>s+x.mod.lessons.length,0);
    const doneL=mods.reduce((s,x)=>s+x.mod.lessons.filter((_,li)=>S.done[`${x.idx}-${li}`]).length,0);
    const pct=totalL?Math.round(doneL/totalL*100):0;
    const clr=getModColor(mods[0].mod.color||'sage');
    const clrMuted=getModColorMuted(mods[0].mod.color||'sage');

    // Discipline header
    html+=`<div class="disc-header"><span class="disc-icon">${d.icon}</span><h2 class="disc-title">${d.label}</h2><span style="font-size:.75rem;color:var(--text-muted);margin-left:auto">${pct}% concluído</span></div>`;

    // Module cards for this discipline
    mods.forEach(x=>{
      const m=x.mod,i=x.idx;
      const done=m.lessons.filter((_,li)=>S.done[`${i}-${li}`]).length;
      const p=Math.round(done/m.lessons.length*100);
      const c=m.color||'sage';
      const statusCls=p===100?'completed':p>0?'in-progress':'not-started';
      const statusTxt=p===100?'✓ Completo':p>0?`${done}/${m.lessons.length} aulas`:'Começar';
      html+=`<div class="mc" onclick="goMod(${i})">
        <div class="mc-circle"><div class="mc-ring" style="--ring-pct:${p};--ring-color:${getModColor(c)}"></div><div class="mc-ring-inner"></div><span class="mc-circle-icon">${m.icon}</span></div>
        <div class="mc-info"><h3>${m.title}</h3><p>${m.desc}</p><div class="mc-meta">${m.lessons.length} aulas · ${p}%</div></div>
        <div class="mc-status ${statusCls}">${statusTxt}</div>
      </div>`;
    });
  });

  vd.innerHTML=`<div class="dash">${html}</div>`;

  // Set active state
  setNav('nDisc');

  // Scroll to top
  const mainEl=document.querySelector('.main');
  if(mainEl)mainEl.scrollTop=0;
}
```

---

## PASSO 5 — GARANTIR QUE `goDash()` RESTAURA O DASHBOARD

O `goDiscView()` reutiliza `vDash` (sobrescreve innerHTML). Quando user volta ao Dashboard, precisa recriar o conteúdo original.

Localizar `function goDash()` (linha ~401). **VERIFICAR** que `renderCards()` reconstrói o conteúdo. O HTML original do `vDash` em app.html tem estrutura estática (welcome, sections, mcards). Se `goDiscView()` sobrescreveu com `vd.innerHTML=...`, o `goDash()` precisa restaurar.

**SOLUÇÃO:** Em `goDiscView()`, ANTES de sobrescrever, salvar o HTML original. Depois em `goDash()`, restaurar.

**Adicionar no TOPO de `app.js` (área de variáveis globais, antes de buildSidebar):**

```javascript
let _dashOrigHTML = null; // Cache do HTML original do dashboard
```

**No `goDiscView()`, ANTES de sobrescrever vd.innerHTML, salvar:**

```javascript
function goDiscView(){
  hideAllViews();
  clearDiscAccent();
  try{history.pushState({view:'disc'},'')}catch(e){}

  const vd=document.getElementById('vDash');
  if(!vd)return;

  // Salvar HTML original do dashboard (primeira vez apenas)
  if(!_dashOrigHTML) _dashOrigHTML=vd.innerHTML;

  vd.style.display='block';
  vd.classList.add('view-enter');
  // ... resto do código ...
```

**No `goDash()`, restaurar HTML original antes de renderizar:**

Localizar `function goDash()` e ADICIONAR logo após `vd.style.display='block'`:

```javascript
function goDash(){
  hideAllViews();clearDiscAccent();
  const vd=_origById('vDash');
  if(!vd)return;

  // Restaurar HTML original se foi sobrescrito por goDiscView
  if(_dashOrigHTML) vd.innerHTML=_dashOrigHTML;

  vd.style.display='block';vd.classList.add('view-enter');
  // ... resto existente continua ...
```

---

## PASSO 6 — ATUALIZAR `popstate` HANDLER

Localizar o `window.addEventListener('popstate', ...)` e **ADICIONAR** o case `disc`:

```javascript
// DENTRO do switch ou if/else do popstate:
if(s.view==='disc'){ goDiscView(); return; }
```

Se for `switch`:
```javascript
case 'disc': goDiscView(); break;
```

---

## PASSO 7 — MOBILE: VERIFICAR TELAS NÃO VAZIAS

Após reverter `align-items:start` (PASSO 1), testar:

- [ ] Dashboard mostra cards normalmente no mobile
- [ ] Módulos abrem com lista de aulas
- [ ] Aulas mostram conteúdo
- [ ] Bottom nav funciona (5 botões)
- [ ] Mobile header visível e colado no topo

**Se alguma tela ainda estiver vazia**, o problema pode ser que `hideAllViews()` ou `goDash()` estão usando `_origById` que retorna null. Buscar no código por `_origById` e garantir que ele é apenas um alias para `document.getElementById` funcional:

```javascript
// Se _origById não existir, criar:
const _origById = document.getElementById.bind(document);
```

---

## PASSO 8 — LIMPAR CSS DO ACCORDION (OPCIONAL)

Os seguintes estilos CSS podem ser REMOVIDOS de `app.css` já que o accordion não existe mais na sidebar:

```css
/* PODE REMOVER (buscar e deletar): */
.disc-group{ ... }
.disc-group-head{ ... }
.disc-group-head:hover{ ... }
.disc-count{ ... }
.disc-prog{ ... }
.disc-prog-fill{ ... }
.disc-arrow{ ... }
.disc-group.open .disc-arrow{ ... }
.disc-group-body{ ... }
.disc-group.open .disc-group-body{ ... }
.disc-group-body .ni{ ... }
```

**MANTER:** `.disc-header`, `.disc-icon`, `.disc-title` — são usados no `goDiscView()` e `renderCards()`.

**MANTER:** `.ni`, `.ni-icon`, `.ni-txt`, `.ni-sub`, `.ni-prog`, `.ni-prog-bar` — usados na sidebar.

---

## PASSO 9 — SIDEBAR SCROLL: MANTER `align-self:start` APENAS NA SIDEBAR

Se após o PASSO 1 a sidebar desktop não rolar corretamente, adicionar em `app.css`:

```css
.side{align-self:start}
```

Isso garante que a sidebar pode usar `position:sticky` + `height:100vh` enquanto o main faz stretch normal no grid.

---

## PASSO 10 — INCREMENTAR SW_VERSION

Em `sw.js`:

```javascript
const SW_VERSION = XX + 1; // Incrementar
```

---

## CHECKLIST FINAL

### MOBILE (PRIORIDADE MÁXIMA — estava quebrado)
- [ ] Dashboard mostra conteúdo (welcome, cards, streaks)
- [ ] Clicar em módulo → lista de aulas aparece
- [ ] Clicar em aula → conteúdo da aula aparece
- [ ] Bottom nav funciona (Início, Módulos, Praticar, Progresso, Perfil)
- [ ] Mobile header colado no topo (SEM espaço vazio acima)
- [ ] Debate funciona
- [ ] ZERO telas vazias

### DESKTOP — Sidebar
- [ ] "📚 Disciplinas" aparece como link único na sidebar
- [ ] Clicar → todas disciplinas com módulos aparecem na área central
- [ ] Sidebar NÃO tem accordion (sem expansão inline)
- [ ] Sidebar rola se conteúdo excede a tela
- [ ] Dashboard restaura ao clicar "🏠 Dashboard"

### NAVEGAÇÃO
- [ ] Back/Forward browser funciona (disc view incluído no popstate)
- [ ] goMod() funciona vindo do goDiscView()
- [ ] goMod() funciona vindo do Dashboard (renderCards)

### GERAL
- [ ] Dark/light mode sem regressão
- [ ] Sem erros no console
- [ ] OFFLINE_MODE funciona
- [ ] Build: `npm run build`
- [ ] SW_VERSION incrementado

## ARQUIVOS ALTERADOS

| Arquivo | Ação |
|---------|------|
| `app.css` (linha 81) | REMOVER `align-items:start` do `.shell` |
| `app.css` (linha ~101) | Adicionar `align-self:start` na `.side` se necessário |
| `scripts/append-mobile-css.js` | Simplificar bloco mobile (só `display:none` na version bar) |
| `app.html` (linhas ~268-270) | Substituir label+modNav por link único "📚 Disciplinas" |
| `app.js` | Reescrever `buildSidebar()` (só atualiza subtítulo), criar `goDiscView()`, remover `toggleDiscGroup()`, atualizar `goDash()` com restore, atualizar popstate, variável `_dashOrigHTML` |
| `sw.js` | Incrementar SW_VERSION |

## ORDEM DE EXECUÇÃO

**PRIMEIRO:** Passos 1 e 3 (reverter CSS + fix append-mobile-css) — isso restaura o mobile IMEDIATAMENTE.
**DEPOIS:** Passos 4-6 (novo link disciplinas + goDiscView + popstate).
**POR ÚLTIMO:** Passos 7-10 (verificação + cleanup + SW).
