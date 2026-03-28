/**
 * escola liberal — Sistema de Cobrança (Stripe)
 * ===================================================
 * Adicione no app.html antes do </body>:
 *   <script src="https://js.stripe.com/v3/"></script>
 *   <script src="stripe-billing.js"></script>
 *
 * Configuração:
 *   1. Crie conta em https://stripe.com
 *   2. Copie Publishable Key de Developers > API Keys
 *   3. Crie produtos/preços no Stripe Dashboard
 *   4. Substitua as constantes abaixo
 *
 * Backend necessário:
 *   Use Supabase Edge Functions para criar checkout sessions.
 *   O template da function está incluído no arquivo supabase-functions.sql
 */

// ============================================
// CONFIGURAÇÃO
// ============================================
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51TEWC43hFZmDmgU4E2h4hLlPhrKtL7DfWtj2qHETBttZffVvTmvfNcxKqAP6VWsarKCOqZPdHUDBCrEcjzXq1iPN00teKrnPXa';

// Supabase URL — deve coincidir com a definida em supabase-client.js
// Este valor é lido de supabase-client.js se já carregado; caso contrário use o fallback abaixo.
const _SUPABASE_URL = (typeof SUPABASE_URL !== 'undefined')
  ? SUPABASE_URL
  : 'https://hwjplecfqsckfiwxiedo.supabase.co';

const PLANS = {
  free: {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    interval: null,
    features: [
      'Módulos 1 e 2 completos (20 aulas)',
      'Quiz básico por aula',
      'Progresso local (localStorage)',
      'Tema claro/escuro'
    ],
    maxModules: 2,
    cta: 'Plano Atual'
  },
  mensal: {
    id: 'mensal',
    name: 'Premium Mensal',
    price: 29.90,
    priceId: 'price_1TEZ923hFZmDmgU4CNzKGG3B',
    interval: 'mês',
    features: [
      'Todos os 6 módulos (60 aulas)',
      'Quizzes avançados + maratona',
      'Repetição espaçada inteligente',
      'Notas e favoritos ilimitados',
      'Sync na nuvem (multi-dispositivo)',
      'Conquistas e gamificação completa',
      'Missões semanais + XP bônus',
      'Certificado digital de conclusão'
    ],
    maxModules: 6,
    cta: 'Assinar R$29,90/mês',
    badge: 'Popular'
  },
  anual: {
    id: 'anual',
    name: 'Premium Anual',
    price: 19.90,
    priceId: 'price_1TEZAz3hFZmDmgU4ZJMJrsVT',
    interval: 'mês',
    billingNote: 'cobrado anualmente (R$238,80/ano)',
    originalPrice: 29.90,
    features: [
      'Tudo do Premium Mensal',
      'Economia de 33% (R$120/ano)',
      'Acesso prioritário a novos módulos',
      'Grupo exclusivo de estudo',
      'Mentoria mensal ao vivo'
    ],
    maxModules: 6,
    cta: 'Assinar R$19,90/mês',
    badge: 'Melhor Valor'
  },
  vitalicio: {
    id: 'vitalicio',
    name: 'Acesso Vitalício',
    price: 497,
    priceId: 'price_1TEZBj3hFZmDmgU4aYOfHYhy',
    interval: null,
    features: [
      'Tudo do Premium para sempre',
      'Sem mensalidade, pagamento único',
      'Todos os módulos futuros inclusos',
      'Acesso vitalício garantido',
      'Bônus: E-book exclusivo de economia'
    ],
    maxModules: 6,
    cta: 'Comprar R$497 (único)',
    badge: 'Vitalício'
  }
};

// ============================================
// STATE
// ============================================
const SUBSCRIPTION_KEY = 'escola_subscription';
let stripe = null;
let userSubscription = null;

function getSubscription() {
  try {
    return JSON.parse(localStorage.getItem(SUBSCRIPTION_KEY)) || { plan: 'free', status: 'active' };
  } catch (e) {
    return { plan: 'free', status: 'active' };
  }
}

function setSubscription(sub) {
  userSubscription = sub;
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
}

function isPremium() {
  const sub = getSubscription();
  return sub.plan !== 'free' && sub.status === 'active';
}

function getMaxModules() {
  return isPremium() ? 6 : 1;
}

// ============================================
// PAYWALL — Bloqueia módulos premium
// ============================================
function checkModuleAccess(moduleIndex) {
  // Modules 0 and 1 are always free (matches supabase-schema.sql plan definition)
  if (moduleIndex <= 1) return true;
  if (isPremium()) return true;
  showPaywall();
  return false;
}

function showPaywall() {
  if (document.getElementById('paywall-modal')) return;

  const sub = getSubscription();
  const modal = document.createElement('div');
  modal.id = 'paywall-modal';
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto">
      <div style="background:var(--card-bg,#1a2332);border-radius:16px;padding:2rem;max-width:800px;width:100%;color:var(--text,#e8e6e1);max-height:90vh;overflow-y:auto">
        <div style="text-align:center;margin-bottom:1.5rem">
          <h2 style="margin:0 0 .5rem;font-size:1.5rem">🔓 Desbloqueie Todo o Conteúdo</h2>
          <p style="color:var(--text-muted,#8a9bb5);margin:0;font-size:.9rem">6 módulos completos, 60 aulas, gamificação total</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem">
          ${renderPlanCard('mensal')}
          ${renderPlanCard('anual')}
          ${renderPlanCard('vitalicio')}
        </div>

        <div style="text-align:center">
          <button onclick="closePaywall()" style="padding:.5rem 1.5rem;border:none;background:transparent;color:var(--text-muted,#8a9bb5);cursor:pointer;text-decoration:underline;font-size:.85rem">Continuar com plano gratuito</button>
        </div>

        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border,#2a3a4e);text-align:center">
          <p style="color:var(--text-muted,#8a9bb5);font-size:.75rem;margin:0">
            🔒 Pagamento seguro via Stripe · Cancele a qualquer momento · Garantia de 7 dias
          </p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on ESC key
  function onEsc(e) {
    if (e.key === 'Escape') { closePaywall(); document.removeEventListener('keydown', onEsc); }
  }
  document.addEventListener('keydown', onEsc);

  // Close on click outside the card
  modal.querySelector('div').addEventListener('click', function(e) {
    if (e.target === this) closePaywall();
  });
}

function renderPlanCard(planId) {
  const plan = PLANS[planId];
  const isBest = planId === 'anual';

  return `
    <div style="border:${isBest ? '2px solid var(--accent,#d4a843)' : '1px solid var(--border,#2a3a4e)'};border-radius:12px;padding:1.25rem;position:relative;${isBest ? 'background:rgba(212,168,67,.05)' : ''}">
      ${plan.badge ? `<div style="position:absolute;top:-10px;right:12px;background:var(--accent,#d4a843);color:#000;font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:20px">${plan.badge}</div>` : ''}
      <h3 style="margin:0 0 .25rem;font-size:1.1rem">${plan.name}</h3>
      <div style="margin-bottom:.75rem">
        ${plan.originalPrice ? `<span style="text-decoration:line-through;color:var(--text-muted,#8a9bb5);font-size:.85rem">R$${plan.originalPrice.toFixed(2)}</span> ` : ''}
        <span style="font-size:1.5rem;font-weight:700;color:var(--accent,#d4a843)">R$${plan.price.toFixed(2)}</span>
        ${plan.interval ? `<span style="color:var(--text-muted,#8a9bb5);font-size:.8rem">/${plan.interval}</span>` : ''}
        ${plan.billingNote ? `<div style="font-size:.72rem;color:var(--text-muted,#8a9bb5);margin-top:.15rem">${plan.billingNote}</div>` : ''}
      </div>
      <ul style="list-style:none;padding:0;margin:0 0 1rem">
        ${plan.features.map(f => `<li style="font-size:.8rem;color:var(--text-muted,#8a9bb5);padding:.15rem 0">✓ ${f}</li>`).join('')}
      </ul>
      <button onclick="handleCheckout('${planId}')" style="width:100%;padding:.6rem;border:none;border-radius:8px;background:${isBest ? 'var(--accent,#d4a843)' : 'var(--border,#2a3a4e)'};color:${isBest ? '#000' : 'var(--text,#e8e6e1)'};font-weight:600;cursor:pointer;font-size:.9rem">${plan.cta}</button>
    </div>
  `;
}

function closePaywall() {
  const modal = document.getElementById('paywall-modal');
  if (modal) modal.remove();
}

// ============================================
// STRIPE CHECKOUT
// ============================================
async function handleCheckout(planId) {
  const plan = PLANS[planId];
  if (!plan || !plan.priceId) {
    if (typeof toast === 'function') toast('Plano inválido');
    return;
  }

  if (plan.priceId.includes('SEU_PRICE_ID')) {
    // Demo mode — show alert
    alert(
      'Modo Demo — Stripe não configurado.\n\n' +
      'Para ativar pagamentos:\n' +
      '1. Crie produtos no Stripe Dashboard\n' +
      '2. Copie os Price IDs\n' +
      '3. Substitua em stripe-billing.js\n' +
      '4. Configure a Supabase Edge Function'
    );
    return;
  }

  try {
    // Initialize Stripe if needed
    if (!stripe) {
      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js não carregou. Verifique sua conexão.');
      }
      stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    }

    // Call backend to create checkout session
    // Use sbClient from supabase-client.js (the active auth module)
    const authClient = (typeof sbClient !== 'undefined') ? sbClient : null;
    const sessionData = authClient ? (await authClient.auth.getSession()).data.session : null;
    const accessToken = sessionData?.access_token || '';

    const response = await fetch(_SUPABASE_URL + '/functions/v1/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        priceId: plan.priceId,
        successUrl: window.location.href + '?checkout=success',
        cancelUrl: window.location.href + '?checkout=cancel'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro no servidor (' + response.status + ')');
    }

    const result = await response.json();
    const { sessionId, url } = result;

    if (url) {
      window.location.href = url;
    } else if (sessionId) {
      await stripe.redirectToCheckout({ sessionId });
    } else {
      throw new Error('Resposta inválida do servidor de pagamento.');
    }
  } catch (err) {
    console.error('[Stripe] Erro no checkout:', err);
    if (typeof toast === 'function') toast('Erro ao processar pagamento. Tente novamente.');
  }
}

// ============================================
// CHECK CHECKOUT RESULT
// ============================================
function showSuccessBanner() {
  if (document.getElementById('checkout-success-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'checkout-success-banner';
  banner.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:10002;background:linear-gradient(135deg,#1a7a4a,#2da65e);color:#fff;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:slideDown .4s ease">
      <div style="display:flex;align-items:center;gap:.75rem">
        <span style="font-size:1.5rem">🎉</span>
        <div>
          <div style="font-weight:700;font-size:1rem">Assinatura ativada com sucesso!</div>
          <div style="font-size:.85rem;opacity:.9">Bem-vindo ao Premium — todos os módulos estão desbloqueados.</div>
        </div>
      </div>
      <button onclick="document.getElementById('checkout-success-banner').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
    </div>
    <style>@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}</style>
  `;
  document.body.appendChild(banner);
  // Auto-remove after 8 seconds
  setTimeout(() => { banner.remove(); }, 8000);
}

async function verifySubscriptionStrict() {
  const authClient = (typeof sbClient !== 'undefined') ? sbClient : null;
  const authUser = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!authClient || !authUser) return false;
  try {
    const { data } = await authClient
      .from('subscriptions')
      .select('plan, status, stripe_subscription_id, current_period_end')
      .eq('user_id', currentUser.id)
      .eq('status', 'active')
      .single();
    if (data && data.status === 'active') {
      setSubscription({ plan: data.plan, status: data.status, since: new Date().toISOString(), stripeId: data.stripe_subscription_id });
      return true;
    }
    return false;
  } catch(e) { return false; }
}

async function checkCheckoutResult() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('checkout') === 'success') {
    // Don't trust URL param — verify with backend first
    window.history.replaceState({}, '', window.location.pathname);
    const verified = await verifySubscriptionStrict();
    if (verified) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showSuccessBanner);
      } else { showSuccessBanner(); }
    } else {
      // Set pending, re-check every 30s for 5 min (Stripe webhook delay)
      setSubscription({ plan: 'premium', status: 'pending_verification', since: new Date().toISOString() });
      let attempts = 0;
      const recheck = setInterval(async () => {
        attempts++;
        const ok = await verifySubscriptionStrict();
        if (ok || attempts >= 10) { clearInterval(recheck); if(ok) showSuccessBanner(); }
      }, 30000);
    }
  } else if (params.get('checkout') === 'cancel') {
    if (typeof toast === 'function') toast('Pagamento cancelado. Você pode assinar a qualquer momento.');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function verifySubscription() {
  const authClient = (typeof sbClient !== 'undefined') ? sbClient : null;
  const authUser = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!authClient || !authUser) return;

  try {
    const { data } = await authClient
      .from('subscriptions')
      .select('plan, status, stripe_subscription_id, current_period_end')
      .eq('user_id', currentUser.id)
      .single();

    if (data) {
      setSubscription({
        plan: data.plan,
        status: data.status,
        stripeId: data.stripe_subscription_id,
        expiresAt: data.current_period_end
      });
    }
  } catch (e) {
    console.error('[Billing] Erro ao verificar assinatura:', e);
  }
}

// ============================================
// PATCH MODULE ACCESS
// ============================================
function patchModuleAccess() {
  // Override the original module click handler to add paywall check
  const origGoMod = window.goMod;
  if (origGoMod && !window._paywallPatched) {
    window.goMod = function(modIndex) {
      if (checkModuleAccess(modIndex)) {
        origGoMod(modIndex);
      }
    };
    window._paywallPatched = true;
  }
}

// ============================================
// SUBSCRIPTION BADGE
// ============================================
function addSubscriptionBadge() {
  if (!isPremium()) return;
  const nameEl = document.querySelector('.profile-name, [data-profile-name]');
  if (nameEl && !nameEl.querySelector('.premium-badge')) {
    const badge = document.createElement('span');
    badge.className = 'premium-badge';
    badge.innerHTML = ' ⭐ Premium';
    badge.style.cssText = 'font-size:.7rem;background:var(--accent,#d4a843);color:#000;padding:2px 6px;border-radius:10px;font-weight:600;margin-left:.25rem';
    nameEl.appendChild(badge);
  }
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  userSubscription = getSubscription();
  checkCheckoutResult();
  patchModuleAccess();

  // Observe DOM changes to add badge
  const observer = new MutationObserver(addSubscriptionBadge);
  observer.observe(document.body, { childList: true, subtree: true });
});
