# Sistema de Agentes — Escola Liberal

## Arquitetura

Este sistema usa **Claude Code como orquestrador** com agentes especializados definidos como prompts estruturados. Não é um framework externo — é um sistema prático que funciona AGORA dentro do Claude Code.

### Como funciona

```
┌─────────────────────────────────────────────────────┐
│                  ORQUESTRADOR (Claude Code)          │
│                                                      │
│  Recebe objetivo → Decompõe em tarefas → Despacha   │
│  para agentes especializados → Consolida resultado   │
└──────────┬──────────┬──────────┬──────────┬─────────┘
           │          │          │          │
     ┌─────▼──┐ ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
     │Frontend│ │Backend │ │  QA    │ │  UX    │  ...
     │Engineer│ │Engineer│ │ Tester │ │Designer│
     └────────┘ └────────┘ └────────┘ └────────┘
```

### Modos de execução

1. **Autônomo** — agentes executam sem pedir aprovação (tarefas de baixo risco)
2. **Supervisionado** — cada ação é aprovada pelo usuário
3. **Híbrido** (padrão) — apenas checkpoints críticos pedem aprovação

### Como invocar

Diga ao Claude Code qual objetivo quer alcançar. Exemplos:

- "Melhore a performance da landing page" → invoca Frontend + UX + QA
- "Adicione sistema de notificações push" → invoca Architect + Backend + Frontend + Mobile
- "Crie campanha de lançamento" → invoca Marketing + Copywriter + Social Media
- "Revise conformidade LGPD" → invoca Legal + Privacy + Security

### Agentes disponíveis

| Categoria | Agente | Arquivo |
|-----------|--------|---------|
| **Gestão** | CEO / Estrategista | `ceo.md` |
| **Gestão** | Project Manager | `pm.md` |
| **Gestão** | System Architect | `architect.md` |
| **Dev** | Frontend Engineer | `frontend.md` |
| **Dev** | Backend Engineer | `backend.md` |
| **Dev** | Mobile/PWA Specialist | `mobile.md` |
| **Dev** | DevOps Engineer | `devops.md` |
| **Dev** | QA Tester | `qa.md` |
| **Design** | UI/UX Designer | `uiux.md` |
| **Design** | Branding Specialist | `branding.md` |
| **Marketing** | Marketing Strategist | `marketing.md` |
| **Marketing** | Copywriter | `copywriter.md` |
| **Marketing** | Social Media Manager | `social.md` |
| **Marketing** | Traffic Manager | `traffic.md` |
| **Business** | Business Analyst | `business.md` |
| **Business** | Monetization Specialist | `monetization.md` |
| **Business** | Data Analyst | `data.md` |
| **Legal** | Legal Advisor (BR) | `legal.md` |
| **Legal** | LGPD Specialist | `lgpd.md` |
| **Legal** | Copyright/IP Specialist | `copyright.md` |
| **Extra** | Automation Engineer | `automation.md` |
| **Extra** | AI Integrations | `ai-integrations.md` |
| **Extra** | Security Specialist | `security.md` |
