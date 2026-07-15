import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Cadeia de provedores de moderacao (custo zero primeiro):
// 1. OPENAI_API_KEY  → OpenAI Moderation API (omni-moderation-latest) — GRATUITA, multilingue
// 2. ANTHROPIC_API_KEY → Claude Haiku (paga, ~$0.001/msg) — so se OpenAI ausente
// 3. Nenhuma chave → fallback permissivo (filtro local de 3 camadas no client segura sozinho)
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const ALLOWED_ORIGINS = [
  "https://escolaliberal.com.br",
  "https://natozar.github.io",
];

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  if (!origin && !referer) return false;  // sem Origin nem Referer = chamada direta (curl/servidor) → bloqueia
  if (origin && ALLOWED_ORIGINS.includes(origin)) return true;
  if (referer) {
    try { const u = new URL(referer); if (ALLOWED_ORIGINS.includes(u.origin)) return true; } catch {}
  }
  return false;
}

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

function fetchWithTimeout(url: string, init: RequestInit, ms = 5000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(t));
}

// ============================================================
// Provedor 1: OpenAI Moderation API — gratuita
// ============================================================
const STRIKE_CATEGORIES = [
  "sexual", "sexual/minors", "hate", "hate/threatening",
  "harassment/threatening", "violence", "violence/graphic",
  "illicit/violent",
];
const REASON_PT: Record<string, string> = {
  "sexual": "Conteúdo sexual não é permitido.",
  "sexual/minors": "Conteúdo impróprio.",
  "hate": "Discurso de ódio não é permitido.",
  "hate/threatening": "Ameaças e discurso de ódio não são permitidos.",
  "harassment": "Assédio ou ofensa a outros participantes não é permitido.",
  "harassment/threatening": "Ameaças não são permitidas.",
  "violence": "Apologia à violência não é permitida.",
  "violence/graphic": "Conteúdo violento não é permitido.",
  "self-harm": "Conteúdo sensível. Se precisar de ajuda, ligue 188 (CVV).",
  "self-harm/intent": "Conteúdo sensível. Se precisar de ajuda, ligue 188 (CVV).",
  "self-harm/instructions": "Conteúdo sensível não é permitido.",
  "illicit": "Conteúdo sobre atividades ilícitas não é permitido.",
  "illicit/violent": "Conteúdo sobre atividades ilícitas não é permitido.",
};

async function moderateOpenAI(message: string) {
  const res = await fetchWithTimeout("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: message }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) throw new Error("openai empty result");
  if (!r.flagged) return { allowed: true, reason: "", severity: "ok", provider: "openai" };
  const flaggedCats = Object.entries(r.categories || {})
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  const isStrike = flaggedCats.some((c) => STRIKE_CATEGORIES.includes(c));
  const reason = REASON_PT[flaggedCats[0]] || "Mensagem viola as regras do debate.";
  return {
    allowed: false,
    reason,
    severity: isStrike ? "strike" : "warn",
    provider: "openai",
  };
}

// ============================================================
// Provedor 2: Claude Haiku (opcional, paga) — mantido para compat
// ============================================================
async function moderateClaude(message: string, room_name: string, user_name: string) {
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: `Voce e o moderador da Escola Liberal, plataforma educacional para adultos 18+.
Analise a mensagem para a sala de debate "${room_name}" enviada por "${user_name}".

BLOQUEAR (severity:"strike"): ofensas graves, bullying, conteudo sexual, apologia a violencia, discriminacao, spam.
BLOQUEAR (severity:"warn"): dados pessoais (telefone, email, redes sociais, endereco), propaganda, links suspeitos.
PERMITIR (severity:"ok"): opinioes polemicas respeitosas, discordancia firme, perguntas, citacoes, linguagem informal, palavroes leves em contexto nao ofensivo.

Responda APENAS JSON: {"allowed":true/false,"reason":"motivo curto se bloqueado","severity":"ok|warn|strike"}`,
      messages: [{ role: "user", content: `Mensagem: "${message}"` }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '{"allowed":true,"reason":"","severity":"ok"}';
  const m = JSON.parse(text);
  return { ...m, provider: "claude" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors(req) });
  }

  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: "origin_blocked" }), {
      status: 403, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { message, room_id, room_name, user_name } = await req.json();
    if (!message || !room_id) {
      return new Response(JSON.stringify({ allowed: false, reason: "Dados incompletos.", severity: "ok" }), {
        status: 400, headers: { ...cors(req), "Content-Type": "application/json" }
      });
    }

    // Short reactions pass immediately (no API cost)
    const trimmed = message.trim();
    if (trimmed.length <= 15 && /^(concordo|verdade|exato|boa|isso|sim|nao|valeu|obrigado|top|show|interessante|faz sentido|boa pergunta|penso igual)/i.test(trimmed)) {
      return new Response(JSON.stringify({ allowed: true, reason: "", severity: "ok" }), {
        headers: { ...cors(req), "Content-Type": "application/json" }
      });
    }

    let moderation;
    if (OPENAI_API_KEY) {
      moderation = await moderateOpenAI(message);
    } else if (ANTHROPIC_API_KEY) {
      moderation = await moderateClaude(message, room_name, user_name);
    } else {
      moderation = { allowed: true, reason: "", severity: "ok", fallback: true, provider: "none" };
    }

    return new Response(JSON.stringify(moderation), {
      headers: { ...cors(req), "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Moderation error:", err);
    return new Response(JSON.stringify({ allowed: true, reason: "", severity: "ok", fallback: true }), {
      status: 200, headers: { ...cors(req), "Content-Type": "application/json" }
    });
  }
});
