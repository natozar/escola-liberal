Tarefa: Testar TUDO — cada botão, cada tela, cada navegação, login, debate, PWA no Android e iOS. Corrigir cada bug encontrado imediatamente. Leia app.js, app.html, app.css, sw.js, src/boot.js, manifest.json ANTES de testar. Execute sem perguntar. Commit e deploy ao final.

NÃO pule nenhum teste. NÃO assuma que funciona — VERIFIQUE.

---

### FASE 1 — ZERO ERROS NO CONSOLE

Iniciar o dev server e verificar:

```bash
npm run dev
```

Abrir cada página e capturar erros:

```
app.html    → zero erros, zero warnings
index.html  → zero erros, zero warnings
auth.html   → zero erros, zero warnings
perfil.html → zero erros, zero warnings
```

Se qualquer erro existir no console: CORRIGIR ANTES DE CONTINUAR.

Verificar especificamente:
- Nenhum "undefined is not a function"
- Nenhum "Cannot read properties of null"
- Nenhum 404 (fontes, JSON, CSS, JS, ícones)
- Nenhum "Failed to register ServiceWorker"
- Se OFFLINE_MODE = true: ZERO requests de rede (nenhum fetch para supabase, google, stripe, CDN)

---

### FASE 2 — TESTAR CADA BOTÃO (TODOS)

Abrir app.html e clicar em CADA elemento interativo. Para cada um, verificar que: executa a ação correta, não dá erro, e permite voltar.

#### Bottom Nav (5 botões)
- [ ] Botão 1 (Início) → goDash() → dashboard renderiza com módulos
- [ ] Botão 2 (Módulos) → renderiza lista/grid de módulos
- [ ] Botão 3 (central) → ação correta (verificar qual é)
- [ ] Botão 4 → ação correta
- [ ] Botão 5 (Menu) → abre menu/sidebar

Para cada botão: confirmar que o botão ativo muda de cor/estado visual.

#### Top Bar / Mobile Header
- [ ] Botão 💬 Debate → goDebate() → lista de 15 salas aparece
- [ ] Badge de online count no botão mostra número
- [ ] Botão de voltar (←) funciona em todas as sub-telas
- [ ] XP display atualiza corretamente
- [ ] Botão de tema (dark/light) funciona
- [ ] Botão de atualização (🔄) aparece SOMENTE quando há update pendente

#### Sidebar Desktop (>900px)
- [ ] Perfil (nome + avatar) aparece no topo
- [ ] Stats (XP, streak, level) corretos
- [ ] Link "Dashboard" → goDash()
- [ ] Link "Módulos" → lista módulos
- [ ] Link "Desempenho" → goPerf()
- [ ] Link "Conquistas" → goBadges()
- [ ] Link "Glossário" → goGlossary()
- [ ] Link "Flashcards" → goFlashcards()
- [ ] Link "Plano de Estudo" → goStudyPlan()
- [ ] Link "Jogo" → goGame()
- [ ] Link "Debate" (se existir no sidebar) → goDebate()
- [ ] Cada link navega sem erro e sem tela branca

---

### FASE 3 — FLUXO COMPLETO DO DEBATE

Testar o debate inteiro passo a passo:

```
PASSO 1: Clicar 💬 Debate no topo
→ VERIFICAR: lista de 15 salas renderiza
→ VERIFICAR: cada sala mostra ícone, nome, "🟢 X online"
→ VERIFICAR: bolinha verde pulsa (animação CSS)
→ VERIFICAR: grid é 1 coluna no mobile, 2 no tablet, 3 no desktop
→ Se FALHAR: debug e corrigir goDebate()

PASSO 2: Clicar na sala "Economia & Livre Mercado"
→ VERIFICAR: se não logado, área de login aparece (Google + Email)
→ VERIFICAR: mensagens mockadas são VISÍVEIS mesmo sem login
→ VERIFICAR: input está BLOQUEADO / não aparece
→ Se FALHAR: debug e corrigir goRoom() + isDebateAuthenticated()

PASSO 3: Fazer login (OFFLINE_MODE)
→ VERIFICAR: modal pede nome + seleção de avatar
→ VERIFICAR: avatares são clicáveis, selecionado fica com borda verde
→ VERIFICAR: nome mínimo 2 letras (testar com 1 letra → erro)
→ VERIFICAR: Enter no campo de nome confirma
→ VERIFICAR: botão "Entrar no Debate" confirma
→ VERIFICAR: modal fecha e chat abre com input liberado
→ Se FALHAR: debug e corrigir showDebateOfflineLogin() + confirmDebateOfflineLogin()

PASSO 4: Testar input de texto
→ VERIFICAR: campo de texto aparece, focável, teclado abre no mobile
→ VERIFICAR: digitar texto e apertar Enter → mensagem aparece no chat
→ VERIFICAR: botão Enviar → mensagem aparece no chat
→ VERIFICAR: campo limpa após envio
→ VERIFICAR: auto-scroll para última mensagem
→ VERIFICAR: mensagem mostra nome + avatar do login + hora correta
→ Se FALHAR: debug e corrigir sendDebateMessage() + appendDebateMessage()

PASSO 5: Testar botão de áudio (🎤)
→ VERIFICAR: botão existe e é clicável
→ VERIFICAR: ao clicar, pede permissão de microfone (ou mostra toast se não suportado)
→ VERIFICAR: durante gravação, ícone muda para 🔴 com animação
→ VERIFICAR: falar → texto transcreve no campo de input
→ VERIFICAR: clicar novamente para parar
→ Se FALHAR: debug e corrigir toggleDebateAudio()

PASSO 6: Testar moderação
→ VERIFICAR: enviar "merda" → BLOQUEADO com toast de aviso
→ VERIFICAR: enviar "meu whatsapp é 11999" → BLOQUEADO (dados pessoais)
→ VERIFICAR: enviar "concordo" → PERMITIDO (mensagem curta)
→ VERIFICAR: enviar "O livre mercado resolve?" → PERMITIDO (relevante)
→ Se moderação não existir ainda, IGNORAR (será implementada em prompt separado)

PASSO 7: Navegação de volta
→ VERIFICAR: botão voltar no chat → volta para lista de salas (goDebate)
→ VERIFICAR: botão voltar na lista → volta para dashboard (goDash)
→ VERIFICAR: botão voltar do Android/browser (history back) funciona
→ Se FALHAR: debug e corrigir history.pushState nos goDebate/goRoom
```

---

### FASE 4 — FLUXO DE AULAS

```
PASSO 1: No dashboard, clicar no módulo 0
→ VERIFICAR: lista de aulas do módulo aparece
→ VERIFICAR: cada aula mostra título e status (concluída/pendente)

PASSO 2: Clicar na aula 0 (primeira)
→ VERIFICAR: conteúdo da aula renderiza (texto + quiz)
→ VERIFICAR: sem tela branca, sem erro

PASSO 3: Responder quiz
→ VERIFICAR: opções são clicáveis
→ VERIFICAR: feedback aparece (certo/errado)
→ VERIFICAR: XP incrementa se acertou
→ VERIFICAR: aula marca como concluída

PASSO 4: Navegar entre aulas
→ VERIFICAR: botão "Próxima" (nextL) funciona
→ VERIFICAR: botão "Anterior" (prevL) funciona
→ VERIFICAR: swipe esquerda/direita funciona no mobile

PASSO 5: Features dentro da aula
→ VERIFICAR: TTS (🔊) lê o texto da aula em voz alta
→ VERIFICAR: Notas (📝) abre, digita, salva, persiste após fechar e reabrir
→ VERIFICAR: Favoritar (⭐) marca/desmarca aula
→ VERIFICAR: Voltar para módulo funciona
```

---

### FASE 5 — FLUXO DE LOGIN/AUTH

```
PASSO 1: Verificar estado inicial
→ Se OFFLINE_MODE = true: app abre sem pedir login
→ Se DEMO_MODE = true: todos módulos desbloqueados
→ VERIFICAR: nenhum redirect para auth.html no boot

PASSO 2: Clicar em Perfil
→ VERIFICAR: mostra prompt de login OU perfil do usuário
→ Se OFFLINE_MODE: mostra modal "Modo Apresentação"
→ Se online: mostra opções Google + Email

PASSO 3: Após login
→ VERIFICAR: nome e avatar atualizam no header/sidebar
→ VERIFICAR: XP e progresso carregam (do localStorage ou Supabase)
→ VERIFICAR: não há redirect loop (login → app → login → app)
→ VERIFICAR: debate input libera após login
```

---

### FASE 6 — PWA ANDROID (CRÍTICO)

Verificar tudo que afeta a experiência PWA no Android:

```
MANIFEST
- [ ] manifest.json tem: name, short_name, start_url, display: "standalone"
- [ ] manifest.json tem icons: 192x192 e 512x512 (PNG)
- [ ] manifest.json tem theme_color e background_color
- [ ] manifest.json tem scope: "/"
- [ ] Link para manifest no <head> de app.html e index.html

SERVICE WORKER
- [ ] sw.js registra sem erros
- [ ] CORE_ASSETS lista todos os arquivos essenciais
- [ ] Versão (SW_VERSION) incrementada após últimas mudanças
- [ ] skipWaiting APENAS no message handler (não no install)
- [ ] clients.claim() no activate
- [ ] Cache de lessons funciona (mod-0.json cacheia no primeiro acesso)
- [ ] Navegação offline funciona (desligar wifi → app continua rodando)

INSTALAÇÃO
- [ ] Prompt "Adicionar à tela inicial" aparece
- [ ] Após instalar: abre em standalone (sem barra do browser)
- [ ] Splash screen aparece com ícone e nome corretos
- [ ] Status bar tem cor do tema (theme_color)

ATUALIZAÇÃO
- [ ] Pull-to-refresh BLOQUEADO (overscroll-behavior-y: contain)
- [ ] Banner de update aparece quando há nova versão
- [ ] Botão "Atualizar" faz reload com nova versão
- [ ] Sem atualização automática forçada

NAVEGAÇÃO ANDROID
- [ ] Botão voltar do Android funciona (history.back)
- [ ] Não sai do app ao apertar voltar no dashboard (ou confirma saída)
- [ ] Bottom nav funciona com toque
- [ ] Swipe funciona para navegar aulas
- [ ] Teclado virtual não empurra layout (input de debate visível acima do teclado)
- [ ] Notch/câmera não sobrepõe conteúdo (safe-area)
```

---

### FASE 7 — PWA iOS SAFARI (CRÍTICO)

iOS Safari tem comportamentos únicos. Verificar:

```
META TAGS NO <HEAD>
- [ ] <meta name="apple-mobile-web-app-capable" content="yes">
- [ ] <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
- [ ] <meta name="apple-mobile-web-app-title" content="Escola Liberal">
- [ ] <link rel="apple-touch-icon" href="assets/icon-192.png"> (ou equivalente)
- [ ] <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">

SERVICE WORKER iOS
- [ ] SW registra no Safari (iOS 16.4+)
- [ ] Cache funciona (testar modo avião)
- [ ] Não há crash ao reabrir app após fechar

SAFE AREA (NOTCH + HOME INDICATOR)
- [ ] env(safe-area-inset-top) aplicado no top bar
- [ ] env(safe-area-inset-bottom) aplicado no bottom nav e no input de debate
- [ ] Conteúdo não fica atrás do notch
- [ ] Conteúdo não fica atrás do home indicator

TECLADO iOS
- [ ] Input de debate: teclado abre e campo fica visível
- [ ] Input de debate: teclado não sobrepõe o campo de texto
- [ ] Input de notas: idem
- [ ] Nenhum zoom ao focar input (font-size >= 16px nos inputs)

SCROLL iOS
- [ ] Sem bounce indesejado (overscroll-behavior)
- [ ] Scroll suave nas listas de módulos e salas de debate
- [ ] Scroll suave no chat de debate (mensagens)
- [ ] Sem "rubber band" ao fazer scroll para cima no topo

PRIVATE BROWSING
- [ ] App funciona no modo privado do Safari
- [ ] localStorage wrapper impede crash (quota exceeded)
- [ ] Sem tela branca ao abrir em modo privado

ADD TO HOME SCREEN
- [ ] Abrir em standalone mode funciona
- [ ] Ícone correto na home screen
- [ ] Nome correto abaixo do ícone
- [ ] Splash screen aparece ao abrir
```

---

### FASE 8 — RESPONSIVIDADE (8 VIEWPORTS)

Testar em cada tamanho de tela. Para cada viewport verificar: sem overflow horizontal, sem texto cortado, sem sobreposição, botões clicáveis.

```
320px (iPhone SE)
- [ ] Bottom nav cabe inteiro sem cortar texto
- [ ] Botão debate no topo visível (pode esconder label, manter ícone + count)
- [ ] Cards de módulo legíveis
- [ ] Cards de sala de debate legíveis
- [ ] Chat: input não cortado

375px (iPhone 12/13/14)
- [ ] Tudo acima OK
- [ ] Label "Debate" visível no botão do topo

390px (iPhone 14 Pro)
- [ ] Tudo OK

414px (iPhone 14 Plus)
- [ ] Tudo OK

768px (iPad Mini / Tablet)
- [ ] Grid de salas: 2 colunas
- [ ] Grid de módulos: ajusta para mais colunas
- [ ] Sidebar pode começar a aparecer (verificar breakpoint)

1024px (iPad Pro / Desktop small)
- [ ] Sidebar visível
- [ ] Bottom nav pode sumir (desktop usa sidebar)
- [ ] Mobile header pode mudar para desktop top bar
- [ ] Grid de salas: 2-3 colunas

1280px (Desktop medium)
- [ ] Layout desktop completo
- [ ] Sidebar + conteúdo principal lado a lado
- [ ] Grid de salas: 3 colunas

1920px (Desktop full HD)
- [ ] Sem esticamento excessivo (max-width no container principal)
- [ ] Conteúdo centralizado
- [ ] Tudo proporcional
```

---

### FASE 9 — DARK MODE COMPLETO

Ativar dark mode e verificar TODAS as telas:

- [ ] Dashboard: fundo escuro, texto claro, cards legíveis
- [ ] Módulo: fundo escuro, aula legível
- [ ] Debate lista: cards legíveis, bordas visíveis
- [ ] Debate chat: mensagens legíveis, input visível
- [ ] Debate login prompt: botões visíveis, modal legível
- [ ] Badges/conquistas: ícones visíveis
- [ ] Performance: gráficos legíveis
- [ ] Glossário/Flashcards: texto legível
- [ ] Perfil: campos visíveis
- [ ] Modais/toasts: fundo adequado, texto legível
- [ ] NENHUM texto branco em fundo branco
- [ ] NENHUM texto preto em fundo preto
- [ ] NENHUM fundo hardcoded (#fff ou #000) que deveria ser var(--bg) ou var(--card-bg)

Voltar para light mode e verificar que tudo restaura corretamente.

---

### FASE 10 — OFFLINE TOTAL

```
1. Desligar internet (modo avião ou desconectar wifi)
2. Recarregar app.html
→ VERIFICAR: app carrega do cache (não fica em branco)
→ VERIFICAR: dashboard aparece com módulos
→ VERIFICAR: XP e streak aparecem
→ VERIFICAR: pode navegar entre módulos
→ VERIFICAR: pode abrir aulas
→ VERIFICAR: pode responder quiz
→ VERIFICAR: debate mostra salas com contagem mockada
→ VERIFICAR: debate chat mostra mensagens mockadas
→ VERIFICAR: pode enviar mensagem offline (adiciona local)
→ VERIFICAR: zero erros no console
→ VERIFICAR: nenhum spinner infinito de loading

3. Religar internet
→ VERIFICAR: app continua funcionando sem reload
→ VERIFICAR: se online detection existe, barra/toast de "Você está online" aparece
```

---

### FASE 11 — PERFORMANCE

```bash
# Build de produção
npm run build

# Verificar tamanho do bundle
du -sh dist/
du -sh dist/app.js dist/app.css dist/lessons/

# Lighthouse
npx lighthouse http://localhost:4173/app.html --output=json --quiet --chrome-flags="--headless --no-sandbox" 2>/dev/null | node -e "
  const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const c=r.categories;
  console.log('Performance:', Math.round(c.performance.score*100));
  console.log('Accessibility:', Math.round(c.accessibility.score*100));
  console.log('Best Practices:', Math.round(c['best-practices'].score*100));
  console.log('SEO:', Math.round(c.seo.score*100));
"
```

Metas mínimas:
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 80
- SEO: > 80

Se algum score estiver abaixo, identificar o problema e corrigir.

---

### FASE 12 — SEGURANÇA DO BUILD

```bash
# Verificar que arquivos sensíveis NÃO estão no dist/
test ! -f dist/SECURITY-AUDIT.md && echo "✅ SECURITY-AUDIT.md ausente" || echo "❌ SECURITY-AUDIT.md NO BUILD"
test ! -f dist/admin-stripe.html && echo "✅ admin-stripe.html ausente" || echo "❌ admin-stripe.html NO BUILD"
test ! -f dist/admin-stripe-MSI.html && echo "✅ admin-stripe-MSI.html ausente" || echo "❌ admin-stripe-MSI.html NO BUILD"
test ! -d dist/.agents && echo "✅ .agents/ ausente" || echo "❌ .agents/ NO BUILD"
test ! -d dist/supabase && echo "✅ supabase/ ausente" || echo "❌ supabase/ NO BUILD"
test ! -d dist/scripts && echo "✅ scripts/ ausente" || echo "❌ scripts/ NO BUILD"
test ! -d dist/prompts && echo "✅ prompts/ ausente" || echo "❌ prompts/ NO BUILD"
```

Se qualquer arquivo sensível estiver no build, corrigir vite.config.js para excluir.

---

### CORREÇÃO DE BUGS

Para cada bug encontrado:
1. Classificar: P0 (crash/tela branca), P1 (feature quebrada), P2 (visual), P3 (cosmético)
2. Corrigir P0 e P1 IMEDIATAMENTE
3. Corrigir P2 se fix for < 5 linhas
4. Listar P3 para depois

---

### COMMIT E DEPLOY

```bash
git add -A
git commit -m "test+fix: full platform test — [N] bugs fixed across mobile/desktop/iOS/Android/dark-mode/offline/PWA"
git push origin main
```

### ANOTAR NO CLAUDE.md

```
### Último teste completo: 2026-04-03
- Plataformas: Chrome Android, Safari iOS, Chrome Desktop, Firefox Desktop
- Viewports: 320px-1920px
- Modos: dark/light, offline/online, OFFLINE_MODE true
- PWA: manifest OK, SW OK, install OK, offline OK
- Bugs corrigidos: [N]
- Score Lighthouse: Perf [X], A11y [X], BP [X], SEO [X]
```
