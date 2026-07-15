# Pacote de Hardening de Segurança — Debate + Edge Functions

Gerado pela auditoria QA forense (2026-07-15). Fecha os buracos server-side que
o `_esc` no cliente (já deployado) não alcança. **Nada aqui foi aplicado em
produção** — você revisa e aplica.

---

## Parte 1 — SQL: validação server-side do debate (2 min)

**Arquivo:** `20260715_debate_hardening.sql`

**O que faz:** adiciona um trigger `BEFORE INSERT` em `debate_messages` que valida
idade (bloqueia menores), rate limit (cooldown 5s + 30/hora) e neutraliza avatar
com HTML; e reforça a RLS de INSERT (tamanho de texto, nome sem `<>`).

**Como aplicar:**
1. Supabase Dashboard → **SQL Editor** → **New query**
2. Cole todo o conteúdo de `20260715_debate_hardening.sql`
3. **Run**
4. Verifique com a query no fim do arquivo (deve listar o trigger e a policy)

**Reversível:** bloco ROLLBACK comentado no fim do SQL.

**Opcional:** dentro do SQL há um bloco `1e` (bloqueio LGPD de CPF/telefone/email)
comentado — descomente se quiser rejeitar dados pessoais também no servidor.

---

## Parte 2 — Edge Functions: origin-lock (5 min)

**Arquivos:** os 5 `index.ts` já estão corrigidos no repo (patch commitado):
`admin-stripe-ops`, `ai-tutor`, `create-checkout`, `moderate-debate`, `verify-age`.

**O que mudou:** a linha `if (!origin && !referer) return true` (que liberava
chamadas diretas via curl/servidor sem headers) virou `return false`. Todas as 5
funções são chamadas do navegador, que sempre envia Origin/Referer — então
requisições legítimas seguem passando; só curl/bots sem headers são bloqueados.

**Como aplicar (deploy):**
```
npx supabase functions deploy admin-stripe-ops --project-ref hwjplecfqsckfiwxiedo
npx supabase functions deploy ai-tutor         --project-ref hwjplecfqsckfiwxiedo
npx supabase functions deploy create-checkout  --project-ref hwjplecfqsckfiwxiedo
npx supabase functions deploy moderate-debate  --project-ref hwjplecfqsckfiwxiedo
npx supabase functions deploy verify-age       --project-ref hwjplecfqsckfiwxiedo
```
(precisa estar logado: `npx supabase login`)

**Ressalva:** se no futuro alguma dessas funções passar a ser chamada por um
webhook/servidor (sem navegador), reative o acesso para aquela função específica
via auth/token em vez do header de origem. Hoje todas são browser-only.

---

## Resumo do que cada camada protege

| Ameaça | Antes | Depois |
|--------|-------|--------|
| XSS no avatar (renderização) | ✅ já corrigido (`_esc` no cliente, deployado) | — |
| XSS no avatar (gravação via REST) | ❌ gravava | ✅ trigger neutraliza |
| Menor posta no debate via REST | ❌ passava | ✅ trigger bloqueia |
| Flood sem cooldown via REST | ❌ passava | ✅ trigger 5s/30h |
| Dados pessoais (LGPD) via REST | ❌ passava | ⚠️ opcional (bloco 1e) |
| Edge Function chamada por curl | ❌ passava | ✅ origin-lock |

Ordem sugerida: **Parte 1 (SQL) primeiro** — é o que fecha o XSS/LGPD/idade no
canal de gravação. A Parte 2 (Edge Functions) reduz abuso de quota/custo.
