// ============================================================
// SAFE DOM HELPER — prevents "Cannot read properties of null"
// ============================================================
const _origById=document.getElementById.bind(document);
const _nullProxy=new Proxy(document.createElement('div'),{get(t,p){if(p==='__isNull')return true;const v=t[p];return typeof v==='function'?v.bind(t):v},set(t,p,v){return true}});
document.getElementById=function(id){return _origById(id)||_nullProxy};

// ============================================================
// COURSE DATA — loaded from external JSON for performance
// ============================================================
let M=[];
async function loadLessons(){
  try{
    const r=await fetch('./lessons.json');
    if(!r.ok)throw new Error(r.status);
    M=await r.json();
  }catch(e){
    console.warn('[Lessons] Fetch failed, trying cache...',e.message);
    try{
      const c=await caches.match('./lessons.json');
      if(c)M=await c.json();
    }catch(e2){console.error('[Lessons] Cache also failed:',e2.message)}
  }
  if(M.length===0){
    document.getElementById('errorScreen').style.display='flex';
    return false;
  }
  return true;
}
// Legacy compat: M was const, now populated async before init

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
  history:{label:'American History',icon:'🇺🇸',order:8}
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

// Get first module index of a discipline within M
function getDiscModules(disc){return M.map((m,i)=>({mod:m,idx:i})).filter(x=>x.mod.discipline===disc)}

// Build sidebar navigation dynamically from M
function buildSidebar(){
  const nav=document.getElementById('modNav');
  if(!nav)return;
  let html='';
  const seen=new Set();
  M.forEach((m,i)=>{
    const disc=m.discipline||'economia';
    if(!seen.has(disc)){
      seen.add(disc);
      const d=DISCIPLINES[disc]||{label:disc,icon:'📚'};
      html+=`<div class="side-label side-disc" style="margin-top:.75rem">${d.icon} ${d.label}</div>`;
    }
    const c=m.color||'sage';
    html+=`<div class="ni" onclick="goMod(${i})" id="nM${i}" role="button" tabindex="0" onkeydown="if(event.key==='Enter')goMod(${i})"><div class="ni-icon" style="background:${getModColorMuted(c)};color:${getModColor(c)}">${m.icon}</div><div><div class="ni-txt">${m.title}</div><div class="ni-sub">Módulo ${i+1} · ${m.lessons.length} aulas</div></div></div>`;
  });
  nav.innerHTML=html;
}

// ============================================================
// STATE
// ============================================================
const SK='escola_v2';
let S=load();
function def(){return{name:'Aluno',avatar:null,xp:0,lvl:1,streak:0,last:null,done:{},quiz:{},cMod:null,cLes:null}}
function load(){try{const d=localStorage.getItem(SK);return d?{...def(),...JSON.parse(d)}:def()}catch(e){return def()}}
function save(){localStorage.setItem(SK,JSON.stringify(S));if(typeof queueSync==='function')queueSync('progress',S)}

// XP
function addXP(n){S.xp+=n;const need=S.lvl*100;const oldLvl=S.lvl;while(S.xp>=need){S.xp-=need;S.lvl++;toast(`Nível ${S.lvl}!  🎉`);launchConfetti();playSfx('levelup');logActivity('level',`Subiu para nível ${S.lvl}!`)}save();ui()}
function totalXP(){let t=S.xp;for(let i=1;i<S.lvl;i++)t+=i*100;return t}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}

// Streak
function streak(){
  const today=new Date().toDateString();
  if(S.last){const d=Math.floor((new Date(today)-new Date(S.last))/(864e5));if(d===1)S.streak++;else if(d>1)S.streak=1}
  else S.streak=1;
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
  // Level name badge
  const lvlEl=document.querySelector('.profile-lvl');
  if(lvlEl)lvlEl.innerHTML=`Nível ${S.lvl} · <span class="level-badge ${li.cls}">${li.emoji} ${li.name}</span>`;
  const done=Object.keys(S.done).length,total=M.reduce((s,m)=>s+m.lessons.length,0);
  document.getElementById('sLessons').textContent=done;
  const qt=Object.keys(S.quiz).length,qc=Object.values(S.quiz).filter(v=>v).length;
  document.getElementById('sQuiz').textContent=qt?Math.round(qc/qt*100)+'%':'0%';
  const sb=document.getElementById('streakB');
  sb.textContent=S.streak>0?`🔥 ${S.streak} dia${S.streak>1?'s':''} de sequência!`:'🔥 Comece sua sequência!';
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
  renderCards();renderAch()
}

function isModUnlocked(i){
  if(!M[i])return false;
  // ====== MODO TESTE: todos os módulos abertos ======
  // TODO: restaurar lógica de pré-requisito quando ativar cobrança
  return true;
  // Lógica original (preservada para reativar depois):
  // const disc=M[i].discipline||'economia';
  // const discMods=M.map((m,idx)=>({m,idx})).filter(x=>(x.m.discipline||'economia')===disc);
  // const posInDisc=discMods.findIndex(x=>x.idx===i);
  // if(posInDisc<=0)return true;
  // if(disc==='economia'&&i<=1)return true;
  // const prevIdx=discMods[posInDisc-1].idx;
  // return M[prevIdx].lessons.every((_,li)=>S.done[`${prevIdx}-${li}`])
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
    const clickAction=unlocked?(premium?`showPaywall(${i})`:`goMod(${i})`):'';
    const lockLabel=premium?'🔒 Premium':(!unlocked?'🔒 Bloqueado':'');
    html+=`<div class="mc${unlocked?'':' locked'}${premium?' premium':''}" ${clickAction?`onclick="${clickAction}"`:''}><div class="mc-top"><div class="mc-ico" style="background:${clrMuted};color:${clr}">${m.icon}</div><h3>${m.title}</h3>${lockLabel?`<span class="mc-lock">${lockLabel}</span>`:''}</div><p>${m.desc}</p><div class="mc-prog"><div class="mc-bar"><div class="mc-fill" style="width:${p}%;background:${clr}"></div></div><div class="mc-pct">${p}%</div></div></div>`;
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
  hideAllViews();
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
  S.cMod=i;const m=M[i];
  document.getElementById('mvT').textContent=m.icon+' '+m.title;
  document.getElementById('mvS').textContent=m.desc;
  const allDone=m.lessons.every((_,li)=>S.done[`${i}-${li}`]);
  document.getElementById('lsnList').innerHTML=m.lessons.map((l,li)=>{
    const k=`${i}-${li}`,d=S.done[k],cur=!d&&(li===0||S.done[`${i}-${li-1}`]),lock=false; // MODO TESTE: todas as aulas abertas
    return`<div class="lsn ${d?'done':cur?'cur':''}" onclick="openL(${i},${li})">`+
      `<div class="lsn-n">${d?'✓':li+1}</div><div class="lsn-info"><h4>${l.title}</h4><p>${l.sub}</p></div><div class="lsn-meta"><div class="reading-time">⏱ ~${calcReadTime(l.content)} min</div><div class="lsn-xp">+${l.xp} XP</div></div></div>`
  }).join('')+(allDone?`<div style="text-align:center;margin-top:1.25rem"><button class="btn btn-sage" onclick="showCert(${i})">🏅 Ver Certificado</button></div>`:'');
  hideAllViews();
  const vm=document.getElementById('vMod');vm.classList.add('on','view-enter');
  setTimeout(()=>vm.classList.remove('view-enter'),350);
  setNav('nM'+i)
}
function openL(mi,li){
  if(!M[mi]||!M[mi].lessons[li])return;
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
  save()
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
    if(justCompleted){toast('🏆 Módulo Concluído!');launchConfetti();playSfx('complete');logActivity('module',`Módulo concluído: ${M[mi].title}`);setTimeout(()=>showCert(mi),600)}
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
        const plain=les.content.replace(/<[^>]*>/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const titleN=(les.title+' '+les.sub).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const idx=plain.indexOf(norm);const tIdx=titleN.indexOf(norm);
        if(idx>=0||tIdx>=0){
          let snippet='';
          if(idx>=0){const start=Math.max(0,idx-30),end=Math.min(plain.length,idx+norm.length+40);
            snippet=(start>0?'...':'')+plain.slice(start,end).replace(new RegExp(norm,'gi'),m=>`<mark>${m}</mark>`)+(end<plain.length?'...':'');}
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
function saveNotes(all){localStorage.setItem(NOTES_KEY,JSON.stringify(all));if(typeof queueSync==='function')queueSync('notes',all)}
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
  addBotMsg('Olá! 👋 Sou o <strong>Tutor Econômico</strong> da escola liberal. Pergunte qualquer coisa sobre economia, finanças ou o conteúdo das aulas!');
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

function sendChat(){
  const inp=document.getElementById('chatIn'),txt=inp.value.trim();
  if(!txt)return;
  addUserMsg(txt);inp.value='';
  document.getElementById('chatSugs').innerHTML='';
  // Typing indicator
  const typing=document.createElement('div');typing.className='chat-msg bot typing';typing.id='typing';typing.textContent='Digitando...';
  document.getElementById('chatBody').appendChild(typing);scrollChat();
  setTimeout(()=>{
    const el=document.getElementById('typing');if(el)el.remove();
    const answer=findAnswer(txt);
    addBotMsg(answer);
    showSuggestions()
  },600+Math.random()*800)
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
  document.getElementById('certName').textContent=S.name;
  document.getElementById('certModule').textContent=`Concluiu: ${m.icon} ${m.title}`;
  document.getElementById('certDate').textContent=new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('certOverlay').classList.add('show')
}
function closeCert(){document.getElementById('certOverlay').classList.remove('show')}

// ============================================================
// DAILY CHALLENGE
// ============================================================
const DAILY_KEY='escola_daily';
function renderDaily(){
  const today=new Date().toDateString();
  let daily=JSON.parse(localStorage.getItem(DAILY_KEY)||'{}');
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
    if(el){el.classList.add('hide');setTimeout(()=>{el.style.display='none'},500)}
    goDash()
  }catch(e){console.error('[obFinish]',e.message);goDash()}
}

// ============================================================
// PAYWALL — shows upgrade prompt for premium modules
// ============================================================
function showPaywall(modIdx){
  const m=M[modIdx];if(!m)return;
  const overlay=document.createElement('div');
  overlay.className='save-modal-overlay';overlay.id='paywallModal';
  overlay.innerHTML=`<div class="save-modal">
    <button class="save-modal-close" onclick="document.getElementById('paywallModal').remove()" aria-label="Fechar">&times;</button>
    <div style="font-size:2.5rem;margin-bottom:.75rem">${m.icon}</div>
    <h2 style="font-size:1.3rem;margin-bottom:.5rem">${m.title}</h2>
    <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:1.25rem;line-height:1.6">Este módulo faz parte do plano <strong>Premium</strong>. Desbloqueie acesso completo a todas as 140 aulas, certificados e ferramentas avançadas.</p>
    <a href="perfil.html#planos" class="btn btn-sage" style="width:100%;margin-bottom:.75rem">Ver Planos — a partir de R$29,90/mês</a>
    <button class="btn btn-ghost" onclick="document.getElementById('paywallModal').remove()" style="width:100%;font-size:.85rem">Voltar</button>
  </div>`;
  document.body.appendChild(overlay);
  if(typeof gtag==='function')gtag('event','paywall_shown',{module:m.title,module_index:modIdx});
}

// ============================================================
// SHARE — viral sharing via WhatsApp and clipboard
// ============================================================
function shareProgress(){
  const done=Object.keys(S.done).length;
  const total=M.reduce((s,m)=>s+m.lessons.length,0);
  const pct=total?Math.round(done/total*100):0;
  const text=`🎓 Já completei ${done} de ${total} aulas (${pct}%) na Escola Liberal!\n\nPlataforma homeschool com 9 disciplinas, gamificação e quizzes. Grátis!\n\n👉 https://escolaliberal.com.br`;
  if(navigator.share){
    navigator.share({title:'Escola Liberal',text:text,url:'https://escolaliberal.com.br'}).catch(()=>{});
  }else{
    const waUrl='https://wa.me/?text='+encodeURIComponent(text);
    window.open(waUrl,'_blank');
  }
  if(typeof gtag==='function')gtag('event','share',{method:navigator.share?'native':'whatsapp',done_count:done});
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
  document.getElementById('saveModal').style.display='none';
}

// ============================================================
// TEXT-TO-SPEECH
// ============================================================
let ttsUtterance=null,ttsPlaying=false;
function toggleTTS(){
  if(ttsPlaying){stopTTS();return}
  if(!('speechSynthesis' in window)){toast('Áudio não suportado neste navegador');return}
  const body=document.getElementById('lvBody');
  const text=body.innerText.replace(/Quiz[\s\S]*$/,'');
  ttsUtterance=new SpeechSynthesisUtterance(text);
  ttsUtterance.lang='pt-BR';ttsUtterance.rate=0.95;
  ttsUtterance.onend=()=>{ttsPlaying=false;updateTTSBtn()};
  speechSynthesis.speak(ttsUtterance);
  ttsPlaying=true;updateTTSBtn()
}
function stopTTS(){
  if(speechSynthesis)speechSynthesis.cancel();
  ttsPlaying=false;updateTTSBtn()
}
function updateTTSBtn(){
  const btn=document.getElementById('ttsBtn');
  if(!btn)return;
  btn.classList.toggle('playing',ttsPlaying);
  btn.innerHTML=ttsPlaying?'⏸ Pausar':'🔊 Ouvir'
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
  const best=JSON.parse(localStorage.getItem(MARATHON_KEY)||'{}');
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
  if(mScore>=5){addXP(mScore*10);toast(`+${mScore*10} XP — Maratona!`)}
}
function endMarathon(){clearInterval(mInterval);goDash()}

// ============================================================
// WEEKLY MISSIONS
// ============================================================
const MISSIONS_KEY='escola_missions';
function getWeekId(){const d=new Date();const jan1=new Date(d.getFullYear(),0,1);return d.getFullYear()+'-W'+Math.ceil(((d-jan1)/864e5+jan1.getDay()+1)/7)}
function getMissions(){
  const stored=JSON.parse(localStorage.getItem(MISSIONS_KEY)||'{}');
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
function saveProfiles(p){localStorage.setItem(PROFILES_KEY,JSON.stringify(p))}
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
function openParentDash(){
  hideAllViews();
  document.getElementById('vParent').classList.add('on');
  const profiles=loadProfiles();const keys=Object.keys(profiles);
  let html='';
  keys.forEach(k=>{
    let ps;
    if(k===activeProfile)ps=S;
    else if(k==='default'){try{ps={...def(),...JSON.parse(localStorage.getItem(SK))}}catch(e){ps=def()}}
    else{try{ps={...def(),...JSON.parse(localStorage.getItem(SK+'_'+k))}}catch(e){ps=def()}}
    const done=Object.keys(ps.done||{}).length;
    const qt=Object.keys(ps.quiz||{}).length;
    const qc=Object.values(ps.quiz||{}).filter(v=>v).length;
    const pct=qt?Math.round(qc/qt*100):0;
    const li=getLevelInfo(ps.lvl||1);
    const totalL=M.reduce((s,m)=>s+m.lessons.length,0);
    html+=`<div class="parent-card"><h4>${ps.avatar||'🧑‍🎓'} ${ps.name||'Aluno'}</h4><div class="pc-stat">Nível ${ps.lvl||1} · ${li.emoji} ${li.name}</div><div class="pc-stat">${done}/${totalL} aulas · ${pct}% quizzes · ${ps.streak||0}🔥</div></div>`
  });
  html+=`<div style="margin-top:1rem"><button class="btn btn-ghost" onclick="if(confirm('Redefinir PIN?')){localStorage.removeItem('${PIN_KEY}');toast('PIN removido')}">🔐 Redefinir PIN</button></div>`;
  document.getElementById('parentCards').innerHTML=html
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
    {id:'favs3',e:'⭐',n:'Colecionador',d:'Adicione 3 favoritos',check:()=>{try{return(JSON.parse(localStorage.getItem(FAV_KEY)||'[]')).length>=3}catch(e){return false}}}
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
// CERTIFICATE AS IMAGE (CANVAS EXPORT)
// ============================================================
function exportCertImage(mi){
  const m=M[mi];const c=document.createElement('canvas');c.width=800;c.height=560;
  const ctx=c.getContext('2d');
  // Background
  const grad=ctx.createLinearGradient(0,0,800,560);
  grad.addColorStop(0,'#0f1729');grad.addColorStop(1,'#1a2540');
  ctx.fillStyle=grad;ctx.fillRect(0,0,800,560);
  // Border
  ctx.strokeStyle='#dba550';ctx.lineWidth=4;
  ctx.strokeRect(20,20,760,520);
  ctx.strokeStyle='rgba(219,165,80,.3)';ctx.lineWidth=1;
  ctx.strokeRect(30,30,740,500);
  // Seal
  ctx.font='48px serif';ctx.textAlign='center';ctx.fillStyle='#dba550';
  ctx.fillText('🏅',400,90);
  // Title
  ctx.font='bold 28px Georgia';ctx.fillStyle='#e8e6e1';
  ctx.fillText('Certificado de Conclusão',400,140);
  // Subtitle
  ctx.font='16px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText('Escola Liberal',400,170);
  // Line
  ctx.beginPath();ctx.moveTo(200,195);ctx.lineTo(600,195);ctx.strokeStyle='rgba(219,165,80,.3)';ctx.lineWidth=1;ctx.stroke();
  // Name
  ctx.font='italic 36px Georgia';ctx.fillStyle='#4a9e7e';
  ctx.fillText(S.name,400,260);
  // Module
  ctx.font='18px sans-serif';ctx.fillStyle='#e8e6e1';
  ctx.fillText(`Concluiu com êxito: ${m.title}`,400,310);
  // Date
  ctx.font='14px sans-serif';ctx.fillStyle='#9ba3b5';
  ctx.fillText(new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}),400,350);
  // Footer
  ctx.font='12px sans-serif';ctx.fillStyle='#6b7488';
  ctx.fillText('A educação que bilionários escondem dos seus filhos.',400,490);
  // Download
  const link=document.createElement('a');link.download=`certificado-${m.title.replace(/\s/g,'-').toLowerCase()}.png`;
  link.href=c.toDataURL('image/png');link.click();
  toast('📥 Certificado salvo como imagem!')
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
// MINI-GAME: BARRAQUINHA DE LIMONADA
// ============================================================
let gameDay=1,gameCash=20,gameHistory=[];
const WEATHER=['☀️ Ensolarado','⛅ Nublado','🌧️ Chuvoso','🔥 Calor intenso'];
const WEATHER_MULT=[1.0,0.6,0.3,1.4];
function goGame(){
  hideAllViews();setNav('nGame');
  document.getElementById('vGame').classList.add('on');
  gameDay=1;gameCash=20;gameHistory=[];
  renderGameDay()
}
function renderGameDay(){
  const wIdx=Math.floor(Math.random()*WEATHER.length);
  const weather=WEATHER[wIdx];const wMult=WEATHER_MULT[wIdx];
  const costPerCup=1.5;
  document.getElementById('gameContent').innerHTML=`
    <div class="game-board">
      <div class="game-day"><h3>🍋 Dia ${gameDay} de 7</h3><div class="game-weather">${weather}</div><div style="font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:700;color:var(--honey);margin-top:.5rem">Caixa: R$ ${gameCash.toFixed(2)}</div></div>
      <div class="game-controls">
        <div class="game-ctrl"><label>Preço por copo</label><input type="range" min="1" max="10" value="3" step="0.5" id="gPrice" oninput="updateGamePreview(${wMult})"><div class="game-val" id="gPriceVal">R$ 3,00</div></div>
        <div class="game-ctrl"><label>Copos a produzir</label><input type="range" min="0" max="${Math.floor(gameCash/costPerCup)}" value="${Math.min(10,Math.floor(gameCash/costPerCup))}" id="gQty" oninput="updateGamePreview(${wMult})"><div class="game-val" id="gQtyVal">${Math.min(10,Math.floor(gameCash/costPerCup))}</div></div>
      </div>
      <div class="game-preview" id="gamePreview"></div>
      <button class="btn btn-sage" style="width:100%" onclick="playGameDay(${wMult})">Abrir a Barraquinha!</button>
    </div>
    ${gameHistory.length?`<div class="game-history"><h4 style="font-size:.82rem;font-weight:600;color:var(--text-muted);margin-bottom:.5rem">Histórico</h4>${gameHistory.map((h,i)=>`<div class="game-history-row"><span>Dia ${i+1}</span><span>${h.weather}</span><span style="color:${h.profit>=0?'var(--sage)':'var(--coral)'}">R$ ${h.profit>=0?'+':''}${h.profit.toFixed(2)}</span></div>`).join('')}</div>`:''}`;
  updateGamePreview(wMult)
}
function updateGamePreview(wMult){
  const priceEl=document.getElementById('gPrice'),qtyEl=document.getElementById('gQty');
  if(!priceEl||!qtyEl)return;
  const price=parseFloat(priceEl.value);
  const qty=parseInt(qtyEl.value);
  document.getElementById('gPriceVal').textContent=`R$ ${price.toFixed(2).replace('.',',')}`;
  document.getElementById('gQtyVal').textContent=qty;
  const cost=qty*1.5;
  // Demand: higher price → less demand, better weather → more demand
  const baseDemand=Math.round(qty*wMult*(1-price/15)*1.2);
  const sold=Math.min(qty,Math.max(0,baseDemand));
  const revenue=sold*price;const profit=revenue-cost;
  document.getElementById('gamePreview').innerHTML=`
    <div><div class="gp-label">Custo</div><div class="gp-val" style="color:var(--coral)">R$ ${cost.toFixed(2)}</div></div>
    <div><div class="gp-label">Demanda est.</div><div class="gp-val">~${Math.max(0,baseDemand)} copos</div></div>
    <div><div class="gp-label">Lucro est.</div><div class="gp-val" style="color:${profit>=0?'var(--sage)':'var(--coral)'}">R$ ${profit>=0?'+':''}${profit.toFixed(2)}</div></div>`
}
function playGameDay(wMult){
  const price=parseFloat(document.getElementById('gPrice').value);
  const qty=parseInt(document.getElementById('gQty').value);
  const cost=qty*1.5;
  // Add randomness to actual demand
  const baseDemand=Math.round(qty*wMult*(1-price/15)*1.2);
  const variance=Math.round((Math.random()-.5)*qty*0.3);
  const actualDemand=Math.max(0,baseDemand+variance);
  const sold=Math.min(qty,actualDemand);
  const revenue=sold*price;const profit=revenue-cost;
  const wasted=qty-sold;
  gameCash+=profit;
  const wIdx=WEATHER.findIndex(w=>WEATHER_MULT[WEATHER.indexOf(w)]===wMult)||0;
  gameHistory.push({weather:WEATHER[wIdx]||'☀️',sold,qty,profit,price});
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
        Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,v));
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
function getNotifSettings(){return JSON.parse(localStorage.getItem(NOTIF_KEY)||'{"enabled":false,"hour":19,"minute":0}')}
function saveNotifSettings(s){localStorage.setItem(NOTIF_KEY,JSON.stringify(s))}

function requestNotifPermission(){
  if(!('Notification' in window)){toast('Seu navegador não suporta notificações','error');return Promise.resolve(false)}
  return Notification.requestPermission().then(p=>p==='granted')
}

function scheduleStudyReminder(){
  const s=getNotifSettings();
  if(!s.enabled)return;
  const now=new Date();
  const target=new Date(now);
  target.setHours(s.hour,s.minute,0,0);
  if(target<=now)target.setDate(target.getDate()+1);
  const ms=target-now;
  setTimeout(()=>{
    if(Notification.permission==='granted'){
      new Notification('escola liberal 🎓',{
        body:'Hora de estudar! Mantenha sua sequência de '+S.streak+' dias.',
        icon:'assets/icons/icon-192.png',
        badge:'assets/icons/favicon.svg'
      });
      scheduleStudyReminder()
    }
  },ms)
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
  const timeline=JSON.parse(localStorage.getItem('escola_timeline')||'[]');
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
function getDailyGoal(){return JSON.parse(localStorage.getItem(GOAL_KEY)||'{"target":3}')}
function saveDailyGoal(g){localStorage.setItem(GOAL_KEY,JSON.stringify(g))}
function getTodayLessons(){
  const timeline=JSON.parse(localStorage.getItem('escola_timeline')||'[]');
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
function updateMobileHeader(title,showBack){
  const mh=document.getElementById('mobileHeader');
  if(!mh)return;
  document.getElementById('mhTitle').textContent=title||'escola liberal';
  document.getElementById('mhBack').style.visibility=showBack?'visible':'hidden';
  document.getElementById('mhXP').textContent=S.xp+' XP'
}
let _mobileBackFn=null;
function mobileBack(){
  if(_mobileBackFn)_mobileBackFn();
  else goDash()
}
function openModulesView(){
  goDash();
  setTimeout(()=>{
    const mc=document.getElementById('mcards');
    if(mc)mc.scrollIntoView({behavior:'smooth'})
  },100);
  updateBottomNav('mod')
}
function toggleSideMobile(){
  const side=document.getElementById('side');
  side.classList.toggle('open');
  // Close when clicking outside
  if(side.classList.contains('open')){
    const overlay=document.createElement('div');
    overlay.id='sideOverlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199';
    overlay.onclick=()=>{side.classList.remove('open');overlay.remove()};
    document.body.appendChild(overlay)
  }else{
    const ov=document.getElementById('sideOverlay');
    if(ov)ov.remove()
  }
}

// Override goDash etc. to update mobile nav
const _origGoDash=goDash;
goDash=function(){
  _origGoDash();
  updateBottomNav('dash');
  updateMobileHeader('escola liberal',false);
  _mobileBackFn=null;
  // Close sidebar if open
  document.getElementById('side').classList.remove('open');
  const ov=document.getElementById('sideOverlay');if(ov)ov.remove()
};
const _origGoMod=goMod;
goMod=function(i){
  if(!M[i])return;
  _origGoMod(i);
  updateBottomNav('mod');
  updateMobileHeader(M[i].icon+' '+M[i].title,true);
  _mobileBackFn=()=>goDash()
};
const _origOpenL=openL;
openL=function(mi,li){
  if(!M[mi]||!M[mi].lessons[li])return;
  _origOpenL(mi,li);
  updateMobileHeader(M[mi].lessons[li].title,true);
  _mobileBackFn=()=>goMod(mi)
};
const _origGoPerf=goPerf;
if(typeof goPerf==='function'){
  goPerf=function(){
    _origGoPerf();
    updateBottomNav('progress');
    updateMobileHeader('📊 Desempenho',true);
    _mobileBackFn=()=>goDash()
  }
}
const _origGoBadges=goBadges;
if(typeof goBadges==='function'){
  goBadges=function(){
    _origGoBadges();
    updateBottomNav('badges');
    updateMobileHeader('🏅 Conquistas',true);
    _mobileBackFn=()=>goDash()
  }
}

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

// Show swipe hint once on first lesson
function showSwipeHint(){
  if(localStorage.getItem('escola_swipe_shown'))return;
  const hint=document.getElementById('swipeHint');
  if(!hint)return;
  hint.classList.add('show');
  setTimeout(()=>{hint.classList.remove('show');localStorage.setItem('escola_swipe_shown','1')},3000)
}

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
  const arrow=document.getElementById(id==='toolsSection'?'toolsArrow':'');
  if(arrow)arrow.classList.toggle('rotated')
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
  setTimeout(checkWhatsNew,1500)
}
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
// Show swipe hint on first lesson open
const _origOpenL2=openL;
openL=function(mi,li){_origOpenL2(mi,li);showSwipeHint()};
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