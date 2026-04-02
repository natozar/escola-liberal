# Orchestrator — Sistema de Orquestração de Agentes

## Como funciona

Quando o usuário define um objetivo, o orquestrador:

1. **Analisa** o objetivo e identifica quais agentes são necessários
2. **Decompõe** em tarefas atômicas
3. **Atribui** cada tarefa ao agente especializado
4. **Executa** (paralelo quando possível, sequencial quando há dependências)
5. **Consolida** resultados
6. **Valida** com QA
7. **Reporta** ao usuário

## Routing Rules

```
Objetivo do usuário → Agentes ativados
─────────────────────────────────────────────
"Melhorar performance"     → Frontend + Mobile + QA + DevOps
"Nova feature X"           → Architect + PM → Frontend + Backend + QA
"Corrigir bug em mobile"   → Mobile + QA
"Criar campanha"           → Marketing + Copywriter + Social + Traffic
"Revisar segurança"        → Security + LGPD + Backend
"Melhorar conversão"       → UX + Copywriter + Data + Frontend
"Adicionar aulas"          → PM + Backend + Frontend + QA
"Deploy"                   → DevOps + QA
"Integrar AI"              → AI Integrations + Architect + Backend + Frontend
"Revisar legal"            → Legal + LGPD + Copyright
"Pricing"                  → Monetization + Business + Data
"SEO"                      → Marketing + Copywriter + Frontend + DevOps
```

## Execution Modes

### Mode 1: Autonomous (baixo risco)
Agentes executam sem parar para aprovação.
Usado para: refactoring, testes, análise, documentação.

### Mode 2: Supervised (alto risco)
Cada mudança é apresentada ao usuário antes de aplicar.
Usado para: mudanças em produção, pagamento, auth, dados de usuários.

### Mode 3: Hybrid (padrão)
Agentes executam livremente, mas param em checkpoints:
- Antes de alterar fluxo de pagamento
- Antes de alterar autenticação
- Antes de deletar dados
- Antes de deploy para produção
- Antes de mudar configurações de segurança

## Task Decomposition Template

```
OBJETIVO: [descrição do objetivo]

ANÁLISE:
- Impacto: [alto/médio/baixo]
- Risco: [alto/médio/baixo]
- Agentes necessários: [lista]
- Modo de execução: [auto/supervised/hybrid]

TAREFAS:
1. [tarefa] → agente: [X], depende de: [nenhuma/tarefa N]
2. [tarefa] → agente: [X], depende de: [tarefa 1]
...

VALIDAÇÃO:
- QA: [critérios de aceitação]
- Lighthouse: [scores mínimos]
- Testes: [quais suites rodar]

ROLLBACK:
- [como reverter se algo der errado]
```

## Communication Protocol

Agentes se comunicam via:
1. **Arquivos compartilhados** — código, configs, docs no repo
2. **Git** — branches, commits, diffs
3. **Contexto do orquestrador** — resultados de um agente alimentam o próximo
4. **PROGRESS.md** — status global do projeto

## Feedback Loop

```
Execute → Test → Review → Fix → Re-test → Ship
   ↑                                         │
   └─────────── se falhar ──────────────────┘
```

Cada ciclo:
1. Agente executa tarefa
2. QA valida resultado
3. Se falhou → agente recebe feedback + corrige
4. Se passou → próxima tarefa ou merge
5. Máximo 3 iterações antes de escalar ao usuário
