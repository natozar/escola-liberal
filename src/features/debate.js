// ============================================================
// DEBATE AO VIVO — 15 salas, presenca online, chat real-time
// ============================================================

var DEBATE_ROOMS = [
  { id:'economia',   name:'Economia & Livre Mercado',  icon:'📊', color:'#f59e0b', online:0 },
  { id:'filosofia',  name:'Filosofia & Etica',         icon:'🏛️', color:'#8b5cf6', online:0 },
  { id:'historia',   name:'Historia & Revisionismo',   icon:'📜', color:'#ef4444', online:0 },
  { id:'politica',   name:'Politica & Estado',          icon:'⚖️', color:'#3b82f6', online:0 },
  { id:'educacao',   name:'Educacao & Homeschool',      icon:'📚', color:'#10b981', online:0 },
  { id:'tecnologia', name:'IA & Tecnologia',            icon:'🤖', color:'#06b6d4', online:0 },
  { id:'direito',    name:'Direito & Liberdade',        icon:'🔒', color:'#6366f1', online:0 },
  { id:'midia',      name:'Midia & Fake News',          icon:'📡', color:'#ec4899', online:0 },
  { id:'financas',   name:'Financas & Investimento',    icon:'💰', color:'#eab308', online:0 },
  { id:'psicologia', name:'Psicologia & Comportamento', icon:'🧠', color:'#a855f7', online:0 },
  { id:'ciencias',   name:'Ciencias & Clima',           icon:'🔬', color:'#22c55e', online:0 },
  { id:'empreender', name:'Empreendedorismo',           icon:'🚀', color:'#f97316', online:0 },
  { id:'cultura',    name:'Cultura & Sociedade',        icon:'🎭', color:'#e11d48', online:0 },
  { id:'saude',      name:'Saude & Bem-estar',          icon:'❤️', color:'#dc2626', online:0 },
  { id:'logica',     name:'Logica & Argumentacao',      icon:'♟️', color:'#64748b', online:0 },
];

var _currentRoom = null;
var _debateChannel = null;
var _debateMessages = [];
var _presenceChannels = [];

// Seed random online counts on load
DEBATE_ROOMS.forEach(function(r){ r.online = 1 + Math.floor(Math.random()*12) });

// ============================================================
// ONLINE COUNT — update top bar buttons
// ============================================================
function _updateTotalOnline(){
  var total = DEBATE_ROOMS.reduce(function(s,r){return s+r.online},0);
  ['debateOnlineCount','debateOnlineCountDesktop'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.textContent=total;
  });
}
_updateTotalOnline();

// ============================================================
// NAVIGATION
// ============================================================
function goDebate(){
  // Check if debate is disabled by parent
  if(typeof window.isDebateDisabled==='function'&&window.isDebateDisabled()){
    if(typeof window.toast==='function')window.toast('Debate desativado pelo responsavel.','error');
    return;
  }
  // Check LGPD consent
  if(typeof window.showDebateConsent==='function'&&!window.hasDebateConsent()){
    window.showDebateConsent(function(){goDebate()});
    return;
  }
  window.hideAllViews();
  // Use _origById to bypass Safe DOM proxy (which returns truthy proxy instead of null)
  var view = window._origById?window._origById('vDebate'):document.getElementById('vDebate');
  if(!view){
    view = document.createElement('div');
    view.className='xview';
    view.id='vDebate';
    var mainC=window._origById?window._origById('mainC'):document.getElementById('mainC');
    if(mainC)mainC.appendChild(view);
  }
  view.classList.add('on','view-enter');
  setTimeout(function(){view.classList.remove('view-enter')},350);
  window.setNav('nDebate');
  _currentRoom=null;
  // Hide tutor FAB when in debate (debate is student-to-student, not AI)
  var fab=window._origById?window._origById('chatFab'):null;
  if(fab)fab.style.display='none';
  _renderRoomList();
  try{history.pushState({view:'debate'},'')}catch(e){}
}

function goDebateRoom(roomId){
  var room=DEBATE_ROOMS.find(function(r){return r.id===roomId});
  if(!room)return;
  _currentRoom=room;
  _debateMessages=[];
  var view=window._origById?window._origById('vDebate'):document.getElementById('vDebate');
  if(!view)return;
  _renderRoom(room);
  _subscribeRoom(roomId);
  try{history.pushState({view:'debate',room:roomId},'')}catch(e){}
}

// ============================================================
// RENDER — Room list
// ============================================================
function _renderRoomList(){
  var view=window._origById?window._origById('vDebate'):document.getElementById('vDebate');
  var totalOnline=DEBATE_ROOMS.reduce(function(s,r){return s+r.online},0);

  var html='<div class="debate-list-header">'
    +'<div><h2 class="debate-list-title">💬 Debate ao Vivo</h2>'
    +'<p class="debate-list-sub">15 salas tematicas · Discussao em tempo real</p></div>'
    +'<div class="debate-total-badge"><span class="dot-pulse"></span>'+totalOnline+' online</div>'
    +'</div>';

  html+='<div class="debate-grid">';
  DEBATE_ROOMS.forEach(function(r){
    var msgs=MOCK_MESSAGES[r.id]||[];
    var lastMsg=msgs.length?msgs[msgs.length-1]:null;
    var preview=lastMsg?('<strong>'+_esc(lastMsg.user_name)+':</strong> '+_esc(lastMsg.text).substring(0,60)+(lastMsg.text.length>60?'...':'')):'Nenhuma mensagem ainda';

    html+='<div class="debate-card" onclick="goDebateRoom(\''+r.id+'\')" role="button" tabindex="0" style="--room-color:'+r.color+'">'
      +'<div class="debate-card-top">'
      +'<span class="debate-card-icon" style="background:'+r.color+'20;color:'+r.color+'">'+r.icon+'</span>'
      +'<span class="debate-card-online"><span class="dot-pulse-sm"></span>'+r.online+'</span>'
      +'</div>'
      +'<div class="debate-card-name">'+r.name+'</div>'
      +'<div class="debate-card-preview">'+preview+'</div>'
      +'</div>';
  });
  html+='</div>';
  html+='<p class="debate-tip">💡 Leia todas as mensagens sem login. Para participar, clique no campo de mensagem.</p>';
  view.innerHTML=html;
}

// ============================================================
// RENDER — Room chat
// ============================================================
function _renderRoom(room){
  var view=window._origById?window._origById('vDebate'):document.getElementById('vDebate');
  var isLoggedIn=typeof window.currentUser!=='undefined'&&window.currentUser;
  var ph=isLoggedIn?'Escreva sua opiniao...':'🔒 Faca login para participar';

  // Check suspension status for input
  var susp=typeof window._isSuspended==='function'?window._isSuspended():{suspended:false};
  if(susp.suspended){ph=susp.msg;isLoggedIn=false}// Force readonly if suspended
  var rulesBanner=typeof window.getRulesBannerHtml==='function'?window.getRulesBannerHtml():'';

  view.innerHTML=rulesBanner
    +'<div class="debate-room-bar" style="--room-color:'+room.color+'">'
    +'<div class="debate-room-bar-info">'
    +'<span class="debate-room-bar-icon" style="color:'+room.color+'">'+room.icon+'</span>'
    +'<div><div class="debate-room-bar-name">'+room.name+'</div>'
    +'<div class="debate-room-bar-status"><span class="dot-pulse-sm"></span>'+room.online+' online</div></div>'
    +'</div>'
    +'</div>'
    +'<div class="debate-chat" id="debateMessages" role="log" aria-live="polite">'
    +'<div class="debate-chat-loading">Carregando...</div>'
    +'</div>'
    +'<div class="debate-input-bar">'
    +'<button class="debate-audio-btn" id="debateAudioBtn" onclick="toggleDebateAudio()" title="Enviar audio" aria-label="Gravar audio">🎤</button>'
    +'<input class="debate-input" id="debateInput" placeholder="'+ph+'"'
    +' onkeydown="if(event.key===\'Enter\')sendDebateMsg()"'
    +' onfocus="if(!window.currentUser){this.blur();showLoginPrompt(\'debate\')}"'
    +' aria-label="Mensagem"'+(isLoggedIn?'':' readonly')+'>'
    +'<button class="debate-send-btn" onclick="sendDebateMsg()" aria-label="Enviar">Enviar</button>'
    +'</div>';
}

// ============================================================
// SEND
// ============================================================
function sendDebateMsg(){
  if(!window.currentUser){window.showLoginPrompt('debate');return}
  var input=window._origById?window._origById('debateInput'):document.getElementById('debateInput');
  if(!input)return;
  var text=input.value.trim();
  if(!text||text.length>500)return;

  // Run moderation filter
  if(typeof window.moderateMessage==='function'&&_currentRoom){
    var mod=window.moderateMessage(text,_currentRoom.id);
    if(!mod.allowed){
      if(typeof window._showModToast==='function')window._showModToast(mod.reason,mod.type==='personal_data'?'blocked':mod.type==='rate_limit'?'info':'warning');
      return;
    }
  }

  input.value='';
  _addMsg({user_name:window.S.name||'Aluno',user_avatar:window.S.avatar||'🧑‍🎓',text:text,created_at:new Date().toISOString(),is_own:true});
  if(typeof window.sbClient!=='undefined'&&window.sbClient&&_currentRoom){
    window.sbClient.from('debate_messages').insert({room_id:_currentRoom.id,user_id:window.currentUser.id,user_name:window.S.name||'Aluno',user_avatar:window.S.avatar||'🧑‍🎓',text:text}).then(function(r){if(r.error)console.warn('[Debate]',r.error.message)});
  }
}

// ============================================================
// REALTIME / MOCK
// ============================================================
function _subscribeRoom(roomId){
  if(_debateChannel){try{_debateChannel.unsubscribe()}catch(e){}_debateChannel=null}
  if(window.OFFLINE_MODE||typeof window.sbClient==='undefined'||!window.sbClient){_loadMock(roomId);return}
  window.sbClient.from('debate_messages').select('user_name,user_avatar,text,created_at,user_id').eq('room_id',roomId).order('created_at',{ascending:true}).limit(50).then(function(res){
    if(res.data){_debateMessages=res.data.map(function(m){return{user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:window.currentUser&&m.user_id===window.currentUser.id}});_renderMsgs()}
  });
  _debateChannel=window.sbClient.channel('debate:'+roomId).on('postgres_changes',{event:'INSERT',schema:'public',table:'debate_messages',filter:'room_id=eq.'+roomId},function(p){
    var m=p.new;if(window.currentUser&&m.user_id===window.currentUser.id)return;
    _addMsg({user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:false});
  }).subscribe();
}

// ============================================================
// MESSAGE RENDERING
// ============================================================
function _addMsg(msg){
  _debateMessages.push(msg);
  if(_debateMessages.length>200)_debateMessages.shift();
  var c=window._origById?window._origById('debateMessages'):document.getElementById('debateMessages');if(!c)return;
  var ld=c.querySelector('.debate-chat-loading');if(ld)ld.remove();
  var d=document.createElement('div');
  d.className='debate-bubble'+(msg.is_own?' debate-bubble-own':'');
  var t=new Date(msg.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  d.innerHTML='<span class="debate-bubble-av">'+msg.user_avatar+'</span>'
    +'<div class="debate-bubble-body">'
    +'<div class="debate-bubble-head"><b>'+_esc(msg.user_name)+'</b><span>'+t+'</span></div>'
    +'<div class="debate-bubble-text">'+_esc(msg.text)+'</div></div>';
  c.appendChild(d);c.scrollTop=c.scrollHeight;
}
function _renderMsgs(){
  var c=window._origById?window._origById('debateMessages'):document.getElementById('debateMessages');if(!c)return;c.innerHTML='';
  if(!_debateMessages.length){c.innerHTML='<div class="debate-chat-empty"><div style="font-size:2.5rem;margin-bottom:.5rem">💬</div>Nenhuma mensagem ainda.<br>Seja o primeiro!</div>';return}
  _debateMessages.forEach(function(m){_addMsg(m)});
}
function _esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}

// ============================================================
// MOCK DATA — 15 salas
// ============================================================
var MOCK_MESSAGES={
  economia:[
    {user_name:'Ana',user_avatar:'👩‍🎓',text:'O livre mercado e realmente a melhor forma de distribuir recursos?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Pedro',user_avatar:'👨‍🎓',text:'Depende do contexto. Em mercados com falhas naturais, regulacao minima ajuda.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Julia',user_avatar:'👩‍💻',text:'Mas quem define falha de mercado? Isso ja e intervencao!',created_at:new Date(Date.now()-60000).toISOString()},
    {user_name:'Lucas',user_avatar:'🧑‍🔬',text:'Hayek argumentava que o conhecimento disperso torna planificacao impossivel.',created_at:new Date(Date.now()-30000).toISOString()},
  ],
  filosofia:[
    {user_name:'Maria',user_avatar:'👩‍🎓',text:'A etica utilitarista pode justificar sacrificar um para salvar muitos?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Thiago',user_avatar:'👨‍🎓',text:'Kant diria que nunca — a pessoa e fim, nao meio.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Sofia',user_avatar:'👩‍💻',text:'E se o "muitos" incluir criancas inocentes? A equacao muda?',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  historia:[
    {user_name:'Gabriel',user_avatar:'👨‍🎓',text:'Revisionismo e necessario ou perigoso para a sociedade?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Beatriz',user_avatar:'👩‍🎓',text:'Questionar fontes e metodo cientifico. Negar fatos e ideologia.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Rafael',user_avatar:'🧑‍🔬',text:'O problema e quando governos usam "revisao" para reescrever historia.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  politica:[
    {user_name:'Isabela',user_avatar:'👩‍💻',text:'Estado minimo e viavel num pais com tanta desigualdade?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Mateus',user_avatar:'👨‍🎓',text:'A desigualdade e efeito do excesso de Estado, nao da falta.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Carolina',user_avatar:'👩‍🎓',text:'Singapura tem estado forte em educacao e saude, mas mercado livre no resto.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  educacao:[
    {user_name:'Fernanda',user_avatar:'👩‍🎓',text:'Homeschool deveria ser direito garantido por lei?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Diego',user_avatar:'👨‍🎓',text:'Com certeza. A familia tem prioridade sobre o Estado na educacao.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Camila',user_avatar:'👩‍💻',text:'Mas precisa de fiscalizacao para garantir qualidade minima.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  tecnologia:[
    {user_name:'Bruno',user_avatar:'🧑‍🔬',text:'IA vai substituir professores nos proximos 10 anos?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Larissa',user_avatar:'👩‍🎓',text:'Nao substituir, mas transformar completamente o papel deles.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Henrique',user_avatar:'👨‍🎓',text:'O tutor IA ja personaliza o ensino melhor que uma sala com 40 alunos.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  direito:[
    {user_name:'Amanda',user_avatar:'👩‍💻',text:'Liberdade de expressao deve ter limites?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Victor',user_avatar:'👨‍🎓',text:'So quando ha incitacao direta a violencia. Opiniao nunca.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Leticia',user_avatar:'👩‍🎓',text:'E fake news que causa danos reais? Onde fica a linha?',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  midia:[
    {user_name:'Felipe',user_avatar:'👨‍🎓',text:'A grande midia tem mais poder que governos em moldar opiniao?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Mariana',user_avatar:'👩‍🎓',text:'Redes sociais democratizaram, mas tambem polarizaram.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Gustavo',user_avatar:'🧑‍🔬',text:'O algoritmo de engajamento e o verdadeiro editor-chefe.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  financas:[
    {user_name:'Rodrigo',user_avatar:'👨‍🎓',text:'Bitcoin e reserva de valor ou especulacao?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Patricia',user_avatar:'👩‍💻',text:'Ambos. Depende do horizonte temporal do investidor.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Daniel',user_avatar:'🧑‍🔬',text:'A volatilidade atual impede uso como moeda no dia a dia.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  psicologia:[
    {user_name:'Juliana',user_avatar:'👩‍🎓',text:'Redes sociais estao causando epidemia de ansiedade em jovens?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Andre',user_avatar:'👨‍🎓',text:'Correlacao nao e causalidade, mas os dados sao preocupantes.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Laura',user_avatar:'👩‍💻',text:'O problema e a comparacao social constante, nao a tecnologia em si.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  ciencias:[
    {user_name:'Ricardo',user_avatar:'🧑‍🔬',text:'Mudanca climatica: ate que ponto a ciencia e consensual?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Natalia',user_avatar:'👩‍🎓',text:'97% dos climatologistas concordam com aquecimento antropogenico.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Eduardo',user_avatar:'👨‍🎓',text:'Consenso nao e prova. A pergunta e: quais solucoes funcionam?',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  empreender:[
    {user_name:'Vanessa',user_avatar:'👩‍💻',text:'Vale mais empreender jovem ou ter experiencia antes?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Leonardo',user_avatar:'👨‍🎓',text:'Jovem tem menos a perder. O custo de oportunidade e menor.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Aline',user_avatar:'👩‍🎓',text:'Mas sem experiencia voce comete erros que capital nao resolve.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  cultura:[
    {user_name:'Marcos',user_avatar:'👨‍🎓',text:'Cultura pop influencia mais valores que a escola formal?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Bianca',user_avatar:'👩‍🎓',text:'Com certeza. Series e musica formam a visao de mundo.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Caio',user_avatar:'🧑‍🔬',text:'Por isso educacao precisa incluir pensamento critico sobre midia.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  saude:[
    {user_name:'Priscila',user_avatar:'👩‍💻',text:'Saude mental deveria ser disciplina obrigatoria na escola?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Thiago',user_avatar:'👨‍🎓',text:'Sem duvida. Prevencao e mais barato que tratamento.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Renata',user_avatar:'👩‍🎓',text:'O desafio e quem ensina. Professores nao sao psicologos.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  logica:[
    {user_name:'Paulo',user_avatar:'🧑‍🔬',text:'Falacias logicas deveriam ser ensinadas no ensino fundamental?',created_at:new Date(Date.now()-180000).toISOString()},
    {user_name:'Clara',user_avatar:'👩‍🎓',text:'Se soubessemos identificar ad hominem e espantalho, o debate publico seria outro.',created_at:new Date(Date.now()-120000).toISOString()},
    {user_name:'Igor',user_avatar:'👨‍🎓',text:'Platao ja defendia isso ha 2400 anos. Nada novo.',created_at:new Date(Date.now()-60000).toISOString()},
  ],
  livre:[]
};
// Alias — livre uses mix
MOCK_MESSAGES.livre=[
  {user_name:'Alice',user_avatar:'👧',text:'Qual sala voces mais gostam?',created_at:new Date(Date.now()-120000).toISOString()},
  {user_name:'Davi',user_avatar:'👦',text:'Economia! Mises e incrivel.',created_at:new Date(Date.now()-60000).toISOString()},
];

function _loadMock(roomId){
  var msgs=MOCK_MESSAGES[roomId]||MOCK_MESSAGES.economia;
  _debateMessages=msgs.map(function(m){return{user_name:m.user_name,user_avatar:m.user_avatar,text:m.text,created_at:m.created_at,is_own:false}});
  _renderMsgs();
}

function getDebateActivity(){return DEBATE_ROOMS.reduce(function(s,r){return s+r.online},0)}

// ============================================================
// SPEECH-TO-TEXT (Web Speech API)
// ============================================================
var _debateRecognition=null;
var _debateRecording=false;

function toggleDebateAudio(){
  if(_debateRecording){_stopAudio();return}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){if(typeof window._showModToast==='function')window._showModToast('Seu navegador nao suporta reconhecimento de voz.','info');return}
  _debateRecognition=new SR();
  _debateRecognition.lang='pt-BR';
  _debateRecognition.continuous=false;
  _debateRecognition.interimResults=false;
  _debateRecognition.maxAlternatives=1;
  _debateRecognition.onresult=function(ev){
    var txt=ev.results[0][0].transcript;
    var input=window._origById?window._origById('debateInput'):null;
    if(input){input.value=(input.value?input.value+' ':'')+txt;input.focus()}
    _stopAudio();
  };
  _debateRecognition.onerror=function(ev){
    if(ev.error==='not-allowed'){if(typeof window._showModToast==='function')window._showModToast('Permissao de microfone negada.','warning')}
    else if(ev.error!=='aborted'){if(typeof window._showModToast==='function')window._showModToast('Erro no reconhecimento de voz.','info')}
    _stopAudio();
  };
  _debateRecognition.onend=function(){_stopAudio()};
  _debateRecognition.start();
  _debateRecording=true;
  var btn=window._origById?window._origById('debateAudioBtn'):null;
  if(btn){btn.classList.add('recording');btn.innerHTML='🔴'}
  if(typeof window._showModToast==='function')window._showModToast('Ouvindo... fale agora','info');
}

function _stopAudio(){
  _debateRecording=false;
  if(_debateRecognition){try{_debateRecognition.stop()}catch(e){}_debateRecognition=null}
  var btn=window._origById?window._origById('debateAudioBtn'):null;
  if(btn){btn.classList.remove('recording');btn.innerHTML='🎤'}
}

// ============================================================
// EXPORTS
// ============================================================
window.goDebate=goDebate;
window.goDebateRoom=goDebateRoom;
window.sendDebateMsg=sendDebateMsg;
window.getDebateActivity=getDebateActivity;
window.toggleDebateAudio=toggleDebateAudio;
window.DEBATE_ROOMS=DEBATE_ROOMS;
