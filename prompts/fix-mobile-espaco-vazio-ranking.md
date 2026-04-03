# PROMPT: Corrigir Espaço Vazio no Topo + Layout Ranking Quebrado (Mobile)

## EVIDÊNCIA (vídeo gravado no Android)

O vídeo mostra 3 problemas graves no mobile:

### BUG 1: ESPAÇO VAZIO ENORME NO TOPO (todas as telas)
- Na tela Início (dashboard), Aulas (disciplinas) e Ranking, a **metade superior da tela está completamente vazia** — sem conteúdo
- O conteúdo real (cards, grids, listas) só aparece na metade inferior
- O usuário precisa fazer scroll para ver qualquer coisa
- Isso indica que há um elemento invisível (ou padding/margin excessivo) empurrando o conteúdo para baixo

### BUG 2: TELA RANKING TOTALMENTE QUEBRADA
- Ao clicar na aba Ranking, a tela abre **vazia** (só fundo escuro)
- Após scroll, aparece a lista mas com **layout vertical** ao invés de horizontal
- Cada competidor mostra: emoji numa linha, nome na próxima, "0 XP" na próxima, posição na próxima
- O correto seria: uma fila horizontal `[posição] [emoji] [nome] ........... [XP]`

### BUG 3: HEADER TRUNCANDO TEXTO
- "escola li..." no header — deveria mostrar mais ou usar ícone
- "Disciplin..." quando entra na aba Aulas — deveria mostrar "Disciplinas" completo

---

## INSTRUÇÕES DE DIAGNÓSTICO

### Passo 1: Identificar o espaço vazio

Ler os seguintes arquivos e procurar o que causa o espaço vazio:

```
app.css — procurar por:
  - `.main` padding-top (pode estar com valor excessivo tipo 200px+)
  - `.mobile-header` height ou margin-bottom
  - `#vDash`, `#vAulas`, `#vRank` — qualquer padding-top, margin-top
  - Bloco mobile `@media(max-width:900px)` — verificar padding da `.main`
  - Verificar se `.app-version-bar` ainda ocupa espaço invisível

scripts/append-mobile-css.js — este script APPENDA CSS mobile no build.
  - Verificar se ele injeta padding-top excessivo na `.main`
  - Verificar se alguma regra !important está forçando espaço

app.html — verificar se existe algum div vazio ou spacer entre:
  - O `<header class="mobile-header">` e o `<main class="main">`
  - Dentro de `#vDash`, `#vAulas`, `#vRank` — algum container vazio no topo
```

**CAUSA PROVÁVEL:** A `.main` tem `padding-top` calculado para compensar o mobile-header fixo + version bar. Se a version bar está `display:none` no mobile, o padding está sobrando. Verificar a regra:
```css
.main { padding-top: calc(ALGO + env(safe-area-inset-top)) }
```
O valor deve ser apenas o suficiente para compensar o mobile-header (~56px + safe-area), não mais.

### Passo 2: Corrigir o padding da `.main` no mobile

A regra correta para mobile deveria ser:
```css
@media(max-width:900px){
  .main {
    padding-top: calc(52px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }
}
```

Onde:
- `52px` = altura do mobile-header (verificar o valor real medindo o header)
- `70px` = altura do bottom-nav
- NÃO incluir altura da version-bar (ela é `display:none` no mobile)

**IMPORTANTE:** Verificar TAMBÉM o `scripts/append-mobile-css.js` porque ele pode estar sobrescrevendo com `!important`. Se houver regra `.main{padding-top:...!important}` nesse script, ela precisa ser corrigida ou removida.

### Passo 3: Corrigir layout do Ranking (Leaderboard)

Ler o trecho de `app.js` (ou `src/features/leaderboard.js` se existir) que renderiza o ranking. Procurar por `renderLeaderboard` ou `goLeaderboard`.

O problema é que os itens do leaderboard estão sendo renderizados SEM layout horizontal. Verificar:

1. O HTML gerado para cada competidor — deve ser algo como:
```html
<div class="lb-row">
  <span class="lb-pos">1</span>
  <span class="lb-avatar">🏆</span>
  <span class="lb-name">Renato</span>
  <span class="lb-xp">78 XP</span>
</div>
```

2. O CSS de `.lb-row` ou equivalente — deve ter:
```css
.lb-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
}
```

Se os elementos estão empilhados verticalmente, falta `display:flex` ou `flex-direction:row` no container de cada competidor.

3. O leaderboard também pode ter espaço vazio no topo. Verificar padding/margin do container `#vRank` ou equivalente.

### Passo 4: Corrigir truncamento do header

No mobile header, o título está truncado com max-width muito pequeno. Procurar:
```css
.mh-title { max-width: 110px; }
```

Mudar para algo maior ou usar `flex:1;min-width:0` para ocupar o espaço disponível:
```css
.mh-title {
  flex: 1;
  min-width: 0;
  max-width: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## VERIFICAÇÃO APÓS CORREÇÃO

Rodar build: `npm run build`

Checklist:
- [ ] Tela Início: conteúdo começa logo abaixo do header, sem espaço vazio
- [ ] Tela Aulas: grid de disciplinas visível sem scroll
- [ ] Tela Ranking: lista aparece imediatamente, layout horizontal por competidor
- [ ] Tela Praticar: verificar que também não tem espaço vazio
- [ ] Tela Perfil: verificar que também não tem espaço vazio
- [ ] Header: "escola liberal" ou "Disciplinas" legíveis (não truncados a 5 letras)
- [ ] Console: zero erros

---

## REGRAS

1. **Ler os arquivos ANTES de alterar** — verificar integridade (sem bytes nulos/truncamento)
2. **Verificar AMBOS** app.css E scripts/append-mobile-css.js — o script pode sobrescrever com !important
3. **Verificar AMBOS** app.js E src/ — o Vite usa src/, app.js é fallback
4. **NÃO quebrar desktop** — as correções mobile devem estar dentro de `@media(max-width:900px)`
5. **Incrementar SW_VERSION** no sw.js ao final
6. **Rodar build** e confirmar sucesso
7. **Reportar** cada alteração: arquivo, linha, o que mudou
