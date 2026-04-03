// ============================================================
// NAVIGATION
// ============================================================

function isModUnlocked(i){
  // ALL modules unlocked — no sequential lock
  return !!window.M[i];
}

// NAV
function renderBackLink(containerId,label,fn){
  var target=document.getElementById(containerId);
  if(!target)return;
  var existing=target.querySelector('.back-link');
  if(existing)existing.remove();
  var back=document.createElement('a');
  back.href='#';back.className='back-link';
  back.textContent='← '+(label||'Voltar');
  back.onclick=function(e){e.preventDefault();(fn||window.goDash)()};
  target.prepend(back);
}
function goDash(){
  const S=window.S;const M=window.M;
  window.hideAllViews();window.clearDiscAccent();
  const vd=window._origById('vDash');
  if(!vd)return;
  vd.style.display='block';vd.classList.add('view-enter');
  setTimeout(()=>vd.classList.remove('view-enter'),350);
  const fb=window._origById('focusBtn');if(fb)fb.style.display='none';
  if(document.body.classList.contains('focus-mode'))window.toggleFocus();
  window.setNav('nDash');
  try{window.ui()}catch(e){console.warn('[goDash] ui:',e.message)}
  try{window.renderContinue()}catch(e){console.warn('[goDash] renderContinue:',e.message)}
  try{window.renderQuote()}catch(e){console.warn('[goDash] renderQuote:',e.message)}
  try{window.renderProgressChart()}catch(e){console.warn('[goDash] renderProgressChart:',e.message)}
  try{window.renderDaily()}catch(e){console.warn('[goDash] renderDaily:',e.message)}
  try{window.renderMissions()}catch(e){console.warn('[goDash] renderMissions:',e.message)}
  try{window.renderFavs()}catch(e){console.warn('[goDash] renderFavs:',e.message)}
  try{window.renderProfileSwitch()}catch(e){console.warn('[goDash] renderProfileSwitch:',e.message)}
  try{window.updateGlobalProgress()}catch(e){console.warn('[goDash] updateGlobalProgress:',e.message)}
  try{window.renderWeeklySummary()}catch(e){console.warn('[goDash] renderWeeklySummary:',e.message)}
  try{window.renderDailyGoal()}catch(e){console.warn('[goDash] renderDailyGoal:',e.message)}
  // Hide empty sections for new users
  try{
    const doneCount=Object.keys(S.done).length;
    const pc=document.getElementById('progressChart');if(pc)pc.style.display=doneCount>0?'':'none';
    const fv=document.getElementById('favSection');if(fv&&!fv.innerHTML.trim())fv.style.display='none';
  }catch(e){}
}
function goMod(i){
  const S=window.S;const M=window.M;
  if(!M[i])return;
  try{history.pushState({view:'mod',mod:i},'')}catch(e){}
  S.cMod=i;const m=M[i];
  window.setDiscAccent(m.discipline||'economia');
  document.getElementById('mvT').textContent=m.icon+' '+m.title;
  document.getElementById('mvS').textContent=m.desc;
  const allDone=m.lessons.every((_,li)=>S.done[`${i}-${li}`]);
  // Reading time needs content — estimate from XP if not loaded yet
  document.getElementById('lsnList').innerHTML=m.lessons.map((l,li)=>{
    const k=`${i}-${li}`,d=S.done[k];
    const readMin=l.content?window.calcReadTime(l.content):Math.max(2,Math.round(l.xp/8));
    return`<div class="lsn ${d?'done':'cur'}" onclick="openL(${i},${li})">`+
      `<div class="lsn-n">${d?'✓':li+1}</div><div class="lsn-info"><h4>${l.title}</h4><p>${l.sub}</p></div><div class="lsn-meta"><div class="reading-time">⏱ ~${readMin} min</div><div class="lsn-xp">+${l.xp} XP</div></div></div>`
  }).join('')+(allDone?`<div style="text-align:center;margin-top:1.25rem"><button class="btn btn-sage" onclick="showCert(${i})">🏅 Ver Certificado</button></div>`:'');
  window.hideAllViews();
  const vm=document.getElementById('vMod');vm.classList.add('on','view-enter');
  setTimeout(()=>vm.classList.remove('view-enter'),350);
  window.setNav('nM'+i);
  // Preload full module content in background for when user opens a lesson
  if(!M[i]._loaded)window.loadFullModule(i);
}
async function openL(mi,li){
  const S=window.S;const M=window.M;
  if(!M[mi]||!M[mi].lessons[li])return;
  // Ensure full module content is loaded before rendering lesson
  if(!M[mi]._loaded){
    const ok=await window.loadFullModule(mi);
    if(!ok){window.toast('Erro ao carregar aula. Tente novamente.','error');return}
  }
  try{history.pushState({view:'lesson',mod:mi,les:li},'')}catch(e){}
  S.cMod=mi;S.cLes=li;const m=M[mi],l=m.lessons[li];
  if(typeof gtag==='function')gtag('event','lesson_open',{module:m.title,lesson:l.title,module_index:mi,lesson_index:li});
  document.getElementById('lvProg').textContent=`Aula ${li+1}/${m.lessons.length}`;
  let h=l.content;
  if(l.quiz){
    h+=`<div class="qz"><h3>Quiz</h3><div class="qz-q">${l.quiz.q}</div><div class="qz-opts">`;
    l.quiz.o.forEach((o,oi)=>{h+=`<button class="qz-o" tabindex="0" role="button" aria-label="Opção de resposta: ${o}" onclick="ans(${mi},${li},${oi})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();ans(${mi},${li},${oi})}" id="qo${oi}">${o}</button>`});
    h+=`</div><div class="qz-fb" id="qfb"></div></div>`
  }
  document.getElementById('lvBody').innerHTML=h;
  const qk=`${mi}-${li}`;
  if(S.quiz[qk]!==undefined){
    document.querySelectorAll('.qz-o').forEach((b,i)=>{b.classList.add('off');if(i===l.quiz.c)b.classList.add('ok')});
    const fb=document.getElementById('qfb');fb.className='qz-fb show '+(S.quiz[qk]?'fb-ok':'fb-no');fb.textContent=l.quiz.exp
  }
  document.getElementById('bPrev').disabled=li===0;
  document.getElementById('bNext').textContent=li===m.lessons.length-1?'Concluir ✓':'Próxima →';
  window.hideAllViews();
  const vl=document.getElementById('vLes');vl.classList.add('on','view-enter');
  setTimeout(()=>vl.classList.remove('view-enter'),350);
  document.getElementById('focusBtn').style.display='flex';
  document.getElementById('readTime').textContent=`⏱ ~${window.calcReadTime(l.content)} min`;
  window.loadNoteForLesson();
  window.updateFavBtn();
  window.scrollTo(0,0)
}
function ans(mi,li,a){
  const S=window.S;const M=window.M;
  if(!M[mi]||!M[mi].lessons[li]||!M[mi].lessons[li].quiz)return;
  const l=M[mi].lessons[li],ok=a===l.quiz.c,qk=`${mi}-${li}`;
  if(S.quiz[qk]!==undefined)return;
  S.quiz[qk]=ok;
  document.querySelectorAll('.qz-o').forEach((b,i)=>{b.classList.add('off');if(i===l.quiz.c){b.classList.add('ok');b.classList.add('quiz-pulse')}if(i===a&&!ok){b.classList.add('no');b.classList.add('quiz-shake')}});
  const fb=document.getElementById('qfb');fb.className='qz-fb show '+(ok?'fb-ok':'fb-no');fb.textContent=(ok?'✓ ':'✗ ')+l.quiz.exp;
  if(ok){window.addXP(15);window.toast('+15 XP');window.playSfx('success');window.logActivity('quiz',`Quiz: ${M[mi].lessons[li].title} — Acertou!`)}
  else{window.playSfx('error');window.logActivity('quiz',`Quiz: ${M[mi].lessons[li].title} — Errou`)}
  const lk=`${mi}-${li}`;
  if(!S.done[lk]){S.done[lk]=true;window.addXP(l.xp);window.toast(`+${l.xp} XP — Aula Concluída`);window.logActivity('lesson',`Aula: ${M[mi].lessons[li].title}`)}
  window.save();
  // Show AI Practice button after answering
  const qzEl=document.querySelector('.qz');
  if(qzEl&&!qzEl.querySelector('.ai-practice-btn')){
    const btn=document.createElement('button');
    btn.className='btn btn-ghost ai-practice-btn';
    btn.innerHTML='🤖 Praticar mais com IA';
    btn.onclick=()=>window.startAIQuiz(mi,li);
    qzEl.appendChild(btn)
  }
}
function nextL(){
  const S=window.S;const M=window.M;
  const mi=S.cMod,li=S.cLes;
  if(mi===null||mi===undefined||!M[mi]||!M[mi].lessons[li])return;
  const lk=`${mi}-${li}`;
  if(!S.done[lk]){S.done[lk]=true;window.addXP(M[mi].lessons[li].xp);window.toast(`+${M[mi].lessons[li].xp} XP`);window.save();window.checkSaveModal();
    if(typeof gtag==='function')gtag('event','lesson_complete',{module:M[mi].title,lesson:M[mi].lessons[li].title,total_done:Object.keys(S.done).length})}
  if(li<M[mi].lessons.length-1)window.openL(mi,li+1);else{
    const justCompleted=M[mi].lessons.every((_,i)=>S.done[`${mi}-${i}`]);
    window.goMod(mi);
    if(justCompleted){window.toast('🏆 Módulo Concluído!');window.launchConfetti();window.playSfx('complete');window.logActivity('module',`Módulo concluído: ${M[mi].title}`);setTimeout(()=>window.showCert(mi),600);window.checkDiscCompletion(mi)}
    else window.toast('🏆 Módulo Concluído!')
  }
}
function prevL(){const S=window.S;const M=window.M;if(S.cMod!==null&&M[S.cMod]&&S.cLes>0)window.openL(S.cMod,S.cLes-1)}
function goBackMod(){const S=window.S;const M=window.M;if(S.cMod!==null&&M[S.cMod])window.goMod(S.cMod)}
function setNav(id){document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));const e=document.getElementById(id);if(e){e.classList.add('active');if(window.innerWidth>900)e.scrollIntoView({block:'nearest',behavior:'smooth'})}}
function resetAll(){if(confirm('Resetar todo progresso?')){const SK=window.SK;localStorage.removeItem(SK);window.S=window.def();window.save();window.goDash()}}

// ============================================================
// VIEW HELPERS
// ============================================================
function hideAllViews(){
  document.getElementById('vDash').style.display='none';
  document.getElementById('vMod').classList.remove('on');
  document.getElementById('vLes').classList.remove('on');
  document.getElementById('vGloss').classList.remove('on');
  document.getElementById('vFlash').classList.remove('on');
  document.getElementById('vReview').classList.remove('on');
  document.getElementById('vPerf').classList.remove('on');
  document.getElementById('vMarathon').classList.remove('on');
  document.getElementById('vParent').classList.remove('on');
  document.getElementById('vBadges').classList.remove('on');
  document.getElementById('vExam').classList.remove('on');
  document.getElementById('vTimeline').classList.remove('on');
  document.getElementById('vSpaced').classList.remove('on');
  document.getElementById('vGame').classList.remove('on');
  document.getElementById('vErrorReview').classList.remove('on');
  document.getElementById('vLeaderboard').classList.remove('on');
  document.getElementById('vStudyPlan').classList.remove('on');
  document.getElementById('vExamPrep').classList.remove('on');
  document.getElementById('vAulas').style.display='none';
  var vDebate=document.getElementById('vDebate');if(vDebate)vDebate.classList.remove('on');
  document.getElementById('focusBtn').classList.remove('always');
  // Restore tutor FAB (hidden when in debate)
  var chatFab=window._origById?window._origById('chatFab'):null;
  if(chatFab)chatFab.style.display='';
  window.stopTTS()
}

// ============================================================
// FOCUS MODE
// ============================================================
function toggleFocus(){
  document.body.classList.toggle('focus-mode');
  const btn=document.getElementById('focusBtn');
  const isFocus=document.body.classList.contains('focus-mode');
  btn.textContent=isFocus?'✕':'⛶';
  btn.title=isFocus?'Sair do Modo Foco':'Modo Foco';
  if(isFocus)btn.classList.add('always')
}

// ============================================================
// READING TIME
// ============================================================
function calcReadTime(content){
  const text=content.replace(/<[^>]*>/g,' ');
  const words=text.trim().split(/\s+/).length;
  return Math.max(1,Math.ceil(words/200))
}

// Attach to window
window.isModUnlocked=isModUnlocked;
window.renderBackLink=renderBackLink;
window.goDash=goDash;
window.goMod=goMod;
window.openL=openL;
window.ans=ans;
window.nextL=nextL;
window.prevL=prevL;
window.goBackMod=goBackMod;
window.setNav=setNav;
window.resetAll=resetAll;
window.hideAllViews=hideAllViews;
window.toggleFocus=toggleFocus;
window.calcReadTime=calcReadTime;
