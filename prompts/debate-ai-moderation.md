Tarefa: Implementar moderação de mensagens do debate via API de IA (Claude da Anthropic). A IA audita cada mensagem ANTES de publicar — verifica linguagem, relevância ao tema, dados pessoais e segurança para menores. Leia app.js, supabase-client.js, CLAUDE.md e os arquivos em supabase/functions/ ANTES de alterar. Não quebre OFFLINE_MODE. Execute sem perguntar. Commit e deploy ao final.

---

### ARQUITETURA

```
Aluno digita mensagem → sendDebateMessage()
  ↓
  Filtro local rápido (palavrões óbvios, rate limit) — client-side, instantâneo
  ↓
  Se passou filtro local → chama Edge Function /moderate-debate
  ↓
  Edge Function envia para API Claude com system prompt de moderação
  ↓
  Claude responde: { allowed: true/false, reason: "...", severity: "ok|warn|strike" }
  ↓
  Se allowed: mensagem publica no debate
  Se !allowed: toast com motivo, strike se severity = "strike"
```

**Por que 2 camadas?**
- Filtro local é instantâneo e gratuito (bloqueia o óbvio sem gastar API)
- IA audita o que o filtro local deixa passar (contexto, ironia, manipulação sutil)
- Se API falhar/timeout: filtro local decide sozinho (fallback seguro)

---

### 1. EDGE FUNCTION: moderate-debate

Criar arquivo `supabase/functions/moderate-debate/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ALLOWED_ORIGINS = [
  "https://escolaliberal.com.br",
  "https://www.escolaliberal.com.br",
  "http://localhost:5173",
  "http://localhost:4173"
];

serve(async (req) => {
  // CORS
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  try {
    const { message, room_id, room_name, user_name } = await req.json();

    if (!message || !room_id) {
      return new Response(JSON.stringify({ allowed: false, reason: "Dados incompletos.", severity: "ok" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
      });
    }

    // Mensagens muito curtas (reações) passam direto
    if (message.trim().length <= 15 && /^(concordo|verdade|exato|boa|isso|sim|não|valeu|obrigado|top|show|interessante|faz sentido|boa pergunta|penso igual)/i.test(message.trim())) {
      return new Response(JSON.stringify({ allowed: true, reason: "", severity: "ok" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
      });
    }

    // Chamar API Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: `Você é o moderador de uma plataforma educacional para jovens de 10 a 16 anos chamada Escola Liberal.

Sua ÚNICA função é analisar mensagens enviadas nas salas de debate e decidir se podem ser publicadas.

CONTEXTO:
- Sala de debate: "${room_name}" (ID: ${room_id})
- Autor: "${user_name}"
- Público: crianças e adolescentes de 10 a 16 anos

REGRAS DE MODERAÇÃO:

BLOQUEAR (severity: "strike") — mensagem é apagada e aluno recebe strike:
- Palavrões, ofensas, xingamentos (em qualquer idioma, incluindo variações, gírias e leetspeak)
- Bullying, assédio, ameaças, intimidação
- Conteúdo sexual, sugestivo ou inapropriado para menores
- Incitação à violência, automutilação ou comportamento perigoso
- Discriminação por raça, gênero, orientação sexual, religião, deficiência
- Spam ou flood (mensagem sem sentido repetida)

BLOQUEAR (severity: "warn") — mensagem é apagada mas aluno recebe apenas aviso:
- Dados pessoais: telefone, CPF, endereço, email, redes sociais, nome de escola
- Tentativa de contato fora da plataforma ("me chama no zap", "meu insta é")
- Mensagem completamente fora do tema da sala (ex: falar de jogos na sala de Economia)
- Propaganda ou links externos

PERMITIR (severity: "ok"):
- Opiniões sobre o tema da sala, mesmo polêmicas ou contrárias ao senso comum
- Perguntas sobre o tema
- Discordância respeitosa
- Citações de autores, livros, teorias
- Reações curtas ("concordo", "boa pergunta", "interessante")
- Mensagens que tangenciam o tema mas contribuem para o debate

IMPORTANTE:
- Debate saudável INCLUI discordância. Não bloqueie opiniões só por serem polêmicas.
- Linguagem informal de adolescente é OK se respeitosa ("mano", "tipo", "né")
- Gírias são OK se não ofensivas
- Erros de português NÃO são motivo de bloqueio

Responda APENAS com JSON válido, sem markdown, sem explicação:
{"allowed": true/false, "reason": "motivo curto em português se bloqueado, vazio se permitido", "severity": "ok|warn|strike"}`,
        messages: [
          { role: "user", content: `Analise esta mensagem para a sala "${room_name}":\n\n"${message}"` }
        ]
      })
    });

    if (!response.ok) {
      // API falhou — deixar passar (fallback permissivo, filtro local já pegou o óbvio)
      console.error("Anthropic API error:", response.status);
      return new Response(JSON.stringify({ allowed: true, reason: "", severity: "ok", fallback: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '{"allowed":true,"reason":"","severity":"ok"}';

    // Parse resposta da IA
    let moderation;
    try {
      moderation = JSON.parse(content);
    } catch {
      // IA respondeu formato errado — deixar passar
      moderation = { allowed: true, reason: "", severity: "ok", fallback: true };
    }

    return new Response(JSON.stringify(moderation), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
    });

  } catch (error) {
    console.error("Moderation error:", error);
    // Em caso de erro, permitir (filtro local já fez primeira camada)
    return new Response(JSON.stringify({ allowed: true, reason: "", severity: "ok", fallback: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
    });
  }
});
```

### 2. VARIÁVEL DE AMBIENTE NO SUPABASE

Instruir no CLAUDE.md que é necessário configurar:

```bash
# No Supabase Dashboard > Settings > Edge Functions > Secrets
# Adicionar: ANTHROPIC_API_KEY = sk-ant-api03-xxxxx
```

NÃO colocar a key no código. NÃO commitar a key.

### 3. CLIENT-SIDE: INTEGRAR MODERAÇÃO IA

Modificar `sendDebateMessage()` no app.js:

```javascript
async function sendDebateMessage(roomId) {
  var input = document.getElementById('debateMsgInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  // Desabilitar input durante moderação
  var sendBtn = document.getElementById('debateSendBtn');
  input.disabled = true;
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }

  try {
    // CAMADA 1: Filtro local rápido (gratuito, instantâneo)
    var localCheck = localModerateMessage(text, roomId);
    if (!localCheck.allowed) {
      showDebateToast(localCheck.reason, localCheck.severity === 'strike' ? 'danger' : 'warning');
      if (localCheck.severity === 'strike') addDebateStrike(roomId, 'filtro local', text);
      return;
    }

    // CAMADA 2: Moderação IA (se online e disponível)
    var aiResult = await aiModerateMessage(text, roomId);
    if (!aiResult.allowed) {
      showDebateToast(aiResult.reason, aiResult.severity === 'strike' ? 'danger' : 'warning');
      if (aiResult.severity === 'strike') addDebateStrike(roomId, 'moderação IA', text);
      if (aiResult.severity === 'warn') addDebateWarn(roomId, aiResult.reason, text);
      return;
    }

    // APROVADO — publicar mensagem
    var msg = {
      user_name: (typeof S !== 'undefined' && S.name) ? S.name : 'Aluno',
      user_avatar: (typeof S !== 'undefined' && S.avatar) ? S.avatar : '🧑‍🎓',
      text: text,
      created_at: new Date().toISOString()
    };

    appendDebateMessage(null, msg);
    input.value = '';

    // Se online, enviar para Supabase
    if (typeof OFFLINE_MODE === 'undefined' || !OFFLINE_MODE) {
      if (typeof sbClient !== 'undefined') {
        sbClient.from('debate_messages').insert({
          room_id: roomId,
          user_id: (sbClient.auth.getUser && sbClient.auth.getUser()?.id) || 'anon',
          user_name: msg.user_name,
          user_avatar: msg.user_avatar,
          text: msg.text
        }).then(function(res) {
          if (res.error) console.warn('Debate insert error:', res.error.message);
        });
      }
    }

  } finally {
    // Reabilitar input
    input.disabled = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; }
    input.focus();
  }
}
```

### 4. FUNÇÃO DE MODERAÇÃO IA (CLIENT)

```javascript
async function aiModerateMessage(text, roomId) {
  // Em OFFLINE_MODE: pular moderação IA (filtro local é suficiente)
  if (typeof OFFLINE_MODE !== 'undefined' && OFFLINE_MODE) {
    return { allowed: true, reason: '', severity: 'ok' };
  }

  // Se Supabase não disponível: pular
  if (typeof sbClient === 'undefined') {
    return { allowed: true, reason: '', severity: 'ok' };
  }

  // Timeout de 5 segundos — se IA demorar, deixar passar
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 5000);

  try {
    var room = DEBATE_ROOMS.find(function(r) { return r.id === roomId; });
    var roomName = room ? room.name : roomId;
    var userName = (typeof S !== 'undefined' && S.name) ? S.name : 'Aluno';

    var session = sbClient.auth.getSession ? await sbClient.auth.getSession() : null;
    var token = session?.data?.session?.access_token || '';

    var response = await fetch(SUPABASE_URL + '/functions/v1/moderate-debate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        message: text,
        room_id: roomId,
        room_name: roomName,
        user_name: userName
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('AI moderation failed:', response.status);
      return { allowed: true, reason: '', severity: 'ok', fallback: true };
    }

    var result = await response.json();
    return result;

  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.warn('AI moderation timeout — allowing message');
    } else {
      console.warn('AI moderation error:', err.message);
    }
    // Falha na IA: permitir (filtro local já fez primeira camada)
    return { allowed: true, reason: '', severity: 'ok', fallback: true };
  }
}
```

### 5. FILTRO LOCAL (CAMADA 1 — manter existente ou criar)

Verificar se `localModerateMessage()` ou `moderateMessage()` já existe no app.js. Se sim, renomear para `localModerateMessage()`. Se não, criar:

```javascript
function localModerateMessage(text, roomId) {
  var normalized = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/@/g, 'a')
    .replace(/\s+/g, ' ').trim();

  // Palavras proibidas (bloqueio instantâneo)
  var banned = ['merda','porra','caralho','foda','puta','cuzao','arrombado','viado','buceta','fdp','pqp','vsf','tnc','krl','fuck','shit','bitch','dick','pussy','porn','nudes','sexo','cocaina','crack','maconha','se matar','vou te pegar'];
  for (var i = 0; i < banned.length; i++) {
    if (normalized.indexOf(banned[i]) !== -1) {
      return { allowed: false, reason: 'Linguagem não permitida. Mantenha o respeito.', severity: 'strike' };
    }
  }

  // Dados pessoais (bloqueio protetor — sem strike)
  var personalPatterns = [
    /\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4}/,
    /\(\d{2}\)\s?\d{4,5}-?\d{4}/,
    /\d{3}\.\d{3}\.\d{3}-\d{2}/,
    /[\w.-]+@[\w.-]+\.\w{2,}/,
    /@[\w]{3,}/,
    /(?:instagram|insta|tiktok|snap|discord|whats|zap|telegram)[\s.:@\/]+\w+/i
  ];
  for (var j = 0; j < personalPatterns.length; j++) {
    if (personalPatterns[j].test(text)) {
      return { allowed: false, reason: 'Por sua segurança, não compartilhe dados pessoais.', severity: 'warn' };
    }
  }

  // Rate limit
  var now = Date.now();
  if (window._lastDebateMsg && now - window._lastDebateMsg < 5000) {
    return { allowed: false, reason: 'Aguarde alguns segundos antes de enviar outra mensagem.', severity: 'ok' };
  }
  window._lastDebateMsg = now;

  return { allowed: true, reason: '', severity: 'ok' };
}
```

### 6. STRIKES E WARNS

```javascript
function addDebateStrike(roomId, source, msg) {
  var data = JSON.parse(localStorage.getItem('escola_debate_strikes') || '{"strikes":0,"history":[],"suspended_until":null,"banned":false}');
  data.strikes++;
  data.history.push({ date: new Date().toISOString(), room: roomId, reason: source, msg: msg.substring(0, 50) });

  // Escala de punição
  if (data.strikes >= 6) {
    data.banned = true;
    showDebateToast('Acesso ao debate revogado por violações repetidas.', 'danger');
  } else if (data.strikes >= 5) {
    data.suspended_until = new Date(Date.now() + 7 * 86400000).toISOString();
    showDebateToast('Suspenso do debate por 7 dias.', 'danger');
  } else if (data.strikes >= 4) {
    data.suspended_until = new Date(Date.now() + 3 * 86400000).toISOString();
    showDebateToast('Suspenso do debate por 72 horas.', 'danger');
  } else if (data.strikes >= 3) {
    data.suspended_until = new Date(Date.now() + 86400000).toISOString();
    showDebateToast('Suspenso do debate por 24 horas.', 'danger');
  } else if (data.strikes === 2) {
    showDebateToast('Aviso 2/3 — Próxima infração resulta em suspensão.', 'warning');
  } else {
    showDebateToast('Aviso 1/3 — Mantenha o respeito e foque no tema.', 'warning');
  }

  localStorage.setItem('escola_debate_strikes', JSON.stringify(data));
}

function addDebateWarn(roomId, reason, msg) {
  // Warn não conta como strike, mas é registrado
  var data = JSON.parse(localStorage.getItem('escola_debate_strikes') || '{"strikes":0,"history":[],"suspended_until":null,"banned":false}');
  data.history.push({ date: new Date().toISOString(), room: roomId, reason: 'warn: ' + reason, msg: msg.substring(0, 50) });
  localStorage.setItem('escola_debate_strikes', JSON.stringify(data));
}
```

### 7. UX DURANTE MODERAÇÃO

Enquanto a IA analisa (1-3 segundos), mostrar feedback visual:

```javascript
// No sendDebateMessage, antes de chamar aiModerateMessage:
showDebateTypingIndicator(true);

// Após resultado:
showDebateTypingIndicator(false);

function showDebateTypingIndicator(show) {
  var existing = document.getElementById('debateModIndicator');
  if (show) {
    if (existing) return;
    var container = document.getElementById('debateMsgs');
    if (!container) return;
    var div = document.createElement('div');
    div.id = 'debateModIndicator';
    div.className = 'debate-mod-indicator';
    div.innerHTML = '<span class="debate-mod-dots"><span>.</span><span>.</span><span>.</span></span> Verificando mensagem';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  } else {
    if (existing) existing.remove();
  }
}
```

CSS do indicador:

```css
.debate-mod-indicator {
  text-align: center;
  padding: 8px;
  font-size: 0.78rem;
  color: var(--text-muted, #9ca3af);
  font-style: italic;
}
.debate-mod-dots span {
  animation: modDots 1.4s infinite;
  font-weight: bold;
  font-size: 1.2em;
}
.debate-mod-dots span:nth-child(2) { animation-delay: 0.2s; }
.debate-mod-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes modDots {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}
```

### 8. OFFLINE_MODE — SEM IA, SÓ FILTRO LOCAL

Quando OFFLINE_MODE = true:
- `aiModerateMessage()` retorna `{ allowed: true }` imediatamente (sem fetch)
- Apenas `localModerateMessage()` roda
- Indicador "Verificando mensagem" NÃO aparece (seria falso)
- Tudo funciona instantâneo

### 9. CUSTOS E OTIMIZAÇÃO

O modelo usado é `claude-haiku-4-5-20251001` (o mais barato e rápido):
- ~$0.001 por moderação (entrada ~200 tokens, saída ~30 tokens)
- 1000 mensagens = ~$1
- Mensagens curtas (<15 chars, reações) pulam a IA direto na Edge Function
- Timeout de 5s garante que UX não trava
- Fallback permissivo: se IA falhar, filtro local decide

### 10. DEPLOY DA EDGE FUNCTION

Instruções no CLAUDE.md:

```bash
# Deploy da Edge Function (rodar uma vez)
supabase functions deploy moderate-debate --project-ref hwjplecfqsckfiwxiedo

# Configurar secret da API Anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-xxxxx --project-ref hwjplecfqsckfiwxiedo
```

A Edge Function NÃO precisa de deploy via Code — é feita manualmente ou via CLI do Supabase. O Code só precisa:
1. Criar o arquivo `supabase/functions/moderate-debate/index.ts`
2. Modificar o app.js com as funções client-side
3. Documentar no CLAUDE.md

### 11. REGRAS

- NUNCA quebrar OFFLINE_MODE — moderação IA é OPCIONAL, filtro local é OBRIGATÓRIO
- NUNCA colocar ANTHROPIC_API_KEY no código client-side
- NUNCA bloquear opinião polêmica — IA só bloqueia linguagem, dados pessoais e off-topic
- Fallback SEMPRE permissivo — se IA falhar, mensagem passa (filtro local já pegou o pior)
- Zero npm dependencies no client
- Timeout de 5s na chamada da IA
- Incrementar SW_VERSION se alterar assets cacheados

### 12. COMMIT E DEPLOY

```bash
git add app.js app.css supabase/functions/moderate-debate/index.ts CLAUDE.md
git commit -m "feat: AI moderation for debate — Claude Haiku via Edge Function, 2-layer filter, fallback safe"
git push origin main
```

### 13. ANOTAR NO CLAUDE.md

```
14. **Moderação IA no debate** — 2 camadas: filtro local (palavrões, dados pessoais, rate limit) + API Claude Haiku via Edge Function. Custo ~$0.001/msg. Timeout 5s com fallback permissivo. Reações curtas pulam IA. OFFLINE_MODE usa só filtro local. Deploy: `supabase functions deploy moderate-debate` + configurar ANTHROPIC_API_KEY nos secrets.
```
