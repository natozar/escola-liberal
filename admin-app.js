// ============================================================
// CONFIG
// ============================================================
const SB_URL='https://hwjplecfqsckfiwxiedo.supabase.co';
const SB_KEY='sb_publishable_-_ZYfPPllImPNCKOA1ZMXQ_zYYM-P6q';
const ADMIN_LOGS_KEY='escola_admin_logs';
const AUTO_RULES_KEY='escola_auto_push_rules';

let sb=null;
let adminUser=null;
let allUsers=[];
let allProgress=[];
let allLeads=[];
let filteredUsers=[];
let _authAttempts=0;
let _authLocked=false;

// ============================================================
// AUTH — PIN
// ============================================================
// Login via Google OAuth — sem senha. Redireciona para o Google e volta para admin.html.
async function authGoogle(){
  const errEl=document.getElementById('authErr');
  errEl.textContent='Redirecionando para o Google…';
  initSupabase();
  if(!sb){errEl.textContent='⚠ Supabase não carregou';return}
  try{
    const redir=location.origin+location.pathname; // volta para /admin.html
    const{error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:redir,queryParams:{prompt:'select_account'}}});
    if(error)errEl.textContent='Erro: '+error.message;
  }catch(e){errEl.textContent='Erro: '+e.message}
}

// Verifica se a sessão atual (inclui o callback do OAuth) é admin e entra; senão fica no gate.
async function verifyAdminAndEnter(){
  initSupabase();
  if(!sb)return;
  try{
    const{data:{session}}=await sb.auth.getSession();
    if(!session)return; // sem sessão → gate visível
    const{data:me}=await sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();
    if(me&&me.is_admin===true){
      sessionStorage.setItem('admin_auth','1');
      enterAdmin();
    }else{
      const errEl=document.getElementById('authErr');
      if(errEl)errEl.textContent='Esta conta Google não tem acesso administrativo';
      try{await sb.from('error_reports').insert({kind:'admin_login_non_admin',severity:'warning',message:'Login Google valido mas sem is_admin tentou acessar admin',user_agent:(navigator.userAgent||'').slice(0,250),url_path:'/admin.html'})}catch(_){}
      await sb.auth.signOut();
    }
  }catch(e){}
}

// Device lock — admin acessível só do dispositivo-comando autorizado.
function _getDeviceId(){
  let id=localStorage.getItem('admin_device_id');
  if(!id){id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.round(Math.random()*1e9));localStorage.setItem('admin_device_id',id);}
  return id;
}
// Lê a lista de dispositivos autorizados (formato novo em array + legado single).
// Retorna {devices:[{id,label,added_at}], ids:Set}
async function _loadAuthorizedDevices(){
  const devices=[]; const ids=new Set();
  try{
    const{data}=await sb.from('admin_settings').select('key,value').in('key',['admin_devices','admin_device']);
    (data||[]).forEach(r=>{
      if(r.key==='admin_devices'&&Array.isArray(r.value)){
        r.value.forEach(d=>{if(d&&d.id&&!ids.has(d.id)){ids.add(d.id);devices.push({id:d.id,label:d.label||'Dispositivo',added_at:d.added_at||null})}});
      }
      if(r.key==='admin_device'&&r.value){ // legado: um único id string
        const legacy=typeof r.value==='string'?r.value:String(r.value);
        if(legacy&&!ids.has(legacy)){ids.add(legacy);devices.push({id:legacy,label:'Dispositivo inicial (legado)',added_at:null})}
      }
    });
  }catch(_){}
  return{devices,ids};
}

// Persiste a lista consolidada em admin_devices (fonte única a partir de agora).
// Remove a chave legada admin_device para evitar que um dispositivo removido volte.
async function _saveAuthorizedDevices(devices){
  await sb.from('admin_settings').upsert({key:'admin_devices',value:devices},{onConflict:'key'});
  try{await sb.from('admin_settings').delete().eq('key','admin_device')}catch(_){}
}

// Retorna true se este dispositivo está autorizado. Registra o 1º dispositivo (TOFU).
async function enforceDeviceLock(){
  if(!sb)return true; // sem banco (offline) não trava o admin legítimo
  const myDevice=_getDeviceId();
  try{
    const{devices,ids}=await _loadAuthorizedDevices();
    if(ids.size===0){ // primeiro setup: este dispositivo vira o comando
      await _saveAuthorizedDevices([{id:myDevice,label:'Dispositivo inicial',added_at:new Date().toISOString()}]);
      return true;
    }
    if(ids.has(myDevice))return true;
    // dispositivo diferente dos autorizados → invasão
    try{await sb.from('error_reports').insert({kind:'admin_intrusion',severity:'critical',message:'Acesso admin de dispositivo NAO autorizado (device lock)',details:{device:myDevice},user_agent:(navigator.userAgent||'').slice(0,250),url_path:'/admin.html'})}catch(_){}
    return false;
  }catch(e){return true;} // erro de rede não deve travar o admin legítimo
}

// ============================================================
// GERENCIAMENTO DE DISPOSITIVOS (aba Segurança)
// ============================================================
async function renderAdminDevices(){
  const myId=_getDeviceId();
  const myEl=document.getElementById('devMyId');
  if(myEl)myEl.textContent=myId;
  const listEl=document.getElementById('devList');
  if(!listEl)return;
  if(!sb){listEl.innerHTML='<div style="color:var(--muted);font-size:.82rem">Supabase offline.</div>';return}
  const{devices}=await _loadAuthorizedDevices();
  if(!devices.length){listEl.innerHTML='<div style="color:var(--muted);font-size:.82rem">Nenhum dispositivo registrado ainda.</div>';return}
  listEl.innerHTML=devices.map(d=>{
    const isMe=d.id===myId;
    const added=d.added_at?new Date(d.added_at).toLocaleDateString('pt-BR'):'—';
    return`<div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;border:1px solid var(--border);border-radius:8px;padding:.55rem .8rem;margin-bottom:.5rem">
      <div style="min-width:0">
        <div style="font-weight:600;font-size:.85rem">${esc(d.label)} ${isMe?'<span class="badge badge-green" style="margin-left:.3rem">este dispositivo</span>':''}</div>
        <div style="font-size:.68rem;color:var(--muted);word-break:break-all">${esc(d.id)} · desde ${added}</div>
      </div>
      <button class="btn btn-red btn-sm" data-action="removeAdminDevice" data-id="${esc(d.id)}" style="flex-shrink:0;font-size:.72rem" ${isMe?'title="Você está usando este dispositivo"':''}>Remover</button>
    </div>`;
  }).join('');
}

async function addAdminDevice(){
  if(!sb){admToast('⚠ Supabase offline');return}
  const idEl=document.getElementById('devNewId'), labelEl=document.getElementById('devNewLabel');
  const id=(idEl.value||'').trim();
  const label=(labelEl.value||'').trim()||'Dispositivo';
  if(id.length<8){admToast('⚠ Cole um ID de dispositivo válido');return}
  try{
    const{devices,ids}=await _loadAuthorizedDevices();
    if(ids.has(id)){admToast('✓ Esse dispositivo já está autorizado');return}
    devices.push({id,label,added_at:new Date().toISOString()});
    await _saveAuthorizedDevices(devices);
    idEl.value='';labelEl.value='';
    admToast('✓ Dispositivo autorizado: '+label);
    admLog('Device lock: autorizado "'+label+'" ('+id.slice(0,12)+'…)');
    renderAdminDevices();
  }catch(e){admToast('❌ '+e.message)}
}

async function removeAdminDevice(id){
  if(!sb||!id)return;
  const myId=_getDeviceId();
  const warn=id===myId?'⚠ ATENÇÃO: este é o dispositivo que você está usando AGORA. Se remover, pode perder o acesso ao admin. Continuar?':'Remover este dispositivo autorizado?';
  if(!confirm(warn))return;
  try{
    const{devices}=await _loadAuthorizedDevices();
    const next=devices.filter(d=>d.id!==id);
    if(!next.length){admToast('⚠ Não é possível remover o último dispositivo');return}
    await _saveAuthorizedDevices(next);
    admToast('✓ Dispositivo removido');
    admLog('Device lock: removido '+id.slice(0,12)+'…');
    renderAdminDevices();
  }catch(e){admToast('❌ '+e.message)}
}

function copyMyDeviceId(){
  const id=_getDeviceId();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(id).then(()=>admToast('✓ ID copiado')).catch(()=>admToast('ID: '+id));
  }else{admToast('ID: '+id)}
}

async function enterAdmin(){
  document.getElementById('authGate').classList.add('hidden');
  document.getElementById('mainApp').style.display='block';
  initSupabase();
  // A sessão já foi estabelecida no login Google (OAuth, sem senha).
  // Device lock: só o dispositivo-comando autorizado passa.
  const deviceOk=await enforceDeviceLock();
  if(!deviceOk){
    sessionStorage.removeItem('admin_auth');
    if(sb)try{await sb.auth.signOut()}catch(_){}
    const _did=_getDeviceId();
    document.body.innerHTML='<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1729;color:#e8e6e1;font-family:system-ui;text-align:center;padding:2rem"><div><div style="font-size:3rem;margin-bottom:1rem">🚫</div><h1 style="font-size:1.4rem;margin-bottom:.5rem">Dispositivo não autorizado</h1><p style="color:#9ba3b5;max-width:440px;margin:0 auto">Este painel só pode ser acessado de um dispositivo autorizado. Esta tentativa foi registrada. Para liberar este aparelho, copie o ID abaixo e autorize-o pelo dispositivo já liberado (aba 🛡️ Segurança → Dispositivos autorizados).</p><div style="margin-top:1.25rem"><div style="font-size:.72rem;color:#7a8ca3;margin-bottom:.3rem">ID deste dispositivo:</div><code style="user-select:all;word-break:break-all;background:#1a2436;border:1px solid #2a3a55;border-radius:8px;padding:.5rem .8rem;display:inline-block;max-width:420px;font-size:.8rem">'+_did+'</code></div></div></div>';
    return;
  }
  loadAllData();
  loadAutoRules();
  loadPaywallState();
  renderLogs();
  admLog('Login admin');
}

// Check if already authenticated this session
async function checkExistingSession(){
  // Cobre re-visita E o retorno do OAuth do Google (o SDK detecta a sessão no hash).
  await verifyAdminAndEnter();
}

// ============================================================
// SUPABASE
// ============================================================
function initSupabase(){
  if(sb)return;
  if(typeof window.supabase==='undefined'){admToast('⚠ Supabase SDK não carregado');return}
  sb=window.supabase.createClient(SB_URL,SB_KEY);
}

// ============================================================
// DATA LOADING
// ============================================================
async function loadAllData(){
  if(!sb){admToast('⚠ Supabase não inicializado');return}
  admToast('🔄 Carregando dados...');

  try{
    // Load profiles
    const{data:profiles,error:pErr}=await sb.from('profiles').select('*').order('created_at',{ascending:false});
    if(pErr)throw pErr;

    // Load progress
    const{data:progress,error:prErr}=await sb.from('progress').select('*');
    if(prErr)throw prErr;

    // Load leads
    const{data:leads}=await sb.from('leads').select('*').order('created_at',{ascending:false});
    allLeads=leads||[];

    // Merge profiles + progress
    const progMap={};
    (progress||[]).forEach(p=>{progMap[p.profile_id]=p});

    allUsers=(profiles||[]).map(p=>{
      const prog=progMap[p.id]||{};
      const doneCount=prog.completed_lessons?Object.keys(prog.completed_lessons).length:0;
      const quizResults=prog.quiz_results||{};
      const quizTotal=Object.keys(quizResults).length;
      const quizCorrect=Object.values(quizResults).filter(v=>v).length;
      return{
        id:p.id,
        name:p.name||'Aluno',
        email:p.email||'—',
        state:p.state||'',
        plan:p.plan||'free',
        avatar:p.avatar||'🧑‍🎓',
        xp:prog.xp||0,
        level:prog.level||1,
        streak:prog.streak||0,
        lessons:doneCount,
        quizTotal,quizCorrect,
        lastStudy:prog.last_study_date||null,
        createdAt:p.created_at||null,
        onboardingDone:p.onboarding_done||false,
        // dados brutos para o histórico detalhado
        completedLessons:prog.completed_lessons||{},
        quizResults,
        currentModule:prog.current_module,
        currentLesson:prog.current_lesson,
        ageGroup:p.age_group||'',
        birthYear:p.birth_year||null
      };
    });

    // Note: sb.auth.admin.listUsers() requires service_role key (not available client-side)
    // Email enrichment: try getting from current user's profile metadata
    try{
      const{data:{user}}=await sb.auth.getUser();
      // Admin can see emails via profiles table (is_admin RLS)
    }catch(e){
      // Admin API may not be available with anon key — that's ok
      console.warn('[Admin] Auth admin API not available (expected with anon key)');
    }

    filteredUsers=[...allUsers];
    renderDashboard();
    renderUsersTable();
    renderQuizDropoff();
    renderLeads();
    renderPushHistory();
    renderGeography();
    renderInstalls();
    renderImpact();
    admToast('✓ Dados carregados: '+allUsers.length+' usuários');
    admLog('Dados carregados: '+allUsers.length+' usuários, '+allLeads.length+' leads');
  }catch(e){
    admToast('❌ Erro: '+e.message);
    console.error('[Admin]',e);
  }
}

// ============================================================
// DASHBOARD RENDER
// ============================================================
function renderDashboard(){
  const now=new Date();
  const d7=new Date(now-7*864e5);
  const d30=new Date(now-30*864e5);

  const total=allUsers.length;
  const active=allUsers.filter(u=>u.lastStudy&&new Date(u.lastStudy)>=d7).length;
  const newUsers=allUsers.filter(u=>u.createdAt&&new Date(u.createdAt)>=d30).length;
  const avgXP=total?Math.round(allUsers.reduce((s,u)=>s+u.xp,0)/total):0;
  const totalLessons=allUsers.reduce((s,u)=>s+u.lessons,0);
  const totalQuiz=allUsers.reduce((s,u)=>s+u.quizTotal,0);
  const correctQuiz=allUsers.reduce((s,u)=>s+u.quizCorrect,0);
  const quizRate=totalQuiz?Math.round(correctQuiz/totalQuiz*100)+'%':'—';

  document.getElementById('stTotal').textContent=total;
  document.getElementById('stTotalSub').textContent=allLeads.length+' leads capturados';
  document.getElementById('stActive').textContent=active;
  document.getElementById('stActiveSub').textContent=total?Math.round(active/total*100)+'% do total':'—';
  document.getElementById('stNew').textContent=newUsers;
  document.getElementById('stNewSub').textContent='últimos 30 dias';
  document.getElementById('stXP').textContent=avgXP.toLocaleString();
  document.getElementById('stLessons').textContent=totalLessons.toLocaleString();
  document.getElementById('stQuiz').textContent=quizRate;

  // Revenue / subscription metrics
  const premium=allUsers.filter(u=>u.plan==='premium'||u.plan==='vitalicio'||u.plan==='familia').length;
  const convRate=total?Math.round(premium/total*100):0;
  const canceled=allUsers.filter(u=>u.plan==='free'&&u.lessons>10).length; // proxy: engaged users on free
  const mrr=premium*29.90; // estimated at R$29.90/mo
  document.getElementById('stPremium').textContent=premium;
  document.getElementById('stPremiumSub').textContent=total?Math.round(premium/total*100)+'% do total':'—';
  document.getElementById('stConversion').textContent=convRate+'%';
  document.getElementById('stChurn').textContent=canceled;
  document.getElementById('stMRR').textContent='R$ '+mrr.toFixed(2).replace('.',',');

  // Signup chart (30 days)
  renderSignupChart();
  renderTopUsers();
  renderRetentionFunnel();
  renderDiscPopularity();
}

function renderSignupChart(){
  const days=[];
  for(let i=29;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=d.toISOString().split('T')[0];
    const count=allUsers.filter(u=>u.createdAt&&u.createdAt.startsWith(ds)).length;
    days.push({label:(d.getDate())+'/'+(d.getMonth()+1),count,ds});
  }
  const max=Math.max(...days.map(d=>d.count),1);
  document.getElementById('signupChart').innerHTML=days.map(d=>`<div class="bar-col"><div class="bar-val">${d.count||''}</div><div class="bar" style="height:${Math.max(2,d.count/max*140)}px"></div><div class="bar-label">${d.label}</div></div>`).join('');
}

function renderTopUsers(){
  const top=allUsers.slice().sort((a,b)=>b.xp-a.xp).slice(0,10);
  if(!top.length){document.getElementById('topUsers').innerHTML='<div style="color:var(--muted);font-size:.82rem;padding:.5rem">Nenhum usuário encontrado</div>';return}
  const maxXP=top[0].xp||1;
  document.getElementById('topUsers').innerHTML='<table style="width:100%"><thead><tr><th>#</th><th>Usuário</th><th>XP</th><th>Nível</th><th>Aulas</th><th></th></tr></thead><tbody>'+
    top.map((u,i)=>`<tr><td style="font-weight:700;color:var(--accent)">${i+1}</td><td>${u.avatar} ${esc(u.name)}</td><td style="font-weight:600">${u.xp.toLocaleString()}</td><td>${u.level}</td><td>${u.lessons}</td><td><div style="width:80px;height:6px;background:var(--border);border-radius:3px"><div style="width:${Math.round(u.xp/maxXP*100)}%;height:100%;background:var(--sage);border-radius:3px"></div></div></td></tr>`).join('')+
    '</tbody></table>';
}

function renderRetentionFunnel(){
  const total=allUsers.length;
  if(!total){document.getElementById('retentionFunnel').innerHTML='<div style="color:var(--muted);font-size:.82rem">Sem dados</div>';return}
  const onboarded=allUsers.filter(u=>u.onboardingDone||u.lessons>0).length;
  const lesson1=allUsers.filter(u=>u.lessons>=1).length;
  const lesson5=allUsers.filter(u=>u.lessons>=5).length;
  const lesson20=allUsers.filter(u=>u.lessons>=20).length;
  const streak7=allUsers.filter(u=>u.streak>=7).length;
  const premium=allUsers.filter(u=>u.plan!=='free').length;

  const steps=[
    {label:'Cadastro',count:total,color:'var(--blue)'},
    {label:'Onboarding',count:onboarded,color:'var(--blue)'},
    {label:'1ª aula',count:lesson1,color:'var(--sage)'},
    {label:'5 aulas',count:lesson5,color:'var(--sage)'},
    {label:'20 aulas',count:lesson20,color:'var(--accent)'},
    {label:'7d streak',count:streak7,color:'var(--accent)'},
    {label:'Premium',count:premium,color:'var(--green)'},
  ];

  document.getElementById('retentionFunnel').innerHTML=steps.map(s=>{
    const pct=total?Math.round(s.count/total*100):0;
    return`<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">
      <div style="width:90px;font-size:.75rem;font-weight:600;text-align:right">${s.label}</div>
      <div style="flex:1;height:24px;background:var(--border);border-radius:6px;overflow:hidden;position:relative">
        <div style="width:${Math.max(2,pct)}%;height:100%;background:${s.color};border-radius:6px;transition:width .5s"></div>
        <span style="position:absolute;right:8px;top:3px;font-size:.68rem;font-weight:600">${s.count} (${pct}%)</span>
      </div>
    </div>`
  }).join('')
}

function renderDiscPopularity(){
  // Count lessons done per discipline across all users
  // Since we store progress as objects, we need to count keys matching module-lesson patterns
  // For now, use aggregate lessons count per user and distribute proportionally
  // TODO: when progress has discipline-level data, use that
  const discMap={};
  allUsers.forEach(u=>{
    if(u.lessons>0){
      // Distribute lessons roughly based on available disciplines
      if(!discMap['total'])discMap['total']=0;
      discMap['total']+=u.lessons;
    }
  });
  const totalDone=discMap['total']||0;
  if(!totalDone){document.getElementById('discPopularity').innerHTML='<div style="color:var(--muted);font-size:.82rem">Sem dados suficientes</div>';return}
  // Show total engagement metrics instead
  const avgLessons=allUsers.length?Math.round(totalDone/allUsers.length):0;
  const maxLessons=Math.max(...allUsers.map(u=>u.lessons),1);
  const medianLessons=allUsers.length?allUsers.map(u=>u.lessons).sort((a,b)=>a-b)[Math.floor(allUsers.length/2)]:0;
  document.getElementById('discPopularity').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;text-align:center">
      <div><div style="font-size:1.5rem;font-weight:700;color:var(--sage)">${totalDone.toLocaleString()}</div><div style="font-size:.72rem;color:var(--muted)">Total aulas feitas</div></div>
      <div><div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${avgLessons}</div><div style="font-size:.72rem;color:var(--muted)">Média por aluno</div></div>
      <div><div style="font-size:1.5rem;font-weight:700;color:var(--blue)">${medianLessons}</div><div style="font-size:.72rem;color:var(--muted)">Mediana por aluno</div></div>
    </div>
    <div style="margin-top:1rem;font-size:.72rem;color:var(--muted)">Aluno mais engajado: ${maxLessons} aulas completadas</div>`
}

// ============================================================
// USERS TABLE
// ============================================================
function renderUsersTable(){
  const body=document.getElementById('usersBody');
  if(!filteredUsers.length){body.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:2rem">Nenhum usuário encontrado</td></tr>';return}
  body.innerHTML=filteredUsers.map(u=>{
    const planBadge=u.plan==='premium'?'badge-accent':u.plan==='familia'?'badge-blue':'badge-green';
    const planLabel=u.plan==='premium'?'Premium':u.plan==='familia'?'Família':'Free';
    const lastStr=u.lastStudy?timeAgo(u.lastStudy):'Nunca';
    const createdStr=u.createdAt?new Date(u.createdAt).toLocaleDateString('pt-BR'):'—';
    const inactiveDays=u.lastStudy?Math.floor((Date.now()-new Date(u.lastStudy))/(864e5)):999;
    const statusBadge=inactiveDays<=7?'badge-green':inactiveDays<=30?'badge-yellow':'badge-red';
    const statusLabel=inactiveDays<=7?'Ativo':inactiveDays<=30?'Inativo':'Ausente';
    return`<tr data-action="openUserHistory" data-id="${u.id}" style="cursor:pointer" title="Ver histórico completo">
      <td>${u.avatar} ${esc(u.name)}</td>
      <td style="font-size:.72rem">${esc(u.email)}</td>
      <td><span class="badge ${planBadge}">${planLabel}</span></td>
      <td style="font-weight:600">${u.xp.toLocaleString()}</td>
      <td>${u.level}</td>
      <td>${u.lessons}</td>
      <td>${u.streak>0?'🔥 '+u.streak:'—'}</td>
      <td><span class="badge ${statusBadge}">${statusLabel}</span> <span style="font-size:.68rem;color:var(--muted)">${lastStr}</span></td>
      <td style="font-size:.72rem">${createdStr}</td>
    </tr>`;
  }).join('');
  document.getElementById('userCount').textContent=`Mostrando ${filteredUsers.length} de ${allUsers.length} usuários`;
}

function filterUsers(){
  const q=(document.getElementById('userSearch').value||'').toLowerCase();
  const f=document.getElementById('userFilter').value;
  const now=Date.now();
  filteredUsers=allUsers.filter(u=>{
    if(q&&!u.name.toLowerCase().includes(q)&&!u.email.toLowerCase().includes(q))return false;
    if(f==='active'){const d=u.lastStudy?Math.floor((now-new Date(u.lastStudy))/864e5):999;return d<=7}
    if(f==='inactive'){const d=u.lastStudy?Math.floor((now-new Date(u.lastStudy))/864e5):999;return d>30}
    if(f==='premium')return u.plan==='premium'||u.plan==='familia';
    if(f==='free')return u.plan==='free';
    return true;
  });
  renderUsersTable();
}

// ============================================================
// QUIZ DROP-OFF — acessam o sistema mas não completam quiz
// ============================================================
let _quizDropList=[];

// "acessou" = tem qualquer sinal de uso (abriu aula, tem último acesso, ou concluiu onboarding).
// "não completou quiz" = quizTotal === 0 (nenhuma questão respondida em quiz_results).
function _accessedNoQuiz(u){
  const accessed=(u.lessons>0)||!!u.lastStudy||u.onboardingDone;
  return accessed && (u.quizTotal||0)===0;
}
function _daysInactive(u){
  return u.lastStudy?Math.floor((Date.now()-new Date(u.lastStudy))/864e5):null;
}
// Chaves de aulas LIDAS (completed_lessons) que NÃO têm quiz respondido (quiz_results).
// = "leu a aula e pulou o quiz". Mesma chave "mi-li" nos dois lados.
function _readNoQuizKeys(u){
  const done=u.completedLessons||{}, q=u.quizResults||{};
  return Object.keys(done).filter(k=>!(k in q));
}
function _readNoQuizCount(u){return _readNoQuizKeys(u).length}

function renderQuizDropoff(){
  // Base: quem leu ao menos uma aula sem responder o quiz dela
  const base=allUsers.filter(u=>_readNoQuizCount(u)>0);

  // Métricas do topo
  const totalSkipped=base.reduce((s,u)=>s+_readNoQuizCount(u),0); // total de quizzes pulados
  const zeroQuiz=base.filter(u=>(u.quizTotal||0)===0).length;      // leem mas nunca fazem quiz
  const activeReaders=base.filter(u=>{const d=_daysInactive(u);return d!=null&&d<=7}).length;
  const readersTotal=allUsers.filter(u=>u.lessons>0).length;       // quem leu ao menos 1 aula
  const pct=readersTotal?Math.round(base.length/readersTotal*100):0;

  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('qzReaders',base.length);
  set('qzReadersSub',pct+'% de quem lê aulas');
  set('qzSkipped',totalSkipped);
  set('qzZero',zeroQuiz);
  set('qzActive',activeReaders);

  // Tendência: novos alunos (por cadastro) que leem sem fazer quiz (últimos 30 dias)
  const chart=document.getElementById('qzTrendChart');
  if(chart){
    const days=[];
    for(let i=29;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const ds=d.toISOString().split('T')[0];
      const count=base.filter(u=>u.createdAt&&u.createdAt.startsWith(ds)).length;
      days.push({label:d.getDate()+'/'+(d.getMonth()+1),count});
    }
    const max=Math.max(...days.map(d=>d.count),1);
    chart.innerHTML=days.map(d=>`<div class="bar-col"><div class="bar-val">${d.count||''}</div><div class="bar" style="height:${Math.max(2,d.count/max*140)}px;background:var(--red)"></div><div class="bar-label">${d.label}</div></div>`).join('');
  }

  // Filtro + busca da tabela
  const q=(document.getElementById('qzSearch')?.value||'').toLowerCase();
  const f=document.getElementById('qzFilter')?.value||'all';
  let list=base.filter(u=>{
    if(q&&!u.name.toLowerCase().includes(q)&&!(u.email||'').toLowerCase().includes(q))return false;
    const d=_daysInactive(u);
    if(f==='zero')return (u.quizTotal||0)===0;
    if(f==='active')return d!=null&&d<=7;
    if(f==='inactive')return d==null||d>30;
    return true; // all
  });
  // Ordena por quem mais pula quiz, depois por acesso mais recente
  list.sort((a,b)=>{
    const sa=_readNoQuizCount(a), sb2=_readNoQuizCount(b);
    if(sb2!==sa)return sb2-sa;
    const da=_daysInactive(a), db=_daysInactive(b);
    if(da==null)return 1; if(db==null)return -1; return da-db;
  });
  _quizDropList=list;

  const body=document.getElementById('qzBody');
  if(!body)return;
  if(!list.length){body.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2rem">Ninguém está pulando quiz 🎉</td></tr>';document.getElementById('qzCount').textContent='';return}
  body.innerHTML=list.map(u=>{
    const d=_daysInactive(u);
    const skipped=_readNoQuizCount(u);
    const lastStr=u.lastStudy?timeAgo(u.lastStudy):'Nunca';
    const inactBadge=d==null?'badge-red':d<=7?'badge-green':d<=30?'badge-yellow':'badge-red';
    const inactLabel=d==null?'nunca estudou':d+'d';
    return`<tr data-action="openUserHistory" data-id="${u.id}" style="cursor:pointer" title="Ver histórico completo">
      <td>${u.avatar} ${esc(u.name)}</td>
      <td style="font-size:.72rem">${esc(u.email)}</td>
      <td style="font-weight:600">${u.lessons}</td>
      <td style="color:var(--red);font-weight:700">${skipped}</td>
      <td>${u.quizTotal||0}</td>
      <td>${u.streak>0?'🔥 '+u.streak:'—'}</td>
      <td style="font-size:.72rem">${lastStr}</td>
      <td><span class="badge ${inactBadge}">${inactLabel}</span></td>
    </tr>`;
  }).join('');
  document.getElementById('qzCount').textContent=`${list.length} de ${base.length} alunos · ${totalSkipped} quizzes pulados no total`;
}

function exportQuizDropoffCSV(){
  if(!_quizDropList.length){admToast('⚠ Nada para exportar');return}
  const cols=['name','email','lessons_read','lessons_without_quiz','quizzes_done','streak','last_study','days_inactive'];
  const rows=_quizDropList.map(u=>{
    const d=_daysInactive(u);
    return[u.name,u.email,u.lessons,_readNoQuizCount(u),u.quizTotal||0,u.streak,u.lastStudy||'',d==null?'':d];
  });
  const csv=[cols.join(',')].concat(rows.map(r=>r.map(v=>{
    const s=String(v==null?'':v).replace(/"/g,'""');
    return /[,"\r\n]/.test(s)?`"${s}"`:s;
  }).join(','))).join('\n');
  downloadFile(csv,'quiz_dropoff.csv','text/csv');
  admToast('✓ CSV exportado: '+_quizDropList.length+' usuários');
  admLog('Exportação quiz drop-off: '+_quizDropList.length+' usuários');
}

// ============================================================
// USER HISTORY — histórico completo de um usuário
// ============================================================
function _lessonKeyLabel(key){
  // chaves típicas: "mi-li" (módulo-aula) — mostra de forma legível
  const m=String(key).match(/^(\d+)[-_.](\d+)$/);
  if(m)return`Módulo ${(+m[1])+1} · Aula ${(+m[2])+1}`;
  return String(key);
}

async function openUserHistory(id){
  const u=allUsers.find(x=>x.id===id);
  if(!u){admToast('⚠ Usuário não encontrado');return}
  const modal=document.getElementById('userHistoryModal');
  const titleEl=document.getElementById('uhTitle');
  const body=document.getElementById('uhBody');
  titleEl.textContent=`${u.avatar} ${u.name}`;

  const quizRate=u.quizTotal?Math.round(u.quizCorrect/u.quizTotal*100)+'%':'—';
  const lastStr=u.lastStudy?new Date(u.lastStudy).toLocaleString('pt-BR'):'Nunca';
  const createdStr=u.createdAt?new Date(u.createdAt).toLocaleString('pt-BR'):'—';
  const planLabel=u.plan==='premium'?'Premium':u.plan==='familia'?'Família':u.plan==='vitalicio'?'Vitalício':'Free';

  // Cabeçalho de perfil + progresso (dados já em memória)
  let html=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem;margin-bottom:1.25rem">
      ${_uhStat('XP',u.xp.toLocaleString(),'var(--accent)')}
      ${_uhStat('Nível',u.level)}
      ${_uhStat('Streak',u.streak>0?'🔥 '+u.streak:'—')}
      ${_uhStat('Aulas concluídas',u.lessons,'var(--sage)')}
      ${_uhStat('Quizzes',u.quizTotal)}
      ${_uhStat('Acerto no quiz',quizRate,u.quizTotal?'var(--green)':'var(--muted)')}
    </div>
    <div style="font-size:.8rem;color:var(--muted);line-height:1.9;margin-bottom:1.25rem;border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem">
      <div><strong style="color:var(--text)">Email:</strong> ${esc(u.email)}</div>
      <div><strong style="color:var(--text)">Plano:</strong> ${planLabel} &nbsp;·&nbsp; <strong style="color:var(--text)">Estado:</strong> ${esc(u.state||'—')} &nbsp;·&nbsp; <strong style="color:var(--text)">Faixa:</strong> ${esc(u.ageGroup||'—')}</div>
      <div><strong style="color:var(--text)">Cadastro:</strong> ${createdStr}</div>
      <div><strong style="color:var(--text)">Último acesso:</strong> ${lastStr}</div>
      <div><strong style="color:var(--text)">Posição atual:</strong> ${u.currentModule!=null?'Módulo '+((+u.currentModule)+1):'—'}${u.currentLesson!=null?' · Aula '+((+u.currentLesson)+1):''}</div>
    </div>`;

  // Detalhe dos quizzes respondidos
  const qEntries=Object.entries(u.quizResults||{});
  html+=`<h3 style="font-size:.95rem;margin:.5rem 0 .6rem">✅ Quizzes respondidos (${qEntries.length})</h3>`;
  if(!qEntries.length){
    html+=`<div style="color:var(--muted);font-size:.82rem;margin-bottom:1.25rem">Nenhum quiz respondido até agora.</div>`;
  }else{
    html+='<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem">'+qEntries.map(([k,v])=>
      `<span class="badge ${v?'badge-green':'badge-red'}" title="${_lessonKeyLabel(k)}">${_lessonKeyLabel(k)} ${v?'✓':'✗'}</span>`
    ).join('')+'</div>';
  }

  // Aulas concluídas
  const lKeys=Object.keys(u.completedLessons||{});
  html+=`<h3 style="font-size:.95rem;margin:.5rem 0 .6rem">📖 Aulas concluídas (${lKeys.length})</h3>`;
  if(!lKeys.length){
    html+=`<div style="color:var(--muted);font-size:.82rem;margin-bottom:1.25rem">Nenhuma aula concluída.</div>`;
  }else{
    html+='<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem">'+lKeys.slice(0,120).map(k=>
      `<span class="badge badge-blue">${_lessonKeyLabel(k)}</span>`
    ).join('')+(lKeys.length>120?`<span style="color:var(--muted);font-size:.75rem;align-self:center">+${lKeys.length-120}</span>`:'')+'</div>';
  }

  // Aulas lidas sem responder o quiz
  const skipKeys=_readNoQuizKeys(u);
  html+=`<h3 style="font-size:.95rem;margin:.5rem 0 .6rem">⏭️ Leu a aula mas pulou o quiz (${skipKeys.length})</h3>`;
  if(!skipKeys.length){
    html+=`<div style="color:var(--muted);font-size:.82rem;margin-bottom:1.25rem">Respondeu o quiz de todas as aulas que leu. 🎉</div>`;
  }else{
    html+='<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem">'+skipKeys.slice(0,120).map(k=>
      `<span class="badge badge-yellow">${_lessonKeyLabel(k)}</span>`
    ).join('')+(skipKeys.length>120?`<span style="color:var(--muted);font-size:.75rem;align-self:center">+${skipKeys.length-120}</span>`:'')+'</div>';
  }

  // Timeline (buscada sob demanda no Supabase)
  html+=`<h3 style="font-size:.95rem;margin:.5rem 0 .6rem">🕑 Linha do tempo de atividades</h3>
    <div id="uhTimeline"><div style="color:var(--muted);font-size:.82rem">Carregando atividades…</div></div>`;

  body.innerHTML=html;
  modal.style.display='block';
  document.body.style.overflow='hidden';
  admLog('Abriu histórico do usuário: '+u.name);

  // Carrega a timeline da nuvem
  const tlEl=document.getElementById('uhTimeline');
  if(!sb){if(tlEl)tlEl.innerHTML='<div style="color:var(--muted);font-size:.82rem">Supabase offline — timeline indisponível.</div>';return}
  try{
    const{data,error}=await sb.from('timeline')
      .select('activity_type,description,created_at')
      .eq('profile_id',id)
      .order('created_at',{ascending:false})
      .limit(200);
    if(error)throw error;
    if(!data||!data.length){tlEl.innerHTML='<div style="color:var(--muted);font-size:.82rem">Nenhuma atividade registrada na nuvem.</div>';return}
    const icons={lesson:'📖',quiz:'✅',level:'🏆',badge:'🏅',daily:'⭐',share:'📤',backup:'💾',install:'📱',exam:'📝',module:'🎓'};
    tlEl.innerHTML=data.map(e=>{
      const icon=icons[e.activity_type]||'📌';
      const date=e.created_at?new Date(e.created_at).toLocaleString('pt-BR'):'';
      return`<div style="display:flex;gap:.6rem;align-items:flex-start;padding:.45rem 0;border-bottom:1px solid var(--border)">
        <span style="font-size:1.1rem;flex-shrink:0">${icon}</span>
        <div style="flex:1;min-width:0"><div style="font-size:.82rem">${esc(e.description||e.activity_type)}</div>
        <div style="font-size:.68rem;color:var(--muted)">${date}</div></div></div>`;
    }).join('');
  }catch(e){
    tlEl.innerHTML='<div style="color:var(--red);font-size:.82rem">Erro ao carregar timeline: '+esc(e.message)+'</div>';
  }
}

function _uhStat(label,val,color){
  return`<div style="background:var(--bg,rgba(255,255,255,.02));border:1px solid var(--border);border-radius:10px;padding:.6rem .75rem;text-align:center">
    <div style="font-size:1.15rem;font-weight:700;color:${color||'var(--text)'}">${val}</div>
    <div style="font-size:.68rem;color:var(--muted)">${label}</div></div>`;
}

function closeUserHistory(){
  const modal=document.getElementById('userHistoryModal');
  if(modal)modal.style.display='none';
  document.body.style.overflow='';
}

// ============================================================
// EXPORT (XML, CSV, JSON)
// ============================================================
function getSelectedFields(){
  return Array.from(document.querySelectorAll('.exp-field:checked')).map(c=>c.value);
}

function getFilteredForExport(){
  const f=document.getElementById('exportFilter').value;
  const now=Date.now();
  let list=allUsers;
  if(f==='active')list=list.filter(u=>u.lastStudy&&(now-new Date(u.lastStudy))/864e5<=7);
  if(f==='inactive')list=list.filter(u=>!u.lastStudy||(now-new Date(u.lastStudy))/864e5>30);
  if(f==='premium')list=list.filter(u=>u.plan==='premium'||u.plan==='familia');
  if(f==='leads')return allLeads.map(l=>({name:l.name||'',email:l.email||'',plan:'lead',xp:0,level:0,lessons:0,streak:0,last_active:'',created_at:l.created_at||'',age_group:l.age_group||''}));
  return list;
}

function userToRow(u,fields){
  const row={};
  if(fields.includes('name'))row.name=u.name||'';
  if(fields.includes('email'))row.email=u.email||'';
  if(fields.includes('plan'))row.plan=u.plan||'free';
  if(fields.includes('xp'))row.xp=u.xp||0;
  if(fields.includes('level'))row.level=u.level||1;
  if(fields.includes('lessons'))row.lessons=u.lessons||0;
  if(fields.includes('streak'))row.streak=u.streak||0;
  if(fields.includes('last_active'))row.last_active=u.lastStudy||u.last_active||'';
  if(fields.includes('created_at'))row.created_at=u.createdAt||u.created_at||'';
  if(fields.includes('age_group'))row.age_group=u.age_group||'';
  return row;
}

function toXML(rows,fields){
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<users>\n';
  rows.forEach(u=>{
    const r=userToRow(u,fields);
    xml+='  <user>\n';
    Object.entries(r).forEach(([k,v])=>{xml+=`    <${k}>${escXml(String(v))}</${k}>\n`});
    xml+='  </user>\n';
  });
  xml+='</users>';
  return xml;
}

function toCSV(rows,fields){
  const headers=fields.join(',');
  const lines=rows.map(u=>{
    const r=userToRow(u,fields);
    return fields.map(f=>`"${String(r[f]||'').replace(/"/g,'""')}"`).join(',');
  });
  return headers+'\n'+lines.join('\n');
}

function toJSON(rows,fields){
  return JSON.stringify(rows.map(u=>userToRow(u,fields)),null,2);
}

function doExport(){
  const fmt=document.getElementById('exportFormat').value;
  const fields=getSelectedFields();
  if(!fields.length){admToast('⚠ Selecione pelo menos um campo');return}
  const rows=getFilteredForExport();
  if(!rows.length){admToast('⚠ Nenhum registro encontrado');return}

  let content,filename,mime;
  if(fmt==='xml'){content=toXML(rows,fields);filename='escola_liberal_users.xml';mime='application/xml'}
  else if(fmt==='csv'){content=toCSV(rows,fields);filename='escola_liberal_users.csv';mime='text/csv'}
  else{content=toJSON(rows,fields);filename='escola_liberal_users.json';mime='application/json'}

  downloadFile(content,filename,mime);
  admToast('✓ Exportado: '+rows.length+' registros ('+fmt.toUpperCase()+')');
  admLog('Exportação '+fmt.toUpperCase()+': '+rows.length+' registros');
}

function exportXML(){
  const fields=['name','email','plan','xp','level','lessons','streak'];
  const content=toXML(allUsers,fields);
  downloadFile(content,'escola_liberal_users.xml','application/xml');
  admToast('✓ XML exportado: '+allUsers.length+' usuários');
  admLog('Exportação rápida XML: '+allUsers.length+' usuários');
}

function exportCSV(){
  const fields=['name','email','plan','xp','level','lessons','streak'];
  const content=toCSV(allUsers,fields);
  downloadFile(content,'escola_liberal_users.csv','text/csv');
  admToast('✓ CSV exportado: '+allUsers.length+' usuários');
}

function previewExport(){
  const fmt=document.getElementById('exportFormat').value;
  const fields=getSelectedFields();
  if(!fields.length){admToast('⚠ Selecione pelo menos um campo');return}
  const rows=getFilteredForExport().slice(0,5);
  let content;
  if(fmt==='xml')content=toXML(rows,fields);
  else if(fmt==='csv')content=toCSV(rows,fields);
  else content=toJSON(rows,fields);
  document.getElementById('exportCode').textContent=content;
  document.getElementById('exportPreview').style.display='block';
}

function downloadFile(content,filename,mime){
  const blob=new Blob([content],{type:mime+';charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
async function sendManualPush(){
  const title=document.getElementById('pushTitle').value.trim();
  const body=document.getElementById('pushBody').value.trim();
  const target=document.getElementById('pushTarget').value;
  const scheduleAt=document.getElementById('pushSchedule').value;
  const url=document.getElementById('pushUrl').value.trim();

  if(!title||!body){admToast('⚠ Preencha título e mensagem');return}

  // Count target audience
  const now=Date.now();
  let audience=allUsers;
  if(target==='noquiz')audience=audience.filter(_accessedNoQuiz);
  if(target==='noquiz_lessons')audience=audience.filter(u=>_readNoQuizCount(u)>0);
  if(target==='inactive7')audience=audience.filter(u=>!u.lastStudy||(now-new Date(u.lastStudy))/864e5>7);
  if(target==='inactive30')audience=audience.filter(u=>!u.lastStudy||(now-new Date(u.lastStudy))/864e5>30);
  if(target==='active')audience=audience.filter(u=>u.lastStudy&&(now-new Date(u.lastStudy))/864e5<=7);
  if(target==='premium')audience=audience.filter(u=>u.plan==='premium'||u.plan==='familia');
  if(target==='free')audience=audience.filter(u=>u.plan==='free');

  // Save push record to Supabase
  try{
    await sb.from('push_notifications').insert({
      title,body,
      target_filter:target,
      target_count:audience.length,
      action_url:url||null,
      scheduled_at:scheduleAt?new Date(scheduleAt).toISOString():new Date().toISOString(),
      status:scheduleAt?'scheduled':'sent',
      sent_by:'admin',
      created_at:new Date().toISOString()
    });
    admToast(`✓ Push ${scheduleAt?'agendado':'enviado'} para ${audience.length} usuários`);
    admLog(`Push ${scheduleAt?'agendado':'enviado'}: "${title}" → ${audience.length} usuários (${target})`);
    renderPushHistory();

    // Clear form
    document.getElementById('pushBody').value='';
    document.getElementById('pushSchedule').value='';
  }catch(e){
    // Table may not exist yet — save locally
    const pushes=JSON.parse(localStorage.getItem('escola_push_history')||'[]');
    pushes.unshift({title,body,target,count:audience.length,url,scheduledAt:scheduleAt||null,sentAt:new Date().toISOString(),status:scheduleAt?'scheduled':'sent'});
    localStorage.setItem('escola_push_history',JSON.stringify(pushes));
    admToast(`✓ Push registrado localmente (${audience.length} usuários). Tabela push_notifications não existe no Supabase.`);
    admLog(`Push local: "${title}" → ${audience.length} usuários`);
    renderPushHistory();
  }
}

async function renderPushHistory(){
  const container=document.getElementById('pushHistory');
  let pushes=[];

  // Try Supabase first
  try{
    const{data}=await sb.from('push_notifications').select('*').order('created_at',{ascending:false}).limit(50);
    if(data&&data.length)pushes=data;
  }catch(e){}

  // Fallback to local
  if(!pushes.length){
    pushes=JSON.parse(localStorage.getItem('escola_push_history')||'[]');
  }

  if(!pushes.length){
    container.innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.82rem">Nenhuma notificação enviada ainda</div>';
    return;
  }

  container.innerHTML='<table style="width:100%"><thead><tr><th>Data</th><th>Título</th><th>Mensagem</th><th>Público</th><th>Alcance</th><th>Status</th></tr></thead><tbody>'+
    pushes.map(p=>{
      const date=p.created_at||p.sentAt?new Date(p.created_at||p.sentAt).toLocaleString('pt-BR'):'—';
      const statusBadge=p.status==='sent'?'badge-green':p.status==='scheduled'?'badge-yellow':'badge-blue';
      return`<tr><td style="font-size:.72rem">${date}</td><td style="font-weight:600">${esc(p.title)}</td><td style="font-size:.72rem">${esc((p.body||'').substring(0,60))}${(p.body||'').length>60?'...':''}</td><td style="font-size:.72rem">${p.target_filter||p.target||'all'}</td><td>${p.target_count||p.count||'—'}</td><td><span class="badge ${statusBadge}">${p.status}</span></td></tr>`;
    }).join('')+'</tbody></table>';
}

// ============================================================
// AUTO PUSH RULES
// ============================================================
function loadAutoRules(){
  const rules=JSON.parse(localStorage.getItem(AUTO_RULES_KEY)||'{}');
  document.getElementById('ruleInactive3').checked=rules.inactive3!==false;
  document.getElementById('ruleInactive7').checked=rules.inactive7!==false;
  document.getElementById('ruleModComplete').checked=rules.modComplete!==false;
  document.getElementById('ruleStreak').checked=rules.streak!==false;
  document.getElementById('ruleNoQuiz').checked=rules.noQuiz!==false;
  document.getElementById('ruleWelcome').checked=rules.welcome!==false;
}

function saveAutoRules(){
  const rules={
    inactive3:document.getElementById('ruleInactive3').checked,
    inactive7:document.getElementById('ruleInactive7').checked,
    modComplete:document.getElementById('ruleModComplete').checked,
    streak:document.getElementById('ruleStreak').checked,
    noQuiz:document.getElementById('ruleNoQuiz').checked,
    welcome:document.getElementById('ruleWelcome').checked
  };
  localStorage.setItem(AUTO_RULES_KEY,JSON.stringify(rules));

  // Also try to save to Supabase for persistence
  try{
    sb.from('admin_settings').upsert({key:'auto_push_rules',value:rules,updated_at:new Date().toISOString()},{onConflict:'key'});
  }catch(e){}
}

// ============================================================
// LEADS
// ============================================================
function renderLeads(){
  const body=document.getElementById('leadsBody');
  if(!allLeads.length){body.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">Nenhum lead capturado ainda</td></tr>';return}
  body.innerHTML=allLeads.map(l=>`<tr>
    <td style="font-size:.78rem">${esc(l.email||'—')}</td>
    <td>${esc(l.name||'—')}</td>
    <td>${l.age_group||'—'}</td>
    <td><span class="badge badge-blue">${l.source||'onboarding'}</span></td>
    <td style="font-size:.72rem">${l.created_at?new Date(l.created_at).toLocaleString('pt-BR'):'—'}</td>
  </tr>`).join('');
}

// ============================================================
// TABS
// ============================================================
function switchTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  event.target.classList.add('active');
  const pan=document.getElementById('pan'+id.charAt(0).toUpperCase()+id.slice(1));
  if(pan)pan.classList.add('active');
  if(id==='security')loadSecurity();
  if(id==='jogo')loadJogo();
}

// ============================================================
// CIDADE LIVRE — engajamento do jogo (tabela jogo_scores)
// ============================================================
const JG_CENARIOS={nova:{e:'🏘️',n:'Cidade Nova'},litoranea:{e:'🌊',n:'Litorânea'},mineradora:{e:'⛏️',n:'Mineradora'},capital:{e:'🏙️',n:'A Capital'}};
function _jgEsc(s){return String(s==null?'':s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c])}
function _jgSemanaISO(){const d=new Date(),j=new Date(d.getFullYear(),0,1);return d.getFullYear()*100+Math.ceil((((d-j)/864e5)+j.getDay()+1)/7)}

async function loadJogo(){
  if(!sb){admToast('⚠ Supabase não inicializado');return}
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v==null?'—':String(v)};
  try{
    const{data,error}=await sb.from('jogo_scores').select('nick,cenario,seed,score,prosperidade,player_id,created_at').order('created_at',{ascending:false}).limit(2000);
    if(error)throw error;
    const linhas=data||[];
    if(!linhas.length){
      set('jgPartidas',0);set('jgJogadores',0);set('jgRecorde','—');set('jgMedia','—');
      set('jgSemana',0);set('jgRejogo','—');set('jgProsp','—');set('jgAulas',0);
      const vazio='<div style="color:var(--muted);font-size:.85rem;padding:.5rem">Nenhuma partida publicada ainda. O ranking acende quando o primeiro prefeito publicar.</div>';
      ['jgCenarios','jgTop','jgUltimas'].forEach(i=>{const e=document.getElementById(i);if(e)e.innerHTML=vazio});
      return;
    }
    const jogadores=new Set(linhas.map(l=>l.player_id));
    const semanaAtual=_jgSemanaISO();
    const daSemana=linhas.filter(l=>Math.floor(l.seed/10)===semanaAtual||l.seed===semanaAtual);
    const soma=(a,f)=>a.reduce((s,x)=>s+(f(x)||0),0);
    set('jgPartidas',linhas.length);
    set('jgJogadores',jogadores.size);
    set('jgRecorde',Math.max(...linhas.map(l=>l.score)));
    set('jgMedia',(soma(linhas,l=>l.score)/linhas.length).toFixed(1));
    set('jgSemana',daSemana.length);
    set('jgRejogo',(linhas.length/jogadores.size).toFixed(1));
    set('jgProsp',Math.round(soma(linhas,l=>l.prosperidade)/linhas.length));
    // estimativa pedagógica: 1 aula concluída a cada ~14 semanas sobrevividas (crise + reforma)
    set('jgAulas',Math.round(soma(linhas,l=>l.score)/14));

    // cidades mais jogadas
    const porCen={};
    linhas.forEach(l=>{porCen[l.cenario]=(porCen[l.cenario]||0)+1});
    const maxCen=Math.max(...Object.values(porCen));
    const elCen=document.getElementById('jgCenarios');
    if(elCen)elCen.innerHTML=Object.entries(porCen).sort((a,b)=>b[1]-a[1]).map(([c,n])=>{
      const meta=JG_CENARIOS[c]||{e:'🏙️',n:c};
      return `<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem">
        <div style="width:130px;font-size:.85rem">${meta.e} ${_jgEsc(meta.n)}</div>
        <div style="flex:1;background:var(--bg);border-radius:6px;height:20px;overflow:hidden"><div style="background:var(--sage);height:100%;width:${Math.round(n/maxCen*100)}%"></div></div>
        <div style="width:60px;text-align:right;font-size:.85rem;color:var(--muted)">${n}</div></div>`;
    }).join('');

    // top 10 da semana (dedupe por jogador)
    const melhor=new Map();
    daSemana.slice().sort((a,b)=>b.score-a.score).forEach(l=>{if(!melhor.has(l.player_id))melhor.set(l.player_id,l)});
    const top=[...melhor.values()].slice(0,10);
    const elTop=document.getElementById('jgTop');
    if(elTop)elTop.innerHTML=top.length?top.map((l,i)=>{
      const meta=JG_CENARIOS[l.cenario]||{e:'🏙️',n:l.cenario};
      return `<div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border);font-size:.88rem">
        <span>${i+1}º ${_jgEsc(l.nick)} <span style="color:var(--muted)">${meta.e} ${_jgEsc(meta.n)}</span></span>
        <b style="color:var(--accent)">${l.score} sem</b></div>`;
    }).join(''):'<div style="color:var(--muted);font-size:.85rem">Nenhuma partida publicada nesta semana ainda.</div>';

    // últimas partidas
    const elU=document.getElementById('jgUltimas');
    if(elU)elU.innerHTML=linhas.slice(0,12).map(l=>{
      const meta=JG_CENARIOS[l.cenario]||{e:'🏙️',n:l.cenario};
      return `<div style="display:flex;justify-content:space-between;padding:.45rem 0;border-bottom:1px solid var(--border);font-size:.85rem">
        <span>${_jgEsc(l.nick)} <span style="color:var(--muted)">${meta.e} · ${l.score} sem · ${l.prosperidade}% prosp.</span></span>
        <span style="color:var(--muted)">${_secFmtTime(l.created_at)}</span></div>`;
    }).join('');
  }catch(e){
    const msg=(e&&e.message||'').includes('does not exist')||(e&&e.code)==='42P01'
      ? 'Tabela jogo_scores ainda não existe neste projeto.'
      : 'Não foi possível carregar os dados do jogo.';
    ['jgCenarios','jgTop','jgUltimas'].forEach(i=>{const el=document.getElementById(i);if(el)el.innerHTML=`<div style="color:var(--muted);font-size:.85rem">${msg}</div>`});
  }
}

// ============================================================
// SECURITY AREA — relatorios de erros e tentativas de invasao
// ============================================================
const SEV_BADGE={critical:'background:#3a1a1a;color:#e07460;border:1px solid #5a2a2a',warning:'background:#3a2e1a;color:#d4a843;border:1px solid #5a4a2a',info:'background:#1a2a3a;color:#7aa3d4;border:1px solid #2a3a5a'};
const SEV_LABEL={critical:'CRÍTICO',warning:'WARNING',info:'INFO'};
let _secErrors=[];
let _secIntegrity=[];

function _secEsc(s){return String(s==null?'':s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c])}
function _secFmtTime(t){if(!t)return '—';const d=new Date(t),now=new Date(),diff=(now-d)/1000;if(diff<60)return Math.floor(diff)+'s atrás';if(diff<3600)return Math.floor(diff/60)+'m atrás';if(diff<86400)return Math.floor(diff/3600)+'h atrás';return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR').slice(0,5)}

async function loadSecurity(){
  if(!sb){admToast('⚠ Supabase não inicializado');return}
  try{
    const swEl=document.getElementById('secSwVersion');
    if(swEl&&navigator.serviceWorker){
      const reg=await navigator.serviceWorker.getRegistration();
      const v=reg&&reg.active?'ativo':'—';
      swEl.textContent=v;
    }
    const lastEl=document.getElementById('secLastUpdate');
    if(lastEl)lastEl.textContent=new Date().toLocaleString('pt-BR');

    // Manifesto
    try{
      const mr=await fetch('/lessons/integrity.json',{cache:'no-store'});
      const mEl=document.getElementById('secManifestStatus');
      if(mr.ok){const m=await mr.json();if(mEl)mEl.textContent=Object.keys(m.files||{}).length+' arquivos · '+(m.generated||'').slice(0,16)}
      else if(mEl)mEl.textContent='ausente';
    }catch(_){}

    // Summary RPC
    let summary=null;
    try{const{data}=await sb.rpc('security_summary');summary=data}catch(_){}
    if(summary){
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v==null?'—':String(v)};
      set('secCritical',summary.errors_critical_unresolved);
      set('secErr24h',summary.errors_24h);
      set('secErr7d',summary.errors_7d);
      set('secErrTotal',summary.errors_all);
      set('secIntegrity',summary.integrity_unresolved);
      const tk=summary.top_kinds_7d||[];
      const tkEl=document.getElementById('secTopKinds');
      if(tkEl){
        if(!tk.length){tkEl.innerHTML='<div style="color:var(--muted)">Sem eventos nos últimos 7 dias.</div>'}
        else{
          tkEl.innerHTML=tk.map(t=>`<div style="display:flex;justify-content:space-between;padding:.4rem .6rem;border-bottom:1px solid var(--border)"><span>${_secEsc(t.kind)}</span><strong>${t.c}</strong></div>`).join('');
        }
      }
    }

    // Lista de erros
    const sev=document.getElementById('secFilterSev').value;
    const res=document.getElementById('secFilterRes').value;
    let q=sb.from('error_reports').select('*').order('occurred_at',{ascending:false}).limit(200);
    if(sev!=='all')q=q.eq('severity',sev);
    if(res==='open')q=q.eq('resolved',false);
    else if(res==='resolved')q=q.eq('resolved',true);
    const{data:errs,error:eErr}=await q;
    if(eErr)throw eErr;
    _secErrors=errs||[];
    renderSecurityList();

    // Integrity alerts
    const{data:ints}=await sb.from('integrity_alerts').select('*').order('occurred_at',{ascending:false}).limit(50);
    _secIntegrity=ints||[];
    renderIntegrityList();

    // Dispositivos autorizados
    renderAdminDevices();

  }catch(e){
    admToast('❌ Erro ao carregar segurança: '+e.message);
    console.error('[Security]',e);
  }
}

function renderSecurityList(){
  const el=document.getElementById('secErrorsList');
  if(!el)return;
  if(!_secErrors.length){el.innerHTML='<div style="color:var(--muted);padding:1rem;text-align:center">✅ Nenhum evento. Sistema limpo.</div>';return}
  el.innerHTML=_secErrors.map(r=>{
    const sevSt=SEV_BADGE[r.severity]||SEV_BADGE.info;
    const sevLb=SEV_LABEL[r.severity]||r.severity;
    const det=r.details?_secEsc(JSON.stringify(r.details).slice(0,400)):'';
    const ua=r.user_agent?_secEsc(r.user_agent.slice(0,80)):'';
    return `<div style="border:1px solid var(--border);border-radius:8px;padding:.7rem;margin-bottom:.5rem;background:${r.resolved?'transparent':'var(--card-bg,rgba(255,255,255,.02))'}">
      <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem">
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <span style="${sevSt};padding:.15rem .5rem;border-radius:4px;font-size:.7rem;font-weight:700">${sevLb}</span>
          <strong style="font-family:ui-monospace,monospace;font-size:.85rem">${_secEsc(r.kind)}</strong>
          <span style="color:var(--muted);font-size:.72rem">${_secFmtTime(r.occurred_at)}</span>
        </div>
        <div style="display:flex;gap:.3rem">
          ${r.resolved?'<span style="color:var(--green);font-size:.72rem">✓ resolvido</span>':`<button class="btn btn-ghost" data-action="resolveSecurityItem" data-table="error_reports" data-id="${r.id}" style="padding:.2rem .5rem;font-size:.72rem">Resolver</button>`}
        </div>
      </div>
      <div style="font-size:.82rem;margin-bottom:.3rem;word-break:break-word">${_secEsc(r.message||'(sem mensagem)')}</div>
      ${r.url_path?`<div style="color:var(--muted);font-size:.7rem">📍 ${_secEsc(r.url_path)}</div>`:''}
      ${ua?`<div style="color:var(--muted);font-size:.7rem">🖥 ${ua}</div>`:''}
      ${det?`<details style="margin-top:.4rem"><summary style="cursor:pointer;font-size:.72rem;color:var(--muted)">detalhes</summary><pre style="font-size:.7rem;background:rgba(0,0,0,.2);padding:.4rem;border-radius:4px;overflow-x:auto;margin:.3rem 0 0">${det}</pre></details>`:''}
    </div>`;
  }).join('');
}

function renderIntegrityList(){
  const el=document.getElementById('secIntegrityList');
  if(!el)return;
  if(!_secIntegrity.length){el.innerHTML='<div style="color:var(--green);padding:1rem;text-align:center">✅ Nenhuma adulteração detectada.</div>';return}
  el.innerHTML=_secIntegrity.map(r=>{
    const det=r.details?_secEsc(JSON.stringify(r.details).slice(0,400)):'';
    return `<div style="border:1px solid #5a2a2a;border-radius:8px;padding:.7rem;margin-bottom:.5rem;background:rgba(224,116,96,.05)">
      <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin-bottom:.3rem">
        <strong style="color:#e07460;font-family:ui-monospace,monospace;font-size:.85rem">${_secEsc(r.kind)}</strong>
        <span style="color:var(--muted);font-size:.72rem">${_secFmtTime(r.occurred_at)}</span>
      </div>
      ${r.url?`<div style="color:var(--muted);font-size:.7rem;margin-bottom:.3rem">📍 ${_secEsc((r.url||'').slice(0,200))}</div>`:''}
      ${det?`<pre style="font-size:.7rem;background:rgba(0,0,0,.2);padding:.4rem;border-radius:4px;overflow-x:auto;margin:.3rem 0 0">${det}</pre>`:''}
      ${r.resolved?'<span style="color:var(--green);font-size:.72rem">✓ resolvido</span>':`<button class="btn btn-ghost" data-action="resolveSecurityItem" data-table="integrity_alerts" data-id="${r.id}" style="padding:.2rem .5rem;font-size:.72rem;margin-top:.4rem">Marcar como resolvido</button>`}
    </div>`;
  }).join('');
}

async function resolveSecurityItem(table,id){
  if(!sb||!table||!id)return;
  try{
    const{error}=await sb.from(table).update({resolved:true,resolved_at:new Date().toISOString()}).eq('id',id);
    if(error)throw error;
    admToast('✓ Marcado como resolvido');
    admLog('Security: resolved '+table+'#'+id);
    loadSecurity();
  }catch(e){admToast('❌ '+e.message)}
}

function exportSecurityCSV(){
  if(!_secErrors.length){admToast('⚠ Nada para exportar');return}
  const cols=['occurred_at','kind','severity','message','url_path','resolved'];
  const csv=[cols.join(',')].concat(_secErrors.map(r=>cols.map(c=>{
    const v=r[c]==null?'':String(r[c]).replace(/"/g,'""').replace(/[\r\n]+/g,' ');
    return /[,"]/.test(v)?`"${v}"`:v;
  }).join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='security-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  admToast('✓ CSV exportado: '+_secErrors.length+' eventos');
}

// ============================================================
// PAYWALL TOGGLE
// ============================================================
async function loadPaywallState(){
  try{
    const{data}=await sb.from('admin_settings').select('value').eq('key','paywall_enabled').maybeSingle();
    const enabled=data&&data.value==='true';
    const toggle=document.getElementById('paywallToggle');
    const label=document.getElementById('paywallLabel');
    if(toggle)toggle.checked=enabled;
    if(label)label.textContent=enabled?'Paywall ATIVADO — Módulos bloqueados para free':'Paywall DESATIVADO — Acesso gratuito total';
    if(label)label.style.color=enabled?'#e07460':'#4a9e7e';
    // Update stripe plan statuses
    const status=enabled?'✅ Ativo':'⏸ Dormant';
    ['stripeMensalStatus','stripeAnualStatus','stripeVitalicioStatus'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=status});
  }catch(e){console.warn('[Paywall] Load failed:',e.message)}
}
async function togglePaywall(enabled){
  try{
    await sb.from('admin_settings').upsert({key:'paywall_enabled',value:enabled?'true':'false'},{onConflict:'key'});
    const label=document.getElementById('paywallLabel');
    if(label){
      label.textContent=enabled?'Paywall ATIVADO — Módulos bloqueados para free':'Paywall DESATIVADO — Acesso gratuito total';
      label.style.color=enabled?'#e07460':'#4a9e7e';
    }
    const status=enabled?'✅ Ativo':'⏸ Dormant';
    ['stripeMensalStatus','stripeAnualStatus','stripeVitalicioStatus'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=status});
    addLog(enabled?'Paywall ATIVADO':'Paywall DESATIVADO — acesso gratuito total');
    alert(enabled?'Paywall ativado! Usuários free terão módulos bloqueados.':'Paywall desativado! Toda a plataforma é gratuita.');
  }catch(e){alert('Erro ao salvar: '+e.message)}
}

// ============================================================
// XP EVENTS
// ============================================================
function createXPEvent(){
  const name=document.getElementById('evtName').value.trim()||'Evento XP';
  const mult=parseInt(document.getElementById('evtMult').value)||2;
  const days=parseInt(document.getElementById('evtDuration').value)||1;
  const end=new Date();end.setDate(end.getDate()+days);
  const evt={label:`⚡ ${name} — ${mult}x XP!`,mult,end:end.toISOString(),created:new Date().toISOString()};
  // Store event in admin_settings via Supabase for all users
  if(sb){
    sb.from('admin_settings').upsert({
      key:'xp_event_active',
      value:evt,
      updated_at:new Date().toISOString()
    },{onConflict:'key'}).then(({error})=>{
      if(error){admToast('❌ Erro: '+error.message);return}
      admToast('⚡ Evento criado: '+name+' ('+mult+'x por '+days+' dia'+(days>1?'s':'')+')');
      admLog('Evento XP criado: '+name+' '+mult+'x por '+days+'d');
      document.getElementById('evtStatus').innerHTML=`<div style="color:var(--green);font-size:.82rem">✓ Evento "${esc(name)}" ativo até ${end.toLocaleDateString('pt-BR')}</div>`;
      renderActiveEvents();
    });
  }else{
    admToast('⚠ Supabase não conectado');
  }
}

function renderActiveEvents(){
  if(!sb)return;
  sb.from('admin_settings').select('value').eq('key','xp_event_active').maybeSingle().then(({data})=>{
    const el=document.getElementById('evtList');
    if(!data||!data.value){el.innerHTML='<div style="color:var(--muted);font-size:.82rem">Nenhum evento ativo.</div>';return}
    const evt=data.value;
    const isActive=new Date(evt.end)>new Date();
    el.innerHTML=isActive?
      `<div class="rule-card"><div class="rule-info"><div class="rule-name">${evt.label}</div><div class="rule-desc">Até ${new Date(evt.end).toLocaleDateString('pt-BR')} · ${evt.mult}x multiplicador</div></div><button class="btn btn-red btn-sm" onclick="cancelXPEvent()" style="font-size:.72rem">Cancelar</button></div>`:
      '<div style="color:var(--muted);font-size:.82rem">Evento expirado. Crie um novo.</div>'
  });
}

function cancelXPEvent(){
  if(!sb)return;
  sb.from('admin_settings').delete().eq('key','xp_event_active').then(()=>{
    admToast('Evento cancelado');admLog('Evento XP cancelado');renderActiveEvents()
  })
}

// ============================================================
// LOGS
// ============================================================
function admLog(msg){
  const logs=JSON.parse(localStorage.getItem(ADMIN_LOGS_KEY)||'[]');
  logs.unshift({ts:new Date().toISOString(),msg});
  if(logs.length>200)logs.length=200;
  localStorage.setItem(ADMIN_LOGS_KEY,JSON.stringify(logs));
}

function renderLogs(){
  const logs=JSON.parse(localStorage.getItem(ADMIN_LOGS_KEY)||'[]');
  const el=document.getElementById('logsContainer');
  if(!logs.length){el.innerHTML='<div style="padding:2rem;text-align:center;color:var(--muted)">Sem atividades registradas</div>';return}
  el.innerHTML=logs.map(l=>`<div class="log-entry"><div class="log-time">${new Date(l.ts).toLocaleString('pt-BR')}</div><div class="log-msg">${esc(l.msg)}</div></div>`).join('');
}

function clearLogs(){
  if(!confirm('Limpar todos os logs?'))return;
  localStorage.removeItem(ADMIN_LOGS_KEY);
  renderLogs();
  admToast('✓ Logs limpos');
}

// ============================================================
// HELPERS
// ============================================================
function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function escXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}

function timeAgo(date){
  const d=Math.floor((Date.now()-new Date(date))/1000);
  if(d<60)return'agora';
  if(d<3600)return Math.floor(d/60)+'min';
  if(d<86400)return Math.floor(d/3600)+'h';
  if(d<2592000)return Math.floor(d/86400)+'d';
  return Math.floor(d/2592000)+'m';
}

function admToast(msg){
  const t=document.getElementById('admToast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.remove('show'),3000);
}

// Check existing session on load
window.addEventListener('DOMContentLoaded',()=>{
  checkExistingSession();
});

// ============================================================
// GEOGRAPHY
// ============================================================
const BR_STATES={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
const BR_REGIONS={Norte:['AC','AM','AP','PA','RO','RR','TO'],Nordeste:['AL','BA','CE','MA','PB','PE','PI','RN','SE'],Centro_Oeste:['DF','GO','MS','MT'],Sudeste:['ES','MG','RJ','SP'],Sul:['PR','RS','SC']};

function renderGeography(){
  // Count users by state field in profiles
  const stateCounts={};
  let withState=0;
  allUsers.forEach(u=>{
    const st=(u.state||'').toUpperCase().trim();
    if(st&&BR_STATES[st]){stateCounts[st]=(stateCounts[st]||0)+1;withState++}
  });

  const states=Object.keys(stateCounts).length;
  document.getElementById('geoStates').textContent=states;

  // Top state
  const sorted=Object.entries(stateCounts).sort((a,b)=>b[1]-a[1]);
  if(sorted.length){
    document.getElementById('geoTop').textContent=sorted[0][0];
    document.getElementById('geoTopSub').textContent=BR_STATES[sorted[0][0]]+' — '+sorted[0][1]+' alunos';
  }

  // Region
  const regionCounts={};
  Object.entries(BR_REGIONS).forEach(([r,sts])=>{
    regionCounts[r]=sts.reduce((s,st)=>s+(stateCounts[st]||0),0);
  });
  const topRegion=Object.entries(regionCounts).sort((a,b)=>b[1]-a[1])[0];
  if(topRegion){
    document.getElementById('geoRegion').textContent=topRegion[0].replace('_',' ');
    document.getElementById('geoRegionSub').textContent=topRegion[1]+' alunos';
  }

  // State cards (map)
  const maxCount=sorted.length?sorted[0][1]:1;
  const geoMap=document.getElementById('geoMap');
  geoMap.innerHTML=Object.entries(BR_STATES).map(([code,name])=>{
    const count=stateCounts[code]||0;
    const intensity=count?Math.max(0.15,count/maxCount):0.03;
    const bg=count?`rgba(74,158,126,${intensity})`:'rgba(255,255,255,0.03)';
    return`<div style="background:${bg};border:1px solid var(--border);border-radius:8px;padding:.6rem .8rem;text-align:center;cursor:default" title="${name}: ${count} alunos">
      <div style="font-size:1.1rem;font-weight:700;color:${count?'var(--sage)':'var(--muted)'}">${code}</div>
      <div style="font-size:.65rem;color:var(--muted)">${name}</div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-top:.15rem">${count||'—'}</div>
    </div>`;
  }).join('');

  // Ranking
  const geoRanking=document.getElementById('geoRanking');
  if(!sorted.length){geoRanking.innerHTML='<div style="color:var(--muted);font-size:.82rem;padding:1rem">Nenhum usuário com estado preenchido. Adicione o campo "estado" ao onboarding para coletar esta informação.</div>';return}
  geoRanking.innerHTML='<table style="width:100%"><thead><tr><th>#</th><th>Estado</th><th>Alunos</th><th>%</th><th></th></tr></thead><tbody>'+
    sorted.slice(0,15).map(([st,count],i)=>{
      const pct=withState?Math.round(count/withState*100):0;
      return`<tr><td style="font-weight:700;color:var(--accent)">${i+1}</td><td>${BR_STATES[st]} (${st})</td><td style="font-weight:600">${count}</td><td>${pct}%</td><td><div style="width:100px;height:6px;background:var(--border);border-radius:3px"><div style="width:${Math.max(2,pct)}%;height:100%;background:var(--sage);border-radius:3px"></div></div></td></tr>`;
    }).join('')+'</tbody></table>';

  // Regions
  const geoRegions=document.getElementById('geoRegions');
  const regionTotal=Object.values(regionCounts).reduce((s,v)=>s+v,0)||1;
  geoRegions.innerHTML=Object.entries(regionCounts).sort((a,b)=>b[1]-a[1]).map(([r,count])=>{
    const pct=Math.round(count/regionTotal*100);
    const colors={Norte:'var(--green)',Nordeste:'var(--accent)',Centro_Oeste:'var(--blue)',Sudeste:'var(--sage)',Sul:'var(--lavender,#9b7ed8)'};
    return`<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem">
      <div style="width:100px;font-size:.78rem;font-weight:600;text-align:right">${r.replace('_','-')}</div>
      <div style="flex:1;height:28px;background:var(--border);border-radius:6px;overflow:hidden;position:relative">
        <div style="width:${Math.max(2,pct)}%;height:100%;background:${colors[r]||'var(--sage)'};border-radius:6px;transition:width .5s"></div>
        <span style="position:absolute;right:8px;top:5px;font-size:.72rem;font-weight:600">${count} alunos (${pct}%)</span>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// INSTALLATIONS
// ============================================================
function renderInstalls(){
  // Use install_data from profiles or admin_settings
  // For now, parse user agent data from profiles if available
  const devices={mobile:0,desktop:0,tablet:0};
  const browsers={Chrome:0,Safari:0,Firefox:0,Edge:0,Outro:0};
  let totalInstalls=0;

  allUsers.forEach(u=>{
    const ua=(u.user_agent||u.device||'').toLowerCase();
    if(ua.includes('android')||ua.includes('iphone')||ua.includes('mobile')){devices.mobile++}
    else if(ua.includes('ipad')||ua.includes('tablet')){devices.tablet++}
    else{devices.desktop++}

    if(ua.includes('chrome')&&!ua.includes('edge'))browsers.Chrome++;
    else if(ua.includes('safari')&&!ua.includes('chrome'))browsers.Safari++;
    else if(ua.includes('firefox'))browsers.Firefox++;
    else if(ua.includes('edge'))browsers.Edge++;
    else browsers.Outro++;

    if(u.pwa_installed||u.installed)totalInstalls++;
  });

  // If no device data, estimate from total
  const total=allUsers.length;
  if(!total){
    ['instTotal','instMobile','instDesktop','instRate'].forEach(id=>{document.getElementById(id).textContent='—'});
    return;
  }

  // Estimate: ~65% mobile, ~30% desktop, ~5% tablet for BR education
  if(devices.mobile===0&&devices.desktop===0){
    devices.mobile=Math.round(total*0.65);
    devices.desktop=Math.round(total*0.30);
    devices.tablet=total-devices.mobile-devices.desktop;
  }

  document.getElementById('instTotal').textContent=totalInstalls||'N/D';
  document.getElementById('instTotalSub').textContent=totalInstalls?Math.round(totalInstalls/total*100)+'% dos usuários':'Dados via GA4';
  document.getElementById('instMobile').textContent=devices.mobile;
  document.getElementById('instDesktop').textContent=devices.desktop;
  document.getElementById('instRate').textContent=totalInstalls?Math.round(totalInstalls/total*100)+'%':'N/D';

  // Device chart
  const deviceTotal=devices.mobile+devices.desktop+devices.tablet;
  document.getElementById('deviceChart').innerHTML=Object.entries(devices).map(([k,v])=>{
    const pct=deviceTotal?Math.round(v/deviceTotal*100):0;
    const labels={mobile:'📱 Mobile',desktop:'💻 Desktop',tablet:'📋 Tablet'};
    const colors={mobile:'var(--sage)',desktop:'var(--blue)',tablet:'var(--accent)'};
    return`<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem">
      <div style="width:100px;font-size:.78rem;font-weight:600;text-align:right">${labels[k]||k}</div>
      <div style="flex:1;height:28px;background:var(--border);border-radius:6px;overflow:hidden;position:relative">
        <div style="width:${Math.max(2,pct)}%;height:100%;background:${colors[k]||'var(--sage)'};border-radius:6px"></div>
        <span style="position:absolute;right:8px;top:5px;font-size:.72rem;font-weight:600">${v} (${pct}%)</span>
      </div>
    </div>`;
  }).join('');

  // Browser chart
  const bTotal=Object.values(browsers).reduce((s,v)=>s+v,0)||1;
  document.getElementById('browserChart').innerHTML=Object.entries(browsers).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
    const pct=Math.round(v/bTotal*100);
    return`<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem">
      <div style="width:100px;font-size:.78rem;font-weight:600;text-align:right">${k}</div>
      <div style="flex:1;height:24px;background:var(--border);border-radius:6px;overflow:hidden;position:relative">
        <div style="width:${Math.max(2,pct)}%;height:100%;background:var(--blue);border-radius:6px"></div>
        <span style="position:absolute;right:8px;top:3px;font-size:.68rem;font-weight:600">${v} (${pct}%)</span>
      </div>
    </div>`;
  }).join('');

  // Monthly installs chart (estimate from signups)
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setMonth(d.getMonth()-i);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const label=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()];
    const count=allUsers.filter(u=>u.createdAt&&u.createdAt.startsWith(key)).length;
    months.push({label,count});
  }
  const maxM=Math.max(...months.map(m=>m.count),1);
  document.getElementById('installChart').innerHTML=months.map(m=>`<div class="bar-col"><div class="bar-val">${m.count||''}</div><div class="bar" style="height:${Math.max(2,m.count/maxM*120)}px"></div><div class="bar-label">${m.label}</div></div>`).join('');
}

// ============================================================
// IMPACT PANEL
// ============================================================
function renderImpact(){
  const total=allUsers.length;
  const totalLessons=allUsers.reduce((s,u)=>s+u.lessons,0);
  const totalQuiz=allUsers.reduce((s,u)=>s+u.quizTotal,0);
  // Estimate hours: avg 8 min per lesson
  const hours=Math.round(totalLessons*8/60);

  document.getElementById('impStudents').textContent=total.toLocaleString();
  document.getElementById('impLessons').textContent=totalLessons.toLocaleString();
  document.getElementById('impHours').textContent=hours.toLocaleString();
  document.getElementById('impQuizzes').textContent=totalQuiz.toLocaleString();

  // Retention D7
  const d7=new Date(Date.now()-7*864e5);
  const d30=new Date(Date.now()-30*864e5);
  const newLast30=allUsers.filter(u=>u.createdAt&&new Date(u.createdAt)>=d30);
  const retainedD7=newLast30.filter(u=>u.lastStudy&&new Date(u.lastStudy)>=d7).length;
  const retPct=newLast30.length?Math.round(retainedD7/newLast30.length*100):0;
  document.getElementById('impRetention').textContent=retPct+'%';

  // Growth chart (6 months)
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setMonth(d.getMonth()-i);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const label=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()];
    const count=allUsers.filter(u=>u.createdAt&&u.createdAt.startsWith(key)).length;
    months.push({label,count});
  }
  const maxM=Math.max(...months.map(m=>m.count),1);
  document.getElementById('growthChart').innerHTML=months.map(m=>`<div class="bar-col"><div class="bar-val">${m.count||''}</div><div class="bar" style="height:${Math.max(2,m.count/maxM*140)}px"></div><div class="bar-label">${m.label}</div></div>`).join('');

  // Disc completion (estimated from completed lessons keys)
  const DISC_NAMES={economia:'Economia',matematica:'Matemática',filosofia:'Filosofia',ie:'Inteligência Emocional',psicologia:'Psicologia',portugues:'Português',ciencias:'Ciências',historia:'História',american:'American History',financas:'Finanças',ingles:'Inglês',geografia:'Geografia',ia:'IA & Tech',midia:'Mídia',direito:'Direito',saude:'Saúde',artes:'Artes',logica:'Lógica',programacao:'Programação',oratoria:'Oratória',civica:'Ed. Cívica'};
  document.getElementById('discCompletion').innerHTML='<div style="color:var(--muted);font-size:.82rem">Disponível quando dados de progresso por disciplina forem integrados. Total geral: <strong>'+totalLessons.toLocaleString()+'</strong> aulas concluídas na plataforma.</div>';

  // Student profile
  const withStreak=allUsers.filter(u=>u.streak>0).length;
  const avgStreak=total?Math.round(allUsers.reduce((s,u)=>s+u.streak,0)/total):0;
  const avgLevel=total?Math.round(allUsers.reduce((s,u)=>s+u.level,0)/total):0;
  const avgLessons=total?Math.round(totalLessons/total):0;
  document.getElementById('studentProfile').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;text-align:center">
      <div><div style="font-size:1.3rem;font-weight:700;color:var(--sage)">${avgLevel}</div><div style="font-size:.72rem;color:var(--muted)">Nível Médio</div></div>
      <div><div style="font-size:1.3rem;font-weight:700;color:var(--accent)">${avgLessons}</div><div style="font-size:.72rem;color:var(--muted)">Aulas/Aluno</div></div>
      <div><div style="font-size:1.3rem;font-weight:700;color:var(--blue)">${avgStreak}d</div><div style="font-size:.72rem;color:var(--muted)">Streak Médio</div></div>
      <div><div style="font-size:1.3rem;font-weight:700;color:var(--green)">${withStreak}</div><div style="font-size:.72rem;color:var(--muted)">Com Streak Ativo</div></div>
    </div>`;
}

// ============================================================
// PRESENTATION MODE
// ============================================================
function enterPresentationMode(){
  const pm=document.getElementById('presentationMode');
  pm.style.display='block';
  document.getElementById('presDate').textContent=new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});

  const total=allUsers.length;
  const totalLessons=allUsers.reduce((s,u)=>s+u.lessons,0);
  const hours=Math.round(totalLessons*8/60);
  const totalQuiz=allUsers.reduce((s,u)=>s+u.quizTotal,0);
  const d7=new Date(Date.now()-7*864e5);
  const active7=allUsers.filter(u=>u.lastStudy&&new Date(u.lastStudy)>=d7).length;
  const avgXP=total?Math.round(allUsers.reduce((s,u)=>s+u.xp,0)/total):0;
  const withStreak=allUsers.filter(u=>u.streak>0).length;
  const correctQuiz=allUsers.reduce((s,u)=>s+u.quizCorrect,0);
  const quizRate=totalQuiz?Math.round(correctQuiz/totalQuiz*100):0;

  const cards=[
    {icon:'👥',val:total.toLocaleString(),label:'Alunos Cadastrados',color:'#d4a843'},
    {icon:'📚',val:totalLessons.toLocaleString(),label:'Aulas Concluídas',color:'#4a9e7e'},
    {icon:'⏱',val:hours.toLocaleString()+'h',label:'Horas de Estudo',color:'#3498db'},
    {icon:'✅',val:totalQuiz.toLocaleString(),label:'Quizzes Respondidos',color:'#2ecc71'},
    {icon:'⚡',val:active7.toLocaleString(),label:'Ativos Esta Semana',color:'#d4a843'},
    {icon:'🔥',val:withStreak.toLocaleString(),label:'Com Streak Ativo',color:'#e74c3c'},
    {icon:'🎯',val:quizRate+'%',label:'Taxa de Acerto Quiz',color:'#4a9e7e'},
    {icon:'⭐',val:avgXP.toLocaleString(),label:'XP Médio por Aluno',color:'#3498db'},
  ];

  document.getElementById('presContent').innerHTML=cards.map(c=>`
    <div style="background:#131e2e;border:1px solid #243044;border-radius:16px;padding:1.75rem;text-align:center">
      <div style="font-size:1.5rem;margin-bottom:.5rem">${c.icon}</div>
      <div style="font-size:2.8rem;font-weight:700;color:${c.color};line-height:1">${c.val}</div>
      <div style="font-size:.82rem;color:#7a8ca3;margin-top:.5rem">${c.label}</div>
    </div>
  `).join('');

  // Charts
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setMonth(d.getMonth()-i);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const label=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]+'/'+String(d.getFullYear()).slice(2);
    const count=allUsers.filter(u=>u.createdAt&&u.createdAt.startsWith(key)).length;
    months.push({label,count});
  }
  const maxM=Math.max(...months.map(m=>m.count),1);

  document.getElementById('presCharts').innerHTML=`
    <div style="background:#131e2e;border:1px solid #243044;border-radius:16px;padding:1.5rem">
      <h3 style="font-size:.95rem;color:#e8e6e1;margin-bottom:1rem">📈 Crescimento Mensal</h3>
      <div style="display:flex;align-items:flex-end;gap:8px;height:140px">
        ${months.map(m=>`<div class="bar-col"><div class="bar-val" style="color:#e8e6e1">${m.count}</div><div style="background:#4a9e7e;border-radius:4px 4px 0 0;width:100%;height:${Math.max(4,m.count/maxM*120)}px"></div><div class="bar-label" style="color:#7a8ca3">${m.label}</div></div>`).join('')}
      </div>
    </div>
    <div style="background:#131e2e;border:1px solid #243044;border-radius:16px;padding:1.5rem">
      <h3 style="font-size:.95rem;color:#e8e6e1;margin-bottom:1rem">📊 Plataforma</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;text-align:center">
        <div><div style="font-size:2rem;font-weight:700;color:#d4a843">21</div><div style="color:#7a8ca3;font-size:.78rem">Disciplinas</div></div>
        <div><div style="font-size:2rem;font-weight:700;color:#4a9e7e">660</div><div style="color:#7a8ca3;font-size:.78rem">Aulas</div></div>
        <div><div style="font-size:2rem;font-weight:700;color:#3498db">66</div><div style="color:#7a8ca3;font-size:.78rem">Módulos</div></div>
        <div><div style="font-size:2rem;font-weight:700;color:#2ecc71">2</div><div style="color:#7a8ca3;font-size:.78rem">Idiomas (PT/EN)</div></div>
      </div>
    </div>`;

  if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});
}

function exitPresentationMode(){
  document.getElementById('presentationMode').style.display='none';
  if(document.exitFullscreen)document.exitFullscreen().catch(()=>{});
}

// ============================================================
// PWA INSTALL — Admin App
// ============================================================
const ADMIN_VERSION='1.0.0';
let _deferredInstallPrompt=null;

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _deferredInstallPrompt=e;
  const btn=document.getElementById('btnInstallAdmin');
  if(btn)btn.style.display='inline-flex';
});

async function installAdminPWA(){
  if(_deferredInstallPrompt){
    _deferredInstallPrompt.prompt();
    const{outcome}=await _deferredInstallPrompt.userChoice;
    if(outcome==='accepted'){
      admToast('✓ App Admin instalado!');
      admLog('PWA Admin instalada');
      document.getElementById('btnInstallAdmin').style.display='none';
    }
    _deferredInstallPrompt=null;
  }else{
    // iOS / manual install
    admToast('📲 iOS: toque em Compartilhar → Adicionar à Tela Início');
  }
}

// Detectar se já está instalado (standalone)
if(window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone){
  const btn=document.getElementById('btnInstallAdmin');
  if(btn)btn.style.display='none';
}

// ============================================================
// UPDATE SYSTEM — check for new version
// ============================================================
function checkAdminUpdate(){
  // Register SW for update detection
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').then(reg=>{
      // Check for update on load
      reg.addEventListener('updatefound',()=>{
        const newWorker=reg.installing;
        newWorker.addEventListener('statechange',()=>{
          if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
            showUpdateBanner();
          }
        });
      });
      // Also check periodically (every 30 min)
      setInterval(()=>reg.update(),1800000);
    }).catch(e=>console.warn('[Admin SW]',e.message));

    // Listen for SW controlled change (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(_isReloading)return;
      _isReloading=true;
      window.location.reload();
    });
  }
}
let _isReloading=false;

function showUpdateBanner(){
  // Don't show if already visible
  if(document.getElementById('updateBanner'))return;
  const banner=document.createElement('div');
  banner.id='updateBanner';
  banner.style.cssText='position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#1a2535,#0d1520);border-top:2px solid #d4a843;padding:1rem 1.5rem;z-index:10000;display:flex;align-items:center;justify-content:space-between;gap:1rem;animation:slideUpBanner .3s ease';
  banner.innerHTML=`
    <div style="display:flex;align-items:center;gap:.75rem">
      <span style="font-size:1.3rem">🔄</span>
      <div>
        <div style="font-weight:700;font-size:.88rem;color:#e8e6e1">Nova atualização disponível</div>
        <div style="font-size:.72rem;color:#7a8ca3">Uma nova versão do painel está pronta para instalar.</div>
      </div>
    </div>
    <div style="display:flex;gap:.5rem;flex-shrink:0">
      <button onclick="applyUpdate()" style="padding:.5rem 1.2rem;background:#d4a843;color:#0d1520;border:none;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer">Atualizar Agora</button>
      <button onclick="this.parentElement.parentElement.remove()" style="padding:.5rem .8rem;background:transparent;border:1px solid #243044;color:#7a8ca3;border-radius:8px;font-size:.78rem;cursor:pointer">Depois</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function applyUpdate(){
  if(navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({type:'SKIP_WAITING'});
  }
  // Fallback: force reload
  setTimeout(()=>{
    _isReloading=true;
    window.location.reload(true);
  },1000);
}

// Manual force update button
function forceCheckUpdate(){
  admToast('🔄 Verificando atualizações...');
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(reg){
        reg.update().then(()=>{
          // Check if there's a waiting worker
          if(reg.waiting){
            showUpdateBanner();
          }else{
            admToast('✓ Você está na versão mais recente (v'+ADMIN_VERSION+')');
          }
        });
      }else{
        admToast('✓ Nenhuma atualização pendente');
      }
    });
  }else{
    // No SW — just reload
    window.location.reload(true);
  }
}

// ============================================================
// VERSION BAR — bottom status
// ============================================================
function renderVersionBar(){
  if(document.getElementById('adminVersionBar'))return;
  const bar=document.createElement('div');
  bar.id='adminVersionBar';
  bar.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#0d1520;border-top:1px solid #243044;padding:.35rem 1.5rem;display:flex;align-items:center;justify-content:space-between;font-size:.68rem;color:#7a8ca3;z-index:99';
  bar.innerHTML=`
    <span>🛡️ EL Admin v${ADMIN_VERSION}</span>
    <span style="display:flex;align-items:center;gap:.75rem">
      <span id="adminOnlineStatus">🟢 Online</span>
      <button onclick="forceCheckUpdate()" style="background:none;border:none;color:#7a8ca3;font-size:.68rem;cursor:pointer;text-decoration:underline">Verificar atualização</button>
    </span>
  `;
  document.body.appendChild(bar);
  // Adjust content padding
  document.querySelector('.content').style.paddingBottom='3rem';
}

// Online/offline indicator
window.addEventListener('online',()=>{
  const el=document.getElementById('adminOnlineStatus');
  if(el){el.textContent='🟢 Online';el.style.color='#4a9e7e'}
  admToast('🟢 Conexão restaurada');
});
window.addEventListener('offline',()=>{
  const el=document.getElementById('adminOnlineStatus');
  if(el){el.textContent='🔴 Offline';el.style.color='#e74c3c'}
  admToast('🔴 Sem conexão — dados podem estar desatualizados');
});

// Init on load
window.addEventListener('DOMContentLoaded',()=>{
  checkAdminUpdate();
  renderVersionBar();
});

// ============================================================
// EVENT DELEGATION — replaces inline onclick handlers (CSP compliant)
// ============================================================
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.getAttribute('data-action');
  switch (action) {
    case 'authGoogle': authGoogle(); break;
    case 'clearLogs': clearLogs(); break;
    case 'createXPEvent': createXPEvent(); break;
    case 'doExport': doExport(); break;
    case 'enterPresentationMode': enterPresentationMode(); break;
    case 'exitPresentationMode': exitPresentationMode(); break;
    case 'exportCSV': exportCSV(); break;
    case 'exportXML': exportXML(); break;
    case 'installAdminPWA': installAdminPWA(); break;
    case 'loadAllData': loadAllData(); break;
    case 'previewExport': previewExport(); break;
    case 'sendManualPush': sendManualPush(); break;
    case 'saveAutoRules': saveAutoRules(); admToast('✓ Regras salvas!'); break;
    case 'goApp': window.location.href = 'app.html'; break;
    case 'switchTab':
      var tab = el.getAttribute('data-tab');
      if (tab) switchTab(tab);
      break;
    case 'loadSecurity': loadSecurity(); break;
    case 'exportSecurityCSV': exportSecurityCSV(); break;
    case 'exportQuizDropoffCSV': exportQuizDropoffCSV(); break;
    case 'openUserHistory':
      var uid = el.getAttribute('data-id');
      if(uid) openUserHistory(uid);
      break;
    case 'closeUserHistory': closeUserHistory(); break;
    case 'closeUserHistoryBackdrop':
      if(e.target === el) closeUserHistory();
      break;
    case 'addAdminDevice': addAdminDevice(); break;
    case 'copyMyDeviceId': copyMyDeviceId(); break;
    case 'removeAdminDevice':
      var did = el.getAttribute('data-id');
      if(did) removeAdminDevice(did);
      break;
    case 'resolveSecurityItem':
      var t = el.getAttribute('data-table');
      var i = el.getAttribute('data-id');
      if(t && i) resolveSecurityItem(t, i);
      break;
  }
});

// Filter changes on security panel
document.addEventListener('change', function(e){
  if(e.target && (e.target.id==='secFilterSev' || e.target.id==='secFilterRes')){
    loadSecurity();
  }
});

// Enter key on PIN input
document.addEventListener('DOMContentLoaded', function() {
  // (login é via botão Google — sem campo de senha)
});
