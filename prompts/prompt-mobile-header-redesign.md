# Prompt para Claude Code — Redesign Mobile Header (Android + iOS)

Cole este prompt inteiro no Claude Code na raiz do projeto Escola Liberal.

---

## Contexto

A barra superior (mobile header) do app PWA Escola Liberal não está boa no Android e iOS. Preciso que você atue como um time de especialistas em UX mobile, design de interfaces e navegabilidade para recriar o header com qualidade profissional.

**Arquivos que você DEVE ler antes de qualquer alteração:**
- `app.html` (linhas 241-258: HTML do mobile header)
- `app.css` (linhas 1060-1097: CSS do mobile header + bottom nav)
- `app.css` (linhas 1250-1291: media queries mobile)
- `app.html` (linhas 43-64: inline critical CSS)
- `src/ui/mobile.js` (inteiro — lógica JS do header)
- `src/boot.js` (linhas 69-133 e 299-313: SW update detection + version bar)
- `CLAUDE.md` (regras invioláveis e política de atualização)

**Estado atual do header (problemas conhecidos):**
- Layout apertado demais — streak, XP, debate, check update, avatar e update button todos espremidos numa linha
- Em telas pequenas (320-375px) o conteúdo transborda ou trunca
- O botão de debate com emoji 💬 + texto + dot + counter ocupa espaço desproporcional
- O botão ↻ (check update) é confuso e redundante quando o 🔄 (apply update) já existe
- Hierarquia visual fraca — tudo tem o mesmo peso, nada se destaca
- Falta identidade visual — não parece uma barra de app profissional
- Safe areas funcionam, mas o padding geral é apertado

## Diretrizes de Design (OBRIGATÓRIAS)

### Princípios
1. **Menos é mais** — só o essencial no header. Informação secundária vai para o dashboard ou bottom sheet
2. **Toque fácil** — todo botão interativo tem no mínimo 44x44px de área de toque (guideline Apple/Google)
3. **Hierarquia clara** — o título/contexto é a informação primária; ações são secundárias
4. **Consistência** — seguir as cores e tipografia do projeto (var(--sage), var(--honey), DM Sans, JetBrains Mono)
5. **Performance** — zero JS extra para layout. CSS-only sempre que possível

### Estrutura recomendada do header

```
┌─────────────────────────────────────────────────┐
│ [←]  Título da tela        🔥 7   ⚡ 2.4k   [👤] │
└─────────────────────────────────────────────────┘
```

**Left:** Botão voltar (aparece contextualmente) + título da tela atual
**Right:** Streak (compacto) + XP (compacto) + Avatar/Perfil

### O que REMOVER do header
- **Botão Debate** → mover para o dashboard como card e/ou para a bottom nav (substituir o tab "Ranking" ou adicionar como 6º item se necessário). O debate é feature secundária, não precisa de espaço permanente no header.
- **Botão ↻ check update** → remover completamente. O polling de 60s já detecta updates automaticamente. Quando houver update, o 🔄 aparece. Não precisa de botão manual.
- **Label "XP"** → usar apenas o número com ícone (ex: ⚡2.4k em vez de "2450 XP"). Mais compacto.
- **Online count do debate** → não faz sentido no header

### O que MANTER no header
- Botão voltar (← ) com display:none contextual
- Título da tela (mhTitle) — truncar com ellipsis se necessário
- Streak 🔥 (número apenas, sem texto extra)
- XP ⚡ (formato abreviado: 2.4k, 15.2k)
- Avatar/Perfil 👤 (borda com cor da liga)
- Botão update 🔄 (aparece apenas quando há update disponível)

### CSS — Requisitos técnicos
- `position: fixed; top: 0;` com safe-area-inset-top
- Altura: 48px + safe-area (manter como está)
- `z-index: 6500` (manter — está acima de overlays menores)
- Background: `var(--bg-secondary)` (manter)
- Sem border-bottom, sem box-shadow (manter clean look atual)
- Garantir que `.main` continua com `top: calc(48px + env(safe-area-inset-top))`
- Testar que nenhum conteúdo fica atrás do header

### Bottom Nav — Ajuste do Debate
Se o debate for removido do header, adicionar acesso ao debate no dashboard (card destacado) OU no practice bottom sheet. O debate já existe como feature completa em `src/features/debate.js`, só precisa de um ponto de entrada acessível.

## Regras do CLAUDE.md que DEVEM ser respeitadas

1. **Não quebrar offline** — tudo deve funcionar sem internet
2. **Não remover funcionalidades** — debate continua acessível, só muda de lugar
3. **Incrementar SW_VERSION** no sw.js se alterar assets cacheados
4. **skipWaiting apenas no message handler** — NUNCA no install event
5. **Manter safe-areas** para iOS (env(safe-area-inset-*))
6. **Manter pull-to-refresh bloqueado** (overscroll-behavior-y: contain)
7. **Reportar alterações** arquivo por arquivo

## Execução

Execute direto. Altere os arquivos necessários:
1. `app.html` — simplificar o HTML do mobile-header
2. `app.css` — reescrever CSS do .mobile-header e .mh-* para o novo layout
3. `app.css` — ajustar media queries se necessário
4. `app.html` inline CSS — atualizar se a estrutura do header mudar
5. `src/ui/mobile.js` — ajustar `updateMobileHeader()` e remover lógica do debate header button
6. `src/ui/dashboard.js` — adicionar card/botão de acesso ao debate no dashboard (se removido do header)
7. `sw.js` — incrementar SW_VERSION

### Após as alterações:
- Listar tudo que mudou, arquivo por arquivo
- Confirmar que o botão de debate continua acessível (onde foi parar)
- Confirmar que XP e streak continuam visíveis
- Confirmar que o botão update 🔄 continua funcionando
- Testar mentalmente viewports: 320px, 375px, 390px, 414px, 768px

## Resultado esperado
Um header mobile clean, profissional, com hierarquia visual clara, que funciona perfeitamente em qualquer iPhone ou Android sem transbordar, truncar ou parecer amador.
