/**
 * Supabase Edge Function — Verify Age via Serpro CPF API
 * ======================================================
 * Deploy: supabase functions deploy verify-age
 *
 * Env vars (configure when Serpro contract is active):
 *   SERPRO_CONSUMER_KEY
 *   SERPRO_CONSUMER_SECRET
 *
 * If keys not configured: returns { verified: false, fallback: true }
 * so the client falls back to self-declaration gracefully.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SERPRO_KEY = Deno.env.get('SERPRO_CONSUMER_KEY') || ''
const SERPRO_SECRET = Deno.env.get('SERPRO_CONSUMER_SECRET') || ''

const ALLOWED_ORIGINS = [
  'https://escolaliberal.com.br',
  'https://natozar.github.io',
]

function cors(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  }
}

// Serpro OAuth2: get access token via client_credentials
async function getSerproToken(): Promise<string | null> {
  try {
    const credentials = btoa(`${SERPRO_KEY}:${SERPRO_SECRET}`)
    const resp = await fetch('https://gateway.apiserpro.serpro.gov.br/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.access_token || null
  } catch {
    return null
  }
}

// Query Serpro CPF API
async function querySerproCPF(cpf: string, token: string) {
  const cleanCPF = cpf.replace(/\D/g, '')
  const resp = await fetch(
    `https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v1/cpf/${cleanCPF}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  if (!resp.ok) return null
  return await resp.json()
  // Returns: { ni, nome, nascimento (DD/MM/YYYY), situacao }
}

function calculateAge(birthStr: string): number {
  // Accepts DD/MM/YYYY (Serpro) or YYYY-MM-DD (ISO)
  let d: Date
  if (birthStr.includes('/')) {
    const [dd, mm, yyyy] = birthStr.split('/')
    d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
  } else {
    d = new Date(birthStr)
  }
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors(req) })
  }

  try {
    // Auth: verify user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' }
      })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' }
      })
    }

    const { cpf, birthDate, cpfHash } = await req.json()
    if (!cpf || !birthDate) {
      return new Response(JSON.stringify({ error: 'CPF e data de nascimento são obrigatórios' }), {
        status: 400, headers: { ...cors(req), 'Content-Type': 'application/json' }
      })
    }

    // If Serpro not configured, return fallback signal
    if (!SERPRO_KEY || !SERPRO_SECRET) {
      return new Response(JSON.stringify({
        verified: false,
        method: 'not_configured',
        fallback: true,
        message: 'Serpro API não configurada. Usando autodeclaração como fallback.'
      }), {
        headers: { ...cors(req), 'Content-Type': 'application/json' }
      })
    }

    // Get Serpro token
    const token = await getSerproToken()
    if (!token) {
      return new Response(JSON.stringify({
        verified: false,
        method: 'serpro_auth_error',
        fallback: true,
        message: 'Erro na autenticação Serpro. Usando autodeclaração como fallback.'
      }), {
        headers: { ...cors(req), 'Content-Type': 'application/json' }
      })
    }

    // Query CPF
    const cpfData = await querySerproCPF(cpf, token)
    if (!cpfData || !cpfData.nascimento) {
      return new Response(JSON.stringify({
        verified: false,
        method: 'serpro_query_error',
        fallback: true,
        message: 'CPF não encontrado ou erro na consulta. Usando autodeclaração como fallback.'
      }), {
        headers: { ...cors(req), 'Content-Type': 'application/json' }
      })
    }

    // Calculate age from Serpro's birth date (authoritative)
    const serproAge = calculateAge(cpfData.nascimento)
    const isAdult = serproAge >= 18

    // Cross-check: compare Serpro birth date with user-provided birth date
    const clientAge = calculateAge(birthDate)
    const crossCheckMatch = Math.abs(serproAge - clientAge) <= 1 // 1 year tolerance

    // Save verification result to profiles (server-side, authoritative)
    if (user) {
      await supabase.from('profiles').update({
        cpf_hash: cpfHash || null,
        verification_method: 'cpf_serpro',
        age_group: isAdult ? 'adult' : 'blocked',
        birth_year: parseInt(cpfData.nascimento.slice(-4)) || null,
        age_verified_at: new Date().toISOString()
      }).eq('id', user.id)
    }

    return new Response(JSON.stringify({
      verified: true,
      is_adult: isAdult,
      method: 'cpf_serpro',
      cross_check: crossCheckMatch,
      age: serproAge,
    }), {
      headers: { ...cors(req), 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({
      verified: false,
      method: 'error',
      fallback: true,
      message: 'Erro interno. Usando autodeclaração como fallback.'
    }), {
      status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  }
})
