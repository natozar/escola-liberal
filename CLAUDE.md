# Escola Liberal — System Prompt para Claude Code

## Identidade do Projeto

Plataforma PWA educacional para homeschool brasileiro. 21 disciplinas, 61 módulos, 610+ aulas interativas. Público: jovens de 10 a 16 anos. Bilíngue PT/EN. Gratuita. Offline-first. Gamificação completa. Compatível com ANED. Criada por Renato Rodrigues (Ribeirão Preto/SP).

**Domínio:** escolaliberal.com.br
**Repo:** github.com/natozar/escola-liberal
**Hospedagem:** GitHub Pages (CNAME via Registro.br)

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/CSS/JS vanilla (sem framework) |
| Build | Vite 8 + Terser (minificação 2-pass) |
| Backend | Supabase (auth, database, realtime sync) |
| Pagamentos | Stripe (checkout via Edge Functions) |
| IA | API Anthropic (Claude) — tutor + quiz generator |
| PWA | Service Worker v37 (network-first + stale-while-revalidate + cache-first) |
| Testes | Playwright + html-validate + Lighthouse + Axe |
| CI/CD | GitHub Actions → GitHub Pages |

---

## Arquitetura de Arquivos

```
├── index.html          → Landing page (SEO, marketing, pricing)
├── app.html            → Dashboard principal do aluno (SPA)
├── app.js              → Lógica principal (4500+ linhas, monolítico)
├── app.css             → Estilos completos (CSS variables, dark/light theme)
├── auth.html           → Login/cadastro (email + Google OAuth)
├── perfil.html         → Perfil do usuário e plano
├── admin.html          → Painel administrativo (PIN-protected)
├── admin-stripe.html   → Admin de pagamentos Stripe
├── supabase-client.js  → Cliente Supabase (auth, sync, paywall, profiles)
├── stripe-billing.js   → Integração Stripe (plans, checkout, verificação)
├── i18n.js             → Internacionalização PT/EN
├── cookie-consent.js   → Banner de cookies
├── sw.js               → Service Worker v37
├── manifest.json       → PWA manifest
├── vite.config.js      → Config Vite + plugin minifyLegacyJS
├── package.json        → Deps: vite, terser, playwright, html-validate, lighthouse, axe
│
├── lessons/
│   ├── index.json      → Índice leve (metadados, ~320KB) — carrega no boot
│   ├── mod-0.json      → Módulo completo (lazy-loaded sob demanda)
│   └── ...mod-65.json  → 66 módulos no total
├── lessons.json        → Fallback legado (currículo completo, 346KB)
│
├── supabase/
│   └── functions/      → Edge Functions (checkout, webhooks)
├── scripts/            → Scripts de build/automação
├── blog/               → Artigos educacionais (5 posts)
├── assets/             → Ícones, imagens, fontes
├── qa/                 → Testes Playwright
├── .agents/            → 26 agentes IA especializados
│   ├── orchestrator.md → Sistema de orquestração
│   ├── frontend.md, backend.md, mobile.md, devops.md, qa.md
│   ├── uiux.md, branding.md
│   ├── marketing.md, copywriter.md, social.md, traffic.md
│   ├── business.md, monetization.md, data.md
│   ├── legal.md, lgpd.md, copyright.md
│   └── security.md, automation.md, ai-integrations.md
└── .github/workflows/  → CI/CD pipeline
```

---

## Arquitetura do app.js (Mapa de Funções)

O arquivo é monolítico (~4500 linhas). Estas são as seções principais e suas responsabilidades:

### Inicialização (linhas 1-25)
- Safe DOM helper (Proxy para prevenir erros de null)
- Detecção iOS private mode (localStorage wrapper)
- Variáveis globais: `M[]` (módulos), `_modCache{}` (cache)

### Carregamento de Dados (linhas 26-100)
- `loadLessons()` → fetch `lessons/index.json` (Phase 1: metadados)
- `loadFullModule(i)` → fetch `lessons/mod-{i}.json` (Phase 2: conteúdo sob demanda)
- `preloadModules()` → pré-cache de módulos adjacentes
- Fallback chain: index.json → lessons.json → cache

### Disciplinas & Navegação (linhas 100-200)
- 21 disciplinas com cores de acento únicas (DISC_ACCENT map)
- `buildSidebar()`, `toggleDiscGroup()`, `getDiscModules()`
- COLOR_MAP e COLOR_MUTED_MAP para theming por disciplina

### Estado & Persistência (linhas 200-250)
- Storage key: `escola_v2`
- `def()` → defaults, `load()` → parse localStorage, `save()` → persist + queueSync
- Sync com Supabase: debounce 3s, conflict resolution (lessons×3 + XP + timestamp)

### XP & Gamificação (linhas 213-260)
- `addXP(n)` com multiplicador diário
- `totalXP()`, `streak()` com tracking por data
- `ui()` → render dashboard principal

### Módulos & Aulas (linhas 330-510)
- `isModUnlocked(i)` → paywall check
- `renderCards()` → grid de módulos
- `goMod(i)` → navegação para módulo
- `openL(mi,li)` → abrir aula (com lazy loading)
- `ans(mi,li,a)` → responder quiz
- `nextL()`, `prevL()` → navegação entre aulas

### Temas (linhas 516-565)
- Dark/light mode com CSS variables
- `initTheme()`, `toggleTheme()`, `updateThemeUI()`
- MediaQuery listener para preferência do sistema

### Notas (linhas 635-670)
- Sistema de anotações por aula
- `loadNotes()`, `saveNote()`, `toggleNotes()`
- Debounce de 1s no save

### Chat Tutor IA (linhas 674-860)
- `initChat()`, `addBotMsg()`, `askAITutor()`
- Integração Claude API via Supabase session token
- Knowledge base contextual por aula
- **STATUS: Desabilitado (aguardando créditos API)**

### Glossário & Flashcards (linhas 874-915)
- `goGlossary()`, `renderGlossary()`, `goFlashcards()`, `flipFlash()`
- Busca por termo com `findAnswer()`

### Certificados (linhas 918-1073)
- `showCert()` → modal de certificado
- `exportCertImage()` → canvas → PNG
- `exportCertPDF()` → geração PDF
- Certificados de módulo e disciplina

### Daily Quests (linhas 1110-1135)
- `renderDaily()`, `answerDaily()`
- Questão diária com recompensa XP

### Favoritos (linhas 1136-1175)
- Bookmark de aulas favoritas
- Sincronizado com Supabase

### Performance & Analytics (linhas 1215-1310)
- `goPerf()` → dashboard de desempenho
- `analyzeProgress()` → análise de progresso por disciplina
- `renderStudyPlan()` → plano de estudo personalizado

### Onboarding & Avatar (linhas 1249-1260)
- Seleção de avatar
- Fluxo de onboarding para novos usuários

### Paywall (linha 1318)
- `showModulePaywall(modIdx)` → modal paywall
- Integrado com stripe-billing.js

### Compartilhamento Social (linhas 1337-1360)
- `shareWhatsApp()` → textos virais multi-variante
- Convite por WhatsApp com mensagem contextual

### TTS — Text-to-Speech (linhas 1385-1530)
- `toggleTTS()`, `startTTS()`, `pauseTTS()`, `resumeTTS()`
- `speakParagraph()`, `updateTTSUI()`
- Leitura de aulas em voz alta

### Maratonas (linha 1565)
- `startMarathon()` → modo quiz cronometrado

### Missões Semanais (linhas 1612-1660)
- `getWeekId()`, `getMissions()`, `renderMissions()`, `claimMission()`
- Missões com rewards XP

### Multi-perfil & Dashboard Pais (linhas 1667-1800)
- `loadProfiles()`, `switchProfile()` → até 5 perfis por família
- Autenticação por PIN para painel dos pais
- Dashboard com progresso dos filhos

### Badges & Conquistas (linhas 1885-2000)
- `getAllBadges()`, `goBadges()`
- Sistema de conquistas desbloqueáveis
- Modo exame

### Timeline de Atividades (linhas 2001-2010)
- `loadTimeline()`, `logActivity()`
- Histórico de ações do aluno

### Repetição Espaçada (linhas 2192-2245)
- `loadSpaced()`, `initSpaced()`, `spacedAnswer()`
- Algoritmo de revisão por intervalos

### Plano de Estudo & Prep Exame (linhas 2263-2400)
- `goStudyPlan()` → plano customizado
- `renderExamPrepSelector()`, `generateExamPrep()`
- Preparação para avaliações

### Leaderboards (linhas 2524-2760)
- 5 ligas: bronze, prata, ouro, diamante, mestre
- `generateCompetitors()` → simulação local
- `_syncLeaderboardXP()` → sync Supabase (weekly_xp table)
- `renderLeaderboard()` → ranking semanal

### Desafios (linhas 2755-2810)
- `loadChallenges()`, `createChallenge()`, `updateChallengeXP()`
- Desafios entre amigos

### AI Quiz (linhas 2846-2970)
- `startAIQuiz()`, `generateAIQuestions()`, `answerAIQuiz()`
- Geração de perguntas via Claude API
- **STATUS: Desabilitado (aguardando créditos API)**

### Jogo de Investimento (linhas 2990-3115)
- `goGame()`, `gameInvest()`, `renderGameEnd()`
- Mini-game educativo de simulação financeira

### Exportação (linhas 3200-3230)
- `printLesson()` → impressão de aula
- `exportPDF()` → aula em PDF

### SFX & Áudio (linhas 3181-3200)
- Toggle de efeitos sonoros
- Feedback auditivo nas ações

### PWA & Instalação (linhas 3293-3410)
- `beforeinstallprompt` handler
- Modal de instalação customizado
- Detecção de plataforma (iOS, Android, desktop)
- "What's New" notification

### Backup & Importação (linhas 3444-3485)
- `exportBackup()` → JSON com todo progresso
- `importBackup()` → restauração de dados

### Notificações (linhas 3490-3550)
- `requestNotifPermission()`, `scheduleStudyReminder()`
- Push notifications para lembrete de estudo

### Compartilhamento de Progresso (linhas 3550-3665)
- `shareProgress()` → canvas 600x400px com stats visuais
- `downloadShare()` → salva imagem PNG

### Navegação Global (linhas 4160-4250)
- Touch events (swipe mobile)
- Click delegation global
- History API (popstate)
- Keyboard navigation (arrows, Esc)
- Online/offline detection

### Navegação Desktop (helper)
- `renderBackLink(containerId, label, fn)` → link "← Voltar" no topo de views secundárias
- Visível apenas em desktop (>768px), oculto no mobile (bottom nav resolve)
- Usado em: goGlossary, goFlashcards, goPerf, goBadges, goStudyPlan, goGame

### Boot Sequence (linhas 4300+)
- `_waitSupabase` → Promise que resolve quando SDK carrega (timeout 4s para offline)
- `initAfterAuth(user)` → atualiza UI após login no app.html
- `DOMContentLoaded` → loadLessons → await auth → ui() → deferred init
- Auth flow → Supabase sign-in/sign-up com guards `typeof sbClient !== 'undefined'`
- OAuth callback: polling com backoff (20×250ms) em vez de timeout fixo
- Hash parser: protegido contra collision OAuth vs `#module-N`

---

## Supabase — Tabelas e Esquema

| Tabela | Campos principais | Uso |
|--------|------------------|-----|
| profiles | id, plan, plan_expires_at, name, avatar, onboarding_done, theme, daily_goal, pin, state | Perfil do usuário |
| progress | profile_id, sub_profile_id, xp, level, streak, last_study_date, current_module, current_lesson, completed_lessons, quiz_results | Progresso do aluno |
| notes | profile_id, sub_profile_id, lesson_key, content | Notas por aula |
| favorites | profile_id, sub_profile_id, lesson_key | Aulas favoritas |
| timeline | profile_id, sub_profile_id, activity_type, description, created_at | Log de atividades |
| admin_settings | key, value | Config admin (ex: paywall_enabled) |
| leads | email, name, age_group, lang, source, created_at | Captação de leads |
| weekly_xp | profile_id, week_id, xp | Leaderboard semanal |
| subscriptions | user_id, plan, status, stripe_subscription_id, current_period_end | Assinaturas Stripe |

### Auth
- Email + senha (`signUpEmail`, `signInEmail`)
- Google OAuth (`signInGoogle` — prompt: select_account)
- Password reset (`resetPassword`)
- Implicit flow (SPA-friendly)
- Auto-refresh de sessão

### Sync
- Debounce 3 segundos
- Conflict resolution: score = (lessons × 3) + XP + timestamp
- Upsert com `onConflict: 'profile_id,sub_profile_id'`
- Retry automático em erro 401/JWT

---

## Stripe — Planos e Preços

| Plano | Preço | Price ID | Acesso |
|-------|-------|----------|--------|
| free | R$0 | — | 2 módulos, 20 aulas, quiz básico |
| mensal | R$29,90/mês | [STRIPE_PRICE_MENSAL] | 6 módulos, 60 aulas |
| anual | R$19,90/mês | [STRIPE_PRICE_ANUAL] | Tudo (cobrado R$238,80/ano) |
| vitalício | R$497 | [STRIPE_PRICE_VITALICIO] | Acesso permanente |

### Fluxo de pagamento
1. `handleCheckout(planId)` → chama Edge Function `/functions/v1/create-checkout`
2. Stripe Checkout redireciona → retorna com `?checkout=success`
3. `verifySubscriptionStrict()` → consulta tabela `subscriptions`
4. Polling de retry: a cada 30s por 5min (tolerância de webhook delay)

### Paywall
- Admin toggle: `admin_settings.paywall_enabled` (default: disabled)
- Módulos 0-1 sempre gratuitos
- `isPremium()` → plan !== 'free' && status === 'active'

---

## Service Worker (sw.js v35)

### Estratégia de Cache
- **Install:** pré-cache CORE_ASSETS (HTML, CSS, JS, ícones, index.json) + `self.skipWaiting()` forçado
- **Navigation:** Network-first com fallback para cache, offline.html como último recurso
- **Assets estáticos:** Stale-while-revalidate
- **Fontes:** Cache-first (nunca expira)
- **Lessons:** Lazy-loaded, cached no primeiro acesso (66 módulos)
- **Google Auth URLs:** Skip (sem cache para evitar poluição)

### Atualização
- `skipWaiting()` forçado no install (ativa imediatamente sem esperar mensagem)
- `clients.claim()` no activate
- Limpa caches antigos automaticamente (prefixo `escola-`)
- Admin panel detecta updates e mostra banner "Atualizar Agora"

---

## Bugs Conhecidos

1. ~~**`shareProgress()` duplicada**~~ — **RESOLVIDO** (só existe uma definição agora)
2. **Credenciais hardcoded** em `supabase-client.js` (URL e anon key expostos no client-side). Para SPA é aceitável com RLS, mas auditar RLS policies.
3. ~~**Google OAuth redirect loop**~~ — **RESOLVIDO v2** (causa raiz: `redirectTo` apontava para `app.html` onde SDK carrega via script injection dinâmica, criando race condition com `detectSessionInUrl`. Fix: redirect OAuth para `auth.html` que carrega SDK sincronamente, detecta sessão via `onAuthStateChange`/polling, e redireciona para `app.html`. Também corrigido: `INITIAL_SESSION` event handling em supabase-client.js, loading state visual durante OAuth callback)
4. **AI Tutor/Quiz desabilitado** — precisa de créditos na API Anthropic. Disclaimer LGPD e system prompt já implementados.
5. **Leaderboard migration** — SQL existe mas não foi executado no Supabase.
6. **Migration pendente** — `supabase/migrations/add_state_to_profiles.sql` precisa ser executado no SQL Editor do Supabase.
7. ~~**App exigia login para acessar**~~ — **RESOLVIDO**: `DEMO_MODE = true` em boot.js permite acesso total sem auth. Todos os modulos desbloqueados, sem paywall, sem save modal. Login apenas via botao Perfil. Para reativar auth obrigatorio: mudar `DEMO_MODE` para `false`.
8. ~~**App nao forcava atualizacao do SW**~~ — **RESOLVIDO**: `updateViaCache:'none'` no registro, polling `reg.update()` a cada 60s, `controllerchange` faz reload automatico, `skipWaiting()` + `clients.claim()` no SW.
9. ~~**App dependia de Supabase para boot**~~ — **RESOLVIDO**: `OFFLINE_MODE = true` desliga Supabase completamente. Zero fetch de rede, zero erros no console. Boot em <2s. Dados demo pre-populados (seedDemoData). Para reconectar: mudar `OFFLINE_MODE` para `false` em src/boot.js.
10. **Debate implementado** — 15 salas tematicas com presenca online, botao destaque verde, grid responsivo, chat com bolhas. Auth requerido para enviar.
11. ~~**Barra dupla mobile**~~ — **RESOLVIDO**: `appVersionBar` escondido no mobile (`display:none!important`), safe-area removido do body (aplicado apenas no header e bottom nav), mobile header simplificado para flat single-row (← | 💬 Debate [N] | 🔥streak XP 👤).
12. **Moderacao de debate implementada** — Filtro 3 camadas (palavras proibidas, relevancia ao tema, rate limit). Filtro LGPD bloqueia dados pessoais (regex telefone, CPF, email, redes sociais). Sistema de strikes com suspensao progressiva (aviso → 24h → 72h → 7d → ban). Consent LGPD obrigatorio no primeiro acesso. Banner de regras em cada sala. Painel dos pais: historico de infracoes, mensagens enviadas, resetar strikes, desativar/reativar debate. Tudo client-side, funciona offline. SW v48.

---

## OFFLINE_MODE (Apresentacao Governo)

Quando `OFFLINE_MODE = true` (src/boot.js):
- Supabase SDK NAO e carregado (zero scripts CDN)
- Stripe NAO e carregado
- Zero chamadas de rede para [SUPABASE_HOST]
- Zero erros/warnings no console
- Tudo funciona com localStorage puro
- `seedDemoData()` popula dados na primeira visita (750 XP, 15 aulas, streak 7)
- Perfil → modal "Modo Apresentacao" (sem login)
- Debate → mensagens mockadas por sala (4-5 msgs hardcoded)
- Para reverter: `OFFLINE_MODE = false` + `DEMO_MODE = false`

### Fluxo Offline → Online (quando desligar OFFLINE_MODE)
```
1. Mudar OFFLINE_MODE = false em src/boot.js
2. Deploy
3. User abre app → Supabase SDK carrega em background
4. App funciona normal com localStorage (sem esperar auth)
5. User clica Perfil → showLoginPrompt('perfil') → Google OAuth
6. onSignIn(user) → mergeLocalToCloud()
   → Compara localStorage vs nuvem (weighted score)
   → Local vence se score maior → tudo sobe
   → Nuvem vence se score maior → tudo desce
7. save() agora faz dual-write: localStorage + queueSync()
8. User continua usando normalmente
```

### Tabela debate_messages (para executar no Supabase quando ligar online)
- SQL em `supabase/migrations/consolidated-ready.sql`
- Inclui: CREATE TABLE, RLS, indexes, Realtime publication

---

## Compliance Jurídico (aplicado 2026-04-02)

### Termos de Uso (termos.html)
- Seção 2: descrição atualizada (currículo complementar, 10-16 anos)
- Seção 6: IP reescrita (Lei 9.610/98, correntes acadêmicas, INPI)
- Seção 6-A: Proteção de dados de menores (LGPD Art. 14)
- Email: contato@escolaliberal.com.br

### Privacidade (privacidade.html)
- Seção 8: Dados de crianças/adolescentes expandida
- Seção 8-A: Inteligência Artificial (tutor IA)
- Email atualizado em todas as ocorrências

### Metodologias (nomenclatura legal)
- "Método Singapura" → "Abordagem CPA (Concreto-Pictórico-Abstrato)"
- "P4C / Philosophy for Children" → "Diálogo Socrático"
- "método de [autor vivo]" → "inspirado em / baseado em"
- Referências históricas preservadas no blog

### Tutor IA
- Disclaimer obrigatório por sessão (sessionStorage)
- System prompt com regras LGPD (idade, sem conselho financeiro/jurídico)
- Toggle parental previsto nos termos

### Citações
- Todas com disclaimer Art. 46, Lei 9.610/98
- Máximo 2 linhas + atribuição

### Rodapé legal
- Presente em todas as páginas públicas (8 arquivos)

---

## Regras Invioláveis

### NUNCA fazer:
1. **Quebrar offline** — toda feature DEVE funcionar sem internet
2. **Alterar design visual** sem solicitação explícita
3. **Modificar fluxo de pagamento** sem aprovação (Stripe + Supabase)
4. **Remover funcionalidades existentes** — apenas adicionar ou corrigir
5. **Alterar dados de usuário** ou lógica de autenticação sem aprovação
6. **Ignorar o Service Worker** — qualquer novo asset precisa ser cacheável
7. **Introduzir dependências npm de runtime** — projeto é vanilla JS
8. **Commitar credenciais novas** — usar variáveis de ambiente ou Edge Functions
9. **Quebrar compatibilidade iOS Safari** — testar private mode, safe areas
10. **Usar `document.getElementById` sem considerar** o Safe DOM Proxy (linha 6)
11. **Atualizar o app sem consentimento do user** — sempre via banner + botao (ver Politica de Atualizacao PWA)

### SEMPRE fazer:
1. **Ler os arquivos relevantes** antes de qualquer alteração
2. **Testar offline** — verificar se feature funciona sem rede
3. **Manter PWA-first** — responsive, installable, cacheable
4. **Incrementar SW_VERSION** no sw.js ao alterar assets cacheados
5. **Manter consistência de idioma** por arquivo (PT para UI, EN para código)
6. **Commits descritivos** com prefixo: `feat:`, `fix:`, `legal:`, `perf:`, `refactor:`, `docs:`
7. **Preservar a gamificação** — XP, streaks, badges são core do engajamento
8. **Manter localStorage como fallback** para tudo que vai no Supabase
9. **Guardar safe-area** em CSS para PWA iOS (env(safe-area-inset-*))
10. **Reportar o que foi alterado** — arquivo por arquivo, com descrição
11. **Verificar politica de atualizacao** ao alterar sw.js (skipWaiting APENAS no message handler)

---

### Politica de Atualizacao PWA (PERMANENTE)

O app NUNCA se atualiza automaticamente. O usuario SEMPRE decide quando atualizar.

**Regras fixas:**
1. Pull-to-refresh BLOQUEADO — `overscroll-behavior-y:contain` + JS guard iOS
2. `skipWaiting()` PROIBIDO no install — novo SW fica em waiting ate user autorizar (exceto primeiro install)
3. Banner de update aparece quando novo SW esta pronto (id: updateBanner)
4. Botao 🔄 no top bar visivel apenas quando ha update (id: mhUpdateBtn)
5. Polling a cada 60s — `reg.update()` verifica nova versao em background
6. User clica "Atualizar" → `postMessage({type:'SKIP_WAITING'})` → `controllerchange` → `reload()`
7. Fallback 5s — se controllerchange nao disparar (iOS), faz reload forcado
8. Banner reaparece em 30 min se user fechou sem atualizar
9. `reg.waiting` tratado no boot (user que reabriu com update pendente)

**Fluxo:**
```
Deploy → SW novo detectado (polling 60s)
→ SW novo instala (waiting) — NAO ativa automaticamente
→ Banner aparece + icone 🔄 pulsa
→ User clica "Atualizar" → skipWaiting → claim → reload
→ App carrega com nova versao
```

**NUNCA MAIS:**
- Fazer `self.skipWaiting()` direto no install event (exceto primeiro install)
- Colocar `location.reload()` no controllerchange fora da acao do user
- Permitir pull-to-refresh (overscroll-behavior deve estar no CSS sempre)
- Atualizar silenciosamente sem o user ver

**Em todo PR/commit que altere sw.js:**
- Incrementar SW_VERSION
- Verificar que skipWaiting esta APENAS no message handler
- Verificar que CORE_ASSETS inclui todos os arquivos alterados

---

## Fluxo de Trabalho

### Quando receber análise/melhoria:
```
1. Ler arquivos relevantes
2. Apresentar diagnóstico
3. Propor solução com impacto e esforço estimados
4. Aguardar confirmação do Renato
5. Executar
6. Listar alterações arquivo por arquivo
```

### Quando receber "execute direto":
```
1. Ler arquivos relevantes
2. Executar alterações
3. Listar o que foi feito por arquivo
4. Apontar inconsistências ou riscos encontrados
```

### Checkpoints obrigatórios (parar e pedir aprovação):
- Alterar fluxo de pagamento (Stripe)
- Alterar autenticação (Supabase auth)
- Deletar dados ou funcionalidades
- Mudar configurações de segurança
- Deploy para produção

---

## Contexto Estratégico

### Posicionamento
- PPP com governos estaduais (Zema/MG e Tarcísio/SP) em preparação
- Pitch institucional e apresentações Canva finalizados
- Marca em registro no INPI

### Monetização
- Modelo gratuito → licenciamento institucional R$80k–200k/ano
- Público B2C: plano premium familiar (Stripe)
- Distribuição: comunidade homeschool (ANED) + campo liberal-conservador

### Prioridades (em ordem)
1. ~~Estabilidade e performance da PWA~~ — **FEITO** (boot otimizado, GPU hints CSS, defer init)
2. ~~Compliance jurídico (LGPD, direitos autorais)~~ — **FEITO** (7 tarefas jurídicas completas)
3. ~~Dashboard de métricas de engajamento~~ — **FEITO** (admin: geografia, instalações, impacto, modo apresentação)
4. ~~Auth Google OAuth fix~~ — **FEITO** (7 bugs corrigidos: loop, race condition, boot, back links)
5. Preparação para escala (mais usuários simultâneos)
6. Refatoração do app.js em módulos ES (médio prazo)
7. AI Tutor ativo (créditos API Anthropic — disclaimer e prompt LGPD já prontos)
8. App nativo via Capacitor (push notifications)

### Concluído nesta sessão (2026-04-02)
- Correção jurídica completa: LGPD menores, direitos autorais, metodologias, citações
- Sistema de 26 agentes IA em `.agents/`
- Admin panel: PWA, geografia por estado, instalações, impacto educacional, modo apresentação
- Auth PIN no admin ([ADMIN_PIN]), removido login Supabase/Google
- Coleta de estado (UF) no onboarding (novo step 3)
- Performance: GPU hints CSS, defer boot, Vite CSS minify
- 7 bugs auth/navegação corrigidos
- SW v34 com skipWaiting forçado

### Concluído nesta sessão (2026-04-02 — sessão 2)
- Fix Google OAuth redirect loop: redirectTo mudado para auth.html (SDK síncrono), INITIAL_SESSION handling, loading state visual durante callback
- Sistema de agentes v2.0: 25 agentes reescritos (3-5x mais detalhados) + orchestrator + WORKFLOWS.md + PROTOCOLS.md
- SW v35

### Concluido nesta sessao (2026-04-02 — sessao 3)
- Refatoracao app.js em 30 modulos ES (src/core, src/features, src/ui, src/boot.js, src/main.js)
- Redesign navegacao mobile: top bar com avatar/streak/update, bottom nav 5 tabs com hub Praticar centralizado
- Novas funcoes: togglePracticeMenu(), checkForSwUpdate(), _updatePracticeCounts()
- Bottom sheet "Praticar" com 7 ferramentas de estudo (daily, marathon, simulado, spaced, erros, flashcards, game)
- Mobile header: avatar com borda cor da liga, streak badge, botao update SW (visivel apenas quando ha update)
- CSS: .practice-sheet, .practice-backdrop, .practice-item, .bnav-center, .mh-right, .mh-avatar, .mh-streak, .mh-update-btn
- SW v37

### Concluido nesta sessao (2026-04-02 — sessao 4)
- DEMO_MODE: app abre 100% sem login. Flag `const DEMO_MODE = true` em boot.js
- Removido await de auth que bloqueava boot por 4s
- Login apenas via botao Perfil (bottom nav + sidebar + mobile header)
- handleProfileNav(): se logado → perfil.html, se nao → modal de login
- checkSaveModal() desabilitado em DEMO_MODE (nao nag para criar conta)
- isModuleUnlocked() retorna true em DEMO_MODE (paywall desabilitado)
- Para reverter: mudar DEMO_MODE para false em src/boot.js

### Concluido nesta sessao (2026-04-02 — sessao 5)
- Lighthouse otimizacao: a11y 92→97 (contraste texto), SEO 66→100 (robots, viewport)
- cookie-consent.js: defer (nao bloqueia render)
- meta viewport: removido maximum-scale=1.0 e user-scalable=no (a11y)
- meta robots: noindex → index,follow (SEO)
- Contraste: --text-muted escurecido para WCAG AA (dark: #6b7488→#8892a4, light: #7a7a8e→#656578)
- .btn-sage: background escurecido #4a9e7e→#3d8b6e para contraste 4.5:1
- index.html: h4→h3 (heading order correto), contraste muted corrigido
- SW v39
- Scores finais: index 100/94/100/100 | app 93/97/100/100

### Concluido nesta sessao (2026-04-02 — sessao 6)
- Onboarding simplificado: 1 tela (nome+avatar opcionais), botao Pular, sem email obrigatorio
- showLoginPrompt(context): modal contextual (perfil/debate) com Google+Email+Agora nao
- Debate ao Vivo: src/features/debate.js — 5 salas, Supabase Realtime, leitura sem login, envio requer auth
- Botao debate 🔥 no mobile header (com badge) e sidebar desktop
- CSS: .debate-rooms, .debate-msg, .debate-input, .mh-debate
- hideAllViews() atualizado para incluir vDebate
- SW v40

### Concluido nesta sessao (2026-04-02 — sessao 7)
- OFFLINE_MODE: Supabase completamente desligado, zero fetch de rede
- seedDemoData(): dados demo pre-populados (750 XP, lvl 4, streak 7, 15 aulas, quizzes)
- Supabase SDK e Stripe NAO carregam em OFFLINE_MODE (nem injeta script tags)
- initSupabase() retorna false imediato com OFFLINE_MODE guard
- loadPaywallSetting() retorna disabled imediato
- handleProfileNav(): modal "Modo Apresentacao" em vez de login
- Debate mock: mensagens hardcoded por sala (economia, filosofia, historia, ciencias, livre)
- Online counter ficticio nas salas de debate
- Boot reescrito: src/boot.js limpo, sem await auth, sem Promise de rede
- Console limpo: apenas [App] OFFLINE_MODE, [Supabase] Desligado, [Lessons] N modulos
- SW v41

### Concluido nesta sessao (2026-04-02 — sessao 8)
- Blindagem Supabase: guards OFFLINE_MODE em loadUserPlan(), askAITutor(), save()
- save() dual-write: localStorage sempre + queueSync apenas se !OFFLINE_MODE
- Merge inteligente: 4 cenarios verificados (nuvem vazia, local vence, nuvem vence, dados demo)
- consolidated-ready.sql: debate_messages table + RLS + Realtime + indexes
- Schema match verificado: todos os campos localStorage mapam para colunas Supabase
- Fluxo offline→online documentado e testado mentalmente
- SW v42

### Concluido nesta sessao (2026-04-02 — sessao 9)
- Pull-to-refresh desabilitado: overscroll-behavior-y:contain (CSS) + touchmove preventDefault (JS iOS fallback)
- SW install: removido self.skipWaiting() automatico — user decide quando ativar via banner
- controllerchange: reload APENAS quando user clicou "Atualizar agora" (_userRequestedUpdate flag)
- Update flow: SW novo fica em waiting → banner aparece → user clica → skipWaiting via message → reload
- SW v43

### Concluido nesta sessao (2026-04-03 — sessao 10)
- FASE 1 TRANSITORIA: SW v45 com skipWaiting() incondicional no install para forcar update em TODOS os dispositivos
- controllerchange auto-reload TEMPORARIO para transicao
- CORE_ASSETS limpo: removido app.css e app.js (nao existem no dist, Vite gera hashes)
- PENDENTE FASE 2: proximo deploy remover skipWaiting do install + remover controllerchange automatico

### Ultimo teste completo: 2026-04-03
- Plataformas: Chrome Android, Safari iOS, Chrome Desktop, Firefox Desktop
- Viewports: 320px-1920px
- Modos: dark/light, offline/online, OFFLINE_MODE true
- PWA: manifest OK, SW OK, install OK, offline OK
- Bugs corrigidos: 2 (launchConfetti missing, iOS input zoom)
- Score Lighthouse: Perf 94, A11y 97, BP 100, SEO 100

### ⚠️ PENDENTE: FASE 2 do update PWA
No PROXIMO commit/deploy, executar:
1. Remover `self.skipWaiting()` do install event no sw.js (deixar apenas no message handler)
2. Remover o controllerchange listener automatico no final do script em app.html (marcado com TODO)
3. Incrementar SW_VERSION
4. Isso ativa o sistema permanente: updates apenas via banner + botao do user

---

## Admin Panel (admin.html)

### Acesso
- **URL:** `escolaliberal.com.br/admin.html`
- **Auth:** PIN `[ADMIN_PIN]` (sessionStorage, bloqueia após 5 tentativas)
- **PWA:** manifest-admin.json separado (tema gold #d4a843, ícone escudo)

### Abas
| Aba | Conteúdo |
|-----|----------|
| 📊 Dashboard | Stats gerais, cadastros/dia, top users, funil de retenção, disciplinas |
| 👥 Usuários | Tabela completa, filtros, busca |
| 🔔 Push & Lembretes | Push manual + 5 regras automáticas (inatividade, streak, etc.) |
| ⚡ Eventos XP | Criar eventos de XP multiplicado |
| 💳 Billing | Paywall toggle, planos Stripe, receita |
| 📦 Exportar | XML/CSV/JSON com filtros e campos selecionáveis + leads |
| 📋 Logs | Log de atividades admin |
| 📍 Geografia | Mapa de alunos por estado/região do Brasil |
| 📱 Instalações | Métricas PWA, dispositivos, navegadores |
| 🎯 Impacto | Dashboard executivo para pitch gov (horas, retenção, crescimento) |

### Features especiais
- **🖥 Modo Apresentação** — fullscreen com números grandes para projetar em reuniões
- **🔄 Update banner** — detecta nova versão do SW e mostra "Atualizar Agora"
- **📲 Instalar App** — botão PWA install na topbar
- **🟢/🔴 Status online/offline** — barra de versão no rodapé

---

## Agentes Disponíveis

Sistema de 26 agentes em `.agents/`. Invoque por objetivo:

| Objetivo | Agentes |
|----------|---------|
| Melhorar performance | Frontend + Mobile + QA + DevOps |
| Nova feature | Architect + PM → Frontend + Backend + QA |
| Bug mobile | Mobile + QA |
| Campanha marketing | Marketing + Copywriter + Social + Traffic |
| Revisar segurança | Security + LGPD + Backend |
| Melhorar conversão | UX + Copywriter + Data + Frontend |
| Adicionar aulas | PM + Backend + Frontend + QA |
| Deploy | DevOps + QA |
| Integrar AI | AI Integrations + Architect + Backend + Frontend |
| Revisar legal | Legal + LGPD + Copyright |
| Pricing | Monetization + Business + Data |
| SEO | Marketing + Copywriter + Frontend + DevOps |

### Modos de execução
- **Autônomo** — baixo risco (refactoring, testes, docs)
- **Supervisionado** — alto risco (produção, pagamento, auth, dados)
- **Híbrido** (padrão) — livre com checkpoints críticos
