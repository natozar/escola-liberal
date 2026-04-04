# Prompt para Claude Code — Executar Pendências e Deploy

Cole este prompt inteiro no Claude Code na raiz do projeto Escola Liberal.

---

## Contexto

Estou na branch `feat/lei-felca-compliance`. Há 13 arquivos modificados que nunca foram commitados. O SW no dist/ está em v78 mas o sw.js raiz está em v79. A FASE 2 do update PWA já foi feita no código (skipWaiting só no message handler), mas o CLAUDE.md ainda diz "PENDENTE". Preciso consolidar tudo, commitar, buildar, e deixar pronto para deploy.

## Tarefas — Execute direto, sem perguntar

### ETAPA 1: Atualizar CLAUDE.md

1. Ler o CLAUDE.md
2. Na seção `### ⚠️ PENDENTE: FASE 2 do update PWA` (linha ~676), substituir todo o bloco por:

```
### ✅ CONCLUÍDO: FASE 2 do update PWA
- skipWaiting() removido do install event (só no message handler)
- controllerchange condicionado a _userRequestedUpdate
- Política de atualização permanente aplicada
- SW v79
```

3. Na tabela de Stack Técnica (linha ~22), atualizar `Service Worker v37` para `Service Worker v79`
4. Na seção "Identidade do Projeto" (linha ~5), atualizar `61 módulos, 610+ aulas` para `66 módulos, 660 aulas` (dados reais extraídos do index.json)
5. Adicionar nova seção de sessão no final do histórico:

```
### Concluido nesta sessao (2026-04-04 — sessao de consolidacao)
- Commit consolidado: 13 arquivos pendentes (auth.html fix OAuth, supabase-schema.sql, ai-tutor Edge Function, manifests, CLAUDE.md)
- Build Vite: dist/ atualizado com SW v79
- FASE 2 PWA marcada como concluida (ja estava implementada desde sessao 9)
- Branch mergeada na main
- Deploy via GitHub Pages
```

### ETAPA 2: Commit dos arquivos pendentes

Rodar `git status` e `git diff --stat HEAD` para confirmar os 13 arquivos modificados.

Commitar apenas os arquivos relevantes (NÃO incluir pastas `Escola Liberal/`, `build-output/`, `dist-new/` que são untracked e irrelevantes):

```bash
git add auth.html CLAUDE.md supabase-schema.sql supabase/functions/ai-tutor/index.ts manifest.json manifest-admin.json assets/icons/admin-icon.svg sobre.txt
git commit -m "fix: consolidar pendências — OAuth auth.html, schema SQL, ai-tutor, manifests

- auth.html: initSupabase() roda antes de checkOAuthError() return (fix sbClient null)
- supabase-schema.sql: handle_new_user com EXCEPTION handler + ON CONFLICT
- ai-tutor/index.ts: ageGroup passado corretamente (Lei Felca)
- manifest.json e manifest-admin.json: atualizados
- CLAUDE.md: FASE 2 PWA marcada concluída, métricas atualizadas

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### ETAPA 3: Build Vite

```bash
npm run build
```

Verificar que o dist/sw.js agora tem `SW_VERSION = 'v79'`.
Se o build gerar novos arquivos no dist/, commitar:

```bash
git add dist/
git commit -m "build: dist atualizado com SW v79 e assets consolidados

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### ETAPA 4: Commitar arquivos dist pendentes anteriores

Se dist/admin.html ou dist/assets/build/manifest-*.json estavam modificados e NÃO foram incluídos no commit da etapa 2, incluir no commit do build (etapa 3).

### ETAPA 5: Merge na main e push

```bash
git checkout main
git merge feat/lei-felca-compliance --no-ff -m "merge: Lei Felca + OAuth fix + consolidação pendências"
git push origin main
```

### ETAPA 6: Verificação pós-deploy

Após o push, aguardar o GitHub Actions rodar. Verificar:

```bash
gh run list --limit 3
```

Quando o deploy completar, confirmar que https://escolaliberal.com.br está servindo a versão mais recente.

### ETAPA 7: Migrations SQL (INFORMATIVO — executar manualmente no Supabase)

Estas migrations precisam ser executadas no Supabase SQL Editor (https://supabase.com/dashboard). NÃO podem ser executadas via CLI aqui:

1. **consolidated-ready.sql** — CREATE TABLE debate_messages + RLS + indexes + Realtime publication
2. **20260331_leaderboard.sql** — CREATE TABLE weekly_xp para leaderboard semanal
3. **add_state_to_profiles.sql** — ALTER TABLE profiles ADD COLUMN state

Após executar, testar:
- `SELECT count(*) FROM debate_messages;` → deve retornar 0
- `SELECT count(*) FROM weekly_xp;` → deve retornar 0
- `SELECT state FROM profiles LIMIT 1;` → coluna deve existir

### ETAPA 8: Deploy Edge Function moderate-debate (INFORMATIVO)

```bash
supabase functions deploy moderate-debate
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
```

### ETAPA 9: Ativar AI Tutor (INFORMATIVO)

No Supabase Dashboard → Edge Functions → ai-tutor:
1. Verificar que a função está deployada
2. Configurar `ANTHROPIC_API_KEY` nos secrets
3. Testar via curl:
```bash
curl -X POST https://hwjplecfqsckfiwxiedo.supabase.co/functions/v1/ai-tutor \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Olá","lessonContext":"teste","ageGroup":"teen"}'
```

---

## Resumo das prioridades

| # | Tarefa | Automática? |
|---|--------|-------------|
| 1 | Atualizar CLAUDE.md | SIM — execute |
| 2 | Commit 13 arquivos | SIM — execute |
| 3 | npm run build | SIM — execute |
| 4 | Commit dist/ | SIM — execute |
| 5 | Merge main + push | SIM — execute |
| 6 | Verificar deploy | SIM — execute |
| 7 | Migrations SQL | NÃO — manual no Supabase |
| 8 | Deploy moderate-debate | NÃO — precisa Supabase CLI |
| 9 | Ativar AI Tutor | NÃO — manual no Supabase |

Etapas 1-6: execute direto sem perguntar.
Etapas 7-9: apenas listar como pendente no relatório final.
