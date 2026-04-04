// src/ui/pwa.js — extracted from app.js
// Lines: 3325-3448 (PWA install), 3450-3462 (auto-save), 3510-3597 (notifications)

// ============================================================
// PWA INSTALL MODAL
// ============================================================
let deferredPrompt=null;
// Chave v2 para Escola Liberal (limpa dismiss antigo da Escola Conservadora)
const PWA_DISMISS_KEY='escolalib_install_v2';

function _isIos(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
}
function _isAndroid(){
  return /android/i.test(navigator.userAgent);
}
function _getPlatform(){
  if(_isIos())return 'ios';
  if(_isAndroid())return 'android';
  return 'web';
}
function _isInStandaloneMode(){
  return ('standalone' in window.navigator&&window.navigator.standalone)||
    window.matchMedia('(display-mode: standalone)').matches;
}
function _showPwaModal(force){
  // Don't show PWA modal while onboarding is active
  const obEl=window._origById('onboard');
  if(obEl&&obEl.style.display!=='none')return;
  // Remove chaves antigas para garantir que o popup apareça após o rebrand
  localStorage.removeItem('escola_install_dismissed');
  if(_isInStandaloneMode())return;
  // Re-show after 7 days if dismissed
  const dismissed=localStorage.getItem(PWA_DISMISS_KEY);
  if(dismissed&&!force){
    try{const dismissedAt=parseInt(localStorage.getItem(PWA_DISMISS_KEY+'_ts')||'0');
    if(Date.now()-dismissedAt<7*86400000)return}catch(e){return}
  }
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
    // Sem prompt nativo: orienta o usuário manualmente por plataforma
    const plat=_getPlatform();
    const ua=navigator.userAgent.toLowerCase();
    if(plat==='ios'){
      window.toast('No Safari: toque em Compartilhar ↑ → "Adicionar à Tela de Início"');
    } else if(plat==='android'){
      if(ua.includes('chrome')||ua.includes('crios'))window.toast('No Chrome: menu ⋮ (3 pontos) → "Adicionar à tela inicial"');
      else if(ua.includes('firefox'))window.toast('No Firefox: menu ☰ → "Instalar"');
      else if(ua.includes('samsung'))window.toast('No Samsung Internet: menu → "Adicionar à tela inicial"');
      else window.toast('Menu do navegador → "Adicionar à tela inicial"');
    } else {
      if(ua.includes('chrome'))window.toast('No Chrome: menu ⋮ → "Instalar Escola Liberal"');
      else if(ua.includes('firefox'))window.toast('No Firefox: barra de endereço → ícone de instalar');
      else if(ua.includes('edg'))window.toast('No Edge: menu ··· → "Instalar como app"');
      else window.toast('Procure "Instalar app" no menu do seu navegador');
    }
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(r=>{
    dismissInstall();
    deferredPrompt=null;
    if(r.outcome==='accepted')window.logActivity('install','App instalado como PWA')
  })
}
function dismissInstall(){
  const overlay=document.getElementById('pwaOverlay');
  if(overlay)overlay.classList.remove('show');
  localStorage.setItem(PWA_DISMISS_KEY,'1');
  localStorage.setItem(PWA_DISMISS_KEY+'_ts',String(Date.now()))
}

// ============================================================
// VERSIONING + WHAT'S NEW
// ============================================================
const APP_VERSION='3.0.0';
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
  const obEl=window._origById('onboard');
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
const _origSave=window.save;
window.save=function(){
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
// STUDY NOTIFICATIONS
// ============================================================
const NOTIF_KEY='escola_notif';
function getNotifSettings(){try{return JSON.parse(localStorage.getItem(NOTIF_KEY)||'{"enabled":false,"hour":19,"minute":0}')}catch(e){return{enabled:false,hour:19,minute:0}}}
function saveNotifSettings(s){try{localStorage.setItem(NOTIF_KEY,JSON.stringify(s))}catch(e){}}

function requestNotifPermission(){
  if(!('Notification' in window)){window.toast('Seu navegador não suporta notificações','error');return Promise.resolve(false)}
  return Notification.requestPermission().then(p=>p==='granted')
}

let _reminderTimer=null;
let _streakDangerTimer=null;
const NOTIF_MESSAGES=[
  ()=>`Que tal estudar um pouco hoje? Voce ja tem ${window.S.streak} dia${window.S.streak!==1?'s':''} de sequencia!`,
  ()=>`Voce ja completou ${Object.keys(window.S.done).length} aulas. Continue no seu ritmo!`,
  ()=>'5 minutos de estudo fazem diferenca. Sua jornada te espera!',
  ()=>`Voce esta no nivel ${window.S.lvl}. Cada aula conta!`,
  ()=>'Aprender e uma aventura. Que tal explorar algo novo hoje?',
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
      const{mult,label}=window.getXPMultiplier();
      const body=mult>1?`${label} Aproveite o bônus de XP hoje!`:_notifMsg();
      new Notification('escola liberal \u{1F393}',{body,icon:'assets/icons/icon-192.png',badge:'assets/icons/favicon.svg'});
      scheduleStudyReminder()
    }
  },target-now);

  // Streak danger: if no study today and it's past 20h, warn
  const todayISO=now.toISOString().slice(0,10);
  const studiedToday=window.S.streakDays&&window.S.streakDays.includes(todayISO);
  if(!studiedToday&&window.S.streak>0){
    const danger=new Date(now);danger.setHours(20,0,0,0);
    if(danger>now){
      _streakDangerTimer=setTimeout(()=>{
        _streakDangerTimer=null;
        const todayCheck=new Date().toISOString().slice(0,10);
        if(!(window.S.streakDays&&window.S.streakDays.includes(todayCheck))&&Notification.permission==='granted'){
          new Notification('Voce esta indo bem! \u{1F525}',{
            body:`Sua sequencia esta em ${window.S.streak} dia${window.S.streak!==1?'s':''}. Que tal estudar um pouco antes de dormir?`,
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
        window.toast('Lembretes ativados para '+String(s.hour).padStart(2,'0')+':'+String(s.minute).padStart(2,'0'),'success');
        scheduleStudyReminder();
        updateNotifUI()
      }else{window.toast('Permissão de notificação negada','error')}
    })
  }else{
    s.enabled=false;saveNotifSettings(s);
    window.toast('Lembretes desativados','success');
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
// EXPORTS
// ============================================================
window.deferredPrompt=deferredPrompt;
window.PWA_DISMISS_KEY=PWA_DISMISS_KEY;
window._isIos=_isIos;
window._isAndroid=_isAndroid;
window._getPlatform=_getPlatform;
window._isInStandaloneMode=_isInStandaloneMode;
window._showPwaModal=_showPwaModal;
window._pwaOverlayClick=_pwaOverlayClick;
window.doInstall=doInstall;
window.dismissInstall=dismissInstall;
window.APP_VERSION=APP_VERSION;
window.CHANGELOG=CHANGELOG;
window.checkWhatsNew=checkWhatsNew;
window.closeWhatsNew=closeWhatsNew;
window.showSaveIndicator=showSaveIndicator;
window.getNotifSettings=getNotifSettings;
window.saveNotifSettings=saveNotifSettings;
window.requestNotifPermission=requestNotifPermission;
window.scheduleStudyReminder=scheduleStudyReminder;
window.toggleNotifications=toggleNotifications;
window.updateNotifUI=updateNotifUI;
