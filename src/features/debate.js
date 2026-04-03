// ============================================================
// DEBATE AO VIVO — Salas de discussao com Supabase Realtime
// ============================================================

var DEBATE_ROOMS = [
  { id: 'economia',  name: 'Economia',   icon: '💰', desc: 'Mercado livre, moeda e inflacao', color: 'sage', online: 3+Math.floor(Math.random()*6) },
  { id: 'filosofia', name: 'Filosofia',  icon: '🏛️', desc: 'Etica, logica e pensamento critico', color: 'lavender', online: 2+Math.floor(Math.random()*5) },
  { id: 'historia',  name: 'Historia',   icon: '📜', desc: 'Brasil, mundo e revolucoes', color: 'honey', online: 1+Math.floor(Math.random()*4) },
  { id: 'ciencias',  name: 'Ciencias',   icon: '🔬', desc: 'Natureza, tecnologia e descobertas', color: 'sky', online: 2+Math.floor(Math.random()*5) },
  { id: 'livre',     name: 'Tema Livre',  icon: '🔥', desc: 'Qualquer assunto educacional', color: 'coral', online: 4+Math.floor(Math.random()*8) },
];

var _currentRoom = null;
var _debateChannel = null;
var _debateMessages = [];

// ============================================================
// NAVIGATION
// ============================================================
function goDebate(){
  window.hideAllViews();
  var view = document.getElementById('vDebate');
  if(!view){
    view = document.createElement('div');
    view.className = 'xview';
    view.id = 'vDebate';
    document.getElementById('mainC').appendChild(view);
  }
  view.classList.add('on','view-enter');
  setTimeout(function(){view.classList.remove('view-enter')},350);
  window.setNav('nDebate');
  _currentRoom = null;
  _renderRoomList();
  try{history.pushState({view:'debate'},'')}catch(e){}
}

function goDebateRoom(roomId){
  var room = DEBATE_ROOMS.find(function(r){return r.id===roomId});
  if(!room)return;
  _currentRoom = room;
  _debateMessages = [];
  var view = document.getElementById('vDebate');
  if(!view)return;
  _renderRoom(room);
  _subscribeRoom(roomId);
  try{history.pushState({view:'debate',room:roomId},'')}catch(e){}
}

// ============================================================
// RENDER — Room list (polished)
// ============================================================
function _renderRoomList(){
  var view = document.getElementById('vDebate');
  var totalOnline = DEBATE_ROOMS.reduce(function(s,r){return s+r.online},0);

  var html = '<div class="debate-header">'
    +'<div class="debate-header-left">'
    +'<h2 class="debate-title">🔥 Debates ao Vivo</h2>'
    +'<p class="debate-subtitle">Salas de discussao em tempo real</p>'
    +'</div>'
    +'<div class="debate-online-total">'
    +'<span class="debate-online-dot"></span>'
    +'<span class="debate-online-count">'+totalOnline+' online</span>'
    +'</div>'
    +'</div>';

  html += '<div class="debate-rooms">';
  DEBATE_ROOMS.forEach(function(r){
    var colorVar = 'var(--'+r.color+')';
    var colorMuted = 'var(--'+r.color+'-muted)';
    var msgCount = (MOCK_MESSAGES[r.id]||[]).length;

    html += '<div class="debate-room-card" onclick="goDebateRoom(\''+r.id+'\')" role="button" tabindex="0">'
      +'<div class="debate-room-icon" style="background:'+colorMuted+';color:'+colorVar+'">'+r.icon+'</div>'
      +'<div class="debate-room-info">'
      +'<div class="debate-room-name">'+r.name+'</div>'
      +'<div class="debate-room-desc">'+r.desc+'</div>'
      +'<div class="debate-room-meta">'
      +'<span class="debate-room-online"><span class="debate-online-dot-sm"></span>'+r.online+' online</span>'
      +'<span class="debate-room-msgs">'+msgCount+' msgs</span>'
      +'</div>'
      +'</div>'
      +'<span class="debate-room-arrow">›</span>'
      +'</div>';
  });
  html += '</div>';

  html += '<div class="debate-info">'
    +'<p>💡 Voce pode ler todas as mensagens sem login. Para participar, faca login clicando no campo de mensagem.</p>'
    +'</div>';

  view.innerHTML = html;
}

// ============================================================
// RENDER — Single room (messages + input)
// ============================================================
function _renderRoom(room){
  var view = document.getElementById('vDebate');
  var isLoggedIn = typeof window.currentUser!=='undefined' && window.currentUser;
  var placeholder = isLoggedIn ? 'Escreva sua opiniao...' : '🔒 Faca login para participar';
  var colorVar = 'var(--'+room.color+')';

  view.innerHTML = '<div class="debate-room-header">'
    +'<div class="debate-room-header-info">'
    +'<span class="debate-room-header-icon" style="color:'+colorVar+'">'+room.icon+'</span>'
    +'<div>'
    +'<h3 class="debate-room-header-name">'+room.name+'</h3>'
    +'<span class="debate-room-header-online"><span class="debate-online-dot-sm"></span>'+room.online+' participantes</span>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="debate-messages" id="debateMessages" role="log" aria-live="polite">'
    +'<div class="debate-messages-loading">Carregando mensagens...</div>'
    +'</div>'
    +'<div class="debate-input-area">'
    +'<input class="debate-input" id="debateInput" placeholder="'+placeholder+'"'
    +' onkeydown="if(event.key===\'Enter\')sendDebateMsg()"'
    +' onfocus="if(!window.currentUser){this.blur();showLoginPrompt(\'debate\')}"'
    +' aria-label="Mensagem no debate"'
    +(isLoggedIn?'':' readonly')+'>'
    +'<button class="debate-send" onclick="sendDebateMsg()" aria-label="Enviar"'
    +' style="background:'+colorVar+'">➤</button>'
    +'</div>';
}

// ============================================================
// SEND MESSAGE
// ============================================================
function sendDebateMsg(){
  if(!window.currentUser){
    window.showLoginPrompt('debate');
    return;
  }
  var input = document.getElementById('debateInput');
  if(!input)return;
  var text = input.value.trim();
  if(!text||text.length>500)return;
  input.value = '';

  _addMessage({
    user_name: window.S.name||'Aluno',
    user_avatar: window.S.avatar||'🧑‍🎓',
    text: text,
    created_at: new Date().toISOString(),
    is_own: true
  });

  if(typeof window.sbClient!=='undefined' && window.sbClient && _currentRoom){
    window.sbClient.from('debate_messages').insert({
      room_id: _currentRoom.id,
      user_id: window.currentUser.id,
      user_name: window.S.name||'Aluno',
      user_avatar: window.S.avatar||'🧑‍🎓',
      text: text
    }).then(function(res){
      if(res.error)console.warn('[Debate] Send error:', res.error.message);
    });
  }
}

// ============================================================
// REALTIME
// ============================================================
function _subscribeRoom(roomId){
  if(_debateChannel){try{_debateChannel.unsubscribe()}catch(e){}_debateChannel=null}

  if(window.OFFLINE_MODE || typeof window.sbClient==='undefined' || !window.sbClient){
    _loadMockMessages(roomId);
    return;
  }

  window.sbClient.from('debate_messages')
    .select('user_name,user_avatar,text,created_at,user_id')
    .eq('room_id', roomId)
    .order('created_at',{ascending:false})
    .limit(50)
    .then(function(res){
      if(res.data){
        _debateMessages = res.data.reverse().map(function(m){
          return{user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:window.currentUser&&m.user_id===window.currentUser.id};
        });
        _renderMessages();
      }
    });

  _debateChannel = window.sbClient
    .channel('debate:'+roomId)
    .on('postgres_changes',
      {event:'INSERT',schema:'public',table:'debate_messages',filter:'room_id=eq.'+roomId},
      function(payload){
        var m=payload.new;
        if(window.currentUser&&m.user_id===window.currentUser.id)return;
        _addMessage({user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:false});
      }
    ).subscribe();
}

// ============================================================
// MESSAGE RENDERING
// ============================================================
function _addMessage(msg){
  _debateMessages.push(msg);
  if(_debateMessages.length>200)_debateMessages.shift();
  var container=document.getElementById('debateMessages');
  if(!container)return;
  // Remove loading placeholder
  var loading=container.querySelector('.debate-messages-loading');
  if(loading)loading.remove();

  var div=document.createElement('div');
  div.className='debate-msg'+(msg.is_own?' debate-msg-own':'');
  var time=new Date(msg.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.innerHTML='<div class="debate-msg-avatar-wrap"><span class="debate-msg-avatar">'+msg.user_avatar+'</span></div>'
    +'<div class="debate-msg-body">'
    +'<div class="debate-msg-head"><strong>'+_escapeHtml(msg.user_name)+'</strong><span class="debate-msg-time">'+time+'</span></div>'
    +'<div class="debate-msg-text">'+_escapeHtml(msg.text)+'</div></div>';
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;
}

function _renderMessages(){
  var container=document.getElementById('debateMessages');
  if(!container)return;
  container.innerHTML='';
  if(_debateMessages.length===0){
    container.innerHTML='<div class="debate-empty"><div class="debate-empty-icon">💬</div><div>Nenhuma mensagem ainda.<br>Seja o primeiro a participar!</div></div>';
    return;
  }
  _debateMessages.forEach(function(m){_addMessage(m)});
}

function _escapeHtml(str){var d=document.createElement('div');d.textContent=str;return d.innerHTML}

// ============================================================
// MOCK DATA
// ============================================================
var MOCK_MESSAGES = {
  economia:[
    {user_name:'Ana',user_avatar:'👧',text:'Alguem mais acha que a inflacao no Brasil e causada por excesso de gasto publico?',created_at:'2026-04-02T14:30:00Z'},
    {user_name:'Pedro',user_avatar:'👦',text:'Sim! A escola austriaca explica isso muito bem. Mises ja falava sobre expansao monetaria.',created_at:'2026-04-02T14:31:00Z'},
    {user_name:'Sofia',user_avatar:'👩',text:'Concordo. Mas tambem tem o fator de expectativas. Se todos esperam inflacao, ela se auto-realiza.',created_at:'2026-04-02T14:32:00Z'},
    {user_name:'Lucas',user_avatar:'🧑',text:'O modulo 1 da Escola Liberal explica isso muito bem! Recomendo a aula sobre moeda.',created_at:'2026-04-02T14:33:00Z'},
    {user_name:'Renata',user_avatar:'👩',text:'Alguem sabe a diferenca entre inflacao de demanda e de custos?',created_at:'2026-04-02T14:35:00Z'},
  ],
  filosofia:[
    {user_name:'Maria',user_avatar:'👩',text:'O que voces acham do dilema do bonde? Puxar a alavanca e matar 1 para salvar 5?',created_at:'2026-04-02T15:00:00Z'},
    {user_name:'Gabriel',user_avatar:'🧑',text:'Utilitarismo diria sim. Mas a etica kantiana diria que usar alguem como meio e sempre errado.',created_at:'2026-04-02T15:01:00Z'},
    {user_name:'Julia',user_avatar:'👧',text:'Achei a aula de dialogo socratico incrivel pra pensar nesses dilemas!',created_at:'2026-04-02T15:02:00Z'},
    {user_name:'Felipe',user_avatar:'👦',text:'Aristoteles diria: depende da virtude de quem decide.',created_at:'2026-04-02T15:03:00Z'},
  ],
  historia:[
    {user_name:'Rafael',user_avatar:'👦',text:'A Revolucao Industrial foi boa ou ruim para os trabalhadores?',created_at:'2026-04-02T13:00:00Z'},
    {user_name:'Isabella',user_avatar:'👩',text:'No curto prazo teve sofrimento, mas no longo prazo tirou bilhoes da pobreza.',created_at:'2026-04-02T13:01:00Z'},
    {user_name:'Arthur',user_avatar:'🧑',text:'Exato. Antes da industrializacao, 90% vivia na pobreza extrema. Hoje e menos de 10%.',created_at:'2026-04-02T13:02:00Z'},
  ],
  ciencias:[
    {user_name:'Helena',user_avatar:'👧',text:'Alguem entendeu a diferenca entre celula animal e vegetal?',created_at:'2026-04-02T16:00:00Z'},
    {user_name:'Bernardo',user_avatar:'👦',text:'Vegetal tem parede celular e cloroplastos. Animal nao. Mas ambas tem mitocondria!',created_at:'2026-04-02T16:01:00Z'},
    {user_name:'Clara',user_avatar:'👧',text:'A fotossintese acontece nos cloroplastos. E a respiracao celular nas mitocondrias.',created_at:'2026-04-02T16:03:00Z'},
  ],
  livre:[
    {user_name:'Alice',user_avatar:'👧',text:'Qual disciplina voces mais gostam na Escola Liberal?',created_at:'2026-04-02T17:00:00Z'},
    {user_name:'Davi',user_avatar:'👦',text:'Economia! Nunca imaginei que aprender sobre mercado livre seria tao legal.',created_at:'2026-04-02T17:01:00Z'},
    {user_name:'Manuela',user_avatar:'👩',text:'Eu curto programacao. O mini-jogo da limonada e viciante!',created_at:'2026-04-02T17:02:00Z'},
    {user_name:'Lorenzo',user_avatar:'🧑',text:'Historia pra mim. A parte de American History em ingles ajuda demais no idioma.',created_at:'2026-04-02T17:03:00Z'},
    {user_name:'Valentina',user_avatar:'👧',text:'Filosofia me fez pensar diferente sobre tudo. Recomendo o modulo de logica!',created_at:'2026-04-02T17:05:00Z'},
  ]
};

function _loadMockMessages(roomId){
  var msgs=MOCK_MESSAGES[roomId]||MOCK_MESSAGES.livre;
  _debateMessages=msgs.map(function(m){return{user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:false}});
  _renderMessages();
}

function getDebateActivity(){return DEBATE_ROOMS.length}

// ============================================================
// EXPORTS
// ============================================================
window.goDebate=goDebate;
window.goDebateRoom=goDebateRoom;
window.sendDebateMsg=sendDebateMsg;
window.getDebateActivity=getDebateActivity;
window.DEBATE_ROOMS=DEBATE_ROOMS;
