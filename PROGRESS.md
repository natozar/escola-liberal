# Escola Liberal — Progresso do Desenvolvimento

> Última atualização: 2026-03-31 23:30
> Sessão: #2

## STATUS GERAL
Performance otimizada (splash screen, preconnects, SW v22). Login Google redesenhado (botão principal). Todas as features mobile-first implementadas. Produto pronto para lançamento — pendente: créditos Anthropic, migration SQL, configuração Google OAuth no Supabase Dashboard.

## O QUE FOI FEITO NESTA SESSÃO
- Splash screen nativa no app.html (CSS crítico inline, spinner, auto-remove após boot)
- Preconnect para Supabase + dns-prefetch CDN
- Service Worker v22: skip Google Auth URLs (accounts.google, googleapis/oauth)
- Performance metrics no console (DOM Ready, Load, TTFB, Transfer)
- Login Google redesenhado: botão Google como PRIMEIRO (acima do email)
- prompt:select_account adicionado ao OAuth para sempre mostrar seletor
- Estilo mais proeminente para botão Google (auth-google-primary)
- Layout login/cadastro: Google → divider → email/senha

## O QUE ESTÁ FUNCIONANDO
- 18 disciplinas, 38 módulos, 380 aulas com quizzes ✅
- Gamificação completa (XP, níveis, streaks, badges, ligas) ✅
- Leaderboards semanais com 5 ligas ✅
- Dashboard de pais com PIN ✅
- Paywall real (progressão + plano premium) ✅
- Certificados PDF módulo + disciplina ✅
- Prática infinita com IA ⚠️ precisa de créditos Anthropic
- Tutor IA com Claude ⚠️ precisa de créditos Anthropic
- Plano de estudos personalizado ✅
- Desafios sociais via WhatsApp ✅
- Admin dashboard com métricas ✅
- Notificações inteligentes ✅
- Eventos de XP duplo ✅
- Leaderboard Supabase ⚠️ precisa executar migration SQL
- Login Google OAuth ⚠️ precisa configurar Google Cloud Console + Supabase Provider
- Service worker v22 com cache + update banner ✅
- PWA instalável (Android + iOS) ✅
- Mobile-first: bottom nav, header, safe areas, splash ✅
- Skeleton loading + pull-to-refresh ✅
- Performance: preconnects, splash screen, metrics ✅
- Vite build pipeline + GitHub Actions CI/CD ✅

## O QUE FALTA FAZER
- [ ] Adicionar créditos na conta Anthropic (ativar tutor IA + quiz IA) — ALTA (ação do Renato)
- [ ] Executar migration SQL `supabase/migrations/20260331_leaderboard.sql` no Supabase — ALTA (ação do Renato)
- [ ] Configurar Google OAuth: Google Cloud Console + Supabase Provider — ALTA (ação do Renato, instruções na seção 2.1 do prompt)
- [ ] Testes end-to-end do fluxo de pagamento Stripe — ALTA
- [ ] App nativo via Capacitor (push notifications iOS/Android) — MÉDIA
- [ ] Split app.js em ES modules (manutenibilidade) — MÉDIA
- [ ] Video-aulas curtas (3-5 min) com player integrado — MÉDIA
- [ ] Dashboard admin: analytics avançados (cohorts, LTV) — MÉDIA
- [ ] Fórum/comunidade in-app — BAIXA
- [ ] Contato com ANED para parceria — BAIXA

## BUGS CONHECIDOS
- Nenhum bug crítico. Build Vite passando sem erros.
- `shareProgress()` duplicada no app.js (~linha 1319 e ~3537). A segunda (canvas) sobrescreve. `shareWhatsApp()` é a de marketing. Podem coexistir.

## DECISÕES TÉCNICAS TOMADAS
- Splash screen com CSS inline no `<head>` para renderizar antes do CSS externo
- Preconnect para Supabase mas NÃO preconnect para Google (SW já não cacheia)
- SW v22 skip explícito de `accounts.google` e `googleapis.com/oauth`
- Login: Google como botão principal ACIMA do email, com estilo mais proeminente
- `prompt: 'select_account'` garante que o seletor de contas Google sempre aparece
- Profile auto-creation já existia em `onSignIn()` (pega `user_metadata.full_name`)

## ARQUIVOS MODIFICADOS NESTA SESSÃO
- `app.html` — splash screen inline com CSS crítico, preconnect Supabase
- `app.js` — splash removal após boot, performance metrics
- `sw.js` — v22, skip Google Auth URLs
- `auth.html` — Google como botão principal (reordenação), estilo proeminente
- `supabase-client.js` — prompt:select_account no OAuth

## NOTAS PARA A PRÓXIMA SESSÃO
- O Supabase URL e anon key estão em `supabase-client.js` (hardcoded)
- Para o Login Google funcionar, o Renato precisa:
  1. Criar credenciais OAuth em console.cloud.google.com
  2. Authorized Origins: `https://escolaliberal.com.br`, `https://hwjplecfqsckfiwxiedo.supabase.co`
  3. Authorized Redirect: `https://hwjplecfqsckfiwxiedo.supabase.co/auth/v1/callback`
  4. Ativar provider Google no Supabase Dashboard (Authentication → Providers)
- A migration `20260331_leaderboard.sql` precisa ser executada no Supabase SQL Editor
- O app.js tem ~4300 linhas — split em ES modules é prioridade média
- Os eventos XP do admin são salvos em `admin_settings` — o client-side ainda não faz fetch deles

## HISTÓRICO DE SESSÕES
| # | Data | Resumo |
|---|------|--------|
| 1 | 2026-03-31 | Fases 6-9: leaderboards, dashboard pais, paywall, certificados PDF, quiz IA, XP duplo, plano de estudos, notificações, cert disciplina, webhook fix, admin dashboard, desafios sociais, leaderboard Supabase, sync visual, tema disciplina, exam prep, simulador expandido, mobile splash, WhatsApp viral, skeleton loading (26 commits) |
| 2 | 2026-03-31 | Performance: splash screen, preconnects, SW v22 (skip Google Auth), metrics. Login Google redesenhado: botão principal, prompt select_account, estilo proeminente (3 commits) |
