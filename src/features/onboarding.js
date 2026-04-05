// ============================================================
// ONBOARDING — Age verification (18+ only)
// Step 1: Date of birth → must be 18+
// Step 2: Name + avatar (optional)
// DEMO_MODE/OFFLINE_MODE: skip all steps
// ============================================================
const AVATARS=['🧑‍🎓','👨‍💼','👩‍💼','🦊','🦁','🐺','🦅','🐉','💎','🏆'];
let obAvatar='🧑‍🎓';

function initOnboard(){
  // Presentation mode: skip everything
  if(window.OFFLINE_MODE&&window.DEMO_MODE){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // Already blocked → enforceAgeGate handles this in boot.js
  if(window.S.ageGroup==='blocked'){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // Anti-tamper: re-verify birthYear on every boot
  if(window.S.birthYear){
    var today=new Date();
    var age=today.getFullYear()-window.S.birthYear;
    if(age<18){
      window.S.ageGroup='blocked';window.save();
      if(typeof window._showAgeBlockScreen==='function')window._showAgeBlockScreen();
      document.getElementById('onboard').style.display='none';
      return;
    }
  }
  // Verified adult returning user → skip onboarding
  if(window.S.ageGroup==='adult'&&window.S.ageVerifiedAt){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // Legacy user with name but no age verification → grandfather in as adult
  if(window.S.name!=='Aluno'&&window.S.ageGroup==='adult'){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // New user or unverified → show onboarding (age gate required)
  // Set max date on birth input (today)
  var bd=document.getElementById('obBirthDate');
  if(bd)bd.max=new Date().toISOString().slice(0,10);
  // Show onboarding overlay
  document.getElementById('onboard').style.display='';
}

// Step 1 → verify age from date of birth (must be 18+)
function obVerifyAge(){
  var bd=document.getElementById('obBirthDate');
  var errEl=document.getElementById('obAgeError');
  if(!bd||!bd.value){
    if(errEl){errEl.textContent='Por favor, informe sua data de nascimento.';errEl.style.display='block'}
    return;
  }
  var birth=new Date(bd.value);
  var today=new Date();
  var age=today.getFullYear()-birth.getFullYear();
  var m=today.getMonth()-birth.getMonth();
  if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;

  // Save only birth year (LGPD data minimization)
  window.S.birthYear=birth.getFullYear();
  window.S.ageVerifiedAt=Date.now();

  if(age<18){
    // Block: under 18 — permanent
    window.S.ageGroup='blocked';
    window.save();
    if(typeof window._showAgeBlockScreen==='function')window._showAgeBlockScreen();
    document.getElementById('onboard').style.display='none';
    return;
  }

  // 18+: proceed to profile step
  window.S.ageGroup='adult';
  if(errEl)errEl.style.display='none';
  _showObStep('obStep3Profile');
  _initProfileStep();
}

// Helper: show specific onboarding step, hide others
function _showObStep(stepId){
  var steps=document.querySelectorAll('.onboard-step');
  steps.forEach(function(s){s.classList.remove('active')});
  var target=document.getElementById(stepId);
  if(target)target.classList.add('active');
}

// Initialize profile step (avatar picker)
function _initProfileStep(){
  var avatarsEl=document.getElementById('obAvatars');
  if(avatarsEl){
    avatarsEl.innerHTML=AVATARS.map(function(a,i){
      return'<div class="onboard-av'+(i===0?' selected':'')+'" onclick="selectAvatar(\''+a+'\',this)">'+a+'</div>';
    }).join('');
  }
  var nameInput=document.getElementById('obName');
  if(nameInput)nameInput.focus();
}

function selectAvatar(a,el){
  obAvatar=a;
  document.querySelectorAll('.onboard-av').forEach(function(e){e.classList.remove('selected')});
  el.classList.add('selected');
}

// Quick finish — save name + avatar and go to dashboard
function obQuickFinish(){
  try{
    var name=document.getElementById('obName').value.trim();
    window.S.name=name||'Aluno';
    window.S.avatar=obAvatar;
    window.S.ageGroup=window.S.ageGroup||'adult';
    window.save();
    if(typeof window.gtag==='function')window.gtag('event','onboarding_complete',{name:window.S.name,mode:'quick',ageGroup:window.S.ageGroup});
    _hideOnboard();
  }catch(e){console.error('[obQuickFinish]',e.message);_hideOnboard()}
}

// Skip — only allowed if already age-verified or in presentation mode
function obSkip(){
  // Presentation mode: skip freely
  if(window.OFFLINE_MODE&&window.DEMO_MODE){
    window.S.name='Aluno';window.S.avatar='🧑‍🎓';window.S.ageGroup='adult';
    window.save();_hideOnboard();return;
  }
  // If age not yet verified, skip is NOT allowed — show error
  if(!window.S.ageGroup||window.S.ageGroup!=='adult'){
    var errEl=document.getElementById('obAgeError');
    if(errEl){errEl.textContent='Por favor, confirme sua idade para continuar.';errEl.style.display='block'}
    return;
  }
  // Age verified, skipping profile step
  window.S.name='Aluno';window.S.avatar='🧑‍🎓';
  window.save();_hideOnboard();
}

function _hideOnboard(){
  var el=window._origById('onboard');
  if(el){
    el.classList.add('hide');
    setTimeout(function(){el.style.display='none';
      setTimeout(function(){if(typeof window.preloadModules==='function')window.preloadModules()},1000);
    },400);
  }
  window.goDash();
}

// Legacy compat
function obNext(step){obVerifyAge()}
function obFinish(){obQuickFinish()}
function selectAge(){}
function selectObLang(){}

// ============================================================
// PAYWALL — shows upgrade prompt for premium modules
// DEMO_MODE: this function exists but is never called (isModUnlocked returns true)
// ============================================================
function showModulePaywall(modIdx){
  if(document.getElementById('paywallModal'))return;
  var overlay=document.createElement('div');
  overlay.id='paywallModal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:1rem';
  overlay.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;max-width:400px;width:100%;padding:2rem;text-align:center">'
    +'<div style="font-size:2.5rem;margin-bottom:.75rem">🔒</div>'
    +'<h2 style="font-size:1.2rem;margin-bottom:.5rem">Modulo Premium</h2>'
    +'<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:1.25rem;line-height:1.5">Este modulo faz parte do plano premium. Assine para desbloquear todos os modulos e funcionalidades.</p>'
    +'<a href="perfil.html#planos" class="btn btn-sage" style="width:100%;margin-bottom:.75rem">Ver Planos</a>'
    +'<button class="btn btn-ghost" onclick="document.getElementById(\'paywallModal\').remove()" style="width:100%;font-size:.85rem">Voltar</button>'
    +'</div>';
  document.body.appendChild(overlay);
}

// Attach to window
window.AVATARS=AVATARS;
window.initOnboard=initOnboard;
window.obVerifyAge=obVerifyAge;
window.selectAvatar=selectAvatar;
window.selectAge=selectAge;
window.selectObLang=selectObLang;
window.obNext=obNext;
window.obFinish=obFinish;
window.obQuickFinish=obQuickFinish;
window.obSkip=obSkip;
window.showModulePaywall=showModulePaywall;
