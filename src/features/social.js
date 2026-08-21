// ============================================================
// SOCIAL — WhatsApp Share, Save Modal, Share Progress PNG, Challenges
// Extracted from app.js
// ============================================================

// ============================================================
// SHARE — viral sharing via WhatsApp and clipboard
// ============================================================
function shareWhatsApp(){
  const done=Object.keys(window.S.done).length;
  const total=window.M.reduce((s,m)=>s+m.lessons.length,0);
  const pct=total?Math.round(done/total*100):0;
  const xp=window.totalXP();
  const msgs=[
    `Você sabe por que o real perde valor todo ano? 🤔\n\nEu não sabia. Aprendi na Escola Liberal — escola gratuita pra adultos, direto no celular.\n\n👉 https://escolaliberal.com.br\n\nSão 1.940 aulas de 5 minutos: dinheiro, juros, impostos, filosofia, como abrir um negócio. Tudo que a escola devia ter ensinado e não ensinou.\n\nJá fiz ${pct}% — duvido você me alcançar 🏆`,
    `Descobri uma escola GRATUITA que ensina o que importa 📚\n\n💰 Como sair das dívidas e investir\n🗳️ Como escolher candidato sem cair em conversa\n🧠 Como argumentar e detectar manipulação\n🚀 Como abrir um negócio do zero\n\n👉 https://escolaliberal.com.br\n\nFunciona offline, tem XP e certificado. Já tenho ${xp} XP. Vem estudar comigo?`,
    `A pergunta que me pegou hoje: 🎯\n\n"Por que os preços só sobem — e quem ganha com isso?"\n\nA resposta tá na Escola Liberal, de graça:\n👉 https://escolaliberal.com.br\n\n1.940 aulas de 5 min, no celular, com quiz e XP. A educação que a escola devia ter dado. Aceita o desafio?`
  ];
  // Especial Eleições 2026: até 04/10/2026, metade dos shares divulga a disciplina Voto Consciente
  const votoMsg=`Eleição é em outubro. Você já sabe escolher? 🗳️\n\nA maioria decide o voto em 40 segundos de vídeo. Eu tô aprendendo a decidir com MÉTODO:\n\n✅ Investigar o passado do candidato (é público e grátis)\n✅ Saber se a promessa cabe no orçamento\n✅ Fugir da manipulação de campanha\n\n👉 https://escolaliberal.com.br\n\n100% apartidário — ninguém te diz em quem votar, você aprende a decidir sozinho. 60 aulas gratuitas, funciona offline. Chega preparado 🇧🇷`;
  let text;
  if(new Date()<new Date(2026,9,5)&&Math.random()<0.5)text=votoMsg;
  else text=msgs[Math.floor(Math.random()*msgs.length)];
  const waUrl='https://wa.me/?text='+encodeURIComponent(text);
  window.open(waUrl,'_blank');
  // Track
  try{const c=parseInt(localStorage.getItem('escola_share_count')||'0');localStorage.setItem('escola_share_count',String(c+1))}catch(e){}
  if(typeof gtag==='function')gtag('event','share',{method:'whatsapp',done_count:done,xp});
  window.logActivity('share','Compartilhou no WhatsApp')
}

// ============================================================
// SAVE PROGRESS MODAL — triggers after N lessons completed
// ============================================================
const SAVE_MODAL_KEY='escola_save_modal_shown';
const SAVE_MODAL_THRESHOLD=3;
function checkSaveModal(){
  // DEMO_MODE: never nag about creating account
  if(window.DEMO_MODE)return;
  // Don't show if: already shown, user has account, or under threshold
  if(localStorage.getItem(SAVE_MODAL_KEY))return;
  if(window.S.uid||(typeof currentUser!=='undefined'&&currentUser))return; // logged in via Supabase
  const doneCount=Object.keys(window.S.done).length;
  if(doneCount>=SAVE_MODAL_THRESHOLD){
    document.getElementById('saveModalCount').textContent=doneCount;
    document.getElementById('saveModal').style.display='flex';
    localStorage.setItem(SAVE_MODAL_KEY,'1');
  }
}
function closeSaveModal(){
  const modal=window._origById('saveModal');
  if(modal){modal.style.display='none';modal.classList.remove('show')}
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
  ctx.fillText(window.S.name,w/2,145);
  // Level
  const lvlInfo=window.getLevelInfo(window.S.lvl);
  ctx.fillStyle='#9ba3b5';ctx.font='14px "DM Sans",sans-serif';
  ctx.fillText('Nível '+window.S.lvl+' · '+lvlInfo.name,w/2,170);
  // Stats
  const done=Object.keys(window.S.done).length;
  const totalQ=Object.keys(window.S.quiz).length;
  const correct=Object.values(window.S.quiz).filter(v=>v===true).length;
  const stats=[
    {label:'XP Total',value:window.S.xp.toLocaleString(),color:'#5fbf96'},
    {label:'Aulas',value:done+'/'+window.M.reduce((s,m)=>s+m.lessons.length,0),color:'#5b9bd5'},
    {label:'Sequência',value:window.S.streak+' dias',color:'#dba550'},
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
  const totalLessons=window.M.reduce((s,m)=>s+m.lessons.length,0);
  roundRect(ctx,50,barY,barW*(done/totalLessons),barH,6);ctx.fill();
  ctx.fillStyle='#9ba3b5';ctx.font='12px "DM Sans",sans-serif';
  ctx.textAlign='center';ctx.fillText(Math.round(done/totalLessons*100)+'% completo',w/2,barY+30);
  // Modules (show up to 10, dynamically from M)
  const modY=340;
  const modCount=Math.min(window.M.length,10);
  const modSpacing=Math.min(80,Math.floor((w-80)/modCount));
  const modStartX=Math.floor((w-(modCount*modSpacing))/2)+modSpacing/2;
  window.M.slice(0,modCount).forEach((mod,i)=>{
    const mx=modStartX+i*modSpacing;
    const modDone=mod.lessons.filter((_,li)=>window.S.done[`${i}-${li}`]).length;
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
  window.toast('Imagem salva!','success');
  window.logActivity('share','Progresso compartilhado como imagem')
}
// Click canvas to download
document.getElementById('shareCanvas').addEventListener('click',downloadShare);

// ============================================================
// SOCIAL CHALLENGES — Desafios entre Amigos
// ============================================================
const CHALLENGE_KEY='escola_challenges';
function loadChallenges(){try{return JSON.parse(localStorage.getItem(CHALLENGE_KEY)||'[]')}catch(e){return[]}}
function saveChallenges(c){localStorage.setItem(CHALLENGE_KEY,JSON.stringify(c))}

function createChallenge(){
  const weekId=window.getCurrentWeekId();
  const challenge={
    id:Date.now().toString(36),
    creator:window.S.name||'Aluno',
    creatorAvatar:window.S.avatar||'🧑‍🎓',
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
  const text=`🏆 ${window.S.name||'Um amigo'} te desafiou!\n\nQuem estuda mais essa semana na Escola Liberal? Cada aula de 5 minutos vale XP — e o placar é público.\n\n👉 Aceita? ${shareUrl}\n\nÉ grátis: 1.940 aulas de dinheiro, lógica, filosofia e mais, direto no celular.`;
  const waUrl='https://wa.me/?text='+encodeURIComponent(text);
  window.open(waUrl,'_blank');
  window.toast('Desafio criado! Compartilhe com amigos.');
  renderChallenges()
}

function acceptChallenge(id){
  const challenges=loadChallenges();
  const ch=challenges.find(c=>c.id===id);
  if(!ch)return;
  if(!ch.participants.find(p=>p.name===window.S.name)){
    ch.participants.push({name:window.S.name,avatar:window.S.avatar||'🧑‍🎓',xp:0});
    saveChallenges(challenges)
  }
  window.toast('Desafio aceito! Ganhe XP para subir no ranking.');
  renderChallenges()
}

function updateChallengeXP(earned){
  const challenges=loadChallenges();
  const weekId=window.getCurrentWeekId();
  let changed=false;
  challenges.forEach(ch=>{
    if(ch.weekId!==weekId)return;
    // Update creator
    if(ch.creator===window.S.name){ch.creatorXP+=earned;changed=true}
    // Update participant
    const p=ch.participants.find(p=>p.name===window.S.name);
    if(p){p.xp+=earned;changed=true}
  });
  if(changed)saveChallenges(challenges)
}

function renderChallenges(){
  const el=document.getElementById('challengeSection');
  if(!el)return;
  const challenges=loadChallenges().filter(c=>c.weekId===window.getCurrentWeekId());
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
      <div class="ch-ranking">${all.map((p,i)=>`<div class="ch-rank-row${p.name===window.S.name?' ch-rank-you':''}">
        <span class="ch-rank-pos">${['🥇','🥈','🥉'][i]||i+1+'°'}</span>
        <span class="ch-rank-avatar">${p.avatar}</span>
        <span class="ch-rank-name">${p.name===window.S.name?'Você':p.name}</span>
        <span class="ch-rank-xp">${p.xp} XP</span>
      </div>`).join('')}</div>
    </div>`;
  });
  el.innerHTML=html
}

// Hook challenge XP into addXP
const _origAddXP=window.addXP;
// We'll hook via updateChallengeXP called from addXP — already integrated via updateLeaderboardXP pattern

// Attach to window
window.shareWhatsApp=shareWhatsApp;
window.checkSaveModal=checkSaveModal;
window.closeSaveModal=closeSaveModal;
window.shareProgress=shareProgress;
window.roundRect=roundRect;
window.closeShare=closeShare;
window.downloadShare=downloadShare;
window.loadChallenges=loadChallenges;
window.saveChallenges=saveChallenges;
window.createChallenge=createChallenge;
window.acceptChallenge=acceptChallenge;
window.updateChallengeXP=updateChallengeXP;
window.renderChallenges=renderChallenges;
