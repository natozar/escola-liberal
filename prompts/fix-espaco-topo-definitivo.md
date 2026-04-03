# PROMPT: ELIMINAR espaço vazio no topo de TODAS as telas mobile — DEFINITIVO

## O QUE ESTÁ ACONTECENDO

Em TODAS as telas do mobile (Início, Aulas, Ranking, Praticar, Perfil), metade superior da tela fica vazia. O conteúdo real só aparece na metade de baixo. O usuário precisa scrollar para ver qualquer coisa.

## CAUSA RAIZ DIAGNOSTICADA (3 problemas combinados)

### Problema 1: `challenge-banner` SEM CSS

Em `app.html` (linha ~369), dentro de `<main class="main">`, o PRIMEIRO elemento filho é:

```html
<div class="challenge-banner" id="challengeBanner" onclick="shareWhatsApp()">
  <div class="cb-left">
    <span class="cb-icon">🏆</span>
    <div class="cb-text">
      <div class="cb-title">Desafie um amigo agora!</div>
      <div class="cb-sub">Quem ganha mais XP esta semana?...</div>
    </div>
  </div>
  <span class="cb-arrow">→</span>
</div>
```

Este banner **NÃO TEM nenhuma regra CSS** em app.css. Zero. Nada. Ele fica como um div block com texto invisível (mesma cor do fundo? sem background definido?) **ocupando espaço vertical real** antes de todo o conteúdo.

### Problema 2: `.main` padding-top excessivo combinado

O `.main` no mobile tem:
```css
/* Linha ~1235 */
@media(max-width:900px){
  .main{padding:calc(50px + env(safe-area-inset-top,0px)) 1rem calc(68px + env(safe-area-inset-bottom,0px))!important}
}
```

Isso gera **50px de padding-top** (mínimo) para compensar o mobile-header fixo. Correto em tese, mas:
- O mobile-header real tem height ≈ 42-48px (sem notch)
- 50px já é mais do que necessário
- Somado ao banner invisível, gera um gap enorme

### Problema 3: Ranking sem layout

O leaderboard renderiza competidores com emojis, nomes e XP empilhados verticalmente em vez de horizontal. E a view também sofre do mesmo espaço vazio no topo.

---

## CORREÇÕES OBRIGATÓRIAS

### FIX 1: Estilizar o `challenge-banner` OU escondê-lo no mobile

**Opção A (RECOMENDADA): Estilizar como card compacto**

Adicionar no `app.css`, na seção mobile `@media(max-width:900px)`:

```css
.challenge-banner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:.5rem;
  padding:.6rem .85rem;
  margin-bottom:.5rem;
  background:linear-gradient(135deg,rgba(74,158,126,.15),rgba(74,158,126,.08));
  border:1px solid rgba(74,158,126,.25);
  border-radius:var(--r-lg,12px);
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
.cb-left{display:flex;align-items:center;gap:.5rem;min-width:0;flex:1}
.cb-icon{font-size:1.1rem;flex-shrink:0}
.cb-text{min-width:0;flex:1}
.cb-title{font-size:.78rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cb-sub{font-size:.65rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cb-arrow{font-size:.85rem;color:var(--sage);flex-shrink:0}
```

**Opção B (alternativa): Esconder no mobile se preferir**
```css
@media(max-width:900px){
  .challenge-banner{display:none}
}
```

Escolha A ou B. Se não souber, use **opção A**.

**TAMBÉM** adicionar regra para desktop (fora de media query):
```css
.challenge-banner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:.75rem;
  padding:.75rem 1rem;
  margin-bottom:1rem;
  background:linear-gradient(135deg,rgba(74,158,126,.12),rgba(74,158,126,.06));
  border:1px solid rgba(74,158,126,.2);
  border-radius:var(--r-lg,12px);
  cursor:pointer;
  transition:all .2s var(--ease);
}
.challenge-banner:hover{background:rgba(74,158,126,.18);border-color:rgba(74,158,126,.35)}
.cb-left{display:flex;align-items:center;gap:.6rem;min-width:0;flex:1}
.cb-icon{font-size:1.2rem;flex-shrink:0}
.cb-text{min-width:0}
.cb-title{font-size:.85rem;font-weight:700;color:var(--text-primary)}
.cb-sub{font-size:.72rem;color:var(--text-muted)}
.cb-arrow{font-size:1rem;color:var(--sage);flex-shrink:0}
```

### FIX 2: Reduzir padding-top do `.main` no mobile

Localizar a regra (linha ~1235 em app.css):
```css
.main{padding:calc(50px + env(safe-area-inset-top,0px)) 1rem calc(68px + env(safe-area-inset-bottom,0px))!important;
```

Trocar para:
```css
.main{padding:calc(48px + env(safe-area-inset-top,0px)) .75rem calc(64px + env(safe-area-inset-bottom,0px))!important;
```

Mudanças:
- `50px` → `48px` (header real é ~42-48px)
- `1rem` → `.75rem` (lateral mais compacta)
- `68px` → `64px` (bottom nav + safe area)

**TAMBÉM** verificar se existe uma SEGUNDA regra igual em `@media(max-width:600px)` (linha ~1269). Se existir, aplicar o mesmo fix:
```css
.main{padding:calc(48px + env(safe-area-inset-top,0px)) .5rem calc(64px + env(safe-area-inset-bottom,0px))!important}
```

### FIX 3: Verificar `scripts/append-mobile-css.js`

Abrir `scripts/append-mobile-css.js` e verificar se ele injeta alguma regra de `.main` padding. Se injetar, deve usar o mesmo valor `48px`.

Atualmente o script deveria ter apenas:
```css
@media(max-width:900px){
  .app-version-bar{display:none!important}
}
```

Se tiver QUALQUER outra regra para `.main`, `padding-top`, ou `margin-top`, **REMOVER**.

### FIX 4: Corrigir layout do Leaderboard (Ranking)

Ler o código que gera o ranking. Procurar em `app.js` por `renderLeaderboard` ou `goLeaderboard`. Também verificar `src/features/leaderboard.js` se existir.

O HTML gerado para cada competidor deve usar **flex row**, algo como:
```html
<div class="lb-row">
  <span class="lb-pos">1</span>
  <span class="lb-avatar">🏆</span>
  <span class="lb-name">Nome</span>
  <span class="lb-xp">78 XP</span>
</div>
```

Verificar se `.lb-row` ou `.lb-widget-row` tem `display:flex` no CSS. Se não tiver, adicionar:
```css
.lb-row,.lb-widget-row{
  display:flex;
  align-items:center;
  gap:.5rem;
  padding:.5rem .75rem;
  border-bottom:1px solid var(--border);
}
.lb-pos{width:24px;text-align:center;font-weight:700;font-size:.8rem;color:var(--text-muted);flex-shrink:0}
.lb-avatar{font-size:1.1rem;flex-shrink:0}
.lb-name{flex:1;font-size:.82rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-xp{font-size:.75rem;font-weight:700;color:var(--sage);flex-shrink:0}
```

### FIX 5: Header truncando texto

Procurar em app.css:
```css
.mh-title{...max-width:110px;...}
```

Trocar para:
```css
.mh-title{font-weight:700;font-size:.88rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;max-width:none}
```

A mudança chave: `max-width:110px` → `max-width:none` + `flex:1;min-width:0` para ocupar o espaço disponível.

### FIX 6: `.dash` padding no mobile

Verificar se `.dash` tem padding-top no mobile (linha ~1367). Se tiver `.5rem`, está ok. Se tiver mais, reduzir.

### FIX 7: Incrementar SW_VERSION

No `sw.js`, incrementar SW_VERSION em +1. Atualizar também CACHE_NAME e STATIC_CACHE.

---

## ORDEM DE EXECUÇÃO

1. **Ler** app.css, app.html, app.js (seção leaderboard), scripts/append-mobile-css.js
2. **Verificar integridade** — se algum arquivo estiver truncado, restaurar do git antes
3. **Aplicar FIX 1** (challenge-banner CSS)
4. **Aplicar FIX 2** (main padding-top)
5. **Aplicar FIX 3** (verificar append script)
6. **Aplicar FIX 4** (leaderboard layout)
7. **Aplicar FIX 5** (header title)
8. **Aplicar FIX 7** (SW version)
9. **Rodar build**: `npm run build`
10. **Verificar**: zero erros no build

---

## CHECKLIST FINAL

- [ ] Tela Início: conteúdo logo abaixo do header, SEM espaço vazio
- [ ] Challenge banner visível como card verde ou oculto (sem espaço fantasma)
- [ ] Tela Aulas: disciplinas visíveis imediatamente
- [ ] Tela Ranking: lista horizontal de competidores visível imediatamente
- [ ] Tela Praticar: conteúdo logo abaixo do header
- [ ] Tela Perfil: conteúdo logo abaixo do header
- [ ] Header mostra "escola liberal" completo (ou quase)
- [ ] Desktop: nada quebrou
- [ ] Console: zero erros

---

## REGRAS

1. **Ler ANTES de alterar** — verificar se arquivo não está truncado
2. **Não alterar design visual existente** — só preencher o que falta
3. **Manter offline-first** — sem dependências de rede
4. **Verificar AMBOS app.css E append-mobile-css.js** — o script pode sobrescrever
5. **Verificar AMBOS app.js E src/** — Vite usa src/, app.js é fallback
6. **Reportar** cada alteração: arquivo, linha, o que mudou
