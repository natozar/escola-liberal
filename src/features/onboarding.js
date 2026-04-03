// ============================================================
// ONBOARDING — Light version for DEMO_MODE
// Only asks name + avatar (both optional). No email, no login.
// ============================================================
const AVATARS=['🧑‍🎓','👨‍💼','👩‍💼','🦊','🦁','🐺','🦅','🐉','💎','🏆'];
let obAvatar='🧑‍🎓';

function initOnboard(){
  // Skip if user already has a name (returning user)
  if(window.S.name!=='Aluno'){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // Render avatar picker
  document.getElementById('obAvatars').innerHTML=AVATARS.map((a,i)=>
    `<div class="onboard-av${i===0?' selected':''}" onclick="selectAvatar('${a}',this)">${a}</div>`
  ).join('');
  var nameInput=document.getElementById('obName');
  if(nameInput)nameInput.focus();
}

function selectAvatar(a,el){
  obAvatar=a;
  document.querySelectorAll('.onboard-av').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected');
}

// Quick finish — save name + avatar and go to dashboard
function obQuickFinish(){
  try{
    var name=document.getElementById('obName').value.trim();
    window.S.name=name||'Aluno';
    window.S.avatar=obAvatar;
    window.S.ageGroup=window.S.ageGroup||'13-16'; // default for DEMO_MODE
    window.save();
    if(typeof window.gtag==='function')window.gtag('event','onboarding_complete',{name:window.S.name,mode:'quick'});
    _hideOnboard();
  }catch(e){console.error('[obQuickFinish]',e.message);_hideOnboard()}
}

// Skip — use defaults and go straight to dashboard
function obSkip(){
  window.S.name='Aluno';
  window.S.avatar='🧑‍🎓';
  window.S.ageGroup='13-16';
  window.save();
  _hideOnboard();
}

function _hideOnboard(){
  var el=window._origById('onboard');
  if(el){
    el.classList.add('hide');
    setTimeout(()=>{el.style.display='none';
      setTimeout(()=>{if(typeof window.preloadModules==='function')window.preloadModules()},1000);
    },400);
  }
  window.goDash();
}

// Legacy compat — these are no-ops in DEMO_MODE but kept for any remaining references
function obNext(step){obQuickFinish()}
function obFinish(){obQuickFinish()}
function selectAge(){}
function selectObLang(){}

// ============================================================
// PAYWALL — shows upgrade prompt for premium modules
// DEMO_MODE: this function exists but is never called (isModUnlocked returns true)
// ============================================================
function showModulePaywall(modIdx){
  // DEMO_MODE: skip paywall entirely
  if(window.DEMO_MODE)return;
  var m=window.M[modIdx];if(!m)return;
  var overlay=document.createElement('div');
  overlay.className='save-modal-overlay';overlay.id='paywallModal';
  overlay.innerHTML='<div class="save-modal">'
    +'<button class="save-modal-close" onclick="document.getElementById(\'paywallModal\').remove()" aria-label="Fechar">&times;</button>'
    +'<div style="font-size:2.5rem;margin-bottom:.75rem">'+m.icon+'</div>'
    +'<h2 style="font-size:1.3rem;margin-bottom:.5rem">'+m.title+'</h2>'
    +'<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:1.25rem;line-height:1.6">Este modulo faz parte do plano <strong>Premium</strong>.</p>'
    +'<a href="perfil.html#planos" class="btn btn-sage" style="width:100%;margin-bottom:.75rem">Ver Planos</a>'
    +'<button class="btn btn-ghost" onclick="document.getElementById(\'paywallModal\').remove()" style="width:100%;font-size:.85rem">Voltar</button>'
    +'</div>';
  document.body.appendChild(overlay);
}

// Attach to window
window.AVATARS=AVATARS;
window.initOnboard=initOnboard;
window.selectAvatar=selectAvatar;
window.selectAge=selectAge;
window.selectObLang=selectObLang;
window.obNext=obNext;
window.obFinish=obFinish;
window.obQuickFinish=obQuickFinish;
window.obSkip=obSkip;
window.showModulePaywall=showModulePaywall;
