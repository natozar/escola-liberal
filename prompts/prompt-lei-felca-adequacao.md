# PROMPT PARA CLAUDE CODE — Adequação à Lei Felca (Lei 15.211/2025)

> **CONTEXTO:** A Lei 15.211/2025 (ECA Digital / "Lei Felca") entrou em vigor em 17/03/2026. A Escola Liberal é uma plataforma educacional PWA para jovens de 10 a 16 anos. Precisamos adequar o projeto à lei. A fiscalização é da ANPD. Multa: até R$50 milhões ou 10% do faturamento.

---

## REGRAS DE SEGURANÇA (INVIOLÁVEIS)

Antes de qualquer alteração:
1. **Criar branch:** `git checkout -b feat/lei-felca-compliance`
2. **Ler cada arquivo ANTES de editar** — nunca editar sem ler
3. **Não remover funcionalidades existentes** — apenas adicionar guards/gates
4. **Não alterar fluxo de pagamento** (Stripe) nem autenticação (Supabase auth)
5. **Testar que OFFLINE_MODE continua funcionando** após cada mudança
6. **Testar que DEMO_MODE continua funcionando** após cada mudança
7. **Incrementar SW_VERSION** no sw.js ao final
8. **skipWaiting APENAS no message handler** (política permanente de update PWA)
9. **Não introduzir dependências npm de runtime**
10. **Commits descritivos** com prefixo `legal:`

---

## ANÁLISE DA LEI vs. ESCOLA LIBERAL

### O que a Lei Felca exige:

| Exigência | Artigo | Impacto na Escola Liberal |
|-----------|--------|--------------------------|
| Verificação real de idade (proibida autodeclaração) | Art. 21+ | ALTO — hoje ageGroup é hardcoded "13-16" |
| Menores de 16: conta vinculada a responsável legal | — | ALTO — hoje não existe vinculação parental obrigatória |
| Proibir design persuasivo manipulativo | Art. 8+ | MÉDIO — streaks, notificações de urgência precisam revisão |
| Proibir loot boxes para menores | — | OK — não temos loot boxes |
| Proibir rolagem infinita | — | OK — não temos feed infinito |
| Proibir notificações com apelo emocional | — | BAIXO — revisar textos de notificações |
| Proibir publicidade comportamental para menores | — | OK — não fazemos publicidade comportamental |
| Consentimento parental para coleta de dados | LGPD Art.14 | MÉDIO — onboarding não pede consentimento parental |
| Mecanismos de supervisão parental | — | OK — já temos painel dos pais com PIN |
| Comunicação segura entre menores | — | ALTO — debate ao vivo precisa gate de idade |

### O que JÁ TEMOS e está em conformidade:
- ✅ Moderação de debate com 3 camadas (palavrões, LGPD, relevância)
- ✅ Filtro de dados pessoais (telefone, CPF, email, redes sociais)
- ✅ Sistema de strikes com suspensão progressiva
- ✅ Painel dos pais com PIN SHA-256
- ✅ Controle parental do debate (ativar/desativar)
- ✅ Histórico de mensagens para pais
- ✅ Consent LGPD obrigatório no debate
- ✅ AI Tutor com system prompt age-aware + disclaimer LGPD
- ✅ Rate limiting no AI Tutor
- ✅ Coleta mínima de dados (nome opcional, avatar)

---

## TAREFAS DE IMPLEMENTAÇÃO (em ordem de prioridade)

### TAREFA 1 — Gate de Idade no Onboarding (CRÍTICO)
**Arquivo:** `src/features/onboarding.js`
**O que fazer:**
- Adicionar step de data de nascimento no onboarding (campo date input)
- Calcular idade a partir da data
- Salvar `birthYear` e `ageGroup` calculado no state (NÃO salvar data completa — minimização LGPD)
- Se idade < 10: mostrar mensagem "Esta plataforma é para jovens a partir de 10 anos" e bloquear
- Se idade 10-15: exigir flag `parentalConsent` antes de prosseguir (ver Tarefa 2)
- Se idade 16-17: permitir com aviso de que responsável pode vincular conta
- Se idade >= 18: acesso livre
- **NÃO usar autodeclaração tipo "sou maior de 18"** — usar campo de data de nascimento
- Em DEMO_MODE: pular este step (manter comportamento atual)
- Em OFFLINE_MODE: pular este step (manter comportamento atual)

**Regras de implementação:**
```javascript
// Salvar apenas o ano de nascimento (minimização LGPD)
window.S.birthYear = year;
window.S.ageGroup = age < 12 ? 'child' : age < 16 ? 'teen' : age < 18 ? 'young' : 'adult';
window.S.ageVerifiedAt = Date.now(); // timestamp da verificação
```

### TAREFA 2 — Consentimento Parental (CRÍTICO)
**Arquivo:** `src/features/onboarding.js` (novo step) + `src/features/profiles.js` (painel pais)
**O que fazer:**
- Para ageGroup 'child' (10-11) e 'teen' (12-15): exigir consentimento parental
- Mostrar modal: "Para continuar, um responsável legal precisa autorizar o uso desta plataforma"
- Responsável insere PIN de 4 dígitos (que será o PIN do painel dos pais)
- Checkbox: "Eu, responsável legal, autorizo o uso desta plataforma educacional conforme a Lei 15.211/2025"
- Salvar `parentalConsent: true` e `parentalConsentAt: timestamp` no state
- Para ageGroup 'young' (16-17): mostrar aviso informativo (sem bloqueio)
- Em DEMO_MODE e OFFLINE_MODE: pular (consent implícito para demonstração)

**Regras de implementação:**
```javascript
// Não bloquear se já deu consentimento antes
if (window.S.parentalConsent) return;
// PIN do responsável — será o mesmo PIN do painel dos pais
window.S.pin = hashPIN(pin);
window.S.parentalConsent = true;
window.S.parentalConsentAt = Date.now();
```

### TAREFA 3 — Bloquear Debate para Menores de 16 sem Supervisão (CRÍTICO)
**Arquivo:** `src/features/debate.js`
**O que fazer:**
- No início de `goDebate()`, ANTES de tudo, checar:
  - Se `ageGroup === 'child'` (< 12): bloquear totalmente. Toast: "O debate ao vivo é para jovens a partir de 16 anos."
  - Se `ageGroup === 'teen'` (12-15): bloquear. Toast: "O debate ao vivo requer idade mínima de 16 anos. Converse com seu responsável."
  - Se `ageGroup === 'young'` (16-17): permitir com consent do debate já existente
  - Se `ageGroup === 'adult'` ou undefined (legado): permitir normalmente
- Manter o gate `isDebateDisabled()` do painel dos pais (já existe)
- Em DEMO_MODE: manter mensagens mock (comportamento atual)
- Em OFFLINE_MODE: manter mensagens mock (comportamento atual)
- **NÃO remover o sistema de debate** — apenas adicionar gate no início

**Regras de implementação:**
```javascript
function goDebate() {
  // Lei Felca — gate de idade
  var age = window.S.ageGroup;
  if (age === 'child' || age === 'teen') {
    if (typeof window.toast === 'function')
      window.toast('O debate ao vivo é para jovens a partir de 16 anos.', 'info');
    return;
  }
  // ... resto do código existente (NÃO ALTERAR)
}
```

### TAREFA 4 — Revisar Gamificação (MÉDIO)
**Arquivos:** `src/core/xp.js`, `src/features/gamification.js`, `src/features/leaderboard.js`
**O que fazer:**
- **Streaks:** Manter, mas remover qualquer mensagem de "urgência" ou "perda" que crie ansiedade
  - ❌ "Você vai perder seu streak!" → ✅ "Que tal estudar um pouco hoje?"
  - ❌ "Não perca sua sequência!" → ✅ "Sua sequência está em 7 dias. Continue assim!"
- **Notificações:** Revisar `scheduleStudyReminder()` — remover apelo emocional
  - ❌ "Seu streak vai resetar!" → ✅ "Hora de estudar! Sua jornada te espera."
- **XP e Medalhas:** MANTER — gamificação com fins educacionais tem exceção implícita na lei (conteúdo com controle editorial)
- **Leaderboard:** MANTER — é semanal com reset, não cria dependência
- **Loot boxes:** Não temos. OK.
- **Rolagem infinita:** Não temos feed. OK.

**NÃO alterar:**
- Sistema de XP (addXP, totalXP)
- Sistema de badges (getAllBadges)
- Sistema de ligas (leaderboard)
- Missões semanais (são educacionais, não manipulativas)

### TAREFA 5 — Revisar AI Tutor (BAIXO)
**Arquivo:** `src/features/chat.js` + `supabase/functions/ai-tutor/index.ts`
**O que fazer:**
- Verificar que system prompt já contém regras LGPD (JÁ EXISTE — confirmar)
- Adicionar ao system prompt: "Você está conversando com um estudante. Idade informada: {ageGroup}. Adapte a linguagem."
- Verificar rate limiting (JÁ EXISTE: 10/dia free, 50/dia premium)
- Garantir que mensagens NÃO são armazenadas permanentemente (JÁ É ASSIM — confirmar)
- **NÃO desabilitar o AI Tutor** — ele tem controle editorial (exceção da lei)

### TAREFA 6 — Atualizar Termos de Uso e Privacidade (MÉDIO)
**Arquivos:** `termos.html`, `privacidade.html`
**O que fazer:**
- Adicionar seção: "Conformidade com a Lei 15.211/2025 (ECA Digital)"
- Mencionar: verificação de idade, consentimento parental, proteção de dados de menores
- Mencionar: direito do responsável de acessar dados, desativar funcionalidades, excluir conta
- Mencionar: gamificação educacional (não manipulativa) conforme exceção de conteúdo editorial
- **NÃO remover seções existentes** — apenas adicionar

### TAREFA 7 — Banner de Conformidade (BAIXO)
**Arquivo:** `app.html` (seção do footer ou dashboard)
**O que fazer:**
- Adicionar badge discreto no perfil/footer: "Em conformidade com a Lei 15.211/2025"
- Isso demonstra boa-fé para fiscalização ANPD

### TAREFA 8 — Atualizar CLAUDE.md (OBRIGATÓRIO)
**Arquivo:** `CLAUDE.md`
**O que fazer:**
- Adicionar seção "Compliance Lei Felca (Lei 15.211/2025)" com:
  - Data da adequação
  - Lista do que foi implementado
  - Gate de idade no onboarding
  - Consentimento parental
  - Debate bloqueado para < 16
  - Gamificação revisada (sem design persuasivo)
- Adicionar aos "Bugs Conhecidos" ou "Concluído nesta sessão"

---

## ARQUIVOS QUE SERÃO MODIFICADOS

| Arquivo | Tipo de Mudança | Risco |
|---------|----------------|-------|
| `src/features/onboarding.js` | Adicionar step de idade + consentimento parental | BAIXO — código isolado |
| `src/features/debate.js` | Adicionar gate de idade no início de goDebate() | MÍNIMO — 5 linhas no topo |
| `src/features/gamification.js` | Revisar textos de notificação (strings) | MÍNIMO — só texto |
| `src/core/xp.js` | Revisar mensagens de streak (strings) | MÍNIMO — só texto |
| `src/features/chat.js` | Passar ageGroup para AI Tutor | MÍNIMO — 1 campo a mais |
| `termos.html` | Adicionar seção Lei Felca | ZERO risco técnico |
| `privacidade.html` | Adicionar seção Lei Felca | ZERO risco técnico |
| `app.html` | Badge de conformidade (opcional) | MÍNIMO |
| `app.css` | Estilos do modal de idade/consentimento | MÍNIMO |
| `sw.js` | Incrementar SW_VERSION | Padrão |
| `CLAUDE.md` | Documentar mudanças | ZERO risco |

## ARQUIVOS QUE NÃO DEVEM SER TOCADOS

- `supabase-client.js` — auth e sync (PROIBIDO sem aprovação)
- `stripe-billing.js` — pagamento (PROIBIDO sem aprovação)
- `src/boot.js` — DEMO_MODE e OFFLINE_MODE (NÃO alterar flags)
- `src/core/state.js` — apenas ADICIONAR campos, nunca remover
- `src/core/navigation.js` — não alterar rotas existentes
- `admin.html` — não alterar painel admin

---

## ORDEM DE EXECUÇÃO

```
1. git checkout -b feat/lei-felca-compliance
2. Ler src/features/onboarding.js → Implementar Tarefa 1 (gate de idade)
3. Ler src/features/onboarding.js novamente → Implementar Tarefa 2 (consentimento parental)
4. Ler src/features/debate.js → Implementar Tarefa 3 (bloquear debate < 16)
5. Ler src/features/gamification.js + src/core/xp.js → Implementar Tarefa 4 (revisar textos)
6. Ler src/features/chat.js → Implementar Tarefa 5 (ageGroup no AI Tutor)
7. Ler termos.html + privacidade.html → Implementar Tarefa 6 (termos legais)
8. Implementar Tarefa 7 (badge conformidade)
9. Atualizar CLAUDE.md (Tarefa 8)
10. Incrementar SW_VERSION no sw.js
11. git add [arquivos específicos] && git commit -m "legal: adequação à Lei Felca (Lei 15.211/2025)"
12. TESTAR: DEMO_MODE=true funciona? OFFLINE_MODE=true funciona? Debate bloqueado para < 16?
```

---

## TESTES DE VERIFICAÇÃO

Após implementar, verificar:
- [ ] Onboarding pede data de nascimento
- [ ] Idade < 10 → bloqueio com mensagem
- [ ] Idade 10-15 → exige consentimento parental (PIN)
- [ ] Idade 16-17 → aviso informativo, acesso liberado
- [ ] Idade >= 18 → acesso livre
- [ ] Debate bloqueado para ageGroup 'child' e 'teen'
- [ ] Debate liberado para ageGroup 'young' e 'adult'
- [ ] DEMO_MODE funciona sem pedir idade
- [ ] OFFLINE_MODE funciona sem pedir idade
- [ ] Textos de streak sem apelo de urgência/ansiedade
- [ ] Notificações sem apelo emocional manipulativo
- [ ] Termos.html tem seção Lei Felca
- [ ] Privacidade.html tem seção Lei Felca
- [ ] SW_VERSION incrementado
- [ ] Build (npm run build) passa sem erro
