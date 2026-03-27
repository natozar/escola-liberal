# escola liberal para Bilionário — Setup Guide

## 🚀 Site Ao Vivo
**https://natozar.github.io/escola-conservadora/**

## 📁 Arquitetura

```
escola-conservadora/
├── index.html          # Landing page (SEO, PWA install)
├── app.html            # Aplicação principal (293KB, single-file)
├── supabase-auth.js    # Autenticação + sync na nuvem
├── stripe-billing.js   # Sistema de assinatura/cobrança
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker v3
├── offline.html        # Fallback offline
├── contato.html        # Página de contato
├── privacidade.html    # Política de privacidade
├── termos.html         # Termos de uso
├── sobre.txt           # Documentação do projeto
├── robots.txt          # SEO
├── sitemap.xml         # SEO
├── netlify.toml        # Config (alternativa deploy)
├── assets/icons/       # Ícones PWA
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── supabase/
    ├── schema.sql              # Schema do banco de dados
    └── functions/
        ├── create-checkout.ts  # Edge Function: Stripe checkout
        └── stripe-webhook.ts   # Edge Function: Stripe webhooks
```

## ⚡ Funcionamento Atual (Sem Setup)

O app funciona 100% offline com localStorage. Todas as features (60 aulas, quizzes, gamificação, notas, etc.) funcionam sem backend.

## 🔧 Setup Supabase (Auth + Cloud Sync)

### 1. Criar Projeto
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Anote a **URL** e **anon key** (Settings > API)

### 2. Criar Tabelas
1. Vá em SQL Editor
2. Cole e execute o conteúdo de `supabase/schema.sql`

### 3. Configurar Auth
1. Authentication > Providers > Email (já ativo por padrão)
2. Para Google Login: Authentication > Providers > Google
   - Crie credenciais OAuth no [Google Console](https://console.cloud.google.com)
   - Cole Client ID e Secret

### 4. Atualizar Credenciais
Em `supabase-auth.js`, substitua:
```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-anon-key';
```

### 5. Adicionar Scripts no app.html
Antes do `</body>`, adicione:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-auth.js"></script>
```

## 💳 Setup Stripe (Billing)

### 1. Criar Conta Stripe
1. Acesse [stripe.com](https://stripe.com) → Criar conta
2. Copie a **Publishable Key** (Developers > API Keys)

### 2. Criar Produtos
No Stripe Dashboard > Products, crie:

| Produto | Preço | Tipo |
|---------|-------|------|
| Premium Mensal | R$29,90/mês | Recurring |
| Premium Anual | R$238,80/ano (R$19,90/mês) | Recurring |
| Acesso Vitalício | R$497 (único) | One-time |

Copie os **Price IDs** (price_xxx) de cada um.

### 3. Atualizar Credenciais
Em `stripe-billing.js`, substitua:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_sua-chave';
// E os priceId de cada plano
```

### 4. Deploy Edge Functions
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook

supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 5. Configurar Webhook
No Stripe Dashboard > Developers > Webhooks:
- URL: `https://seu-projeto.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### 6. Adicionar Scripts no app.html
```html
<script src="https://js.stripe.com/v3/"></script>
<script src="stripe-billing.js"></script>
```

## 📱 PWA Features
- Instalável em Android/iOS/Desktop
- Funciona offline (Service Worker v3)
- Cache inteligente de assets
- Splash screen customizada

## 🎮 Features do App
- 6 módulos × 10 aulas = 60 aulas
- Sistema de XP e níveis
- Quizzes por aula + maratona
- Repetição espaçada inteligente
- Notas e favoritos
- Missões semanais
- Conquistas/badges
- Múltiplos perfis
- Tema claro/escuro
- Timeline de atividades
- Certificados digitais
- Desafio diário
