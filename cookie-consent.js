/**
 * escola liberal — Cookie Consent + LGPD
 * =======================================
 * Banner de consentimento de cookies conforme LGPD Art. 7°
 * Bloqueia Google Analytics até consentimento explícito.
 *
 * Uso: Incluir em TODAS as páginas HTML ANTES do script do Analytics:
 *   <script src="cookie-consent.js"></script>
 */

(function(){
  'use strict';

  var CONSENT_KEY = 'escolalib_cookie_consent';
  var GA_ID = 'G-7GMWMVY17Q';

  // ========== CHECK CONSENT ==========
  function getConsent(){
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch(e){ return null; }
  }

  function setConsent(accepted){
    var data = {
      accepted: accepted,
      date: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    return data;
  }

  // ========== GOOGLE ANALYTICS ==========
  function loadAnalytics(){
    if(document.getElementById('ga-script')) return;
    var s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_ID, {
      page_title: document.title,
      page_location: window.location.href,
      anonymize_ip: true
    });
    window.gtag = gtag;
  }

  function disableAnalytics(){
    window['ga-disable-' + GA_ID] = true;
  }

  // ========== BANNER ==========
  function createBanner(){
    var el = document.createElement('div');
    el.id = 'cookieBanner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Consentimento de cookies');
    el.innerHTML = ''
      + '<div class="cb-inner">'
      + '  <div class="cb-text">'
      + '    <strong>Privacidade e Cookies</strong>'
      + '    <p>Usamos cookies para melhorar sua experiência e analisar o uso da plataforma (Google Analytics). '
      + '    Seus dados pessoais são tratados conforme a <a href="privacidade.html">Política de Privacidade</a> e a LGPD. '
      + '    Você pode recusar cookies não essenciais sem perder acesso ao conteúdo.</p>'
      + '  </div>'
      + '  <div class="cb-actions">'
      + '    <button class="cb-btn cb-accept" id="cbAccept">Aceitar</button>'
      + '    <button class="cb-btn cb-reject" id="cbReject">Recusar</button>'
      + '    <button class="cb-btn cb-config" id="cbConfig">Configurar</button>'
      + '  </div>'
      + '</div>';

    // CSS inline para funcionar em todas as páginas
    var style = document.createElement('style');
    style.textContent = ''
      + '#cookieBanner{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:var(--bg-card,#1a2540);border-top:1px solid var(--border,rgba(255,255,255,.06));padding:1rem 1.5rem;box-shadow:0 -4px 24px rgba(0,0,0,.3);animation:cbSlideUp .4s ease}'
      + '@keyframes cbSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}'
      + '#cookieBanner.cb-hide{animation:cbSlideDown .3s ease forwards}'
      + '@keyframes cbSlideDown{to{transform:translateY(100%)}}'
      + '.cb-inner{max-width:960px;margin:0 auto;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap}'
      + '.cb-text{flex:1;min-width:280px}'
      + '.cb-text strong{display:block;font-size:.9rem;color:var(--text-primary,#e8e6e1);margin-bottom:.35rem}'
      + '.cb-text p{font-size:.8rem;color:var(--text-secondary,#9ba3b5);line-height:1.6;margin:0}'
      + '.cb-text a{color:var(--sage,#4a9e7e);text-decoration:underline}'
      + '.cb-actions{display:flex;gap:.5rem;flex-shrink:0}'
      + '.cb-btn{padding:.55rem 1.2rem;border:none;border-radius:8px;font-family:inherit;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s}'
      + '.cb-accept{background:var(--sage,#4a9e7e);color:#fff}'
      + '.cb-accept:hover{filter:brightness(1.1)}'
      + '.cb-reject{background:transparent;border:1px solid var(--border,rgba(255,255,255,.06));color:var(--text-secondary,#9ba3b5)}'
      + '.cb-reject:hover{border-color:var(--border-hover,rgba(255,255,255,.12))}'
      + '.cb-config{background:transparent;color:var(--text-muted,#6b7488);text-decoration:underline;padding:.55rem .5rem}'
      + '@media(max-width:600px){.cb-inner{flex-direction:column;text-align:center}.cb-actions{width:100%;justify-content:center}}';
    document.head.appendChild(style);

    document.body.appendChild(el);

    // Events
    document.getElementById('cbAccept').addEventListener('click', function(){
      setConsent(true);
      loadAnalytics();
      hideBanner();
    });

    document.getElementById('cbReject').addEventListener('click', function(){
      setConsent(false);
      disableAnalytics();
      hideBanner();
    });

    document.getElementById('cbConfig').addEventListener('click', function(){
      window.location.href = 'privacidade.html#cookies';
    });
  }

  function hideBanner(){
    var b = document.getElementById('cookieBanner');
    if(b){
      b.classList.add('cb-hide');
      setTimeout(function(){ b.remove(); }, 300);
    }
  }

  // ========== INIT ==========
  var consent = getConsent();
  if(consent === null){
    // Sem consentimento ainda: NÃO carrega Analytics, mostra banner
    disableAnalytics();
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', createBanner);
    } else {
      createBanner();
    }
  } else if(consent.accepted){
    // Aceitou: carrega Analytics
    loadAnalytics();
  } else {
    // Recusou: bloqueia Analytics
    disableAnalytics();
  }

  // Expor para gerenciar preferências na página de privacidade
  window.escolaCookies = {
    getConsent: getConsent,
    reset: function(){
      localStorage.removeItem(CONSENT_KEY);
      location.reload();
    },
    accept: function(){
      setConsent(true);
      loadAnalytics();
      hideBanner();
    },
    reject: function(){
      setConsent(false);
      disableAnalytics();
      hideBanner();
    }
  };

})();
