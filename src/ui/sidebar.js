// src/ui/sidebar.js — Disciplines as compact clickable items (NO accordion)

function buildSidebar(){
  var nav=document.getElementById('modNav');
  if(!nav)return;
  var html='';
  var grouped={};var order=[];
  window.M.forEach(function(m,i){
    var disc=m.discipline||'economia';
    if(!grouped[disc]){grouped[disc]=[];order.push(disc)}
    grouped[disc].push({mod:m,idx:i});
  });
  order.forEach(function(disc){
    var d=window.DISCIPLINES[disc]||{label:disc,icon:'📚'};
    var mods=grouped[disc];
    var totalL=mods.reduce(function(s,x){return s+x.mod.lessons.length},0);
    var doneL=mods.reduce(function(s,x){return s+x.mod.lessons.filter(function(_,li){return window.S.done[x.idx+'-'+li]}).length},0);
    var pct=totalL?Math.round(doneL/totalL*100):0;
    var clr=window.getModColor(mods[0].mod.color||'sage');
    var clrMuted=window.getModColorMuted(mods[0].mod.color||'sage');

    if(mods.length===1){
      // Single-module: click goes directly to module
      var x=mods[0];
      html+='<div class="ni" onclick="goMod('+x.idx+')" id="nM'+x.idx+'" role="button" tabindex="0">'
        +'<div class="ni-icon" style="background:'+clrMuted+';color:'+clr+'">'+d.icon+'</div>'
        +'<div><div class="ni-txt">'+d.label+'</div>'
        +'<div class="ni-sub">'+x.mod.lessons.length+' aulas · '+pct+'%</div>'
        +'<div class="ni-prog"><div class="ni-prog-bar" style="width:'+pct+'%;background:'+clr+'"></div></div>'
        +'</div></div>';
    } else {
      // Multi-module: click shows modules in MAIN area (no accordion)
      html+='<div class="ni" onclick="goDisc(\''+disc+'\')" id="nD-'+disc+'" role="button" tabindex="0">'
        +'<div class="ni-icon" style="background:'+clrMuted+';color:'+clr+'">'+d.icon+'</div>'
        +'<div><div class="ni-txt">'+d.label+'</div>'
        +'<div class="ni-sub">'+mods.length+' modulos · '+pct+'%</div>'
        +'<div class="ni-prog"><div class="ni-prog-bar" style="width:'+pct+'%;background:'+clr+'"></div></div>'
        +'</div></div>';
    }
  });
  nav.innerHTML=html;
}

// Navigate to discipline — shows module cards in main area
function goDisc(disc){
  var d=window.DISCIPLINES[disc]||{label:disc,icon:'📚'};
  var mods=window.getDiscModules(disc);
  if(!mods.length)return;
  if(mods.length===1){window.goMod(mods[0].idx);return}

  try{history.pushState({view:'disc',disc:disc},'')}catch(e){}
  window.setDiscAccent(disc);
  window.hideAllViews();

  var totalL=mods.reduce(function(s,x){return s+x.mod.lessons.length},0);
  var doneL=mods.reduce(function(s,x){return s+x.mod.lessons.filter(function(_,li){return window.S.done[x.idx+'-'+li]}).length},0);
  var pct=totalL?Math.round(doneL/totalL*100):0;

  var cardsHtml='';
  mods.forEach(function(x){
    var m=x.mod,i=x.idx;
    var done=m.lessons.filter(function(_,li){return window.S.done[i+'-'+li]}).length;
    var p=Math.round(done/m.lessons.length*100);
    var clr=window.getModColor(m.color||'sage');
    var statusCls=p===100?'completed':p>0?'in-progress':'not-started';
    var statusTxt=p===100?'✓ Completo':p>0?done+'/'+m.lessons.length+' aulas':'Comecar';
    cardsHtml+='<div class="mc" onclick="goMod('+i+')">'
      +'<div class="mc-circle"><div class="mc-ring" style="--ring-pct:'+p+';--ring-color:'+clr+'"></div><div class="mc-ring-inner"></div><span class="mc-circle-icon">'+m.icon+'</span></div>'
      +'<div class="mc-info"><h3>'+m.title+'</h3><p>'+m.desc+'</p><div class="mc-meta">'+m.lessons.length+' aulas · '+p+'%</div></div>'
      +'<div class="mc-status '+statusCls+'">'+statusTxt+'</div></div>';
  });

  var dash=window._origById?window._origById('vDash'):document.getElementById('vDash');
  if(dash){
    dash.style.display='block';
    dash.innerHTML='<div style="margin-bottom:1.25rem">'
      +'<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">'
      +'<span style="font-size:2rem">'+d.icon+'</span>'
      +'<div><h2 style="font-size:1.3rem;font-weight:800;margin:0">'+d.label+'</h2>'
      +'<p style="font-size:.82rem;color:var(--text-muted);margin:.2rem 0 0">'+mods.length+' modulos · '+totalL+' aulas · '+pct+'% concluido</p></div>'
      +'</div></div>'
      +'<div class="mcards">'+cardsHtml+'</div>';
  }

  // Set sidebar active
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active')});
  var el=document.getElementById('nD-'+disc);
  if(el){el.classList.add('active');if(window.innerWidth>900)el.scrollIntoView({block:'nearest',behavior:'smooth'})}

  var mainEl=document.querySelector('.main');
  if(mainEl)mainEl.scrollTop=0;
}

// Legacy compat — toggleDiscGroup now redirects to goDisc
function toggleDiscGroup(disc){goDisc(disc)}

window.buildSidebar=buildSidebar;
window.goDisc=goDisc;
window.toggleDiscGroup=toggleDiscGroup;
