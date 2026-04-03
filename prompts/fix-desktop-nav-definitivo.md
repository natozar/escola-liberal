# Prompt DEFINITIVO: Corrigir Navegação Desktop (Windows/macOS)

## Problema Principal
Na sidebar desktop, as disciplinas abrem um **accordion inline** listando todos os módulos DENTRO da sidebar. Isso torna a barra lateral gigante e impossível de rolar. O comportamento correto é: clicar na disciplina → mostrar os módulos na **área central (main)**, não expandir dentro da sidebar.

## Problema Secundário
A sidebar não tem constraint de altura, então `overflow-y:auto` não funciona — ela cresce infinitamente com o conteúdo.

---

## DIAGNÓSTICO

### Como funciona HOJE (errado):
```
Sidebar                        Main
┌──────────────────┐  ┌──────────────────────┐
│ 💰 Economia ▸    │  │                      │
│   (clica)        │  │  Dashboard (inalterado)
│ 💰 Economia ▾    │  │                      │
│   Módulo 1       │  │                      │
│   Módulo 2       │  │                      │
│   Módulo 3       │  │                      │
│ 🔢 Matemática ▸  │  │                      │
│   (clica)        │  │                      │
│ 🔢 Matemática ▾  │  │                      │
│   Módulo 4       │  │                      │
│   Módulo 5       │  │                      │
│   ... OVERFLOW   │  │                      │
└──────────────────┘  └──────────────────────┘
```

### Como deve funcionar (correto):
```
Sidebar                        Main
┌──────────────────┐  ┌──────────────────────┐
│ 🏠 Dashboard     │  │                      │
│                  │  │                      │
│ DISCIPLINAS      │  │                      │
│ 💰 Economia      │  │  Dashboard view      │
│ 🔢 Matemática    │  │  (cards de módulos)  │
│ 🏛️ Filosofia     │  │                      │
│ 💪 Ed. Emocional │  │                      │
│ 🧠 Psicologia    │  │                      │
│ 📝 Português     │  │                      │
│ 🌍 English       │  │                      │
│ ... (compacto!)  │  │                      │
│                  │  │                      │
│ FERRAMENTAS      │  │                      │
│ 🃏 Flashcards    │  │                      │
│ 📖 Glossário     │  │                      │
└──────────────────┘  └──────────────────────┘
         │
    Clica "💰 Economia"
         ▼
┌──────────────────┐  ┌──────────────────────┐
│ 🏠 Dashboard     │  │ 💰 ECONOMIA          │
│                  │  │                      │
│ DISCIPLINAS      │  │ ┌──────────────────┐ │
│ 💰 Economia ◄───│  │ │ Módulo 1         │ │
│ 🔢 Matemática    │  │ │ 10 aulas · 45%   │ │
│ 🏛️ Filosofia     │  │ └──────────────────┘ │
│ ...              │  │ ┌──────────────────┐ │
│                  │  │ │ Módulo 2         │ │
│                  │  │ │ 8 aulas · 0%     │ │
│                  │  │ └──────────────────┘ │
│                  │  │ ┌──────────────────┐ │
│                  │  │ │ Módulo 3         │ │
│                  │  │ │ 12 aulas · 100%  │ │
│                  │  │ └──────────────────┘ │
└──────────────────┘  └──────────────────────┘
```

---

## FASE 1 — Reescrever `buildSidebar()` (Disciplinas como items diretos, sem accordion)

### Em `app.js`, localizar `function buildSidebar()` (linha ~162) e **SUBSTITUIR TODA a função** por:

```javascript
// Build sidebar navigation — disciplines as direct clickable items (NO accordion)
function buildSidebar(){
  const nav=document.getElementById('modNav');
  if(!nav)return;
  let html='';
  const grouped={};const order=[];
  M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!grouped[disc]){grouped[disc]=[];order.push(disc)}
    grouped[disc].push({mod:m,idx:i});
  });
  order.forEach(disc=>{
    const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
    const mods=grouped[disc];
    const totalL=mods.reduce((s,x)=>s+x.mod.lessons.length,0);
    const doneL=mods.reduce((s,x)=>s+x.mod.lessons.filter((_,li)=>S.done[`${x.idx}-${li}`]).length,0);
    const pct=totalL?Math.round(doneL/totalL*100):0;
    const clr=getModColor(mods[0].mod.color||'sage');
    const clrMuted=getModColorMuted(mods[0].mod.color||'sage');

    // Single-module discipline: click goes directly to module
    if(mods.length===1){
      const x=mods[0];
      html+=`<div class="ni" onclick="goMod(${x.idx})" id="nM${x.idx}" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goMod(${x.idx})">
        <div class="ni-icon" style="background:${clrMuted};color:${clr}">${d.icon}</div>
        <div>
          <div class="ni-txt">${d.label}</div>
          <div class="ni-sub">${x.mod.lessons.length} aulas · ${pct}%</div>
          <div class="ni-prog"><div class="ni-prog-bar" style="width:${pct}%;background:${clr}"></div></div>
        </div>
      </div>`;
    } else {
      // Multi-module discipline: click shows modules in MAIN area (not accordion)
      html+=`<div class="ni" onclick="goDisc('${disc}')" id="nD-${disc}" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goDisc('${disc}')">
        <div class="ni-icon" style="background:${clrMuted};color:${clr}">${d.icon}</div>
        <div>
          <div class="ni-txt">${d.label}</div>
          <div class="ni-sub">${mods.length} módulos · ${pct}%</div>
          <div class="ni-prog"><div class="ni-prog-bar" style="width:${pct}%;background:${clr}"></div></div>
        </div>
      </div>`;
    }
  });
  nav.innerHTML=html;
}
```

**O que mudou:**
- Multi-module disciplines agora chamam `goDisc('nome')` em vez de `toggleDiscGroup('nome')`
- NÃO tem mais accordion — cada disciplina é 1 item compacto na sidebar
- Mostra: ícone, nome, qtd módulos, barra de progresso
- Os módulos aparecem na ÁREA CENTRAL quando a disciplina é clicada

---

## FASE 2 — Criar função `goDisc()` (mostrar módulos da disciplina no main)

### Em `app.js`, ADICIONAR esta nova função logo após `buildSidebar()`:

```javascript
// Navigate to discipline view — shows module cards for a specific discipline in MAIN area
function goDisc(disc){
  const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
  const mods=getDiscModules(disc);
  if(!mods.length)return;

  // If only 1 module, go directly to it
  if(mods.length===1){ goMod(mods[0].idx); return; }

  try{history.pushState({view:'disc',disc:disc},'')}catch(e){}

  // Set accent color for this discipline
  setDiscAccent(disc);

  // Calculate overall discipline progress
  const totalL=mods.reduce((s,x)=>s+x.mod.lessons.length,0);
  const doneL=mods.reduce((s,x)=>s+x.mod.lessons.filter((_,li)=>S.done[`${x.idx}-${li}`]).length,0);
  const pct=totalL?Math.round(doneL/totalL*100):0;

  // Build module cards HTML
  let cardsHtml='';
  mods.forEach(x=>{
    const m=x.mod, i=x.idx;
    const done=m.lessons.filter((_,li)=>S.done[`${i}-${li}`]).length;
    const p=Math.round(done/m.lessons.length*100);
    const clr=getModColor(m.color||'sage');
    const clrMuted=getModColorMuted(m.color||'sage');
    const statusCls=p===100?'completed':p>0?'in-progress':'not-started';
    const statusTxt=p===100?'✓ Completo':p>0?`${done}/${m.lessons.length} aulas`:'Começar';
    cardsHtml+=`<div class="mc" onclick="goMod(${i})">
      <div class="mc-circle"><div class="mc-ring" style="--ring-pct:${p};--ring-color:${clr}"></div><div class="mc-ring-inner"></div><span class="mc-circle-icon">${m.icon}</span></div>
      <div class="mc-info"><h3>${m.title}</h3><p>${m.desc}</p><div class="mc-meta">${m.lessons.length} aulas · ${p}%</div></div>
      <div class="mc-status ${statusCls}">${statusTxt}</div>
    </div>`;
  });

  // Render discipline view in main area
  const main=document.getElementById('mainC');
  if(!main)return;

  hideAllViews();

  // Use existing vDash container or create discipline view
  const dash=document.getElementById('vDash');
  if(dash){
    dash.style.display='';
    dash.innerHTML=`
      <div class="disc-view-header" style="margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">
          <span style="font-size:2rem">${d.icon}</span>
          <div>
            <h2 style="font-size:var(--fs-h1);font-weight:800;color:var(--text-primary);margin:0">${d.label}</h2>
            <p style="font-size:var(--fs-sm);color:var(--text-muted);margin:.25rem 0 0">${mods.length} módulos · ${totalL} aulas · ${pct}% concluído</p>
          </div>
        </div>
        <div class="ni-prog" style="height:4px;border-radius:2px;max-width:300px">
          <div class="ni-prog-bar" style="width:${pct}%;background:var(--accent-active,var(--sage))"></div>
        </div>
      </div>
      <div class="mcards">${cardsHtml}</div>
    `;
  }

  // Set sidebar active state
  setNavDisc(disc);

  // Scroll main to top
  const mainEl=document.querySelector('.main');
  if(mainEl)mainEl.scrollTop=0;
}

// Set sidebar active state for discipline
function setNavDisc(disc){
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById('nD-'+disc);
  if(el)el.classList.add('active');
}
```

---

## FASE 3 — Atualizar `setNav()` para suportar disciplinas

### Localizar `function setNav(id)` em `app.js` e **SUBSTITUIR** por:

```javascript
function setNav(id){
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const e=document.getElementById(id);
  if(e){
    e.classList.add('active');
    // Auto-scroll sidebar to active item (desktop only)
    if(window.innerWidth>900){
      e.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  }
}
```

---

## FASE 4 — Atualizar `popstate` handler para suportar `disc` view

### Localizar `window.addEventListener('popstate', ...)` e adicionar o case `disc`:

```javascript
window.addEventListener('popstate', function(e){
  const s=e.state;
  if(!s||!s.view){goDash();return}
  switch(s.view){
    case 'dash':       goDash(); break;
    case 'disc':       if(s.disc && typeof goDisc==='function') goDisc(s.disc); else goDash(); break;
    case 'mod':        if(M[s.mod]) goMod(s.mod); else goDash(); break;
    case 'lesson':     if(M[s.mod]&&M[s.mod].lessons&&M[s.mod].lessons[s.les]) openL(s.mod,s.les); else goDash(); break;
    case 'glossary':   if(typeof goGlossary==='function') goGlossary(); else goDash(); break;
    case 'flashcards': if(typeof goFlashcards==='function') goFlashcards(); else goDash(); break;
    case 'perf':       if(typeof goPerf==='function') goPerf(); else goDash(); break;
    case 'badges':     if(typeof goBadges==='function') goBadges(); else goDash(); break;
    case 'studyplan':  if(typeof goStudyPlan==='function') goStudyPlan(); else goDash(); break;
    case 'game':       if(typeof goGame==='function') goGame(); else goDash(); break;
    case 'debate':     if(typeof goDebate==='function') goDebate(); else goDash(); break;
    case 'debateroom': if(typeof goRoom==='function'&&s.room) goRoom(s.room); else goDash(); break;
    default:           goDash();
  }
});
```

---

## FASE 5 — Atualizar `goMod()` para marcar active na disciplina

### Localizar `function goMod(i)` e no final, APÓS `setNav('nM'+i)`, adicionar fallback:

```javascript
function goMod(i){
  // ... código existente permanece ...

  // Depois de setNav('nM'+i):
  setNav('nM'+i);

  // ADICIONAR: Se não encontrou nM{i} (porque não tem mais accordion), marcar a disciplina
  if(!document.getElementById('nM'+i)){
    const disc=M[i].discipline||'economia';
    setNavDisc(disc);
  }

  // ... resto do código existente ...
}
```

**Nota:** Como removemos o accordion, os módulos individuais NÃO têm mais `id="nM{idx}"` na sidebar (exceto single-module disciplines). Então o fallback marca a disciplina-pai.

---

## FASE 6 — Remover código morto do accordion

### 6A — Remover `toggleDiscGroup()` (não é mais usado):

Localizar `function toggleDiscGroup(disc)` e **DELETAR** toda a função (linhas ~195-201).

### 6B — Limpar CSS do accordion (opcional mas recomendado):

Em `app.css`, os seguintes estilos podem ser **removidos ou comentados** já que o accordion não existe mais:

```css
/* REMOVER ou COMENTAR estes blocos: */
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

**NÃO remover** `.ni`, `.ni-icon`, `.ni-txt`, `.ni-sub`, `.ni-prog`, `.ni-prog-bar` — esses ainda são usados.

---

## FASE 7 — Corrigir scroll da sidebar (causa raiz do overflow)

### 7A — Em `app.css`, localizar a regra `.side` (linha ~101) e SUBSTITUIR:

```css
.side{background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:1.25rem;overflow-y:auto;overflow-x:hidden;height:100vh;height:100dvh;position:sticky;top:0;scrollbar-width:thin;scrollbar-color:var(--scrollbar-thumb) transparent;overscroll-behavior:contain}
```

### 7B — Adicionar scrollbar styling para WebKit:

```css
.side::-webkit-scrollbar{width:6px}
.side::-webkit-scrollbar-track{background:transparent}
.side::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:3px}
.side::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.15)}
[data-theme="light"] .side::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.2)}
```

### 7C — Em `.shell`, adicionar `align-items:start` para sticky funcionar:

```css
.shell{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh;min-height:100dvh;align-items:start}
```

### 7D — Mobile sidebar: remover `inset:0`, usar coordenadas explícitas:

No `@media(max-width:900px)` de `app.css`, a regra `.side` deve ser:

```css
.side{transform:translateX(-100%);transition:transform .3s var(--ease);position:fixed;z-index:200;top:0;left:0;bottom:0;width:300px;height:100vh;height:100dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;box-shadow:none}
```

### 7E — Em `scripts/append-mobile-css.js`, garantir que o bloco mobile NÃO sobrescreve o header top:

Localizar `@media(max-width:900px)` no final do arquivo e SUBSTITUIR:

```javascript
// DE (REMOVER):
.mobile-header{top:calc(26px + env(safe-area-inset-top,0px))!important}
.main{padding-top:calc(90px + env(safe-area-inset-top))!important}

// PARA:
.app-version-bar{display:none!important}
.mobile-header{top:0!important}
.main{padding-top:calc(56px + env(safe-area-inset-top))!important}
```

---

## FASE 8 — Atualizar `goDash()` para restaurar dashboard original

### Verificar que `goDash()` restaura o conteúdo do dashboard (já que `goDisc()` reutiliza `vDash`):

Localizar `function goDash()` e garantir que `renderCards()` é chamado para repovoar:

```javascript
function goDash(){
  hideAllViews();
  const dash=document.getElementById('vDash');
  if(dash) dash.style.display='';

  // Re-render module cards (restaurar dashboard caso goDisc tenha sobrescrito)
  renderCards();

  // ... resto do código existente (XP event, achievements, etc.) ...

  setNav('nDash');
  try{history.pushState({view:'dash'},'')}catch(e){}

  // Scroll to top
  const mainEl=document.querySelector('.main');
  if(mainEl)mainEl.scrollTop=0;
}
```

---

## FASE 9 — Mobile: disciplinas no bottom sheet ou grid

No mobile, as disciplinas ficam na bottom nav via "Praticar" (botão central) ou no dashboard. A sidebar mobile é acessada via hamburger. Garantir que o mesmo `buildSidebar()` funciona no mobile (sem accordion, items compactos):

**Nenhuma alteração extra necessária** — o novo `buildSidebar()` já renderiza items compactos que funcionam tanto no desktop (sidebar) quanto no mobile (sidebar slide-out).

---

## FASE 10 — Incrementar SW_VERSION

Em `sw.js`:

```javascript
const SW_VERSION = XX + 1; // Incrementar
```

---

## CHECKLIST FINAL

### Sidebar Desktop
- [ ] Disciplinas aparecem como items compactos (1 linha cada) na sidebar
- [ ] Clicar em disciplina → módulos aparecem na ÁREA CENTRAL (main)
- [ ] Sidebar NÃO expande (sem accordion inline)
- [ ] Sidebar rola com mousewheel quando conteúdo excede viewport
- [ ] Scrollbar discreta visível
- [ ] Item ativo com highlight visual (classe .active)
- [ ] Dashboard restaura ao clicar "🏠 Dashboard"

### Navegação
- [ ] Disciplina (sidebar) → Módulos (main) → Aula (main) — fluxo completo
- [ ] Back do browser volta de aula → módulo → disciplina → dashboard
- [ ] Forward do browser avança corretamente
- [ ] Clicar módulo direto no dashboard funciona (renderCards inalterado)

### Cross-Browser
- [ ] Chrome Windows: sidebar scroll, navegação, active state
- [ ] Edge Windows: idem
- [ ] Firefox Windows: scrollbar-width:thin funciona
- [ ] Safari macOS: position:sticky funciona em grid
- [ ] Chrome macOS: idem

### Mobile (regressão)
- [ ] Sidebar mobile (slide-out) mostra disciplinas compactas
- [ ] Bottom nav inalterada
- [ ] Mobile header colado no topo (sem gap)
- [ ] Dashboard mostra cards de módulos normalmente

### Geral
- [ ] Dark mode: sem regressão
- [ ] Light mode: sem regressão
- [ ] Sem erros no console
- [ ] OFFLINE_MODE funciona
- [ ] Build produção: `npm run build`
- [ ] SW_VERSION incrementado

## ARQUIVOS ALTERADOS

| Arquivo | Ação |
|---------|------|
| `app.js` | Reescrever `buildSidebar()` (sem accordion), criar `goDisc()`, `setNavDisc()`, atualizar `setNav()`, `goMod()`, `goDash()`, `popstate`, remover `toggleDiscGroup()` |
| `app.css` | Fix sidebar scroll (height, sticky, scrollbar), remover CSS accordion morto, fix mobile sidebar |
| `scripts/append-mobile-css.js` | Fix mobile header top:0 |
| `sw.js` | Incrementar SW_VERSION |

## REGRA DE OURO

**Sidebar = lista compacta de disciplinas (1 item por disciplina).**
**Main area = onde os módulos de cada disciplina são exibidos como cards.**
**ZERO accordion na sidebar. ZERO expansão inline.**
