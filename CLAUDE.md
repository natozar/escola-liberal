# Escola Liberal — System Prompt para Claude Code

## Identidade do Projeto

Plataforma PWA educacional para adultos brasileiros que não tiveram acesso a educação básica de qualidade. 31 disciplinas, 194 módulos, 1.940 aulas interativas. Público: adultos 18+. Tagline: "A educação que a escola deveria ter dado." Bilíngue PT/EN (com `history` em CLIL — American History em inglês). Gratuita. Offline-first. Gamificação completa. Criada por Renato Rodrigues (Ribeirão Preto/SP).

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
| PWA | Service Worker v235 (network-first + stale-while-revalidate + cache-first) |
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
├── sw.js               → Service Worker v163
├── manifest.json       → PWA manifest
├── vite.config.js      → Config Vite + plugin minifyLegacyJS
├── package.json        → Deps: vite, terser, playwright, html-validate, lighthouse, axe
│
├── lessons/
│   ├── index.json      → Índice leve (metadados, ~320KB) — carrega no boot
│   ├── mod-0.json      → Módulo completo (lazy-loaded sob demanda)
│   └── ...mod-N.json   → 174 módulos no total (com campo `order` para sequencia pedagogica)
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
- 29 disciplinas com cores de acento únicas (DISC_ACCENT map)
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

## Service Worker (sw.js v163)

### Estratégia de Cache
- **Install:** pré-cache CORE_ASSETS (HTML, JS, ícones, index.json, manifest.json) — SEM skipWaiting (SW fica em waiting)
- **Navigation:** Network-first com fallback para cache, offline.html como último recurso
- **Assets estáticos:** Stale-while-revalidate
- **Fontes:** Cache-first (nunca expira)
- **Lessons:** Lazy-loaded, cached no primeiro acesso (174 módulos)
- **Google Auth URLs:** Skip (sem cache para evitar poluição)

### Atualização (Política Permanente)
- `skipWaiting()` APENAS no message handler (quando user clica "Atualizar")
- `clients.claim()` no activate
- Limpa caches antigos automaticamente (prefixo `escola-`)
- Banner de update aparece quando novo SW está em waiting
- Botão 🔄 no top bar pulsa quando há update disponível
- Polling `reg.update()` a cada 60s detecta novas versões
- Pull-to-refresh bloqueado (overscroll-behavior-y: contain)

---

## Bugs Conhecidos

1. ~~**`shareProgress()` duplicada**~~ — **RESOLVIDO** (só existe uma definição agora)
2. **Credenciais hardcoded** em `supabase-client.js` (URL e anon key expostos no client-side). Para SPA é aceitável com RLS, mas auditar RLS policies.
3. ~~**Google OAuth redirect loop**~~ — **RESOLVIDO v3** (v2 fix: redirect para auth.html com SDK sincrono. v3 fix: trigger `handle_new_user` no Supabase falhava com "Database error saving new user" — reescrita com ON CONFLICT DO NOTHING + EXCEPTION handler. `sync_profile_email` tambem corrigida. auth.html: `initSupabase()` agora executa antes de `checkOAuthError()` return para evitar sbClient null.)
4. **AI Tutor/Quiz desabilitado** — precisa de créditos na API Anthropic. Disclaimer LGPD e system prompt já implementados.
5. ~~**Leaderboard migration**~~ — **RESOLVIDO** — consolidado em `supabase/migrations/EXECUTE-THIS.sql`
6. ~~**Migration pendente**~~ — **RESOLVIDO** — consolidado em `supabase/migrations/EXECUTE-THIS.sql`. Para executar: copiar conteúdo de `supabase/migrations/EXECUTE-THIS.sql` e colar no SQL Editor do Supabase Dashboard.
7. ~~**App exigia login para acessar**~~ — **RESOLVIDO e REVERTIDO 2026-04-24**: DEMO_MODE foi usado entre 2026-04-02 e 2026-04-24 para apresentacoes (acesso total sem auth). Em 2026-04-24 `DEMO_MODE = false` foi ativado para comecar captura de dados reais de engajamento. Agora: onboarding obrigatorio para novos visitantes (age gate + CPF), modal "crie conta" ativo, `isModUnlocked` continua destravado (paywall e controlado por `admin_settings.paywall_enabled` no Supabase, nao mais pelo DEMO_MODE). Para reativar modo apresentacao: mudar `DEMO_MODE` para `true` em src/boot.js.
8. ~~**App nao forcava atualizacao do SW**~~ — **RESOLVIDO**: `updateViaCache:'none'` no registro, polling `reg.update()` a cada 60s, `controllerchange` faz reload automatico, `skipWaiting()` + `clients.claim()` no SW.
9. ~~**App dependia de Supabase para boot**~~ — **RESOLVIDO**: `OFFLINE_MODE = true` desliga Supabase completamente. Zero fetch de rede, zero erros no console. Boot em <2s. Dados demo pre-populados (seedDemoData). Para reconectar: mudar `OFFLINE_MODE` para `false` em src/boot.js.
10. **Debate implementado** — 15 salas tematicas com presenca online, botao destaque verde, grid responsivo, chat com bolhas. Auth requerido para enviar.
11. ~~**Barra dupla mobile**~~ — **RESOLVIDO**: `appVersionBar` escondido no mobile (`display:none!important`), safe-area removido do body (aplicado apenas no header e bottom nav), mobile header simplificado para flat single-row (← | 💬 Debate [N] | 🔥streak XP 👤).
12. **Moderacao de debate — 2 camadas**: filtro local (palavroes, dados pessoais, rate limit) + IA via Edge Function `moderate-debate` com cadeia de provedores (2026-07-14): (1) `OPENAI_API_KEY` → OpenAI Moderation API omni-moderation-latest — **GRATUITA**, multilingue, categorias ódio/assédio/sexual/violência mapeadas para strike/warn com reasons em PT; (2) `ANTHROPIC_API_KEY` → Claude Haiku (~$0.001/msg, prompt corrigido para 18+); (3) sem chave → fallback permissivo. Timeout 5s com fallback permissivo. Reacoes curtas pulam IA. OFFLINE_MODE usa so filtro local. Deploy: `npx supabase functions deploy moderate-debate` + `npx supabase secrets set OPENAI_API_KEY=sk-...`.
13. **Moderacao de debate implementada (detalhes)** — Filtro 3 camadas (palavras proibidas, relevancia ao tema, rate limit). Filtro LGPD bloqueia dados pessoais (regex telefone, CPF, email, redes sociais). Sistema de strikes com suspensao progressiva (aviso → 24h → 72h → 7d → ban). Consent LGPD obrigatorio no primeiro acesso. Banner de regras em cada sala. Painel dos pais: historico de infracoes, mensagens enviadas, resetar strikes, desativar/reativar debate. Tudo client-side, funciona offline. SW v89.
14. **Age gate 18+ — 6 camadas**: client (enforceAgeGate + anti-tamper + block screen + CPF validation), server (RLS 6 tabelas + trigger validate_age_gate), Edge Functions (verify-age Serpro + ai-tutor/create-checkout 403 blocked), sync (mergeLocalToCloud envia cpf_hash/birth_year/age_group/age_verified_at). COMPLETO. SW v96.

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

### Compliance Lei Felca (Lei 15.211/2025) — aplicado 2026-04-04
- **Verificacao de idade:** Campo data de nascimento no onboarding. Salva apenas birthYear (minimizacao LGPD). Faixas: blocked (<18), adult (18+).
- **Consentimento parental:** Removido (plataforma exclusiva 18+).
- **Debate ao vivo:** Aberto para todos os usuarios verificados (18+).
- **Design persuasivo:** Removidas todas as mensagens de urgencia, perda, ansiedade nas notificacoes e streaks.
- **Gamificacao educacional:** Mantida (XP, badges, missoes, leaderboard) — excepcao legal por conteudo com controle editorial.
- **AI Tutor:** ageGroup passado corretamente na chamada a Edge Function. Disclaimer LGPD por sessao ja existia.
- **Termos de uso:** Nova secao 14 sobre Lei 15.211/2025.
- **Politica de privacidade:** Nova secao 10 sobre Lei 15.211/2025.
- **Badge de conformidade:** Visivel no version bar desktop.
- **DEMO_MODE e OFFLINE_MODE:** Age gate e consent pulados (comportamento de demonstracao preservado).
- **Fiscalizacao:** ANPD. Multa: ate R$50 milhoes ou 10% do faturamento.

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
12. **Permitir acesso a menores de 18** — age gate e obrigatorio em todas as camadas (client + server + Edge Functions)

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
- FASE 2 concluida: skipWaiting removido do install, controllerchange condicionado a _userRequestedUpdate

### Ultimo teste completo: 2026-04-03
- Plataformas: Chrome Android, Safari iOS, Chrome Desktop, Firefox Desktop
- Viewports: 320px-1920px
- Modos: dark/light, offline/online, OFFLINE_MODE true
- PWA: manifest OK, SW OK, install OK, offline OK
- Bugs corrigidos: 2 (launchConfetti missing, iOS input zoom)
- Score Lighthouse: Perf 94, A11y 97, BP 100, SEO 100

### Concluido nesta sessao (2026-04-04 — Lei Felca)
- Adequacao a Lei 15.211/2025 (ECA Digital / Lei Felca)
- Gate de idade no onboarding: campo data de nascimento, salva apenas birthYear (LGPD minimizacao)
- Faixas: blocked (<18), adult (18+)
- Plataforma exclusiva para adultos 18+ (sem consentimento parental)
- Debate ao vivo aberto para todos os usuarios verificados (18+)
- Gamificacao revisada: removidas mensagens de urgencia/ansiedade/perda
  - "Sua sequencia esta em perigo!" → "Voce esta indo bem!"
  - "Estude antes de meia-noite para nao perder!" → "Que tal estudar um pouco antes de dormir?"
  - "Mantenha sua sequencia" → "Que tal estudar um pouco hoje?"
  - "Faltam X aulas" → "Voce ja completou X aulas"
  - "Estude todos os dias para manter" → "Quanto mais dias voce estuda, mais rapido aprende"
  - "Comece sua sequencia!" → "Comece a aprender!"
- AI Tutor: ageGroup passado corretamente (sem fallback '17+')
- Termos de uso: nova secao 14 (Lei 15.211/2025)
- Politica de privacidade: nova secao 10 (Lei 15.211/2025)
- Badge de conformidade no version bar do app
- DEMO_MODE e OFFLINE_MODE preservados (skip de age gate e consent)
- Arquivos alterados: onboarding.js, debate.js, chat.js, study-plan.js, dashboard.js, pwa.js, app.js, app.html, termos.html, privacidade.html, sw.js, CLAUDE.md
- SW v79

### Concluido nesta sessao (2026-04-04 — Google OAuth Fix)
- **Causa raiz:** Trigger `handle_new_user` no Supabase falhava ao criar perfil no OAuth callback, retornando `500: Database error saving new user`
- **Diagnostico:** Logs do Supabase Auth mostraram erro no `/callback`. As funcoes `handle_new_user` e `sync_profile_email` nao tinham exception handling — qualquer falha cancelava toda a transacao de criacao de usuario.
- **Fix 1 (Supabase SQL):** `handle_new_user` reescrita com `ON CONFLICT DO NOTHING` + `EXCEPTION WHEN OTHERS THEN RETURN NEW` + insert em `subscriptions`
- **Fix 2 (Supabase SQL):** `sync_profile_email` reescrita com `EXCEPTION WHEN OTHERS THEN RETURN NEW`
- **Fix 3 (auth.html):** `initSupabase()` agora executa SEMPRE, mesmo apos erro OAuth. Antes, `checkOAuthError()` retornava early e `sbClient` ficava null, impedindo o usuario de tentar novamente.
- **Arquivos alterados:** auth.html, supabase-schema.sql, CLAUDE.md
- **SQL executado no Supabase:** handle_new_user + sync_profile_email (ambas com exception handler)
- **Testado:** Login Google com chatsagrado@gmail.com → redirect para app.html com currentUser ativo

### Concluido nesta sessao (2026-04-04 — consolidacao e deploy)
- Commit consolidado: auth.html fix OAuth, supabase-schema.sql, CLAUDE.md
- Build Vite: dist/ atualizado com SW v79
- FASE 2 PWA marcada como concluida (ja estava implementada desde sessao 9)
- Branch feat/lei-felca-compliance mergeada na main
- Deploy via GitHub Pages
- 31 agentes IA (.agents/) — 6 novos: performance, content, i18n, pwa, a11y, onboarding

### Concluido nesta sessao (2026-04-04 — Age Gate Backend Enforcement)
- **Client-side (SW v93):** enforceAgeGate() em boot.js com anti-tamper (birthYear vs ageGroup). _showAgeBlockScreen() corrigido para usar window._origById (Safe DOM Proxy retornava truthy). Checkpoints em: boot, login (initAfterAuth), openL() (navigation.js), goDebate() (debate.js). Onboarding step 1 sem botao Pular (age gate obrigatorio). 7 locais corrigidos de document.getElementById → window._origById para existence checks.
- **Server-side (Supabase):** 3 colunas em profiles (birth_year INTEGER, age_verified_at TIMESTAMPTZ, age_group TEXT). Trigger validate_age_gate(): forca blocked se birthYear < 18, impede mudanca blocked→adult se ainda menor. 6 RLS policies bloqueiam acesso a dados: profiles, progress, notes, favorites, timeline, weekly_xp.
- **Edge Functions:** ai-tutor e create-checkout retornam 403 se age_group='blocked'. Deploy executado via `npx supabase functions deploy`.
- **Sync (supabase-client.js):** mergeLocalToCloud() envia birth_year, age_group, age_verified_at para profiles.
- **SQL:** Secao 9 adicionada em EXECUTE-THIS.sql (ALTER TABLE, trigger, 6 policies).
- **Arquivos alterados:** src/boot.js, src/features/onboarding.js, src/features/debate.js, src/core/navigation.js, app.html, supabase-client.js, supabase/functions/ai-tutor/index.ts, supabase/functions/create-checkout/index.ts, supabase/migrations/EXECUTE-THIS.sql, sw.js
- SW v94

### Concluido nesta sessao (2026-04-05 — Producao Completa)
- Pin-gate removido do app.html (arquivo mantido no repo para referencia)
- Versao UI corrigida: APP_VERSION 4.0.0, fallback 3s se SW nao responder
- Verificacao CPF (Lei Felca): campo CPF + mascara + validacao client-side + Edge Function verify-age (Serpro) salva direto em profiles
- Hash SHA-256 do CPF (nunca armazena raw), localStorage + Supabase sync
- Fallback gracioso se Serpro nao configurado (self_declaration_fallback)
- moderation_log table + funcao logModeration() (resolve TODO moderation.js:356)
- Blog SEO: JSON-LD structured data ja existia nos 5 artigos (confirmado)
- Certificados verificaveis: cert.html + tabela certificates + hash SHA-256 publico + URL verificavel
- CHANGELOG atualizado (4.0.0): Verificacao Idade, Age Gate, Debate, Certificados
- SQL secoes 11 (moderation_log) e 12 (certificates) em EXECUTE-THIS.sql
- SW v96

### Concluido nesta sessao (2026-04-24 — DEMO_MODE desligado)
- **Motivacao:** comecar a capturar dados reais de engajamento para priorizar expansao de conteudo (distribuicao atual desigual: 81 modulos em 27 disciplinas, variando de 1 a 6 modulos por disciplina)
- `DEMO_MODE = false` em src/boot.js (antes era true desde 2026-04-02)
- OFFLINE_MODE permanece false (Supabase ativo em producao)
- **Comportamento novo:** visitantes sem `ageGroup` no localStorage sao forcados ao onboarding (age gate + CPF Serpro ou auto-declaracao). Menores de 18 bloqueados. Modal "crie conta" volta a aparecer nos gatilhos (debate, save progresso, etc.)
- **Comportamento preservado:** `isModUnlocked` continua destravando todos os modulos — paywall agora controlado EXCLUSIVAMENTE por `admin_settings.paywall_enabled` no Supabase (nao mais pelo DEMO_MODE)
- **Usuarios existentes** com dados demo ja seedados (`ageGroup:'adult'`) passam direto sem re-onboarding
- Arquivos alterados: src/boot.js (linha 15), sw.js (v129→v130), dist/* (rebuild)
- SW v130

### Concluido nesta sessao (2026-04-25 — Auditoria Editorial)
- **Auditoria estrutural completa** dos 174 modulos (29 disciplinas × 6 mods × 10 aulas = 1.740 aulas).
- **Fixes aplicados:**
  - 28 modulos sem `id` (mod-38 a mod-65) ganharam IDs semanticos via slugify do title
  - Colisao de id `finance` resolvida: mod-3 renomeado `economia-financas` (mod-23 mantem `finance`)
  - Ortografia `espanol` -> `espanhol` em PT (disciplines.js + 6 modulos + IDs `espanhol-*`)
  - Sequencia de aulas em mod-0 (Dinheiro) reorganizada: macro contiguo (1-7) -> pessoal (8-9) -> futuro (10)
- **scripts/editorial-fixes.mjs** criado (idempotente, pode rodar novamente)
- **RELATORIO-EDITORIAL.md** documenta decisoes pendentes que exigem julgamento humano:
  - Sobreposicao economia ⇄ financas/empreendedorismo/logica
  - Titulos similares (Marketing Digital x2, Falacias x2)
  - Sequencia entre modulos dentro da disciplina (filosofia, matematica, financas, logica) — exige campo `order` ou rename de arquivos
  - Decisao sobre `historia` vs `history` (PT/EN bilingue)
- SW v162

### Concluido nesta sessao (2026-04-25 — Anti-Cloning Defense)
- **Watermarking forense (scripts/watermark-content.mjs):** roda no build em dist/lessons/, embute 3 camadas — `_sig` field (build_id + hash + copyright + license + notice), zero-width Unicode em `desc` (codifica build_id), 3 frases canonicas rotacionadas. Idempotente (strip regex antes de re-aplicar). Gera `canaries.json` com registry. 175 arquivos assinados/build.
- **Pipeline build (vite.config.js):** copia lessons → watermark dist → integrity hash dist (assim manifesto bate com conteudo deployado).
- **Domain guard (src/core/domain-guard.js):** verifica hostname allowlist no boot. Se rodando em clone: reporta via Beacon API (kind:clone_detected, severity:critical), bloqueia render com overlay fullscreen, intercepta `fetch` para `/lessons/`. Wired em main.js Phase 0.
- **Edge Functions origin lock:** `isOriginAllowed()` adicionado em ai-tutor, create-checkout, verify-age, moderate-debate, admin-stripe-ops. Retorna 403 `origin_blocked` para chamadas fora da allowlist (verifica Origin + Referer fallback).
- **robots.txt:** Disallow /lessons/ /src/ /scripts/ /qa/ /SECURITY.md /LICENSE.md. Block GPTBot, ClaudeBot, anthropic-ai, CCBot, Google-Extended, PerplexityBot, Bytespider, Diffbot, etc (anti-AI-training scraping).
- **LICENSE.md:** licenca proprietaria explicita, lista atos proibidos, descreve marcadores forenses como prova juridica, cita Lei 9.610/98 + 9.279/96 + Berne + TRIPS.
- **gen-integrity.mjs:** parametrizado para aceitar dir/output via CLI args.
- SW v161

### Curriculo (estado atual pos-auditoria 2026-04-25, atualizado 2026-08-21)
- 31 disciplinas, 194 modulos total, 1.940 aulas. 6 modulos por disciplina em 30 delas; `trader` tem 14 (aprofundamento de 2026-08-21)
- `historia` (BR, PT) e `history` (EUA, EN/CLIL) sao disciplinas distintas DELIBERADAMENTE (nao bug)
- Sequencia entre modulos controlada por campo `order` em cada modulo (fallback: idx do arquivo)
- IDs unicos garantidos (script `scripts/editorial-fixes.mjs` valida)
- Watermark forense + integrity manifest aplicados em build (build_id rotativo)

### Concluido nesta sessao (2026-04-25 — Editorial Audit Sessao 2)
- Aplicadas TODAS as decisoes pendentes do RELATORIO-EDITORIAL.md via `scripts/editorial-fixes-v2.mjs` (idempotente)
- **A.1** mod-3 "Financas Pessoais" → "Financas Pessoais: Fundamentos" (desc redireciona pra disciplina `financas`)
- **A.2** mod-2 "Empreendedorismo" → "Empreendedorismo: Visao Economica" (desc redireciona pra disciplina `empreendedorismo`)
- **A.3** mod-5 "Pensamento Critico" → "Falacias Economicas" (conteudo ja era 100% falacias)
- **B.1** mod-91 "Marketing Digital" → "Marketing Digital: Estrategia e Praticas" (mod-71 e Fundamentos)
- **B.2** mod-146 "Falacias e Manipulacao Argumentativa" → "Argumentacao e Defesa Logica" + id corrigido `argumentacao-defesa-logica` (era so "146")
- **C** Campo `order` numerico aplicado em 174 modulos. 24 com overrides:
  - filosofia: 7 → 103 → 104 → 105 → 22 → 61
  - matematica: 6 → 14 → 15 → 160 → 74 → 73
  - financas: 27 → 23 → 37 → 69 → 70 → 161
  - logica: 36 → 145 → 44 → 146 → 45 → 147
- `getDiscModules()` em `src/core/disciplines.js` agora ordena por `order` (fallback: idx)
- **D** `DISCIPLINES.history.label` → "American History (English)" — clarifica natureza bilingue CLIL
- Build verificado: 175 modulos com watermark, integrity manifest atualizado (build_id `29d8df8e2f90`)
- SW v163
- **Commits desta sessao:** `810feb3` (editorial audit + anti-cloning, 386 arquivos) → `6d3e8fd` (docs CLAUDE.md atualizado: 29 disciplinas/174 modulos)
- **Deploy:** push para `main` → GitHub Actions (build + Pages + QA) → ao vivo em escolaliberal.com.br
- **Anti-cloning ativo em producao:**
  - Watermark forense (zero-width Unicode + `_sig` + canaries) em todos os 175 mods
  - `domain-guard.js` em Phase 0 do boot — bloqueia clone fora da allowlist
  - Origin lock nas 5 Edge Functions (Origin + Referer fallback, retorna 403 `origin_blocked`)
  - `LICENSE.md` proprietaria + `robots.txt` anti-AI-scraping (GPTBot, ClaudeBot, etc bloqueados)
  - Pipeline build: copy lessons → watermark dist → integrity hash dist (manifesto bate com conteudo deployado)

### Escala e Custos (auditoria 2026-07-14)
- **Custo fixo atual: R$ 0** (exceto dominio ~R$40/ano). GitHub Pages/Actions free, Supabase free tier, AI Tutor/Quiz desabilitados, Serpro sem chaves (fallback auto-declaracao), moderacao debate com fallback permissivo sem ANTHROPIC_API_KEY (filtro local 3 camadas segura sozinho)
- **Payload primeira visita: ~450KB gzip** (index.json 284KB + JS 76KB + CSS 21KB + HTML). Modulos lazy ~18KB cada. Visitas repetidas ~0 (SW offline-first)
- **Gargalos em ordem de quebra:** (1) Supabase Realtime debate — ~200 conexoes simultaneas no free tier, degrada sem derrubar o resto; (2) banda GitHub Pages ~100GB/mes ≈ 150-200k usuarios novos/mes; (3) Supabase DB 500MB free
- **Fix do gargalo 2: CLOUDFLARE-SETUP.md** (guia pronto, R$0) — proxy Cloudflare Free na frente do Pages = banda ilimitada + DDoS + edge cache 2h. Execucao e do Renato (troca de nameservers no Registro.br)
- Gargalo 1 se resolve com Supabase Pro (US$25/mes) QUANDO a escala chegar — nao antes

### Concluido nesta sessao (2026-07-14 — Housekeeping)
- **Security headers commitados** (estavam soltos na working tree desde sessao anterior): CSP + nosniff + X-Frame-Options + referrer-policy em 12 paginas publicas. CSP auditado contra os recursos externos reais de cada pagina antes do commit
- **Aba 🛡️ Segurança no admin** commitada: dashboards de erros JS, adulteracao de conteudo, age tamper, brute-force (fonte: error-reporter → Supabase), filtros por severidade, export CSV
- **dist/ untracked** (git rm --cached): producao e buildada pelo CI (comprovado — mod-174+ foram ao ar sem dist commitado); dist rastreado so gerava churn de watermark a cada build local. dist/ ja estava no .gitignore
- Posts antigos do blog: numeros defasados (800 aulas/26 disciplinas) corrigidos para 1.800/30

### Concluido nesta sessao (2026-07-14 — Disciplina Voto Consciente)
- **Nova disciplina `voto` ("Voto Consciente" 🗳️) como PRIMEIRA disciplina da plataforma** — decisao estrategica: janela eleitoral (eleicoes outubro/2026)
- 6 modulos novos: mod-174 a mod-179 (60 aulas, ~231KB de conteudo, media ~3.900 chars/aula):
  - mod-174 `voto-poder-do-voto` — cargos/mandatos, urna, sistema proporcional/quociente eleitoral
  - mod-175 `voto-passado-do-candidato` — historico verificavel, DivulgaCandContas, emendas, financiamento
  - mod-176 `voto-aritmetica-das-promessas` — orcamento publico, teste de viabilidade, competencia do cargo (instrumental economico da casa)
  - mod-177 `voto-manipulacao-eleitoral` — marketing, falacias de palanque, fake news, pesquisas, crimes eleitorais
  - mod-178 `voto-integridade-como-filtro` — Ficha Limpa LC 135/2010, processos, contas rejeitadas, coerencia
  - mod-179 `voto-decidindo-com-metodo` — matriz de decisao, branco/nulo/util, dia da votacao, accountability pos-eleicao
- **REGRA EDITORIAL da disciplina: ensina METODO, nunca conclusao.** Zero mencao a candidato/politico vivo/partido; exemplos ficticios; instituicoes citadas como fonte (TSE, TCU, LAI). Varredura automatica de neutralidade executada (falsos positivos verificados manualmente)
- **Ordenacao de disciplinas corrigida em 3 pontos:** `disciplines.js` (novo helper `getOrderedDisciplineKeys()`, DISCIPLINES reordenado com voto order:0), `dashboard.js` renderCards + card "Comecar" de usuario novo, `mobile.js` grid + toggleDiscMobile — antes a ordem visual vinha da posicao crua no array M (mod files sao index-mapeados, nao podem ser reordenados)
- LP atualizada: 30 disciplinas / 180 modulos / 1.800 aulas em index.html (title, metas, OG, 3 blocos JSON-LD, trust, FAQ) e institucional.html
- index.json: 180 entradas (850KB), integrity manifest regenerado (181 arquivos), build com watermark OK (build_id 2f955674b5aa)
- SW v164

### ✅ CONCLUÍDO: FASE 2 do update PWA
- skipWaiting() removido do install event (só no message handler)
- controllerchange condicionado a _userRequestedUpdate
- Política de atualização permanente aplicada
- SW v163 (atual)

---

### Concluido nesta sessao (2026-08-20 — Disciplina Trader: Mercado Futuro)
- **Nova disciplina `trader` ("Trader: Mercado Futuro" 📊, accent `honey`, `order:30` — ultima do grid)**
- 6 modulos novos: mod-180 a mod-185 (60 aulas, ~255KB, media ~4.350 chars/aula):
  - mod-180 `trader-fundamentos-mercado-futuro` — derivativo, hedger x especulador (Mises/Hayek), clearing da B3,
    alavancagem, ajuste diario, serie e rolagem, custos + DARF, o estudo da FGV, quem nao deveria operar
  - mod-181 `trader-anatomia-do-wdo` — ficha tecnica do WDO, aritmetica em pontos (1 pt = R$ 10, tick 0,5 = R$ 5),
    margem, relogio do pregao, gatilhos intraday, PTAX, rolagem, correlacoes (DI/WIN/cupom), operacao ficticia completa
  - mod-182 `trader-plataforma-profit` — a ferramenta: layout e workspace, grafico, boleta e tipos de ordem,
    book/Super DOM, Times & Trades, indicadores, simulador e replay, risco automatico, checklist pre-ordem
  - mod-183 `trader-leitura-grafico-fluxo` — tendencia, suporte/resistencia, candles, medias e VWAP, volume,
    fluxo/absorcao/spoofing, abertura, 3 estruturas classicas E COMO CADA UMA FALHA, contexto macro, limites da AT
  - mod-184 `trader-gestao-de-risco` — risco por operacao, tamanho de posicao, stop, risco-retorno x taxa de acerto,
    drawdown assimetrico, limites diarios, expectativa matematica, diario de trades, backtest honesto, plano de 1 pagina
  - mod-185 `trader-do-simulador-a-conta-real` — criterio de passagem, abertura de conta, choque do dinheiro real,
    DARF na pratica, escalar contratos, como reconhecer golpe (CVM), infraestrutura, trading como negocio, alternativas
- **REGRA EDITORIAL da disciplina: ensina MECANICA e RISCO, nunca decisao.** Zero recomendacao operacional
  ("compre/venda/alvo"), zero preco real do dolar (exemplos ficticios declarados), zero guru/corretora/curso citado.
  O estudo da FGV (Chague, De-Losso, Giovannetti — ~97% dos que persistiram por mais de 300 pregoes perderam)
  aparece como aula inteira (mod-180 aula 9) e e retomado nos modulos 182 e 185. Postura liberal: informacao completa,
  responsabilidade individual, sem paternalismo e sem vender ilusao.
- **Compliance:** caixa `.lesson-warn` com aviso de risco na aula 1 de cada modulo + versao curta em toda aula que
  descreve execucao de ordem. Marca `Profit® e marca da Nelogica. Material independente, sem qualquer vinculo` no
  mod-182 aula 1 (uso nominativo). `termos.html` ganhou a secao **8-A — Conteudo sobre Mercados de Alto Risco**
  (nao somos analista/consultor/gestor por Res. CVM 19, 20 e 21/2021; perda pode superar o capital; sem promessa de
  resultado; DARF e do usuario; marcas de terceiros; sem intermediacao; oferta de "renda garantida" em nosso nome e fraude).
- **Primeira disciplina com DIAGRAMAS.** Nenhuma aula do curriculo usava imagem. Aqui os conceitos visuais
  (book de ofertas, layout da Profit, curva de drawdown, regua de pontos, estrutura de tendencia) sao `<svg>` inline
  desenhados a mao, coloridos APENAS por variavel CSS (`--honey`/`--sage`/`--coral`/`--text-primary`/`--border`/`--bg-card`)
  para funcionarem em dark e light. Escolha deliberada em vez de screenshot: zero asset novo, funciona offline,
  sem risco de copyright de interface de terceiro.
- **`app.css`:** 3 blocos novos que o conteudo exigia e nao existiam — `.lesv-body table` (com scroll-x no mobile),
  `.lesson-warn` (coral) e `.lesv-body svg`. As tabelas ja eram usadas por 9 modulos antigos sem estilo nenhum.
- **`scripts/qa-trader.mjs`** (novo): linter da disciplina — schema, HTML balanceado, tags proibidas, quiz,
  cores de SVG validadas contra as variaveis que existem de fato no `app.css`, compliance (aviso, linguagem de
  recomendacao com guarda de negacao, atribuicao de marca) e cliches de IA. Rodar: `node scripts/qa-trader.mjs`.
  Aceita numeros de modulo como argumento para servir de linter generico de qualquer modulo (`node scripts/qa-trader.mjs 174 175`).
- **`scripts/append-index.mjs`** (novo): acrescenta modulos ao `lessons/index.json`. IMPORTANTE — o index NAO e
  derivavel dos `mod-N.json` (63 dos 180 modulos antigos divergem por campos legados), entao a operacao e sempre
  APPEND posicional validado, nunca rebuild.
- **LP:** card da disciplina Trader no grid do `index.html` — e tambem o card do **Voto Consciente**, que estava
  anunciado como "NOVO" nas meta tags desde julho mas nunca ganhou card no corpo da pagina.
- Contagens **31 disciplinas / 186 modulos / 1.860 aulas** propagadas em 151 arquivos (LP, institucional, app, admin,
  `src/features/social.js`, template do blog e todos os posts publicados e em rascunho).
- SW v229
### Concluido nesta sessao (2026-08-21 — Trader: aprofundamento profissional, mod-186 a 193)
- **8 modulos novos: mod-186 a mod-193** (80 aulas, 285KB, media ~3.650 chars/aula). A disciplina `trader` sai de
  6 para **14 modulos / 140 aulas** — numero par por exigencia estetica do grid da UI.
  - mod-186 `trader-microestrutura-e-execucao` — cadeia da ordem ate o motor da B3, fila preco-tempo, spread e
    liquidez, a mercado x limitada, slippage medida em 200 operacoes, ordens compostas e stop nativo x simulado,
    leiloes e tunel de volatilidade, formador de mercado e alta frequencia, impacto de mercado, auditoria de execucao
  - mod-187 `trader-probabilidade-e-estatistica` — trade como amostra, distribuicao e caudas gordas, sequencias de
    perda esperadas, expectativa x variancia, tamanho de amostra, risco de ruina, Monte Carlo, sobreajuste,
    vieses de dados (look-ahead, rolagem, sobrevivencia), correlacao x mecanismo
  - mod-188 `trader-construcao-de-estrategia` — hipotese testavel e teste do estranho, estrategia escrita em 9 linhas,
    dados e regimes, as sete trapacas do backtest, metricas (fator de lucro, excursao adversa, tempo em queda),
    otimizacao e regra do plato, fora da amostra e walk-forward, degradacao esperada, monitoramento, portfolio
  - mod-189 `trader-macro-e-o-dolar` — cambio como preco relativo, diferencial de juros e carry, fluxo comercial e
    financeiro, swap cambial e atuacao do BC, calendario economico (consenso/surpresa/revisao), dias de decisao,
    risco fiscal e premio de risco, indice do dolar e commodities, correlacoes intradiarias, rotina macro diaria
  - mod-190 `trader-risco-de-cauda-e-capital` — o que o stop nao cobre, alavancagem real x margem, modelos de sizing,
    Kelly fracionado, correlacao escondida entre posicoes, kill-switch em tres niveis, escada de recuperacao,
    chamada de margem e zeragem compulsoria, capital de risco e separacao patrimonial, escalar contratos
  - mod-191 `trader-o-oficio` — rotina em tres blocos e checklist pre-ordem, tilt e protocolo de interrupcao,
    vieses no book, metricas de comportamento (aderencia, sinais perdidos), revisao semanal, numeros do negocio e
    ponto de equilibrio, apuracao de imposto e compensacao de prejuizo, mesas proprietarias, contingencia, plano de
    12 meses com criterio de desistencia
  - mod-192 `trader-estrutura-de-mercado` — estrutura de mercado, marcacao fractal sem subjetividade, BOS, CHoCH,
    estrutura interna x externa e a recursividade infinita, faixas e falsos rompimentos, multiplos tempos graficos,
    marcacao retroativa, traducao para o price action classico, estrutura como filtro mensuravel
  - mod-193 `trader-liquidez-fvg-order-block` — onde os stops se acumulam de fato, sweep, order block e o problema
    da definicao, FVG (geometria de tres velas), taxa de preenchimento COM grupo de comparacao, premium/discount,
    mitigacao e modelos de entrada, setup testavel completo, backtest honesto de setup visual, o que sobra de util
- **Mod-192 e 193 nasceram de pedido explicito do Renato** ("aplicou aulas sobre CHoCH, Bull, BOS, FVG?"). Regua
  escolhida por ele: **descritivo + critico** — ensina o conceito com precisao, traduz para o price action classico,
  e submete a mesma exigencia de definicao numerica, amostra e grupo de comparacao aplicada ao resto da disciplina.
  Zero mencao a educador, comunidade ou produto por nome; narrativa de "instituicao cacando seu stop" e tratada como
  hipotese sem evidencia publica, com a explicacao mecanica (concentracao de ordens) no lugar dela.
- **REGRA EDITORIAL mantida:** ensina MECANICA e RISCO, nunca decisao. Zero recomendacao operacional, todos os
  numeros declarados como ficticios, estudo da FGV retomado no mod-193 aula 10 e no mod-191 aula 10.
- **`scripts/qa-trader.mjs` — bug corrigido:** os `\b` da regex de acentuacao do aviso (linha 109) estavam gravados
  como bytes 0x08 (backspace), entao a checagem NUNCA rodou desde que foi escrita. Restaurado o word boundary e
  removida a alternativa `alavancagem e`, que era falso positivo (o aviso acentuado tambem diz "envolve alavancagem
  e pode gerar perdas"). Os 6 modulos antigos continuam passando.
- **QA:** `node scripts/qa-trader.mjs 186 187 188 189 190 191 192 193 --strict` — 80 aulas, **zero erros e zero
  avisos** (10 aulas passaram por densificacao para ficar acima de 3.000 chars de prosa fora do SVG).
- **Diagramas:** 11 SVGs inline nos 8 modulos novos (23 na disciplina inteira), cor exclusivamente por
  variavel CSS existente no `app.css`. Distribuicao desigual: mod-186 tem 3. O mod-191 ganhou o seu depois, no fim da sessao.
- Contagens **31 disciplinas / 194 modulos / 1.940 aulas** propagadas em 152 arquivos (269 substituicoes). O script
  usado esta no scratchpad da sessao; ele ignora deliberadamente "1.860 e 1.500 votos" dos posts sobre voto.
- **`index.html`:** card do Trader atualizado para 14 modulos / 140 aulas com nova descricao; entrada `Course` da
  disciplina Trader adicionada ao itemList JSON-LD (nao existia); `numberOfCredits` do Course principal corrigido
  de "1800" (defasado ha varias sessoes) para "1940", idem `PT1800H` para `PT1940H`. 7/7 blocos JSON-LD validos.
- SW v233; `lessons/integrity.json` regenerado (195 arquivos).
- **Achado nao corrigido:** `blog/economia-austriaca-criancas.html` contem um bloco de bytes NUL (0x00) a partir do
  offset ~15110 — por isso o `grep` o trata como binario. E anterior a esta sessao (ja estava no commit) e nao foi
  tocado. Vale investigar se o post renderiza inteiro em producao.
### Concluido nesta sessao (2026-08-21 — QA de responsividade e texto escondido)
- **`qa/tests/15-trader-responsivo.spec.js`** (novo): varre as 140 aulas da disciplina em 5 larguras
  (320, 360, 414, 768, 1440) e procura 7 classes de defeito — overflow horizontal da pagina, elemento
  estourando o container, texto cortado por `overflow:hidden`, texto de SVG pequeno demais apos o
  downscale, texto de SVG fora do viewBox, tabela que rola sem `overflow-x` e conteudo invisivel.
  Tem **guarda de vacuidade**: falha se o corpo da aula nao estiver renderizado ou se algum SVG nao
  devolver matriz de tela, para o teste nao passar medindo nada.
  Rodar: `QA_URL=http://localhost:PORTA npx playwright test 15-trader --project=desktop-chrome`.
- **Achado 1 — diagramas ilegiveis no celular (22 de 22, todos os modulos da disciplina).**
  `.lesv-body svg{width:100%}` escalava o viewBox de 640 para ~44% num aparelho de 360px: o texto de
  11px renderizava a **4,8px**. Corrigido com `<div class="lesv-fig" tabindex="0">` em volta de cada
  SVG + `@media(max-width:699px){.lesv-fig svg{min-width:640px}}` — o diagrama mantem o tamanho
  desenhado e o container rola na horizontal, mesma solucao ja usada nas tabelas. Escala medida agora:
  **0,96** no mobile (texto a ~10,6px). O `tabindex` deixa a rolagem operavel por teclado.
- **Achado 2 — 4 textos recortados pela borda do SVG**, todos anteriores a esta sessao:
  mod-180 aula 4 e aula 5 (dois textos em `x=0`, bbox saindo 2,7px pela esquerda) e mod-184 aula 5
  ("acima daqui, sai da escala" em `x=520`, estourando 14,6px pela direita). Coordenadas ajustadas.
- **Achado 3 — tabela e diagrama rolavam sem nenhum indicio disso.** Numa aula como mod-190 aula 2,
  o leitor de celular via so as duas primeiras colunas da regua de alavancagem e nao tinha como saber
  que existiam "Exposicao" e "Alavancagem". Corrigido com `markScrollables()` em
  `src/core/navigation.js`: apos montar a aula, mede `scrollWidth > clientWidth` em cada `table` e
  `.lesv-fig` e insere `<div class="scrollx-hint">↔ arraste para o lado para ver o restante</div>`
  **apenas no que realmente transborda** (CSS esconde acima de 700px). Reaplica no `resize` com
  debounce de 200ms. `aria-hidden` porque leitor de tela ja recebe a tabela inteira. Isso conserta
  tambem as 115 tabelas da disciplina e qualquer conteudo largo futuro, sem tocar no conteudo.
- **Resultado final:** 140 aulas x 5 larguras, 8.239 elementos, 223 textos de SVG e 115 tabelas
  medidos — **zero achados**. Contagem de elementos sobe de 8.103 (desktop) para 8.239 (mobile),
  que sao exatamente os avisos de rolagem sendo injetados so onde precisam.
- **Regressao:** rodadas as suites `06-mobile-responsive` e `13-mobile-qa-complete` contra o HEAD
  (via `git worktree` em servidor estatico separado) e contra a arvore atual. **Zero regressoes.**
  As 9 falhas sao pre-existentes e do lado do teste, nao do app: `#onboard button` em strict mode
  (o onboarding tem 3 botoes agora), clique em aula que cai por causa disso, `B1` esperando 200 numa
  pagina que nao existe no servidor local, `B8` esperando `overscroll-behavior:contain` e `B13`
  esperando `pin-gate.js` no admin (removido ha varias sessoes). "Cards de modulo nao overflow" e
  flaky nas duas pontas (1 falha em 3 execucoes tanto na baseline quanto no atual).
- SW v234; `lessons/integrity.json` regenerado (195 arquivos, hashes conferidos um a um).
- **Nota de conteudo:** a disciplina tinha 22 diagramas e o mod-191 nao tinha nenhum. Resolvido ainda
  nesta sessao (ver bloco seguinte): agora sao 23.
### Concluido nesta sessao (2026-08-21 — Diagrama do mod-191, landing `trader.html` e pecas sociais)
- **Diagrama de rotina no mod-191 aula 1.** Era o unico modulo da disciplina sem nenhum diagrama. O grafico
  mostra o que a tabela nao mostra: a proporcao entre as 11 horas de mercado aberto e as 2h30 que o plano
  autoriza operar, com os blocos de pre-mercado e pos-mercado nas pontas. A disciplina passa a ter **23 SVGs**.
- **`trader.html`** (nova pagina): landing de divulgacao da disciplina, pensada para trafego de busca e de
  compartilhamento. Estrutura: hero com CTA direto para `app.html#module-180`, caixa de aviso de risco logo
  abaixo do hero, bloco sobre o estudo da FGV, comparativo "o que voce encontra / o que voce nao encontra"
  (8 itens de cada lado), grade dos 14 modulos com link direto para a primeira aula de cada um, 7 perguntas
  frequentes e botoes de compartilhamento com texto pronto (WhatsApp, Telegram, X, LinkedIn, copiar link).
  - SEO: title de 66 chars, meta description, canonical, keywords, OG completo com `og:image:width/height/alt`,
    Twitter summary_large_image e **3 blocos JSON-LD** — `Course` (com `teaches`, `numberOfCredits`, oferta
    gratuita), `BreadcrumbList` e `FAQPage`. Passa limpo no `html-validate` (zero erros).
  - Compliance: aviso de risco no corpo, rodape com as Res. CVM 19, 20 e 21/2021, remissao a secao 8-A dos
    Termos, e a frase explicita de que nao recebemos comissao de corretora.
  - **O card do Trader na LP agora aponta para `trader.html`** em vez de ir direto ao app. O visitante passa a
    ver o aviso de risco e o escopo antes de entrar, e a pagina ganha link interno para indexacao. Para voltar
    ao comportamento antigo basta trocar o href de volta para `app.html#module-180` no `index.html`.
- **`scripts/gen-og-trader.mjs`** (novo, gitignored como o resto de `scripts/`): renderiza as pecas em Chromium
  headless a partir de um template HTML com as fontes da marca. Gera `assets/icons/og-trader.jpg` (1200x630,
  preview de link) e `assets/icons/social-trader-1x1.jpg` (1080x1080, feed do Instagram). Segue a linguagem do
  `og-voto.jpg`: fundo escuro, pill de rotulo, titulo em DM Serif com a segunda linha no acento honey,
  paragrafo de apoio, pills de fatos, selo rotacionado e barra de marca. Grafico de velas desenhado a mao,
  sem numero real. Rodar de novo: `node scripts/gen-og-trader.mjs`.
- **`TEXTOS-DIVULGACAO-TRADER.md`** (novo): textos prontos para WhatsApp, Instagram, X, LinkedIn e story, mais
  a tabela do que **nunca** escrever nas pecas (promessa de retorno, print de resultado, indicacao de corretora,
  "metodo infalivel", depoimento com valor ganho). O gancho de todas as pecas e a honestidade — "sem ilusao",
  "dados, nao promessas" —, o que mantem a divulgacao fora do perimetro das resolucoes da CVM.
- Fiacao: `sitemap.xml` com a entrada de `trader.html` (priority 0.9), `sw.js` com a pagina e a imagem no
  CORE_ASSETS, e o script `validate` do `package.json` cobrindo a pagina nova.
- SW v235; `lessons/integrity.json` regenerado. QA de responsividade rodado de novo apos o diagrama novo:
  140 aulas x 5 larguras, 23 SVGs, **zero achados**. `trader.html` conferida em 1280px e 390px: sem overflow
  horizontal, 17 links para o app, 7 blocos de FAQ.

## Jogo "Cidade Livre" (jogo.html) — 2026-08-08/09

Jogo educacional de gestão de cidade, em produção. O jogador governa uma cidade brasileira fictícia; medidas coletivistas dão aprovação imediata e cobram o custo semanas depois (fila de efeitos agendados). Na crise, uma AULA real do currículo abre no momento da dor; concluí-la gera "Lucidez", que paga as reformas.

- **Arquitetura:** página standalone `jogo.html` (HTML+CSS+JS inline, zero deps), save em localStorage `escola_jogo_cidade_v1`, PRNG mulberry32 com seed. 17 fotos em `assets/jogo/*.jpg` (2016×1152, geradas com pipeline local ComfyUI+RealVisXL em `C:\Users\bibla\AI\`). Tudo no CORE_ASSETS do SW.
- **Estrutura:** capa → mandato 1 (15 cartas: tentações do "Prometedor", crise das prateleiras, aula `supply`, reforma, eleição sem. 14) → mandato 2 (cobrança das promessas, crise fiscal, aula `money`, eleição sem. 28) → Epílogo "O Legado" (aula instituições + 5 decisões institucionais + botão viral de desafio no WhatsApp). 6 finais; selo máximo "O Estadista".
- **Modo Prefeito Vitalício** (destravado ao vencer a campanha; meta em `escola_jogo_meta_v1`): roguelike infinito com deck procedural (DECKV + eventos reativos), escalada de dificuldade, game over real (impeachment/colapso fiscal/urnas), score = semanas no poder, recorde persistente, "Cidade da Semana" (seed semanal igual pra todos — determinístico).
- **Administração manual (tabuleiro):** 8 lotes clicáveis (`S.lotes`) com painel de ações (#loteSheet): equipe de obras como recurso escasso (`S.equipes`, ocupa N semanas), conserto de rua, escola por níveis, concessão da praça e leilão de lotes vazios com escolha da construção; construções contribuem por semana (`semanal`) e a cidade degrada continuamente (`tickLotes` em passarSemana). Estado de obra serializável (sem callbacks no save).
- **Suco:** SFX WebAudio sintetizado (toggle 🔊, key `jogo_sfx`), shake+vibração em crise, streak 🔥, fanfarra de recorde.
- **Age gate 18+:** ageGroup do `escola_v2` quando existe; senão autodeclaração (`jogo_age_ok`) — mesmo fallback Serpro.
- **XP:** deposita em `escola_jogo_xp_pendente` (aula +40, reeleição +60, final +80/150, legado +50, trava por flag); `src/core/xp.js` importa no boot via `addXP` oficial (teto 500/import).
- **Entradas:** callout no hero da LP, sidebar e menu Praticar do app.
- **Regra editorial:** zero político/partido real; arquétipos fictícios ("o Prometedor"); mesma régua da disciplina Voto.
- **Subdomínio:** repo `natozar/cidade-livre` (LP própria + cópia do jogo, CNAME jogo.escolaliberal.com.br) — Pages ativo; falta registro DNS no Registro.br.
- **GDD/spec:** `GDD-JOGO-CIDADE.md`, `SPEC-FASE-0-JOGO-CIDADE.md`; matéria-prima p/ atos futuros: `game-content/` (LOCAL, não versionado) gerada por `scripts/gen-cartas-jogo.mjs` (LOCAL).

### ⚠️ CORREÇÃO DE INFRA (2026-08-09)
O GitHub Pages serve a **branch main crua** (build_type legacy) — NÃO o `dist/` do CI. Consequências: produção roda ES modules nativos sem minificação e **sem watermark forense** (o pipeline anti-cloning só roda no build local). O job "deploy" do ci.yml foi removido (falhava sempre e gerava e-mails); `prebuild` tolera scripts privados ausentes no CI. Migrar Pages para deploy via Actions (servindo dist) é decisão pendente do Renato.

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
| 🛡️ Segurança | Erros JS, integridade de conteúdo, age tamper, brute-force, CSP (via error-reporter) |
| 🏛️ Cidade Livre | Engajamento do jogo: partidas, prefeitos únicos, recorde, rejogo, cidades mais jogadas, Top 10 da semana (tabela `jogo_scores`) |
| 📈 Engajamento | Telemetria anônima (tabela `engagement_events`, leitura só admin): visitantes 7/30d, funil por visitantes únicos, disciplinas que mais prendem, disciplinas mais difíceis (% erro no quiz), atividade diária |

### Features especiais
- **🖥 Modo Apresentação** — fullscreen com números grandes para projetar em reuniões
- **🔄 Update banner** — detecta nova versão do SW e mostra "Atualizar Agora"
- **📲 Instalar App** — botão PWA install na topbar
- **🟢/🔴 Status online/offline** — barra de versão no rodapé

---

## Agentes Disponíveis

Sistema de 32 agentes em `.agents/`. Invoque por objetivo:

| Objetivo | Agentes |
|----------|---------|
| Melhorar performance | Performance + Frontend + DevOps + QA |
| Nova feature | Architect + PM → Frontend + Backend + QA |
| Bug mobile | Mobile + QA |
| Regressao cross-OS (iOS/Android) | QA-Mobile + Mobile + Frontend |
| Campanha marketing | Marketing + Copywriter + Social + Traffic |
| Revisar segurança | Security + LGPD + Backend |
| Melhorar conversão | UX + Copywriter + Data + Frontend |
| Adicionar aulas | Content + PM + Frontend + QA |
| Deploy | DevOps + QA |
| Integrar AI | AI Integrations + Architect + Backend + Frontend |
| Revisar legal | Legal + LGPD + Copyright |
| Pricing | Monetization + Business + Data |
| SEO | Marketing + Copywriter + Frontend + DevOps |
| Acessibilidade | a11y + Frontend + QA |
| Service Worker | PWA + Frontend + Mobile |
| Traducoes | i18n + Frontend + Content |
| Revisar conteudo | Content + Legal + Copyright |
| Onboarding/Retencao | Onboarding + UX + Data + Marketing |

### Modos de execução
- **Autônomo** — baixo risco (refactoring, testes, docs)
- **Supervisionado** — alto risco (produção, pagamento, auth, dados)
- **Híbrido** (padrão) — livre com checkpoints críticos