# Prompts para Claude Code — Escola Liberal

Execute cada prompt separadamente, na ordem. Faça commit depois de cada um.

---

## PROMPT 1 — Restrição 18+ (remover Lei Felca infantil)

```
Leia CLAUDE.md antes de começar. Contexto: a plataforma agora é EXCLUSIVAMENTE para maiores de 18 anos. Não atende mais crianças ou adolescentes. Preciso remover toda lógica de Lei Felca relacionada a menores, consentimento parental e bloqueio de debate por idade. A verificação de idade 18+ PERMANECE.

ALTERAÇÕES NECESSÁRIAS:

### 1. src/features/onboarding.js
O arquivo está truncado na linha 107 (termina com "}ca"). Reescreva o arquivo COMPLETO com estas mudanças:
- MANTER: verificação de idade 18+ (obVerifyAge com bloqueio para < 18)
- MANTER: step de perfil (nome + avatar)
- REMOVER: toda referência a "child", "teen", "young" como age groups
- REMOVER: funções obConfirmParental(), _hashPINSimple() (se não usada em outro lugar)
- REMOVER: lógica de consentimento parental (parentalConsent, parentalConsentAt, PIN parental)
- SIMPLIFICAR: ageGroup aceita apenas "adult" ou "blocked" (< 18)
- Mensagem de bloqueio para < 18: "Acesso restrito. Esta plataforma é exclusiva para maiores de 18 anos."
- Garantir que o arquivo termina corretamente (o original está corrompido)

### 2. app.html — seção onboarding (linhas ~178-207)
- MANTER: Step 1 (verificação de idade com date input) — já está correto
- MANTER: Step 2 (nome + avatar) — já está correto
- REMOVER: qualquer step de consentimento parental (se existir steps ocultos)
- Atualizar comentário HTML de "Age gate 18+ (Lei Felca 15.211/2025)" para "Age gate 18+"

### 3. app.js — seção onboarding (linhas ~1240-1310)
- Na função initOnboard(): remover qualquer referência a ageGroup !== 'adult'
- Na função obFinish(): remover salvamento de parentalConsent, parentalConsentAt
- MANTER: todo o resto do onboarding (avatar, lang, state, GA4 event)

### 4. app.js — seção debate (procurar goDebate)
- REMOVER: gate que bloqueia debate para child/teen (< 16 anos)
- Debate agora é aberto para todos os usuários autenticados (todos são 18+)

### 5. src/boot.js
- Nenhuma alteração necessária (DEMO_MODE/OFFLINE_MODE já pula onboarding)

### 6. Buscar em TODOS os arquivos .js e .html por estas strings e remover/simplificar:
- "parentalConsent" → remover toda lógica
- "parentalConsentAt" → remover
- "obConfirmParental" → remover
- "ageGroup==='child'" ou "ageGroup==='teen'" ou "ageGroup==='young'" → simplificar (só existe 'adult' e 'blocked')
- "Lei Felca" ou "Lei 15.211" → manter apenas menções informativas em termos.html e privacidade.html, remover dos comentários de código
- "age<16" ou "age<10" ou "age<12" → substituir por "age<18" onde aplicável

REGRAS:
- NÃO alterar design visual
- NÃO quebrar funcionalidade offline
- NÃO remover a verificação de idade 18+ (ela PERMANECE)
- NÃO alterar lógica de Stripe/pagamento
- Incrementar SW_VERSION no sw.js
- Testar: npm run build
- Commit: "feat: simplify age gate to 18+ only, remove Lei Felca minor protections"
```

---

## PROMPT 2 — Repositionamento Startup Adulto 18+

```
Leia CLAUDE.md antes de começar. Contexto: a Escola Liberal agora é posicionada como startup educacional para ADULTOS 18+ que não tiveram acesso a educação básica de qualidade. Tagline: "A educação que a escola deveria ter dado." Público: adultos que querem transformar suas vidas através de conhecimento prático.

ALTERAÇÕES NECESSÁRIAS:

### 1. index.html — Landing Page

#### Meta tags (linhas ~15-30):
- description: "A educação que a escola deveria ter dado. Plataforma gratuita com 21 disciplinas e 660 aulas para adultos: Economia, Filosofia, Finanças, Oratória, Programação, IA e mais. Gamificação, certificados e tutor com IA. 100% offline."
- keywords: REMOVER todas as referências a "crianças", "homeschool", "homeschooling", "educação domiciliar", "ANED", "escola em casa", "for kids". ADICIONAR: "educação para adultos", "segunda chance educacional", "aprender economia", "educação financeira adultos", "plataforma educacional gratuita", "curso gratuito online", "educação transformadora", "startup educacional"
- og:title: "Escola Liberal — A Educação que a Escola Deveria Ter Dado"
- og:description: "21 disciplinas, 660 aulas gratuitas para adultos. Economia, Filosofia, Finanças, Programação e mais. Gamificação e certificados. 100% offline."

#### Schema.org (linhas ~295-297 e ~667-734):
- Course schema: mudar "educationalLevel" de "10-16 anos" para "Adultos 18+"
- Course schema: mudar "description" para refletir público adulto
- EducationalOrganization: atualizar description removendo "homeschool"
- FAQPage: atualizar respostas para público adulto

#### Hero section (linhas ~388-432):
- hero-eyebrow: "21 Disciplinas · 660 Aulas · Gratuito · PT + EN"
- h1: MANTER "A educação que a escola deveria ter dado." (já está bom)
- hero-desc: "Você não teve a educação que merecia. Agora pode ter. 21 disciplinas, 660 aulas gratuitas sobre economia, filosofia, finanças, oratória, lógica, programação e mais. Com gamificação, certificados e tutor IA. Funciona offline, no seu celular."
- hero-card-title: "21 Disciplinas · 66 Módulos · 660 Aulas"

#### Trust numbers (linhas ~436-443):
- Mudar para: 21 Disciplinas | 660 Aulas interativas | 66 Módulos completos | 100% Gratuito

#### Features section (linhas ~446-483):
- Título: "Por que a Escola Liberal?" → MANTER
- Subtítulo: mudar para "O conhecimento que a escola não ensinou. Metodologias reconhecidas internacionalmente, agora acessíveis para quem quer recomeçar."
- "Aprenda Onde Quiser" feat-desc: "PWA que funciona 100% offline. Instale no celular e estude no ônibus, no intervalo, em qualquer lugar. Seu progresso sincroniza quando há conexão."

#### Disciplines section (linhas ~486-570):
- Título: "21 Disciplinas · 66 Módulos"
- Subtítulo: "660 aulas com quizzes, gamificação e metodologias reconhecidas. O conhecimento que a escola deveria ter ensinado."

#### Testimonials section (linhas ~610-629):
Reescrever os 3 depoimentos para público adulto:
- Depoimento 1: Marcos R., Motorista de app, 38 anos → "Larguei a escola na 8ª série. Depois de 3 meses na Escola Liberal, entendo mais de economia que muito formado. O formato gamificado me mantém estudando todo dia."
- Depoimento 2: Ana Luíza S., Empreendedora, 29 anos → "Uso a plataforma para aprender finanças e oratória. Os quizzes e flashcards são viciantes. Já apliquei o que aprendi no meu negócio."
- Depoimento 3: Paulo T., Operário, 42 anos → "Nunca tive chance de estudar filosofia ou economia. A Escola Liberal me deu essa oportunidade. Gratuita e funciona sem internet — perfeita pra quem trabalha o dia todo."

#### FAQ section (linhas ~632-642):
- Pergunta "Para qual faixa etária?": "A plataforma é para adultos (18+) que querem recuperar o tempo perdido na educação. Não importa se você parou de estudar cedo ou se é formado — o conteúdo é prático e progressivo."
- REMOVER pergunta sobre ANED/homeschool
- ADICIONAR pergunta: "Preciso ter completado o ensino médio?" → "Não. O conteúdo é acessível para todos os níveis. Cada disciplina começa do zero e avança progressivamente."
- ADICIONAR pergunta: "Serve para quem já é formado?" → "Sim. A maioria das disciplinas (economia, filosofia, inteligência emocional, oratória) não é ensinada nas escolas. Mesmo quem tem diploma vai aprender coisas novas."

#### CTA section (linhas ~645-653):
- h2: "Sua segunda chance começa agora."
- p: "21 disciplinas, 660 aulas, gamificação e certificados. 100% gratuito, 100% offline. Para quem quer aprender de verdade."

#### Footer (linhas ~658-664):
- REMOVER referências a homeschool
- Manter: "A educação que a escola deveria ter dado"
- Legal footer: MANTER (citações, Art. 46, INPI)

#### Mobile welcome screen (linhas ~303-318):
- mw-sub: "A educação que a escola deveria ter dado. Gratuita e offline."

### 2. termos.html
- Seção 2 (descrição): atualizar para "plataforma educacional para adultos (18+)"
- Seção 14 (Lei Felca): SIMPLIFICAR — manter apenas: "A plataforma é exclusiva para maiores de 18 anos. Verificação de idade no primeiro acesso. Não coletamos dados de menores."
- Remover referências a "crianças", "adolescentes", "consentimento parental", "painel parental"
- Manter referências à Lei 15.211/2025 como compliance informativo

### 3. privacidade.html
- Seção 8 (Dados de crianças): reescrever como "Dados de menores de idade" — "Não coletamos dados de menores de 18 anos. A verificação de idade é realizada no primeiro acesso. Se identificarmos uso por menor, a conta será suspensa e os dados excluídos."
- Seção 8-A (IA): remover "O uso do tutor IA por menores requer consentimento parental" e "Pais e responsáveis podem desativar..."
- Seção 10 (Lei Felca): SIMPLIFICAR — remover itens sobre consentimento parental, dados de menores, debate restrito, painel parental. Manter apenas: restrição 18+, verificação de idade, ausência de design manipulativo, ausência de publicidade comportamental.

### 4. auth.html
- Se houver referências a "homeschool" ou "crianças", atualizar para público adulto

### 5. manifest.json
- description: atualizar removendo "homeschool" se presente

### 6. blog/ (posts)
- NÃO alterar conteúdo dos posts do blog (são educacionais e neutros)

REGRAS:
- NÃO alterar design visual, cores, layout ou CSS
- NÃO quebrar funcionalidade offline
- NÃO alterar lógica de JS (apenas textos/conteúdo HTML)
- NÃO alterar lógica de Stripe/pagamento
- Manter bilíngue PT/EN onde já existe
- Incrementar SW_VERSION no sw.js
- Testar: npm run build
- Commit: "feat: reposition platform for 18+ adults, remove homeschool references"
```

---

## PROMPT 3 — SQL Migrations (Leaderboard + State + Debate)

```
Leia CLAUDE.md antes de começar. Contexto: existem migrations SQL pendentes que precisam ser consolidadas em um único arquivo pronto para execução no Supabase SQL Editor.

TAREFA:

### 1. Ler os 4 arquivos de migration existentes:
- supabase/migrations/20260331_leaderboard.sql
- supabase/migrations/add_state_to_profiles.sql
- supabase/migrations/consolidated-pending.sql
- supabase/migrations/consolidated-ready.sql

### 2. Criar um único arquivo consolidado:
Caminho: supabase/migrations/EXECUTE-THIS.sql

Este arquivo deve:
- Ser IDEMPOTENTE (usar IF NOT EXISTS, ON CONFLICT DO NOTHING, etc.)
- Ser seguro para executar múltiplas vezes sem erro
- Incluir TUDO que está em consolidated-ready.sql (que é o mais completo)
- Verificar que inclui:
  - weekly_xp table (leaderboard)
  - profiles.state column
  - debate_messages table
  - Todas as RLS policies
  - Todos os indexes
  - Trigger handle_new_user
  - Trigger protect_plan_fields
  - Realtime publication para debate_messages
- Adicionar no TOPO: comentário com data e instruções
- Adicionar no FINAL: query de verificação (SELECT count(*) de cada tabela criada)
- NÃO incluir seção de rollback (remover se existir)

### 3. Atualizar CLAUDE.md:
- No item 5 (Leaderboard migration): marcar como "RESOLVIDO — consolidado em EXECUTE-THIS.sql"
- No item 6 (Migration pendente state): marcar como "RESOLVIDO — consolidado em EXECUTE-THIS.sql"
- Adicionar nota: "Para executar: copiar conteúdo de supabase/migrations/EXECUTE-THIS.sql e colar no SQL Editor do Supabase Dashboard."

REGRAS:
- NÃO alterar nenhum arquivo JS ou HTML
- NÃO executar o SQL (apenas criar o arquivo)
- O arquivo deve funcionar no Supabase SQL Editor (PostgreSQL)
- Commit: "chore: consolidate all pending SQL migrations into single executable file"
```

---

---

## PROMPT 4 — Limpeza Final de Referências Desatualizadas

```
Leia CLAUDE.md antes de começar. Contexto: a Escola Liberal foi reposicionada como startup educacional para ADULTOS 18+. Os Prompts 1-3 já foram executados. Restam referências desatualizadas a "homeschool", "educação domiciliar", "380 Aulas", "18 Disciplinas", "10-16 anos", "ANED", "crianças" espalhadas em arquivos que não foram cobertos.

ALTERAÇÕES NECESSÁRIAS:

### 1. index.html

#### Linha 53 — <title>:
DE: "Escola Liberal — Plataforma Homeschool | 18 Disciplinas · 380 Aulas Interativas | Educação Domiciliar"
PARA: "Escola Liberal — A Educação que a Escola Deveria Ter Dado | 21 Disciplinas · 660 Aulas Gratuitas"

#### Linha 399 — botão hero:
DE: "Ver as 18 Disciplinas"
PARA: "Ver as 21 Disciplinas"

#### Linhas 740-747 — Schema.org WebSite:
DE: "Plataforma curricular homeschool brasileira com 21 disciplinas e 660 aulas interativas. Bilíngue PT/EN."
PARA: "Plataforma educacional gratuita para adultos com 21 disciplinas e 660 aulas interativas. Economia, Filosofia, Finanças, Programação e mais. Bilíngue PT/EN."

### 2. termos.html

#### Linha 9 — meta description:
DE: "Termos de Uso da plataforma Escola Liberal. Regras de uso, direitos do usuário e responsabilidades na plataforma de educação domiciliar homeschool."
PARA: "Termos de Uso da plataforma Escola Liberal. Regras de uso, direitos do usuário e responsabilidades na plataforma educacional para adultos."

#### Linha 24 — <title>:
DE: "Termos de Uso — Escola Liberal | Plataforma Homeschool"
PARA: "Termos de Uso — Escola Liberal | Plataforma Educacional para Adultos"

### 3. privacidade.html

#### Linha 9 — meta description:
DE: "Política de Privacidade da Escola Liberal. Como coletamos, usamos e protegemos seus dados na plataforma de educação domiciliar homeschool. LGPD compliant."
PARA: "Política de Privacidade da Escola Liberal. Como coletamos, usamos e protegemos seus dados na plataforma educacional para adultos. LGPD compliant."

#### Linha 24 — <title>:
DE: "Política de Privacidade — Escola Liberal | Plataforma Homeschool"
PARA: "Política de Privacidade — Escola Liberal | Plataforma Educacional para Adultos"

### 4. app.html — Certificado

#### Linha 765:
DE: "Escola Liberal — Plataforma Homeschool"
PARA: "Escola Liberal — Plataforma Educacional"

### 5. app.js — Certificados (3 ocorrências)

#### Linha 986 (HTML do certificado):
DE: "Escola Liberal — Plataforma Homeschool"
PARA: "Escola Liberal — Plataforma Educacional"

#### Linha 1022 (canvas export):
DE: 'Escola Liberal — Plataforma Homeschool'
PARA: 'Escola Liberal — Plataforma Educacional'

#### Linha 2077 (canvas share):
DE: 'Escola Liberal — Plataforma Homeschool'
PARA: 'Escola Liberal — Plataforma Educacional'

### 6. src/features/chat.js

#### Linha 151 — ageGroup default:
DE: ageGroup:window.S.ageGroup||'teen'
PARA: ageGroup:window.S.ageGroup||'adult'

### 7. src/features/moderation.js

#### Linha 3 — comentário:
DE: "Publico: criancas 10-16 anos + adultos. Seguranca e prioridade."
PARA: "Publico: adultos 18+. Seguranca e prioridade."

#### Linha 71 — lista de palavras educacao:
Na array 'educacao', remover apenas a palavra 'crianca' da lista. Manter todas as outras palavras.

### 8. CLAUDE.md — Atualizar identidade do projeto

#### Linha 5 (descrição principal):
DE: "Plataforma PWA educacional para homeschool brasileiro. 21 disciplinas, 66 módulos, 660 aulas interativas. Público: jovens de 10 a 16 anos. Bilíngue PT/EN. Gratuita. Offline-first. Gamificação completa. Compatível com ANED. Criada por Renato Rodrigues (Ribeirão Preto/SP)."
PARA: "Plataforma PWA educacional para adultos brasileiros que não tiveram acesso a educação básica de qualidade. 21 disciplinas, 66 módulos, 660 aulas interativas. Público: adultos 18+. Tagline: 'A educação que a escola deveria ter dado.' Bilíngue PT/EN. Gratuita. Offline-first. Gamificação completa. Criada por Renato Rodrigues (Ribeirão Preto/SP)."

#### Seção "Compliance Lei Felca" — bloco "Verificacao de idade":
DE: "Faixas: blocked (<10), child (10-11), teen (12-15), young (16-17), adult (18+)."
PARA: "Faixas: blocked (<18), adult (18+)."

#### Bugs Conhecidos — itens 5 e 6:
Já estão marcados como RESOLVIDO. OK.

### 9. NÃO ALTERAR (preservar como estão):
- blog/ → conteúdo educacional neutro, posts existentes ficam
- prompts/*.md → documentação histórica dos prompts de IA
- .agents/*.md → estratégia interna, atualizar em momento separado
- PROGRESS.md → log histórico do projeto

REGRAS:
- NÃO alterar design visual, cores, layout ou CSS
- NÃO quebrar funcionalidade offline
- NÃO alterar lógica de Stripe/pagamento
- NÃO alterar blog posts
- Incrementar SW_VERSION no sw.js
- Testar: npm run build
- Commit: "feat: cleanup remaining homeschool references, update metadata for 18+ adult platform"
```

---

## Ordem de execução

1. **PROMPT 1** primeiro (restrição 18+) ✅
2. **PROMPT 2** depois (repositionamento) ✅
3. **PROMPT 3** por último (SQL) ✅
4. **PROMPT 4** limpeza final (referências desatualizadas)

Cada prompt faz `npm run build` e commit próprio. Execute um de cada vez.
