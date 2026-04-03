// src/ui/dashboard.js — extracted from app.js
// Lines: 250-387, 3132-3198, 3710-3733, 4284-4291, 3820-3905, 3927-3946

// ============================================================
// UI (main dashboard render)
// ============================================================
function ui(){
  const need=window.S.lvl*100;const li=window.getLevelInfo(window.S.lvl);
  const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  _s('uLvl',window.S.lvl);
  const xpPct=Math.round(window.S.xp/need*100);
  const xpBar=document.getElementById('xpBar');
  if(xpBar){xpBar.style.width=xpPct+'%';xpBar.setAttribute('role','progressbar');xpBar.setAttribute('aria-valuenow',window.S.xp);xpBar.setAttribute('aria-valuemin','0');xpBar.setAttribute('aria-valuemax',need);xpBar.setAttribute('aria-label',`Experiência: ${window.S.xp}/${need} XP (${xpPct}%)`);}
  _s('xpNow',window.S.xp);_s('xpMax',need);_s('sXP',window.totalXP());_s('sStreak',window.S.streak+'🔥');
  _s('wName',window.S.name);_s('pName',window.S.name);_s('avatarI',window.S.avatar||window.S.name[0]);
  // Dynamic welcome message based on progress
  var wmEl=document.getElementById('welcomeMsg');
  if(wmEl){
    var doneN=Object.keys(window.S.done).length;
    var totalN=window.M.reduce(function(s,m){return s+m.lessons.length},0);
    if(doneN===0) wmEl.textContent='Comece sua jornada! Escolha um módulo abaixo e mergulhe no aprendizado.';
    else if(doneN<5) wmEl.textContent='Ótimo começo! Continue explorando — cada aula desbloqueia novas conquistas.';
    else if(doneN<20) wmEl.textContent='Você está indo muito bem! Já completou '+doneN+' aulas de '+totalN+'. Continue assim!';
    else if(doneN<totalN) wmEl.textContent='Impressionante! '+doneN+' de '+totalN+' aulas concluídas. O caminho para mestre está cada vez mais perto!';
    else wmEl.textContent='Parabéns! Você completou todas as '+totalN+' aulas. Você é um verdadeiro mestre!';
  }
  // Level name badge
  const lvlEl=document.querySelector('.profile-lvl');
  if(lvlEl)lvlEl.innerHTML=`Nível ${window.S.lvl} · <span class="level-badge ${li.cls}">${li.emoji} ${li.name}</span>`;
  const done=Object.keys(window.S.done).length,total=window.M.reduce((s,m)=>s+m.lessons.length,0);
  document.getElementById('sLessons').textContent=done;
  const qt=Object.keys(window.S.quiz).length,qc=Object.values(window.S.quiz).filter(v=>v).length;
  document.getElementById('sQuiz').textContent=qt?Math.round(qc/qt*100)+'%':'0%';
  const sb=document.getElementById('streakB');
  sb.textContent=window.S.streak>0?`🔥 ${window.S.streak} dia${window.S.streak>1?'s':''} de sequência!`:'🔥 Comece sua sequência!';
  // Streak calendar (7 days)
  try{
    const cal=document.getElementById('streakCalendar');
    if(cal){
      const days=['D','S','T','Q','Q','S','S'];
      const today=new Date();
      let calH='';
      for(let d=6;d>=0;d--){
        const dt=new Date(today);dt.setDate(today.getDate()-d);
        const dayStr=dt.toISOString().slice(0,10);
        const isToday=d===0;
        const wasActive=window.S.streakDays&&window.S.streakDays.includes(dayStr);
        calH+=`<div class="streak-day-col" style="display:flex;flex-direction:column;align-items:center;gap:.1rem"><div class="streak-day${wasActive?' active':''}${isToday?' today':''}">${wasActive?'✓':days[dt.getDay()]}</div><div class="streak-day-label">${dt.getDate()}</div></div>`;
      }
      cal.innerHTML=calH;
    }
  }catch(e){}
  // Sidebar module progress (nM* elements no longer exist — _origById returns null, loop skips)
  window.M.forEach((m,mi)=>{
    const el=window._origById('nM'+mi);
    if(!el)return;
    const d=m.lessons.filter((_,li)=>window.S.done[`${mi}-${li}`]).length;
    const pct=Math.round(d/m.lessons.length*100);
    const clr=window.getModColor(m.color||'sage');
    let progEl=el.querySelector('.ni-prog');
    if(!progEl){
      const txtParent=el.querySelector('.ni-txt');
      if(!txtParent||!txtParent.parentElement)return;
      progEl=document.createElement('div');progEl.className='ni-prog';progEl.innerHTML='<div class="ni-prog-bar"></div>';
      txtParent.parentElement.appendChild(progEl)
    }
    const bar=progEl.querySelector('.ni-prog-bar');
    if(bar)bar.style.cssText=`width:${pct}%;background:${clr}`
  });
  window.renderCards();window.renderAch();window.renderLeaderboardWidget();window.renderXPEvent();
  if(typeof window.renderChallenges==='function')window.renderChallenges()
}

// ============================================================
// XP EVENT BANNER
// ============================================================
function renderXPEvent(){
  const{mult,label}=window.getXPMultiplier();
  let el=window._origById('xpEventBanner');
  if(mult<=1){if(el)el.style.display='none';return}
  if(!el){
    el=document.createElement('div');el.id='xpEventBanner';el.className='xp-event-banner';
    const welcome=document.querySelector('.welcome');
    if(welcome)welcome.parentNode.insertBefore(el,welcome.nextSibling)
  }
  el.style.display='';
  el.innerHTML=`<span class="xp-event-icon">⚡</span><span class="xp-event-text">${label}</span><span class="xp-event-badge">${mult}x</span>`
}

// ============================================================
// MODULE CARDS
// ============================================================
function renderCards(){
  let html='';
  const seen=new Set();
  window.M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!seen.has(disc)){
      seen.add(disc);
      const d=window.DISCIPLINES[disc]||{label:disc,icon:'📚'};
      html+=`<div class="disc-header"><span class="disc-icon">${d.icon}</span><h2 class="disc-title">${d.label}</h2></div>`;
    }
    const done=m.lessons.filter((_,li)=>window.S.done[`${i}-${li}`]).length;
    const p=Math.round(done/m.lessons.length*100);
    const clr=window.getModColor(m.color||'sage');
    const clrMuted=window.getModColorMuted(m.color||'sage');
    const statusCls=p===100?'completed':p>0?'in-progress':'not-started';
    const statusTxt=p===100?'✓ Completo':p>0?`${done}/${m.lessons.length} aulas`:'Começar';
    html+=`<div class="mc" onclick="goMod(${i})">`+
      `<div class="mc-circle"><div class="mc-ring" style="--ring-pct:${p};--ring-color:${clr}"></div><div class="mc-ring-inner"></div><span class="mc-circle-icon">${m.icon}</span></div>`+
      `<div class="mc-info"><h3>${m.title}</h3><p>${m.desc}</p><div class="mc-meta">${m.lessons.length} aulas · ${p}%</div></div>`+
      `<div class="mc-status ${statusCls}">${statusTxt}</div></div>`;
  });
  document.getElementById('mcards').innerHTML=html
}

// ============================================================
// ACHIEVEMENTS (mini)
// ============================================================
function renderAch(){
  const totalLessons=window.M.reduce((s,m)=>s+m.lessons.length,0);
  const totalQuizzes=totalLessons;
  const doneCount=Object.keys(window.S.done).length;
  const a=[
    {e:'🎯',n:'Primeira Aula',on:doneCount>=1},
    {e:'💡',n:'5 Aulas',on:doneCount>=5},
    {e:'📚',n:'10 Aulas',on:doneCount>=10},
    {e:'🌟',n:'25 Aulas',on:doneCount>=25},
    {e:'🏅',n:'50 Aulas',on:doneCount>=50}
  ];
  // Dynamic module achievements
  window.M.forEach((m,i)=>{
    a.push({e:m.icon,n:m.title,on:m.lessons.every((_,li)=>window.S.done[`${i}-${li}`])});
  });
  // Discipline completions
  Object.entries(window.DISCIPLINES).forEach(([key,d])=>{
    const mods=window.getDiscModules(key);
    if(mods.length===0)return;
    const allDone=mods.every(x=>x.mod.lessons.every((_,li)=>window.S.done[`${x.idx}-${li}`]));
    a.push({e:'🏆',n:d.label+' Completa',on:allDone});
  });
  a.push(
    {e:'🔥',n:'7 Dias Seguidos',on:window.S.streak>=7},
    {e:'💎',n:'100% Quiz',on:Object.keys(window.S.quiz).length>=totalQuizzes&&Object.values(window.S.quiz).every(v=>v)},
    {e:'👑',n:'Mestre Total',on:doneCount>=totalLessons}
  );
  const achUnlocked=a.filter(x=>x.on).length;
  document.getElementById('achs').innerHTML=a.map(x=>`<div class="ach ${x.on?'on':'off'}" onclick="goBadges()" style="cursor:pointer"><span class="ach-em">${x.e}</span><div class="ach-nm">${x.n}</div></div>`).join('')+(achUnlocked===0?'<div style="text-align:center;font-size:.75rem;color:var(--text-muted);margin-top:.5rem">Complete aulas para desbloquear conquistas!</div>':'')
}

// ============================================================
// PROGRESS CHART (WEEKLY)
// ============================================================
function renderProgressChart(){
  const tl=window.loadTimeline();
  const now=new Date();const days=[];
  const dayNames=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  for(let i=6;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i);
    const ds=d.toDateString();
    const count=tl.filter(e=>new Date(e.ts).toDateString()===ds&&(e.type==='lesson'||e.type==='quiz')).length;
    days.push({label:dayNames[d.getDay()],count,isToday:i===0})
  }
  const max=Math.max(...days.map(d=>d.count),1);
  document.getElementById('progressChart').innerHTML=`<div class="prog-chart"><h3>📊 Atividade da Semana</h3><div class="chart-bars">${days.map(d=>`<div class="chart-bar-wrap"><div class="chart-count">${d.count||''}</div><div class="chart-bar${d.isToday?' today':''}" style="height:${d.count?Math.max(8,d.count/max*100):2}%"></div><div class="chart-label">${d.label}</div></div>`).join('')}</div></div>`
}

// ============================================================
// CONTINUE STUDYING CARD
// ============================================================
function renderContinue(){
  const el=document.getElementById('continueSection');
  // Find last incomplete lesson
  if(window.S.cMod!==null&&window.S.cLes!==null&&window.M[window.S.cMod]&&window.M[window.S.cMod].lessons[window.S.cLes]&&!window.S.done[`${window.S.cMod}-${window.S.cLes}`]){
    const m=window.M[window.S.cMod],l=m.lessons[window.S.cLes];
    el.innerHTML=`<div class="continue-card" onclick="openL(${window.S.cMod},${window.S.cLes})"><div class="cc-icon">${m.icon}</div><div class="cc-info"><div class="cc-title">${l.title}</div><div class="cc-sub">${m.title} · Aula ${window.S.cLes+1}/${m.lessons.length}</div></div><div class="cc-btn">Continuar →</div></div>`;return
  }
  // Find next available lesson
  for(let mi=0;mi<window.M.length;mi++){
    if(!window.isModUnlocked(mi))continue;
    for(let li=0;li<window.M[mi].lessons.length;li++){
      if(!window.S.done[`${mi}-${li}`]){
        const m=window.M[mi],l=m.lessons[li];
        el.innerHTML=`<div class="continue-card" onclick="openL(${mi},${li})"><div class="cc-icon">${m.icon}</div><div class="cc-info"><div class="cc-title">${l.title}</div><div class="cc-sub">${m.title} · Aula ${li+1}/${m.lessons.length}</div></div><div class="cc-btn">Começar →</div></div>`;return
      }
    }
  }
  // All done
  const totalL=window.M.reduce((s,m)=>s+m.lessons.length,0);
  el.innerHTML=`<div class="continue-card" onclick="goBadges()"><div class="cc-icon">🏆</div><div class="cc-info"><div class="cc-title">Curso Completo!</div><div class="cc-sub">Todas as ${totalL} aulas concluídas. Veja suas conquistas!</div></div><div class="cc-btn">Conquistas →</div></div>`
}

// ============================================================
// MOTIVATIONAL QUOTES
// ============================================================
const QUOTES=[
  {text:'Não existe maneira de o homem se esquivar do seu próprio julgamento. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Ludwig von Mises'},
  {text:'A liberdade econômica é um requisito para a liberdade política. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Milton Friedman'},
  {text:'O mais importante investimento que você pode fazer é em si mesmo. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Warren Buffett'},
  {text:'A curiosidade é a chave da criatividade. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Akio Morita'},
  {text:'A única função da previsão econômica é fazer a astrologia parecer respeitável. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'John Kenneth Galbraith'},
  {text:'Quem controla o dinheiro de uma nação controla a nação. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Thomas Jefferson'},
  {text:'Não é da benevolência do açougueiro que esperamos nosso jantar, mas do seu interesse próprio. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Adam Smith'},
  {text:'Ideias são mais poderosas do que se imagina comumente. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Friedrich Hayek'},
  {text:'A pobreza não é causada por falta de recursos, mas pela falta de ideias certas. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Thomas Sowell'},
  {text:'Riqueza não é sobre ter muito dinheiro. É sobre ter muitas opções. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Chris Rock'},
  {text:'O empresário sempre procura a mudança, responde a ela e a explora como uma oportunidade. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Peter Drucker'},
  {text:'Se você acha que educação é cara, experimente a ignorância. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Derek Bok'},
  {text:'A inflação é a forma mais universal de tributação. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Ludwig von Mises'},
  {text:'Existe apenas um bem: o conhecimento. Existe apenas um mal: a ignorância. (citação reproduzida para fins educacionais conforme Art. 46, Lei 9.610/98)',author:'Sócrates'}
];
function renderQuote(){
  const seed=new Date().toDateString();
  let h=0;for(let i=0;i<seed.length;i++)h=seed.charCodeAt(i)+((h<<5)-h);
  const q=QUOTES[Math.abs(h)%QUOTES.length];
  document.getElementById('quoteSection').innerHTML=`<div class="quote-card"><div class="quote-text">${q.text}</div><div class="quote-author">— ${q.author}</div></div>`
}

// ============================================================
// GLOBAL PROGRESS BAR
// ============================================================
function updateGlobalProgress(){
  const done=Object.keys(window.S.done).length;
  const total=window.M.reduce((s,m)=>s+m.lessons.length,0);
  const pct=total?Math.round(done/total*100):0;
  const fillEl=document.getElementById('globalProgressFill');
  if(!fillEl)return;
  fillEl.style.width=pct+'%';
  fillEl.setAttribute('role','progressbar');
  fillEl.setAttribute('aria-valuenow',pct);
  fillEl.setAttribute('aria-valuemin','0');
  fillEl.setAttribute('aria-valuemax','100');
  fillEl.setAttribute('aria-label',`Progresso geral: ${pct}% concluído`)
}

// ============================================================
// SKELETON LOADING (for dashboard)
// ============================================================
function showSkeleton(container){
  container.innerHTML=`
    <div class="skel-row"><div class="skeleton skel-circle"></div><div style="flex:1"><div class="skeleton skel-text"></div><div class="skeleton skel-text short"></div></div></div>
    <div class="skeleton skel-card"></div>
    <div class="skeleton skel-card"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem"><div class="skeleton skel-card"></div><div class="skeleton skel-card"></div></div>`
}

function showDashSkeleton(){
  const mc=document.getElementById('mcards');
  if(mc&&mc.children.length===0){
    mc.innerHTML=Array.from({length:4},()=>`<div class="skeleton skeleton-card"></div>`).join('')
  }
}
// Show skeleton immediately on first load
showDashSkeleton();

// ============================================================
// WEEKLY SUMMARY
// ============================================================
function renderWeeklySummary(){
  let timeline;try{timeline=JSON.parse(localStorage.getItem('escola_timeline')||'[]')}catch(e){timeline=[]}
  const now=new Date();
  const weekStart=new Date(now);weekStart.setDate(now.getDate()-now.getDay());weekStart.setHours(0,0,0,0);
  const prevWeekStart=new Date(weekStart);prevWeekStart.setDate(prevWeekStart.getDate()-7);

  const thisWeek=timeline.filter(e=>{const d=new Date(e.ts);return d>=weekStart});
  const prevWeek=timeline.filter(e=>{const d=new Date(e.ts);return d>=prevWeekStart&&d<weekStart});

  const twLessons=thisWeek.filter(e=>e.type==='lesson').length;
  const pwLessons=prevWeek.filter(e=>e.type==='lesson').length;
  const twQuiz=thisWeek.filter(e=>e.type==='quiz').length;
  const pwQuiz=prevWeek.filter(e=>e.type==='quiz').length;
  const twXP=thisWeek.length*10; // approximate
  const pwXP=prevWeek.length*10;

  function comp(cur,prev){
    if(cur>prev)return{cls:'up',arrow:'↑',diff:'+'+(cur-prev)};
    if(cur<prev)return{cls:'down',arrow:'↓',diff:''+(cur-prev)};
    return{cls:'same',arrow:'=',diff:'0'}
  }
  const cL=comp(twLessons,pwLessons),cQ=comp(twQuiz,pwQuiz),cX=comp(twXP,pwXP);

  // Find or create container
  let el=window._origById('weeklySummary');
  if(!el){
    const dash=window._origById('vDash');
    const mcards=window._origById('mcards');
    if(!dash)return;
    el=document.createElement('div');el.id='weeklySummary';el.className='weekly-summary';
    if(mcards)dash.insertBefore(el,mcards);else dash.appendChild(el)
  }
  el.innerHTML=`<h3>📊 Resumo Semanal</h3>
    <div class="ws-grid">
      <div class="ws-item"><div class="ws-val ${cL.cls}">${twLessons}</div><div class="ws-lbl">Aulas</div><div class="ws-compare"><span class="arrow-${cL.cls}">${cL.arrow} ${cL.diff} vs anterior</span></div></div>
      <div class="ws-item"><div class="ws-val ${cQ.cls}">${twQuiz}</div><div class="ws-lbl">Quizzes</div><div class="ws-compare"><span class="arrow-${cQ.cls}">${cQ.arrow} ${cQ.diff} vs anterior</span></div></div>
      <div class="ws-item"><div class="ws-val ${cX.cls}">${twXP}</div><div class="ws-lbl">Atividades</div><div class="ws-compare"><span class="arrow-${cX.cls}">${cX.arrow} ${cX.diff} vs anterior</span></div></div>
    </div>`
}

// ============================================================
// DAILY GOAL
// ============================================================
const GOAL_KEY='escola_daily_goal';
function getDailyGoal(){try{return JSON.parse(localStorage.getItem(GOAL_KEY)||'{"target":3}')}catch(e){return{target:3}}}
function saveDailyGoal(g){try{localStorage.setItem(GOAL_KEY,JSON.stringify(g))}catch(e){}}
function getTodayLessons(){
  let timeline;try{timeline=JSON.parse(localStorage.getItem('escola_timeline')||'[]')}catch(e){timeline=[]}
  const today=new Date().toDateString();
  return timeline.filter(e=>e.type==='lesson'&&new Date(e.ts).toDateString()===today).length
}
function renderDailyGoal(){
  const g=getDailyGoal();
  const done=getTodayLessons();
  const pct=Math.min(100,Math.round(done/g.target*100));
  const reached=done>=g.target;

  let el=window._origById('dailyGoalSection');
  if(!el){
    const dash=window._origById('vDash');
    if(!dash)return;
    el=document.createElement('div');el.id='dailyGoalSection';el.className='daily-goal';
    const ws=window._origById('weeklySummary');
    if(ws&&ws.parentNode===dash)dash.insertBefore(el,ws);
    else{const mc=window._origById('mcards');if(mc&&mc.parentNode===dash)dash.insertBefore(el,mc);else dash.appendChild(el)}
  }
  el.innerHTML=`<h3>🎯 Meta Diária</h3>
    <div class="dg-bar-track"><div class="dg-bar-fill" style="width:${pct}%"></div></div>
    <div class="dg-info">
      <span>${done}/${g.target} aula${g.target>1?'s':''} hoje</span>
      <span>${pct}%</span>
    </div>
    ${reached?'<div class="dg-celebrate">🎉 Meta atingida! Excelente dedicação!</div>':''}
    <div class="dg-config">
      <label>Meta:</label>
      <select onchange="changeDailyGoal(this.value)" aria-label="Meta de aulas por dia">
        ${[1,2,3,5,7,10].map(n=>`<option value="${n}" ${n===g.target?'selected':''}>${n} aula${n>1?'s':''}/dia</option>`).join('')}
      </select>
    </div>`
}
function changeDailyGoal(v){
  const g=getDailyGoal();g.target=parseInt(v);saveDailyGoal(g);renderDailyGoal()
}

// ============================================================
// ARIA ENHANCEMENTS
// ============================================================
function enhanceAria(){
  // Make toast region a live area
  const toastEl=document.getElementById('toast');
  if(toastEl){toastEl.setAttribute('role','status');toastEl.setAttribute('aria-live','polite')}
  // aria-current on active nav
  document.querySelectorAll('.ni').forEach(n=>{
    const obs=new MutationObserver(()=>{
      n.setAttribute('aria-current',n.classList.contains('active')?'page':'false')
    });
    obs.observe(n,{attributes:true,attributeFilter:['class']})
  });
  // Label main content
  const main=document.getElementById('mainC');
  if(main)main.setAttribute('aria-label','Conteúdo principal');
  // Mark decorative icons
  document.querySelectorAll('.ni-icon').forEach(i=>i.setAttribute('aria-hidden','true'))
}

// ============================================================
// EXPORTS
// ============================================================
window.ui=ui;
window.renderXPEvent=renderXPEvent;
window.renderCards=renderCards;
window.renderAch=renderAch;
window.renderProgressChart=renderProgressChart;
window.renderContinue=renderContinue;
window.QUOTES=QUOTES;
window.renderQuote=renderQuote;
window.updateGlobalProgress=updateGlobalProgress;
window.showSkeleton=showSkeleton;
window.showDashSkeleton=showDashSkeleton;
window.renderWeeklySummary=renderWeeklySummary;
window.getDailyGoal=getDailyGoal;
window.saveDailyGoal=saveDailyGoal;
window.getTodayLessons=getTodayLessons;
window.renderDailyGoal=renderDailyGoal;
window.changeDailyGoal=changeDailyGoal;
window.enhanceAria=enhanceAria;

// ============================================================
// CONFETTI (was missing from module extraction)
// ============================================================
function launchConfetti(){
  var c=document.createElement('div');c.className='confetti-container';
  var colors=['#4a9e7e','#dba550','#e07460','#5b9bd5','#9b7ed8','#5bd59b','#f0d078'];
  for(var i=0;i<60;i++){
    var p=document.createElement('div');p.className='confetti-piece';
    p.style.left=Math.random()*100+'%';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDelay=Math.random()*1.5+'s';
    p.style.animationDuration=(2+Math.random()*2)+'s';
    p.style.width=(6+Math.random()*8)+'px';
    p.style.height=(6+Math.random()*8)+'px';
    p.style.borderRadius=Math.random()>.5?'50%':'2px';
    p.style.transform='rotate('+Math.random()*360+'deg)';
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(function(){c.remove()},4000);
}
window.launchConfetti=launchConfetti;
