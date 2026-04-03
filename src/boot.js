// ============================================================
// BOOT SEQUENCE — Escola Liberal
// ============================================================

// ============================================================
// FLAGS DE MODO
// ============================================================
// OFFLINE_MODE: Supabase COMPLETAMENTE desligado. Zero fetch de rede.
// Para apresentacao a governos. Tudo roda em localStorage.
// Para reconectar Supabase: mudar para false.
const OFFLINE_MODE = false;
window.OFFLINE_MODE = OFFLINE_MODE;

// DEMO_MODE: app abre sem exigir login. Paywall desabilitado.
const DEMO_MODE = true;
window.DEMO_MODE = DEMO_MODE;

// ============================================================
// DEMO DATA — popula localStorage na primeira vez (apresentacao)
// ============================================================
function seedDemoData(){
  if(!OFFLINE_MODE)return;
  if(localStorage.getItem('escola_v2'))return; // ja tem dados
  console.log('[App] Populando dados demo para apresentacao');
  var done={};var quiz={};
  // Marcar primeiras 15 aulas como concluidas (3 modulos x 5 aulas)
  for(var mi=0;mi<3;mi++){for(var li=0;li<5;li++){
    done[mi+'-'+li]=true;
    quiz[mi+'-'+li]=(Math.random()>0.2); // 80% acerto
  }}
  localStorage.setItem('escola_v2',JSON.stringify({
    name:'Aluno Demo',avatar:'🧑‍🎓',xp:750,lvl:4,streak:7,
    streakDays:_last7Days(),last:new Date().toDateString(),
    done:done,quiz:quiz,ageGroup:'13-16',cMod:null,cLes:null
  }));
  // Seed some notes
  localStorage.setItem('escola_notes',JSON.stringify({'0-0':'O escambo surgiu antes da moeda.','0-2':'Teoria subjetiva do valor — Carl Menger.'}));
  // Seed timeline
  var tl=[];var now=Date.now();
  for(var i=0;i<10;i++){tl.push({type:i%3===0?'quiz':'lesson',text:'Aula completada',ts:now-i*3600000})}
  localStorage.setItem('escola_timeline',JSON.stringify(tl));
  // Seed missions
  localStorage.setItem('escola_missions',JSON.stringify({week:_weekId(),claimed:[],list:[
    {id:'lessons5',name:'Complete 5 aulas',target:5,icon:'📚',xp:75},
    {id:'quiz3row',name:'Acerte 3 quizzes seguidos',target:3,icon:'🎯',xp:50},
    {id:'streak3',name:'Estude 3 dias seguidos',target:3,icon:'🔥',xp:60}
  ]}));
}
function _last7Days(){var d=[];for(var i=0;i<7;i++){var dt=new Date();dt.setDate(dt.getDate()-i);d.push(dt.toISOString().slice(0,10))}return d}
function _weekId(){var d=new Date();var jan1=new Date(d.getFullYear(),0,1);return d.getFullYear()+'-W'+Math.ceil(((d-jan1)/864e5+jan1.getDay()+1)/7)}

// ============================================================
// ERROR BOUNDARY
// ============================================================
var _errCount=0,_errTimer=null;
window.onerror=function(msg,url,line){
  console.warn('[App warn]',msg,'at line',line);
  _errCount++;
  if(_errTimer)clearTimeout(_errTimer);
  _errTimer=setTimeout(function(){_errCount=0},2000);
  if(_errCount>=3){try{window._origById('errorScreen').style.display='flex'}catch(e){}}
  return true
};
window.addEventListener('unhandledrejection',function(e){console.error('Unhandled promise:',e.reason)});

// ============================================================
// SERVICE WORKER
// ============================================================
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message',function(e){
    if(!e.data)return;
    if(e.data.type==='SW_UPDATED'){
      window.toast('Atualizado para '+e.data.version+'!','success');
      var lbl=document.getElementById('appVersionLabel');
      if(lbl) lbl.textContent='versao: '+e.data.version;
    }
    if(e.data.type==='SW_VERSION'){
      var lbl=document.getElementById('appVersionLabel');
      if(lbl) lbl.textContent='versao: '+e.data.version;
    }
  })
}

// ============================================================
// BROWSER BACK/FORWARD
// ============================================================
window.addEventListener('popstate',function(e){
  var s=e.state;
  if(!s||!s.view){window.goDash();return}
  if(s.view==='mod'&&window.M[s.mod])window.goMod(s.mod);
  else if(s.view==='lesson'&&window.M[s.mod]&&window.M[s.mod].lessons[s.les])window.openL(s.mod,s.les);
  else if(s.view==='leaderboard'&&typeof window.goLeaderboard==='function')window.goLeaderboard();
  else if(s.view==='studyplan'&&typeof window.goStudyPlan==='function')window.goStudyPlan();
  else if(s.view==='debate'&&typeof window.goDebate==='function')window.goDebate();
  else window.goDash();
});

// ============================================================
// SYNC STATUS (only active when Supabase is on)
// ============================================================
var _syncHideTimer=null;
function showSyncStatus(state,msg){
  var el=document.getElementById('syncIndicator');if(!el)return;
  el.className='sync-indicator show '+state;
  el.innerHTML='<span class="sync-dot"></span>'+msg;
  clearTimeout(_syncHideTimer);
  if(state==='synced')_syncHideTimer=setTimeout(function(){el.classList.remove('show')},3000);
}
window.showSyncStatus=showSyncStatus;
window.addEventListener('online',function(){showSyncStatus('synced','Conexao restaurada');if(typeof window.flushSyncQueue==='function')window.flushSyncQueue()});
window.addEventListener('offline',function(){showSyncStatus('offline','Offline — dados salvos localmente')});

// ============================================================
// PROFILE NAVIGATION
// ============================================================
function handleProfileNav(){
  // Always go to perfil.html — it handles logged in/out states internally
  location.href='perfil.html';
}
window.handleProfileNav=handleProfileNav;

// ============================================================
// LOGIN PROMPT (contextual — only active when NOT in OFFLINE_MODE)
// ============================================================
function showLoginPrompt(context){
  if(OFFLINE_MODE){handleProfileNav();return}
  if(document.getElementById('loginPrompt'))return;
  var titles={
    perfil:{icon:'👤',h:'Entre para salvar seu progresso',sub:'Sincronize entre dispositivos e acesse seu perfil.'},
    debate:{icon:'💬',h:'Entre para participar do debate',sub:'Faca login para enviar mensagens.'}
  };
  var t=titles[context]||titles.perfil;
  var overlay=document.createElement('div');
  overlay.id='loginPrompt';
  overlay.className='save-modal-overlay';
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove()};
  overlay.innerHTML='<div class="save-modal" style="max-width:380px;padding:2rem 1.5rem">'
    +'<button class="save-modal-close" onclick="document.getElementById(\'loginPrompt\').remove()" aria-label="Fechar">&times;</button>'
    +'<div style="text-align:center;margin-bottom:1.5rem"><div style="font-size:2rem;margin-bottom:.5rem">'+t.icon+'</div><h2 style="font-size:1.15rem;margin-bottom:.25rem">'+t.h+'</h2><p style="font-size:.82rem;color:var(--text-muted)">'+t.sub+'</p></div>'
    +'<button class="btn btn-ghost" style="width:100%;padding:.75rem;font-size:.9rem;margin-bottom:.75rem;display:flex;align-items:center;justify-content:center;gap:.5rem" onclick="_loginPromptGoogle(\''+context+'\')">'
    +'<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>'
    +' Continuar com Google</button>'
    +'<div style="text-align:center"><button class="btn btn-ghost" style="font-size:.78rem;padding:.35rem .75rem" onclick="document.getElementById(\'loginPrompt\').remove()">Agora nao</button></div>'
    +'</div>';
  document.body.appendChild(overlay);
  window._loginPromptContext=context;
}
window.showLoginPrompt=showLoginPrompt;

async function _loginPromptGoogle(context){
  if(typeof window.signInGoogle!=='function'){window.toast('Indisponivel offline','error');return}
  window._loginPromptContext=context;
  await window.signInGoogle();
}
window._loginPromptGoogle=_loginPromptGoogle;

// ============================================================
// INIT AFTER AUTH (called when login succeeds)
// ============================================================
async function initAfterAuth(user){
  console.log('[Auth] initAfterAuth:',user?.email);
  if(typeof window.updateAuthUI==='function')window.updateAuthUI();
  if(typeof window.ui==='function')window.ui();
}
window.initAfterAuth=initAfterAuth;

// ============================================================
// MAIN BOOT
// ============================================================
export async function boot(){
  console.log('[App] '+(OFFLINE_MODE?'OFFLINE_MODE':'ONLINE')+' | '+(DEMO_MODE?'DEMO_MODE':'NORMAL'));

  // Seed demo data if first visit in OFFLINE_MODE
  seedDemoData();

  if(typeof window.initTheme==='function')window.initTheme();
  if(typeof window.initI18n==='function')window.initI18n();

  var ok=await window.loadLessons();
  if(!ok)return;
  console.log('[Lessons] '+window.M.length+' modulos carregados');

  window.buildSidebar();
  if(typeof window.updateLangToggle==='function')window.updateLangToggle();
  window.streak();
  window.initOnboard();

  // OFFLINE/DEMO: go straight to dashboard — no auth wait
  if(window.S.name!=='Aluno'){
    document.getElementById('onboard').style.display='none';
    window.goDash();
  }

  // Defer non-critical init
  var _deferInit=typeof requestIdleCallback==='function'?requestIdleCallback:function(cb){setTimeout(cb,100)};
  _deferInit(function(){
    if(typeof window.updateSfxLabel==='function')window.updateSfxLabel();
    if(typeof window.scheduleStudyReminder==='function')window.scheduleStudyReminder();
    if(typeof window.enhanceAria==='function')window.enhanceAria();
    if(typeof window.updateGlobalProgress==='function')window.updateGlobalProgress();
    if(window.S.name!=='Aluno'){
      setTimeout(function(){if(typeof window.preloadModules==='function')window.preloadModules()},1000);
    }
  });

  // Challenge banner
  (function(){
    var banner=window._origById('challengeBanner');
    if(!banner)return;
    var msgs=[
      {icon:'🏆',title:'Desafie um amigo agora!',sub:'Quem ganha mais XP esta semana?'},
      {icon:'⚡',title:'Voce tem '+window.totalXP()+' XP',sub:'Mande o link no WhatsApp!'},
      {icon:'🔥',title:window.S.streak+' dias de sequencia!',sub:'Desafie alguem a te superar!'},
      {icon:'🎯',title:'Ja completou '+Object.keys(window.S.done).length+' aulas',sub:'Desafie seus amigos a te alcancar!'},
    ];
    var idx=Math.floor(Math.random()*msgs.length);
    function update(){var m=msgs[idx%msgs.length];var ic=banner.querySelector('.cb-icon');var ti=banner.querySelector('.cb-title');var su=banner.querySelector('.cb-sub');if(ic)ic.textContent=m.icon;if(ti)ti.textContent=m.title;if(su)su.textContent=m.sub;idx++}
    update();setInterval(update,30000);
  })();

  // Remove splash
  setTimeout(function(){var sp=document.getElementById('appSplash');if(sp){sp.style.opacity='0';setTimeout(function(){sp.remove()},300)}},400);

  // Hash navigation
  if(location.hash&&!location.hash.includes('access_token')&&!location.hash.includes('type=recovery')){
    var hm=location.hash.match(/module-(\d+)/);
    if(hm)setTimeout(function(){window.goMod(parseInt(hm[1])-1)},100);
  }

  // ============================================================
  // SUPABASE — only load if NOT in OFFLINE_MODE
  // ============================================================
  if(!OFFLINE_MODE){
    (function(){
      var sdk=document.createElement('script');
      sdk.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      sdk.onload=function(){
        var cl=document.createElement('script');
        cl.src='supabase-client.js';
        cl.onload=function(){
          if(typeof window.initSupabase==='function'){
            var ok=window.initSupabase();
            if(ok){_renderAuth()}
          }
        };
        cl.onerror=function(){console.warn('[Supabase] client.js nao encontrado, modo offline.');_renderAuth()};
        document.body.appendChild(cl);
      };
      sdk.onerror=function(){console.warn('[Supabase] SDK offline.');_renderAuth()};
      document.body.appendChild(sdk);
    })();
  } else {
    console.log('[Supabase] OFFLINE_MODE — Supabase desligado');
    // Render auth section in sidebar (shows "Modo apresentacao" on click)
    _renderAuth();
  }

  // Stripe — only load if not offline
  if(!OFFLINE_MODE){
    (function(){var s=document.createElement('script');s.src='stripe-billing.js';s.onerror=function(){};document.body.appendChild(s)})();
  }

  // ============================================================
  // AUTH UI (sidebar) — works in all modes
  // ============================================================
  function _renderAuth(){
    var side=document.querySelector('.side');
    if(!side)return;
    var el=document.createElement('div');
    el.id='authSection';
    el.style.cssText='margin-top:auto;padding-top:1rem;border-top:1px solid var(--border)';
    if(OFFLINE_MODE){
      el.innerHTML='<div class="side-label" style="margin-top:.5rem">CONTA</div>'
        +'<div class="ni" role="button" tabindex="0" onclick="handleProfileNav()"><div class="ni-icon" style="background:var(--sage-muted);color:var(--sage-light)">🏛️</div><span style="font-size:.85rem">Modo Apresentacao</span></div>';
    } else {
      el.innerHTML='<div class="side-label" style="margin-top:.5rem">CONTA</div>'
        +'<div id="authLoggedOut"><div class="ni" role="button" tabindex="0" onclick="showLoginPrompt(\'perfil\')"><div class="ni-icon" style="background:var(--sage-muted);color:var(--sage-light)">🔐</div><span style="font-size:.85rem">Entrar / Criar Conta</span></div></div>'
        +'<div id="authLoggedIn" style="display:none"><div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;margin-bottom:.25rem"><div style="width:28px;height:28px;border-radius:50%;background:var(--sage-muted);display:flex;align-items:center;justify-content:center;font-size:.8rem">👤</div><span id="authUserName" style="font-size:.85rem;color:var(--text-secondary)"></span></div>'
        +'<div class="ni" role="button" tabindex="0" onclick="location.href=\'perfil.html\'"><div class="ni-icon" style="background:var(--sky-muted);color:var(--sky)">⚙️</div><span style="font-size:.85rem">Meu Perfil</span></div>'
        +'<div class="ni" role="button" tabindex="0" onclick="_doSignOut()"><div class="ni-icon" style="background:var(--coral-muted);color:var(--coral)">🚪</div><span style="font-size:.85rem">Sair</span></div></div>';
    }
    side.appendChild(el);

    // Version bar
    var vEl=document.createElement('div');
    vEl.style.cssText='padding:.75rem;border-top:1px solid var(--border);margin-top:.5rem';
    vEl.innerHTML='<div style="text-align:center;padding:.25rem 0"><span id="appVersionLabel" style="font-size:.7rem;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">'+(OFFLINE_MODE?'modo apresentacao':'versao: carregando...')+'</span></div>';
    side.appendChild(vEl);

    if(!OFFLINE_MODE){
      setTimeout(function(){
        if('serviceWorker' in navigator&&navigator.serviceWorker.controller){
          navigator.serviceWorker.controller.postMessage({type:'GET_VERSION'});
        }
      },1500);
    }
    if(typeof window.updateAuthUI==='function')window.updateAuthUI();
  }

  function updateAuthUI(){
    var loggedOut=document.getElementById('authLoggedOut');
    var loggedIn=document.getElementById('authLoggedIn');
    var nameEl=document.getElementById('authUserName');
    if(!loggedOut||!loggedIn)return;
    if(typeof window.currentUser!=='undefined'&&window.currentUser){
      loggedOut.style.display='none';loggedIn.style.display='block';
      if(nameEl)nameEl.textContent=window.currentUser.user_metadata?.full_name||window.currentUser.email||'Aluno';
    }else{
      loggedOut.style.display='block';loggedIn.style.display='none';
    }
  }
  window.updateAuthUI=updateAuthUI;

  async function _doSignOut(){
    if(typeof window.signOut==='function')await window.signOut();
    updateAuthUI();
    window.toast('Conta desconectada');
    window.goDash();
  }
  window._doSignOut=_doSignOut;

  // OAuth callback handler (only relevant when Supabase is on)
  if(!OFFLINE_MODE&&location.hash&&location.hash.includes('access_token')){
    (function(){
      var attempts=0;
      function check(){
        attempts++;
        if(typeof window.sbClient==='undefined'||!window.sbClient){if(attempts<30)setTimeout(check,250);return}
        window.sbClient.auth.getSession().then(function(r){
          if(r.data&&r.data.session){
            initAfterAuth(r.data.session.user);
            if(typeof updateAuthUI==='function')updateAuthUI();
            window.toast('Login realizado!','success');
            history.replaceState(null,'',location.pathname);
          }else if(attempts<30)setTimeout(check,250);
        }).catch(function(){if(attempts<30)setTimeout(check,250)});
      }
      setTimeout(check,500);
    })();
  }
}
