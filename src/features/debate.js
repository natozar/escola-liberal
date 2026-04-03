// ============================================================
// DEBATE AO VIVO — Salas de discussao com Supabase Realtime
// ============================================================
// Accessible to ALL users (read). Login required to SEND messages.
// Uses Supabase Realtime for live message streaming.
// Falls back gracefully when offline or not authenticated.

const DEBATE_ROOMS = [
  { id: 'economia',    name: 'Economia',           icon: '💰', desc: 'Mercado livre, moeda, inflacao' },
  { id: 'filosofia',   name: 'Filosofia',          icon: '🏛️', desc: 'Etica, logica, pensamento critico' },
  { id: 'historia',    name: 'Historia',            icon: '📜', desc: 'Brasil, mundo, revolucoes' },
  { id: 'ciencias',    name: 'Ciencias',            icon: '🔬', desc: 'Natureza, tecnologia, descobertas' },
  { id: 'livre',       name: 'Tema Livre',          icon: '🔥', desc: 'Qualquer assunto educacional' },
];

let _currentRoom = null;
let _debateChannel = null;
let _debateMessages = [];

// ============================================================
// NAVIGATION
// ============================================================
function goDebate(){
  window.hideAllViews();
  var view = document.getElementById('vDebate');
  if(!view){
    // Create debate view dynamically (first access)
    view = document.createElement('div');
    view.className = 'xview';
    view.id = 'vDebate';
    document.getElementById('mainC').appendChild(view);
  }
  view.classList.add('on','view-enter');
  setTimeout(()=>view.classList.remove('view-enter'),350);
  window.setNav('nDebate');
  _currentRoom = null;
  _renderRoomList();
}

function goDebateRoom(roomId){
  var room = DEBATE_ROOMS.find(r=>r.id===roomId);
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
// RENDER — Room list
// ============================================================
function _renderRoomList(){
  var view = document.getElementById('vDebate');
  var html = '<div class="xview-head"><button class="btn btn-ghost" onclick="mobileBack()">← Voltar</button><div><h2>🔥 Debates ao Vivo</h2></div></div>';
  html += '<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1.25rem">Salas de discussao em tempo real. Entre, leia e participe!</p>';
  html += '<div class="debate-rooms">';
  DEBATE_ROOMS.forEach(function(r){
    html += '<div class="debate-room-card" onclick="goDebateRoom(\''+r.id+'\')" role="button" tabindex="0">'
      +'<div class="debate-room-icon">'+r.icon+'</div>'
      +'<div class="debate-room-info">'
      +'<div class="debate-room-name">'+r.name+'</div>'
      +'<div class="debate-room-desc">'+r.desc+'</div>'
      +'</div>'
      +'<span style="font-size:.7rem;color:var(--sage-light);font-weight:600;white-space:nowrap">'+(3+Math.floor(Math.random()*8))+' online</span>'
      +'</div>';
  });
  html += '</div>';
  view.innerHTML = html;
}

// ============================================================
// RENDER — Single room (messages + input)
// ============================================================
function _renderRoom(room){
  var view = document.getElementById('vDebate');
  var isLoggedIn = typeof window.currentUser!=='undefined' && window.currentUser;
  var placeholder = isLoggedIn ? 'Sua opiniao...' : 'Faca login para participar →';

  view.innerHTML = '<div class="xview-head">'
    +'<button class="btn btn-ghost" onclick="goDebate()">← Salas</button>'
    +'<div><h2>'+room.icon+' '+room.name+'</h2></div></div>'
    +'<div class="debate-messages" id="debateMessages" role="log" aria-live="polite">'
    +'<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:.85rem">'
    +'Sala '+room.name+' — mensagens aparecem em tempo real.</div></div>'
    +'<div class="debate-input-area">'
    +'<input class="debate-input" id="debateInput" placeholder="'+placeholder+'"'
    +' onkeydown="if(event.key===\'Enter\')sendDebateMsg()"'
    +' onclick="if(!window.currentUser)showLoginPrompt(\'debate\')"'
    +' aria-label="Mensagem no debate"'
    +(isLoggedIn?'':' readonly')+'>'
    +'<button class="debate-send" onclick="sendDebateMsg()" aria-label="Enviar">➤</button>'
    +'</div>';
}

// ============================================================
// SEND MESSAGE — requires auth
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

  // Add message locally immediately (optimistic)
  _addMessage({
    user_name: window.S.name||'Aluno',
    user_avatar: window.S.avatar||'🧑‍🎓',
    text: text,
    created_at: new Date().toISOString(),
    is_own: true
  });

  // Send to Supabase if connected
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
// REALTIME — Subscribe to room messages
// ============================================================
function _subscribeRoom(roomId){
  // Unsubscribe previous
  if(_debateChannel){
    try{_debateChannel.unsubscribe()}catch(e){}
    _debateChannel = null;
  }

  // OFFLINE_MODE: load mock messages
  if(window.OFFLINE_MODE || typeof window.sbClient==='undefined' || !window.sbClient){
    _loadMockMessages(roomId);
    return;
  }

  // Load recent messages
  window.sbClient.from('debate_messages')
    .select('user_name,user_avatar,text,created_at,user_id')
    .eq('room_id', roomId)
    .order('created_at',{ascending:false})
    .limit(50)
    .then(function(res){
      if(res.data){
        _debateMessages = res.data.reverse().map(function(m){
          return {
            user_name: m.user_name,
            user_avatar: m.user_avatar,
            text: m.text,
            created_at: m.created_at,
            is_own: window.currentUser && m.user_id === window.currentUser.id
          };
        });
        _renderMessages();
      }
    });

  // Subscribe to new messages
  _debateChannel = window.sbClient
    .channel('debate:'+roomId)
    .on('postgres_changes',
      {event:'INSERT', schema:'public', table:'debate_messages', filter:'room_id=eq.'+roomId},
      function(payload){
        var m = payload.new;
        // Skip own messages (already added optimistically)
        if(window.currentUser && m.user_id === window.currentUser.id)return;
        _addMessage({
          user_name: m.user_name,
          user_avatar: m.user_avatar,
          text: m.text,
          created_at: m.created_at,
          is_own: false
        });
      }
    )
    .subscribe();
}

function _addMessage(msg){
  _debateMessages.push(msg);
  if(_debateMessages.length>200)_debateMessages.shift();
  var container = document.getElementById('debateMessages');
  if(!container)return;
  var div = document.createElement('div');
  div.className = 'debate-msg'+(msg.is_own?' debate-msg-own':'');
  var time = new Date(msg.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.innerHTML = '<span class="debate-msg-avatar">'+msg.user_avatar+'</span>'
    +'<div class="debate-msg-body">'
    +'<div class="debate-msg-head"><strong>'+msg.user_name+'</strong><span class="debate-msg-time">'+time+'</span></div>'
    +'<div class="debate-msg-text">'+_escapeHtml(msg.text)+'</div></div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function _renderMessages(){
  var container = document.getElementById('debateMessages');
  if(!container)return;
  container.innerHTML = '';
  if(_debateMessages.length===0){
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:.85rem">Nenhuma mensagem ainda. Seja o primeiro!</div>';
    return;
  }
  _debateMessages.forEach(function(m){_addMessage(m)});
}

function _escapeHtml(str){
  var div=document.createElement('div');div.textContent=str;return div.innerHTML;
}

// ============================================================
// MOCK DATA — for OFFLINE_MODE presentation
// ============================================================
var MOCK_MESSAGES = {
  economia:[
    {user_name:'Ana',user_avatar:'👧',text:'Alguem mais acha que a inflacao no Brasil e causada por excesso de gasto publico?',created_at:'2026-04-02T14:30:00Z'},
    {user_name:'Pedro',user_avatar:'👦',text:'Sim! A escola austriaca explica isso muito bem. Mises ja falava sobre expansao monetaria.',created_at:'2026-04-02T14:31:00Z'},
    {user_name:'Sofia',user_avatar:'👩',text:'Concordo. Mas tambem tem o fator de expectativas. Se todos esperam inflacao, ela se auto-realiza.',created_at:'2026-04-02T14:32:00Z'},
    {user_name:'Lucas',user_avatar:'🧑',text:'O modulo 1 da Escola Liberal explica isso muito bem! Recomendo a aula sobre moeda.',created_at:'2026-04-02T14:33:00Z'},
  ],
  filosofia:[
    {user_name:'Maria',user_avatar:'👩',text:'O que voces acham do dilema do bonde? Puxar a alavanca e matar 1 para salvar 5?',created_at:'2026-04-02T15:00:00Z'},
    {user_name:'Gabriel',user_avatar:'🧑',text:'Utilitarismo diria sim. Mas a etica kantiana diria que usar alguem como meio e sempre errado.',created_at:'2026-04-02T15:01:00Z'},
    {user_name:'Julia',user_avatar:'👧',text:'Achei a aula de dialogo socratico incrivel pra pensar nesses dilemas!',created_at:'2026-04-02T15:02:00Z'},
  ],
  historia:[
    {user_name:'Rafael',user_avatar:'👦',text:'A Revolucao Industrial foi boa ou ruim para os trabalhadores?',created_at:'2026-04-02T13:00:00Z'},
    {user_name:'Isabella',user_avatar:'👩',text:'No curto prazo teve sofrimento, mas no longo prazo tirou bilhoes da pobreza.',created_at:'2026-04-02T13:01:00Z'},
    {user_name:'Arthur',user_avatar:'🧑',text:'Exato. Antes da industrializacao, 90% vivia na pobreza extrema. Hoje e menos de 10%.',created_at:'2026-04-02T13:02:00Z'},
  ],
  ciencias:[
    {user_name:'Helena',user_avatar:'👧',text:'Alguem entendeu a diferenca entre celula animal e vegetal?',created_at:'2026-04-02T16:00:00Z'},
    {user_name:'Bernardo',user_avatar:'👦',text:'Vegetal tem parede celular e cloroplastos. Animal nao. Mas ambas tem mitocondria!',created_at:'2026-04-02T16:01:00Z'},
  ],
  livre:[
    {user_name:'Alice',user_avatar:'👧',text:'Qual disciplina voces mais gostam na Escola Liberal?',created_at:'2026-04-02T17:00:00Z'},
    {user_name:'Davi',user_avatar:'👦',text:'Economia! Nunca imaginei que aprender sobre mercado livre seria tao legal.',created_at:'2026-04-02T17:01:00Z'},
    {user_name:'Manuela',user_avatar:'👩',text:'Eu curto programacao. O mini-jogo da limonada e viciante!',created_at:'2026-04-02T17:02:00Z'},
    {user_name:'Lorenzo',user_avatar:'🧑',text:'Historia pra mim. A parte de American History em ingles ajuda demais no idioma.',created_at:'2026-04-02T17:03:00Z'},
  ]
};

function _loadMockMessages(roomId){
  var msgs = MOCK_MESSAGES[roomId] || MOCK_MESSAGES.livre;
  _debateMessages = msgs.map(function(m){return{user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:false}});
  _renderMessages();
}

// ============================================================
// BADGE — count of active rooms (for top bar indicator)
// ============================================================
function getDebateActivity(){
  // Returns number of rooms with recent activity (placeholder — real implementation needs Supabase)
  return DEBATE_ROOMS.length;
}

// ============================================================
// EXPORTS
// ============================================================
window.goDebate = goDebate;
window.goDebateRoom = goDebateRoom;
window.sendDebateMsg = sendDebateMsg;
window.getDebateActivity = getDebateActivity;
window.DEBATE_ROOMS = DEBATE_ROOMS;
