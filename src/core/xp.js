// ============================================================
// XP & XP EVENTS
// ============================================================
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
  const S=window.S;
  if(S.lvl<1)S.lvl=1;
  const{mult,label}=getXPMultiplier();
  const earned=n*mult;
  S.xp+=earned;
  const oldLvl=S.lvl;
  while(S.xp>=S.lvl*100){S.xp-=S.lvl*100;S.lvl++;window.toast(`Nível ${S.lvl}!  🎉`);window.launchConfetti();window.playSfx('levelup');window.logActivity('level',`Subiu para nível ${S.lvl}!`)}
  window.save();window.ui();
  if(typeof window.updateLeaderboardXP==='function')window.updateLeaderboardXP(earned);
  if(typeof window.updateChallengeXP==='function')window.updateChallengeXP(earned);
  if(mult>1&&n>0)window.toast(`${label} +${earned} XP (${mult}x)`)
}
function totalXP(){const S=window.S;let t=S.xp;for(let i=1;i<S.lvl;i++)t+=i*100;return t}
function toast(m,type){const t=document.getElementById('toast');t.textContent=m;t.className='toast show'+(type?' toast-'+type:'');setTimeout(()=>{t.classList.remove('show')},2500)}

// Streak
function streak(){
  const S=window.S;
  const today=new Date().toDateString();
  const todayISO=new Date().toISOString().slice(0,10);
  if(S.last){const d=Math.floor((new Date(today)-new Date(S.last))/(864e5));if(d===1)S.streak++;else if(d>1)S.streak=1}
  else S.streak=1;
  if(!S.streakDays)S.streakDays=[];
  if(!S.streakDays.includes(todayISO)){S.streakDays.push(todayISO);if(S.streakDays.length>30)S.streakDays=S.streakDays.slice(-30)}
  S.last=today;window.save()
}

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

// Attach to window
window.getXPMultiplier=getXPMultiplier;
window.addXP=addXP;
window.totalXP=totalXP;
window.toast=toast;
window.streak=streak;
window.LEVEL_NAMES=LEVEL_NAMES;
window.getLevelInfo=getLevelInfo;

// XP ganho no jogo Cidade Livre (jogo.html deposita em chave propria;
// o app credita pela via oficial addXP — teto de 500 por importacao)
window.addEventListener('load',()=>{setTimeout(()=>{try{
  const pend=parseInt(localStorage.getItem('escola_jogo_xp_pendente')||'0',10)||0;
  if(pend>0 && window.S && window.addXP){
    const ganho=Math.min(pend,500);
    localStorage.setItem('escola_jogo_xp_pendente','0');
    window.addXP(ganho);
    if(window.toast)window.toast(`🏛️ +${ganho} XP — Cidade Livre`);
    if(window.save)window.save();
  }
}catch(e){}},2500)});
