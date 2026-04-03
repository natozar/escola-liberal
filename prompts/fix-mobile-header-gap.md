# Prompt: Corrigir Espaço Vazio Acima do Header Mobile (iOS/Android)

## Problema
No mobile (Android e iOS), existe um espaço vazio do tamanho de uma barra acima do header principal. O header não está colado no topo da tela como deveria.

## Causa Raiz Identificada

Existe um **conflito de CSS entre dois locais**:

### 1. `app.css` (linha ~1200) — esconde a version bar no mobile:
```css
.app-version-bar{display:none!important}
```

### 2. `scripts/append-mobile-css.js` (linhas 128-136) — posiciona header ABAIXO da version bar:
```css
@media(max-width:900px){
  .app-version-bar{position:fixed;top:0;left:0;right:0;padding:.2rem .6rem calc(.2rem + env(safe-area-inset-top,0px));min-height:26px;font-size:.6rem}
  /* ... */
  .mobile-header{top:calc(26px + env(safe-area-inset-top,0px))!important}
  .main{padding-top:calc(90px + env(safe-area-inset-top))!important}
  .side.open{padding-top:calc(90px + env(safe-area-inset-top))}
  .global-progress{top:calc(82px + env(safe-area-inset-top))}
}
```

**O que acontece:** A version bar é `display:none!important` (invisível), MAS o mobile-header ainda tem `top:calc(26px + env(safe-area-inset-top))` — empurrando ele 26px pra baixo, criando o espaço vazio fantasma.

---

## Solução

### PASSO 1 — Corrigir `scripts/append-mobile-css.js`

Abrir `scripts/append-mobile-css.js` e localizar o bloco `@media(max-width:900px)` (linhas ~128-137).

**SUBSTITUIR** todo o bloco mobile da version bar por:

```javascript
// Dentro da string template do CSS mobile, substituir:

// DE (REMOVER TUDO ISSO):
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

// PARA (SUBSTITUIR POR ISSO):
@media(max-width:900px){
.app-version-bar{display:none!important}
.mobile-header{top:0!important}
.main{padding-top:calc(56px + env(safe-area-inset-top))!important}
.side.open{padding-top:calc(56px + env(safe-area-inset-top))}
.global-progress{top:calc(56px + env(safe-area-inset-top))}
}
```

**Explicação:**
- Version bar escondida no mobile (consistente com app.css)
- Mobile header colado no `top:0` (sem gap)
- `.main` padding = 56px (altura real do header) + safe-area
- `.side.open` e `.global-progress` alinhados com o header real

---

### PASSO 2 — Verificar `app.css` (regras existentes)

Abrir `app.css` e confirmar que estas regras estão corretas no bloco `@media(max-width:900px)` (~linha 1193):

```css
@media(max-width:900px){
  body{padding:0 env(safe-area-inset-right) 0 env(safe-area-inset-left)}
  .bottom-nav{display:flex}
  .mobile-header{display:flex}
  .app-version-bar{display:none!important}
  .main{padding:calc(64px + env(safe-area-inset-top)) 1rem calc(72px + env(safe-area-inset-bottom))!important;box-sizing:border-box;width:100%}
  .side{padding-bottom:calc(72px + env(safe-area-inset-bottom))}
  .side.open{top:0;padding-top:calc(64px + env(safe-area-inset-top))}
  .global-progress{top:calc(var(--mobile-header-h,56px) + env(safe-area-inset-top))}
  /* ... demais regras mobile ... */
}
```

**IMPORTANTE:** Se houver conflito entre app.css e append-mobile-css.js, **o append-mobile-css.js vence** porque seu CSS é injetado DEPOIS. Por isso o fix principal é no passo 1.

**Ajustar se necessário** — o `.main` padding-top no app.css diz `64px` mas o header real tem ~56px de conteúdo + safe-area via padding interno. Padronizar para `56px`:

```css
/* DENTRO do @media(max-width:900px) em app.css: */
.main{padding:calc(56px + env(safe-area-inset-top)) 1rem calc(72px + env(safe-area-inset-bottom))!important;box-sizing:border-box;width:100%}
.side.open{top:0;padding-top:calc(56px + env(safe-area-inset-top))}
```

---

### PASSO 3 — Confirmar que `.mobile-header` está com `top:0`

Em `app.css` (linha ~1010), a regra base já está correta:

```css
.mobile-header{display:none;position:fixed;top:0;left:0;right:0;...}
```

O problema é que o `!important` do append-mobile-css.js sobrescrevia para `top:calc(26px + ...)`. Após o PASSO 1, isso não acontece mais.

---

### PASSO 4 — Verificar variável CSS `--mobile-header-h`

Em `app.css` (linha ~29), existe:
```css
--mobile-header-h:56px;
```

Usar essa variável onde fizer sentido para manter consistência:

```css
/* Em app.css, substituir valores hardcoded por variável: */
.global-progress{top:calc(var(--mobile-header-h, 56px) + env(safe-area-inset-top))}
```

---

### PASSO 5 — Remover body padding-top residual

Verificar se NÃO existe nenhum `padding-top` ou `margin-top` no `body` ou `html` que crie espaço extra:

```css
/* CORRETO — body no mobile deve ser: */
body{padding:0 env(safe-area-inset-right) 0 env(safe-area-inset-left)}
/* NÃO pode ter padding-top no body */
```

Se encontrar `padding-top` ou `margin-top` no body em qualquer media query, **remover**.

---

### PASSO 6 — Rodar o build e verificar o CSS final

```bash
# Executar o script que gera o CSS final
node scripts/append-mobile-css.js

# OU se usa Vite:
npm run build
```

Depois do build, abrir `app.css` e buscar por `.mobile-header{top:` — deve existir SOMENTE:
- `top:0` (na regra base, sem !important)
- `top:0!important` (no media query mobile, do append script)

**NÃO deve existir** `top:calc(26px` em nenhum lugar.

---

### PASSO 7 — Verificar `app.html` — Apenas UM header mobile

Confirmar que existe apenas UMA tag header mobile:

```html
<!-- MOBILE HEADER — Single unified bar -->
<header class="mobile-header" id="mobileHeader">
  ...
</header>
```

A `div.app-version-bar#appVersionBar` é **apenas para desktop** (>900px). No mobile está `display:none!important`.

**NÃO deve existir** nenhum outro `<header>` ou div com `position:fixed;top:0` visível no mobile.

---

### PASSO 8 — Incrementar SW_VERSION

Em `sw.js`, incrementar a versão:

```javascript
// Localizar a linha:
const SW_VERSION = XX;
// Incrementar para:
const SW_VERSION = XX + 1;
```

---

## Checklist de Verificação Final

Após aplicar as correções:

- [ ] Mobile header colado no topo (top:0) sem espaço vazio
- [ ] Safe-area-inset-top respeitado dentro do header (padding interno)
- [ ] Conteúdo `.main` começa logo abaixo do header (sem gap, sem sobreposição)
- [ ] Version bar visível APENAS no desktop (>900px)
- [ ] Version bar `display:none!important` no mobile
- [ ] Sidebar `.side.open` alinhada com o header
- [ ] Bottom nav inalterada (sem regressão)
- [ ] Funciona em: iPhone (notch), iPhone SE (sem notch), Android variados
- [ ] Dark mode e light mode sem regressão
- [ ] Buscar no CSS final: `top:calc(26px` — NÃO deve existir
- [ ] SW_VERSION incrementado

## Arquivos Alterados

| Arquivo | Ação |
|---------|------|
| `scripts/append-mobile-css.js` | Fix principal: remover posicionamento da version bar mobile, header top:0 |
| `app.css` | Padronizar padding-top do .main para 56px + safe-area |
| `sw.js` | Incrementar SW_VERSION |

## Regra de Ouro

No mobile: **existe apenas UMA barra fixa no topo** = `.mobile-header` com `top:0`.
A `.app-version-bar` é **exclusiva do desktop**. Qualquer CSS que posicione o header abaixo da version bar no mobile está **errado**.
