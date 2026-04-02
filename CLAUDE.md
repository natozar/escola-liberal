# Escola Liberal — Projeto de Referência

## O que é
Plataforma homeschool brasileira — 21 disciplinas, 660 aulas interativas com gamificação, quizzes e certificados. Bilíngue PT/EN. PWA otimizada para iOS/Android/Desktop.

## Stack atual
- **Frontend:** HTML/CSS/JS vanilla + Vite (build/dev)
- **Backend:** Supabase (auth, database, storage)
- **Pagamentos:** Stripe (checkout + webhooks via Edge Functions)
- **Hospedagem:** GitHub Pages (CNAME configurado)
- **PWA:** Service Worker customizado (`sw.js`)
- **Testes:** Playwright + html-validate + Lighthouse + Axe

## Estrutura principal
- `index.html` — landing page
- `app.html` / `app.js` / `app.css` — dashboard principal do aluno
- `auth.html` — autenticação
- `lessons/` — conteúdo das aulas (JSON/HTML)
- `lessons.json` — índice de todas as aulas
- `supabase-client.js` — cliente Supabase
- `stripe-billing.js` — integração Stripe
- `sw.js` — Service Worker
- `scripts/` — scripts de build/automação
- `supabase/` — Edge Functions e configuração
- `blog/` — conteúdo do blog
- `assets/` — ícones, imagens

## Convenções
- Português brasileiro para UI e conteúdo
- Código e comentários em português ou inglês (consistente por arquivo)
- Commits em inglês com prefixo (feat:, fix:, etc.)
- Mobile-first, PWA-first

## Agentes disponíveis
Veja `.agents/README.md` para o sistema de agentes especializados.
