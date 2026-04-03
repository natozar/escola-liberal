# PROMPT: Correção Completa de Layout e Navegação — Mobile + Desktop

## CONTEXTO
Escola Liberal PWA. O app usa arquitetura modular em `src/` (Vite compila `src/main.js` como entry point). O `app.js` raiz também existe como fallback/legado. As correções devem ser feitas **nos dois lugares** quando a mesma função existe em ambos.

**IMPORTANTE:** Antes de alterar qualquer arquivo, LEIA-O primeiro. Verifique se o arquivo não está truncado (bytes nulos no final, conteúdo cortado). Se estiver, restaure do git com `git show HEAD:<arquivo>` antes de editar.

---

## FASE 0: VERIFICAÇÃO DE INTEGRIDADE

Antes de qualquer alteração, execute:

```bash
# Verificar se arquivos críticos estão truncados
for f in app.js app.css app.html sw.js src/main.js src/boot.js src/ui/mobile.js src/ui/sidebar.js src/core/state.js src/features/debate.js src/features/profiles.js supabase-client.js vite.config.js auth.html index.html perfil.html contato.html; do
  if [ -f "$f" ]; then
    node -e "const d=require('fs').readFileSync('$f');if(d.includes('\\0')){console.log('CORRUPTO: $f');process.exit(1)}" 2>/dev/null || echo "CORRUPTO: $f"
  fi
done
```

Para cada arquivo corrupto encontrado:
```bash
git show HEAD:"<arquivo>" > /tmp/fix && cp /tmp/fix "<arquivo>"
```

---

## FASE 1: CORREÇÕES EM `app.js` (monolítico)

### 1A. `goAulasTab()` — Adicionar suporte desktop + history

Localizar `function goAulasTab()` (por volta da linha 4000). Substituir por:

```javascript
function goAulasTab(){
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  if(typeof updateBottomNav==='function') try{updateBottomNav('aulas')}catch(e){}
  if(typeof updateMobileHeader==='function') try{updateMobileHeader('Disciplinas',false)}catch(e){}
  if(typeof _mobileBackFn!=='undefined') _mobileBackFn=null;
  renderDiscGrid();
  if(typeof closeSideMobile==='function') try{closeSideMobile()}catch(e){}
  if(typeof setNav==='function') setNav('nDisc');
  try{history.pushState({view:'aulas'},'')}catch(e){}
  try{
    var discs=new Set();
    M.forEach(function(m){discs.add(m.discipline||'economia')});
    var sub=document.getElementById('aulasSubtitle');
    if(sub) sub.textContent=discs.size+' disciplinas · '+M.length+' módulos · '+M.reduce(function(s,m){return s+m.lessons.length},0)+' aulas';
  }catch(e){}
  try{document.querySelector('.main').scrollTop=0}catch(e){}
}
```

### 1B. `toggleDiscMobile()` — Adicionar history support

Localizar `function toggleDiscMobile(disc)` (por volta da linha 4062). No final da função, ANTES do `}` de fechamento, adicionar:

```javascript
  if(typeof setNav==='function') setNav('nDisc');
  try{history.pushState({view:'disc',disc:disc},'')}catch(e){}
```

### 1C. `popstate` handler — Adicionar todos os cases

Localizar `window.addEventListener('popstate',function(e){` (por volta da linha 4245). Substituir o handler inteiro por:

```javascript
window.addEventListener('popstate',function(e){
  var s=e.state;
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

### 1D. `buildSidebar()` — Simplificar (remover accordion)

Localizar `function buildSidebar()` (por volta da linha 162). Substituir a função inteira (incluindo `toggleDiscGroup`) por:

```javascript
function buildSidebar(){
  try{
    var discs=new Set();
    M.forEach(function(m){discs.add(m.discipline||'economia')});
    var el=document.getElementById('discSubtitle');
    if(el) el.textContent=discs.size+' disciplinas · '+M.length+' módulos';
  }catch(e){}
}
function toggleDiscGroup(){} // stub — não mais usado
```

### 1E. `ui()` — Guard para nM* elements inexistentes

Dentro da função `ui()`, localizar o bloco que começa com `// Sidebar module progress` e faz `M.forEach((m,mi)=>{ const el=_origById('nM'+mi)`. Envolver todo o bloco forEach com:

```javascript
  var _modNav=_origById('modNav');
  if(_modNav && _modNav.style.display!=='none'){
    // ... o forEach existente ...
  }
```

---

## FASE 2: CORREÇÕES EM `src/ui/mobile.js`

### 2A. `updateBottomNav` fix

Localizar as duas chamadas `updateBottomNav('mod')` dentro de `goAulasTab()` e `toggleDiscMobile()`. Trocar ambas para `updateBottomNav('aulas')`.

---

## FASE 3: CORREÇÕES EM `app.css`

### 3A. Verificar se arquivo está truncado

O arquivo pode terminar no meio de uma regra CSS. Verificar se a última linha está completa. Se estiver cortado (ex: `.disc-grid-card[data-color` sem fechar), completar a regra.

### 3B. Adicionar responsive disc-grid (se ainda não existir)

No final do bloco de regras `.disc-grid-card`, ANTES do bloco mobile responsiveness, adicionar:

```css
.disc-grid-card[data-color="honey"]{border-color:var(--honey-muted)}.disc-grid-card[data-color="honey"]:hover{border-color:var(--honey)}
.disc-grid-card[data-color="rose"]{border-color:var(--rose-muted,#f9d4d4)}.disc-grid-card[data-color="rose"]:hover{border-color:var(--rose,#e57373)}
.disc-grid-card[data-color="lavender"]{border-color:var(--lavender-muted,#e0d4f5)}.disc-grid-card[data-color="lavender"]:hover{border-color:var(--lavender,#9575cd)}
.disc-grid-card[data-color="coral"]{border-color:var(--coral-muted,#fdd)}.disc-grid-card[data-color="coral"]:hover{border-color:var(--coral,#ff7043)}
.disc-grid-card[data-color="mint"]{border-color:var(--mint-muted,#d4f5e9)}.disc-grid-card[data-color="mint"]:hover{border-color:var(--mint,#66bb6a)}

/* Tools grid */
.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem;margin-bottom:2rem}
.tools-grid-item{display:flex;flex-direction:column;align-items:center;gap:.35rem;padding:.85rem .5rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);cursor:pointer;transition:all .2s var(--ease);text-align:center;font-size:.78rem;font-weight:600;color:var(--text-primary)}
.tools-grid-item:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
.tools-grid-item .tool-icon{font-size:1.5rem}

/* Responsive disc-grid: 3 cols tablet, 4 cols desktop */
@media(min-width:600px){.disc-grid{grid-template-columns:repeat(3,1fr);gap:1rem}}
@media(min-width:1024px){
  .disc-grid{grid-template-columns:repeat(4,1fr);gap:1.25rem}
  .disc-grid-card{min-height:155px;padding:1.5rem 1rem}
  .disc-grid-card .dg-icon{font-size:2.8rem}
  .disc-grid-card .dg-name{font-size:1rem}
  .tools-grid{grid-template-columns:repeat(5,1fr);gap:.85rem}
}
@media(min-width:901px){
  #vAulas{max-width:960px;margin:0 auto;width:100%;padding:1rem 0}
  .aulas-title{font-size:1.6rem;margin-bottom:1.5rem}
  .disc-grid-card .dg-meta{font-size:.78rem}
  .tools-title{font-size:.9rem;margin-top:1.5rem;margin-bottom:1rem}
  .tools-grid-item{padding:1rem .75rem;font-size:.85rem}
}
```

**IMPORTANTE:** Só adicionar se estas regras ainda NÃO existirem. Verificar com `grep "repeat(4,1fr)" app.css`.

---

## FASE 4: SW_VERSION

Incrementar `SW_VERSION` no `sw.js`. Verificar o valor atual e somar 1.

```bash
grep "SW_VERSION" sw.js
# Se for v66, mudar para v67. Atualizar CACHE_NAME e STATIC_CACHE também.
```

---

## FASE 5: VERIFICAÇÃO FINAL

### Build
```bash
npm run build
```

Se o build falhar com "unexpected token" ou "eof", significa que algum arquivo `src/` está truncado. Restaurar do git (Fase 0) e tentar novamente.

### Checklist manual

- [ ] Desktop: clicar "Disciplinas" na sidebar → mostra grid com 4 colunas
- [ ] Desktop: clicar numa disciplina multi-módulo → mostra módulos da disciplina
- [ ] Desktop: botão voltar do browser → retorna à view anterior
- [ ] Desktop: sidebar não tem accordion (só link "Disciplinas")
- [ ] Mobile: aba "Aulas" no bottom nav → mostra disciplinas em grid 2 colunas
- [ ] Mobile: todas as 5 abas (Início, Aulas, Praticar, Liga, Perfil) mostram conteúdo
- [ ] Mobile: header fixo no topo sem gap
- [ ] Mobile: debate button sem overflow cortado
- [ ] Console: zero erros de ReferenceError ou TypeError

---

## REGRAS

1. **Ler antes de alterar** — sempre ler o arquivo antes de editar
2. **Não quebrar mobile** — testar que bottom nav + views funcionam
3. **Não quebrar offline** — não adicionar dependências de rede
4. **Manter ambos app.js E src/** — o Vite usa src/, mas app.js é fallback
5. **Incrementar SW_VERSION** ao final
6. **Reportar alterações** — arquivo por arquivo com descrição
