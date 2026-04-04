# Prompt para Claude Code — PIN Gate de Acesso ao Site

Cole este prompt inteiro no Claude Code na raiz do projeto Escola Liberal.

---

## Contexto

Preciso trancar o acesso a todo o site com um PIN de segurança enquanto resolvo questões jurídicas. Qualquer pessoa que acessar qualquer página deve ver uma tela de PIN antes de ver o conteúdo. O PIN correto é **0606**. Após digitar o PIN correto, o acesso fica liberado por 24 horas (sessionStorage ou localStorage com timestamp).

**Leia o CLAUDE.md antes de qualquer alteração.**

## Requisitos funcionais

### Comportamento
1. Ao abrir QUALQUER página do site (index.html, app.html, auth.html, perfil.html, admin.html, blog.html, contato.html, termos.html, privacidade.html, sobre.html, offline.html), se o usuário NÃO tem PIN válido salvo, exibe a tela de PIN em fullscreen e bloqueia todo o conteúdo por trás.
2. O usuário digita 4 dígitos. Se for `0606`, desbloqueia e salva `escola_pin_ts` no localStorage com timestamp atual.
3. Nas próximas visitas, se `Date.now() - escola_pin_ts < 86400000` (24h), pula o PIN automaticamente.
4. PIN errado: shake animation no input + mensagem "PIN incorreto" por 2s. Não limita tentativas (é gate simples, não segurança bancária).
5. O overlay do PIN tem z-index altíssimo (99999) e cobre tudo incluindo header, nav, splash screen.

### Visual da tela de PIN
- Fundo: `#0f1729` (mesma cor do app, dark)
- Centralizado vertical e horizontal
- Logo/ícone: 📚 grande (3rem) + texto "Escola Liberal" em dourado (`#dba550`)
- Subtítulo: "Acesso restrito" em cinza claro
- Input: 4 campos individuais de 1 dígito cada (estilo OTP), `type="tel"`, `inputmode="numeric"`, `pattern="[0-9]"`, auto-focus no primeiro
- Auto-advance: ao digitar 1 dígito, pula para o próximo campo automaticamente
- Backspace: volta para o campo anterior
- Botão "Entrar" abaixo dos campos (ou submete automaticamente quando 4 dígitos preenchidos)
- Fonte: DM Sans (já carregada no projeto) ou system font como fallback
- Cores de acento: `#4a9e7e` (sage/verde) para o botão, `#dba550` (honey/dourado) para o logo
- Responsivo: funciona em 320px até desktop
- Animação de shake no erro (CSS @keyframes)

### Implementação técnica

**Criar arquivo `pin-gate.js`** na raiz do projeto com toda a lógica:
- Self-executing (IIFE)
- Injeta HTML + CSS do overlay via JS (não depende de CSS externo que pode não ter carregado)
- Verifica localStorage `escola_pin_ts` primeiro — se válido, não mostra nada
- Se inválido ou expirado, cria o overlay, bloqueia scroll do body
- PIN hardcoded como hash simples (não precisa ser seguro, é gate de apresentação)
- Ao desbloquear: remove overlay com fade-out, restaura scroll do body

**Incluir o script em TODAS as páginas HTML** antes de qualquer outro script:
```html
<script src="pin-gate.js"></script>
```

Deve ser o PRIMEIRO script a executar em cada página. Colocar logo após o `<body>` ou no `<head>` com defer=false.

**Páginas que precisam do script (TODAS):**
- index.html
- app.html
- auth.html
- perfil.html
- admin.html
- admin-stripe.html
- blog.html
- contato.html
- termos.html
- privacidade.html
- offline.html

### Service Worker
- Adicionar `pin-gate.js` ao CORE_ASSETS do sw.js para cachear
- Incrementar SW_VERSION
- Lembrar: skipWaiting APENAS no message handler, nunca no install

### O que NÃO fazer
- Não alterar a lógica de nenhuma feature existente
- Não mexer no fluxo de auth/login do Supabase
- Não usar framework ou dependência externa
- Não colocar o PIN no código de forma que apareça em texto claro facilmente (usar comparação simples, ex: `d[0]==='0'&&d[1]==='6'&&d[2]==='0'&&d[3]==='6'` ou um hash básico)
- Não quebrar o DEMO_MODE ou OFFLINE_MODE — o PIN gate roda ANTES de tudo, independente desses flags

### Testes mentais
Verificar que funciona nestes cenários:
1. Primeira visita → mostra PIN → digita 0606 → acessa o site → recarrega → não pede PIN de novo (24h)
2. PIN errado → shake → pode tentar de novo
3. Após 24h → pede PIN novamente
4. Abrir direto app.html ou auth.html → PIN aparece antes de qualquer conteúdo
5. Offline → PIN funciona (tudo é localStorage + JS inline)
6. iOS Safari + Android Chrome → input numérico abre teclado numérico

## Execução

Execute direto sem perguntar. Ao final, liste:
- Todos os arquivos criados/alterados
- Nova versão do SW
- Confirme que o PIN gate está em todas as páginas
