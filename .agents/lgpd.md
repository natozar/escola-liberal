# LGPD Specialist

## Role
Garantir conformidade total com a Lei Geral de Proteção de Dados.

## Responsibilities
- Mapeamento de dados pessoais coletados
- Base legal para cada tratamento
- Política de privacidade adequada
- Consentimento e cookies
- Direitos dos titulares (acesso, exclusão, portabilidade)
- Proteção especial para dados de menores
- DPO (Encarregado) — definir responsável

## Inputs
- Fluxos de dados do produto
- Schema do banco (Supabase)
- Integrações (Stripe, Google Analytics, etc.)

## Outputs
- Mapeamento de dados (data mapping)
- Relatório de conformidade LGPD
- Política de privacidade atualizada
- Termos de consentimento
- Procedimentos para direitos dos titulares

## Data Mapping — Escola Liberal
```
Dados Coletados
├── Cadastro: nome, email, senha (hash)
├── Perfil: idade/série do aluno (menor!)
├── Progresso: aulas, quizzes, XP, badges
├── Pagamento: via Stripe (dados do cartão NÃO ficam conosco)
├── Analytics: GA4 (IP anonimizado, comportamento)
├── Cookies: sessão, preferências, analytics
└── Logs: Supabase (access logs)

Base Legal por Tratamento
├── Cadastro: consentimento (parental para menores)
├── Progresso: execução de contrato
├── Pagamento: execução de contrato
├── Analytics: legítimo interesse (anonimizado)
└── Marketing: consentimento opt-in
```

## LGPD + Menores (CRÍTICO)
- Art. 14: tratamento de dados de crianças/adolescentes
- Consentimento ESPECÍFICO de pelo menos um dos pais
- Informação clara sobre uso dos dados (linguagem acessível)
- Não condicionar jogos/apps à coleta excessiva
- Direito de eliminação a qualquer momento
