/**
 * Supabase Edge Function — Stripe Webhook Handler
 * =================================================
 * Deploy: supabase functions deploy stripe-webhook
 *
 * Configure no Stripe Dashboard:
 *   Developers > Webhooks > Add endpoint
 *   URL: https://SEU-PROJETO.supabase.co/functions/v1/stripe-webhook
 *   Events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted, invoice.payment_succeeded,
 *           invoice.payment_failed
 *
 * Env vars necessárias (supabase secrets set):
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      if (!userId) break

      // Determine if this is a recurring subscription or one-time payment (e.g. vitalício)
      const isSubscription = session.mode === 'subscription' && session.subscription

      if (isSubscription) {
        // Recurring plan: retrieve subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: 'premium',
          status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0]?.price.id,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: 'user_id' })
      } else {
        // One-time payment (vitalício): no subscription object
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: 'vitalicio',
          status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: null,
          stripe_price_id: session.line_items
            ? (await stripe.checkout.sessions.listLineItems(session.id)).data[0]?.price?.id ?? null
            : null,
          current_period_start: new Date().toISOString(),
          current_period_end: null, // vitalício never expires
        }, { onConflict: 'user_id' })
      }

      // Update profile plan — note: profiles uses id (PK) not user_id column
      await supabase.from('profiles').update({ plan: isSubscription ? 'premium' : 'vitalicio' }).eq('id', userId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (sub) {
        await supabase.from('subscriptions').update({
          status: subscription.status === 'active' ? 'active' : 'inactive',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        }).eq('user_id', sub.user_id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (sub) {
        await supabase.from('subscriptions').update({
          status: 'canceled',
          plan: 'free'
        }).eq('user_id', sub.user_id)

        // profiles uses id (UUID PK = auth.users.id), not a separate user_id column
        await supabase.from('profiles').update({ plan: 'free' }).eq('id', sub.user_id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', invoice.customer as string)
        .single()

      if (sub) {
        await supabase.from('subscriptions').update({
          status: 'past_due'
        }).eq('user_id', sub.user_id)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
