// ============================================================
// SAFE DOM HELPER — prevents "Cannot read properties of null"
// ============================================================
const _origById=document.getElementById.bind(document);
const _nullProxy=new Proxy(document.createElement('div'),{get(t,p){if(p==='__isNull')return true;const v=t[p];return typeof v==='function'?v.bind(t):v},set(t,p,v){return true}});
document.getElementById=function(id){return _origById(id)||_nullProxy};

// ============================================================
// COURSE DATA — lazy-loaded: index (66KB) on boot, full content per module on demand
// ============================================================
let M=[];
const _modCache={};  // cache of fully-loaded modules by index

async function loadLessons(){
  // Phase 1: Load lightweight index (metadata + quizzes, no lesson content)
  try{
    const r=await fetch('./lessons/index.json');
    if(!r.ok)throw new Error(r.status);
    M=await r.json();
    // Mark modules as not fully loaded (no lesson content yet)
    M.forEach(m=>{m._loaded=false});
  }catch(e){
    console.warn('[Lessons] Index fetch failed, trying full fallback...',e.message);
    try{
      // Fallback: try legacy lessons.json (full file) or cache
      const r2=await fetch('./lessons.json');
      if(r2.ok){M=await r2.json();M.forEach(m=>{m._loaded=true});return true}
    }catch(e2){}
    try{
      const c=await caches.match('./lessons.json');
      if(c){M=await c.json();M.forEach(m=>{m._loaded=true});return true}
      const c2=await caches.match('./lessons/index.json');
      if(c2){M=await c2.json();M.forEach(m=>{m._loaded=false})}
    }catch(e3){console.error('[Lessons] All sources failed:',e3.message)}
  }
  if(M.length===0){
    document.getElementById('errorScreen').style.display='flex';
    const retryBtn=document.getElementById('errorScreen').querySelector('button');
    if(retryBtn){
      retryBtn.onclick=async function(){
        this.textContent='Carregando...';
        this.disabled=true;
        const ok=await loadLessons();
        if(ok){document.getElementById('errorScreen').style.display='none';location.reload()}
        else{this.textContent='Recarregar';this.disabled=false}
      };
    }
    return false;
  }
  return true;
}

// Phase 2: Load full module content on demand (when user opens a module/lesson)
async function loadFullModule(i){
  if(!M[i])return false;
  if(M[i]._loaded)return true;
  if(_modCache[i]){M[i]=_modCache[i];return true}
  try{
    const r=await fetch('./lessons/mod-'+i+'.json');
    if(!r.ok)throw new Error(r.status);
    const full=await r.json();
    full._loaded=true;
    // Preserve quiz data from index if full module load somehow misses it
    M[i]=full;
    _modCache[i]=full;
    return true;
  }catch(e){
    console.warn('[Lessons] Module '+i+' fetch failed, trying cache...',e.message);
    try{
      const c=await caches.match('./lessons/mod-'+i+'.json');
      if(c){const full=await c.json();full._loaded=true;M[i]=full;_modCache[i]=full;return true}
    }catch(e2){}
    // Final fallback: try full lessons.json
    try{
      const c=await caches.match('./lessons.json');
      if(c){const all=await c.json();if(all[i]){all[i]._loaded=true;M[i]=all[i];_modCache[i]=all[i];return true}}
    }catch(e3){}
    return false;
  }
}

// Preload remaining modules in background after dashboard renders
function preloadModules(){
  M.forEach((_,i)=>{
    if(!M[i]._loaded)setTimeout(()=>loadFullModule(i),1000+i*200);
  });
}

// ============================================================
// DISCIPLINE & COLOR HELPERS
// ============================================================
const DISCIPLINES={
  economia:{label:'Economia',icon:'💰',order:0},
  matematica:{label:'Matemática',icon:'🔢',order:1},
  filosofia:{label:'Filosofia',icon:'🏛️',order:2},
  emocional:{label:'Inteligência Emocional',icon:'💡',order:3},
  psicologia:{label:'Psicologia',icon:'🧠',order:4},
  portugues:{label:'Português e Redação',icon:'📝',order:5},
  ciencias:{label:'Ciências da Natureza',icon:'🔬',order:6},
  historia:{label:'História do Brasil',icon:'🇧🇷',order:7},
  history:{label:'American History',icon:'🇺🇸',order:8},
  financas:{label:'Educação Financeira',icon:'💳',order:9},
  ingles:{label:'Inglês',icon:'🇬🇧',order:10},
  geografia:{label:'Geografia',icon:'🌍',order:11},
  ia:{label:'Inteligência Artificial',icon:'🤖',order:12},
  midia:{label:'Educação Midiática',icon:'🛡️',order:13},
  direito:{label:'Direito e Cidadania',icon:'⚖️',order:14},
  saude:{label:'Saúde e Bem-estar',icon:'💪',order:15},
  artes:{label:'Artes e Cultura',icon:'🎨',order:16},
  logica:{label:'Lógica e Argumentação',icon:'🧩',order:17}
};
const COLOR_MAP={
  sage:'var(--sage)',sky:'var(--sky)',honey:'var(--honey)',
  coral:'var(--coral)',lavender:'var(--lavender)',mint:'#5bd59b'
};
const COLOR_MUTED_MAP={
  sage:'var(--sage-muted)',sky:'var(--sky-muted)',honey:'var(--honey-muted)',
  coral:'var(--coral-muted)',lavender:'var(--lavender-muted)',mint:'rgba(91,213,155,.1)'
};
function getModColor(c){return COLOR_MAP[c]||'var(--sage)'}
function getModColorMuted(c){return COLOR_MUTED_MAP[c]||'var(--sage-muted)'}

// Dynamic accent theming per discipline
const DISC_ACCENT={
  economia:'sage',matematica:'sky',filosofia:'lavender',emocional:'honey',
  psicologia:'coral',portugues:'sage',ciencias:'mint',historia:'coral',
  history:'sky',financas:'honey',ingles:'sky',geografia:'mint',
  ia:'lavender',midia:'coral',direito:'sage',saude:'mint',artes:'honey',logica:'lavender'
};
function setDiscAccent(disc){
  const color=DISC_ACCENT[disc]||'sage';
  document.documentElement.style.setProperty('--accent-active',getModColor(color));
  document.documentElement.style.setProperty('--accent-active-muted',getModColorMuted(color));
  document.documentElement.classList.add('disc-themed');
}
function clearDiscAccent(){
  document.documentElement.classList.remove('disc-themed');
  document.documentElement.style.removeProperty('--accent-active');
  document.documentElement.style.removeProperty('--accent-active-muted');
}

// Get first module index of a discipline within M
function getDiscModules(disc){return M.map((m,i)=>({mod:m,idx:i})).filter(x=>x.mod.discipline===disc)}

// Build sidebar navigation dynamically from M — grouped accordion by discipline
function buildSidebar(){
  const nav=document.getElementById('modNav');
  if(!nav)return;
  let html='';
  const grouped={};const order=[];
  M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!grouped[disc]){grouped[disc]=[];order.push(disc)}
    grouped[disc].push({mod:m,idx:i});
  });
  order.forEach(disc=>{
    const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
    const mods=grouped[disc];
    const totalL=mods.reduce((s,x)=>s+x.mod.lessons.length,0);
    const doneL=mods.reduce((s,x)=>s+x.mod.lessons.filter((_,li)=>S.done[`${x.idx}-${li}`]).length,0);
    const pct=totalL?Math.round(doneL/totalL*100):0;
    const clr=getModColor(mods[0].mod.color||'sage');
    // Single-module discipline: show flat item (no accordion)
    if(mods.length===1){
      const x=mods[0],c=x.mod.color||'sage';
      html+=`<div class="ni" onclick="goMod(${x.idx})" id="nM${x.idx}" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goMod(${x.idx})"><div class="ni-icon" style="background:${getModColorMuted(c)};color:${getModColor(c)}">${d.icon}</div><div><div class="ni-txt">${d.label}</div><div class="ni-sub">${x.mod.lessons.length} aulas · ${pct}%</div><div class="ni-prog"><div class="ni-prog-bar" style="width:${pct}%;background:${clr}"></div></div></div></div>`;
    } else {
      // Multi-module: accordion
      html+=`<div class="disc-group" id="dg-${disc}"><div class="disc-group-head" onclick="toggleDiscGroup('${disc}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')toggleDiscGroup('${disc}')"><span style="font-size:.95rem">${d.icon}</span><span style="font-size:.8rem;font-weight:600">${d.label}</span><span class="disc-count">${mods.length}</span><div class="disc-prog"><div class="disc-prog-fill" style="width:${pct}%;background:${clr}"></div></div><span class="disc-arrow" id="dga-${disc}">▸</span></div><div class="disc-group-body" id="dgb-${disc}">`;
      mods.forEach(x=>{
        const c=x.mod.color||'sage';
        html+=`<div class="ni" onclick="goMod(${x.idx})" id="nM${x.idx}" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goMod(${x.idx})"><div class="ni-icon" style="background:${getModColorMuted(c)};color:${getModColor(c)}">${x.mod.icon}</div><div><div class="ni-txt">${x.mod.title}</div><div class="ni-sub">${x.mod.lessons.length} aulas</div></div></div>`;
      });
      html+=`</div></div>`;
    }
  });
  nav.innerHTML=html;
}
function toggleDiscGroup(disc){
  const g=document.getElementById('dg-'+disc);
  const a=document.getElementById('dga-'+disc);
  if(!g)return;
  g.classList.toggle('open');
  if(a)a.textContent=g.classList.contains('open')?'▾':'▸';
}

// ============================================================
// STATE
// ============================================================
const SK='escola_v2';
let S=load();
function def(){return{name:'Aluno',avatar:null,xp:0,lvl:1,streak:0,streakDays:[],last:null,done:{},quiz:{},cMod:null,cLes:null}}
function load(){try{const d=localStorage.getItem(SK);return d?{...def(),...JSON.parse(d)}:def()}catch(e){return def()}}
function save(){try{localStorage.setItem(SK,JSON.stringify(S))}catch(e){console.warn('[save] storage error:',e.message)}if(typeof queueSync==='function')queueSync('progress',S)}

// XP & XP EVENTS
function getXPMultiplier(){
  // Weekend boost (Saturday/Sunday)
  const day=new Date().getDay();
  if(day===0||day===6)return{mult:2,label:'🔥 Fim de Semana 2x XP!'};
  // Custom event (stored in localStorage)
  try{
    const ev=JSON.parse(localStorage.getItem('escola_xp_event')||'null');
    if(ev&&new Date(ev.end)>new Date())return{mult:ev.mult||2,label:ev.label||'⚡ Evento XP!'};
  }catch(e){}
  return{mult:1,label:null}
}
function addXP(n){
  if(S.lvl<1)S.lvl=1;
  const{mult,label}=getXPMultiplier();
  const earned=n*mult;
  S.xp+=earned;
  const oldLvl=S.lvl;
  while(S.xp>=S.lvl*100){S.xp-=S.lvl*100;S.lvl++;toast(`Nível ${S.lvl}!  🎉`);launchConfetti();playSfx('levelup');logActivity('level',`Subiu para nível ${S.lvl}!`)}
  save();ui();
  if(typeof updateLeaderboardXP==='function')updateLeaderboardXP(earned);
  if(typeof updateChallengeXP==='function')updateChallengeXP(earned);
  if(mult>1&&n>0)toast(`${label} +${earned} XP (${mult}x)`)
}
function totalXP(){let t=S.xp;for(let i=1;i<S.lvl;i++)t+=i*100;return t}
function toast(m,type){const t=document.getElementById('toast');t.textContent=m;t.className='toast show'+(type?' toast-'+type:'');setTimeout(()=>{t.classList.remove('show')},2500)}

// Streak
function streak(){
  const today=new Date().toDateString();
  const todayISO=new Date().toISOString().slice(0,10);
  if(S.last){const d=Math.floor((new Date(today)-new Date(S.last))/(864e5));if(d===1)S.streak++;else if(d>1)S.streak=1}
  else S.streak=1;
  if(!S.streakDays)S.streakDays=[];
  if(!S.streakDays.includes(todayISO)){S.streakDays.push(todayISO);if(S.streakDays.length>30)S.streakDays=S.streakDays.slice(-30)}
  S.last=today;save()
}

// UI
function ui(){
  const need=S.lvl*100;const li=getLevelInfo(S.lvl);
  const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  _s('uLvl',S.lvl);
  const xpPct=Math.round(S.xp/need*100);
  const xpBar=document.getElementById('xpBar');
  if(xpBar){xpBar.style.width=xpPct+'%';xpBar.setAttribute('role','progressbar');xpBar.setAttribute('aria-valuenow',S.xp);xpBar.setAttribute('aria-valuemin','0');xpBar.setAttribute('aria-valuemax',need);xpBar.setAttribute('aria-label',`Experiência: ${S.xp}/${need} XP (${xpPct}%)`);}
  _s('xpNow',S.xp);_s('xpMax',need);_s('sXP',totalXP());_s('sStreak',S.streak+'🔥');
  _s('wName',S.name);_s('pName',S.name);_s('avatarI',S.avatar||S.name[0]);
  // Dynamic welcome message based on progress
  var wmEl=document.getElementById('welcomeMsg');
  if(wmEl){
    var doneN=Object.keys(S.done).length;
    var totalN=M.reduce(function(s,m){return s+m.lessons.length},0);
    if(doneN===0) wmEl.textContent='Comece sua jornada! Escolha um módulo abaixo e mergulhe no aprendizado.';
    else if(doneN<5) wmEl.textContent='Ótimo começo! Continue explorando — cada aula desbloqueia novas conquistas.';
    else if(doneN<20) wmEl.textContent='Você está indo muito bem! Já completou '+doneN+' aulas de '+totalN+'. Continue assim!';
    else if(doneN<totalN) wmEl.textContent='Impressionante! '+doneN+' de '+totalN+' aulas concluídas. O caminho para mestre está cada vez mais perto!';
    else wmEl.textContent='Parabéns! Você completou todas as '+totalN+' aulas. Você é um verdadeiro mestre!';
  }
  // Level name badge
  const lvlEl=document.querySelector('.profile-lvl');
  if(lvlEl)lvlEl.innerHTML=`Nível ${S.lvl} · <span class="level-badge ${li.cls}">${li.emoji} ${li.name}</span>`;
  const done=Object.keys(S.done).length,total=M.reduce((s,m)=>s+m.lessons.length,0);
  document.getElementById('sLessons').textContent=done;
  const qt=Object.keys(S.quiz).length,qc=Object.values(S.quiz).filter(v=>v).length;
  document.getElementById('sQuiz').textContent=qt?Math.round(qc/qt*100)+'%':'0%';
  const sb=document.getElementById('streakB');
  sb.textContent=S.streak>0?`🔥 ${S.streak} dia${S.streak>1?'s':''} de sequência!`:'🔥 Comece sua sequência!';
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
        const wasActive=S.streakDays&&S.streakDays.includes(dayStr);
        calH+=`<div class="streak-day-col" style="display:flex;flex-direction:column;align-items:center;gap:.1rem"><div class="streak-day${wasActive?' active':''}${isToday?' today':''}">${wasActive?'✓':days[dt.getDay()]}</div><div class="streak-day-label">${dt.getDate()}</div></div>`;
      }
      cal.innerHTML=calH;
    }
  }catch(e){}
  // Sidebar module progress
  M.forEach((m,mi)=>{
    const el=_origById('nM'+mi);
    if(!el)return;
    const d=m.lessons.filter((_,li)=>S.done[`${mi}-${li}`]).length;
    const pct=Math.round(d/m.lessons.length*100);
    const clr=getModColor(m.color||'sage');
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
  renderCards();renderAch();renderLeaderboardWidget();renderXPEvent();
  if(typeof renderChallenges==='function')renderChallenges()
}
function renderXPEvent(){
  const{mult,label}=getXPMultiplier();
  let el=_origById('xpEventBanner');
  if(mult<=1){if(el)el.style.display='none';return}
  if(!el){
    el=document.createElement('div');el.id='xpEventBanner';el.className='xp-event-banner';
    const welcome=document.querySelector('.welcome');
    if(welcome)welcome.parentNode.insertBefore(el,welcome.nextSibling)
  }
  el.style.display='';
  el.innerHTML=`<span class="xp-event-icon">⚡</span><span class="xp-event-text">${label}</span><span class="xp-event-badge">${mult}x</span>`
}

function isModUnlocked(i){
  if(!M[i])return false;
  const disc=M[i].discipline||'economia';
  const discMods=M.map((m,idx)=>({m,idx})).filter(x=>(x.m.discipline||'economia')===disc);
  const posInDisc=discMods.findIndex(x=>x.idx===i);
  // First module of each discipline is always unlocked
  if(posInDisc<=0)return true;
  // Subsequent modules require completing the previous one in the same discipline
  const prevIdx=discMods[posInDisc-1].idx;
  return M[prevIdx].lessons.every((_,li)=>S.done[`${prevIdx}-${li}`])
}
function renderCards(){
  let html='';
  const seen=new Set();
  M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!seen.has(disc)){
      seen.add(disc);
      const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
      html+=`<div class="disc-header"><span class="disc-icon">${d.icon}</span><h2 class="disc-title">${d.label}</h2></div>`;
    }
    const done=m.lessons.filter((_,li)=>S.done[`${i}-${li}`]).length;
    const p=Math.round(done/m.lessons.length*100);
    const unlocked=isModUnlocked(i);
    const clr=getModColor(m.color||'sage');
    const clrMuted=getModColorMuted(m.color||'sage');
    const premium=typeof isModuleUnlocked==='function'&&currentUser&&!isModuleUnlocked(i);
    const clickAction=unlocked?(premium?`showModulePaywall(${i})`:`goMod(${i})`):'';
    const lockLabel=premium?'🔒 Premium':(!unlocked?'🔒 Bloqueado':'');
    const statusCls=p===100?'completed':p>0?'in-progress':'not-started';
    const statusTxt=p===100?'✓ Completo':p>0?`${done}/${m.lessons.length} aulas`:'Começar';
    html+=`<div class="mc${unlocked?'':' locked'}${premium?' premium':''}" ${clickAction?`onclick="${clickAction}"`:''}>`+
      `<div class="mc-circle"><div class="mc-ring" style="--ring-pct:${p};--ring-color:${clr}"></div><div class="mc-ring-inner"></div><span class="mc-circle-icon">${m.icon}</span></div>`+
      `<div class="mc-info"><h3>${m.title}</h3><p>${m.desc}</p><div class="mc-meta">${m.lessons.length} aulas · ${p}%${lockLabel?' · '+lockLabel:''}</div></div>`+
      `<div class="mc-status ${statusCls}">${statusTxt}</div></div>`;
  });
  document.getElementById('mcards').innerHTML=html
}

function renderAch(){
  const totalLessons=M.reduce((s,m)=>s+m.lessons.length,0);
  const totalQuizzes=totalLessons;
  const doneCount=Object.keys(S.done).length;
  const a=[
    {e:'🎯',n:'Primeira Aula',on:doneCount>=1},
    {e:'💡',n:'5 Aulas',on:doneCount>=5},
    {e:'📚',n:'10 Aulas',on:doneCount>=10},
    {e:'🌟',n:'25 Aulas',on:doneCount>=25},
    {e:'🏅',n:'50 Aulas',on:doneCount>=50}
  ];
  // Dynamic module achievements
  M.forEach((m,i)=>{
    a.push({e:m.icon,n:m.title,on:m.lessons.every((_,li)=>S.done[`${i}-${li}`])});
  });
  // Discipline completions
  Object.entries(DISCIPLINES).forEach(([key,d])=>{
    const mods=getDiscModules(key);
    if(mods.length===0)return;
    const allDone=mods.every(x=>x.mod.lessons.every((_,li)=>S.done[`${x.idx}-${li}`]));
    a.push({e:'🏆',n:d.label+' Completa',on:allDone});
  });
  a.push(
    {e:'🔥',n:'7 Dias Seguidos',on:S.streak>=7},
    {e:'💎',n:'100% Quiz',on:Object.keys(S.quiz).length>=totalQuizzes&&Object.values(S.quiz).every(v=>v)},
    {e:'👑',n:'Mestre Total',on:doneCount>=totalLessons}
  );
  const achUnlocked=a.filter(x=>x.on).length;
  document.getElementById('achs').innerHTML=a.map(x=>`<div class="ach ${x.on?'on':'off'}" onclick="goBadges()" style="cursor:pointer"><span class="ach-em">${x.e}</span><div class="ach-nm">${x.n}</div></div>`).join('')+(achUnlocked===0?'<div style="text-align:center;font-size:.75rem;color:var(--text-muted);margin-top:.5rem">Complete aulas para desbloquear conquistas!</div>':'')
}

// NAV
function goDash(){
  hideAllViews();clearDiscAccent();
  const vd=_origById('vDash');
  if(!vd)return;
  vd.style.display='block';vd.classList.add('view-enter');
  setTimeout(()=>vd.classList.remove('view-enter'),350);
  const fb=_origById('focusBtn');if(fb)fb.style.display='none';
  if(document.body.classList.contains('focus-mode'))toggleFocus();
  setNav('nDash');
  try{ui()}catch(e){console.warn('[goDash] ui:',e.message)}
  try{renderContinue()}catch(e){console.warn('[goDash] renderContinue:',e.message)}
  try{renderQuote()}catch(e){console.warn('[goDash] renderQuote:',e.message)}
  try{renderProgressChart()}catch(e){console.warn('[goDash] renderProgressChart:',e.message)}
  try{renderDaily()}catch(e){console.warn('[goDash] renderDaily:',e.message)}
  try{renderMissions()}catch(e){console.warn('[goDash] renderMissions:',e.message)}
  try{renderFavs()}catch(e){console.warn('[goDash] renderFavs:',e.message)}
  try{renderProfileSwitch()}catch(e){console.warn('[goDash] renderProfileSwitch:',e.message)}
  try{updateGlobalProgress()}catch(e){console.warn('[goDash] updateGlobalProgress:',e.message)}
  try{renderWeeklySummary()}catch(e){console.warn('[goDash] renderWeeklySummary:',e.message)}
  try{renderDailyGoal()}catch(e){console.warn('[goDash] renderDailyGoal:',e.message)}
  // Hide empty sections for new users
  try{
    const doneCount=Object.keys(S.done).length;
    const pc=document.getElementById('progressChart');if(pc)pc.style.display=doneCount>0?'':'none';
    const fv=document.getElementById('favSection');if(fv&&!fv.innerHTML.trim())fv.style.display='none';
  }catch(e){}
}
function goMod(i){
  if(!M[i])return;
  try{history.pushState({view:'mod',mod:i},'')}catch(e){}
  S.cMod=i;const m=M[i];
  setDiscAccent(m.discipline||'economia');
  document.getElementById('mvT').textContent=m.icon+' '+m.title;
  document.getElementById('mvS').textContent=m.desc;
  const allDone=m.lessons.every((_,li)=>S.done[`${i}-${li}`]);
  // Reading time needs content — estimate from XP if not loaded yet
  document.getElementById('lsnList').innerHTML=m.lessons.map((l,li)=>{
    const k=`${i}-${li}`,d=S.done[k],cur=!d&&(li===0||S.done[`${i}-${li-1}`]),lock=!d&&!cur;
    const readMin=l.content?calcReadTime(l.content):Math.max(2,Math.round(l.xp/8));
    return`<div class="lsn ${d?'done':cur?'cur':lock?'locked':''}" ${lock?'':`onclick="openL(${i},${li})"`}>`+
      `<div class="lsn-n">${d?'✓':lock?'🔒':li+1}</div><div class="lsn-info"><h4>${l.title}</h4><p>${l.sub}</p></div><div class="lsn-meta"><div class="reading-time">⏱ ~${readMin} min</div><div class="lsn-xp">+${l.xp} XP</div></div></div>`
  }).join('')+(allDone?`<div style="text-align:center;margin-top:1.25rem"><button class="btn btn-sage" onclick="showCert(${i})">🏅 Ver Certificado</button></div>`:'');
  hideAllViews();
  const vm=document.getElementById('vMod');vm.classList.add('on','view-enter');
  setTimeout(()=>vm.classList.remove('view-enter'),350);
  setNav('nM'+i);
  // Preload full module content in background for when user opens a lesson
  if(!M[i]._loaded)loadFullModule(i);
}
async function openL(mi,li){
  if(!M[mi]||!M[mi].lessons[li])return;
  // Ensure full module content is loaded before rendering lesson
  if(!M[mi]._loaded){
    const ok=await loadFullModule(mi);
    if(!ok){toast('Erro ao carregar aula. Tente novamente.','error');return}
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
  hideAllViews();
  const vl=document.getElementById('vLes');vl.classList.add('on','view-enter');
  setTimeout(()=>vl.classList.remove('view-enter'),350);
  document.getElementById('focusBtn').style.display='flex';
  document.getElementById('readTime').textContent=`⏱ ~${calcReadTime(l.content)} min`;
  loadNoteForLesson();
  updateFavBtn();
  window.scrollTo(0,0)
}
function ans(mi,li,a){
  if(!M[mi]||!M[mi].lessons[li]||!M[mi].lessons[li].quiz)return;
  const l=M[mi].lessons[li],ok=a===l.quiz.c,qk=`${mi}-${li}`;
  if(S.quiz[qk]!==undefined)return;
  S.quiz[qk]=ok;
  document.querySelectorAll('.qz-o').forEach((b,i)=>{b.classList.add('off');if(i===l.quiz.c){b.classList.add('ok');b.classList.add('quiz-pulse')}if(i===a&&!ok){b.classList.add('no');b.classList.add('quiz-shake')}});
  const fb=document.getElementById('qfb');fb.className='qz-fb show '+(ok?'fb-ok':'fb-no');fb.textContent=(ok?'✓ ':'✗ ')+l.quiz.exp;
  if(ok){addXP(15);toast('+15 XP');playSfx('success');logActivity('quiz',`Quiz: ${M[mi].lessons[li].title} — Acertou!`)}
  else{playSfx('error');logActivity('quiz',`Quiz: ${M[mi].lessons[li].title} — Errou`)}
  const lk=`${mi}-${li}`;
  if(!S.done[lk]){S.done[lk]=true;addXP(l.xp);toast(`+${l.xp} XP — Aula Concluída`);logActivity('lesson',`Aula: ${M[mi].lessons[li].title}`)}
  save();
  // Show AI Practice button after answering
  const qzEl=document.querySelector('.qz');
  if(qzEl&&!qzEl.querySelector('.ai-practice-btn')){
    const btn=document.createElement('button');
    btn.className='btn btn-ghost ai-practice-btn';
    btn.innerHTML='🤖 Praticar mais com IA';
    btn.onclick=()=>startAIQuiz(mi,li);
    qzEl.appendChild(btn)
  }
}
function nextL(){
  const mi=S.cMod,li=S.cLes;
  if(mi===null||mi===undefined||!M[mi]||!M[mi].lessons[li])return;
  const lk=`${mi}-${li}`;
  if(!S.done[lk]){S.done[lk]=true;addXP(M[mi].lessons[li].xp);toast(`+${M[mi].lessons[li].xp} XP`);save();checkSaveModal();
    if(typeof gtag==='function')gtag('event','lesson_complete',{module:M[mi].title,lesson:M[mi].lessons[li].title,total_done:Object.keys(S.done).length})}
  if(li<M[mi].lessons.length-1)openL(mi,li+1);else{
    const justCompleted=M[mi].lessons.every((_,i)=>S.done[`${mi}-${i}`]);
    goMod(mi);
    if(justCompleted){toast('🏆 Módulo Concluído!');launchConfetti();playSfx('complete');logActivity('module',`Módulo concluído: ${M[mi].title}`);setTimeout(()=>showCert(mi),600);checkDiscCompletion(mi)}
    else toast('🏆 Módulo Concluído!')
  }
}
function prevL(){if(S.cMod!==null&&M[S.cMod]&&S.cLes>0)openL(S.cMod,S.cLes-1)}
function goBackMod(){if(S.cMod!==null&&M[S.cMod])goMod(S.cMod)}
function setNav(id){document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));const e=document.getElementById(id);if(e)e.classList.add('active')}
function resetAll(){if(confirm('Resetar todo progresso?')){localStorage.removeItem(SK);S=def();save();goDash()}}

// ============================================================
// THEME
// ============================================================
const THEME_KEY='escola_theme';
function initTheme(){
  let saved=localStorage.getItem(THEME_KEY);
  if(!saved){
    saved=window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';
    localStorage.setItem(THEME_KEY,saved)
  }
  document.documentElement.setAttribute('data-theme',saved);
  updateThemeUI(saved)
}
// Listen for system theme changes when no manual override
window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').addEventListener('change',e=>{
  if(!localStorage.getItem(THEME_KEY+'_manual')){
    const t=e.matches?'light':'dark';
    localStorage.setItem(THEME_KEY,t);
    document.documentElement.setAttribute('data-theme',t);
    updateThemeUI(t)
  }
});
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||'dark';
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem(THEME_KEY,next);
  localStorage.setItem(THEME_KEY+'_manual','1');
  updateThemeUI(next);
  document.querySelector('meta[name="theme-color"]').setAttribute('content',next==='dark'?'#0f1729':'#f5f3ef')
}
function updateThemeUI(t){
  document.getElementById('themeLabel').textContent=t==='dark'?'Modo Claro':'Modo Escuro';
  document.getElementById('themeSub').textContent=t==='dark'?'Ativar tema claro':'Ativar tema escuro'
}
initTheme();

// ============================================================
// LEVEL NAMES
// ============================================================
const LEVEL_NAMES=[
  {min:1,name:'Aprendiz',emoji:'📘',cls:'lvl-aprendiz'},
  {min:3,name:'Estudante',emoji:'📗',cls:'lvl-estudante'},
  {min:6,name:'Explorador',emoji:'🔭',cls:'lvl-explorador'},
  {min:10,name:'Pensador',emoji:'🧠',cls:'lvl-pensador'},
  {min:15,name:'Acadêmico',emoji:'🎓',cls:'lvl-academico'},
  {min:20,name:'Mestre',emoji:'👑',cls:'lvl-mestre'},
  {min:30,name:'Sábio',emoji:'🌟',cls:'lvl-sabio'}
];
function getLevelInfo(lvl){
  let info=LEVEL_NAMES[0];
  for(const l of LEVEL_NAMES)if(lvl>=l.min)info=l;
  return info
}

// ============================================================
// GLOSSARY DATA
// ============================================================
const GLOSSARY=[
  {term:'Escambo',def:'Troca direta de bens sem uso de dinheiro. Problema principal: dupla coincidência de desejos.',mod:0,les:0},
  {term:'Dupla Coincidência de Desejos',def:'Necessidade de encontrar alguém que queira o que você tem e tenha o que você precisa, ao mesmo tempo.',mod:0,les:0},
  {term:'Ordem Espontânea',def:'Sistemas complexos que surgem da ação livre de indivíduos, sem planejamento central.',mod:0,les:1},
  {term:'Teoria Subjetiva do Valor',def:'O valor de um bem está na mente de quem avalia, não no objeto em si.',mod:0,les:2},
  {term:'Inflação',def:'Aumento generalizado dos preços causado por excesso de dinheiro na economia.',mod:0,les:3},
  {term:'Reserva Fracionária',def:'Sistema bancário onde apenas uma fração dos depósitos é mantida como reserva.',mod:0,les:4},
  {term:'Poupança',def:'Adiar consumo presente para acumular capital para o futuro. Base de todo investimento.',mod:0,les:5},
  {term:'Lei da Oferta e Demanda',def:'Preços sobem quando demanda supera oferta e caem quando oferta supera demanda.',mod:1,les:0},
  {term:'Monopólio',def:'Mercado com um único fornecedor, sem concorrência. Prejudica o consumidor.',mod:1,les:2},
  {term:'Curva de Laffer',def:'Teoria que mostra que aumentar impostos além de certo ponto diminui a arrecadação.',mod:1,les:4},
  {term:'Vantagem Comparativa',def:'Princípio de Ricardo: cada país deve produzir o que faz com mais eficiência relativa.',mod:1,les:6},
  {term:'Lucro',def:'Recompensa por satisfazer necessidades do consumidor melhor que os concorrentes.',mod:2,les:1},
  {term:'Destruição Criativa',def:'Processo pelo qual novas inovações substituem tecnologias e empresas obsoletas (Schumpeter).',mod:2,les:3},
  {term:'Empreendedor',def:'Agente central que identifica oportunidades, assume riscos e inova no mercado.',mod:2,les:0},
  {term:'Juros Compostos',def:'Juros calculados sobre o principal mais juros acumulados. "8ª maravilha do mundo."',mod:3,les:2},
  {term:'Orçamento',def:'Plano financeiro que organiza receitas e despesas. Ferramenta essencial de controle.',mod:3,les:0},
  {term:'Renda Fixa',def:'Investimentos com retorno previsível: Tesouro Direto, CDB, LCI. Menor risco.',mod:3,les:5},
  {term:'Renda Variável',def:'Investimentos sem retorno garantido: ações, FIIs. Maior potencial mas mais risco.',mod:3,les:5},
  {term:'Revolução Industrial',def:'Transformação econômica do séc. XVIII que multiplicou a produtividade humana.',mod:4,les:0},
  {term:'Crise de 1929',def:'Colapso financeiro causado por crédito artificial. Escola Austríaca previu o crash.',mod:4,les:2},
  {term:'Socialismo',def:'Sistema de planejamento central que falha por impossibilidade do cálculo econômico (Mises).',mod:4,les:4},
  {term:'Capitalismo',def:'Sistema baseado em propriedade privada, livre comércio e estado limitado.',mod:4,les:5},
  {term:'Falácia da Janela Quebrada',def:'Erro de pensar que destruição gera riqueza. Bastiat: analisar "o que não se vê".',mod:5,les:1},
  {term:'Praxeologia',def:'Ciência da ação humana de Mises. Fundamenta a economia na lógica da ação individual.',mod:5,les:3},
  {term:'Escola Austríaca',def:'Corrente econômica que defende mercado livre, propriedade privada e mínima intervenção.',mod:5,les:0},
  {term:'Custo de Oportunidade',def:'O valor da melhor alternativa sacrificada ao fazer uma escolha.',mod:1,les:1},
  {term:'Livre Comércio',def:'Troca internacional sem barreiras (tarifas, cotas). Beneficia todas as partes.',mod:1,les:6},
  {term:'Padrão-Ouro',def:'Sistema monetário onde a moeda é lastreada em ouro. Limita expansão monetária.',mod:0,les:7},
];

// ============================================================
// SEARCH
// ============================================================
let searchTimeout;
function doSearch(q){
  clearTimeout(searchTimeout);
  const box=document.getElementById('searchResults');
  if(!q||q.length<2){box.innerHTML='';return}
  searchTimeout=setTimeout(()=>{
    const norm=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const results=[];
    M.forEach((mod,mi)=>{
      mod.lessons.forEach((les,li)=>{
        const plain=les.content?(les.content.replace(/<[^>]*>/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')):'';
        const titleN=(les.title+' '+les.sub).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const idx=plain?plain.indexOf(norm):-1;const tIdx=titleN.indexOf(norm);
        if(idx>=0||tIdx>=0){
          let snippet='';
          const safeNorm=norm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          if(idx>=0){const start=Math.max(0,idx-30),end=Math.min(plain.length,idx+norm.length+40);
            snippet=(start>0?'...':'')+plain.slice(start,end).replace(new RegExp(safeNorm,'gi'),m=>`<mark>${m}</mark>`)+(end<plain.length?'...':'');}
          results.push({mi,li,mod:mod.title,title:les.title,snippet,score:tIdx>=0?2:1})
        }
      })
    });
    results.sort((a,b)=>b.score-a.score);
    box.innerHTML=results.slice(0,6).map(r=>`<div class="sr-item" onclick="document.getElementById('searchBox').value='';document.getElementById('searchResults').innerHTML='';openL(${r.mi},${r.li})"><div><div class="sr-title">${r.title}</div>${r.snippet?`<div class="sr-snippet">${r.snippet}</div>`:''}</div><div class="sr-mod">${r.mod}</div></div>`).join('')||`<div style="padding:.6rem;font-size:.82rem;color:var(--text-muted)">Nenhum resultado encontrado.</div>`
  },250)
}

// ============================================================
// NOTES
// ============================================================
const NOTES_KEY='escola_notes';
function loadNotes(){try{return JSON.parse(localStorage.getItem(NOTES_KEY))||{}}catch(e){return{}}}
function saveNotes(all){try{localStorage.setItem(NOTES_KEY,JSON.stringify(all))}catch(e){console.warn('[saveNotes] storage error:',e.message)}if(typeof queueSync==='function')queueSync('notes',all)}
let noteTimer;
function saveNote(){
  clearTimeout(noteTimer);
  noteTimer=setTimeout(()=>{
    const k=`${S.cMod}-${S.cLes}`,all=loadNotes();
    const txt=document.getElementById('notesTxt').value;
    if(txt.trim())all[k]=txt;else delete all[k];
    saveNotes(all);
    const saved=document.getElementById('notesSaved');saved.classList.add('show');
    setTimeout(()=>saved.classList.remove('show'),2000);
    updateNoteCount()
  },500)
}
function loadNoteForLesson(){
  const k=`${S.cMod}-${S.cLes}`,all=loadNotes();
  document.getElementById('notesTxt').value=all[k]||'';
  document.getElementById('notesToggle').classList.remove('open');
  document.getElementById('notesArea').classList.remove('open');
  if(all[k]){document.getElementById('notesToggle').classList.add('open');document.getElementById('notesArea').classList.add('open')}
  updateNoteCount()
}
function toggleNotes(){
  const tog=document.getElementById('notesToggle'),area=document.getElementById('notesArea');
  tog.classList.toggle('open');area.classList.toggle('open');
  const isOpen=area.classList.contains('open');
  tog.setAttribute('aria-expanded',isOpen);
  if(isOpen)document.getElementById('notesTxt').focus()
}
function updateNoteCount(){
  const all=loadNotes(),count=Object.keys(all).length;
  document.getElementById('notesCount').textContent=count?`(${count} anotação${count>1?'ões':''})`:''
}

// ============================================================
// CHAT TUTOR
// ============================================================
let chatOpen=false;
const chatKB=[
  // Módulo 1 — Dinheiro
  {k:['escambo','troca','troca direta','barter'],r:'O <strong>escambo</strong> é a troca direta de bens sem dinheiro. O maior problema é a "dupla coincidência de desejos": você precisa encontrar alguém que queira exatamente o que você tem e tenha o que você precisa. Por isso o dinheiro surgiu naturalmente no mercado.'},
  {k:['moeda','ouro','prata','dinheiro surgiu','surgimento'],r:'Ouro e prata se tornaram dinheiro porque possuem as 5 propriedades: <strong>durabilidade, divisibilidade, portabilidade, escassez e aceitação</strong>. Ninguém decretou isso — foi uma ordem espontânea do mercado livre.'},
  {k:['valor subjetivo','teoria do valor','valor de um bem'],r:'A <strong>teoria subjetiva do valor</strong> de Carl Menger diz que o valor não está no objeto, mas na mente de quem avalia. Um copo d\'água vale mais no deserto do que em casa. O preço reflete a utilidade percebida pelo consumidor.'},
  {k:['inflação','imprimir dinheiro','impressão','preço sobe'],r:'<strong>Inflação</strong> ocorre quando há mais dinheiro circulando sem aumento correspondente de bens. Quando o governo "imprime" dinheiro, cada unidade perde poder de compra. É como diluir suco com água — cada copo tem menos sabor.'},
  {k:['banco central','reserva fracionária','banco','depósito'],r:'Bancos operam com <strong>reserva fracionária</strong>: emprestam parte dos depósitos. Se todos sacarem ao mesmo tempo (corrida bancária), o banco não tem o dinheiro. O Banco Central controla a política monetária: taxa de juros e quantidade de dinheiro na economia.'},
  {k:['poupança','poupar','guardar dinheiro','investir vs poupar'],r:'<strong>Poupar</strong> é adiar o consumo presente para ter mais no futuro. É a base de todo investimento e progresso econômico. Sem poupança prévia, não há capital para empreender. Como diz Bastiat: poupança é a fonte da prosperidade.'},
  // Módulo 2 — Oferta e Demanda
  {k:['oferta','demanda','preço','mercado'],r:'A <strong>lei da oferta e demanda</strong> é o coração da economia: quando a demanda sobe e a oferta se mantém, o preço sobe. Quando a oferta aumenta e a demanda não, o preço cai. Preços são sinais que coordenam milhões de decisões individuais.'},
  {k:['monopólio','concorrência','competição'],r:'<strong>Monopólios</strong> prejudicam o consumidor porque sem concorrência não há incentivo para melhorar qualidade ou baixar preços. A concorrência livre é o mecanismo mais eficiente para beneficiar o consumidor.'},
  {k:['imposto','taxa','tributo','carga tributária'],r:'Impostos são o preço que pagamos por serviços públicos, mas em excesso, distorcem o mercado. Quanto maior a <strong>carga tributária</strong>, menor o incentivo para produzir e empreender. A Curva de Laffer mostra que acima de certo ponto, aumentar impostos diminui a arrecadação.'},
  {k:['comércio internacional','importação','exportação','livre comércio'],r:'O <strong>livre comércio</strong> beneficia todas as partes envolvidas. David Ricardo demonstrou com a lei das vantagens comparativas: cada país deve produzir aquilo em que é mais eficiente e trocar o resto. Protecionismo encarece produtos e prejudica o consumidor.'},
  // Módulo 3 — Empreendedorismo
  {k:['empreendedorismo','empreender','empresa','negócio','startup'],r:'<strong>Empreender</strong> é identificar uma necessidade e criar uma solução que gere valor. O empreendedor assume riscos, inova e move a economia. Para a escola austríaca, o empreendedor é o agente central do progresso econômico.'},
  {k:['lucro','prejuízo','lucro e prejuízo'],r:'<strong>Lucro</strong> é a recompensa por satisfazer necessidades do consumidor melhor que os concorrentes. Prejuízo é o sinal de que recursos estão sendo mal alocados. O sistema de lucros e prejuízos é o GPS da economia — direciona recursos para onde são mais necessários.'},
  {k:['inovação','destruição criativa','schumpeter'],r:'<strong>Destruição criativa</strong> (Schumpeter): novas empresas e tecnologias substituem as antigas. O streaming substituiu as locadoras, o smartphone substituiu câmeras, GPS e MP3 players. É doloroso no curto prazo, mas gera progresso no longo prazo.'},
  // Módulo 4 — Finanças Pessoais
  {k:['orçamento','gastos','receita','controle financeiro'],r:'O <strong>orçamento pessoal</strong> é o mapa do seu dinheiro. Regra básica: receitas > despesas, sempre. Categorize seus gastos em fixos (aluguel, luz) e variáveis (lazer, alimentação). Comece cortando gastos variáveis desnecessários.'},
  {k:['juros compostos','compound interest','juros sobre juros'],r:'<strong>Juros compostos</strong> são a 8ª maravilha do mundo (frase atribuída a Einstein). É juros sobre juros — R$1.000 a 10% ao ano vira R$2.594 em 10 anos. Quanto antes começar, maior o efeito. Tempo é o ingrediente secreto.'},
  {k:['dívida','endividamento','cartão de crédito','empréstimo'],r:'<strong>Dívida</strong> é ferramenta, não vilã — depende do uso. Dívida para consumo (cartão de crédito) destrói patrimônio. Dívida para investimento produtivo (comprar máquina que gera receita) pode ser inteligente. Regra: nunca gaste mais do que ganha.'},
  {k:['investimento','renda fixa','ação','bolsa','tesouro'],r:'Investir é colocar dinheiro para trabalhar por você. <strong>Renda fixa</strong> (Tesouro, CDB) = menor risco, retorno previsível. <strong>Renda variável</strong> (ações, FIIs) = maior risco, maior potencial de retorno. Diversifique sempre.'},
  // Módulo 5 — História Econômica
  {k:['revolução industrial','industrialização','fábrica'],r:'A <strong>Revolução Industrial</strong> (séc. XVIII) multiplicou a produtividade humana. Pela primeira vez, as massas tiveram acesso a bens antes reservados à elite. Foi a maior redução de pobreza da história — impulsionada por propriedade privada e liberdade econômica.'},
  {k:['crise 1929','grande depressão','crash','wall street'],r:'A <strong>Crise de 1929</strong> não foi falha do mercado livre. A escola austríaca (Mises, Hayek) previu o crash: crédito artificialmente barato criou uma bolha que estourou. A intervenção governamental do New Deal prolongou a depressão ao invés de resolvê-la.'},
  {k:['socialismo','comunismo','planificação','planejamento central'],r:'O <strong>socialismo</strong> falha porque sem preços livres, não há como calcular eficientemente como alocar recursos. Este é o "problema do cálculo econômico" de Mises. A URSS, Cuba e Venezuela são exemplos reais do fracasso do planejamento central.'},
  {k:['capitalismo','livre mercado','liberalismo econômico'],r:'O <strong>capitalismo de livre mercado</strong> é o sistema que mais reduziu pobreza na história. Propriedade privada + liberdade de troca + estado limitado = prosperidade. Não é perfeito, mas todos os sistemas alternativos produziram resultados piores.'},
  // Módulo 6 — Pensamento Crítico
  {k:['falácia','argumento','lógica','pensamento crítico'],r:'<strong>Pensamento crítico</strong> é a habilidade de analisar argumentos sem se deixar levar por emoções. Falácias comuns: apelo à autoridade, espantalho, falso dilema, ad hominem. Sempre pergunte: "Quais são as evidências?" e "Quem se beneficia?"'},
  {k:['bastiat','o que se vê','janela quebrada'],r:'A <strong>falácia da janela quebrada</strong> (Bastiat): destruição não gera riqueza. O dinheiro gasto consertando a janela deixa de ser gasto em algo novo. O bom economista analisa não só "o que se vê", mas também "o que não se vê" — os custos de oportunidade.'},
  {k:['estado','governo','intervenção','regulação'],r:'Para a escola austríaca, o <strong>papel do Estado</strong> deve ser mínimo: proteger propriedade privada, garantir contratos e segurança. Cada regulação adicional cria distorções, custos ocultos e incentivos perversos. Menos estado = mais liberdade e prosperidade.'},
  {k:['mises','ludwig von mises','ação humana','praxeologia'],r:'<strong>Ludwig von Mises</strong> é um dos maiores economistas da história. Sua obra "A Ação Humana" fundamenta a economia na lógica da ação individual. Ele demonstrou que o socialismo é impossível e que a liberdade econômica é a base da civilização.'},
  {k:['hayek','friedrich hayek','conhecimento disperso','caminho da servidão'],r:'<strong>Friedrich Hayek</strong> mostrou que nenhum planejador central pode ter todo o conhecimento necessário para coordenar a economia. O preço livre faz isso naturalmente. Sua obra "O Caminho da Servidão" é um alerta contra o totalitarismo.'},
  // Perguntas gerais
  {k:['escola austríaca','austríaca','austríacos'],r:'A <strong>Escola Austríaca de Economia</strong> defende mercado livre, propriedade privada, padrão-ouro e mínima intervenção estatal. Principais pensadores: Carl Menger, Ludwig von Mises, Friedrich Hayek, Murray Rothbard. É a base teórica deste curso.'},
  {k:['como funciona','sobre o curso','módulos','aulas','how it works','about'],r:'O curso tem <strong>14 módulos com 10 aulas cada</strong> (140 aulas total) em 9 disciplinas: Economia (6 módulos), Matemática, Filosofia, Inteligência Emocional, Psicologia do Crescimento, Português e Redação, Ciências da Natureza, História do Brasil e American History (EN). Cada aula tem conteúdo + quiz. Complete para ganhar XP e subir de nível! | The course has <strong>14 modules with 10 lessons each</strong> (140 lessons total) across 9 subjects, including American History in English.'},
  {k:['xp','nível','pontos','gamificação'],r:'Você ganha <strong>XP</strong> ao completar aulas (25-30 XP) e acertar quizzes (+15 XP). A cada nível, precisa de mais XP (nível × 100). Mantenha uma sequência diária para desbloquear conquistas especiais!'},
];

function toggleChat(){
  chatOpen=!chatOpen;
  const fab=document.getElementById('chatFab');
  document.getElementById('chatPanel').classList.toggle('open',chatOpen);
  fab.classList.toggle('open',chatOpen);
  fab.setAttribute('aria-expanded',chatOpen);
  fab.innerHTML=chatOpen?'✕':'💬<span class="chat-badge" id="chatBadge" aria-label="1 mensagem não lida">1</span>';
  if(chatOpen&&document.getElementById('chatBody').children.length===0)initChat();
  if(chatOpen)document.getElementById('chatIn').focus();
}

function initChat(){
  addBotMsg('Olá! 👋 Sou o <strong>Tutor IA</strong> da escola liberal. Pergunte qualquer coisa sobre as aulas — uso inteligência artificial para responder! 🤖');
  showSuggestions();
}

function addBotMsg(html){
  const d=document.createElement('div');d.className='chat-msg bot';d.innerHTML=html;
  document.getElementById('chatBody').appendChild(d);scrollChat()
}
function addUserMsg(txt){
  const d=document.createElement('div');d.className='chat-msg user';d.textContent=txt;
  document.getElementById('chatBody').appendChild(d);scrollChat()
}
function scrollChat(){const b=document.getElementById('chatBody');b.scrollTop=b.scrollHeight}

function showSuggestions(){
  const context=getContextSugs();
  document.getElementById('chatSugs').innerHTML=context.map(s=>`<button class="chat-sug" onclick="askSug('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('')
}

function getContextSugs(){
  if(S.cMod!==null&&S.cMod!==undefined){
    const modSugs=[
      ['O que é escambo?','Como surgiu a moeda?','O que é inflação?'],
      ['O que é oferta e demanda?','O que são monopólios?','Como funciona o comércio internacional?'],
      ['Como empreender?','O que é lucro?','O que é destruição criativa?'],
      ['Como fazer orçamento?','O que são juros compostos?','Dívida é ruim?'],
      ['O que foi a Revolução Industrial?','O que causou a crise de 1929?','Socialismo funciona?'],
      ['O que são falácias?','Quem foi Bastiat?','Qual o papel do Estado?'],
      ['O que é valor posicional?','Como funciona multiplicação visual?','O que são frações equivalentes?'],
      ['O que é filosofia?','Quem foi Sócrates?','O que é a Alegoria da Caverna?'],
      ['O que são emoções?','Como lidar com ansiedade?','O que é empatia?'],
      ['O que é neuroplasticidade?','Mindset fixo vs crescimento?','O que são metas SMART?'],
      ['O que são classes de palavras?','Como fazer uma redação nota 1000?','O que são figuras de linguagem?'],
      ['O que é o método científico?','Como funcionam os átomos?','O que é uma cadeia alimentar?'],
      ['Como o Brasil foi descoberto?','O que foi o Plano Real?','Quem foi Visconde de Mauá?'],
      ['What was the American Revolution?','Who wrote the Constitution?','What caused the Great Depression?']
    ];
    return modSugs[S.cMod]||modSugs[0];
  }
  return['O que é inflação?','Como empreender?','Escola Austríaca','Juros compostos'];
}

function askSug(q){
  document.getElementById('chatIn').value=q;sendChat()
}

async function sendChat(){
  const inp=document.getElementById('chatIn'),txt=inp.value.trim();
  if(!txt)return;
  addUserMsg(txt);inp.value='';
  document.getElementById('chatSugs').innerHTML='';
  // Typing indicator
  const typing=document.createElement('div');typing.className='chat-msg bot typing';typing.id='typing';typing.textContent='Pensando...';
  document.getElementById('chatBody').appendChild(typing);scrollChat();

  // Try AI tutor first, fallback to local KB if offline or no API
  let answer;
  try{
    answer=await askAITutor(txt);
  }catch(e){
    console.warn('[Chat] AI tutor failed, using local KB:',e.message);
    answer=findAnswer(txt);
  }

  const el=document.getElementById('typing');if(el)el.remove();
  addBotMsg(answer);
  showSuggestions();
}

async function askAITutor(message){
  // Build context from current lesson
  const moduleTitle=S.cMod!==null&&M[S.cMod]?M[S.cMod].title:null;
  const lessonTitle=S.cLes!==null&&S.cMod!==null&&M[S.cMod]&&M[S.cMod].lessons[S.cLes]?M[S.cMod].lessons[S.cLes].title:null;
  const lessonContent=S.cLes!==null&&S.cMod!==null&&M[S.cMod]&&M[S.cMod].lessons[S.cLes]&&M[S.cMod].lessons[S.cLes].content?M[S.cMod].lessons[S.cLes].content.replace(/<[^>]*>/g,' ').substring(0,1500):null;

  const body={
    message,
    moduleTitle,
    lessonTitle,
    lessonContext:lessonContent,
    ageGroup:S.ageGroup||'17+',
    lang:typeof CURRENT_LANG!=='undefined'?CURRENT_LANG:'pt'
  };

  // Get auth token if available
  const headers={'Content-Type':'application/json'};
  if(typeof sbClient!=='undefined'&&sbClient){
    try{
      const{data}=await sbClient.auth.getSession();
      if(data.session)headers['Authorization']='Bearer '+data.session.access_token;
    }catch(e){}
  }

  const SUPABASE_URL=typeof window.SUPABASE_URL!=='undefined'?window.SUPABASE_URL:'https://hwjplecfqsckfiwxiedo.supabase.co';
  const r=await fetch(SUPABASE_URL+'/functions/v1/ai-tutor',{method:'POST',headers,body:JSON.stringify(body)});

  if(!r.ok){
    const err=await r.json().catch(()=>({}));
    if(err.error==='rate_limit')return err.message;
    throw new Error(err.error||'API error '+r.status);
  }

  const data=await r.json();
  let reply=data.reply||'Desculpe, não consegui responder.';
  if(data.remaining!==undefined&&data.remaining<=3){
    reply+=`<div style="font-size:.7rem;color:var(--text-muted);margin-top:.5rem">💬 ${data.remaining} mensagem${data.remaining!==1?'s':''} restante${data.remaining!==1?'s':''} hoje</div>`;
  }
  return reply;
}

function findAnswer(q){
  const words=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/);
  let best=null,bestScore=0;
  for(const entry of chatKB){
    let score=0;
    for(const kw of entry.k){
      const kwNorm=kw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(words.some(w=>kwNorm.includes(w)||w.includes(kwNorm)))score+=2;
      if(q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(kwNorm))score+=3;
    }
    if(score>bestScore){bestScore=score;best=entry}
  }
  if(best&&bestScore>=2)return best.r;
  // Fallback: search lesson content for keywords
  const contextHint=(S.cMod!==null&&M[S.cMod])?` Você está no módulo <strong>"${M[S.cMod].title}"</strong> — sugiro explorar as aulas para encontrar a resposta!`:'';
  return 'Boa pergunta! Ainda não tenho uma resposta específica para isso no meu banco de conhecimento.'+contextHint+' Tente reformular ou pergunte sobre: inflação, oferta e demanda, empreendedorismo, juros compostos, escola austríaca, ou qualquer tema das aulas. 📚';
}

// ============================================================
// GLOSSARY
// ============================================================
function goGlossary(){
  hideAllViews();document.getElementById('vGloss').classList.add('on');setNav('nGloss');
  renderGlossary(GLOSSARY)
}
function renderGlossary(items){
  document.getElementById('glossList').innerHTML=items.filter(g=>M[g.mod]).map(g=>
    `<div class="gl-item" onclick="openL(${g.mod},${g.les})"><div><div class="gl-term">${g.term}</div><div class="gl-def">${g.def}</div><div class="gl-mod">${M[g.mod].icon} ${M[g.mod].title} · Aula ${g.les+1}</div></div></div>`
  ).join('')
}
function filterGlossary(q){
  if(!q){renderGlossary(GLOSSARY);return}
  const n=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  renderGlossary(GLOSSARY.filter(g=>(g.term+' '+g.def).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(n)))
}

// ============================================================
// FLASHCARDS
// ============================================================
let flashMod=0,flashIdx=0,flashItems=[];
function goFlashcards(){
  hideAllViews();document.getElementById('vFlash').classList.add('on');setNav('nFlash');
  document.getElementById('flashTabs').innerHTML=M.map((m,i)=>
    `<button class="xview-tab${i===flashMod?' active':''}" onclick="setFlashMod(${i})">${m.icon} ${m.title}</button>`
  ).join('');
  setFlashMod(flashMod)
}
function setFlashMod(i){
  flashMod=i;flashIdx=0;
  flashItems=GLOSSARY.filter(g=>g.mod===i);
  if(!flashItems.length)flashItems=[{term:'Sem termos',def:'Nenhum flashcard para este módulo.',mod:i,les:0}];
  document.querySelectorAll('#flashTabs .xview-tab').forEach((t,ti)=>t.classList.toggle('active',ti===i));
  showFlash()
}
function showFlash(){
  const f=flashItems[flashIdx];if(!f)return;
  document.getElementById('flashTerm').textContent=f.term;
  document.getElementById('flashMod').textContent=(M[f.mod]?M[f.mod].icon+' '+M[f.mod].title:'');
  document.getElementById('flashDef').textContent=f.def;
  document.getElementById('flashCounter').textContent=`${flashIdx+1}/${flashItems.length}`;
  document.getElementById('flashCard').classList.remove('flipped')
}
function flipFlash(){document.getElementById('flashCard').classList.toggle('flipped')}
function nextFlash(){flashIdx=(flashIdx+1)%flashItems.length;showFlash()}
function prevFlash(){flashIdx=(flashIdx-1+flashItems.length)%flashItems.length;showFlash()}

// ============================================================
// QUIZ REVIEW
// ============================================================
function goReview(){
  hideAllViews();document.getElementById('vReview').classList.add('on');setNav('nReview');
  const tabs=['Todos os Erros',...M.map(m=>m.icon+' '+m.title)];
  document.getElementById('reviewTabs').innerHTML=tabs.map((t,i)=>
    `<button class="xview-tab${i===0?' active':''}" onclick="filterReview(${i-1},this)">${t}</button>`
  ).join('');
  filterReview(-1,null)
}
function filterReview(modIdx,btn){
  if(btn){document.querySelectorAll('#reviewTabs .xview-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active')}
  const wrongs=[];
  M.forEach((mod,mi)=>{
    if(modIdx>=0&&mi!==modIdx)return;
    mod.lessons.forEach((les,li)=>{
      const k=`${mi}-${li}`;
      if(S.quiz[k]===false)wrongs.push({mi,li,mod:mod.title,icon:mod.icon,q:les.quiz.q,correct:les.quiz.o[les.quiz.c],exp:les.quiz.exp})
    })
  });
  document.getElementById('reviewList').innerHTML=wrongs.length?wrongs.map(w=>
    `<div class="review-card"><div class="rc-mod">${w.icon} ${w.mod} · Aula ${w.li+1}</div><div class="rc-q">${w.q}</div><div class="rc-ans">✓ ${w.correct}</div><div class="rc-exp">${w.exp}</div></div>`
  ).join(''):`<div style="padding:2rem;text-align:center;color:var(--text-muted)">🎉 Nenhum quiz errado! ${modIdx>=0?'Neste módulo.':'Continue assim!'}</div>`
}

// ============================================================
// CERTIFICATE
// ============================================================
let certModIdx=0;
function showCert(mi){
  certModIdx=mi;
  const m=M[mi];
  const disc=DISCIPLINES[m.discipline||'economia']||{label:'Economia',icon:'📚'};
  const nLessons=m.lessons.length;
  const hours=Math.max(1,Math.round(nLessons*5/60));
  const quizOk=m.lessons.filter((_,li)=>S.quiz[`${mi}-${li}`]).length;
  const quizTotal=m.lessons.filter(l=>l.quiz).length;
  const certHash=_certId(mi);
  document.getElementById('certName').textContent=S.name;
  document.getElementById('certModule').textContent=`Concluiu: ${m.icon} ${m.title}`;
  document.getElementById('certDetails').innerHTML=`${disc.icon} ${disc.label} · ${nLessons} aulas · ${hours}h · ${quizTotal?Math.round(quizOk/quizTotal*100)+'% quizzes':''}`;
  document.getElementById('certDate').textContent=new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('certId').textContent=`ID: ${certHash}`;
  document.getElementById('certOverlay').classList.add('show')
}
function _certId(mi){
  const raw=`${S.name}-${mi}-${S.lvl}`;
  let h=0;for(let i=0;i<raw.length;i++){h=((h<<5)-h)+raw.charCodeAt(i);h|=0}
  return 'EL-'+Math.abs(h).toString(36).toUpperCase().slice(0,8)
}
function _discCertId(disc){
  const raw=`${S.name}-DISC-${disc}`;
  let h=0;for(let i=0;i<raw.length;i++){h=((h<<5)-h)+raw.charCodeAt(i);h|=0}
  return 'ELD-'+Math.abs(h).toString(36).toUpperCase().slice(0,8)
}

function checkDiscCompletion(mi){
  const disc=M[mi].discipline||'economia';
  const mods=getDiscModules(disc);
  const allDone=mods.every(({mod,idx})=>mod.lessons.every((_,li)=>S.done[`${idx}-${li}`]));
  if(allDone){
    const d=DISCIPLINES[disc];
    if(d){
      setTimeout(()=>{
        toast(`🏆 ${d.label} Completa!`);launchConfetti();
        setTimeout(()=>showDiscCert(disc),800)
      },1200)
    }
  }
}

function showDiscCert(disc){
  const d=DISCIPLINES[disc];if(!d)return;
  const mods=getDiscModules(disc);
  const totalLessons=mods.reduce((s,{mod})=>s+mod.lessons.length,0);
  const totalHours=Math.max(1,Math.round(totalLessons*5/60));
  const totalModules=mods.length;
  const quizOk=mods.reduce((s,{mod,idx})=>s+mod.lessons.filter((_,li)=>S.quiz[`${idx}-${li}`]).length,0);
  const quizTotal=mods.reduce((s,{mod})=>s+mod.lessons.filter(l=>l.quiz).length,0);
  const certHash=_discCertId(disc);

  const overlay=document.createElement('div');
  overlay.className='cert-overlay show';overlay.id='discCertOverlay';
  overlay.onclick=e=>{if(e.target===overlay){overlay.remove()}};
  overlay.innerHTML=`<div class="cert-card cert-card-disc">
    <div class="cert-seal" aria-hidden="true">🏆</div>
    <div class="cert-title">Certificado de Disciplina</div>
    <div class="cert-sub">Escola Liberal — Plataforma Homeschool</div>
    <div class="cert-name">${S.name}</div>
    <div class="cert-module">Concluiu a disciplina: ${d.icon} ${d.label}</div>
    <div class="cert-details">${totalModules} módulos · ${totalLessons} aulas · ${totalHours}h · ${quizTotal?Math.round(quizOk/quizTotal*100)+'% quizzes':''}</div>
    <div class="cert-date">${new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}</div>
    <div class="cert-id">ID: ${certHash}</div>
    <div style="display:flex;gap:.75rem;justify-content:center;margin-top:.5rem;flex-wrap:wrap">
      <button class="cert-close" onclick="exportDiscCertPDF('${disc}')" style="border-color:var(--sage);color:var(--sage)">📄 Salvar PDF</button>
      <button class="cert-close" onclick="exportDiscCertImage('${disc}')" style="border-color:var(--honey);color:var(--honey)">📥 Salvar Imagem</button>
      <button class="cert-close" onclick="document.getElementById('discCertOverlay').remove()">Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay)
}

function _drawDiscCert(ctx,w,h,disc){
  const d=DISCIPLINES[disc];if(!d)return;
  const mods=getDiscModules(disc);
  const totalLessons=mods.reduce((s,{mod})=>s+mod.lessons.length,0);
  const totalHours=Math.max(1,Math.round(totalLessons*5/60));
  const quizOk=mods.reduce((s,{mod,idx})=>s+mod.lessons.filter((_,li)=>S.quiz[`${idx}-${li}`]).length,0);
  const quizTotal=mods.reduce((s,{mod})=>s+mod.lessons.filter(l=>l.quiz).length,0);
  const certHash=_discCertId(disc);
  // Background — premium gold gradient
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#1a1a2e');grad.addColorStop(1,'#16213e');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  // Double border — gold
  ctx.strokeStyle='#dba550';ctx.lineWidth=5;ctx.strokeRect(18,18,w-36,h-36);
  ctx.strokeStyle='rgba(219,165,80,.4)';ctx.lineWidth=2;ctx.strokeRect(30,30,w-60,h-60);
  // Corner ornaments
  [[38,38],[w-38,38],[38,h-38],[w-38,h-38]].forEach(([x,y])=>{ctx.fillStyle='#dba550';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill()});
  // Trophy
  ctx.font='56px serif';ctx.textAlign='center';ctx.fillStyle='#dba550';ctx.fillText('🏆',w/2,100);
  // Title
  ctx.font='bold 32px Georgia';ctx.fillStyle='#e8e6e1';ctx.fillText('Certificado de Disciplina',w/2,152);
  ctx.font='15px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Escola Liberal — Plataforma Homeschool',w/2,180);
  // Divider
  ctx.beginPath();ctx.moveTo(w*0.15,205);ctx.lineTo(w*0.85,205);ctx.strokeStyle='rgba(219,165,80,.4)';ctx.lineWidth=1;ctx.stroke();
  // Cert text
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Certificamos que',w/2,240);
  ctx.font='italic 40px Georgia';ctx.fillStyle='#5fbf96';ctx.fillText(S.name,w/2,290);
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('concluiu com êxito a disciplina completa',w/2,325);
  // Discipline name
  ctx.font='bold 26px sans-serif';ctx.fillStyle='#dba550';ctx.fillText(d.label,w/2,368);
  // Details
  ctx.font='13px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(`${mods.length} módulos · ${totalLessons} aulas · ${totalHours}h de carga horária${quizTotal?` · ${Math.round(quizOk/quizTotal*100)}% quizzes`:''}`,w/2,400);
  // Divider 2
  ctx.beginPath();ctx.moveTo(w*0.25,425);ctx.lineTo(w*0.75,425);ctx.strokeStyle='rgba(219,165,80,.2)';ctx.stroke();
  // Date
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}),w/2,455);
  // ID
  ctx.font='11px monospace';ctx.fillStyle='#6b7488';
  ctx.fillText(`Certificado ${certHash} · escolaliberal.com.br`,w/2,485);
  // Footer
  ctx.font='11px sans-serif';ctx.fillStyle='#4a5568';
  ctx.fillText('Este certificado atesta a conclusão da disciplina completa na plataforma Escola Liberal.',w/2,h-50)
}

function exportDiscCertImage(disc){
  const c=document.createElement('canvas');c.width=900;c.height=560;
  _drawDiscCert(c.getContext('2d'),900,560,disc);
  const a=document.createElement('a');
  a.download=`certificado-disciplina-${disc}.png`;
  a.href=c.toDataURL('image/png');a.click();
  toast('Certificado PNG salvo!')
}

function exportDiscCertPDF(disc){
  const c=document.createElement('canvas');c.width=1190;c.height=842;
  _drawDiscCert(c.getContext('2d'),1190,842,disc);
  // Reuse same PDF generation logic from module cert
  const pdfW=841.89;const pdfH=595.28;
  const imgW=pdfW-40;const imgH=pdfH-40;
  const jpegData=c.toDataURL('image/jpeg',0.92);
  const jpegBin=atob(jpegData.split(',')[1]);
  const jpegBytes=new Uint8Array(jpegBin.length);
  for(let i=0;i<jpegBin.length;i++)jpegBytes[i]=jpegBin.charCodeAt(i);

  let pdf='%PDF-1.4\n';const offsets=[];
  offsets.push(pdf.length);pdf+='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  offsets.push(pdf.length);pdf+='2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  offsets.push(pdf.length);pdf+=`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`;
  const cs=`q ${imgW} 0 0 ${imgH} 20 20 cm /Img Do Q`;
  offsets.push(pdf.length);pdf+=`4 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`;
  const imgObjStr=`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const imgEnd='\nendstream\nendobj\n';
  const pdfStart=new TextEncoder().encode(pdf);const imgStartB=new TextEncoder().encode(imgObjStr);const imgEndB=new TextEncoder().encode(imgEnd);
  offsets.push(pdfStart.length);
  const xrefOff=pdfStart.length+imgStartB.length+jpegBytes.length+imgEndB.length;
  let xref=`xref\n0 6\n0000000000 65535 f \n`;offsets.forEach(o=>{xref+=String(o).padStart(10,'0')+' 00000 n \n'});
  xref+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;
  const xrefB=new TextEncoder().encode(xref);
  const total=new Uint8Array(pdfStart.length+imgStartB.length+jpegBytes.length+imgEndB.length+xrefB.length);
  let p=0;total.set(pdfStart,p);p+=pdfStart.length;total.set(imgStartB,p);p+=imgStartB.length;total.set(jpegBytes,p);p+=jpegBytes.length;total.set(imgEndB,p);p+=imgEndB.length;total.set(xrefB,p);
  const blob=new Blob([total],{type:'application/pdf'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`certificado-disciplina-${disc}.pdf`;a.click();URL.revokeObjectURL(a.href);
  toast('Certificado PDF salvo!')
}
function closeCert(){const el=_origById('certOverlay');if(el){el.classList.remove('show');el.style.display=''}}

// ============================================================
// DAILY CHALLENGE
// ============================================================
const DAILY_KEY='escola_daily';
function renderDaily(){
  const today=new Date().toDateString();
  let daily;try{daily=JSON.parse(localStorage.getItem(DAILY_KEY)||'{}')}catch(e){daily={}}
  if(daily.date===today&&daily.answered){
    document.getElementById('dailyChallenge').innerHTML=`<div class="daily-card"><div class="daily-head">⚡ <span>Desafio Diário</span><span class="daily-tag">✓ Concluído</span></div><div style="font-size:.85rem;color:var(--text-muted)">Volte amanhã para um novo desafio! ${daily.correct?'+50 XP conquistados 🎉':'Tente de novo amanhã!'}</div></div>`;return
  }
  // Pick a deterministic quiz for today
  const seed=today.split('').reduce((s,c)=>s+c.charCodeAt(0),0);
  const allQ=[];M.forEach((m,mi)=>m.lessons.forEach((l,li)=>{if(l.quiz)allQ.push({mi,li,q:l.quiz.q,o:l.quiz.o,c:l.quiz.c,exp:l.quiz.exp,mod:m.title,icon:m.icon})}));
  if(!allQ.length){document.getElementById('dailyChallenge').innerHTML='<div class="daily-card"><div class="daily-head">⚡ <span>Desafio Diário</span></div><div style="font-size:.85rem;color:var(--text-muted)">Nenhum quiz disponível ainda.</div></div>';return}
  const dq=allQ[seed%allQ.length];
  document.getElementById('dailyChallenge').innerHTML=`<div class="daily-card"><div class="daily-head">⚡ <span>Desafio Diário</span><span class="daily-tag">+50 XP</span></div><div class="daily-q">${dq.q}</div><div class="daily-opts">${dq.o.map((o,i)=>`<button class="daily-o" onclick="answerDaily(${i},${dq.c},'${dq.exp.replace(/'/g,"\\'")}')">${o}</button>`).join('')}</div><div class="daily-fb" id="dailyFb"></div><div style="font-size:.7rem;color:var(--text-muted);margin-top:.4rem">${dq.icon} ${dq.mod}</div></div>`
}
function answerDaily(a,c,exp){
  const ok=a===c;
  document.querySelectorAll('.daily-o').forEach((b,i)=>{b.classList.add('d-off');if(i===c)b.classList.add('d-ok');if(i===a&&!ok)b.classList.add('d-no')});
  const fb=document.getElementById('dailyFb');fb.className='daily-fb show';fb.style.color=ok?'var(--sage-light)':'var(--coral)';fb.textContent=(ok?'✓ Correto! ':'✗ ')+exp;
  if(ok){addXP(50);toast('⚡ +50 XP — Desafio Diário!');logActivity('daily','Desafio diário — Acertou!')}
  else{logActivity('daily','Desafio diário — Errou')}
  localStorage.setItem(DAILY_KEY,JSON.stringify({date:new Date().toDateString(),answered:true,correct:ok}))
}

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
  document.getElementById('focusBtn').classList.remove('always');
  stopTTS()
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
// FAVORITES
// ============================================================
const FAV_KEY='escola_favs';
function loadFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY))||[]}catch(e){return[]}}
function saveFavs(f){localStorage.setItem(FAV_KEY,JSON.stringify(f));if(typeof queueSync==='function')queueSync('favs',f)}
function toggleFav(){
  const k=`${S.cMod}-${S.cLes}`;let favs=loadFavs();
  const idx=favs.indexOf(k);
  if(idx>=0)favs.splice(idx,1);else favs.push(k);
  saveFavs(favs);updateFavBtn();toast(idx>=0?'Removido dos favoritos':'⭐ Adicionado aos favoritos!')
}
function updateFavBtn(){
  const k=`${S.cMod}-${S.cLes}`,favs=loadFavs(),is=favs.includes(k);
  const btn=document.getElementById('favBtn');
  btn.textContent=is?'★':'☆';btn.classList.toggle('faved',is)
}
function renderFavs(){
  const favs=loadFavs();
  if(!favs.length){document.getElementById('favSection').innerHTML='';return}
  let html='<div class="fav-section"><h3>⭐ Favoritos</h3><div class="fav-list">';
  favs.forEach(k=>{
    const [mi,li]=k.split('-').map(Number);
    if(!M[mi]||!M[mi].lessons[li])return;
    const m=M[mi],l=m.lessons[li];
    html+=`<div class="fav-item" onclick="openL(${mi},${li})"><div class="fav-item-icon">${m.icon}</div><div class="fav-item-info"><div class="fav-item-title">${l.title}</div><div class="fav-item-sub">${m.title} · Aula ${li+1}</div></div><button class="fav-item-remove" onclick="event.stopPropagation();removeFav('${k}')" title="Remover">✕</button></div>`
  });
  html+='</div></div>';
  document.getElementById('favSection').innerHTML=html
}
function removeFav(k){let favs=loadFavs();favs=favs.filter(f=>f!==k);saveFavs(favs);renderFavs()}

// ============================================================
// READING TIME
// ============================================================
function calcReadTime(content){
  const text=content.replace(/<[^>]*>/g,' ');
  const words=text.trim().split(/\s+/).length;
  return Math.max(1,Math.ceil(words/200))
}

// ============================================================
// PERFORMANCE / STATS
// ============================================================
function goPerf(){
  hideAllViews();document.getElementById('vPerf').classList.add('on');setNav('nPerf');
  const totalLessons=M.reduce((s,m)=>s+m.lessons.length,0);
  const doneLessons=Object.keys(S.done).length;
  const totalQuizzes=Object.keys(S.quiz).length;
  const correctQuizzes=Object.values(S.quiz).filter(v=>v).length;
  const wrongQuizzes=totalQuizzes-correctQuizzes;
  const pctDone=Math.round(doneLessons/totalLessons*100);
  const pctCorrect=totalQuizzes?Math.round(correctQuizzes/totalQuizzes*100):0;
  const li=getLevelInfo(S.lvl);
  const colors=['var(--sage)','var(--sky)','var(--honey)','var(--coral)','var(--lavender)','#5bd59b'];

  document.getElementById('perfGrid').innerHTML=`
    <div class="perf-card"><div class="perf-val" style="color:var(--sage-light)">${totalXP()}</div><div class="perf-label">XP Total</div></div>
    <div class="perf-card"><div class="perf-val" style="color:var(--honey)">${S.lvl}</div><div class="perf-label">${li.emoji} ${li.name}</div></div>
    <div class="perf-card"><div class="perf-val" style="color:var(--sky)">${doneLessons}/${totalLessons}</div><div class="perf-label">Aulas Concluídas</div><div class="perf-bar-wrap"><div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${pctDone}%;background:var(--sky)"></div></div></div></div>
    <div class="perf-card"><div class="perf-val" style="color:${pctCorrect>=70?'var(--sage-light)':'var(--coral)'}">${pctCorrect}%</div><div class="perf-label">Acerto nos Quizzes</div><div class="perf-bar-wrap"><div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${pctCorrect}%;background:${pctCorrect>=70?'var(--sage)':'var(--coral)'}"></div></div></div></div>
    <div class="perf-card"><div class="perf-val" style="color:var(--honey)">${S.streak}</div><div class="perf-label">🔥 Dias em Sequência</div></div>
    <div class="perf-card"><div class="perf-val" style="color:var(--coral)">${wrongQuizzes}</div><div class="perf-label">Quizzes para Revisar</div></div>
  `;

  document.getElementById('perfModules').innerHTML=M.map((m,mi)=>{
    const d=m.lessons.filter((_,li)=>S.done[`${mi}-${li}`]).length;
    const pct=Math.round(d/m.lessons.length*100);
    const qTotal=m.lessons.filter((_,li)=>S.quiz[`${mi}-${li}`]!==undefined).length;
    const qOk=m.lessons.filter((_,li)=>S.quiz[`${mi}-${li}`]===true).length;
    const qPct=qTotal?Math.round(qOk/qTotal*100):0;
    return`<div class="perf-mod"><div class="perf-mod-icon">${m.icon}</div><div class="perf-mod-info"><div class="perf-mod-name">${m.title}</div><div class="perf-mod-stats">${d}/${m.lessons.length} aulas · ${qPct}% quizzes</div></div><div class="perf-mod-bar"><div class="perf-mod-fill" style="width:${pct}%;background:${colors[mi]}"></div></div></div>`
  }).join('')
}

// ============================================================
// ONBOARDING
// ============================================================
const AVATARS=['🧑‍🎓','👨‍💼','👩‍💼','🦊','🦁','🐺','🦅','🐉','💎','🏆'];
let obAvatar='🧑‍🎓';
let obAgeGroup='';
let obLangPref='pt';
function initOnboard(){
  if(S.name!=='Aluno'){document.getElementById('onboard').style.display='none';return}
  document.getElementById('obAvatars').innerHTML=AVATARS.map((a,i)=>
    `<div class="onboard-av${i===0?' selected':''}" onclick="selectAvatar('${a}',this)">${a}</div>`
  ).join('');
  document.getElementById('obName').focus()
}
function selectAvatar(a,el){
  obAvatar=a;
  document.querySelectorAll('.onboard-av').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected')
}
function selectAge(age,el){
  obAgeGroup=age;
  document.querySelectorAll('.ob-age-btn').forEach(e=>e.classList.remove('active'));
  el.classList.add('active')
}
function selectObLang(lang,el){
  obLangPref=lang;
  document.querySelectorAll('.ob-lang-btn').forEach(e=>e.classList.remove('active'));
  el.classList.add('active')
}
function obNext(step){
  if(step===1){
    const name=document.getElementById('obName').value.trim();
    if(!name){document.getElementById('obName').focus();return}
    S.name=name;
    const email=document.getElementById('obEmail').value.trim();
    if(email)S.email=email;
    save();
    if(email)localStorage.setItem('escola_lead_email',email);
  }
  if(step===2&&!obAgeGroup){toast('Selecione sua faixa etária');return}
  if(step===3){
    if(typeof setLang==='function')setLang(obLangPref);
  }
  document.getElementById('obStep'+step).classList.remove('active');
  document.getElementById('obStep'+(step+1)).classList.add('active')
}
function obFinish(){
  try{
    S.avatar=obAvatar;
    S.ageGroup=obAgeGroup;
    S.lang=obLangPref;
    save();
    // Salvar lead no Supabase
    if(S.email&&typeof saveLeadEmail==='function')saveLeadEmail(S.email,S.name,obAgeGroup,obLangPref);
    if(typeof setLang==='function')setLang(obLangPref);
    if(typeof updateLangToggle==='function')updateLangToggle();
    // GA4: onboarding completo
    if(typeof gtag==='function')gtag('event','onboarding_complete',{name:S.name,age_group:obAgeGroup,lang:obLangPref,has_email:!!S.email});
    const el=_origById('onboard');
    if(el){el.classList.add('hide');setTimeout(()=>{el.style.display='none';
      // After onboarding hides, show What's New and PWA modal
      setTimeout(checkWhatsNew,800);
      setTimeout(()=>_showPwaModal(false),2000);
      setTimeout(preloadModules,2500);
    },500)}
    goDash()
  }catch(e){console.error('[obFinish]',e.message);goDash()}
}

// ============================================================
// PAYWALL — shows upgrade prompt for premium modules
// ============================================================
function showModulePaywall(modIdx){
  const m=M[modIdx];if(!m)return;
  const overlay=document.createElement('div');
  overlay.className='save-modal-overlay';overlay.id='paywallModal';
  overlay.innerHTML=`<div class="save-modal">
    <button class="save-modal-close" onclick="document.getElementById('paywallModal').remove()" aria-label="Fechar">&times;</button>
    <div style="font-size:2.5rem;margin-bottom:.75rem">${m.icon}</div>
    <h2 style="font-size:1.3rem;margin-bottom:.5rem">${m.title}</h2>
    <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:1.25rem;line-height:1.6">Este módulo faz parte do plano <strong>Premium</strong>. Desbloqueie acesso completo a todas as ${M.reduce((s,m)=>s+m.lessons.length,0)} aulas, certificados e ferramentas avançadas.</p>
    <a href="perfil.html#planos" class="btn btn-sage" style="width:100%;margin-bottom:.75rem">Ver Planos — a partir de R$29,90/mês</a>
    <button class="btn btn-ghost" onclick="document.getElementById('paywallModal').remove()" style="width:100%;font-size:.85rem">Voltar</button>
  </div>`;
  document.body.appendChild(overlay);
  if(typeof gtag==='function')gtag('event','paywall_shown',{module:m.title,module_index:modIdx});
}

// ============================================================
// SHARE — viral sharing via WhatsApp and clipboard
// ============================================================
function shareWhatsApp(){
  const done=Object.keys(S.done).length;
  const total=M.reduce((s,m)=>s+m.lessons.length,0);
  const pct=total?Math.round(done/total*100):0;
  const xp=totalXP();
  const msgs=[
    `🎓🔥 DESAFIO LANÇADO!\n\nEstou aprendendo economia de verdade na Escola Liberal — e já completei ${pct}% do curso!\n\n💡 Você sabia que tudo o que te ensinaram sobre economia na escola pode estar ERRADO?\n\nAceita o desafio? Aprenda em 5 minutos o que nenhum professor te ensinou:\n\n👉 https://escolaliberal.com.br\n\n⚡ É grátis, funciona no celular e você aprende no seu ritmo.\nBora ver quem aprende mais rápido? 🏆`,
    `🧠💪 TESTE SUA INTELIGÊNCIA ECONÔMICA!\n\nComecei a estudar economia austríaca na Escola Liberal e já mudou minha forma de ver o mundo.\n\n🤔 Você sabe a diferença entre dinheiro e moeda? Entre preço e valor?\n\nSe não sabe, tá na hora de aprender:\n👉 https://escolaliberal.com.br\n\n🎯 Gratuito • No celular • Aulas de 5 minutos\nQuem chegar nos 1.000 XP primeiro? 🔥`,
    `📚 AULA QUE A ESCOLA NÃO DÁ:\n\n"Por que o real perde valor todo ano?"\n"Por que os preços só sobem?"\n"O que é taxa de juros DE VERDADE?"\n\nEu aprendi tudo isso na Escola Liberal. Em 5 min por dia. Pelo celular.\n\n👉 https://escolaliberal.com.br\n\n⭐ Já tenho ${xp} XP — e você? Aceita o desafio?`
  ];
  const text=msgs[Math.floor(Math.random()*msgs.length)];
  const waUrl='https://wa.me/?text='+encodeURIComponent(text);
  window.open(waUrl,'_blank');
  // Track
  try{const c=parseInt(localStorage.getItem('escola_share_count')||'0');localStorage.setItem('escola_share_count',String(c+1))}catch(e){}
  if(typeof gtag==='function')gtag('event','share',{method:'whatsapp',done_count:done,xp});
  logActivity('share','Compartilhou no WhatsApp')
}

// ============================================================
// SAVE PROGRESS MODAL — triggers after N lessons completed
// ============================================================
const SAVE_MODAL_KEY='escola_save_modal_shown';
const SAVE_MODAL_THRESHOLD=3;
function checkSaveModal(){
  // Don't show if: already shown, user has account, or under threshold
  if(localStorage.getItem(SAVE_MODAL_KEY))return;
  if(S.uid||(typeof currentUser!=='undefined'&&currentUser))return; // logged in via Supabase
  const doneCount=Object.keys(S.done).length;
  if(doneCount>=SAVE_MODAL_THRESHOLD){
    document.getElementById('saveModalCount').textContent=doneCount;
    document.getElementById('saveModal').style.display='flex';
    localStorage.setItem(SAVE_MODAL_KEY,'1');
  }
}
function closeSaveModal(){
  const modal=_origById('saveModal');
  if(modal){modal.style.display='none';modal.classList.remove('show')}
}

// ============================================================
// AUDIO LESSON PLAYER — paragraph-by-paragraph with highlighting
// ============================================================
let ttsPlaying=false,ttsPaused=false,ttsUtterance=null;
let ttsParagraphs=[],ttsCurrentIdx=0,ttsRate=1.0;
const TTS_RATE_KEY='escola_tts_rate';
try{ttsRate=parseFloat(localStorage.getItem(TTS_RATE_KEY))||1.0}catch(e){}

function toggleTTS(){
  if(!('speechSynthesis' in window)){toast('Áudio não suportado neste navegador','error');return}
  if(ttsPlaying&&!ttsPaused){pauseTTS();return}
  if(ttsPaused){resumeTTS();return}
  startTTS();
}

function startTTS(){
  stopTTS();
  const body=document.getElementById('lvBody');
  if(!body)return;
  // Collect all readable paragraphs (skip quiz section)
  const els=body.querySelectorAll('h2,h3,p,li,.highlight,.example,.thinker-quote');
  ttsParagraphs=[];
  els.forEach(el=>{
    // Stop at quiz section
    if(el.closest('.qz'))return;
    const text=el.innerText.trim();
    if(text.length>5)ttsParagraphs.push({el:el,text:text});
  });
  if(ttsParagraphs.length===0){toast('Nenhum conteúdo para ler');return}
  ttsCurrentIdx=0;
  ttsPlaying=true;ttsPaused=false;
  updateTTSUI();
  showAudioPlayer();
  speakParagraph(ttsCurrentIdx);
}

function speakParagraph(idx){
  if(idx>=ttsParagraphs.length){finishTTS();return}
  ttsCurrentIdx=idx;
  // Remove previous highlight
  ttsParagraphs.forEach(p=>p.el.classList.remove('tts-active'));
  // Highlight current
  const p=ttsParagraphs[idx];
  p.el.classList.add('tts-active');
  p.el.scrollIntoView({behavior:'smooth',block:'center'});
  // Speak
  ttsUtterance=new SpeechSynthesisUtterance(p.text);
  ttsUtterance.lang=window.currentLang==='en'?'en-US':'pt-BR';
  ttsUtterance.rate=ttsRate;
  ttsUtterance.pitch=1.0;
  // Try to pick a good voice
  const voices=speechSynthesis.getVoices();
  const lang=ttsUtterance.lang;
  const preferred=voices.find(v=>v.lang===lang&&v.localService)||voices.find(v=>v.lang.startsWith(lang.split('-')[0]));
  if(preferred)ttsUtterance.voice=preferred;
  ttsUtterance.onend=()=>{
    if(!ttsPlaying||ttsPaused)return;
    speakParagraph(idx+1);
  };
  ttsUtterance.onerror=(e)=>{
    if(e.error==='canceled')return; // Normal on stop
    console.warn('[TTS] Error:',e.error);
    // Skip to next paragraph on error
    if(ttsPlaying&&!ttsPaused)speakParagraph(idx+1);
  };
  speechSynthesis.speak(ttsUtterance);
  updateAudioProgress();
}

function pauseTTS(){
  speechSynthesis.pause();
  ttsPaused=true;
  updateTTSUI();
}

function resumeTTS(){
  speechSynthesis.resume();
  ttsPaused=false;
  updateTTSUI();
}

function stopTTS(){
  speechSynthesis.cancel();
  ttsPlaying=false;ttsPaused=false;ttsCurrentIdx=0;
  ttsParagraphs.forEach(p=>p.el.classList.remove('tts-active'));
  ttsParagraphs=[];
  updateTTSUI();
  hideAudioPlayer();
}

function finishTTS(){
  ttsParagraphs.forEach(p=>p.el.classList.remove('tts-active'));
  ttsPlaying=false;ttsPaused=false;
  updateTTSUI();
  updateAudioProgress();
  toast('🔊 Áudio finalizado');
  // Auto-advance option
  const player=document.getElementById('audioPlayer');
  if(player){
    const prog=player.querySelector('.audio-progress-fill');
    if(prog)prog.style.width='100%';
  }
}

function ttsSkipBack(){
  if(ttsCurrentIdx>0){
    speechSynthesis.cancel();
    speakParagraph(ttsCurrentIdx-1);
  }
}

function ttsSkipForward(){
  if(ttsCurrentIdx<ttsParagraphs.length-1){
    speechSynthesis.cancel();
    speakParagraph(ttsCurrentIdx+1);
  }
}

function ttsSetRate(r){
  ttsRate=parseFloat(r);
  try{localStorage.setItem(TTS_RATE_KEY,ttsRate)}catch(e){}
  const label=document.getElementById('ttsRateLabel');
  if(label)label.textContent=ttsRate.toFixed(1)+'x';
  // Restart current paragraph with new rate
  if(ttsPlaying&&!ttsPaused){
    speechSynthesis.cancel();
    speakParagraph(ttsCurrentIdx);
  }
}

function updateTTSUI(){
  const btn=document.getElementById('ttsBtn');
  if(btn){
    if(ttsPlaying&&!ttsPaused){btn.innerHTML='⏸ Pausar';btn.classList.add('playing')}
    else if(ttsPaused){btn.innerHTML='▶ Continuar';btn.classList.add('playing')}
    else{btn.innerHTML='🔊 Ouvir';btn.classList.remove('playing')}
  }
}

function updateAudioProgress(){
  const player=document.getElementById('audioPlayer');
  if(!player)return;
  const prog=player.querySelector('.audio-progress-fill');
  const label=player.querySelector('.audio-progress-label');
  if(ttsParagraphs.length>0){
    const pct=Math.round(((ttsCurrentIdx+1)/ttsParagraphs.length)*100);
    if(prog)prog.style.width=pct+'%';
    if(label)label.textContent=(ttsCurrentIdx+1)+'/'+ttsParagraphs.length;
  }
}

function showAudioPlayer(){
  let player=document.getElementById('audioPlayer');
  if(!player){
    player=document.createElement('div');
    player.id='audioPlayer';
    player.className='audio-player';
    player.innerHTML=`
      <div class="audio-progress"><div class="audio-progress-fill"></div></div>
      <div class="audio-controls">
        <button class="audio-btn" onclick="ttsSkipBack()" title="Parágrafo anterior" aria-label="Anterior">⏮</button>
        <button class="audio-btn audio-btn-main" onclick="toggleTTS()" title="Play/Pause" aria-label="Play ou Pause">⏸</button>
        <button class="audio-btn" onclick="ttsSkipForward()" title="Próximo parágrafo" aria-label="Próximo">⏭</button>
        <button class="audio-btn" onclick="stopTTS()" title="Parar" aria-label="Parar">⏹</button>
        <div class="audio-speed">
          <button class="audio-speed-btn" onclick="ttsSetRate(Math.max(0.5,ttsRate-0.25))" aria-label="Diminuir velocidade">−</button>
          <span class="audio-speed-label" id="ttsRateLabel">${ttsRate.toFixed(1)}x</span>
          <button class="audio-speed-btn" onclick="ttsSetRate(Math.min(2.5,ttsRate+0.25))" aria-label="Aumentar velocidade">+</button>
        </div>
        <span class="audio-progress-label">0/0</span>
      </div>
    `;
    document.body.appendChild(player);
  }
  player.classList.add('show');
  updateAudioProgress();
}

function hideAudioPlayer(){
  const player=document.getElementById('audioPlayer');
  if(player)player.classList.remove('show');
}

// ============================================================
// QUIZ MARATHON
// ============================================================
const MARATHON_KEY='escola_marathon_best';
let mQuestions=[],mIdx=0,mScore=0,mTimer=0,mInterval=null;
function startMarathon(){
  hideAllViews();document.getElementById('vMarathon').classList.add('on');setNav('nMarathon');
  const allQ=[];M.forEach((m,mi)=>m.lessons.forEach((l,li)=>{if(l.quiz)allQ.push({mi,li,q:l.quiz.q,o:l.quiz.o,c:l.quiz.c,exp:l.quiz.exp,mod:m.title,icon:m.icon})}));
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
    <div class="marathon-opts">${q.o.map((o,i)=>`<button class="marathon-o" onclick="ansMarathon(${i})">${o}</button>`).join('')}</div>`
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
    <div style="display:flex;gap:.75rem;justify-content:center"><button class="btn btn-sage" onclick="startMarathon()">Jogar Novamente</button><button class="btn btn-ghost" onclick="goDash()">Dashboard</button></div></div>`;
  if(mScore>=5){const mKey='escola_marathon_today';let mt;try{mt=JSON.parse(localStorage.getItem(mKey)||'{}')}catch(e){mt={}}const td=new Date().toDateString();if(mt.date!==td){mt={date:td,count:0}}if(mt.count<3){addXP(mScore*10);toast(`+${mScore*10} XP — Maratona!`);mt.count++;try{localStorage.setItem(mKey,JSON.stringify(mt))}catch(e){}}else{toast('XP da maratona: limite diário atingido (3x)')}}
}
function endMarathon(){clearInterval(mInterval);goDash()}

// ============================================================
// WEEKLY MISSIONS
// ============================================================
const MISSIONS_KEY='escola_missions';
function getWeekId(){const d=new Date();const jan1=new Date(d.getFullYear(),0,1);return d.getFullYear()+'-W'+Math.ceil(((d-jan1)/864e5+jan1.getDay()+1)/7)}
function getMissions(){
  let stored;try{stored=JSON.parse(localStorage.getItem(MISSIONS_KEY)||'{}')}catch(e){stored={}}
  const wk=getWeekId();
  if(stored.week===wk)return stored;
  const missions={week:wk,claimed:[],list:[
    {id:'lessons5',name:'Complete 5 aulas',target:5,icon:'📚',xp:75},
    {id:'quiz3row',name:'Acerte 3 quizzes seguidos',target:3,icon:'🎯',xp:50},
    {id:'streak3',name:'Estude 3 dias seguidos',target:3,icon:'🔥',xp:60}
  ]};
  localStorage.setItem(MISSIONS_KEY,JSON.stringify(missions));return missions
}
function getMissionProgress(m){
  if(m.id==='lessons5')return Math.min(m.target,Object.keys(S.done).length);
  if(m.id==='streak3')return Math.min(m.target,S.streak);
  if(m.id==='quiz3row'){
    let streak=0,max=0;const keys=Object.keys(S.quiz).sort();
    for(const k of keys){if(S.quiz[k]){streak++;max=Math.max(max,streak)}else streak=0}
    return Math.min(m.target,max)
  }
  return 0
}
function renderMissions(){
  const data=getMissions();
  const daysLeft=7-new Date().getDay();
  let html=`<div class="missions-card"><div class="missions-head">🎯 <span>Missões Semanais</span><span class="missions-timer">${daysLeft} dia${daysLeft!==1?'s':''} restante${daysLeft!==1?'s':''}</span></div>`;
  data.list.forEach(m=>{
    const prog=getMissionProgress(m);
    const pct=Math.round(prog/m.target*100);
    const done=prog>=m.target;
    const claimed=data.claimed.includes(m.id);
    const mAction=m.id==='lessons5'?'goNextLesson()':m.id==='quiz3row'?'goNextQuiz()':'goDash()';
    html+=`<div class="mission${done?' done':''}" onclick="${done&&!claimed?'':mAction}" style="cursor:pointer"><div class="mission-icon">${m.icon}</div><div class="mission-info"><div class="mission-name">${m.name}</div><div class="mission-prog">${prog}/${m.target}${claimed?' · ✓ Resgatado':''}</div><div class="mission-bar"><div class="mission-fill" style="width:${pct}%${done?';background:var(--honey)':''}"></div></div>${!done?'<div class="mission-hint">Toque para ir →</div>':''}</div><div class="mission-xp">${done&&!claimed?`<button class="btn btn-sage" style="font-size:.7rem;padding:.25rem .6rem" onclick="event.stopPropagation();claimMission('${m.id}',${m.xp})">+${m.xp} XP</button>`:`+${m.xp} XP`}</div></div>`
  });
  html+='</div>';
  document.getElementById('missionsSection').innerHTML=html
}
function goNextLesson(){
  for(let mi=0;mi<M.length;mi++){if(!isModUnlocked(mi))continue;for(let li=0;li<M[mi].lessons.length;li++){if(!S.done[`${mi}-${li}`]){openL(mi,li);return}}}
  toast('🏆 Todas as aulas concluídas!');
}
function goNextQuiz(){
  for(let mi=0;mi<M.length;mi++){if(!isModUnlocked(mi))continue;for(let li=0;li<M[mi].lessons.length;li++){if(M[mi].lessons[li].quiz&&S.quiz[`${mi}-${li}`]===undefined){openL(mi,li);return}}}
  toast('🎯 Todos os quizzes respondidos!');
}
function claimMission(id,xp){
  const data=getMissions();
  if(!data.claimed.includes(id)){data.claimed.push(id);localStorage.setItem(MISSIONS_KEY,JSON.stringify(data));addXP(xp);toast(`🎯 +${xp} XP — Missão completa!`);renderMissions()}
}

// ============================================================
// MULTI-PROFILE
// ============================================================
const PROFILES_KEY='escola_profiles';
let activeProfile='default';
function loadProfiles(){try{return JSON.parse(localStorage.getItem(PROFILES_KEY))||{default:{name:S.name}}}catch(e){return{default:{name:S.name}}}}
function saveProfiles(p){try{localStorage.setItem(PROFILES_KEY,JSON.stringify(p))}catch(e){console.warn('[saveProfiles] storage error:',e.message)}}
function renderProfileSwitch(){
  const profiles=loadProfiles();const keys=Object.keys(profiles);
  if(keys.length<=1){
    document.getElementById('profileSwitch').innerHTML=`<span class="profile-manage" onclick="addProfile()">+ Adicionar perfil</span>`;return
  }
  let html=keys.map(k=>`<button class="profile-switch-btn${k===activeProfile?' active':''}" onclick="switchProfile('${k}')">${profiles[k].name||'Aluno'}</button>`).join('');
  html+=`<span class="profile-manage" onclick="addProfile()">+</span>`;
  html+=`<span class="profile-manage" onclick="goParentDash()">👁</span>`;
  document.getElementById('profileSwitch').innerHTML=html
}
function addProfile(){
  const name=prompt('Nome do novo perfil:');
  if(!name||!name.trim())return;
  const profiles=loadProfiles();
  const id='p_'+Date.now();
  profiles[id]={name:name.trim()};
  saveProfiles(profiles);
  // Create new state for this profile
  const newState=def();newState.name=name.trim();
  localStorage.setItem(SK+'_'+id,JSON.stringify(newState));
  switchProfile(id)
}
function switchProfile(id){
  // Save current
  const profiles=loadProfiles();
  if(activeProfile==='default'){localStorage.setItem(SK,JSON.stringify(S))}
  else{localStorage.setItem(SK+'_'+activeProfile,JSON.stringify(S))}
  profiles[activeProfile]={name:S.name};
  // Load new
  activeProfile=id;
  if(id==='default'){S=load()}
  else{try{S={...def(),...JSON.parse(localStorage.getItem(SK+'_'+id))};}catch(e){S=def()}}
  profiles[id]={name:S.name};
  saveProfiles(profiles);
  renderProfileSwitch();goDash();toast(`Perfil: ${S.name}`)
}
// ============================================================
// PARENT PIN LOCK
// ============================================================
const PIN_KEY='escola_pin';
let pinBuffer='';let pinCallback=null;
async function _hashPin(p){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ec_pin_salt_'+p));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function getPin(){return localStorage.getItem(PIN_KEY)}
async function setPin(p){const h=await _hashPin(p);localStorage.setItem(PIN_KEY,h)}
function showPinOverlay(mode,cb){
  pinBuffer='';pinCallback=cb;
  const title=mode==='set'?'Criar PIN de Acesso':'Insira o PIN';
  const sub=mode==='set'?'Crie um PIN de 4 dígitos para proteger o painel dos pais.':'Digite o PIN de 4 dígitos.';
  const overlay=document.createElement('div');overlay.className='pin-overlay';overlay.id='pinOverlay';
  overlay.innerHTML=`<div class="pin-card"><h3>🔐 ${title}</h3><p>${sub}</p><div class="pin-dots">${[0,1,2,3].map(i=>`<div class="pin-dot" id="pd${i}"></div>`).join('')}</div><div class="pin-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="pin-key" onclick="pinPress('${n}')">${n}</button>`).join('')}<div class="pin-key pin-empty"></div><button class="pin-key" onclick="pinPress('0')">0</button><button class="pin-key pin-del" onclick="pinDel()">⌫</button></div><button class="btn btn-ghost" onclick="closePin()" style="margin-top:1rem;width:100%">Cancelar</button></div>`;
  document.body.appendChild(overlay)
}
function pinPress(n){
  if(pinBuffer.length>=4)return;
  pinBuffer+=n;
  for(let i=0;i<4;i++){const d=document.getElementById('pd'+i);d&&(d.className='pin-dot'+(i<pinBuffer.length?' filled':''))}
  if(pinBuffer.length===4)setTimeout(()=>{if(pinCallback)pinCallback(pinBuffer)},200)
}
function pinDel(){
  if(pinBuffer.length>0){pinBuffer=pinBuffer.slice(0,-1);for(let i=0;i<4;i++){const d=document.getElementById('pd'+i);d&&(d.className='pin-dot'+(i<pinBuffer.length?' filled':''))}}
}
function closePin(){const o=document.getElementById('pinOverlay');if(o)o.remove();pinBuffer='';pinCallback=null}
function pinError(){
  document.querySelectorAll('.pin-dot').forEach(d=>{d.classList.add('error')});
  setTimeout(()=>{pinBuffer='';document.querySelectorAll('.pin-dot').forEach(d=>{d.className='pin-dot'})},600)
}
async function goParentDash(){
  const pin=await getPin();
  if(!pin){
    showPinOverlay('set',async p=>{await setPin(p);closePin();toast('🔐 PIN criado!');showPinOverlay('verify',async p2=>{const h=await _hashPin(p2);if(h===await getPin()){closePin();openParentDash()}else pinError()})})
  }else{
    showPinOverlay('verify',async p=>{const h=await _hashPin(p);if(h===pin){closePin();openParentDash()}else pinError()})
  }
}
function _loadProfileState(k){
  if(k===activeProfile)return{...S};
  const key=k==='default'?SK:SK+'_'+k;
  try{return{...def(),...JSON.parse(localStorage.getItem(key))}}catch(e){return def()}
}
function _profileStats(ps){
  const done=Object.keys(ps.done||{}).length;
  const totalL=M.reduce((s,m)=>s+m.lessons.length,0);
  const qt=Object.keys(ps.quiz||{}).length;
  const qc=Object.values(ps.quiz||{}).filter(v=>v).length;
  const pct=qt?Math.round(qc/qt*100):0;
  const estMinutes=done*5;
  // Per-discipline breakdown
  const byDisc={};
  M.forEach((m,mi)=>{
    const disc=m.discipline||'economia';
    if(!byDisc[disc])byDisc[disc]={done:0,total:0,quizOk:0,quizTotal:0};
    m.lessons.forEach((_,li)=>{
      byDisc[disc].total++;
      if(ps.done[`${mi}-${li}`])byDisc[disc].done++;
      if(ps.quiz[`${mi}-${li}`]!==undefined){byDisc[disc].quizTotal++;if(ps.quiz[`${mi}-${li}`])byDisc[disc].quizOk++}
    });
  });
  // Weekly activity (last 7 days)
  const weekActivity=[];
  const today=new Date();
  for(let d=6;d>=0;d--){
    const dt=new Date(today);dt.setDate(today.getDate()-d);
    const iso=dt.toISOString().slice(0,10);
    weekActivity.push({date:iso,day:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dt.getDay()],active:ps.streakDays&&ps.streakDays.includes(iso)});
  }
  const daysActive=weekActivity.filter(d=>d.active).length;
  return{done,totalL,qt,qc,pct,estMinutes,byDisc,weekActivity,daysActive}
}

function openParentDash(){
  hideAllViews();
  document.getElementById('vParent').classList.add('on');
  const profiles=loadProfiles();const keys=Object.keys(profiles);

  // Alerts
  let alerts='';
  keys.forEach(k=>{
    const ps=_loadProfileState(k);
    const st=_profileStats(ps);
    if(st.daysActive===0)alerts+=`<div class="pd-alert pd-alert-warn">⚠️ <strong>${ps.name||'Aluno'}</strong> não estudou nenhum dia esta semana.</div>`;
    else if(st.daysActive<=2)alerts+=`<div class="pd-alert pd-alert-info">💡 <strong>${ps.name||'Aluno'}</strong> estudou apenas ${st.daysActive} dia${st.daysActive>1?'s':''} esta semana. Incentive a consistência!</div>`;
    if(ps.streak>=7)alerts+=`<div class="pd-alert pd-alert-success">🔥 <strong>${ps.name||'Aluno'}</strong> está com ${ps.streak} dias de sequência! Excelente!</div>`;
  });
  document.getElementById('parentAlerts').innerHTML=alerts;

  // Profile cards
  let cardsHtml='';
  keys.forEach(k=>{
    const ps=_loadProfileState(k);
    const st=_profileStats(ps);
    const li=getLevelInfo(ps.lvl||1);
    const progPct=st.totalL?Math.round(st.done/st.totalL*100):0;
    cardsHtml+=`<div class="parent-card" onclick="showParentDetail('${k}')">
      <div class="pc-head">
        <span class="pc-avatar">${ps.avatar||'🧑‍🎓'}</span>
        <div class="pc-name-wrap">
          <h4>${ps.name||'Aluno'}</h4>
          <span class="pc-level">${li.emoji} Nível ${ps.lvl||1} · ${li.name}</span>
        </div>
        <span class="pc-arrow">›</span>
      </div>
      <div class="pc-stats-grid">
        <div class="pc-stat-box"><div class="pc-stat-val">${st.done}/${st.totalL}</div><div class="pc-stat-lbl">Aulas</div></div>
        <div class="pc-stat-box"><div class="pc-stat-val">${st.pct}%</div><div class="pc-stat-lbl">Quizzes</div></div>
        <div class="pc-stat-box"><div class="pc-stat-val">${ps.streak||0}🔥</div><div class="pc-stat-lbl">Sequência</div></div>
        <div class="pc-stat-box"><div class="pc-stat-val">${st.daysActive}/7</div><div class="pc-stat-lbl">Semana</div></div>
      </div>
      <div class="pc-prog-bar"><div class="pc-prog-fill" style="width:${progPct}%"></div></div>
      <div class="pc-prog-label">${progPct}% do currículo completo · ~${Math.floor(st.estMinutes/60)}h${st.estMinutes%60}min estudados</div>
      <div class="pc-week">${st.weekActivity.map(d=>`<div class="pc-week-day${d.active?' active':''}"><div class="pc-week-dot"></div><div class="pc-week-lbl">${d.day}</div></div>`).join('')}</div>
    </div>`;
  });
  document.getElementById('parentCards').innerHTML=cardsHtml;
  document.getElementById('parentDetail').innerHTML='';
}

function showParentDetail(profileKey){
  const ps=_loadProfileState(profileKey);
  const st=_profileStats(ps);
  let html=`<div class="pd-detail">
    <h4>${ps.avatar||'🧑‍🎓'} ${ps.name||'Aluno'} — Detalhamento por Disciplina</h4>
    <div class="pd-disc-list">`;
  Object.entries(st.byDisc).forEach(([disc,d])=>{
    const info=DISCIPLINES[disc]||{label:disc,icon:'📚'};
    const pct=d.total?Math.round(d.done/d.total*100):0;
    const qPct=d.quizTotal?Math.round(d.quizOk/d.quizTotal*100):0;
    html+=`<div class="pd-disc-row">
      <span class="pd-disc-icon">${info.icon}</span>
      <div class="pd-disc-info">
        <div class="pd-disc-name">${info.label}</div>
        <div class="pd-disc-meta">${d.done}/${d.total} aulas · ${qPct}% quizzes</div>
        <div class="pd-disc-bar"><div class="pd-disc-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  });
  html+=`</div></div>`;
  document.getElementById('parentDetail').innerHTML=html;
  document.getElementById('parentDetail').scrollIntoView({behavior:'smooth'});
}

function exportParentReport(){
  const profiles=loadProfiles();const keys=Object.keys(profiles);
  let text='ESCOLA LIBERAL — RELATÓRIO DE PROGRESSO\n';
  text+=`Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
  text+='='.repeat(50)+'\n\n';
  keys.forEach(k=>{
    const ps=_loadProfileState(k);
    const st=_profileStats(ps);
    const li=getLevelInfo(ps.lvl||1);
    text+=`ALUNO: ${ps.name||'Aluno'}\n`;
    text+=`Nível: ${ps.lvl||1} (${li.name})\n`;
    text+=`Aulas: ${st.done}/${st.totalL} (${st.totalL?Math.round(st.done/st.totalL*100):0}%)\n`;
    text+=`Quizzes: ${st.pct}% de acerto (${st.qc}/${st.qt})\n`;
    text+=`Sequência: ${ps.streak||0} dias\n`;
    text+=`Tempo estimado: ~${Math.floor(st.estMinutes/60)}h${st.estMinutes%60}min\n\n`;
    text+='Por disciplina:\n';
    Object.entries(st.byDisc).forEach(([disc,d])=>{
      const info=DISCIPLINES[disc]||{label:disc};
      const pct=d.total?Math.round(d.done/d.total*100):0;
      text+=`  ${info.label}: ${d.done}/${d.total} (${pct}%)\n`;
    });
    text+='\n'+'-'.repeat(40)+'\n\n';
  });
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`escola-liberal-relatorio-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();URL.revokeObjectURL(a.href);
  toast('Relatório exportado!')
}

// ============================================================
// BADGES / ACHIEVEMENTS PAGE
// ============================================================
function getAllBadges(){
  const totalL=M.reduce((s,m)=>s+m.lessons.length,0);
  const totalQ=totalL;
  const half=Math.floor(totalL/2);
  const badges=[
    {id:'first',e:'🎯',n:'Primeira Aula',d:'Complete sua primeira aula',check:()=>Object.keys(S.done).length>=1},
    {id:'five',e:'💡',n:'Curioso',d:'Complete 5 aulas',check:()=>Object.keys(S.done).length>=5},
    {id:'ten',e:'📚',n:'Estudioso',d:'Complete 10 aulas',check:()=>Object.keys(S.done).length>=10},
    {id:'twenty',e:'🔥',n:'Dedicado',d:'Complete 20 aulas',check:()=>Object.keys(S.done).length>=20},
    {id:'thirty',e:'💪',n:'Incansável',d:'Complete 30 aulas',check:()=>Object.keys(S.done).length>=30},
    {id:'half',e:'🌟',n:'Meio Caminho',d:`Complete ${half} de ${totalL} aulas`,check:()=>Object.keys(S.done).length>=half}
  ];
  // Dynamic module badges
  M.forEach((m,i)=>{
    badges.push({id:'mod'+i,e:m.icon,n:m.title,d:`Conclua "${m.title}"`,check:()=>M[i].lessons.every((_,li)=>S.done[`${i}-${li}`])});
  });
  // Discipline badges
  Object.entries(DISCIPLINES).forEach(([key,d])=>{
    const mods=getDiscModules(key);
    if(mods.length===0)return;
    badges.push({id:'disc_'+key,e:'🏆',n:d.label+' Completa',d:`Conclua todos os módulos de ${d.label}`,check:()=>mods.every(x=>x.mod.lessons.every((_,li)=>S.done[`${x.idx}-${li}`]))});
  });
  badges.push(
    {id:'streak3',e:'🔥',n:'3 Dias Seguidos',d:'Mantenha uma sequência de 3 dias',check:()=>S.streak>=3},
    {id:'streak7',e:'🔥',n:'Semana Perfeita',d:'7 dias consecutivos',check:()=>S.streak>=7},
    {id:'streak30',e:'💎',n:'Mês de Fogo',d:'30 dias consecutivos',check:()=>S.streak>=30},
    {id:'quiz80',e:'🎯',n:'Precisão 80%',d:'80%+ de acerto nos quizzes',check:()=>{const qt=Object.keys(S.quiz).length;const qc=Object.values(S.quiz).filter(v=>v).length;return qt>=10&&qc/qt>=.8}},
    {id:'quiz100',e:'💯',n:'Perfeição',d:'100% de acerto em todos os quizzes',check:()=>Object.keys(S.quiz).length>=totalQ&&Object.values(S.quiz).every(v=>v)},
    {id:'lvl3',e:'📈',n:'Nível 3',d:'Alcance o nível 3',check:()=>S.lvl>=3},
    {id:'lvl5',e:'📈',n:'Nível 5',d:'Alcance o nível 5',check:()=>S.lvl>=5},
    {id:'lvl10',e:'👑',n:'Nível 10',d:'Alcance o nível 10',check:()=>S.lvl>=10},
    {id:'master',e:'👑',n:'Mestre Total',d:`Complete todas as ${totalL} aulas`,check:()=>Object.keys(S.done).length>=totalL},
    {id:'notes5',e:'📝',n:'Anotador',d:'Faça anotações em 5 aulas',check:()=>{try{const n=JSON.parse(localStorage.getItem('escola_notes')||'{}');return Object.keys(n).length>=5}catch(e){return false}}},
    {id:'favs3',e:'⭐',n:'Colecionador',d:'Adicione 3 favoritos',check:()=>{try{return(JSON.parse(localStorage.getItem(FAV_KEY)||'[]')).length>=3}catch(e){return false}}},
    {id:'league_silver',e:'🥈',n:'Liga Prata',d:'Alcance a Liga Prata',check:()=>{try{const lb=JSON.parse(localStorage.getItem(LB_KEY)||'{}');return(lb.league||0)>=1}catch(e){return false}}},
    {id:'league_gold',e:'🥇',n:'Liga Ouro',d:'Alcance a Liga Ouro',check:()=>{try{const lb=JSON.parse(localStorage.getItem(LB_KEY)||'{}');return(lb.league||0)>=2}catch(e){return false}}},
    {id:'league_diamond',e:'💎',n:'Liga Diamante',d:'Alcance a Liga Diamante',check:()=>{try{const lb=JSON.parse(localStorage.getItem(LB_KEY)||'{}');return(lb.league||0)>=3}catch(e){return false}}},
    {id:'league_ruby',e:'❤️‍🔥',n:'Liga Rubi',d:'Alcance a liga máxima',check:()=>{try{const lb=JSON.parse(localStorage.getItem(LB_KEY)||'{}');return(lb.league||0)>=4}catch(e){return false}}}
  );
  return badges;
}
const ALL_BADGES=[];
function goBadges(){
  hideAllViews();setNav('nBadges');
  document.getElementById('vBadges').classList.add('on');
  const badges=getAllBadges();
  const unlocked=badges.filter(b=>b.check()).length;
  const total=badges.length;
  const pct=Math.round(unlocked/total*100);
  document.getElementById('badgesProgress').innerHTML=`<div class="bp-num">${unlocked}/${total}</div><div class="bp-info"><div class="bp-label">${pct}% das conquistas desbloqueadas</div><div class="bp-bar"><div class="bp-fill" style="width:${pct}%"></div></div></div>`;
  document.getElementById('badgesGrid').innerHTML=badges.map(b=>{
    const on=b.check();
    const safeName=b.n.replace(/'/g,"\\'");
    const badgeAction=on?`onclick="toast('${b.e} ${safeName} — Conquista desbloqueada!')"`:b.id.startsWith('mod')?`onclick="goMod(${b.id.replace('mod','')})"`:b.id==='first'||b.id==='five'||b.id==='ten'||b.id==='twenty'||b.id==='thirty'||b.id==='half'||b.id==='master'?`onclick="goNextLesson()"`:b.id.startsWith('streak')?`onclick="goDash()"`:b.id.startsWith('quiz')?`onclick="goNextQuiz()"`:`onclick="goDash()"`;

    return`<div class="badge-card ${on?'unlocked':'locked'}" ${badgeAction} style="cursor:pointer"><span class="badge-icon">${b.e}</span><div class="badge-name">${b.n}</div><div class="badge-desc">${b.d}</div>${on?'<div class="badge-check">✓</div>':'<div class="badge-hint">Toque para avançar →</div>'}</div>`
  }).join('')
}

// ============================================================
// EXAM / SIMULADO
// ============================================================
let examQs=[],examAns=[],examIdx=0;
function startExam(){
  hideAllViews();setNav('nExam');
  document.getElementById('vExam').classList.add('on');
  examQs=[];examAns=[];examIdx=0;
  // Pick 2-3 questions per module randomly
  M.forEach((m,mi)=>{
    const available=m.lessons.filter(l=>l.quiz).map((l,li)=>({mi,li,q:l.quiz,mod:m.title,icon:m.icon}));
    const shuffled=available.sort(()=>Math.random()-.5).slice(0,3);
    examQs.push(...shuffled)
  });
  examQs.sort(()=>Math.random()-.5);
  examAns=new Array(examQs.length).fill(-1);
  renderExamQ()
}
function renderExamQ(){
  if(examIdx>=examQs.length){renderExamResult();return}
  const q=examQs[examIdx];
  const pct=Math.round(examIdx/examQs.length*100);
  document.getElementById('examContent').innerHTML=`
    <div class="exam-progress"><div class="exam-pbar"><div class="exam-pfill" style="width:${pct}%"></div></div><div class="exam-count">${examIdx+1}/${examQs.length}</div></div>
    <div class="exam-q"><div class="eq-mod">${q.icon} ${q.mod}</div><h3>${q.q.q}</h3></div>
    <div class="exam-opts">${q.q.o.map((o,i)=>`<button class="exam-o${examAns[examIdx]===i?' sel':''}" onclick="examSelect(${i})">${o}</button>`).join('')}</div>
    <div class="exam-nav"><button class="btn btn-ghost" onclick="examNav(-1)" ${examIdx===0?'disabled':''}>← Anterior</button><button class="btn btn-sage" onclick="examNav(1)">${examIdx===examQs.length-1?'Finalizar':'Próxima →'}</button></div>`
}
function examSelect(i){examAns[examIdx]=i;renderExamQ()}
function examNav(dir){
  if(dir===1&&examIdx===examQs.length-1){renderExamResult();return}
  examIdx=Math.max(0,Math.min(examQs.length-1,examIdx+dir));renderExamQ()
}
function renderExamResult(){
  let correct=0;const byMod={};
  examQs.forEach((q,i)=>{
    const ok=examAns[i]===q.q.c;if(ok)correct++;
    const k=q.mi;if(!byMod[k])byMod[k]={ok:0,total:0,icon:q.icon,name:q.mod};
    byMod[k].total++;if(ok)byMod[k].ok++
  });
  const pct=Math.round(correct/examQs.length*100);
  const pass=pct>=70;
  let html=`<div class="exam-result"><h2>${pass?'Aprovado!':'Continue Estudando'}</h2><div class="exam-grade ${pass?'pass':'fail'}">${pct}%</div><p style="color:var(--text-secondary);margin-bottom:.5rem">${correct}/${examQs.length} questões corretas</p><div class="exam-breakdown">`;
  Object.values(byMod).forEach(m=>{
    html+=`<div class="exam-bmod"><span class="exam-bmod-icon">${m.icon}</span><span class="exam-bmod-info">${m.name}</span><span class="exam-bmod-score">${m.ok}/${m.total}</span></div>`
  });
  html+=`</div><div style="margin-top:1.5rem;display:flex;gap:.75rem;justify-content:center"><button class="btn btn-sage" onclick="startExam()">Novo Simulado</button><button class="btn btn-ghost" onclick="goDash()">Dashboard</button></div></div>`;
  document.getElementById('examContent').innerHTML=html;
  if(pass)launchConfetti();
  logActivity('exam',`Simulado: ${pct}%`)
}
function endExam(){goDash()}

// ============================================================
// STUDY TIMELINE
// ============================================================
const TIMELINE_KEY='escola_timeline';
function loadTimeline(){try{return JSON.parse(localStorage.getItem(TIMELINE_KEY))||[]}catch(e){return[]}}
function saveTimeline(t){localStorage.setItem(TIMELINE_KEY,JSON.stringify(t.slice(-200)));if(typeof queueSync==='function')queueSync('timeline',t)}
function logActivity(type,text){
  const tl=loadTimeline();
  tl.push({type,text,ts:Date.now()});
  saveTimeline(tl)
}
function goTimeline(){
  hideAllViews();setNav('nTimeline');
  document.getElementById('vTimeline').classList.add('on');
  const tl=loadTimeline().slice().reverse();
  if(!tl.length){document.getElementById('timelineContent').innerHTML='<div class="timeline-empty">📅 Nenhuma atividade registrada ainda.<br>Comece a estudar para ver seu histórico!</div>';return}
  const grouped={};
  tl.forEach(e=>{
    const d=new Date(e.ts).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    if(!grouped[d])grouped[d]=[];
    grouped[d].push(e)
  });
  let html='';
  Object.entries(grouped).slice(0,14).forEach(([day,events])=>{
    html+=`<div class="timeline-day"><div class="timeline-date">${day}</div><div class="timeline-items">`;
    events.slice(0,20).forEach(e=>{
      const time=new Date(e.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const icons={lesson:'📖',quiz:'🧪',daily:'🌟',exam:'📝',level:'📈',module:'🏆',badge:'🏅'};
      html+=`<div class="timeline-item"><span class="ti-time">${time}</span><span class="ti-icon">${icons[e.type]||'📌'}</span><span class="ti-text">${e.text}</span></div>`
    });
    html+=`</div></div>`
  });
  document.getElementById('timelineContent').innerHTML=html
}

// ============================================================
// CONFETTI ANIMATIONS
// ============================================================
function launchConfetti(){
  const container=document.createElement('div');container.className='confetti-container';
  const colors=['#4a9e7e','#dba550','#e07460','#5b9bd5','#9b7ed8','#5bd59b','#f0d078'];
  for(let i=0;i<60;i++){
    const piece=document.createElement('div');piece.className='confetti-piece';
    piece.style.left=Math.random()*100+'%';
    piece.style.background=colors[Math.floor(Math.random()*colors.length)];
    piece.style.animationDelay=Math.random()*1.5+'s';
    piece.style.animationDuration=(2+Math.random()*2)+'s';
    piece.style.width=(6+Math.random()*8)+'px';
    piece.style.height=(6+Math.random()*8)+'px';
    piece.style.borderRadius=Math.random()>.5?'50%':'2px';
    piece.style.transform=`rotate(${Math.random()*360}deg)`;
    container.appendChild(piece)
  }
  document.body.appendChild(container);
  setTimeout(()=>container.remove(),4000)
}

// ============================================================
// CERTIFICATE AS IMAGE / PDF (CANVAS EXPORT)
// ============================================================
function _drawCert(ctx,w,h,mi){
  const m=M[mi];
  const disc=DISCIPLINES[m.discipline||'economia']||{label:'Economia'};
  const nLessons=m.lessons.length;
  const hours=Math.max(1,Math.round(nLessons*5/60));
  const quizOk=m.lessons.filter((_,li)=>S.quiz[`${mi}-${li}`]).length;
  const quizTotal=m.lessons.filter(l=>l.quiz).length;
  const certHash=_certId(mi);
  // Background
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#0f1729');grad.addColorStop(1,'#1a2540');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  // Double border
  ctx.strokeStyle='#dba550';ctx.lineWidth=4;ctx.strokeRect(20,20,w-40,h-40);
  ctx.strokeStyle='rgba(219,165,80,.3)';ctx.lineWidth=1;ctx.strokeRect(32,32,w-64,h-64);
  // Corner ornaments
  const co=[[40,40],[w-40,40],[40,h-40],[w-40,h-40]];
  ctx.fillStyle='#dba550';co.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill()});
  // Seal
  ctx.font='52px serif';ctx.textAlign='center';ctx.fillStyle='#dba550';ctx.fillText('🏅',w/2,95);
  // Title
  ctx.font='bold 30px Georgia';ctx.fillStyle='#e8e6e1';ctx.fillText('Certificado de Conclusão',w/2,145);
  // Subtitle
  ctx.font='15px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Escola Liberal — Plataforma Homeschool',w/2,175);
  // Divider
  ctx.beginPath();ctx.moveTo(w*0.2,200);ctx.lineTo(w*0.8,200);ctx.strokeStyle='rgba(219,165,80,.3)';ctx.lineWidth=1;ctx.stroke();
  // "Certificamos que"
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('Certificamos que',w/2,235);
  // Name
  ctx.font='italic 38px Georgia';ctx.fillStyle='#4a9e7e';ctx.fillText(S.name,w/2,285);
  // "concluiu com êxito"
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';ctx.fillText('concluiu com êxito o módulo',w/2,320);
  // Module title
  ctx.font='bold 22px sans-serif';ctx.fillStyle='#e8e6e1';ctx.fillText(m.title,w/2,358);
  // Details
  ctx.font='13px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(`${disc.label} · ${nLessons} aulas · ${hours}h de carga horária${quizTotal?` · ${Math.round(quizOk/quizTotal*100)}% nos quizzes`:''}`,w/2,390);
  // Divider 2
  ctx.beginPath();ctx.moveTo(w*0.25,415);ctx.lineTo(w*0.75,415);ctx.strokeStyle='rgba(219,165,80,.2)';ctx.stroke();
  // Date
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}),w/2,445);
  // Cert ID
  ctx.font='11px monospace';ctx.fillStyle='#6b7488';
  ctx.fillText(`Certificado ${certHash} · escolaliberal.com.br`,w/2,475);
  // Footer
  ctx.font='11px sans-serif';ctx.fillStyle='#4a5568';
  ctx.fillText('Este certificado atesta a conclusão do módulo na plataforma Escola Liberal.',w/2,h-52);
}

function exportCertImage(mi){
  const m=M[mi];const c=document.createElement('canvas');c.width=900;c.height=560;
  const ctx=c.getContext('2d');
  _drawCert(ctx,900,560,mi);
  const link=document.createElement('a');link.download=`certificado-${m.title.replace(/\s/g,'-').toLowerCase()}.png`;
  link.href=c.toDataURL('image/png');link.click();
  toast('Certificado PNG salvo!')
}

function exportCertPDF(mi){
  const m=M[mi];
  // Create landscape A4-proportioned canvas (higher res for PDF quality)
  const c=document.createElement('canvas');c.width=1190;c.height=842;
  const ctx=c.getContext('2d');
  _drawCert(ctx,1190,842,mi);
  // Convert to PDF using canvas data
  const imgData=c.toDataURL('image/png');
  // Build minimal PDF with embedded image
  const pdfW=841.89;const pdfH=595.28; // A4 landscape in points
  const imgW=pdfW-40;const imgH=pdfH-40;
  const stream=atob(imgData.split(',')[1]);
  const bytes=new Uint8Array(stream.length);
  for(let i=0;i<stream.length;i++)bytes[i]=stream.charCodeAt(i);

  // Minimal PDF structure
  let pdf='%PDF-1.4\n';
  const offsets=[];
  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf+='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  // Object 2: Pages
  offsets.push(pdf.length);
  pdf+='2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  // Object 3: Page
  offsets.push(pdf.length);
  pdf+=`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`;
  // Object 4: Content stream (draw image)
  const contentStr=`q ${imgW} 0 0 ${imgH} 20 20 cm /Img Do Q`;
  offsets.push(pdf.length);
  pdf+=`4 0 obj\n<< /Length ${contentStr.length} >>\nstream\n${contentStr}\nendstream\nendobj\n`;
  // Object 5: Image XObject — we need binary, so we build ArrayBuffer
  const imgHeader=`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length `;

  // Use JPEG for smaller file (re-encode canvas)
  const jpegData=c.toDataURL('image/jpeg',0.92);
  const jpegBin=atob(jpegData.split(',')[1]);
  const jpegBytes=new Uint8Array(jpegBin.length);
  for(let i=0;i<jpegBin.length;i++)jpegBytes[i]=jpegBin.charCodeAt(i);

  const imgObjStr=imgHeader+jpegBytes.length+' >>\nstream\n';
  const imgEndStr='\nendstream\nendobj\n';

  // Build xref
  const pdfStart=new TextEncoder().encode(pdf);
  const imgStart=new TextEncoder().encode(imgObjStr);
  const imgEnd=new TextEncoder().encode(imgEndStr);

  offsets.push(pdfStart.length); // offset for obj 5

  const xrefOffset=pdfStart.length+imgStart.length+jpegBytes.length+imgEnd.length;
  let xref=`xref\n0 6\n0000000000 65535 f \n`;
  offsets.forEach(o=>{xref+=String(o).padStart(10,'0')+' 00000 n \n'});
  xref+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const xrefBytes=new TextEncoder().encode(xref);

  // Combine all parts
  const total=new Uint8Array(pdfStart.length+imgStart.length+jpegBytes.length+imgEnd.length+xrefBytes.length);
  let pos=0;
  total.set(pdfStart,pos);pos+=pdfStart.length;
  total.set(imgStart,pos);pos+=imgStart.length;
  total.set(jpegBytes,pos);pos+=jpegBytes.length;
  total.set(imgEnd,pos);pos+=imgEnd.length;
  total.set(xrefBytes,pos);

  const blob=new Blob([total],{type:'application/pdf'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`certificado-${m.title.replace(/\s/g,'-').toLowerCase()}.pdf`;
  a.click();URL.revokeObjectURL(a.href);
  toast('Certificado PDF salvo!')
}

// ============================================================
// SPACED REPETITION (LEITNER SYSTEM)
// ============================================================
const SPACED_KEY='escola_spaced';
function loadSpaced(){try{return JSON.parse(localStorage.getItem(SPACED_KEY))||{}}catch(e){return{}}}
function saveSpaced(d){localStorage.setItem(SPACED_KEY,JSON.stringify(d))}
function initSpaced(){
  const data=loadSpaced();let changed=false;
  GLOSSARY.forEach(g=>{
    if(!data[g.term]){data[g.term]={box:1,next:Date.now(),reviews:0};changed=true}
  });
  if(changed)saveSpaced(data);return data
}
function goSpaced(){
  hideAllViews();setNav('nSpaced');
  document.getElementById('vSpaced').classList.add('on');
  const data=initSpaced();
  const now=Date.now();
  const due=Object.entries(data).filter(([_,v])=>v.next<=now);
  const byBox=[0,0,0,0,0];
  Object.values(data).forEach(v=>{byBox[Math.min(v.box-1,4)]++});
  document.getElementById('spacedStats').innerHTML=`
    <div class="sr-stat"><div class="sr-stat-val" style="color:var(--coral)">${due.length}</div><div class="sr-stat-lbl">Para Revisar</div></div>
    <div class="sr-stat"><div class="sr-stat-val" style="color:var(--sage)">${byBox[3]+byBox[4]}</div><div class="sr-stat-lbl">Dominados</div></div>
    <div class="sr-stat"><div class="sr-stat-val">${Object.keys(data).length}</div><div class="sr-stat-lbl">Total</div></div>`;
  if(due.length>0){
    renderSpacedReview(due[0][0],data)
  }else{
    let html='<p style="text-align:center;color:var(--sage);font-weight:600;margin:1.5rem 0">✓ Nenhum termo para revisar agora!</p>';
    html+='<h3 style="font-family:\'DM Sans\',sans-serif;font-size:.85rem;font-weight:600;color:var(--text-muted);margin-bottom:.75rem">Todos os Termos</h3>';
    Object.entries(data).sort((a,b)=>a[1].box-b[1].box).forEach(([term,v])=>{
      const intervals=['','Hoje','Amanhã','3 dias','7 dias','14 dias'];
      html+=`<div class="sr-card"><span class="sr-box sr-box-${Math.min(v.box,5)}">Caixa ${v.box}</span><span class="sr-term">${term}</span><span class="sr-due">${intervals[Math.min(v.box,5)]||'Dominado'}</span></div>`
    });
    document.getElementById('spacedContent').innerHTML=html
  }
}
function renderSpacedReview(term,data){
  const g=GLOSSARY.find(g=>g.term===term);
  if(!g){goSpaced();return}
  const due=Object.entries(data).filter(([_,v])=>v.next<=Date.now()).length;
  document.getElementById('spacedContent').innerHTML=`
    <div style="text-align:center;margin-bottom:1.5rem"><span style="font-size:.82rem;color:var(--text-muted)">${due} termos restantes</span></div>
    <div class="flash-container" onclick="document.getElementById('srAnswer').style.display='block'" style="cursor:pointer;min-height:160px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);display:flex;align-items:center;justify-content:center;padding:2rem">
      <div style="text-align:center"><h3 style="font-size:1.2rem;margin-bottom:.4rem">${g.term}</h3><span style="font-size:.72rem;color:var(--text-muted)">Clique para ver a resposta</span></div>
    </div>
    <div id="srAnswer" style="display:none;margin-top:1rem;text-align:center">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.5rem;margin-bottom:1rem"><p style="font-size:.9rem;color:var(--text-secondary);line-height:1.6">${g.def}</p></div>
      <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.75rem">Você lembrou?</p>
      <div style="display:flex;gap:.5rem;justify-content:center">
        <button class="btn" style="background:var(--coral-muted);color:var(--coral);border:1px solid var(--coral)" onclick="spacedAnswer('${g.term}',false)">Não lembrei</button>
        <button class="btn" style="background:var(--sage-subtle);color:var(--sage);border:1px solid var(--sage)" onclick="spacedAnswer('${g.term}',true)">Lembrei!</button>
      </div>
    </div>`
}
function spacedAnswer(term,correct){
  const data=loadSpaced();
  if(data[term]){
    if(correct){data[term].box=Math.min(data[term].box+1,5)}
    else{data[term].box=1}
    const intervals=[0,0,864e5,864e5*3,864e5*7,864e5*14];
    data[term].next=Date.now()+intervals[data[term].box];
    data[term].reviews++;
    saveSpaced(data)
  }
  logActivity('badge',`Revisão: ${term} — ${correct?'Acertou':'Errou'}`);
  // Next due
  const due=Object.entries(data).filter(([_,v])=>v.next<=Date.now());
  if(due.length>0)renderSpacedReview(due[0][0],data);
  else goSpaced()
}

// ============================================================
// STUDY PLAN — PLANO DE ESTUDOS PERSONALIZADO
// ============================================================
function goStudyPlan(){
  hideAllViews();setNav('nStudyPlan');
  document.getElementById('vStudyPlan').classList.add('on');
  try{history.pushState({view:'studyplan'},'')}catch(e){}
  renderStudyPlan()
}

function analyzeProgress(){
  const totalL=M.reduce((s,m)=>s+m.lessons.length,0);
  const doneCount=Object.keys(S.done).length;
  const quizTotal=Object.keys(S.quiz).length;
  const quizCorrect=Object.values(S.quiz).filter(v=>v).length;
  const quizPct=quizTotal?Math.round(quizCorrect/quizTotal*100):0;

  // Per-discipline analysis
  const discAnalysis={};
  Object.entries(DISCIPLINES).forEach(([key,d])=>{
    const mods=M.map((m,i)=>({m,i})).filter(x=>(x.m.discipline||'economia')===key);
    if(!mods.length)return;
    let done=0,total=0,qOk=0,qTotal=0;
    mods.forEach(({m,i})=>{
      m.lessons.forEach((_,li)=>{
        total++;
        if(S.done[`${i}-${li}`])done++;
        if(S.quiz[`${i}-${li}`]!==undefined){qTotal++;if(S.quiz[`${i}-${li}`])qOk++}
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
      if(!isModUnlocked(i))continue;
      for(let li=0;li<m.lessons.length;li++){
        if(!S.done[`${i}-${li}`]){
          nextLessons.push({mi:i,li,title:m.lessons[li].title,mod:m.title,icon:m.icon,disc:key,discLabel:d.label});
          break
        }
      }
      if(nextLessons.filter(n=>n.disc===key).length)break
    }
  });

  // Study streak analysis
  const daysActive=(S.streakDays||[]).length;
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
  if(S.streak<3)html+=`<div class="sp-tip">🔥 Estude todos os dias para manter sua sequência. Consistência vale mais que intensidade!</div>`;
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
  hideAllViews();setNav('nExamPrep');
  document.getElementById('vExamPrep').classList.add('on');
  renderExamPrepSelector()
}

function renderExamPrepSelector(){
  const el=document.getElementById('examPrepContent');
  let html=`<div class="ep-intro">
    <p>Selecione uma disciplina para gerar um caderno de revisão com resumos, quizzes errados e conceitos-chave.</p>
  </div><div class="ep-disc-list">`;
  Object.entries(DISCIPLINES).forEach(([key,d])=>{
    const mods=getDiscModules(key);
    if(!mods.length)return;
    let done=0,total=0,wrongQ=0;
    mods.forEach(({mod,idx})=>{
      mod.lessons.forEach((_,li)=>{
        total++;if(S.done[`${idx}-${li}`])done++;
        if(S.quiz[`${idx}-${li}`]===false)wrongQ++
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
  const d=DISCIPLINES[disc];if(!d)return;
  const mods=getDiscModules(disc);
  const el=document.getElementById('examPrepContent');

  // Collect wrong quizzes
  const wrongs=[];
  mods.forEach(({mod,idx})=>{
    mod.lessons.forEach((l,li)=>{
      if(S.quiz[`${idx}-${li}`]===false&&l.quiz){
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
      if(S.done[`${idx}-${li}`]&&l.content){
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

// ============================================================
// LEADERBOARD — LIGAS SEMANAIS (estilo Duolingo)
// ============================================================
const LEAGUES=[
  {id:'bronze',name:'Bronze',icon:'🥉',color:'#cd7f32',promote:3,demote:0,minXP:0},
  {id:'silver',name:'Prata',icon:'🥈',color:'#c0c0c0',promote:3,demote:3,minXP:50},
  {id:'gold',name:'Ouro',icon:'🥇',color:'#ffd700',promote:3,demote:3,minXP:150},
  {id:'diamond',name:'Diamante',icon:'💎',color:'#b9f2ff',promote:3,demote:3,minXP:300},
  {id:'ruby',name:'Rubi',icon:'❤️‍🔥',color:'#e0115f',promote:0,demote:3,minXP:500}
];
const LB_KEY='escola_leaderboard';
const LB_NAMES=['Ana','Pedro','Lucas','Maria','João','Sofia','Gabriel','Julia','Rafael','Laura','Miguel','Isabella','Arthur','Helena','Bernardo','Alice','Davi','Manuela','Lorenzo','Valentina','Theo','Lara','Heitor','Cecília','Matheus','Beatriz','Felipe','Lívia','Enzo','Clara'];
const LB_AVATARS=['🧑‍🎓','👧','👦','👩','🧒','👨‍🎓','🧑','👩‍💻','👨‍💻','🧒'];

function getLBState(){
  try{
    const raw=localStorage.getItem(LB_KEY);
    if(raw){const st=JSON.parse(raw);if(st.weekId===getCurrentWeekId())return st}
  }catch(e){}
  return initLeaderboardWeek()
}
function saveLBState(st){try{localStorage.setItem(LB_KEY,JSON.stringify(st))}catch(e){}}

function getCurrentWeekId(){
  const d=new Date();
  const jan1=new Date(d.getFullYear(),0,1);
  const week=Math.ceil(((d-jan1)/864e5+jan1.getDay()+1)/7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`
}

function getWeekEndDate(){
  const d=new Date();
  const day=d.getDay();
  const diff=day===0?0:7-day;
  const end=new Date(d);
  end.setDate(end.getDate()+diff);
  end.setHours(23,59,59,999);
  return end
}

function initLeaderboardWeek(){
  const prev=(() => {try{return JSON.parse(localStorage.getItem(LB_KEY))}catch(e){return null}})();
  let league=0;
  if(prev&&prev.league!==undefined){
    league=prev.league;
    const prevRank=prev.competitors?prev.competitors.findIndex(c=>c.isUser)+1:1;
    const L=LEAGUES[league];
    if(L.promote>0&&prevRank>0&&prevRank<=L.promote&&league<LEAGUES.length-1)league++;
    else if(L.demote>0&&prevRank>prev.competitors.length-L.demote&&league>0)league--;
  }
  const competitors=generateCompetitors(league);
  const st={weekId:getCurrentWeekId(),league,competitors,userWeekXP:0};
  saveLBState(st);
  return st
}

function generateCompetitors(league){
  const weekSeed=getCurrentWeekId().split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const rng=(i)=>{let s=weekSeed*31+i*17+league*7;return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff}};
  const L=LEAGUES[league];
  const count=15;
  const used=new Set();
  const comps=[];
  for(let i=0;i<count-1;i++){
    const r=rng(i);
    let ni;do{ni=Math.floor(r()*LB_NAMES.length)}while(used.has(ni));
    used.add(ni);
    const baseXP=Math.floor(L.minXP*0.3+r()*L.minXP*2.5);
    const dayProgress=Math.min(1,(new Date().getDay()||7)/7);
    const xp=Math.floor(baseXP*dayProgress*(0.4+r()*0.6));
    comps.push({name:LB_NAMES[ni],avatar:LB_AVATARS[i%LB_AVATARS.length],xp,isUser:false})
  }
  comps.push({name:S.name||'Você',avatar:S.avatar||'🧑‍🎓',xp:0,isUser:true});
  return comps
}

function updateLeaderboardXP(earned){
  const st=getLBState();
  st.userWeekXP+=earned;
  const userComp=st.competitors.find(c=>c.isUser);
  if(userComp){userComp.xp=st.userWeekXP;userComp.name=S.name||'Você';userComp.avatar=S.avatar||'🧑‍🎓'}
  saveLBState(st);
  // Sync to Supabase if authenticated
  _syncLeaderboardXP(st.userWeekXP,st.league)
}

async function _syncLeaderboardXP(xp,league){
  if(typeof sbClient==='undefined'||!sbClient||typeof currentUser==='undefined'||!currentUser)return;
  try{
    await sbClient.from('weekly_xp').upsert({
      user_id:currentUser.id,
      week_id:getCurrentWeekId(),
      xp,league,
      name:S.name||'Aluno',
      avatar:S.avatar||'🧑‍🎓',
      updated_at:new Date().toISOString()
    },{onConflict:'user_id,week_id'})
  }catch(e){/* silent — local data is primary */}
}

async function _fetchRealLeaderboard(){
  if(typeof sbClient==='undefined'||!sbClient||typeof currentUser==='undefined'||!currentUser)return null;
  try{
    const{data}=await sbClient.from('weekly_xp')
      .select('user_id,name,avatar,xp,league')
      .eq('week_id',getCurrentWeekId())
      .order('xp',{ascending:false})
      .limit(20);
    return data&&data.length>1?data:null // Need at least 2 real users
  }catch(e){return null}
}

function goLeaderboard(){
  hideAllViews();setNav('nLeaderboard');
  document.getElementById('vLeaderboard').classList.add('on');
  try{history.pushState({view:'leaderboard'},'')}catch(e){}
  // Try real data first, fallback to local
  _fetchRealLeaderboard().then(realData=>{
    if(realData)renderLeaderboardReal(realData);
    else renderLeaderboard()
  }).catch(()=>renderLeaderboard())
}

function renderLeaderboardReal(data){
  const st=getLBState();
  const L=LEAGUES[st.league];
  const hasUser=data.some(d=>d.user_id===currentUser?.id);
  const sorted=data.map(d=>({
    name:d.name||'Aluno',avatar:d.avatar||'🧑‍🎓',xp:d.xp||0,
    isUser:d.user_id===currentUser?.id
  }));
  if(!hasUser)sorted.push({name:S.name||'Você',avatar:S.avatar||'🧑‍🎓',xp:st.userWeekXP,isUser:true});
  sorted.sort((a,b)=>b.xp-a.xp);
  // Reuse render logic with real data
  const userRank=sorted.findIndex(c=>c.isUser)+1;
  document.getElementById('lbBanner').innerHTML=
    `<div class="lb-league-icon" style="color:${L.color}">${L.icon}</div>`+
    `<div class="lb-league-info"><div class="lb-league-name" style="color:${L.color}">Liga ${L.name}</div>`+
    `<div class="lb-league-desc">${getLeagueDesc(st.league,userRank,sorted.length)} <span style="font-size:.7rem;color:var(--sage)">· Ranking real</span></div></div>`;
  const end=getWeekEndDate();const diff=end-new Date();const days=Math.floor(diff/864e5);const hrs=Math.floor((diff%864e5)/36e5);
  document.getElementById('lbTimer').innerHTML=`<span class="lb-timer-icon">⏳</span> Semana encerra em <strong>${days}d ${hrs}h</strong>`;
  document.getElementById('lbTitle').textContent=`${L.icon} Liga ${L.name}`;
  let html='';
  sorted.forEach((c,i)=>{
    const rank=i+1;const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
    html+=`<div class="lb-row ${c.isUser?'lb-row-user':''}"><div class="lb-rank">${medal||rank}</div><div class="lb-avatar">${c.avatar}</div><div class="lb-name">${c.isUser?'<strong>Você</strong>':c.name}</div><div class="lb-xp">${c.xp.toLocaleString('pt-BR')} XP</div></div>`
  });
  document.getElementById('lbTable').innerHTML=html;
  document.getElementById('lbRules').innerHTML=
    `<div class="lb-rules-title">Como funciona</div>`+
    `<div class="lb-rule">🌐 Ranking real com outros alunos da plataforma</div>`+
    `<div class="lb-rule">📅 Rankings resetam toda segunda-feira</div>`+
    `<div class="lb-rule">⭐ Ganhe XP completando aulas, quizzes e maratonas</div>`+
    `<div class="lb-leagues-row">${LEAGUES.map((l,i)=>`<span class="lb-league-chip${i===st.league?' active':''}" style="${i===st.league?'background:'+l.color:''}"><span>${l.icon}</span><span>${l.name}</span></span>`).join('')}</div>`
}

function renderLeaderboard(){
  const st=getLBState();
  const L=LEAGUES[st.league];
  const sorted=[...st.competitors].sort((a,b)=>b.xp-a.xp);
  const userRank=sorted.findIndex(c=>c.isUser)+1;

  // Banner
  document.getElementById('lbBanner').innerHTML=
    `<div class="lb-league-icon" style="color:${L.color}">${L.icon}</div>`+
    `<div class="lb-league-info">`+
      `<div class="lb-league-name" style="color:${L.color}">Liga ${L.name}</div>`+
      `<div class="lb-league-desc">${getLeagueDesc(st.league,userRank,sorted.length)}</div>`+
    `</div>`;

  // Timer
  const end=getWeekEndDate();
  const now=new Date();
  const diff=end-now;
  const days=Math.floor(diff/864e5);
  const hrs=Math.floor((diff%864e5)/36e5);
  document.getElementById('lbTimer').innerHTML=
    `<span class="lb-timer-icon">⏳</span> Semana encerra em <strong>${days}d ${hrs}h</strong>`;

  // Title
  document.getElementById('lbTitle').textContent=`${L.icon} Liga ${L.name}`;

  // Table
  let html='';
  sorted.forEach((c,i)=>{
    const rank=i+1;
    const isPromo=L.promote>0&&rank<=L.promote&&st.league<LEAGUES.length-1;
    const isDemo=L.demote>0&&rank>sorted.length-L.demote&&st.league>0;
    const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
    const cls=c.isUser?'lb-row-user':'';
    const zone=isPromo?'lb-row-promote':isDemo?'lb-row-demote':'';
    html+=`<div class="lb-row ${cls} ${zone}">`+
      `<div class="lb-rank">${medal||rank}</div>`+
      `<div class="lb-avatar">${c.avatar}</div>`+
      `<div class="lb-name">${c.isUser?'<strong>Você</strong>':c.name}</div>`+
      `<div class="lb-xp">${c.xp.toLocaleString('pt-BR')} XP</div>`+
    `</div>`
  });
  document.getElementById('lbTable').innerHTML=html;

  // Rules
  const promoText=st.league<LEAGUES.length-1?`<div class="lb-rule lb-rule-up">🔼 Top ${L.promote} sobem para <strong>${LEAGUES[st.league+1].icon} ${LEAGUES[st.league+1].name}</strong></div>`:'<div class="lb-rule lb-rule-up">🏆 Você está na liga máxima!</div>';
  const demoText=st.league>0?`<div class="lb-rule lb-rule-down">🔽 Últimos ${L.demote} descem para <strong>${LEAGUES[st.league-1].icon} ${LEAGUES[st.league-1].name}</strong></div>`:'';
  document.getElementById('lbRules').innerHTML=
    `<div class="lb-rules-title">Como funciona</div>`+promoText+demoText+
    `<div class="lb-rule">📅 Rankings resetam toda segunda-feira</div>`+
    `<div class="lb-rule">⭐ Ganhe XP completando aulas, quizzes e maratonas</div>`+
    `<div class="lb-leagues-row">${LEAGUES.map((l,i)=>`<span class="lb-league-chip${i===st.league?' active':''}" style="${i===st.league?'background:'+l.color:''}"><span>${l.icon}</span><span>${l.name}</span></span>`).join('')}</div>`
}

function renderLeaderboardWidget(){
  const el=document.getElementById('leaderboardWidget');
  if(!el)return;
  try{
    const st=getLBState();
    const L=LEAGUES[st.league];
    const sorted=[...st.competitors].sort((a,b)=>b.xp-a.xp);
    const userRank=sorted.findIndex(c=>c.isUser)+1;
    const top3=sorted.slice(0,3);
    const end=getWeekEndDate();const diff=end-new Date();const days=Math.floor(diff/864e5);
    el.innerHTML=`<div class="lb-widget" onclick="goLeaderboard()" style="cursor:pointer">`+
      `<div class="lb-widget-head"><span style="color:${L.color}">${L.icon} Liga ${L.name}</span><span class="lb-widget-timer">${days}d restantes</span></div>`+
      `<div class="lb-widget-body">`+
        top3.map((c,i)=>`<div class="lb-widget-row${c.isUser?' lb-widget-you':''}">`+
          `<span class="lb-widget-rank">${['🥇','🥈','🥉'][i]}</span>`+
          `<span class="lb-widget-name">${c.isUser?'Você':c.name}</span>`+
          `<span class="lb-widget-xp">${c.xp.toLocaleString('pt-BR')} XP</span></div>`).join('')+
        (userRank>3?`<div class="lb-widget-row lb-widget-you"><span class="lb-widget-rank">${userRank}°</span><span class="lb-widget-name">Você</span><span class="lb-widget-xp">${st.userWeekXP.toLocaleString('pt-BR')} XP</span></div>`:'')+
      `</div>`+
      `<div class="lb-widget-foot">Ver ranking completo →</div>`+
    `</div>`;
  }catch(e){el.innerHTML=''}
}

function getLeagueDesc(league,rank,total){
  const L=LEAGUES[league];
  if(L.promote>0&&rank<=L.promote)return '🔥 Zona de promoção! Continue assim!';
  if(L.demote>0&&rank>total-L.demote)return '⚠️ Zona de rebaixamento — estude mais!';
  return `Posição ${rank}° de ${total} estudantes`
}

// ============================================================
// SOCIAL CHALLENGES — Desafios entre Amigos
// ============================================================
const CHALLENGE_KEY='escola_challenges';
function loadChallenges(){try{return JSON.parse(localStorage.getItem(CHALLENGE_KEY)||'[]')}catch(e){return[]}}
function saveChallenges(c){localStorage.setItem(CHALLENGE_KEY,JSON.stringify(c))}

function createChallenge(){
  const weekId=getCurrentWeekId();
  const challenge={
    id:Date.now().toString(36),
    creator:S.name||'Aluno',
    creatorAvatar:S.avatar||'🧑‍🎓',
    creatorXP:0,
    weekId,
    created:new Date().toISOString(),
    participants:[]
  };
  const challenges=loadChallenges();
  challenges.push(challenge);
  saveChallenges(challenges);

  // Share via WhatsApp
  const shareUrl=`https://escolaliberal.com.br/app.html?challenge=${challenge.id}`;
  const text=`🏆 ${S.name} te desafia!\n\nQuem consegue mais XP esta semana na Escola Liberal?\n\nAceite o desafio: ${shareUrl}`;
  const waUrl='https://wa.me/?text='+encodeURIComponent(text);
  window.open(waUrl,'_blank');
  toast('Desafio criado! Compartilhe com amigos.');
  renderChallenges()
}

function acceptChallenge(id){
  const challenges=loadChallenges();
  const ch=challenges.find(c=>c.id===id);
  if(!ch)return;
  if(!ch.participants.find(p=>p.name===S.name)){
    ch.participants.push({name:S.name,avatar:S.avatar||'🧑‍🎓',xp:0});
    saveChallenges(challenges)
  }
  toast('Desafio aceito! Ganhe XP para subir no ranking.');
  renderChallenges()
}

function updateChallengeXP(earned){
  const challenges=loadChallenges();
  const weekId=getCurrentWeekId();
  let changed=false;
  challenges.forEach(ch=>{
    if(ch.weekId!==weekId)return;
    // Update creator
    if(ch.creator===S.name){ch.creatorXP+=earned;changed=true}
    // Update participant
    const p=ch.participants.find(p=>p.name===S.name);
    if(p){p.xp+=earned;changed=true}
  });
  if(changed)saveChallenges(challenges)
}

function renderChallenges(){
  const el=document.getElementById('challengeSection');
  if(!el)return;
  const challenges=loadChallenges().filter(c=>c.weekId===getCurrentWeekId());
  if(!challenges.length){
    el.innerHTML=`<div class="ch-empty">
      <div class="ch-empty-icon">🤝</div>
      <p>Desafie amigos a estudar mais que você esta semana!</p>
      <button class="btn btn-sage" onclick="createChallenge()">Criar Desafio</button>
    </div>`;
    return
  }
  let html=`<div class="ch-header"><span>🏆 Desafios da Semana</span><button class="btn btn-ghost btn-sm" onclick="createChallenge()">+ Novo</button></div>`;
  challenges.forEach(ch=>{
    const all=[{name:ch.creator,avatar:ch.creatorAvatar,xp:ch.creatorXP},...ch.participants].sort((a,b)=>b.xp-a.xp);
    html+=`<div class="ch-card">
      <div class="ch-card-head">Criado por ${ch.creatorAvatar} ${ch.creator}</div>
      <div class="ch-ranking">${all.map((p,i)=>`<div class="ch-rank-row${p.name===S.name?' ch-rank-you':''}">
        <span class="ch-rank-pos">${['🥇','🥈','🥉'][i]||i+1+'°'}</span>
        <span class="ch-rank-avatar">${p.avatar}</span>
        <span class="ch-rank-name">${p.name===S.name?'Você':p.name}</span>
        <span class="ch-rank-xp">${p.xp} XP</span>
      </div>`).join('')}</div>
    </div>`;
  });
  el.innerHTML=html
}

// Hook challenge XP into addXP
const _origAddXP=addXP;
// We'll hook via updateChallengeXP called from addXP — already integrated via updateLeaderboardXP pattern

// ============================================================
// AI QUIZ PRACTICE — Prática Infinita com IA
// ============================================================
let aiQuizState={mi:null,li:null,questions:[],current:0,score:0,loading:false};

async function startAIQuiz(mi,li){
  if(aiQuizState.loading)return;
  const m=M[mi];const l=m.lessons[li];
  if(!l)return;
  aiQuizState={mi,li,questions:[],current:0,score:0,loading:true};

  // Show loading in a modal
  const overlay=document.createElement('div');
  overlay.className='save-modal-overlay';overlay.id='aiQuizModal';
  overlay.innerHTML=`<div class="save-modal aiq-modal">
    <button class="save-modal-close" onclick="closeAIQuiz()" aria-label="Fechar">&times;</button>
    <div class="aiq-loading"><div class="aiq-spinner"></div><h3>🤖 Gerando questões com IA...</h3><p>Analisando "${l.title}" para criar perguntas únicas</p></div>
  </div>`;
  document.body.appendChild(overlay);

  try{
    const questions=await generateAIQuestions(mi,li);
    if(!questions||questions.length===0){
      document.querySelector('#aiQuizModal .aiq-loading').innerHTML='<p>Não foi possível gerar questões agora. Tente novamente mais tarde.</p><button class="btn btn-ghost" onclick="closeAIQuiz()">Fechar</button>';
      aiQuizState.loading=false;
      return
    }
    aiQuizState.questions=questions;
    aiQuizState.loading=false;
    renderAIQuiz()
  }catch(e){
    console.warn('[AI Quiz]',e);
    document.querySelector('#aiQuizModal .aiq-loading').innerHTML='<p>Erro ao gerar questões. Verifique sua conexão.</p><button class="btn btn-ghost" onclick="closeAIQuiz()">Fechar</button>';
    aiQuizState.loading=false
  }
}

async function generateAIQuestions(mi,li){
  const m=M[mi];const l=m.lessons[li];
  const content=l.content?l.content.replace(/<[^>]*>/g,' ').substring(0,2000):'';
  const prompt=`Gere 3 questões de múltipla escolha sobre esta aula.
Aula: "${l.title}" do módulo "${m.title}".
Conteúdo: ${content}

Responda APENAS com JSON válido neste formato exato, sem texto extra:
[{"q":"pergunta","o":["opção A","opção B","opção C","opção D"],"c":0,"exp":"explicação curta"}]

Onde "c" é o índice (0-3) da resposta correta. Faça perguntas que testem compreensão, não decoreba.`;

  const headers={'Content-Type':'application/json'};
  if(typeof sbClient!=='undefined'&&sbClient){
    try{const{data}=await sbClient.auth.getSession();if(data.session)headers['Authorization']='Bearer '+data.session.access_token}catch(e){}
  }

  const SUPABASE_URL=typeof window.SUPABASE_URL!=='undefined'?window.SUPABASE_URL:'https://hwjplecfqsckfiwxiedo.supabase.co';
  const r=await fetch(SUPABASE_URL+'/functions/v1/ai-tutor',{
    method:'POST',headers,
    body:JSON.stringify({message:prompt,moduleTitle:m.title,lessonTitle:l.title,lessonContext:content,lang:typeof CURRENT_LANG!=='undefined'?CURRENT_LANG:'pt'})
  });

  if(!r.ok)throw new Error('API error '+r.status);
  const data=await r.json();
  const reply=data.reply||'';
  // Extract JSON from reply
  const jsonMatch=reply.match(/\[[\s\S]*\]/);
  if(!jsonMatch)throw new Error('No JSON in response');
  const questions=JSON.parse(jsonMatch[0]);
  // Validate structure
  return questions.filter(q=>q.q&&Array.isArray(q.o)&&q.o.length>=3&&typeof q.c==='number'&&q.exp).slice(0,5)
}

function renderAIQuiz(){
  const{questions,current,score}=aiQuizState;
  if(current>=questions.length){renderAIQuizResult();return}
  const q=questions[current];
  const modal=document.querySelector('#aiQuizModal .aiq-modal');
  if(!modal)return;
  modal.innerHTML=`
    <button class="save-modal-close" onclick="closeAIQuiz()" aria-label="Fechar">&times;</button>
    <div class="aiq-head">
      <span>🤖 Prática IA</span>
      <span class="aiq-count">${current+1}/${questions.length}</span>
    </div>
    <div class="aiq-progress"><div class="aiq-prog-fill" style="width:${Math.round(current/questions.length*100)}%"></div></div>
    <div class="aiq-question">${q.q}</div>
    <div class="aiq-options">${q.o.map((o,i)=>`<button class="aiq-opt" onclick="answerAIQuiz(${i})">${o}</button>`).join('')}</div>
    <div class="aiq-feedback" id="aiqFb"></div>`
}

function answerAIQuiz(idx){
  const{questions,current}=aiQuizState;
  const q=questions[current];
  const ok=idx===q.c;
  if(ok)aiQuizState.score++;
  // Highlight answers
  document.querySelectorAll('.aiq-opt').forEach((b,i)=>{
    b.classList.add('aiq-off');
    if(i===q.c)b.classList.add('aiq-ok');
    if(i===idx&&!ok)b.classList.add('aiq-no')
  });
  const fb=document.getElementById('aiqFb');
  fb.className='aiq-feedback show';
  fb.innerHTML=`<span style="color:${ok?'var(--sage-light)':'var(--coral)'}"><strong>${ok?'✓ Correto!':'✗ Incorreto'}</strong></span> ${q.exp}`;
  // Auto advance after 2s
  setTimeout(()=>{aiQuizState.current++;renderAIQuiz()},2200)
}

function renderAIQuizResult(){
  const{questions,score,mi,li}=aiQuizState;
  const pct=Math.round(score/questions.length*100);
  const xpEarned=score*10;
  if(xpEarned>0)addXP(xpEarned);
  const modal=document.querySelector('#aiQuizModal .aiq-modal');
  if(!modal)return;
  modal.innerHTML=`
    <button class="save-modal-close" onclick="closeAIQuiz()" aria-label="Fechar">&times;</button>
    <div class="aiq-result">
      <div class="aiq-result-emoji">${pct>=80?'🎉':pct>=50?'👍':'💪'}</div>
      <h3>${pct>=80?'Excelente!':pct>=50?'Bom trabalho!':'Continue praticando!'}</h3>
      <div class="aiq-result-score">${score}/${questions.length} corretas (${pct}%)</div>
      ${xpEarned>0?`<div class="aiq-result-xp">+${xpEarned} XP</div>`:''}
      <div class="aiq-result-actions">
        <button class="btn btn-sage" onclick="closeAIQuiz();startAIQuiz(${mi},${li})">Praticar Novamente</button>
        <button class="btn btn-ghost" onclick="closeAIQuiz()">Fechar</button>
      </div>
    </div>`;
  if(typeof gtag==='function')gtag('event','ai_quiz_complete',{score,total:questions.length,pct})
}

function closeAIQuiz(){
  const el=document.getElementById('aiQuizModal');if(el)el.remove();
  aiQuizState={mi:null,li:null,questions:[],current:0,score:0,loading:false}
}

// ============================================================
// MINI-GAME: BARRAQUINHA DE LIMONADA
// ============================================================
let gameDay=1,gameCash=20,gameHistory=[],gameInvestment=0,gameReputation=50;
const WEATHER=['☀️ Ensolarado','⛅ Nublado','🌧️ Chuvoso','🔥 Calor intenso'];
const WEATHER_MULT=[1.0,0.6,0.3,1.4];
const GAME_EVENTS=[
  null,null,null, // No event on some days
  {name:'📰 Matéria no jornal local',desc:'Sua barraquinha foi destaque! +20% demanda',mod:d=>d*1.2},
  {name:'🏗️ Concorrente abriu ao lado',desc:'Um rival apareceu! -15% demanda',mod:d=>d*0.85},
  {name:'💰 Inflação dos limões',desc:'Custo de produção subiu! R$2.00/copo',costMod:2.0},
  {name:'🎪 Festival na praça',desc:'Muita gente passando! +40% demanda',mod:d=>d*1.4},
  {name:'📱 Post viral no TikTok',desc:'Alguém filmou sua barraquinha! +30% demanda',mod:d=>d*1.3},
  {name:'🥶 Frente fria inesperada',desc:'Ninguém quer limonada gelada! -40% demanda',mod:d=>d*0.6},
];
function goGame(){
  hideAllViews();setNav('nGame');
  document.getElementById('vGame').classList.add('on');
  gameDay=1;gameCash=20;gameHistory=[];gameInvestment=0;gameReputation=50;
  renderGameDay()
}
function renderGameDay(){
  const wIdx=Math.floor(Math.random()*WEATHER.length);
  const weather=WEATHER[wIdx];const wMult=WEATHER_MULT[wIdx];
  // Random event
  const evt=GAME_EVENTS[Math.floor(Math.random()*GAME_EVENTS.length)];
  const costPerCup=evt&&evt.costMod?evt.costMod:1.5;
  const repBonus=1+(gameReputation-50)/200; // -25% to +25%
  window._gameEvt=evt;window._gameRepBonus=repBonus;
  document.getElementById('gameContent').innerHTML=`
    <div class="game-board">
      <div class="game-day">
        <h3>🍋 Dia ${gameDay} de 7</h3>
        <div class="game-weather">${weather}</div>
        <div class="game-stats-row">
          <div><span class="game-stat-val" style="color:var(--honey)">R$ ${gameCash.toFixed(2)}</span><span class="game-stat-lbl">Caixa</span></div>
          <div><span class="game-stat-val" style="color:var(--sky)">⭐ ${gameReputation}</span><span class="game-stat-lbl">Reputação</span></div>
          ${gameInvestment>0?`<div><span class="game-stat-val" style="color:var(--sage)">📈 R$ ${gameInvestment.toFixed(2)}</span><span class="game-stat-lbl">Investido</span></div>`:''}
        </div>
      </div>
      ${evt?`<div class="game-event"><strong>${evt.name}</strong><br><span style="font-size:.78rem;color:var(--text-secondary)">${evt.desc}</span></div>`:''}
      <div class="game-controls">
        <div class="game-ctrl"><label>Preço por copo</label><input type="range" min="1" max="10" value="3" step="0.5" id="gPrice" oninput="updateGamePreview(${wMult},${costPerCup})"><div class="game-val" id="gPriceVal">R$ 3,00</div></div>
        <div class="game-ctrl"><label>Copos a produzir</label><input type="range" min="0" max="${Math.floor(gameCash/costPerCup)}" value="${Math.min(10,Math.floor(gameCash/costPerCup))}" id="gQty" oninput="updateGamePreview(${wMult},${costPerCup})"><div class="game-val" id="gQtyVal">${Math.min(10,Math.floor(gameCash/costPerCup))}</div></div>
      </div>
      <div class="game-preview" id="gamePreview"></div>
      <button class="btn btn-sage" style="width:100%" onclick="playGameDay(${wMult},${costPerCup})">Abrir a Barraquinha!</button>
      ${gameCash>5?`<div class="game-invest"><button class="btn btn-ghost btn-sm" onclick="gameInvest()" style="width:100%;margin-top:.5rem">📈 Investir R$ 5,00 (retorno em 3 dias)</button></div>`:''}
    </div>
    ${gameHistory.length?`<div class="game-history"><h4 style="font-size:.82rem;font-weight:600;color:var(--text-muted);margin-bottom:.5rem">Histórico</h4>${gameHistory.map((h,i)=>`<div class="game-history-row"><span>Dia ${i+1}</span><span>${h.weather}</span><span style="color:${h.profit>=0?'var(--sage)':'var(--coral)'}">R$ ${h.profit>=0?'+':''}${h.profit.toFixed(2)}</span>${h.event?'<span style="font-size:.65rem">'+h.event+'</span>':''}</div>`).join('')}</div>`:''}`;
  updateGamePreview(wMult,costPerCup)
}
function gameInvest(){
  if(gameCash<5)return;
  gameCash-=5;gameInvestment+=5;
  toast('📈 Investiu R$ 5,00! Retorno em 3 dias.');
  renderGameDay()
}
function updateGamePreview(wMult,costPerCup){
  const priceEl=document.getElementById('gPrice'),qtyEl=document.getElementById('gQty');
  if(!priceEl||!qtyEl)return;
  const price=parseFloat(priceEl.value);
  const qty=parseInt(qtyEl.value);
  const cpc=costPerCup||1.5;
  document.getElementById('gPriceVal').textContent=`R$ ${price.toFixed(2).replace('.',',')}`;
  document.getElementById('gQtyVal').textContent=qty;
  const cost=qty*cpc;
  const evt=window._gameEvt;const repBonus=window._gameRepBonus||1;
  let baseDemand=Math.round(qty*wMult*(1-price/15)*1.2*repBonus);
  if(evt&&evt.mod)baseDemand=Math.round(evt.mod(baseDemand));
  const sold=Math.min(qty,Math.max(0,baseDemand));
  const revenue=sold*price;const profit=revenue-cost;
  document.getElementById('gamePreview').innerHTML=`
    <div><div class="gp-label">Custo</div><div class="gp-val" style="color:var(--coral)">R$ ${cost.toFixed(2)}</div></div>
    <div><div class="gp-label">Demanda est.</div><div class="gp-val">~${Math.max(0,baseDemand)} copos</div></div>
    <div><div class="gp-label">Lucro est.</div><div class="gp-val" style="color:${profit>=0?'var(--sage)':'var(--coral)'}">R$ ${profit>=0?'+':''}${profit.toFixed(2)}</div></div>`
}
function playGameDay(wMult,costPerCup){
  const price=parseFloat(document.getElementById('gPrice').value);
  const qty=parseInt(document.getElementById('gQty').value);
  const cpc=costPerCup||1.5;
  const cost=qty*cpc;
  const evt=window._gameEvt;const repBonus=window._gameRepBonus||1;
  let baseDemand=Math.round(qty*wMult*(1-price/15)*1.2*repBonus);
  if(evt&&evt.mod)baseDemand=Math.round(evt.mod(baseDemand));
  const variance=Math.round((Math.random()-.5)*qty*0.3);
  const actualDemand=Math.max(0,baseDemand+variance);
  const sold=Math.min(qty,actualDemand);
  const revenue=sold*price;const profit=revenue-cost;
  const wasted=qty-sold;
  gameCash+=profit;
  // Reputation: good service (sold most) → up, waste → down
  if(sold>=qty*0.8)gameReputation=Math.min(100,gameReputation+5);
  else if(wasted>qty*0.5)gameReputation=Math.max(0,gameReputation-5);
  // Investment returns after 3 days
  if(gameDay>=4&&gameInvestment>0){const ret=gameInvestment*1.3;gameCash+=ret;toast(`📈 Investimento rendeu R$ ${ret.toFixed(2)}!`);gameInvestment=0}
  const wIdx=WEATHER.findIndex(w=>WEATHER_MULT[WEATHER.indexOf(w)]===wMult)||0;
  gameHistory.push({weather:WEATHER[wIdx]||'☀️',sold,qty,profit,price,event:evt?evt.name:null});
  playSfx(profit>=0?'success':'error');
  if(gameDay>=7){renderGameEnd();return}
  // Show result overlay then next day
  document.getElementById('gameContent').innerHTML=`
    <div class="game-result ${profit<0?'loss':''}">
      <h4>Dia ${gameDay} — ${profit>=0?'Lucro!':'Prejuízo'}</h4>
      <div class="gr-amount ${profit>=0?'profit':'deficit'}">R$ ${profit>=0?'+':''}${profit.toFixed(2)}</div>
      <p style="font-size:.82rem;color:var(--text-secondary);margin-top:.5rem">Vendeu ${sold}/${qty} copos a R$ ${price.toFixed(2)}${wasted>0?` (${wasted} desperdiçados)`:''}</p>
    </div>
    <button class="btn btn-sage" style="width:100%;margin-top:1rem" onclick="gameDay++;renderGameDay()">Próximo Dia →</button>`;
  logActivity('lesson',`Limonada Dia ${gameDay}: R$ ${profit>=0?'+':''}${profit.toFixed(2)}`)
}
function renderGameEnd(){
  const totalProfit=gameCash-20;
  const avgProfit=totalProfit/7;
  if(totalProfit>0){addXP(30);launchConfetti()}
  document.getElementById('gameContent').innerHTML=`
    <div class="game-result ${totalProfit<0?'loss':''}">
      <h4>Semana Encerrada!</h4>
      <div class="gr-amount ${totalProfit>=0?'profit':'deficit'}">R$ ${totalProfit>=0?'+':''}${totalProfit.toFixed(2)}</div>
      <p style="font-size:.82rem;color:var(--text-secondary);margin-top:.5rem">${totalProfit>=0?'Parabéns, você lucrou!':'Não desanime — empreender é aprender.'}</p>
      <div class="game-summary">
        <div class="gs-item"><div class="gs-val" style="color:var(--honey)">R$ ${gameCash.toFixed(2)}</div><div class="gs-lbl">Caixa Final</div></div>
        <div class="gs-item"><div class="gs-val">${gameHistory.reduce((s,h)=>s+h.sold,0)}</div><div class="gs-lbl">Copos Vendidos</div></div>
        <div class="gs-item"><div class="gs-val">R$ ${avgProfit.toFixed(2)}</div><div class="gs-lbl">Lucro Médio/Dia</div></div>
      </div>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.25rem">
      <button class="btn btn-sage" onclick="goGame()">Jogar Novamente</button>
      <button class="btn btn-ghost" onclick="goDash()">Dashboard</button>
    </div>
    <div class="game-history" style="margin-top:1.5rem"><h4 style="font-size:.82rem;font-weight:600;color:var(--text-muted);margin-bottom:.5rem">Resumo dos 7 Dias</h4>${gameHistory.map((h,i)=>`<div class="game-history-row"><span>Dia ${i+1}</span><span>${h.weather}</span><span>Vendeu ${h.sold} a R$${h.price.toFixed(2)}</span><span style="color:${h.profit>=0?'var(--sage)':'var(--coral)'}">R$ ${h.profit>=0?'+':''}${h.profit.toFixed(2)}</span></div>`).join('')}</div>`;
  logActivity('lesson',`Limonada completa: R$ ${totalProfit>=0?'+':''}${totalProfit.toFixed(2)}`)
}

// ============================================================
// PROGRESS CHART (WEEKLY)
// ============================================================
function renderProgressChart(){
  const tl=loadTimeline();
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
  if(S.cMod!==null&&S.cLes!==null&&M[S.cMod]&&M[S.cMod].lessons[S.cLes]&&!S.done[`${S.cMod}-${S.cLes}`]){
    const m=M[S.cMod],l=m.lessons[S.cLes];
    el.innerHTML=`<div class="continue-card" onclick="openL(${S.cMod},${S.cLes})"><div class="cc-icon">${m.icon}</div><div class="cc-info"><div class="cc-title">${l.title}</div><div class="cc-sub">${m.title} · Aula ${S.cLes+1}/${m.lessons.length}</div></div><div class="cc-btn">Continuar →</div></div>`;return
  }
  // Find next available lesson
  for(let mi=0;mi<M.length;mi++){
    if(!isModUnlocked(mi))continue;
    for(let li=0;li<M[mi].lessons.length;li++){
      if(!S.done[`${mi}-${li}`]){
        const m=M[mi],l=m.lessons[li];
        el.innerHTML=`<div class="continue-card" onclick="openL(${mi},${li})"><div class="cc-icon">${m.icon}</div><div class="cc-info"><div class="cc-title">${l.title}</div><div class="cc-sub">${m.title} · Aula ${li+1}/${m.lessons.length}</div></div><div class="cc-btn">Começar →</div></div>`;return
      }
    }
  }
  // All done
  const totalL=M.reduce((s,m)=>s+m.lessons.length,0);
  el.innerHTML=`<div class="continue-card" onclick="goBadges()"><div class="cc-icon">🏆</div><div class="cc-info"><div class="cc-title">Curso Completo!</div><div class="cc-sub">Todas as ${totalL} aulas concluídas. Veja suas conquistas!</div></div><div class="cc-btn">Conquistas →</div></div>`
}

// ============================================================
// MOTIVATIONAL QUOTES
// ============================================================
const QUOTES=[
  {text:'Não existe maneira de o homem se esquivar do seu próprio julgamento.',author:'Ludwig von Mises'},
  {text:'A liberdade econômica é um requisito para a liberdade política.',author:'Milton Friedman'},
  {text:'O mais importante investimento que você pode fazer é em si mesmo.',author:'Warren Buffett'},
  {text:'A curiosidade é a chave da criatividade.',author:'Akio Morita'},
  {text:'A única função da previsão econômica é fazer a astrologia parecer respeitável.',author:'John Kenneth Galbraith'},
  {text:'Quem controla o dinheiro de uma nação controla a nação.',author:'Thomas Jefferson'},
  {text:'Não é da benevolência do açougueiro que esperamos nosso jantar, mas do seu interesse próprio.',author:'Adam Smith'},
  {text:'Ideias são mais poderosas do que se imagina comumente.',author:'Friedrich Hayek'},
  {text:'A pobreza não é causada por falta de recursos, mas pela falta de ideias certas.',author:'Thomas Sowell'},
  {text:'Riqueza não é sobre ter muito dinheiro. É sobre ter muitas opções.',author:'Chris Rock'},
  {text:'O empresário sempre procura a mudança, responde a ela e a explora como uma oportunidade.',author:'Peter Drucker'},
  {text:'Se você acha que educação é cara, experimente a ignorância.',author:'Derek Bok'},
  {text:'A inflação é a forma mais universal de tributação.',author:'Ludwig von Mises'},
  {text:'Existe apenas um bem: o conhecimento. Existe apenas um mal: a ignorância.',author:'Sócrates'}
];
function renderQuote(){
  const seed=new Date().toDateString();
  let h=0;for(let i=0;i<seed.length;i++)h=seed.charCodeAt(i)+((h<<5)-h);
  const q=QUOTES[Math.abs(h)%QUOTES.length];
  document.getElementById('quoteSection').innerHTML=`<div class="quote-card"><div class="quote-text">${q.text}</div><div class="quote-author">— ${q.author}</div></div>`
}

// ============================================================
// SOUND EFFECTS (Web Audio API)
// ============================================================
let sfxEnabled=true;const SFX_KEY='escola_sfx';
try{sfxEnabled=localStorage.getItem(SFX_KEY)!=='off'}catch(e){}
function toggleSfx(){sfxEnabled=!sfxEnabled;localStorage.setItem(SFX_KEY,sfxEnabled?'on':'off');toast(sfxEnabled?'🔊 Sons ativados':'🔇 Sons desativados');updateSfxLabel()}
function updateSfxLabel(){const l=document.getElementById('sfxLabel');const i=document.getElementById('sfxToggle');if(l)l.textContent=sfxEnabled?'Sons Ligados':'Sons Desligados';if(i){const ic=i.querySelector('.ni-icon');if(ic)ic.textContent=sfxEnabled?'🔊':'🔇'}}
function playSfx(type){
  if(!sfxEnabled)return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    gain.gain.value=0.1;
    if(type==='success'){osc.frequency.value=523;osc.type='sine';osc.start();osc.frequency.setValueAtTime(659,ctx.currentTime+0.1);osc.frequency.setValueAtTime(784,ctx.currentTime+0.2);gain.gain.setValueAtTime(0,ctx.currentTime+0.35);osc.stop(ctx.currentTime+0.4)}
    else if(type==='error'){osc.frequency.value=200;osc.type='square';osc.start();gain.gain.value=0.05;gain.gain.setValueAtTime(0,ctx.currentTime+0.25);osc.stop(ctx.currentTime+0.3)}
    else if(type==='levelup'){osc.frequency.value=440;osc.type='sine';osc.start();osc.frequency.setValueAtTime(554,ctx.currentTime+0.1);osc.frequency.setValueAtTime(659,ctx.currentTime+0.2);osc.frequency.setValueAtTime(880,ctx.currentTime+0.3);gain.gain.setValueAtTime(0,ctx.currentTime+0.5);osc.stop(ctx.currentTime+0.55)}
    else if(type==='complete'){osc.frequency.value=523;osc.type='sine';osc.start();osc.frequency.setValueAtTime(659,ctx.currentTime+0.15);osc.frequency.setValueAtTime(784,ctx.currentTime+0.3);osc.frequency.setValueAtTime(1047,ctx.currentTime+0.45);gain.gain.setValueAtTime(0,ctx.currentTime+0.7);osc.stop(ctx.currentTime+0.75)}
  }catch(e){}
}

// ============================================================
// PRINT LESSON
// ============================================================
function printLesson(){
  if(S.cMod===null||S.cLes===null||!M[S.cMod]||!M[S.cMod].lessons[S.cLes])return;
  const m=M[S.cMod],l=m.lessons[S.cLes];
  const w=window.open('','_blank');
  if(!w){toast('Permita popups para imprimir','error');return;}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${l.title} — escola liberal</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Georgia,serif}body{padding:2.5rem;max-width:700px;margin:0 auto;color:#1a1a2e;font-size:14px;line-height:1.7}
  h2{font-size:1.5rem;margin-bottom:.5rem}h3{font-size:1.1rem;margin:1.5rem 0 .5rem;color:#3d8b6e}
  p{margin-bottom:.75rem}.highlight{background:#f5f3ef;border-left:3px solid #dba550;padding:.75rem 1rem;margin:1rem 0;font-size:.9rem}
  .example{background:#f0faf5;border-left:3px solid #4a9e7e;padding:.75rem 1rem;margin:1rem 0;font-size:.9rem}
  .thinker-quote{font-style:italic;color:#666;margin:1rem 0;padding:.5rem 1rem;border-left:3px solid #9b7ed8}
  .header{border-bottom:2px solid #1a1a2e;padding-bottom:.75rem;margin-bottom:1.5rem}
  .header .module{font-size:.8rem;color:#666}.header .lesson{font-size:.8rem;color:#4a9e7e}
  .footer{margin-top:2rem;padding-top:.75rem;border-top:1px solid #ddd;font-size:.75rem;color:#999;text-align:center}
  .quiz-section{background:#f5f3ef;border:1px solid #ddd;border-radius:4px;padding:1rem;margin-top:1.5rem}
  .quiz-section h3{margin-top:0}.quiz-opt{padding:.3rem 0;font-size:.9rem}
  @media print{body{padding:1rem}}</style></head><body>
  <div class="header"><div class="module">${m.icon} ${m.title}</div><h1>${l.title}</h1><div class="lesson">Aula ${S.cLes+1} de ${m.lessons.length} · ⏱ ~${calcReadTime(l.content)} min de leitura</div></div>
  ${l.content}
  ${l.quiz?`<div class="quiz-section"><h3>Quiz</h3><p><strong>${l.quiz.q}</strong></p>${l.quiz.o.map((o,i)=>`<div class="quiz-opt">${String.fromCharCode(65+i)}) ${o}</div>`).join('')}<p style="margin-top:.75rem;font-size:.8rem;color:#666"><strong>Resposta:</strong> ${String.fromCharCode(65+l.quiz.c)} — ${l.quiz.exp}</p></div>`:''}
  <div class="footer">Escola Liberal · ${new Date().toLocaleDateString('pt-BR')} · A educação que bilionários escondem dos seus filhos.</div>
</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),300)
}

// ============================================================
// EXPORT PDF
// ============================================================
function exportPDF(){
  const li=getLevelInfo(S.lvl);
  const done=Object.keys(S.done).length;
  const qt=Object.keys(S.quiz).length;
  const qc=Object.values(S.quiz).filter(v=>v).length;
  const pct=qt?Math.round(qc/qt*100):0;

  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório — ${S.name}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Georgia,serif}body{padding:3rem;max-width:700px;margin:0 auto;color:#1a1a2e}
  h1{font-size:1.8rem;margin-bottom:.3rem}h2{font-size:1.2rem;margin:2rem 0 .75rem;color:#3d8b6e;border-bottom:2px solid #3d8b6e;padding-bottom:.3rem}
  .subtitle{color:#666;font-size:.9rem;margin-bottom:2rem}.stat{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #eee;font-size:.9rem}
  .stat-label{color:#666}.stat-value{font-weight:700}.module{padding:.6rem 0;border-bottom:1px solid #eee;font-size:.9rem}
  .footer{margin-top:3rem;padding-top:1rem;border-top:2px solid #1a1a2e;font-size:.75rem;color:#999;text-align:center}
  @media print{body{padding:1.5rem}}</style></head><body>
  <h1>🎓 Escola Liberal</h1>
  <div class="subtitle">Relatório de Progresso — ${new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}</div>
  <h2>Aluno</h2>
  <div class="stat"><span class="stat-label">Nome</span><span class="stat-value">${S.name}</span></div>
  <div class="stat"><span class="stat-label">Nível</span><span class="stat-value">${S.lvl} — ${li.emoji} ${li.name}</span></div>
  <div class="stat"><span class="stat-label">XP Total</span><span class="stat-value">${totalXP()}</span></div>
  <div class="stat"><span class="stat-label">Sequência</span><span class="stat-value">${S.streak} dias</span></div>
  <h2>Progresso Geral</h2>
  <div class="stat"><span class="stat-label">Aulas Concluídas</span><span class="stat-value">${done}/${M.reduce((s,m)=>s+m.lessons.length,0)}</span></div>
  <div class="stat"><span class="stat-label">Quizzes Respondidos</span><span class="stat-value">${qt}/${M.reduce((s,m)=>s+m.lessons.length,0)}</span></div>
  <div class="stat"><span class="stat-label">Taxa de Acerto</span><span class="stat-value">${pct}%</span></div>
  <h2>Por Módulo</h2>
  ${M.map((m,mi)=>{
    const d=m.lessons.filter((_,li)=>S.done[`${mi}-${li}`]).length;
    const mq=m.lessons.filter((_,li)=>S.quiz[`${mi}-${li}`]!==undefined).length;
    const mqc=m.lessons.filter((_,li)=>S.quiz[`${mi}-${li}`]===true).length;
    return`<div class="module"><strong>${m.icon} ${m.title}</strong> — ${d}/${m.lessons.length} aulas · ${mq?Math.round(mqc/mq*100):0}% quizzes ${d===m.lessons.length?'✅':''}</div>`
  }).join('')}
  <div class="footer">Documento gerado automaticamente pela Escola Liberal<br>© ${new Date().getFullYear()}</div>
</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),300)
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
let kbdVisible=false;
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  const lesOn=document.getElementById('vLes').classList.contains('on');
  const marathonOn=document.getElementById('vMarathon').classList.contains('on');
  if(e.key==='ArrowRight'&&lesOn){e.preventDefault();nextL()}
  else if(e.key==='ArrowLeft'&&lesOn){e.preventDefault();prevL()}
  else if(e.key==='f'||e.key==='F'){if(lesOn){e.preventDefault();toggleFocus()}}
  else if(e.key==='s'||e.key==='S'){if(lesOn){e.preventDefault();toggleTTS()}}
  else if(e.key==='Escape'){
    if(document.body.classList.contains('focus-mode'))toggleFocus();
    else if(lesOn)goBackMod();
    else if(document.getElementById('vMod').classList.contains('on'))goDash();
    else if(marathonOn)endMarathon();
  }
  else if(e.key==='?'){e.preventDefault();kbdVisible=!kbdVisible;document.getElementById('kbdHint').classList.toggle('show',kbdVisible)}
});

// ============================================================
// SPLASH SCREEN
// ============================================================
function runSplash(){
  const fill=document.getElementById('splashFill');
  setTimeout(()=>fill.style.width='30%',100);
  setTimeout(()=>fill.style.width='70%',400);
  setTimeout(()=>fill.style.width='100%',700);
  setTimeout(()=>{document.getElementById('splash').classList.add('hide');setTimeout(()=>document.getElementById('splash').style.display='none',500)},1100)
}
runSplash();

// ============================================================
// ============================================================
// PWA INSTALL MODAL
// ============================================================
let deferredPrompt=null;
// Chave v2 para Escola Liberal (limpa dismiss antigo da Escola Conservadora)
const PWA_DISMISS_KEY='escolalib_install_v2';

function _isIos(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
}
function _isInStandaloneMode(){
  return ('standalone' in window.navigator&&window.navigator.standalone)||
    window.matchMedia('(display-mode: standalone)').matches;
}
function _showPwaModal(force){
  // Don't show PWA modal while onboarding is active
  const obEl=_origById('onboard');
  if(obEl&&obEl.style.display!=='none')return;
  // Remove chaves antigas para garantir que o popup apareça após o rebrand
  localStorage.removeItem('escola_install_dismissed');
  const dismissed=localStorage.getItem(PWA_DISMISS_KEY);
  if((dismissed&&!force)||_isInStandaloneMode())return;
  const overlay=document.getElementById('pwaOverlay');
  if(!overlay)return;
  const ios=_isIos();
  document.getElementById('pwaAndroid').style.display=ios?'none':'block';
  document.getElementById('pwaIos').style.display=ios?'block':'none';
  overlay.classList.add('show');
}
function _pwaOverlayClick(e){
  if(e.target===document.getElementById('pwaOverlay'))dismissInstall();
}
// Android/Chrome: recebe prompt nativo
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  setTimeout(()=>_showPwaModal(false),3000);
});
// iOS Safari: mostra instruções manuais (sem beforeinstallprompt)
window.addEventListener('load',()=>{
  if(_isIos()&&!_isInStandaloneMode()){
    const dismissed=localStorage.getItem(PWA_DISMISS_KEY);
    if(!dismissed) setTimeout(()=>_showPwaModal(false),4000);
  }
});
function doInstall(){
  if(!deferredPrompt){
    // Sem prompt nativo: orienta o usuário manualmente
    const ios=_isIos();
    const ua=navigator.userAgent.toLowerCase();
    if(ios){
      toast('No Safari: toque em Compartilhar ↑ → "Adicionar à Tela de Início"');
    } else if(ua.includes('chrome')||ua.includes('crios')){
      toast('No Chrome: menu ⋮ (3 pontos) → "Adicionar à tela inicial"');
    } else if(ua.includes('firefox')){
      toast('No Firefox: menu ☰ → "Instalar"');
    } else {
      toast('Procure "Instalar app" ou "Adicionar à tela inicial" no menu do seu navegador');
    }
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(r=>{
    dismissInstall();
    deferredPrompt=null;
    if(r.outcome==='accepted')logActivity('install','App instalado como PWA')
  })
}
function dismissInstall(){
  const overlay=document.getElementById('pwaOverlay');
  if(overlay)overlay.classList.remove('show');
  localStorage.setItem(PWA_DISMISS_KEY,'1')
}

// ============================================================
// VERSIONING + WHAT'S NEW
// ============================================================
const APP_VERSION='2.5.0';
const CHANGELOG=[
  {emoji:'📱',text:'<strong>Instalar como App</strong> — Banner personalizado para instalar no celular ou desktop'},
  {emoji:'💾',text:'<strong>Backup Completo</strong> — Exporte e importe todo seu progresso em JSON'},
  {emoji:'📤',text:'<strong>Compartilhar Progresso</strong> — Gere uma imagem PNG bonita do seu avanço'},
  {emoji:'🔔',text:'<strong>Lembretes de Estudo</strong> — Notificações para manter a consistência'},
  {emoji:'✨',text:'<strong>Salvamento Visual</strong> — Indicador de progresso salvo automaticamente'},
  {emoji:'🍋',text:'<strong>Mini-Jogo Limonada</strong> — Aprenda oferta e demanda na prática'},
  {emoji:'🧠',text:'<strong>Revisão Espaçada</strong> — Sistema Leitner de 5 caixas para memorização'},
  {emoji:'📝',text:'<strong>Simulado Geral</strong> — Prova abrangente com todas as matérias'},
  {emoji:'🏅',text:'<strong>23 Conquistas</strong> — Desbloqueie badges ao longo da jornada'},
  {emoji:'🔒',text:'<strong>PIN Parental</strong> — Painel protegido para responsáveis'}
];
function checkWhatsNew(){
  // Don't show What's New while onboarding is active
  const obEl=_origById('onboard');
  if(obEl&&obEl.style.display!=='none')return;
  const lastV=localStorage.getItem('escola_last_version');
  if(lastV!==APP_VERSION){
    document.getElementById('wnVer').textContent='Versão '+APP_VERSION;
    document.getElementById('wnItems').innerHTML=CHANGELOG.map(c=>`<div class="wn-item"><div class="wn-emoji">${c.emoji}</div><div class="wn-desc">${c.text}</div></div>`).join('');
    document.getElementById('wnOverlay').classList.add('show')
  }
}
function closeWhatsNew(){
  document.getElementById('wnOverlay').classList.remove('show');
  localStorage.setItem('escola_last_version',APP_VERSION)
}

// ============================================================
// AUTO-SAVE INDICATOR
// ============================================================
const _origSave=save;
save=function(){
  _origSave();
  showSaveIndicator()
};
function showSaveIndicator(){
  const el=document.getElementById('saveIndicator');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),1500)
}

// ============================================================
// BACKUP / IMPORT
// ============================================================
function exportBackup(){
  const data={};
  const keys=['escola_v2','escola_notes','escola_favs','escola_theme','escola_daily','escola_missions','escola_marathon_best','escola_profiles','escola_pin','escola_timeline','escola_spaced','escola_sfx','escola_last_version'];
  keys.forEach(k=>{const v=localStorage.getItem(k);if(v)data[k]=v});
  // Also export all profile keys
  const profiles=JSON.parse(localStorage.getItem('escola_profiles')||'[]');
  profiles.forEach(p=>{const v=localStorage.getItem(p.key);if(v)data[p.key]=v});
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`escola-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(url);
  toast('Backup exportado com sucesso!','success');
  logActivity('backup','Backup exportado')
}
function importBackup(){
  const input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.escola_v2){toast('Arquivo inválido','error');return}
        if(!confirm('Importar backup substituirá seu progresso atual. Continuar?'))return;
        const ALLOWED_KEYS=['escola_v2','escola_notes','escola_favs','escola_theme','escola_daily','escola_missions','escola_marathon_best','escola_profiles','escola_pin','escola_timeline','escola_spaced','escola_sfx','escola_last_version','escola_daily_goal','escola_notif'];
        Object.entries(data).forEach(([k,v])=>{if(ALLOWED_KEYS.includes(k)||k.startsWith('escola_v2_p_'))try{localStorage.setItem(k,v)}catch(e){}});
        toast('Backup importado! Recarregando...','success');
        setTimeout(()=>location.reload(),1000)
      }catch(err){toast('Erro ao ler arquivo de backup','error')}
    };
    reader.readAsText(file)
  };
  input.click()
}

function showBackupMenu(){
  const choice=confirm('Clique OK para EXPORTAR seu backup.\nClique Cancelar para IMPORTAR um backup existente.');
  if(choice)exportBackup();else importBackup()
}

// ============================================================
// STUDY NOTIFICATIONS
// ============================================================
const NOTIF_KEY='escola_notif';
function getNotifSettings(){try{return JSON.parse(localStorage.getItem(NOTIF_KEY)||'{"enabled":false,"hour":19,"minute":0}')}catch(e){return{enabled:false,hour:19,minute:0}}}
function saveNotifSettings(s){try{localStorage.setItem(NOTIF_KEY,JSON.stringify(s))}catch(e){}}

function requestNotifPermission(){
  if(!('Notification' in window)){toast('Seu navegador não suporta notificações','error');return Promise.resolve(false)}
  return Notification.requestPermission().then(p=>p==='granted')
}

let _reminderTimer=null;
let _streakDangerTimer=null;
const NOTIF_MESSAGES=[
  ()=>`Hora de estudar! Mantenha sua sequência de ${S.streak} dia${S.streak!==1?'s':''}.`,
  ()=>`Faltam ${M.reduce((s,m)=>s+m.lessons.length,0)-Object.keys(S.done).length} aulas para completar o currículo!`,
  ()=>'5 minutos de estudo fazem diferença. Vamos lá?',
  ()=>`Você está no nível ${S.lvl}. Que tal subir mais um hoje?`,
  ()=>'Consistência é o segredo. Uma aula por dia muda tudo.',
];
function _notifMsg(){return NOTIF_MESSAGES[Math.floor(Math.random()*NOTIF_MESSAGES.length)]()}

function scheduleStudyReminder(){
  if(_reminderTimer){clearTimeout(_reminderTimer);_reminderTimer=null}
  if(_streakDangerTimer){clearTimeout(_streakDangerTimer);_streakDangerTimer=null}
  const s=getNotifSettings();
  if(!s.enabled)return;
  const now=new Date();

  // Main daily reminder
  const target=new Date(now);
  target.setHours(s.hour,s.minute,0,0);
  if(target<=now)target.setDate(target.getDate()+1);
  _reminderTimer=setTimeout(()=>{
    _reminderTimer=null;
    if(Notification.permission==='granted'){
      const{mult,label}=getXPMultiplier();
      const body=mult>1?`${label} Aproveite o bônus de XP hoje!`:_notifMsg();
      new Notification('escola liberal 🎓',{body,icon:'assets/icons/icon-192.png',badge:'assets/icons/favicon.svg'});
      scheduleStudyReminder()
    }
  },target-now);

  // Streak danger: if no study today and it's past 20h, warn
  const todayISO=now.toISOString().slice(0,10);
  const studiedToday=S.streakDays&&S.streakDays.includes(todayISO);
  if(!studiedToday&&S.streak>0){
    const danger=new Date(now);danger.setHours(20,0,0,0);
    if(danger>now){
      _streakDangerTimer=setTimeout(()=>{
        _streakDangerTimer=null;
        const todayCheck=new Date().toISOString().slice(0,10);
        if(!(S.streakDays&&S.streakDays.includes(todayCheck))&&Notification.permission==='granted'){
          new Notification('Sua sequência está em perigo! 🔥',{
            body:`Você tem ${S.streak} dia${S.streak!==1?'s':''} de sequência. Estude antes de meia-noite para não perder!`,
            icon:'assets/icons/icon-192.png',badge:'assets/icons/favicon.svg',tag:'streak-danger'
          })
        }
      },danger-now)
    }
  }
}

function toggleNotifications(){
  const s=getNotifSettings();
  if(!s.enabled){
    requestNotifPermission().then(granted=>{
      if(granted){
        s.enabled=true;saveNotifSettings(s);
        toast('Lembretes ativados para '+String(s.hour).padStart(2,'0')+':'+String(s.minute).padStart(2,'0'),'success');
        scheduleStudyReminder();
        updateNotifUI()
      }else{toast('Permissão de notificação negada','error')}
    })
  }else{
    s.enabled=false;saveNotifSettings(s);
    toast('Lembretes desativados','success');
    updateNotifUI()
  }
}

function updateNotifUI(){
  const btn=document.getElementById('notifToggle');
  if(!btn)return;
  const s=getNotifSettings();
  btn.classList.toggle('on',s.enabled)
}

// ============================================================
// SHARE PROGRESS AS PNG
// ============================================================
function shareProgress(){
  const canvas=document.getElementById('shareCanvas');
  const ctx=canvas.getContext('2d');
  const w=600,h=400;
  canvas.width=w;canvas.height=h;
  // Background gradient
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#0f1729');grad.addColorStop(1,'#1a2540');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  // Border
  ctx.strokeStyle='#4a9e7e';ctx.lineWidth=3;
  ctx.strokeRect(8,8,w-16,h-16);
  // Header
  ctx.fillStyle='#e8e6e1';ctx.font='bold 26px "DM Serif Display",Georgia,serif';
  ctx.textAlign='center';
  ctx.fillText('Escola Liberal',w/2,55);
  // Emoji
  ctx.font='40px serif';ctx.fillText('🎓',w/2,105);
  // Name
  ctx.fillStyle='#5fbf96';ctx.font='bold 20px "DM Sans",sans-serif';
  ctx.fillText(S.name,w/2,145);
  // Level
  const lvlInfo=getLevelInfo(S.lvl);
  ctx.fillStyle='#9ba3b5';ctx.font='14px "DM Sans",sans-serif';
  ctx.fillText('Nível '+S.lvl+' · '+lvlInfo.name,w/2,170);
  // Stats
  const done=Object.keys(S.done).length;
  const totalQ=Object.keys(S.quiz).length;
  const correct=Object.values(S.quiz).filter(v=>v===true).length;
  const stats=[
    {label:'XP Total',value:S.xp.toLocaleString(),color:'#5fbf96'},
    {label:'Aulas',value:done+'/'+M.reduce((s,m)=>s+m.lessons.length,0),color:'#5b9bd5'},
    {label:'Sequência',value:S.streak+' dias',color:'#dba550'},
    {label:'Acerto',value:totalQ?Math.round(correct/totalQ*100)+'%':'--',color:'#9b7ed8'}
  ];
  const boxW=120,boxH=70,gap=16,startX=(w-(boxW*4+gap*3))/2,startY=195;
  stats.forEach((s,i)=>{
    const x=startX+i*(boxW+gap);
    ctx.fillStyle='rgba(255,255,255,0.04)';
    roundRect(ctx,x,startY,boxW,boxH,8);ctx.fill();
    ctx.fillStyle=s.color;ctx.font='bold 22px "JetBrains Mono",monospace';
    ctx.textAlign='center';ctx.fillText(s.value,x+boxW/2,startY+30);
    ctx.fillStyle='#6b7488';ctx.font='11px "DM Sans",sans-serif';
    ctx.fillText(s.label,x+boxW/2,startY+52)
  });
  // Progress bar
  const barY=290,barH=12,barW=w-100;
  ctx.fillStyle='rgba(255,255,255,0.06)';
  roundRect(ctx,50,barY,barW,barH,6);ctx.fill();
  ctx.fillStyle='#4a9e7e';
  const totalLessons=M.reduce((s,m)=>s+m.lessons.length,0);
  roundRect(ctx,50,barY,barW*(done/totalLessons),barH,6);ctx.fill();
  ctx.fillStyle='#9ba3b5';ctx.font='12px "DM Sans",sans-serif';
  ctx.textAlign='center';ctx.fillText(Math.round(done/totalLessons*100)+'% completo',w/2,barY+30);
  // Modules (show up to 10, dynamically from M)
  const modY=340;
  const modCount=Math.min(M.length,10);
  const modSpacing=Math.min(80,Math.floor((w-80)/modCount));
  const modStartX=Math.floor((w-(modCount*modSpacing))/2)+modSpacing/2;
  M.slice(0,modCount).forEach((mod,i)=>{
    const mx=modStartX+i*modSpacing;
    const modDone=mod.lessons.filter((_,li)=>S.done[`${i}-${li}`]).length;
    ctx.fillStyle=modDone===mod.lessons.length?'#4a9e7e':'rgba(255,255,255,0.06)';
    ctx.beginPath();ctx.arc(mx,modY,18,0,Math.PI*2);ctx.fill();
    ctx.font='14px serif';ctx.fillStyle='#fff';ctx.textAlign='center';
    ctx.fillText(mod.icon,mx,modY+5)
  });
  // Footer
  ctx.fillStyle='#6b7488';ctx.font='10px "DM Sans",sans-serif';
  ctx.textAlign='center';ctx.fillText('escolaliberal.com.br · '+new Date().toLocaleDateString('pt-BR'),w/2,h-15);

  document.getElementById('sharePreview').classList.add('show')
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
function closeShare(){document.getElementById('sharePreview').classList.remove('show')}
function downloadShare(){
  const canvas=document.getElementById('shareCanvas');
  const a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download='meu-progresso-escola-liberal.png';
  a.click();closeShare();
  toast('Imagem salva!','success');
  logActivity('share','Progresso compartilhado como imagem')
}
// Click canvas to download
document.getElementById('shareCanvas').addEventListener('click',downloadShare);

// ============================================================
// SERVICE WORKER UPDATE NOTIFICATION
// ============================================================
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message',e=>{
    if(e.data&&e.data.type==='SW_UPDATED'){
      toast('Nova versão disponível! Recarregue a página.','success')
    }
  })
}

// ============================================================
// GLOBAL PROGRESS BAR
// ============================================================
function updateGlobalProgress(){
  const done=Object.keys(S.done).length;
  const total=M.reduce((s,m)=>s+m.lessons.length,0);
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

// ============================================================
// ERROR REVIEW (wrong answers)
// ============================================================
function goErrorReview(){
  hideAllViews();
  document.getElementById('vErrorReview').classList.add('on','view-enter');
  setTimeout(()=>document.getElementById('vErrorReview').classList.remove('view-enter'),350);
  setNav('nErrorReview');
  const container=document.getElementById('errorReviewContent');
  // Find all wrong answers
  const wrongs=[];
  Object.entries(S.quiz).forEach(([k,v])=>{
    if(v===false){
      const [mi,li]=k.split('-').map(Number);
      if(!M[mi]||!M[mi].lessons[li])return;
      const m=M[mi],l=m.lessons[li];
      if(l&&l.quiz)wrongs.push({mi,li,mod:m.title,icon:m.icon,q:l.quiz,title:l.title,key:k})
    }
  });
  if(wrongs.length===0){
    container.innerHTML='<div class="er-empty">🎉 Parabéns! Você não tem nenhuma questão errada.<br><br>Continue assim!</div>';
    return
  }
  container.innerHTML=`<p style="margin-bottom:1rem;font-size:.85rem;color:var(--text-secondary)">Você tem <strong>${wrongs.length}</strong> questão(ões) para revisar. Clique na opção correta para praticar.</p>`+
    wrongs.map(w=>{
      const opts=w.q.o.map((o,i)=>{
        return`<div class="er-opt" data-key="${w.key}" data-idx="${i}" data-correct="${w.q.c}" onclick="retryError(this)">${o}</div>`
      }).join('');
      return`<div class="er-card" id="erc-${w.key}">
        <div class="er-module">${w.icon} ${w.mod}</div>
        <div class="er-question">${w.q.q}</div>
        <div class="er-options">${opts}</div>
      </div>`
    }).join('')
}
function retryError(el){
  const card=el.closest('.er-card');
  if(!card)return; // guard: elemento fora de .er-card
  if(card.dataset.answered)return;
  const correct=parseInt(el.dataset.correct);
  const idx=parseInt(el.dataset.idx);
  const key=el.dataset.key||'';
  card.dataset.answered='1';
  card.querySelectorAll('.er-opt').forEach((o,i)=>{
    if(i===correct)o.classList.add('correct');
    if(i===idx&&idx!==correct)o.classList.add('wrong')
  });
  const parts=key.split('-').map(Number);
  const mi=parts[0],li=parts[1];
  // guard: valida índices antes de acessar M
  const lesson=(Number.isFinite(mi)&&Number.isFinite(li)&&M[mi]&&M[mi].lessons[li])?M[mi].lessons[li]:null;
  const expText=lesson?lesson.quiz.exp:'';
  if(idx===correct){
    S.quiz[key]=true;save();
    playSfx('success');
    const explain=document.createElement('div');
    explain.className='er-explain';
    explain.textContent='✓ Correto! '+expText;
    card.appendChild(explain);
    if(lesson)logActivity('error-review',`Revisão de erro: ${lesson.title} — Corrigido!`)
  }else{
    playSfx('error');
    el.classList.add('quiz-shake');
    // Remove explicação anterior se já existir
    const prev=card.querySelector('.er-explain');
    if(prev)prev.remove();
    const explain=document.createElement('div');
    explain.className='er-explain';
    explain.textContent='✗ Tente novamente. '+expText;
    card.appendChild(explain)
  }
}

// ============================================================
// ADAPTIVE DIFFICULTY IN MARATHON
// ============================================================
// Patch the marathon to use adaptive difficulty
const _origStartMarathon=typeof startMarathon==='function'?startMarathon:null;
if(_origStartMarathon){
  // We'll enhance the marathon question selection in renderMarathonQ
  // by tracking consecutive correct answers
  window._marathonStreak=0;
  window._marathonAdaptive=true
}

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
  let el=_origById('weeklySummary');
  if(!el){
    const dash=_origById('vDash');
    const mcards=_origById('mcards');
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

  let el=_origById('dailyGoalSection');
  if(!el){
    const dash=_origById('vDash');
    if(!dash)return;
    el=document.createElement('div');el.id='dailyGoalSection';el.className='daily-goal';
    const ws=_origById('weeklySummary');
    if(ws&&ws.parentNode===dash)dash.insertBefore(el,ws);
    else{const mc=_origById('mcards');if(mc&&mc.parentNode===dash)dash.insertBefore(el,mc);else dash.appendChild(el)}
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
      <select onchange="changeDailyGoal(this.value)">
        ${[1,2,3,5,7,10].map(n=>`<option value="${n}" ${n===g.target?'selected':''}>${n} aula${n>1?'s':''}/dia</option>`).join('')}
      </select>
    </div>`
}
function changeDailyGoal(v){
  const g=getDailyGoal();g.target=parseInt(v);saveDailyGoal(g);renderDailyGoal()
}

// ============================================================
// ERROR BOUNDARY
// ============================================================
// Error counter: only show error screen after 3+ rapid errors (real crash)
let _errCount=0,_errTimer=null;
window.onerror=function(msg,url,line,col,err){
  console.warn('[App warn]',msg,'at line',line);
  _errCount++;
  if(_errTimer)clearTimeout(_errTimer);
  _errTimer=setTimeout(()=>{_errCount=0},2000);
  // Only show error screen for 3+ errors in 2 seconds (cascade = real crash)
  if(_errCount>=3){
    try{_origById('errorScreen').style.display='flex'}catch(e){}
  }
  return true
};
window.addEventListener('unhandledrejection',e=>{
  console.error('Unhandled promise:',e.reason);
});

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
// MOBILE: BOTTOM NAV + HEADER
// ============================================================
function updateBottomNav(active){
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('bn-'+active);
  if(btn)btn.classList.add('active')
}
function updateMobileHeader(title,showBack,breadcrumb,progress){
  const mh=document.getElementById('mobileHeader');
  if(!mh)return;
  document.getElementById('mhTitle').textContent=title||'escola liberal';
  document.getElementById('mhBack').style.visibility=showBack?'visible':'hidden';
  document.getElementById('mhXP').textContent=S.xp+' XP';
  const bc=document.getElementById('mhBreadcrumb');
  if(bc){bc.innerHTML=breadcrumb||'';bc.classList.toggle('show',!!breadcrumb)}
  const pg=document.getElementById('mhProgress');
  const pf=document.getElementById('mhProgressFill');
  if(pg&&pf){pg.classList.toggle('show',progress!==undefined);if(progress!==undefined)pf.style.width=progress+'%'}
}
let _mobileBackFn=null;
function mobileBack(){
  if(_mobileBackFn)_mobileBackFn();
  else goDash()
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
// AULAS TAB — mobile discipline grid
// ============================================================
function goAulasTab(){
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  updateBottomNav('aulas');
  updateMobileHeader('Disciplinas',false);
  _mobileBackFn=null;
  renderDiscGrid();
  closeSideMobile();
}

function renderDiscGrid(){
  const grid=document.getElementById('discGrid');
  const tools=document.getElementById('toolsGrid');
  if(!grid)return;
  // Reset title and show tools
  const titleEl=document.querySelector('.aulas-title');
  if(titleEl)titleEl.textContent='Escolha uma Disciplina';
  if(tools)tools.style.display='';
  const toolsTitle=document.querySelector('.tools-title');
  if(toolsTitle)toolsTitle.style.display='';

  // Group modules by discipline
  const grouped={};const order=[];
  M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!grouped[disc]){grouped[disc]=[];order.push(disc)}
    grouped[disc].push({mod:m,idx:i});
  });

  let html='';
  order.forEach(disc=>{
    const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
    const mods=grouped[disc];
    const totalL=mods.reduce((s,x)=>s+x.mod.lessons.length,0);
    const doneL=mods.reduce((s,x)=>s+x.mod.lessons.filter((_,li)=>S.done[x.idx+'-'+li]).length,0);
    const pct=totalL?Math.round(doneL/totalL*100):0;
    const color=mods[0].mod.color||'sage';
    const firstIdx=mods[0].idx;

    html+=`<div class="disc-grid-card" data-color="${color}" onclick="${mods.length===1?'goMod('+firstIdx+')':'toggleDiscMobile(\''+disc+'\')'}">
      <div class="dg-icon">${d.icon}</div>
      <div class="dg-name">${d.label}</div>
      <div class="dg-meta">${mods.length>1?mods.length+' módulos · ':''}${totalL} aulas</div>
      <div class="dg-prog"><div class="dg-prog-fill" style="width:${pct}%;background:${getModColor(color)}"></div></div>
    </div>`;
  });
  grid.innerHTML=html;

  // Tools grid
  if(tools){
    tools.innerHTML=`
      <div class="tools-grid-item" onclick="goFlashcards()"><span class="tg-icon">🃏</span><span class="tg-label">Flashcards</span></div>
      <div class="tools-grid-item" onclick="startMarathon()"><span class="tg-icon">⚡</span><span class="tg-label">Maratona</span></div>
      <div class="tools-grid-item" onclick="startExam()"><span class="tg-icon">📝</span><span class="tg-label">Simulado</span></div>
      <div class="tools-grid-item" onclick="goLeaderboard()"><span class="tg-icon">🏆</span><span class="tg-label">Liga</span></div>
      <div class="tools-grid-item" onclick="goReview()"><span class="tg-icon">🔄</span><span class="tg-label">Revisão</span></div>
      <div class="tools-grid-item" onclick="goSpaced()"><span class="tg-icon">🧠</span><span class="tg-label">Espaçada</span></div>
      <div class="tools-grid-item" onclick="goGlossary()"><span class="tg-icon">📖</span><span class="tg-label">Glossário</span></div>
    `;
  }
}

function toggleDiscMobile(disc){
  // For multi-module disciplines (e.g. Economia with 6 modules), show module list
  const mods=M.map((m,i)=>({mod:m,idx:i})).filter(x=>x.mod.discipline===disc);
  if(mods.length===1){goMod(mods[0].idx);return}
  const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
  hideAllViews();
  document.getElementById('vAulas').style.display='block';
  updateBottomNav('aulas');
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
    const pct=x.mod.lessons.length?Math.round(x.mod.lessons.filter((_,li)=>S.done[x.idx+'-'+li]).length/x.mod.lessons.length*100):0;
    const color=x.mod.color||'sage';
    html+=`<div class="disc-grid-card" data-color="${color}" onclick="goMod(${x.idx})" style="min-height:100px">
      <div class="dg-icon">${x.mod.icon||d.icon}</div>
      <div class="dg-name">${x.mod.title}</div>
      <div class="dg-meta">${x.mod.lessons.length} aulas · ${pct}%</div>
      <div class="dg-prog"><div class="dg-prog-fill" style="width:${pct}%;background:${getModColor(color)}"></div></div>
    </div>`;
  });
  grid.innerHTML=html;
}
// Expose to global scope (Vite may wrap in module scope)
window.goAulasTab=goAulasTab;
window.ttsSkipBack=ttsSkipBack;
window.ttsSkipForward=ttsSkipForward;
window.ttsSetRate=ttsSetRate;
window.toggleDiscMobile=toggleDiscMobile;
window.renderDiscGrid=renderDiscGrid;

// Override goDash etc. to update mobile nav
const _origGoDash=goDash;
goDash=function(){
  _origGoDash();
  updateBottomNav('dash');
  updateMobileHeader('escola liberal',false);
  _mobileBackFn=null;
  // Close sidebar if open
  closeSideMobile();
};
const _origGoMod=goMod;
goMod=function(i){
  if(!M[i])return;
  _origGoMod(i);
  updateBottomNav('aulas');
  const done=M[i].lessons.filter((_,li)=>S.done[`${i}-${li}`]).length;
  const pct=Math.round(done/M[i].lessons.length*100);
  const disc=M[i].discipline||'economia';
  const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
  updateMobileHeader(M[i].icon+' '+M[i].title,true,`<span onclick="goAulasTab()" style="cursor:pointer;text-decoration:underline">Aulas</span> › <span onclick="toggleDiscMobile('${disc}')" style="cursor:pointer;text-decoration:underline">${d.label}</span> › ${M[i].title}`,pct);
  // Back goes to discipline view (or Aulas tab if single-module discipline)
  const discMods=M.filter(m=>m.discipline===disc);
  _mobileBackFn=discMods.length>1?()=>toggleDiscMobile(disc):()=>goAulasTab();
  closeSideMobile();
};
const _origOpenL=openL;
openL=function(mi,li){
  if(!M[mi]||!M[mi].lessons[li])return;
  _origOpenL(mi,li);
  updateBottomNav('aulas');
  const pct=Math.round((li+1)/M[mi].lessons.length*100);
  updateMobileHeader(M[mi].lessons[li].title,true,`<span>${M[mi].title}</span> › Aula ${li+1}/${M[mi].lessons.length}`,pct);
  _mobileBackFn=()=>goMod(mi);
  closeSideMobile()
};
const _origGoPerf=goPerf;
if(typeof goPerf==='function'){
  goPerf=function(){
    _origGoPerf();
    updateBottomNav('progress');
    updateMobileHeader('📊 Desempenho',true);
    _mobileBackFn=()=>goDash();
    closeSideMobile()
  }
}
const _origGoBadges=goBadges;
if(typeof goBadges==='function'){
  goBadges=function(){
    _origGoBadges();
    updateBottomNav('progress');
    updateMobileHeader('🏅 Conquistas',true);
    _mobileBackFn=()=>goDash();
    closeSideMobile()
  }
}
const _origGoTimeline=typeof goTimeline==='function'?goTimeline:null;
if(_origGoTimeline){
  goTimeline=function(){
    _origGoTimeline();
    updateBottomNav('progress');
    updateMobileHeader('📅 Linha do Tempo',true);
    _mobileBackFn=()=>goDash();
    closeSideMobile()
  }
}

// Override tool functions for mobile header
const _origGoFlash=goFlashcards;
goFlashcards=function(){_origGoFlash();updateBottomNav('aulas');updateMobileHeader('🃏 Flashcards',true);_mobileBackFn=()=>goDash();closeSideMobile()};
const _origStartMarathon2=startMarathon;
startMarathon=function(){_origStartMarathon2();updateBottomNav('aulas');updateMobileHeader('⚡ Maratona',true);_mobileBackFn=()=>goDash();closeSideMobile()};
const _origStartExam=startExam;
startExam=function(){_origStartExam();updateBottomNav('aulas');updateMobileHeader('📝 Simulado',true);_mobileBackFn=()=>goDash();closeSideMobile()};
const _origGoReview=goReview;
goReview=function(){_origGoReview();updateBottomNav('aulas');updateMobileHeader('🔄 Revisão',true);_mobileBackFn=()=>goDash();closeSideMobile()};
const _origGoSpaced=goSpaced;
goSpaced=function(){_origGoSpaced();updateBottomNav('aulas');updateMobileHeader('🧠 Revisão Espaçada',true);_mobileBackFn=()=>goDash();closeSideMobile()};
const _origGoGlossary=goGlossary;
goGlossary=function(){_origGoGlossary();updateBottomNav('aulas');updateMobileHeader('📖 Glossário',true);_mobileBackFn=()=>goDash();closeSideMobile()};
const _origGoGame=typeof goGame==='function'?goGame:null;
if(_origGoGame){goGame=function(){_origGoGame();updateBottomNav('aulas');updateMobileHeader('🍋 Mini-Jogo',true);_mobileBackFn=()=>goDash();closeSideMobile()}}

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
  // Only swipe if horizontal, fast enough, and not scrolling vertically
  if(Math.abs(dx)<80||Math.abs(dy)>Math.abs(dx)*0.6||dt>400)return;
  const lesOn=document.getElementById('vLes')&&document.getElementById('vLes').classList.contains('on');
  if(!lesOn)return;
  if(dx>0){prevL();vibrate()}   // Swipe right = previous
  else{nextL();vibrate()}        // Swipe left = next
},{passive:true});


// ============================================================
// MOBILE: HAPTIC FEEDBACK
// ============================================================
function vibrate(ms){
  if(navigator.vibrate)navigator.vibrate(ms||15)
}
// Patch button clicks for haptic
document.addEventListener('click',e=>{
  if(e.target.closest('.btn,.qz-o,.ni,.bnav-item,.er-opt'))vibrate()
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
  if(CURRENT_LANG==='pt'){
    flag.textContent='🇺🇸';label.textContent='English';sub.textContent='Switch language'
  }else{
    flag.textContent='🇧🇷';label.textContent='Português';sub.textContent='Trocar idioma'
  }
}

// BROWSER BACK/FORWARD — restore view from history state
window.addEventListener('popstate',function(e){
  const s=e.state;
  if(!s||!s.view){goDash();return}
  if(s.view==='mod'&&M[s.mod])goMod(s.mod);
  else if(s.view==='lesson'&&M[s.mod]&&M[s.mod].lessons[s.les])openL(s.mod,s.les);
  else if(s.view==='leaderboard')goLeaderboard();
  else if(s.view==='studyplan')goStudyPlan();
  else goDash();
});

// ============================================================
// SYNC STATUS INDICATOR
// ============================================================
let _syncHideTimer=null;
function showSyncStatus(state,msg){
  const el=document.getElementById('syncIndicator');
  if(!el)return;
  el.className='sync-indicator show '+state;
  el.innerHTML=`<span class="sync-dot"></span>${msg}`;
  clearTimeout(_syncHideTimer);
  if(state==='synced')_syncHideTimer=setTimeout(()=>{el.classList.remove('show')},3000);
}
// Hook into online/offline events
window.addEventListener('online',()=>{showSyncStatus('synced','Conexão restaurada');if(typeof flushSyncQueue==='function')flushSyncQueue()});
window.addEventListener('offline',()=>showSyncStatus('offline','Offline — dados salvos localmente'));
// Override queueSync to show status
const _origQueueSync=window.queueSync;
if(typeof _origQueueSync==='function'){
  window.queueSync=function(type,data){
    showSyncStatus('syncing','Sincronizando...');
    _origQueueSync(type,data);
    // After debounce, show synced (flushSyncQueue runs after 3s)
    setTimeout(()=>{if(navigator.onLine)showSyncStatus('synced','Salvo na nuvem')},4000);
  }
}

// ============================================================
// SKELETON LOADING
// ============================================================
function showDashSkeleton(){
  const mc=document.getElementById('mcards');
  if(mc&&mc.children.length===0){
    mc.innerHTML=Array.from({length:4},()=>`<div class="skeleton skeleton-card"></div>`).join('')
  }
}
// Show skeleton immediately on first load
showDashSkeleton();

// ============================================================
// PULL TO REFRESH (mobile)
// ============================================================
(function initPTR(){
  let startY=0,pulling=false;
  const el=document.createElement('div');el.className='ptr-indicator';el.textContent='↓ Puxe para atualizar';
  document.body.appendChild(el);
  document.addEventListener('touchstart',e=>{
    if(window.scrollY===0&&e.touches.length===1){startY=e.touches[0].clientY;pulling=true}
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!pulling)return;
    const dy=e.touches[0].clientY-startY;
    if(dy>60&&dy<150)el.classList.add('show');
    else el.classList.remove('show')
  },{passive:true});
  document.addEventListener('touchend',()=>{
    if(el.classList.contains('show')){
      el.textContent='Atualizando...';
      setTimeout(()=>{location.reload()},300)
    }
    pulling=false;el.classList.remove('show');el.textContent='↓ Puxe para atualizar'
  },{passive:true})
})();

// INIT — load lessons then bootstrap
(async function _boot(){
  if(typeof initI18n==='function')initI18n();
  const ok=await loadLessons();
  if(!ok)return; // errorScreen already shown
  buildSidebar();
  updateLangToggle();
  streak();
  initOnboard();
updateSfxLabel();
scheduleStudyReminder();
enhanceAria();
updateGlobalProgress();
if(S.name!=='Aluno'){
  document.getElementById('onboard').style.display='none';
  goDash();
  setTimeout(checkWhatsNew,1500);
  // Preload full module content in background for fast lesson opens
  setTimeout(preloadModules,2000);
}
// Accept challenge from URL parameter
(function(){
  const sp=new URLSearchParams(location.search);
  const chId=sp.get('challenge');
  if(chId){
    // Remove param from URL
    const url=new URL(location);url.searchParams.delete('challenge');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    // Accept after boot
    setTimeout(()=>{acceptChallenge(chId);toast('Desafio aceito! Ganhe XP para subir.')},2000);
  }
})();
// Redirect recovery token to auth page
if(location.hash && location.hash.includes('type=recovery')){
  window.location.replace('auth.html' + location.hash);
}
// Redirect OAuth errors back to auth page
(function(){
  var sp=new URLSearchParams(location.search);
  var err=sp.get('error');
  var errCode=sp.get('error_code');
  var errDesc=sp.get('error_description');
  if(err){
    var q='?oauth_error=1&error='+encodeURIComponent(err||'')+'&error_code='+encodeURIComponent(errCode||'')+'&error_description='+encodeURIComponent(errDesc||'');
    window.location.replace('auth.html'+q);
  }
})();
if(location.hash){const m=location.hash.match(/module-(\d+)/);if(m)setTimeout(()=>goMod(parseInt(m[1])-1),100)}
})(); // end async _boot

// ============================================================
// SUPABASE INTEGRATION (carrega SDK + client de forma segura)
// ============================================================
(function(){
  var sdk=document.createElement('script');
  sdk.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  sdk.onload=function(){
    var cl=document.createElement('script');
    cl.src='supabase-client.js';
    cl.onload=function(){
      if(typeof initSupabase==='function'){
        var ok=initSupabase();
        if(ok) _renderAuth();
      }
    };
    cl.onerror=function(){console.warn('[Supabase] client.js não encontrado, modo offline.')};
    document.body.appendChild(cl);
  };
  sdk.onerror=function(){console.warn('[Supabase] SDK offline, continuando sem sync.')};
  document.body.appendChild(sdk);
})();

function _renderAuth(){
  var side=document.querySelector('.side');
  if(!side)return;
  var el=document.createElement('div');
  el.id='authSection';
  el.style.cssText='margin-top:auto;padding-top:1rem;border-top:1px solid var(--border)';
  el.innerHTML='<div class="side-label" style="margin-top:.5rem">CONTA</div>'
    +'<div id="authLoggedOut"><div class="ni" role="button" tabindex="0" onclick="location.href=\'auth.html\'"><div class="ni-icon" style="background:var(--sage-muted);color:var(--sage-light)">🔐</div><span style="font-size:.85rem">Entrar / Criar Conta</span></div></div>'
    +'<div id="authLoggedIn" style="display:none"><div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;margin-bottom:.25rem"><div style="width:28px;height:28px;border-radius:50%;background:var(--sage-muted);display:flex;align-items:center;justify-content:center;font-size:.8rem">👤</div><span id="authUserName" style="font-size:.85rem;color:var(--text-secondary)"></span></div>'
    +'<div class="ni" role="button" tabindex="0" onclick="location.href=\'perfil.html\'"><div class="ni-icon" style="background:var(--sky-muted);color:var(--sky)">⚙️</div><span style="font-size:.85rem">Meu Perfil</span></div>'
    +'<div class="ni" role="button" tabindex="0" onclick="_doSignOut()"><div class="ni-icon" style="background:var(--coral-muted);color:var(--coral)">🚪</div><span style="font-size:.85rem">Sair</span></div></div>';
  side.appendChild(el);
  // Update auth UI based on current state
  updateAuthUI();
}

function updateAuthUI(){
  var loggedOut=document.getElementById('authLoggedOut');
  var loggedIn=document.getElementById('authLoggedIn');
  var nameEl=document.getElementById('authUserName');
  if(!loggedOut||!loggedIn)return;
  if(typeof currentUser!=='undefined'&&currentUser){
    loggedOut.style.display='none';
    loggedIn.style.display='block';
    if(nameEl) nameEl.textContent=currentUser.user_metadata?.full_name||currentUser.email||'Aluno';
  } else {
    loggedOut.style.display='block';
    loggedIn.style.display='none';
  }
}

async function _doSignOut(){
  if(typeof signOut==='function'){
    await signOut();
  }
  updateAuthUI();
}

// ============================================================
// STRIPE BILLING (carrega de forma segura)
// ============================================================
(function(){
  var s=document.createElement('script');
  s.src='stripe-billing.js';
  s.onerror=function(){console.warn('[Stripe] billing.js não encontrado.')};
  document.body.appendChild(s);
})();