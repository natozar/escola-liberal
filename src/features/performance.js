// ============================================================
// ESCOLA LIBERAL — Performance Dashboard
// ============================================================

function goPerf() {
  window.hideAllViews();
  var vPerf = document.getElementById('vPerf');
  if (vPerf) vPerf.classList.add('on');
  window.renderBackLink('vPerf', 'Voltar');

  var S = window.S;
  var M = window.M || [];
  var totalLessons = M.reduce(function(s, m) { return s + (m.lessons ? m.lessons.length : 0); }, 0);
  var completedLessons = Object.keys(S.done || {}).length;
  var totalQuizzes = Object.keys(S.quiz || {}).length;
  var correctQuizzes = 0;
  for (var k in S.quiz) { if (S.quiz[k] === true || S.quiz[k] === 1) correctQuizzes++; }
  var accuracy = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;
  var pct = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;

  var container = document.getElementById('perfContent') || vPerf;
  container.innerHTML = '<div style="padding:1rem">'
    + '<h2 style="margin-bottom:1.5rem;font-family:DM Serif Display,Georgia,serif">Seu Desempenho</h2>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">'
    + '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem;text-align:center">'
    + '<div style="font-size:2rem;font-weight:700;color:var(--sage)">' + completedLessons + '</div>'
    + '<div style="font-size:.85rem;color:var(--text-muted)">Aulas Concluidas</div>'
    + '<div style="font-size:.75rem;color:var(--text-muted)">de ' + totalLessons + ' total</div></div>'
    + '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem;text-align:center">'
    + '<div style="font-size:2rem;font-weight:700;color:var(--sage)">' + accuracy + '%</div>'
    + '<div style="font-size:.85rem;color:var(--text-muted)">Acuracia Quizzes</div>'
    + '<div style="font-size:.75rem;color:var(--text-muted)">' + correctQuizzes + ' de ' + totalQuizzes + '</div></div>'
    + '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem;text-align:center">'
    + '<div style="font-size:2rem;font-weight:700;color:var(--sage)">' + (S.streak || 0) + '</div>'
    + '<div style="font-size:.85rem;color:var(--text-muted)">Dias Sequencia</div></div>'
    + '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem;text-align:center">'
    + '<div style="font-size:2rem;font-weight:700;color:var(--sage)">' + (S.xp || 0) + '</div>'
    + '<div style="font-size:.85rem;color:var(--text-muted)">XP Total (Nivel ' + (S.lvl || 1) + ')</div></div>'
    + '</div>'
    + '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem">'
    + '<h3 style="margin-bottom:.75rem">Progresso Geral</h3>'
    + '<div style="background:var(--bg-elevated);border-radius:var(--r-full);height:12px;overflow:hidden">'
    + '<div style="background:var(--sage);height:100%;border-radius:var(--r-full);width:' + pct + '%;transition:width .3s"></div></div>'
    + '<div style="font-size:.8rem;color:var(--text-muted);margin-top:.5rem">' + pct + '% concluido</div></div></div>';
}

window.goPerf = goPerf;
