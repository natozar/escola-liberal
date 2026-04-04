// ============================================================
// ONBOARDING — Age verification (Lei Felca 15.211/2025)
// Step 1: Date of birth → age gate
// Step 2: Parental consent (ages 10-15)
// Step 3: Name + avatar (optional)
// DEMO_MODE/OFFLINE_MODE: skip all steps
// ============================================================
const AVATARS=['🧑‍🎓','👨‍💼','👩‍💼','🦊','🦁','🐺','🦅','🐉','💎','🏆'];
let obAvatar='🧑‍🎓';

function initOnboard(){
  // Skip if user already has age verified (returning user)
  if(window.S.name!=='Aluno'&&window.S.ageVerifiedAt){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // Skip if user already has a name but no age verification (legacy user — grandfather in)
  if(window.S.name!=='Aluno'){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // DEMO_MODE or OFFLINE_MODE: auto-skip onboarding
  if(window.DEMO_MODE||window.OFFLINE_MODE){
    document.getElementById('onboard').style.display='none';
    return;
  }
  // Set max date on birth input (today)
  var bd=document.getElementById('obBirthDate');
  if(bd)bd.max=new Date().toISOString().slice(0,10);
}

// Step 1 → verify age from date of birth
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

  if(age<10){
    // Block: too young
    window.S.ageGroup='blocked';
    if(errEl){errEl.innerHTML='Esta plataforma e para jovens a partir de <strong>10 anos</strong>. Volte quando tiver idade suficiente!';errEl.style.display='block'}
    return;
  }else if(age<12){
    window.S.ageGroup='child';
  }else if(age<16){
    window.S.ageGroup='teen';
  }else if(age<18){
    window.S.ageGroup='young';
  }else{
    window.S.ageGroup='adult';
  }

  if(errEl)errEl.style.display='none';

  if(window.S.ageGroup==='child'||window.S.ageGroup==='teen'){
    // Needs parental consent — go to step 2
    _showObStep('obStep2Consent');
  }else if(window.S.ageGroup==='young'){
    // 16-17: info notice, then profile step
    if(typeof window.toast==='function')window.toast('Voce pode usar a plataforma. Um responsavel pode vincular sua conta a qualquer momento.','info');
    _showObStep('obStep3Profile');
    _initProfileStep();
  }else{
    // 18+: go straight to profile
    _showObStep('obStep3Profile');
    _initProfileStep();
  }
}

// Step 2 → parental consent (ages 10-15)
function obConfirmParental(){
  var pinInput=document.getElementById('obParentPIN');
  var checkEl=document.getElementById('obParentCheck');
  var errEl=document.getElementById('obConsentError');
  var pin=pinInput?pinInput.value.trim():'';

  if(pin.length!==4||!/^\d{4}$/.test(pin)){
    if(errEl){errEl.textContent='O PIN deve ter exatamente 4 digitos numericos.';errEl.style.display='block'}
    return;
  }
  if(!checkEl||!checkEl.checked){
    if(errEl){errEl.textContent='O responsavel legal precisa marcar a autorizacao.';errEl.style.display='block'}
    return;
  }

  if(errEl)errEl.style.display='none';

  // Hash PIN (same as parent panel PIN)
  window.S.pin=_hashPINSimple(pin);
  window.S.parentalConsent=true;
  window.S.parentalConsentAt=Date.now();

  // Proceed to profile step
  _showObStep('obStep3Profile');
  _initProfileStep();
}

// Simple PIN hash (SHA-256 when available, fallback to basic hash)
function _hashPINSimple(pin){
  // Use existing hashPIN if available (from profiles.js)
  if(typeof window.hashPIN==='function')return window.hashPIN(pin);
  // Fallback: simple numeric hash
  var h=0;for(var i=0;i<pin.length;i++){h=((h<<5)-h)+pin.charCodeAt(i);h|=0}
  return'pin_'+Math.abs(h).toString(36);
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
    // Preserve ageGroup set by obVerifyAge; fallback for DEMO_MODE
    window.S.ageGroup=window.S.ageGroup||'teen';
    window.save();
    if(typeof window.gtag==='function')window.gtag('event','onboarding_complete',{name:window.S.name,mode:'quick',ageGroup:window.S.ageGroup});
    _hideOnboard();
  }catch(e){console.error('[obQuickFinish]',e.message);_hideOnboard()}
}

// Skip — use defaults and go straight to dashboard
function obSkip(){
  window.S.name='Aluno';
  window.S.avatar='🧑‍🎓';
  // Skip preserves whatever ageGroup was set, or defaults
  window.S.ageGroup=window.S.ageGroup||'teen';
  window.save();
  _hideOnboard();
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

// Legacy compat — these are no-ops but kept for any remaining references
function obNext(step){obVerifyAge()}
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
window.obVerifyAge=obVerifyAge;
window.obConfirmParental=obConfirmParental;
window.selectAvatar=selectAvatar;
window.selectAge=selectAge;
window.selectObLang=selectObLang;
window.obNext=obNext;
window.obFinish=obFinish;
window.obQuickFinish=obQuickFinish;
window.obSkip=obSkip;
window.showModulePaywall=showModulePaywall;
