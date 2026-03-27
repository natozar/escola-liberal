/**
 * Supabase Edge Function — Create Stripe Checkout Session
 * ========================================================
 * Deploy: supabase functions deploy create-checkout
 *
 * Env vars necessárias:
 *   STRIPE_SECRET_KEY=sk_test_...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { priceId, successUrl, cancelUrl } = await req.json()

    // Get or create Stripe customer
    let stripeCustomerId: string
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      })
      stripeCustomerId = customer.id

      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      }, { onConflict: 'user_id' })
    }

    // Determine if it's a subscription or one-time payment
    const price = await stripe.prices.retrieve(priceId)
    const isRecurring = price.type === 'recurring'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isRecurring ? 'subscription' : 'payment',
      success_url: successUrl || 'https://natozar.github.io/escola-conservadora/app.html?checkout=success',
      cancel_url: cancelUrl || 'https://natozar.github.io/escola-conservadora/app.html?checkout=cancel',
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'pt-BR',
    }

    if (isRecurring) {
      sessionParams.subscription_data = {
        metadata: { user_id: user.id },
        trial_period_days: 7, // 7 dias grátis
      }
    } else {
      sessionParams.payment_intent_data = {
        metadata: { user_id: user.id }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
