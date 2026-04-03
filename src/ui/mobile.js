// src/ui/mobile.js — Mobile navigation, bottom nav, header, practice sheet, overrides

// ============================================================
// MOBILE: BOTTOM NAV + HEADER
// ============================================================
function updateBottomNav(active){
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('bn-'+active);
  if(btn)btn.classList.add('active')
}

function updateMobileHeader(title,showBack){
  var mh=document.getElementById('mobileHeader');
  if(!mh)return;
  var titleEl=document.getElementById('mhTitle');
  if(titleEl)titleEl.textContent=title||'';
  var backEl=document.getElementById('mhBack');
  if(backEl)backEl.style.display=showBack?'flex':'none';
  var xpEl=document.getElementById('mhXP');
  if(xpEl)xpEl.textContent=(typeof window.totalXP==='function'?window.totalXP():window.S.xp||0)+' XP';
  var streakEl=document.getElementById('mhStreak');
  if(streakEl)streakEl.textContent='🔥'+(window.S.streak||0);
  var avatarEl=document.getElementById('mhAvatar');
  if(avatarEl)avatarEl.textContent=window.S.avatar||(window.S.name?window.S.name[0]:'🧑‍🎓');
}

let _mobileBackFn=null;
function mobileBack(){
  if(_mobileBackFn)_mobileBackFn();
  else window.goDash()
}
function toggleSideMobile(){
  const side=document.getElementById('side');
  const scrim=document.getElementById('sideScrim');
  side.classList.toggle('open');
  if(scrim)scrim.classList.toggle('show',side.classList.contains('open'));
}
function closeSideMobile(){
  const side=document.getElementById('side');
  const scrim=document.getElementById('sideScrim');
  if(side)side.classList.remove('open');
  if(scrim)scrim.classList.remove('show');
}
function toggleSidebarRail(){
  const shell=document.getElementById('shell');
  if(!shell)return;
  shell.classList.toggle('rail');
  const btn=document.getElementById('railBtn');
  if(btn)btn.textContent=shell.classList.contains('rail')?'▶':'◀ Recolher';
  localStorage.setItem('escola_rail',shell.classList.contains('rail')?'1':'0');
}
// Restore rail state on load
try{if(localStorage.getItem('escola_rail')==='1'){const s=document.getElementById('shell');if(s)s.classList.add('rail');const b=document.getElementById('railBtn');if(b)b.textContent='▶'}}catch(e){}

// ============================================================
// PRACTICE BOTTOM SHEET
// ============================================================
let _practiceEscHandler=null;
function togglePracticeMenu(){
  const sheet=document.getElementById('practiceSheet');
  const backdrop=document.getElementById('practiceBackdrop');
  if(!sheet||!backdrop)return;
  const isOpen=sheet.classList.contains('open');
  sheet.classList.toggle('open',!isOpen);
  backdrop.classList.toggle('show',!isOpen);
  // Update bottom nav highlight
  if(!isOpen){
    updateBottomNav('practice');
    // Update pending counts in the sheet
    _updatePracticeCounts();
    // Close on Esc
    _practiceEscHandler=function(e){
      if(e.key==='Escape'){togglePracticeMenu()}
    };
    document.addEventListener('keydown',_practiceEscHandler);
  }else{
    if(_practiceEscHandler){document.removeEventListener('keydown',_practiceEscHandler);_practiceEscHandler=null}
  }
}

function _updatePracticeCounts(){
  // Spaced repetition due count
  try{
    var spaced=JSON.parse(localStorage.getItem('escola_spaced')||'{}');
    var now=Date.now();
    var due=Object.values(spaced).filter(function(v){return v.next<=now}).length;
    var el=document.getElementById('practiceSpacedCount');
    if(el)el.textContent=due>0?due+' cards para revisar':'Nenhum card pendente';
  }catch(e){}
  // Error review count
  try{
    var wrongs=0;
    Object.entries(window.S.quiz||{}).forEach(function(kv){if(kv[1]===false)wrongs++});
    var el2=document.getElementById('practiceErrorCount');
    if(el2)el2.textContent=wrongs>0?wrongs+' questao(oes) para corrigir':'Nenhum erro pendente';
  }catch(e){}
}

// ============================================================
// SW UPDATE CHECK
// ============================================================
function checkForSwUpdate(){
  if(!('serviceWorker' in navigator)){window.toast('Service Worker nao disponivel');return}
  navigator.serviceWorker.getRegistration().then(function(reg){
    if(reg&&reg.waiting){
      reg.waiting.postMessage({type:'SKIP_WAITING'});
      window.location.reload();
    }else if(reg){
      reg.update().then(function(){window.toast('Verificando atualizacoes...')});
    }
  });
}

// Detect when a new SW is installed and waiting — show update button
if('serviceWorker' in navigator){
  navigator.serviceWorker.ready.then(function(reg){
    // Check if already waiting
    if(reg.waiting&&navigator.serviceWorker.controller){
      var btn=document.getElementById('mhUpdateBtn');
      if(btn)btn.classList.add('show');
    }
    reg.addEventListener('updatefound',function(){
      var newWorker=reg.installing;
      if(!newWorker)return;
      newWorker.addEventListener('statechange',function(){
        if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
          var btn=document.getElementById('mhUpdateBtn');
          if(btn)btn.classList.add('show');
        }
      });
    });
  });
}

// ============================================================
// AULAS TAB — mobile discipline grid
// ============================================================
function goAulasTab(){
  window.hideAllViews();
  document.getElementById('vAulas').style.display='block';
  updateBottomNav('mod');
  updateMobileHeader('Disciplinas',false);
  _mobileBackFn=null;
  renderDiscGrid();
  closeSideMobile();
}

function renderDiscGrid(){
  const grid=document.getElementById('discGrid');
  const tools=document.getElementById('toolsGrid');
  if(!grid)return;
  const titleEl=document.querySelector('.aulas-title');
  if(titleEl)titleEl.textContent='Escolha uma Disciplina';
  if(tools)tools.style.display='';
  const toolsTitle=document.querySelector('.tools-title');
  if(toolsTitle)toolsTitle.style.display='';

  const grouped={};const order=[];
  window.M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!grouped[disc]){grouped[disc]=[];order.push(disc)}
    grouped[disc].push({mod:m,idx:i});
  });

  let html='';
  order.forEach(disc=>{
    const d=window.DISCIPLINES[disc]||{label:disc,icon:'📚'};
    const mods=grouped[disc];
    const totalL=mods.reduce((s,x)=>s+x.mod.lessons.length,0);
    const doneL=mods.reduce((s,x)=>s+x.mod.lessons.filter((_,li)=>window.S.done[x.idx+'-'+li]).length,0);
    const pct=totalL?Math.round(doneL/totalL*100):0;
    const color=mods[0].mod.color||'sage';
    const firstIdx=mods[0].idx;

    html+=`<div class="disc-grid-card" data-color="${color}" onclick="${mods.length===1?'goMod('+firstIdx+')':'toggleDiscMobile(\''+disc+'\')'}">
      <div class="dg-icon">${d.icon}</div>
      <div class="dg-name">${d.label}</div>
      <div class="dg-meta">${mods.length>1?mods.length+' modulos · ':''}${totalL} aulas</div>
      <div class="dg-prog"><div class="dg-prog-fill" style="width:${pct}%;background:${window.getModColor(color)}"></div></div>
    </div>`;
  });
  grid.innerHTML=html;

  if(tools){
    tools.innerHTML=`
      <div class="tools-grid-item" onclick="goFlashcards()"><span class="tg-icon">🃏</span><span class="tg-label">Flashcards</span></div>
      <div class="tools-grid-item" onclick="startMarathon()"><span class="tg-icon">⚡</span><span class="tg-label">Maratona</span></div>
      <div class="tools-grid-item" onclick="startExam()"><span class="tg-icon">📝</span><span class="tg-label">Simulado</span></div>
      <div class="tools-grid-item" onclick="goLeaderboard()"><span class="tg-icon">🏆</span><span class="tg-label">Liga</span></div>
      <div class="tools-grid-item" onclick="goReview()"><span class="tg-icon">🔄</span><span class="tg-label">Revisao</span></div>
      <div class="tools-grid-item" onclick="goSpaced()"><span class="tg-icon">🧠</span><span class="tg-label">Espacada</span></div>
      <div class="tools-grid-item" onclick="goGlossary()"><span class="tg-icon">📖</span><span class="tg-label">Glossario</span></div>
    `;
  }
}

function toggleDiscMobile(disc){
  const mods=window.M.map((m,i)=>({mod:m,idx:i})).filter(x=>x.mod.discipline===disc);
  if(mods.length===1){window.goMod(mods[0].idx);return}
  const d=window.DISCIPLINES[disc]||{label:disc,icon:'📚'};
  window.hideAllViews();
  document.getElementById('vAulas').style.display='block';
  updateBottomNav('mod');
  updateMobileHeader(d.icon+' '+d.label,true);
  _mobileBackFn=()=>goAulasTab();

  const grid=document.getElementById('discGrid');
  const tools=document.getElementById('toolsGrid');
  const titleEl=document.querySelector('.aulas-title');
  if(titleEl)titleEl.textContent=d.label;
  if(tools)tools.style.display='none';
  const toolsTitle=document.querySelector('.tools-title');
  if(toolsTitle)toolsTitle.style.display='none';

  let html='';
  mods.forEach(x=>{
    const pct=x.mod.lessons.length?Math.round(x.mod.lessons.filter((_,li)=>window.S.done[x.idx+'-'+li]).length/x.mod.lessons.length*100):0;
    const color=x.mod.color||'sage';
    html+=`<div class="disc-grid-card" data-color="${color}" onclick="goMod(${x.idx})" style="min-height:100px">
      <div class="dg-icon">${x.mod.icon||d.icon}</div>
      <div class="dg-name">${x.mod.title}</div>
      <div class="dg-meta">${x.mod.lessons.length} aulas · ${pct}%</div>
      <div class="dg-prog"><div class="dg-prog-fill" style="width:${pct}%;background:${window.getModColor(color)}"></div></div>
    </div>`;
  });
  grid.innerHTML=html;
}

// ============================================================
// EXPORTS (before overrides)
// ============================================================
window.goAulasTab=goAulasTab;
window.toggleDiscMobile=toggleDiscMobile;
window.renderDiscGrid=renderDiscGrid;
window.togglePracticeMenu=togglePracticeMenu;
window.checkForSwUpdate=checkForSwUpdate;

// ============================================================
// MOBILE NAVIGATION OVERRIDES — wrap global nav functions for mobile UX
// ============================================================
const _origGoDash=window.goDash;
window.goDash=function(){
  _origGoDash();
  updateBottomNav('dash');
  updateMobileHeader('escola liberal',false);
  _mobileBackFn=null;
  closeSideMobile();
};
const _origGoMod=window.goMod;
window.goMod=function(i){
  if(!window.M[i])return;
  _origGoMod(i);
  updateBottomNav('mod');
  const done=window.M[i].lessons.filter((_,li)=>window.S.done[`${i}-${li}`]).length;
  const pct=Math.round(done/window.M[i].lessons.length*100);
  const disc=window.M[i].discipline||'economia';
  const d=window.DISCIPLINES[disc]||{label:disc,icon:'📚'};
  updateMobileHeader(window.M[i].icon+' '+window.M[i].title,true,`<span onclick="goAulasTab()" style="cursor:pointer;text-decoration:underline">Aulas</span> > <span onclick="toggleDiscMobile('${disc}')" style="cursor:pointer;text-decoration:underline">${d.label}</span> > ${window.M[i].title}`,pct);
  const discMods=window.M.filter(m=>m.discipline===disc);
  _mobileBackFn=discMods.length>1?()=>toggleDiscMobile(disc):()=>goAulasTab();
  closeSideMobile();
};
const _origOpenL=window.openL;
window.openL=function(mi,li){
  if(!window.M[mi]||!window.M[mi].lessons[li])return;
  _origOpenL(mi,li);
  updateBottomNav('mod');
  const pct=Math.round((li+1)/window.M[mi].lessons.length*100);
  updateMobileHeader(window.M[mi].lessons[li].title,true,`<span>${window.M[mi].title}</span> > Aula ${li+1}/${window.M[mi].lessons.length}`,pct);
  _mobileBackFn=()=>window.goMod(mi);
  closeSideMobile()
};

// Leaderboard override (new — maps to "rank" tab)
const _origGoLeaderboard=window.goLeaderboard;
if(typeof _origGoLeaderboard==='function'){
  window.goLeaderboard=function(){
    _origGoLeaderboard();
    updateBottomNav('rank');
    updateMobileHeader('🏆 Liga Semanal',true);
    _mobileBackFn=()=>window.goDash();
    closeSideMobile()
  }
}

const _origGoPerf=window.goPerf;
if(typeof window.goPerf==='function'){
  window.goPerf=function(){
    _origGoPerf();
    updateBottomNav('dash');
    updateMobileHeader('📊 Desempenho',true);
    _mobileBackFn=()=>window.goDash();
    closeSideMobile()
  }
}
const _origGoBadges=window.goBadges;
if(typeof window.goBadges==='function'){
  window.goBadges=function(){
    _origGoBadges();
    updateBottomNav('rank');
    updateMobileHeader('🏅 Conquistas',true);
    _mobileBackFn=()=>window.goDash();
    closeSideMobile()
  }
}
const _origGoTimeline=typeof window.goTimeline==='function'?window.goTimeline:null;
if(_origGoTimeline){
  window.goTimeline=function(){
    _origGoTimeline();
    updateBottomNav('dash');
    updateMobileHeader('📅 Linha do Tempo',true);
    _mobileBackFn=()=>window.goDash();
    closeSideMobile()
  }
}

// Tool function overrides — all map to "practice" context
const _origGoFlash=window.goFlashcards;
window.goFlashcards=function(){_origGoFlash();updateBottomNav('practice');updateMobileHeader('🃏 Flashcards',true);_mobileBackFn=()=>window.goDash();closeSideMobile()};
const _origStartMarathon2=window.startMarathon;
window.startMarathon=function(){_origStartMarathon2();updateBottomNav('practice');updateMobileHeader('⚡ Maratona',true);_mobileBackFn=()=>window.goDash();closeSideMobile()};
const _origStartExam=window.startExam;
window.startExam=function(){_origStartExam();updateBottomNav('practice');updateMobileHeader('📝 Simulado',true);_mobileBackFn=()=>window.goDash();closeSideMobile()};
const _origGoReview=window.goReview;
window.goReview=function(){_origGoReview();updateBottomNav('practice');updateMobileHeader('🔄 Revisao',true);_mobileBackFn=()=>window.goDash();closeSideMobile()};
const _origGoSpaced=window.goSpaced;
window.goSpaced=function(){_origGoSpaced();updateBottomNav('practice');updateMobileHeader('🧠 Revisao Espacada',true);_mobileBackFn=()=>window.goDash();closeSideMobile()};
const _origGoGlossary=window.goGlossary;
window.goGlossary=function(){_origGoGlossary();updateBottomNav('mod');updateMobileHeader('📖 Glossario',true);_mobileBackFn=()=>window.goDash();closeSideMobile()};
const _origGoGame=typeof window.goGame==='function'?window.goGame:null;
if(_origGoGame){window.goGame=function(){_origGoGame();updateBottomNav('practice');updateMobileHeader('🍋 Mini-Jogo',true);_mobileBackFn=()=>window.goDash();closeSideMobile()}}
const _origGoErrorReview=typeof window.goErrorReview==='function'?window.goErrorReview:null;
if(_origGoErrorReview){window.goErrorReview=function(){_origGoErrorReview();updateBottomNav('practice');updateMobileHeader('🔄 Revisar Erros',true);_mobileBackFn=()=>window.goDash();closeSideMobile()}}

// Debate overrides
const _origGoDebate=typeof window.goDebate==='function'?window.goDebate:null;
if(_origGoDebate){
  window.goDebate=function(){
    _origGoDebate();
    updateBottomNav('dash');
    updateMobileHeader('🔥 Debates ao Vivo',true);
    _mobileBackFn=()=>window.goDash();
    closeSideMobile();
  }
}
const _origGoDebateRoom=typeof window.goDebateRoom==='function'?window.goDebateRoom:null;
if(_origGoDebateRoom){
  window.goDebateRoom=function(roomId){
    _origGoDebateRoom(roomId);
    var room=window.DEBATE_ROOMS&&window.DEBATE_ROOMS.find(function(r){return r.id===roomId});
    var name=room?(room.icon+' '+room.name):'Debate';
    updateBottomNav('dash');
    updateMobileHeader(name,true);
    _mobileBackFn=()=>window.goDebate();
    closeSideMobile();
  }
}

// ============================================================
// BLOCK PULL-TO-REFRESH (iOS Safari standalone fallback)
// overscroll-behavior-y:contain handles Chrome/Edge/Firefox.
// This JS handles iOS Safari standalone mode where CSS alone doesn't work.
// ============================================================
var _ptrStartY=0;
document.addEventListener('touchstart',function(e){
  _ptrStartY=e.touches[0].clientY;
},{passive:true});
document.addEventListener('touchmove',function(e){
  if(window.scrollY===0&&e.touches[0].clientY>_ptrStartY+10){
    e.preventDefault();
  }
},{passive:false});

// ============================================================
// MOBILE: SWIPE GESTURES
// ============================================================
let touchStartX=0,touchStartY=0,touchStartTime=0;
document.addEventListener('touchstart',e=>{
  touchStartX=e.changedTouches[0].screenX;
  touchStartY=e.changedTouches[0].screenY;
  touchStartTime=Date.now()
},{passive:true});
document.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].screenX-touchStartX;
  const dy=e.changedTouches[0].screenY-touchStartY;
  const dt=Date.now()-touchStartTime;
  if(Math.abs(dx)<80||Math.abs(dy)>Math.abs(dx)*0.6||dt>400)return;
  const lesOn=document.getElementById('vLes')&&document.getElementById('vLes').classList.contains('on');
  if(!lesOn)return;
  if(dx>0){window.prevL();vibrate()}
  else{window.nextL();vibrate()}
},{passive:true});

// ============================================================
// MOBILE: HAPTIC FEEDBACK
// ============================================================
function vibrate(ms){
  if(navigator.vibrate)navigator.vibrate(ms||15)
}
document.addEventListener('click',e=>{
  if(e.target.closest('.btn,.qz-o,.ni,.bnav-item,.er-opt,.practice-item'))vibrate()
},{passive:true});

// ============================================================
// SIDEBAR COLLAPSIBLE SECTIONS
// ============================================================
function toggleSideSection(id){
  const sec=document.getElementById(id);
  if(!sec)return;
  sec.classList.toggle('collapsed');
  const arrowMap={toolsSection:'toolsArrow',configSection:'configArrow'};
  const arrow=document.getElementById(arrowMap[id]);
  if(arrow)arrow.textContent=sec.classList.contains('collapsed')?'▸':'▾';
}

// ============================================================
// LANGUAGE TOGGLE HELPER
// ============================================================
function updateLangToggle(){
  const flag=document.getElementById('langFlag');
  const label=document.getElementById('langLabel');
  const sub=document.getElementById('langSub');
  if(!flag||!label||!sub)return;
  if(window.CURRENT_LANG==='pt'){
    flag.textContent='🇺🇸';label.textContent='English';sub.textContent='Switch language'
  }else{
    flag.textContent='🇧🇷';label.textContent='Portugues';sub.textContent='Trocar idioma'
  }
}

// ============================================================
// EXPORTS
// ============================================================
window.updateBottomNav=updateBottomNav;
window.updateMobileHeader=updateMobileHeader;
window.mobileBack=mobileBack;
window.toggleSideMobile=toggleSideMobile;
window.closeSideMobile=closeSideMobile;
window.toggleSidebarRail=toggleSidebarRail;
window.vibrate=vibrate;
window.toggleSideSection=toggleSideSection;
window.updateLangToggle=updateLangToggle;
