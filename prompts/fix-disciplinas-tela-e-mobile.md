# Prompt: Tela Exclusiva de Disciplinas + Restaurar Mobile

## CONTEXTO — O QUE ACONTECEU

O prompt anterior criou um link "📚 Disciplinas" na sidebar que chama `goDiscView()`, mas essa função **NUNCA FOI CRIADA** no `app.js`. Resultado: erro de JavaScript ao clicar, possível cascata de erros que quebra outras views.

**Boa notícia:** Já existe uma tela completa de disciplinas no código!
- `goAulasTab()` → mostra a view `#vAulas` com grid de disciplinas
- `renderDiscGrid()` → renderiza cards coloridos 2x2 com ícone, nome, progresso
- `toggleDiscMobile(disc)` → expande módulos de uma disciplina
- CSS completo em `.disc-grid`, `.disc-grid-card`, etc. (linhas ~1340-1358 do app.css)
- HTML da view em `app.html` linha 652: `<div id="vAulas">`

O fix é **simples**: fazer o link da sidebar chamar `goAulasTab()` em vez de `goDiscView()`, e adaptar `goAulasTab()` para funcionar também no desktop.

---

## PASSO 1 — Corrigir link da sidebar (app.html)

Localizar em `app.html` (linha ~269):

```html
<div class="ni" onclick="goDiscView()" id="nDisc" role="button" tabindex="0" style="margin-top:.75rem">
  <div class="ni-icon" style="background:var(--sage-muted);color:var(--sage)">📚</div>
  <div><div class="ni-txt">Disciplinas</div><div class="ni-sub" id="discSubtitle">21 disciplinas</div></div>
</div>
```

**SUBSTITUIR `goDiscView()` por `goAulasTab()`:**

```html
<div class="ni" onclick="goAulasTab()" id="nDisc" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goAulasTab()" style="margin-top:.75rem">
  <div class="ni-icon" style="background:var(--sage-muted);color:var(--sage)">📚</div>
  <div><div class="ni-txt">Disciplinas</div><div class="ni-sub" id="discSubtitle">21 disciplinas</div></div>
</div>
```

---

## PASSO 2 — Adaptar `goAulasTab()` para desktop (app.js)

A função `goAulasTab()` atual (linha ~4000) chama `updateBottomNav('aulas')` e `updateMobileHeader()` que são funções mobile. No desktop, essas funções podem não existir ou não fazer nada visual. Precisamos adicionar: pushState, setNav, e um guard.

Localizar `function goAulasTab()` (linha ~4000) e **SUBSTITUIR** por:

```javascript
function goAulasTab(){
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  // Mobile header/nav (guard para desktop onde podem não existir)
  if(typeof updateBottomNav==='function') updateBottomNav('aulas');
  if(typeof updateMobileHeader==='function') updateMobileHeader('Disciplinas',false);
  _mobileBackFn=null;
  renderDiscGrid();
  closeSideMobile();
  // Desktop: set active state na sidebar
  setNav('nDisc');
  // History API para back/forward
  try{history.pushState({view:'aulas'},'')}catch(e){}
  // Scroll main to top
  const mainEl=document.querySelector('.main');
  if(mainEl)mainEl.scrollTop=0;
}
```

---

## PASSO 3 — Adaptar `toggleDiscMobile()` para funcionar no desktop também

Localizar `function toggleDiscMobile(disc)` (linha ~4062) e **SUBSTITUIR** por:

```javascript
function toggleDiscMobile(disc){
  const mods=M.map((m,i)=>({mod:m,idx:i})).filter(x=>x.mod.discipline===disc);
  if(mods.length===1){goMod(mods[0].idx);return}
  const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  if(typeof updateBottomNav==='function') updateBottomNav('aulas');
  if(typeof updateMobileHeader==='function') updateMobileHeader(d.icon+' '+d.label,true);
  _mobileBackFn=()=>goAulasTab();

  const grid=document.getElementById('discGrid');
  const tools=document.getElementById('toolsGrid');
  const titleEl=document.querySelector('.aulas-title');
  if(titleEl)titleEl.textContent=d.label;
  if(tools)tools.style.display='none';
  const toolsTitle=document.querySelector('.tools-title');
  if(toolsTitle)toolsTitle.style.display='none';

  let html='';
  mods.forEach(x=>{
    const pct=x.mod.lessons.length?Math.round(x.mod.lessons.filter((_,li)=>S.done[x.idx+'-'+li]).length/x.mod.lessons.length*100):0;
    const color=x.mod.color||'sage';
    html+=`<div class="disc-grid-card" data-color="${color}" onclick="goMod(${x.idx})" style="min-height:100px">
      <div class="dg-icon">${x.mod.icon||d.icon}</div>
      <div class="dg-name">${x.mod.title}</div>
      <div class="dg-meta">${x.mod.lessons.length} aulas · ${pct}%</div>
      <div class="dg-prog"><div class="dg-prog-fill" style="width:${pct}%;background:${getModColor(color)}"></div></div>
    </div>`;
  });
  grid.innerHTML=html;

  // Desktop: active state + history
  setNav('nDisc');
  try{history.pushState({view:'disc',disc:disc},'')}catch(e){}
}
```

---

## PASSO 4 — Atualizar popstate handler

Localizar `window.addEventListener('popstate', ...)` em app.js. Adicionar os cases para `aulas` e `disc`:

```javascript
// Dentro do handler de popstate, adicionar:
if(s.view==='aulas'){ goAulasTab(); return; }
if(s.view==='disc' && s.disc){ toggleDiscMobile(s.disc); return; }
```

Se o popstate for um switch:
```javascript
case 'aulas': goAulasTab(); break;
case 'disc':  if(s.disc) toggleDiscMobile(s.disc); else goAulasTab(); break;
```

---

## PASSO 5 — CSS: Adaptar disc-grid para desktop (tela maior, 3-4 colunas)

A `.disc-grid` atual é 2 colunas (pensada para mobile). No desktop precisa de mais colunas.

Em `app.css`, localizar `.disc-grid` (linha ~1342):

```css
.disc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.85rem;margin-bottom:2rem}
```

**SUBSTITUIR por:**

```css
.disc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.85rem;margin-bottom:2rem}
@media(min-width:600px){.disc-grid{grid-template-columns:repeat(3,1fr);gap:1rem}}
@media(min-width:1024px){.disc-grid{grid-template-columns:repeat(4,1fr);gap:1.25rem}}
```

E a `.tools-grid` também:

Localizar `.tools-grid` (logo abaixo):
```css
.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem;margin-bottom:2rem}
```

**SUBSTITUIR por:**
```css
.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem;margin-bottom:2rem}
@media(min-width:600px){.tools-grid{grid-template-columns:repeat(4,1fr)}}
@media(min-width:1024px){.tools-grid{grid-template-columns:repeat(5,1fr);gap:.85rem}}
```

---

## PASSO 6 — CSS: Melhorar visual da view `#vAulas` no desktop

Adicionar em `app.css` (após as regras de `.disc-grid`):

```css
/* Desktop Aulas view styling */
@media(min-width:901px){
  #vAulas{max-width:960px;margin:0 auto;width:100%;padding:1rem 0}
  .aulas-title{font-size:1.6rem;margin-bottom:1.5rem}
  .disc-grid-card{min-height:150px;padding:1.5rem 1rem;border-radius:var(--r-xl);transition:all .2s var(--ease)}
  .disc-grid-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
  .disc-grid-card .dg-icon{font-size:2.8rem}
  .disc-grid-card .dg-name{font-size:1rem}
  .disc-grid-card .dg-meta{font-size:.78rem}
  .tools-title{font-size:.9rem;margin-top:1.5rem;margin-bottom:1rem}
  .tools-grid-item{padding:1rem .75rem;font-size:.85rem}
}
```

---

## PASSO 7 — Atualizar `hideAllViews()` (VERIFICAR)

Localizar `function hideAllViews()` (linha ~1148). Confirmar que `vAulas` está sendo escondido:

```javascript
document.getElementById('vAulas').style.display='none';
```

**Já existe na linha 1167** — sem alteração necessária.

---

## PASSO 8 — Atualizar `buildSidebar()` para contar disciplinas

O `buildSidebar()` atual (linhas 162-194) ainda gera accordion no `#modNav`, mas `modNav` tem `display:none`. Simplificar para apenas atualizar o subtítulo:

Localizar `function buildSidebar()` (linha ~162) e **SUBSTITUIR** toda a função por:

```javascript
// Build sidebar — update discipline count subtitle
function buildSidebar(){
  // Count unique disciplines
  const discs=new Set();
  M.forEach(m=>discs.add(m.discipline||'economia'));
  const el=document.getElementById('discSubtitle');
  if(el) el.textContent=discs.size+' disciplinas · '+M.length+' módulos';
}
```

**Remover também `toggleDiscGroup()`** (linha ~195-201) — não é mais usado.

---

## PASSO 9 — RESTAURAR MOBILE (PRIORIDADE MÁXIMA)

O mobile quebrou por causa de erros JS ao tentar chamar `goDiscView()` que não existia. Com o PASSO 1 (trocar por `goAulasTab()`), o erro some.

**MAS** — verificar se há outros problemas:

### 9A — Verificar que `scripts/append-mobile-css.js` não empurra o header pra baixo

Localizar `scripts/append-mobile-css.js` (linhas ~128-137). Se ainda contiver:

```javascript
.mobile-header{top:calc(26px + env(safe-area-inset-top,0px))!important}
.main{padding-top:calc(90px + env(safe-area-inset-top))!important}
```

**SUBSTITUIR o bloco inteiro `@media(max-width:900px)` por:**

```javascript
@media(max-width:900px){
.app-version-bar{display:none!important}
}
```

### 9B — Verificar que o dashboard funciona

Testar: abrir o app no mobile → Dashboard deve mostrar:
- Welcome message
- Cards de módulos
- Streaks
- Daily quest

Se o dashboard está vazio, verificar que `goDash()` chama `renderCards()` via `ui()`. A função `ui()` deve popular `#mcards`.

### 9C — Testar TODAS as telas do mobile

- [ ] Dashboard (home) — cards visíveis
- [ ] Disciplinas (bottom nav "Aulas") — grid de disciplinas
- [ ] Clicar disciplina → módulos aparecem
- [ ] Clicar módulo → aulas aparecem
- [ ] Clicar aula → conteúdo aparece
- [ ] Debate — salas visíveis
- [ ] Progresso — gráficos visíveis
- [ ] Plano de Estudos — conteúdo visível
- [ ] Perfil — modal/tela visível
- [ ] Bottom nav — 5 botões funcionando
- [ ] Mobile header — título correto, voltar funciona

### 9D — Verificar window.onerror

Em `app.js`, buscar por `window.onerror`. Se existir um error handler que mostra uma tela de erro (`#errorScreen`), pode ser que 3+ erros JS disparem essa tela (sobrepondo tudo). Verificar:

```javascript
// Linha ~3917:
if(_errCount>=3){
  try{_origById('errorScreen').style.display='flex'}catch(e){}
}
```

**Se o errorScreen está aparecendo**, o problema é cascata de erros JS. O fix do PASSO 1 (trocar `goDiscView` por `goAulasTab`) deve resolver a raiz.

**Alternativa emergencial:** Temporariamente aumentar o threshold de erros:

```javascript
if(_errCount>=10){ // Era 3, aumentar para 10 durante debug
```

---

## PASSO 10 — Incrementar SW_VERSION

Em `sw.js`:
```javascript
const SW_VERSION = XX + 1;
```

---

## PASSO 11 — Rebuild e testar

```bash
# Se usa o script de append:
node scripts/append-mobile-css.js

# Build
npm run build

# Testar local
npm run preview
```

---

## CHECKLIST FINAL

### MOBILE (PRIORIDADE 1)
- [ ] Dashboard mostra conteúdo (NÃO tela vazia)
- [ ] Bottom nav funciona (5 botões)
- [ ] "Aulas" no bottom nav → grid de disciplinas
- [ ] Clicar disciplina → módulos
- [ ] Clicar módulo → aulas
- [ ] Clicar aula → conteúdo
- [ ] Debate abre
- [ ] Mobile header correto (sem gap)
- [ ] Sem erros no console
- [ ] Sem tela de erro (#errorScreen)

### DESKTOP — View de Disciplinas
- [ ] Sidebar: link "📚 Disciplinas" visível
- [ ] Clicar → tela exclusiva com grid 4 colunas de disciplinas
- [ ] Cards coloridos com ícone, nome, progresso
- [ ] Clicar disciplina → módulos da disciplina
- [ ] Clicar módulo → aulas do módulo
- [ ] Hover nos cards tem efeito visual
- [ ] Ferramentas aparecem abaixo das disciplinas
- [ ] Back do browser volta corretamente
- [ ] "Dashboard" na sidebar restaura home

### GERAL
- [ ] Dark/light mode OK
- [ ] OFFLINE_MODE OK
- [ ] Zero erros no console
- [ ] SW_VERSION incrementado
- [ ] Build OK

## ARQUIVOS ALTERADOS

| Arquivo | Ação |
|---------|------|
| `app.html` (linha ~269) | Trocar `goDiscView()` por `goAulasTab()` no onclick |
| `app.js` (goAulasTab ~4000) | Adicionar setNav, pushState, guards para desktop |
| `app.js` (toggleDiscMobile ~4062) | Adicionar setNav, pushState para desktop |
| `app.js` (popstate handler) | Adicionar cases `aulas` e `disc` |
| `app.js` (buildSidebar ~162) | Simplificar para só atualizar subtítulo |
| `app.js` (toggleDiscGroup ~195) | REMOVER (não usado mais) |
| `app.css` (~1342) | disc-grid responsivo: 2/3/4 colunas por breakpoint |
| `app.css` (novo) | Desktop styling para #vAulas |
| `scripts/append-mobile-css.js` | Simplificar bloco mobile |
| `sw.js` | Incrementar SW_VERSION |

## RESUMO

A tela de disciplinas **JÁ EXISTE** no código (`#vAulas`, `goAulasTab()`, `renderDiscGrid()`). Não precisa criar nada novo. Só precisa:
1. Trocar 1 palavra no HTML: `goDiscView` → `goAulasTab`
2. Adaptar `goAulasTab()` para desktop (3 linhas extras)
3. CSS responsivo para grid maior no desktop
4. Limpar código morto (accordion antigo)
