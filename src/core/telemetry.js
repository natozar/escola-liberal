/**
 * telemetry.js — engajamento anonimo, offline-first.
 *
 * Por que existe: ate aqui, visitante sem login gerava ZERO dado na nuvem.
 * queueSync() exige currentUser, e a maioria dos primeiros visitantes nao loga.
 * Sem isso nao da pra saber quais disciplinas prendem e quais nao.
 *
 * LGPD (Art. 6 - minimizacao / Art. 7 - consentimento):
 *   - So roda com consentimento explicito ja dado em cookie-consent.js
 *   - ID anonimo aleatorio, sem vinculo com pessoa, e-mail, conta ou IP
 *   - Nao coleta texto livre, nota, resposta, nome ou qualquer PII
 *   - Apagavel pelo usuario: clearTelemetry() zera ID e fila
 *
 * Offline: enfileira em localStorage e envia quando houver rede.
 * Mesmo padrao de src/core/error-reporter.js.
 */

const QUEUE_KEY = 'escola_telemetry_queue';
const ANON_KEY = 'escola_anon_id';
const CONSENT_KEY = 'escolalib_cookie_consent';
const MAX_QUEUE = 200;      // ~30KB — bem abaixo da cota de localStorage
const FLUSH_AT = 15;        // envia em lote ao acumular
const TABLE = 'engagement_events';

let _sessionStarted = false;

function hasConsent() {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
    return !!(c && c.accepted === true);
  } catch (_) { return false; }
}

function anonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID()
         : 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch (_) { return null; }
}

// Grosso de proposito: so pra saber se o publico e mobile ou desktop
function platform() {
  try { return matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop'; }
  catch (_) { return 'unknown'; }
}

function enqueue(ev) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (q.length >= MAX_QUEUE) q.shift();   // descarta o mais antigo
    q.push(ev);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    return q.length;
  } catch (_) { return 0; }
}

/**
 * track(event, data) — registra um evento anonimo.
 * data aceita apenas: module (int), lesson (int), discipline (string), correct (bool)
 */
function track(event, data) {
  try {
    if (typeof window === 'undefined') return;
    if (window.OFFLINE_MODE) return;
    if (!hasConsent()) return;
    const id = anonId();
    if (!id) return;

    data = data || {};
    const ev = {
      anon_id: id,
      event: String(event).slice(0, 40),
      module_idx: Number.isInteger(data.module) ? data.module : null,
      lesson_idx: Number.isInteger(data.lesson) ? data.lesson : null,
      discipline: data.discipline ? String(data.discipline).slice(0, 40) : null,
      correct: typeof data.correct === 'boolean' ? data.correct : null,
      platform: platform(),
      app_version: window.APP_VERSION || null,
      occurred_at: new Date().toISOString()
    };

    const n = enqueue(ev);
    if (n >= FLUSH_AT) flushTelemetry();
  } catch (_) { /* telemetria nunca pode quebrar o app */ }
}

async function flushTelemetry() {
  try {
    if (typeof window === 'undefined') return;
    if (window.OFFLINE_MODE) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!window.sbClient || !window.sbClient.from) return;

    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!q.length) return;

    const { error } = await window.sbClient.from(TABLE).insert(q);
    if (!error) {
      localStorage.removeItem(QUEUE_KEY);
      console.log('[Telemetry] ' + q.length + ' eventos enviados');
    }
    // Com erro a fila fica intacta e tenta de novo no proximo gatilho
  } catch (_) { }
}

/** Direito de eliminacao (LGPD Art. 18, VI) */
function clearTelemetry() {
  try {
    localStorage.removeItem(QUEUE_KEY);
    localStorage.removeItem(ANON_KEY);
    console.log('[Telemetry] Dados anonimos apagados');
  } catch (_) { }
}

function initTelemetry() {
  if (typeof window === 'undefined') return;
  if (window.OFFLINE_MODE) return;

  if (!_sessionStarted) { _sessionStarted = true; track('session_start'); }

  window.addEventListener('online', () => setTimeout(flushTelemetry, 3000));
  window.addEventListener('pagehide', flushTelemetry);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTelemetry();
  });
  setTimeout(flushTelemetry, 8000);        // pega o que sobrou da sessao anterior
  setInterval(flushTelemetry, 120000);     // rede intermitente

  window.trackEvent = track;
  window.flushTelemetry = flushTelemetry;
  window.clearTelemetry = clearTelemetry;
}

export { track, initTelemetry, flushTelemetry, clearTelemetry };
