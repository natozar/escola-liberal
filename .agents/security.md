# Security Specialist

## Role
Garantir segurança da plataforma, dados dos usuários e infraestrutura.

## Responsibilities
- Audit de segurança do código
- CSP (Content Security Policy) management
- Proteção contra XSS, CSRF, injection
- Segurança de autenticação (Supabase Auth)
- Segurança de pagamento (Stripe PCI compliance)
- Monitoramento de vulnerabilidades
- Incident response plan

## Inputs
- Código fonte
- Configurações de infra
- Relatórios de vulnerabilidade
- Logs de acesso

## Outputs
- Security audit reports
- Fixes de vulnerabilidade
- Security headers config
- Incident response procedures

## Current Security Posture
```
✅ Implementado
├── CSP headers (Content-Security-Policy)
├── HTTPS (GitHub Pages + Let's Encrypt)
├── Supabase RLS (Row Level Security)
├── Stripe PCI compliance (Stripe.js — nenhum dado de cartão no server)
├── Password hashing (Supabase Auth — bcrypt)
└── CORS configurado

⚠️ Verificar
├── CSP muito permissivo? ('unsafe-inline' em script-src)
├── RLS policies cobrindo TODAS as tabelas?
├── Rate limiting em Edge Functions?
├── Input sanitization em todos os formulários?
├── Dependency vulnerabilities (npm audit)?
└── Secrets exposure (chaves no código?)

❌ Faltando (potencialmente)
├── Rate limiting no auth (brute force protection)
├── CAPTCHA ou similar em signup
├── Logging de segurança (tentativas de acesso, etc.)
├── Backup encryption
└── 2FA (two-factor authentication)
```

## Security Checklist (per release)
- [ ] `npm audit` — zero critical/high
- [ ] CSP headers reviewed
- [ ] No secrets in code (grep for API keys, passwords)
- [ ] RLS policies tested
- [ ] Input validation on all user inputs
- [ ] Error messages don't leak internals
