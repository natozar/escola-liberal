// ============================================================
// DAILY CHALLENGE — extracted from app.js lines 1119-1143
// ============================================================
const DAILY_KEY='escola_daily';
function renderDaily(){
  const today=new Date().toDateString();
  let daily;try{daily=JSON.parse(localStorage.getItem(DAILY_KEY)||'{}')}catch(e){daily={}}
  var container=document.getElementById('dailyChallenge');if(!container)return;
  var isMobile=window.innerWidth<=768;
  if(daily.date===today&&daily.answered){
    container.innerHTML='<div class="daily-card daily-compact" onclick="this.classList.toggle(\'expanded\')"><div class="daily-head"><span>⚡ Desafio Diário</span><span class="daily-tag">✓ Feito</span><span class="daily-chevron">›</span></div><div class="daily-expand-body"><div style="font-size:.85rem;color:var(--text-muted);padding:.75rem">'+(daily.correct?'+50 XP conquistados!':'Tente amanhã!')+'</div></div></div>';return;
  }
  const seed=today.split('').reduce((s,c)=>s+c.charCodeAt(0),0);
  const allQ=[];window.M.forEach((m,mi)=>m.lessons.forEach((l,li)=>{if(l.quiz)allQ.push({mi,li,q:l.quiz.q,o:l.quiz.o,c:l.quiz.c,exp:l.quiz.exp,mod:m.title,icon:m.icon,disc:m.discipline})}));
  if(!allQ.length){container.innerHTML='';return}
  // Especial Eleições 2026: até 04/10/2026, dias alternados sorteiam questão de Voto Consciente
  let pool=allQ,electionDay=false;
  if(new Date()<new Date(2026,9,5)&&seed%2===0){
    const votoQ=allQ.filter(q=>q.disc==='voto');
    if(votoQ.length){pool=votoQ;electionDay=true}
  }
  const dq=pool[seed%pool.length];
  container.innerHTML='<div class="daily-card daily-compact'+(isMobile?'':' expanded')+'" onclick="this.classList.toggle(\'expanded\')">'
    +'<div class="daily-head"><span>'+(electionDay?'🗳️ Desafio das Eleições':'⚡ Desafio Diário')+'</span><span class="daily-tag">+50 XP</span><span class="daily-chevron">›</span></div>'
    +'<div class="daily-expand-body" onclick="event.stopPropagation()">'
    +'<div class="daily-q">'+dq.q+'</div>'
    +'<div class="daily-opts">'+dq.o.map(function(o,i){return'<button class="daily-o" onclick="window.answerDaily('+i+','+dq.c+',\''+dq.exp.replace(/'/g,"\\'")+'\')">'+o+'</button>'}).join('')+'</div>'
    +'<div class="daily-fb" id="dailyFb"></div>'
    +'<div style="font-size:.7rem;color:var(--text-muted);margin-top:.4rem">'+dq.icon+' '+dq.mod+'</div>'
    +'</div></div>';
}
function answerDaily(a,c,exp){
  const ok=a===c;
  document.querySelectorAll('.daily-o').forEach((b,i)=>{b.classList.add('d-off');if(i===c)b.classList.add('d-ok');if(i===a&&!ok)b.classList.add('d-no')});
  const fb=document.getElementById('dailyFb');fb.className='daily-fb show';fb.style.color=ok?'var(--sage-light)':'var(--coral)';fb.textContent=(ok?'✓ Correto! ':'✗ ')+exp;
  if(ok){window.addXP(50);window.toast('⚡ +50 XP — Desafio Diário!');window.logActivity('daily','Desafio diário — Acertou!')}
  else{window.logActivity('daily','Desafio diário — Errou')}
  localStorage.setItem(DAILY_KEY,JSON.stringify({date:new Date().toDateString(),answered:true,correct:ok}))
}

// ============================================================
// QUIZ REVIEW — extracted from app.js lines 928-952
// ============================================================
function goReview(){
  window.hideAllViews();document.getElementById('vReview').classList.add('on');window.setNav('nReview');
  const tabs=['Todos os Erros',...window.M.map(m=>m.icon+' '+m.title)];
  document.getElementById('reviewTabs').innerHTML=tabs.map((t,i)=>
    `<button class="xview-tab${i===0?' active':''}" onclick="window.filterReview(${i-1},this)">${t}</button>`
  ).join('');
  filterReview(-1,null)
}
function filterReview(modIdx,btn){
  if(btn){document.querySelectorAll('#reviewTabs .xview-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active')}
  const wrongs=[];
  window.M.forEach((mod,mi)=>{
    if(modIdx>=0&&mi!==modIdx)return;
    mod.lessons.forEach((les,li)=>{
      const k=`${mi}-${li}`;
      if(window.S.quiz[k]===false)wrongs.push({mi,li,mod:mod.title,icon:mod.icon,q:les.quiz.q,correct:les.quiz.o[les.quiz.c],exp:les.quiz.exp})
    })
  });
  document.getElementById('reviewList').innerHTML=wrongs.length?wrongs.map(w=>
    `<div class="review-card"><div class="rc-mod">${w.icon} ${w.mod} · Aula ${w.li+1}</div><div class="rc-q">${w.q}</div><div class="rc-ans">✓ ${w.correct}</div><div class="rc-exp">${w.exp}</div></div>`
  ).join(''):`<div style="padding:2rem;text-align:center;color:var(--text-muted)">🎉 Nenhum quiz errado! ${modIdx>=0?'Neste módulo.':'Continue assim!'}</div>`
}

// ============================================================
// QUIZ MARATHON — extracted from app.js lines 1581-1627
// ============================================================
const MARATHON_KEY='escola_marathon_best';
let mQuestions=[],mIdx=0,mScore=0,mTimer=0,mInterval=null;
function startMarathon(){
  window.hideAllViews();document.getElementById('vMarathon').classList.add('on');window.setNav('nMarathon');
  const allQ=[];window.M.forEach((m,mi)=>m.lessons.forEach((l,li)=>{if(l.quiz)allQ.push({mi,li,q:l.quiz.q,o:l.quiz.o,c:l.quiz.c,exp:l.quiz.exp,mod:m.title,icon:m.icon})}));
  mQuestions=allQ.sort(()=>Math.random()-.5).slice(0,10);
  mIdx=0;mScore=0;mTimer=0;
  if(mInterval)clearInterval(mInterval);
  mInterval=setInterval(()=>{mTimer++;document.getElementById('mTime').textContent=formatTime(mTimer)},1000);
  showMarathonQ()
}
function formatTime(s){const m=Math.floor(s/60);return`${m}:${String(s%60).padStart(2,'0')}`}
function showMarathonQ(){
  const q=mQuestions[mIdx];
  document.getElementById('marathonContent').innerHTML=`
    <div class="marathon-header"><div class="marathon-timer" id="mTime">${formatTime(mTimer)}</div><div class="marathon-progress">Pergunta ${mIdx+1}/10 · ${mScore} acertos</div></div>
    <div class="marathon-q"><div class="mq-mod">${q.icon} ${q.mod}</div><h3>${q.q}</h3></div>
    <div class="marathon-opts">${q.o.map((o,i)=>`<button class="marathon-o" onclick="window.ansMarathon(${i})">${o}</button>`).join('')}</div>`
}
function ansMarathon(a){
  const q=mQuestions[mIdx],ok=a===q.c;
  if(ok)mScore++;
  document.querySelectorAll('.marathon-o').forEach((b,i)=>{b.classList.add('m-off');if(i===q.c)b.classList.add('m-ok');if(i===a&&!ok)b.classList.add('m-no')});
  setTimeout(()=>{
    mIdx++;
    if(mIdx<10)showMarathonQ();else endMarathonResult()
  },ok?600:1200)
}
function endMarathonResult(){
  clearInterval(mInterval);
  let best;try{best=JSON.parse(localStorage.getItem(MARATHON_KEY)||'{}')}catch(e){best={}}
  const newBest=!best.score||mScore>best.score||(mScore===best.score&&mTimer<best.time);
  if(newBest){localStorage.setItem(MARATHON_KEY,JSON.stringify({score:mScore,time:mTimer}))}
  const emoji=mScore>=8?'🏆':mScore>=5?'💪':'📚';
  document.getElementById('marathonContent').innerHTML=`
    <div class="marathon-result"><div style="font-size:3rem">${emoji}</div><h2>Maratona Concluída!</h2>
    <div class="marathon-score" style="color:${mScore>=7?'var(--sage-light)':'var(--honey)'}">${mScore}/10</div>
    <div style="font-size:.9rem;color:var(--text-secondary);margin-bottom:.25rem">Tempo: ${formatTime(mTimer)}</div>
    ${newBest?'<div style="color:var(--honey);font-weight:700;font-size:.85rem;margin-bottom:1rem">🎉 Novo recorde pessoal!</div>':''}
    <div class="marathon-best">Melhor: ${best.score||mScore}/${10} em ${formatTime(best.time||mTimer)}</div>
    <div style="display:flex;gap:.75rem;justify-content:center"><button class="btn btn-sage" onclick="window.startMarathon()">Jogar Novamente</button><button class="btn btn-ghost" onclick="window.goDash()">Dashboard</button></div></div>`;
  if(mScore>=5){const mKey='escola_marathon_today';let mt;try{mt=JSON.parse(localStorage.getItem(mKey)||'{}')}catch(e){mt={}}const td=new Date().toDateString();if(mt.date!==td){mt={date:td,count:0}}if(mt.count<3){window.addXP(mScore*10);window.toast(`+${mScore*10} XP — Maratona!`);mt.count++;try{localStorage.setItem(mKey,JSON.stringify(mt))}catch(e){}}else{window.toast('XP da maratona: limite diário atingido (3x)')}}
}
function endMarathon(){clearInterval(mInterval);window.goDash()}

// Attach to window for HTML onclick compatibility
window.renderDaily=renderDaily;
window.answerDaily=answerDaily;
window.goReview=goReview;
window.filterReview=filterReview;
window.startMarathon=startMarathon;
window.showMarathonQ=showMarathonQ;
window.ansMarathon=ansMarathon;
window.endMarathonResult=endMarathonResult;
window.endMarathon=endMarathon;
window.formatTime=formatTime;

export {DAILY_KEY,renderDaily,answerDaily,goReview,filterReview,MARATHON_KEY,startMarathon,showMarathonQ,ansMarathon,endMarathonResult,endMarathon,formatTime};
