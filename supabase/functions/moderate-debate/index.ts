import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ALLOWED_ORIGINS = [
  "https://escolaliberal.com.br",
  "https://natozar.github.io",
];

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors(req) });
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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: `Voce e o moderador da Escola Liberal, plataforma educacional para jovens de 10 a 16 anos.
Analise a mensagem para a sala de debate "${room_name}" enviada por "${user_name}".

BLOQUEAR (severity:"strike"): palavroes, ofensas, bullying, conteudo sexual, violencia, discriminacao, spam.
BLOQUEAR (severity:"warn"): dados pessoais (telefone, email, redes sociais, endereco), mensagem fora do tema, propaganda, links.
PERMITIR (severity:"ok"): opinioes polemicas respeitosas, discordancia, perguntas, citacoes, gírias inofensivas, linguagem informal de adolescente.

Responda APENAS JSON: {"allowed":true/false,"reason":"motivo curto se bloqueado","severity":"ok|warn|strike"}`,
        messages: [{ role: "user", content: `Mensagem: "${message}"` }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status);
      return new Response(JSON.stringify({ allowed: true, reason: "", severity: "ok", fallback: true }), {
        headers: { ...cors(req), "Content-Type": "application/json" }
      });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '{"allowed":true,"reason":"","severity":"ok"}';
    let moderation;
    try { moderation = JSON.parse(text); } catch {
      moderation = { allowed: true, reason: "", severity: "ok", fallback: true };
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
