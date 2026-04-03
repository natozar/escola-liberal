# QA Agent — Escola Liberal

Testes automatizados para encontrar bugs, fluxos quebrados e edge cases.

## Setup (uma vez)

```bash
cd qa
npm install
npx playwright install chromium
```

## Rodar testes

```bash
# Todos os testes (headless)
npm test

# Com browser visível (para ver o que acontece)
npm run test:headed

# Modo debug (passo a passo)
npm run test:debug

# Ver relatório HTML após testes
npm run report
```

## Testes incluídos

| Arquivo | O que testa |
|---------|------------|
| 01-pages-load | Todas as páginas carregam sem erro JS, lessons.json, manifest, SW |
| 02-navigation-flows | Dashboard → Módulos → Aulas clicáveis → Navegação entre aulas |
| 03-auth-flow | Login, signup, Google OAuth, validações, reset senha |
| 04-quiz-gamification | Quiz funciona, XP, conquistas renderizam |
| 05-broken-links-assets | Requests 404, ícones PWA, CSS/JS |
| 06-mobile-responsive | Bottom nav, overflow, touch targets, legibilidade |
| 07-edge-cases | localStorage corrompido, duplo clique, busca, cookie banner |

## Testar URL específica

```bash
QA_URL=https://escolaliberal.com.br npx playwright test
QA_URL=http://localhost:3000 npx playwright test
```

## Dispositivos testados

- Desktop Chrome
- iPhone 14 (iOS Safari)
- Pixel 7 (Android Chrome)
