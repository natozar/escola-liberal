/**
 * Supabase Edge Function — Admin Stripe Operations
 * ================================================
 * Proxies Stripe API calls through server-side, keeping secret keys off the browser.
 * Only accessible to authenticated admin users (is_admin=true).
 *
 * Deploy: supabase functions deploy admin-stripe-ops
 * Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY (already configured)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!
const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = [
  'https://escolaliberal.com.br',
  'https://natozar.github.io',
]

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('origin') || ''
  const referer = req.headers.get('referer') || ''
  if (!origin && !referer) return false  // sem Origin nem Referer = chamada direta (curl/servidor) → bloqueia
  if (origin && ALLOWED_ORIGINS.includes(origin)) return true
  if (referer) {
    try { const u = new URL(referer); if (ALLOWED_ORIGINS.includes(u.origin)) return true } catch {}
  }
  return false
}

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })

  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: 'origin_blocked' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Auth: verify JWT + is_admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(SB_URL, SB_SERVICE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
      status: 403, headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  }

  // Parse action
  const { action, params } = await req.json()

  if (!STRIPE_SECRET || STRIPE_SECRET === 'undefined') {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }), {
      status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  }

  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2023-10-16' })

  try {
    let result
    switch (action) {
      case 'list_customers':
        result = await stripe.customers.list({ limit: params?.limit || 100 })
        break
      case 'list_subscriptions':
        result = await stripe.subscriptions.list({ limit: params?.limit || 100 })
        break
      case 'list_invoices':
        result = await stripe.invoices.list({ limit: params?.limit || 100 })
        break
      case 'list_payments':
        result = await stripe.paymentIntents.list({ limit: params?.limit || 100 })
        break
      case 'get_balance':
        result = await stripe.balance.retrieve()
        break
      case 'get_customer':
        if (!params?.id) throw new Error('Customer ID required')
        result = await stripe.customers.retrieve(params.id)
        break
      case 'cancel_subscription':
        if (!params?.id) throw new Error('Subscription ID required')
        result = await stripe.subscriptions.cancel(params.id)
        break
      default:
        return new Response(JSON.stringify({ error: 'Unknown action: ' + action }), {
          status: 400, headers: { ...cors(req), 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' }
    })
  }
})
