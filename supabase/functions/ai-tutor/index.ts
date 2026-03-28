/**
 * Supabase Edge Function — AI Tutor (Claude API)
 * ================================================
 * Deploy: supabase functions deploy ai-tutor
 *
 * Env vars necessárias:
 *   ANTHROPIC_API_KEY=sk-ant-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = [
  'https://natozar.github.io',
  'https://escolaliberal.com.br',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Rate limiting: max requests per user per day
const RATE_LIMITS: Record<string, { free: number; premium: number }> = {
  daily: { free: 10, premium: 50 },
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Auth: get user from JWT
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let userId: string | null = null
    let userPlan = 'free'

    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (!error && user) {
        userId = user.id

        // Get user plan
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', userId)
          .single()
        if (profile?.plan) userPlan = profile.plan
      }
    }

    // Rate limiting (by IP if no user, by userId if authenticated)
    const clientId = userId || (req.headers.get('X-Forwarded-For') || 'anon')
    const today = new Date().toISOString().slice(0, 10)
    const rateLimitKey = `tutor:${clientId}:${today}`

    const { data: rateData } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', rateLimitKey)
      .maybeSingle()

    const currentCount = rateData?.value?.count || 0
    const limit = userPlan === 'free' ? RATE_LIMITS.daily.free : RATE_LIMITS.daily.premium

    if (currentCount >= limit) {
      return new Response(JSON.stringify({
        error: 'rate_limit',
        message: userPlan === 'free'
          ? `Limite diário atingido (${limit} mensagens). Faça upgrade para Premium!`
          : `Limite diário atingido (${limit} mensagens). Tente novamente amanhã.`,
        remaining: 0
      }), {
        status: 429,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Parse request
    const { message, lessonContext, moduleTitle, lessonTitle, ageGroup, lang } = await req.json()

    if (!message || message.length > 1000) {
      return new Response(JSON.stringify({ error: 'Mensagem inválida (max 1000 caracteres).' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt({ moduleTitle, lessonTitle, lessonContext, ageGroup, lang })

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI Tutor] Claude API error:', response.status, err)
      return new Response(JSON.stringify({
        error: 'Erro ao consultar o tutor. Tente novamente.',
        debug: { status: response.status, detail: err.substring(0, 200) }
      }), {
        status: 502,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'Desculpe, não consegui gerar uma resposta.'

    // Update rate limit counter
    await supabase.from('admin_settings').upsert({
      key: rateLimitKey,
      value: { count: currentCount + 1, last: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })

    return new Response(JSON.stringify({
      reply,
      remaining: limit - currentCount - 1,
      model: 'claude-haiku-4-5'
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[AI Tutor] Error:', msg)
    return new Response(JSON.stringify({ error: 'Erro interno do tutor.', debug: msg.substring(0, 200) }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})

function buildSystemPrompt({ moduleTitle, lessonTitle, lessonContext, ageGroup, lang }: {
  moduleTitle?: string; lessonTitle?: string; lessonContext?: string; ageGroup?: string; lang?: string
}) {
  const language = lang === 'en' ? 'English' : 'Portuguese (Brazilian)'
  const ageDesc = ageGroup === '8-12' ? 'uma criança de 8-12 anos'
    : ageGroup === '13-16' ? 'um adolescente de 13-16 anos'
    : 'um estudante jovem/adulto'

  let prompt = `Você é o Tutor da Escola Liberal, uma plataforma de educação homeschool.
Responda SEMPRE em ${language}.
Você está conversando com ${ageDesc}.

REGRAS:
- Respostas curtas e claras (máximo 3-4 parágrafos)
- Use exemplos do dia a dia para explicar conceitos
- Seja encorajador e positivo
- Se não souber algo, diga honestamente
- Nunca invente dados ou estatísticas
- Foque em pensamento crítico e raciocínio, não em decorar
- Para economia, use perspectiva da Escola Austríaca quando relevante
- Use analogias adequadas à faixa etária do aluno`

  if (moduleTitle) {
    prompt += `\n\nO aluno está no módulo: "${moduleTitle}"`
  }
  if (lessonTitle) {
    prompt += `\nAula atual: "${lessonTitle}"`
  }
  if (lessonContext) {
    // Truncate to avoid token overflow
    const ctx = lessonContext.substring(0, 2000)
    prompt += `\n\nConteúdo da aula (resumo):\n${ctx}`
  }

  return prompt
}
