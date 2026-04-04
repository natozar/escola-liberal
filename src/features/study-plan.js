// ============================================================
// STUDY PLAN + EXAM PREP
// Extracted from app.js
// ============================================================

// ============================================================
// STUDY PLAN — PLANO DE ESTUDOS PERSONALIZADO
// ============================================================
function goStudyPlan(){
  window.hideAllViews();window.setNav('nStudyPlan');
  document.getElementById('vStudyPlan').classList.add('on');
  window.renderBackLink('vStudyPlan','Voltar');
  try{history.pushState({view:'studyplan'},'')}catch(e){}
  renderStudyPlan()
}

function analyzeProgress(){
  const totalL=window.M.reduce((s,m)=>s+m.lessons.length,0);
  const doneCount=Object.keys(window.S.done).length;
  const quizTotal=Object.keys(window.S.quiz).length;
  const quizCorrect=Object.values(window.S.quiz).filter(v=>v).length;
  const quizPct=quizTotal?Math.round(quizCorrect/quizTotal*100):0;

  // Per-discipline analysis
  const discAnalysis={};
  Object.entries(window.DISCIPLINES).forEach(([key,d])=>{
    const mods=window.M.map((m,i)=>({m,i})).filter(x=>(x.m.discipline||'economia')===key);
    if(!mods.length)return;
    let done=0,total=0,qOk=0,qTotal=0;
    mods.forEach(({m,i})=>{
      m.lessons.forEach((_,li)=>{
        total++;
        if(window.S.done[`${i}-${li}`])done++;
        if(window.S.quiz[`${i}-${li}`]!==undefined){qTotal++;if(window.S.quiz[`${i}-${li}`])qOk++}
      });
    });
    const pct=total?Math.round(done/total*100):0;
    const qPct=qTotal?Math.round(qOk/qTotal*100):0;
    discAnalysis[key]={label:d.label,icon:d.icon,done,total,pct,qOk,qTotal,qPct,mods}
  });

  // Find weak areas (low quiz accuracy)
  const weakAreas=Object.entries(discAnalysis)
    .filter(([_,d])=>d.qTotal>=3&&d.qPct<70)
    .sort((a,b)=>a[1].qPct-b[1].qPct);

  // Find next lessons to do (per discipline, the first incomplete)
  const nextLessons=[];
  Object.entries(discAnalysis).forEach(([key,d])=>{
    for(const{m,i}of d.mods){
      if(!window.isModUnlocked(i))continue;
      for(let li=0;li<m.lessons.length;li++){
        if(!window.S.done[`${i}-${li}`]){
          nextLessons.push({mi:i,li,title:m.lessons[li].title,mod:m.title,icon:m.icon,disc:key,discLabel:d.label});
          break
        }
      }
      if(nextLessons.filter(n=>n.disc===key).length)break
    }
  });

  // Study streak analysis
  const daysActive=(window.S.streakDays||[]).length;
  const avgPerDay=daysActive?Math.round(doneCount/Math.max(1,daysActive)):0;

  // Weekly goal suggestion
  const remaining=totalL-doneCount;
  const weeksToFinish=remaining>0?Math.ceil(remaining/(avgPerDay*5||5)):0;

  return{totalL,doneCount,quizPct,discAnalysis,weakAreas,nextLessons,avgPerDay,remaining,weeksToFinish,daysActive}
}

function renderStudyPlan(){
  const a=analyzeProgress();
  const el=document.getElementById('studyPlanContent');

  // Summary card
  let html=`<div class="sp-summary">
    <div class="sp-summary-stat"><div class="sp-stat-val">${a.doneCount}/${a.totalL}</div><div class="sp-stat-lbl">Aulas completas</div></div>
    <div class="sp-summary-stat"><div class="sp-stat-val">${a.quizPct}%</div><div class="sp-stat-lbl">Acerto quizzes</div></div>
    <div class="sp-summary-stat"><div class="sp-stat-val">${a.avgPerDay}</div><div class="sp-stat-lbl">Aulas/dia média</div></div>
    <div class="sp-summary-stat"><div class="sp-stat-val">${a.weeksToFinish>0?'~'+a.weeksToFinish+'sem':'✓'}</div><div class="sp-stat-lbl">${a.weeksToFinish>0?'Para terminar':'Completo!'}</div></div>
  </div>`;

  // Recommended next lessons
  if(a.nextLessons.length){
    html+=`<div class="sp-section"><h3>🎯 Próximas Aulas Recomendadas</h3><div class="sp-next-list">`;
    a.nextLessons.slice(0,5).forEach(n=>{
      html+=`<div class="sp-next-item" onclick="openL(${n.mi},${n.li})">
        <span class="sp-next-icon">${n.icon}</span>
        <div class="sp-next-info"><div class="sp-next-title">${n.title}</div><div class="sp-next-sub">${n.discLabel} · ${n.mod}</div></div>
        <span class="sp-next-arrow">→</span>
      </div>`
    });
    html+=`</div></div>`
  }

  // Weak areas
  if(a.weakAreas.length){
    html+=`<div class="sp-section"><h3>⚠️ Áreas para Reforçar</h3><p class="sp-section-sub">Disciplinas com menos de 70% de acerto nos quizzes</p><div class="sp-weak-list">`;
    a.weakAreas.forEach(([key,d])=>{
      html+=`<div class="sp-weak-item">
        <span class="sp-weak-icon">${d.icon}</span>
        <div class="sp-weak-info"><div class="sp-weak-name">${d.label}</div><div class="sp-weak-stat">${d.qPct}% acerto (${d.qOk}/${d.qTotal})</div></div>
        <button class="btn btn-ghost btn-sm" onclick="goReview()">Revisar</button>
      </div>`
    });
    html+=`</div></div>`
  }

  // Discipline progress map
  html+=`<div class="sp-section"><h3>📊 Mapa de Progresso</h3><div class="sp-disc-map">`;
  Object.entries(a.discAnalysis).sort((a,b)=>a[1].pct-b[1].pct).forEach(([key,d])=>{
    const status=d.pct===100?'complete':d.pct>0?'active':'todo';
    html+=`<div class="sp-disc-row">
      <span class="sp-disc-icon">${d.icon}</span>
      <div class="sp-disc-info">
        <div class="sp-disc-head"><span class="sp-disc-name">${d.label}</span><span class="sp-disc-pct">${d.pct}%</span></div>
        <div class="sp-disc-bar"><div class="sp-disc-fill sp-disc-${status}" style="width:${d.pct}%"></div></div>
        <div class="sp-disc-meta">${d.done}/${d.total} aulas · ${d.qTotal?d.qPct+'% quizzes':'sem quizzes ainda'}</div>
      </div>
    </div>`
  });
  html+=`</div></div>`;

  // Tips
  html+=`<div class="sp-section sp-tips"><h3>💡 Dicas para Você</h3><div class="sp-tips-list">`;
  if(window.S.streak<3)html+=`<div class="sp-tip">🔥 Quanto mais dias voce estuda, mais rapido aprende. Continue no seu ritmo!</div>`;
  if(a.quizPct<60&&a.quizPct>0)html+=`<div class="sp-tip">📖 Revise as aulas antes de refazer os quizzes. Use os Flashcards para memorizar conceitos-chave.</div>`;
  if(a.weakAreas.length)html+=`<div class="sp-tip">🎯 Foque em ${a.weakAreas[0][1].label} — é sua área mais fraca. Prática com IA pode ajudar!</div>`;
  if(a.doneCount>20&&a.doneCount<a.totalL)html+=`<div class="sp-tip">🏆 Você já fez ${Math.round(a.doneCount/a.totalL*100)}% do currículo! Faltam ${a.remaining} aulas. Continue assim!</div>`;
  if(a.doneCount===0)html+=`<div class="sp-tip">🚀 Comece pela disciplina que mais te interessa. A primeira aula de cada disciplina é gratuita!</div>`;
  html+=`</div></div>`;

  el.innerHTML=html
}

// ============================================================
// EXAM PREP — REVISÃO PRÉ-PROVA
// ============================================================
function goExamPrep(){
  window.hideAllViews();window.setNav('nExamPrep');
  document.getElementById('vExamPrep').classList.add('on');
  renderExamPrepSelector()
}

function renderExamPrepSelector(){
  const el=document.getElementById('examPrepContent');
  let html=`<div class="ep-intro">
    <p>Selecione uma disciplina para gerar um caderno de revisão com resumos, quizzes errados e conceitos-chave.</p>
  </div><div class="ep-disc-list">`;
  Object.entries(window.DISCIPLINES).forEach(([key,d])=>{
    const mods=window.getDiscModules(key);
    if(!mods.length)return;
    let done=0,total=0,wrongQ=0;
    mods.forEach(({mod,idx})=>{
      mod.lessons.forEach((_,li)=>{
        total++;if(window.S.done[`${idx}-${li}`])done++;
        if(window.S.quiz[`${idx}-${li}`]===false)wrongQ++
      })
    });
    if(done===0)return; // Skip disciplines with no progress
    const pct=Math.round(done/total*100);
    html+=`<div class="ep-disc-card" onclick="generateExamPrep('${key}')">
      <span class="ep-disc-icon">${d.icon}</span>
      <div class="ep-disc-info">
        <div class="ep-disc-name">${d.label}</div>
        <div class="ep-disc-meta">${done}/${total} aulas · ${wrongQ} erros para revisar</div>
      </div>
      <span class="ep-disc-arrow">→</span>
    </div>`
  });
  html+=`</div>`;
  el.innerHTML=html
}

function generateExamPrep(disc){
  const d=window.DISCIPLINES[disc];if(!d)return;
  const mods=window.getDiscModules(disc);
  const el=document.getElementById('examPrepContent');

  // Collect wrong quizzes
  const wrongs=[];
  mods.forEach(({mod,idx})=>{
    mod.lessons.forEach((l,li)=>{
      if(window.S.quiz[`${idx}-${li}`]===false&&l.quiz){
        wrongs.push({mod:mod.title,icon:mod.icon,lesson:l.title,q:l.quiz.q,correct:l.quiz.o[l.quiz.c],exp:l.quiz.exp,mi:idx,li})
      }
    })
  });

  // Collect key terms from glossary related to discipline
  const relatedTerms=typeof GLOSSARY!=='undefined'?GLOSSARY.filter(g=>{
    const discTerms={economia:['preço','oferta','demanda','inflação','juros','moeda','mercado','capital','lucro'],matematica:['número','fração','equação','geometria'],filosofia:['lógica','ética','razão','argumento']};
    const terms=discTerms[disc]||[];
    return terms.some(t=>g.term.toLowerCase().includes(t)||g.def.toLowerCase().includes(t))
  }).slice(0,8):[];

  // Collect completed lessons summaries (first 100 chars of content)
  const summaries=[];
  mods.forEach(({mod,idx})=>{
    mod.lessons.forEach((l,li)=>{
      if(window.S.done[`${idx}-${li}`]&&l.content){
        const text=l.content.replace(/<[^>]*>/g,' ').trim().substring(0,200);
        summaries.push({title:l.title,mod:mod.title,text:text+'...',mi:idx,li})
      }
    })
  });

  let html=`<button class="btn btn-ghost" onclick="renderExamPrepSelector()" style="margin-bottom:1rem">← Voltar</button>`;
  html+=`<h3 style="font-size:1.1rem;margin-bottom:1rem">${d.icon} Caderno de Revisão — ${d.label}</h3>`;

  // Wrong quizzes section
  if(wrongs.length){
    html+=`<div class="ep-section ep-section-red"><h4>❌ Questões Erradas (${wrongs.length})</h4>`;
    wrongs.forEach(w=>{
      html+=`<div class="ep-wrong-card">
        <div class="ep-wrong-q">${w.q}</div>
        <div class="ep-wrong-ans">✓ ${w.correct}</div>
        <div class="ep-wrong-exp">${w.exp}</div>
        <div class="ep-wrong-meta">${w.icon} ${w.mod} · ${w.lesson}</div>
        <button class="btn btn-ghost btn-sm" onclick="openL(${w.mi},${w.li})">Revisar aula</button>
      </div>`
    });
    html+=`</div>`
  }

  // Key terms
  if(relatedTerms.length){
    html+=`<div class="ep-section"><h4>📚 Conceitos-Chave (${relatedTerms.length})</h4>`;
    relatedTerms.forEach(g=>{
      html+=`<div class="ep-term"><strong>${g.term}:</strong> ${g.def}</div>`
    });
    html+=`</div>`
  }

  // Lesson summaries
  if(summaries.length){
    html+=`<div class="ep-section"><h4>📝 Resumo das Aulas (${summaries.length})</h4>`;
    summaries.slice(0,10).forEach(s=>{
      html+=`<div class="ep-summary" onclick="openL(${s.mi},${s.li})">
        <div class="ep-summary-title">${s.title}</div>
        <div class="ep-summary-text">${s.text}</div>
      </div>`
    });
    if(summaries.length>10)html+=`<div style="font-size:.78rem;color:var(--text-muted);text-align:center">+ ${summaries.length-10} aulas</div>`;
    html+=`</div>`
  }

  if(!wrongs.length&&!relatedTerms.length&&!summaries.length){
    html+=`<div class="ep-section"><p style="color:var(--text-muted)">Ainda não há dados suficientes. Complete mais aulas desta disciplina.</p></div>`
  }

  el.innerHTML=html
}

// Attach to window
window.goStudyPlan=goStudyPlan;
window.analyzeProgress=analyzeProgress;
window.renderStudyPlan=renderStudyPlan;
window.goExamPrep=goExamPrep;
window.renderExamPrepSelector=renderExamPrepSelector;
window.generateExamPrep=generateExamPrep;
