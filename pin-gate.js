(function(){
  var K='escola_pin_ts',E=3600000;
  try{var t=parseInt(sessionStorage.getItem(K)||'0',10);if(Date.now()-t<E)return}catch(e){}
  // Block scroll
  document.documentElement.style.overflow='hidden';
  // Inject overlay
  var o=document.createElement('div');o.id='pinGate';
  o.innerHTML='<style>'
    +'#pinGate{position:fixed;inset:0;z-index:99999;background:#0f1729;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,sans-serif;transition:opacity .3s}'
    +'#pinGate.fade{opacity:0;pointer-events:none}'
    +'.pg-logo{font-size:3rem;margin-bottom:.5rem}'
    +'.pg-brand{color:#dba550;font-size:1.25rem;font-weight:700;letter-spacing:.03em;margin-bottom:.25rem}'
    +'.pg-sub{color:#8892a4;font-size:.85rem;margin-bottom:2rem}'
    +'.pg-fields{display:flex;gap:12px;margin-bottom:1.5rem}'
    +'.pg-d{width:52px;height:60px;border:2px solid #2a3548;border-radius:12px;background:#1a2332;color:#e8e0d4;font-size:1.5rem;font-weight:700;text-align:center;outline:none;caret-color:#4a9e7e;font-family:"JetBrains Mono","DM Sans",monospace;-webkit-appearance:none;appearance:none}'
    +'.pg-d:focus{border-color:#4a9e7e;box-shadow:0 0 0 3px rgba(74,158,126,.2)}'
    +'.pg-btn{background:#4a9e7e;color:#fff;border:none;padding:.75rem 2.5rem;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;transition:opacity .15s;font-family:inherit;min-width:180px}'
    +'.pg-btn:active{opacity:.7}'
    +'.pg-err{color:#ef4444;font-size:.82rem;height:1.2rem;margin-top:.75rem;text-align:center}'
    +'@keyframes pgShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}'
    +'.pg-shake .pg-d{animation:pgShake .4s;border-color:#ef4444}'
    +'@media(max-width:360px){.pg-d{width:46px;height:52px;font-size:1.3rem}.pg-fields{gap:8px}}'
    +'</style>'
    +'<div class="pg-logo">📚</div>'
    +'<div class="pg-brand">Escola Liberal</div>'
    +'<div class="pg-sub">Acesso restrito</div>'
    +'<div class="pg-fields" id="pgFields">'
    +'<input class="pg-d" id="pg0" type="tel" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">'
    +'<input class="pg-d" id="pg1" type="tel" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">'
    +'<input class="pg-d" id="pg2" type="tel" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">'
    +'<input class="pg-d" id="pg3" type="tel" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="off">'
    +'</div>'
    +'<button class="pg-btn" id="pgBtn" type="button">Entrar</button>'
    +'<div class="pg-err" id="pgErr"></div>';
  document.body.insertBefore(o,document.body.firstChild);
  // Focus first field
  setTimeout(function(){var f=document.getElementById('pg0');if(f)f.focus()},100);
  // Auto-advance + backspace
  var fields=[document.getElementById('pg0'),document.getElementById('pg1'),document.getElementById('pg2'),document.getElementById('pg3')];
  fields.forEach(function(f,i){
    f.addEventListener('input',function(){
      f.value=f.value.replace(/[^0-9]/g,'').slice(0,1);
      if(f.value&&i<3)fields[i+1].focus();
      if(f.value&&i===3)check();
    });
    f.addEventListener('keydown',function(e){
      if(e.key==='Backspace'&&!f.value&&i>0){fields[i-1].focus();fields[i-1].value=''}
      if(e.key==='Enter')check();
    });
  });
  document.getElementById('pgBtn').addEventListener('click',check);
  function check(){
    var d=fields.map(function(f){return f.value});
    if(d[0]+d[1]+d[2]+d[3]===''+String.fromCharCode(48)+String.fromCharCode(54)+String.fromCharCode(48)+String.fromCharCode(54)){
      try{sessionStorage.setItem(K,String(Date.now()))}catch(e){}
      o.classList.add('fade');
      document.documentElement.style.overflow='';
      setTimeout(function(){o.remove()},350);
    }else{
      var fs=document.getElementById('pgFields');
      fs.classList.add('pg-shake');
      document.getElementById('pgErr').textContent='PIN incorreto';
      setTimeout(function(){fs.classList.remove('pg-shake');fields.forEach(function(f){f.value=''});fields[0].focus()},500);
      setTimeout(function(){document.getElementById('pgErr').textContent=''},2500);
    }
  }
})();
