// ============================================================
// ESCOLA LIBERAL — Timeline & Activity Log
// ============================================================
const TIMELINE_KEY = 'escola_timeline';
const MAX_ENTRIES = 500;

function logActivity(type, description) {
  try {
    const timeline = JSON.parse(localStorage.getItem(TIMELINE_KEY) || '[]');
    timeline.unshift({ type: type, desc: description, ts: new Date().toISOString() });
    if (timeline.length > MAX_ENTRIES) timeline.length = MAX_ENTRIES;
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(timeline));
  } catch (e) { console.warn('[Timeline] logActivity:', e.message); }
}

function loadTimeline() {
  try { return JSON.parse(localStorage.getItem(TIMELINE_KEY) || '[]'); }
  catch (e) { return []; }
}

function goTimeline() {
  window.hideAllViews();
  var vTl = document.getElementById('vTimeline');
  if (vTl) vTl.classList.add('on');
  window.renderBackLink('vTimeline', 'Voltar');
  var tl = loadTimeline();
  var container = document.getElementById('timelineContent') || vTl;
  if (!tl.length) {
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)"><p>Nenhuma atividade registrada ainda.</p><p style="font-size:.85rem">Complete aulas e quizzes para ver seu historico aqui.</p></div>';
    return;
  }
  var html = '<div style="padding:1rem">';
  tl.slice(0, 50).forEach(function(e) {
    var icons = { lesson: '📖', quiz: '✅', level: '🏆', badge: '🏅', daily: '⭐', share: '📤', backup: '💾', install: '📱', exam: '📝', module: '🎓' };
    var icon = icons[e.type] || '📌';
    var date = e.ts ? new Date(e.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    html += '<div style="display:flex;gap:.75rem;align-items:flex-start;padding:.5rem 0;border-bottom:1px solid var(--border)">';
    html += '<span style="font-size:1.2rem;flex-shrink:0">' + icon + '</span>';
    html += '<div style="flex:1;min-width:0"><div style="font-size:.85rem;color:var(--text-primary)">' + (e.desc || e.type) + '</div>';
    html += '<div style="font-size:.7rem;color:var(--text-muted)">' + date + '</div></div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

window.logActivity = logActivity;
window.loadTimeline = loadTimeline;
window.goTimeline = goTimeline;
