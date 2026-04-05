// ============================================================
// MODERACAO DE DEBATE — Filtro de conteudo, strikes, LGPD
// Publico: adultos 18+. Seguranca e prioridade.
// 100% client-side. Funciona em OFFLINE_MODE.
// ============================================================

// ============================================================
// CAMADA 1 — Palavras proibidas
// ============================================================
var BANNED_WORDS=[
  'merda','porra','caralho','foda','fodase','puta','putaria','cuzao','cuza','arrombado',
  'viado','viad','bixa','bicha','buceta','piranha','vagabunda','desgraca','fdp','pqp',
  'krl','crl','vsf','tnc','lixo humano','retardado','mongoloide','imbecil',
  'fuck','shit','bitch','ass','dick','pussy','damn','crap','bastard','slut','whore',
  'sexo','nude','nudes','porn','gostosa','gostoso','safada','safado','tesao','piroca',
  'rola','pau','peito','bunda','pelada','pelado',
  'maconha','cocaina','crack','droga','baseado','beck','erva','cheirar po',
  'matar','morrer','suicidio','se matar','vou te pegar','ameaca',
  'meu telefone','meu celular','meu whatsapp','meu insta','meu instagram',
  'meu tiktok','meu snap','meu discord','me chama no','chama no zap',
  'meu numero','meu endereco','onde moro','minha escola'
];

function _normalize(text){
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s').replace(/@/g,'a')
    .replace(/\s+/g,' ').trim();
}

function _hasBannedWord(text){
  var norm=_normalize(text);
  for(var i=0;i<BANNED_WORDS.length;i++){
    var w=_normalize(BANNED_WORDS[i]);
    if(norm.includes(w))return BANNED_WORDS[i];
  }
  return null;
}

// ============================================================
// CAMADA 1b — Dados pessoais (LGPD)
// ============================================================
var PERSONAL_PATTERNS=[
  /\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4}/,
  /\(\d{2}\)\s?\d{4,5}-?\d{4}/,
  /\+55\s?\d{2}\s?\d{4,5}\s?\d{4}/,
  /\d{3}\.\d{3}\.\d{3}-\d{2}/,
  /\d{5}-?\d{3}/,
  /[\w.-]+@[\w.-]+\.\w{2,}/,
  /@[\w]{3,}/,
  /(?:instagram|insta|tiktok|snap|discord|whats|zap|telegram)[\s.:@\/]+\w+/i,
  /(?:rua|av|avenida|alameda|travessa)\s+[\w\s]{5,}/i,
  /(?:meu nome e|me chamo|sou o|sou a)\s+\w+\s+\w+/i
];

function _hasPersonalData(text){
  for(var i=0;i<PERSONAL_PATTERNS.length;i++){
    if(PERSONAL_PATTERNS[i].test(text))return true;
  }
  return false;
}

// ============================================================
// CAMADA 2 — Relevancia ao tema
// ============================================================
var ROOM_KEYWORDS={
  economia:['mercado','economia','capitalismo','socialismo','livre mercado','inflacao','preco','oferta','demanda','imposto','estado','governo','empresa','lucro','trabalho','salario','pobreza','riqueza','desigualdade','pib','moeda','banco','investimento','comercio'],
  filosofia:['etica','moral','filosofia','platao','aristoteles','kant','logica','razao','verdade','virtude','justica','bem','mal','liberdade','consciencia','existencia','pensamento','argumento','sabedoria','valor','dilema'],
  historia:['historia','guerra','revolucao','imperio','civilizacao','democracia','ditadura','rei','colonia','independencia','constituicao','republica','monarquia','escravidao','abolicao','medieval','antigo','moderno'],
  politica:['politica','estado','governo','democracia','direita','esquerda','liberal','conservador','lei','constituicao','eleicao','partido','presidente','congresso','senado','voto','cidadao','direito','dever'],
  educacao:['educacao','escola','ensino','professor','aluno','aprendizado','curriculo','pedagogia','didatica','estudo','prova','avaliacao','conhecimento','adulto','autodidata'],
  tecnologia:['tecnologia','inteligencia artificial','ia','computador','programacao','internet','algoritmo','dados','robo','automacao','software','app','inovacao','digital','futuro','codigo','machine learning'],
  direito:['direito','lei','liberdade','constituicao','justica','tribunal','juiz','advogado','crime','pena','propriedade','contrato','cidadao','processo','norma','regulacao','censura','expressao'],
  midia:['midia','noticia','jornal','imprensa','fake news','informacao','comunicacao','rede social','televisao','radio','internet','jornalista','opiniao','propaganda','publicidade','manipulacao','algoritmo','engajamento'],
  financas:['financas','dinheiro','investimento','poupanca','acao','bolsa','bitcoin','crypto','banco','juros','renda','orcamento','lucro','patrimonio','economia','aposentadoria','empreendedor','empresa'],
  psicologia:['psicologia','mente','comportamento','emocao','ansiedade','depressao','autoestima','motivacao','personalidade','habito','cerebro','cognicao','memoria','aprendizado','trauma','resiliencia','inteligencia emocional'],
  ciencias:['ciencia','pesquisa','experimento','hipotese','teoria','clima','meio ambiente','sustentabilidade','energia','natureza','evolucao','biologia','fisica','quimica','planeta','ecologia','poluicao'],
  empreender:['empreendedorismo','negocio','startup','empresa','produto','cliente','mercado','venda','marketing','lucro','inovacao','risco','investidor','plano de negocios','modelo','receita','escala','mvp'],
  cultura:['cultura','arte','musica','literatura','cinema','teatro','sociedade','tradicao','identidade','diversidade','religiao','costume','valor','patrimonio','folclore','expressao cultural'],
  saude:['saude','exercicio','alimentacao','nutricao','sono','bem-estar','doenca','prevencao','vacina','higiene','mental','fisica','esporte','corpo','medicina','habito saudavel','dieta'],
  logica:['logica','argumento','falacia','premissa','conclusao','deducao','inducao','raciocinio','debate','retorica','silogismo','paradoxo','evidencia','prova','pensamento critico','vies','sofisma']
};

// Short reactions and questions are always allowed
var SHORT_REACTIONS=['concordo','verdade','boa','exato','isso','sim','nao','talvez','legal','top','show','haha','kk','rsrs','obrigado','obrigada','valeu','faz sentido','pensei nisso','boa pergunta','interessante','discordo'];

function _isRelevant(text,roomId){
  var norm=_normalize(text);
  // Short messages (< 4 words) or reactions: always allowed
  if(norm.split(' ').length<4)return true;
  if(SHORT_REACTIONS.some(function(r){return norm.includes(r)}))return true;
  // Questions always allowed
  if(text.includes('?'))return true;
  // Check keywords
  var keywords=ROOM_KEYWORDS[roomId];
  if(!keywords)return true;
  return keywords.some(function(kw){return norm.includes(_normalize(kw))});
}

// ============================================================
// CAMADA 3 — Rate limit
// ============================================================
var _lastMsgTime=0;
var _hourlyMsgs=[];

function _checkRateLimit(){
  var now=Date.now();
  // 5 second cooldown
  if(now-_lastMsgTime<5000)return{limited:true,reason:'Aguarde um momento antes de enviar outra mensagem.'};
  // 30 per hour per room
  var oneHourAgo=now-3600000;
  _hourlyMsgs=_hourlyMsgs.filter(function(t){return t>oneHourAgo});
  if(_hourlyMsgs.length>=30)return{limited:true,reason:'Limite de 30 mensagens por hora atingido. Descanse e volte depois!'};
  return{limited:false};
}

// ============================================================
// STRIKES
// ============================================================
var STRIKES_KEY='escola_debate_strikes';

function _getStrikes(){
  try{return JSON.parse(localStorage.getItem(STRIKES_KEY))||{strikes:0,history:[],suspended_until:null,banned:false}}
  catch(e){return{strikes:0,history:[],suspended_until:null,banned:false}}
}
function _saveStrikes(data){try{localStorage.setItem(STRIKES_KEY,JSON.stringify(data))}catch(e){}}

function _addStrike(roomId,reason,msgPreview){
  var data=_getStrikes();
  data.strikes++;
  data.history.push({date:new Date().toISOString(),room:roomId,reason:reason,msg:msgPreview.substring(0,50)});
  // Progressive suspension
  if(data.strikes===3){data.suspended_until=new Date(Date.now()+24*3600000).toISOString();_showModToast('Voce foi suspenso do debate por 24 horas.','danger')}
  else if(data.strikes===4){data.suspended_until=new Date(Date.now()+72*3600000).toISOString();_showModToast('Suspensao de 72 horas.','danger')}
  else if(data.strikes===5){data.suspended_until=new Date(Date.now()+7*24*3600000).toISOString();_showModToast('Suspensao de 7 dias.','danger')}
  else if(data.strikes>=6){data.banned=true;_showModToast('Acesso ao debate foi revogado por violacoes repetidas.','danger')}
  else if(data.strikes===1){_showModToast('Aviso 1/3 — Mantenha o respeito e foque no tema.','warning')}
  else if(data.strikes===2){_showModToast('Aviso 2/3 — Proxima infracao resulta em suspensao.','warning')}
  _saveStrikes(data);
  // Save to sent log for parent dashboard
  _logSentMessage(roomId,'[BLOQUEADA] '+msgPreview.substring(0,50));
}

function _isSuspended(){
  var data=_getStrikes();
  if(data.banned)return{suspended:true,msg:'Acesso ao debate foi revogado. Fale com seus pais/responsavel.',permanent:true};
  if(data.suspended_until){
    var until=new Date(data.suspended_until);
    if(until>new Date()){
      var diff=until-Date.now();
      var h=Math.floor(diff/3600000);var m=Math.floor((diff%3600000)/60000);
      return{suspended:true,msg:'Suspenso ate '+until.toLocaleDateString('pt-BR')+'. Retorno em: '+h+'h '+m+'min',permanent:false};
    }
    // Suspension expired
    data.suspended_until=null;_saveStrikes(data);
  }
  return{suspended:false};
}

// ============================================================
// SENT MESSAGE LOG (for parent dashboard)
// ============================================================
var SENT_LOG_KEY='escola_debate_sent';
function _logSentMessage(roomId,text){
  try{
    var log=JSON.parse(localStorage.getItem(SENT_LOG_KEY)||'[]');
    log.push({room:roomId,text:text.substring(0,100),date:new Date().toISOString()});
    if(log.length>50)log=log.slice(-50);
    localStorage.setItem(SENT_LOG_KEY,JSON.stringify(log));
  }catch(e){}
}

// ============================================================
// CONSENT (LGPD)
// ============================================================
var CONSENT_KEY='escola_debate_consent';

function hasDebateConsent(){
  return localStorage.getItem(CONSENT_KEY)==='1';
}

function showDebateConsent(onAccept){
  if(hasDebateConsent()){onAccept();return}
  var overlay=document.createElement('div');
  overlay.className='debate-consent-overlay';
  overlay.id='debateConsentModal';
  overlay.innerHTML='<div class="debate-consent-modal">'
    +'<h3 style="font-size:1.1rem;margin-bottom:.75rem">📋 Regras do Debate</h3>'
    +'<div style="font-size:.82rem;color:var(--text-secondary);line-height:1.7;margin-bottom:1.25rem">'
    +'<p>As salas de debate sao moderadas automaticamente para sua seguranca.</p>'
    +'<ul style="margin:.75rem 0 .75rem 1.25rem">'
    +'<li>Fale apenas sobre o tema da sala</li>'
    +'<li>Nao compartilhe informacoes pessoais (nome, telefone, endereco, redes sociais)</li>'
    +'<li>Respeite todos os participantes</li>'
    +'<li>Mensagens sao filtradas automaticamente</li>'
    +'<li>Infracoes resultam em suspensao temporaria ou permanente</li>'
    +'<li>Seus pais/responsaveis podem ver suas mensagens no painel familiar</li>'
    +'</ul>'
    +'<p>Ao continuar, voce concorda com estas regras.</p>'
    +'</div>'
    +'<button class="btn btn-sage" style="width:100%;margin-bottom:.5rem" onclick="acceptDebateConsent()">Entendi e Concordo</button>'
    +'<button class="btn btn-ghost" style="width:100%" onclick="declineDebateConsent()">Voltar</button>'
    +'</div>';
  document.body.appendChild(overlay);
  window._debateConsentCallback=onAccept;
}

function acceptDebateConsent(){
  localStorage.setItem(CONSENT_KEY,'1');
  var m=document.getElementById('debateConsentModal');if(m)m.remove();
  if(window._debateConsentCallback)window._debateConsentCallback();
}
function declineDebateConsent(){
  var m=document.getElementById('debateConsentModal');if(m)m.remove();
  window.goDash();
}

// ============================================================
// MAIN MODERATION FUNCTION
// ============================================================
function moderateMessage(text,roomId){
  // Check suspension first
  var susp=_isSuspended();
  if(susp.suspended)return{allowed:false,reason:susp.msg,type:'suspended'};

  // LGPD: personal data (NOT a strike, just protection)
  if(_hasPersonalData(text))return{allowed:false,reason:'Por sua seguranca, nao compartilhe dados pessoais no debate.',type:'personal_data'};

  // Banned words (strike)
  var banned=_hasBannedWord(text);
  if(banned){
    _addStrike(roomId,'palavra proibida',text);
    return{allowed:false,reason:'Mensagem bloqueada por conteudo inadequado.',type:'banned_word'};
  }

  // Relevance check (strike on repeated off-topic)
  if(!_isRelevant(text,roomId)){
    var room=window.DEBATE_ROOMS&&window.DEBATE_ROOMS.find(function(r){return r.id===roomId});
    var roomName=room?room.name:roomId;
    // First off-topic per session: warning only. Second+: strike.
    if(!window._offTopicWarned){
      window._offTopicWarned=true;
      return{allowed:false,reason:'Mensagem fora do tema. Esta sala e sobre '+roomName+'. Tente reformular.',type:'off_topic_warn'};
    }
    _addStrike(roomId,'fora do tema',text);
    return{allowed:false,reason:'Mensagem fora do tema. Strike registrado.',type:'off_topic'};
  }

  // Rate limit
  var rl=_checkRateLimit();
  if(rl.limited)return{allowed:false,reason:rl.reason,type:'rate_limit'};

  // Passed all filters
  _lastMsgTime=Date.now();
  _hourlyMsgs.push(Date.now());
  _logSentMessage(roomId,text);
  return{allowed:true,reason:null,type:'ok'};
}

// ============================================================
// TOAST
// ============================================================
function _showModToast(msg,type){
  var existing=document.querySelector('.mod-toast');
  if(existing)existing.remove();
  var t=document.createElement('div');
  t.className='mod-toast '+(type||'info');
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){t.remove()},4000);
}

// ============================================================
// PARENT CONTROLS
// ============================================================
function getDebateStrikes(){return _getStrikes()}
function resetDebateStrikes(){_saveStrikes({strikes:0,history:[],suspended_until:null,banned:false});_showModToast('Strikes resetados.','info')}
function getDebateSentLog(){try{return JSON.parse(localStorage.getItem(SENT_LOG_KEY)||'[]')}catch(e){return[]}}

var DEBATE_DISABLED_KEY='escola_debate_disabled';
function isDebateDisabled(){return localStorage.getItem(DEBATE_DISABLED_KEY)==='1'}
function setDebateDisabled(v){localStorage.setItem(DEBATE_DISABLED_KEY,v?'1':'0')}

// ============================================================
// RULES BANNER (session dismissible)
// ============================================================
function getRulesBannerHtml(){
  if(sessionStorage.getItem('debate_rules_dismissed'))return'';
  return'<div class="debate-rules-banner">'
    +'<span>📋 Fale sobre o tema · Respeite todos · Nao compartilhe dados pessoais · Infracoes = suspensao</span>'
    +'<button onclick="this.parentElement.remove();sessionStorage.setItem(\'debate_rules_dismissed\',\'1\')" aria-label="Fechar" style="background:none;border:none;color:inherit;font-size:1rem;cursor:pointer;padding:0 4px">✕</button>'
    +'</div>';
}

// ============================================================
// EXPORTS
// ============================================================
window.moderateMessage=moderateMessage;
window.hasDebateConsent=hasDebateConsent;
window.showDebateConsent=showDebateConsent;
window.acceptDebateConsent=acceptDebateConsent;
window.declineDebateConsent=declineDebateConsent;
window.getDebateStrikes=getDebateStrikes;
window.resetDebateStrikes=resetDebateStrikes;
window.getDebateSentLog=getDebateSentLog;
window.isDebateDisabled=isDebateDisabled;
window.setDebateDisabled=setDebateDisabled;
window.getRulesBannerHtml=getRulesBannerHtml;
window._isSuspended=_isSuspended;
window._showModToast=_showModToast;
window._addStrike=_addStrike;

// ============================================================
// AI MODERATION — Edge Function with Claude Haiku
// ============================================================
async function aiModerateMessage(text,roomId){
  // Skip AI in OFFLINE_MODE (local filter is enough)
  if(window.OFFLINE_MODE)return{allowed:true,reason:'',severity:'ok'};
  // Skip if no Supabase
  if(typeof window.sbClient==='undefined'||!window.sbClient)return{allowed:true,reason:'',severity:'ok'};

  var controller=new AbortController();
  var timeout=setTimeout(function(){controller.abort()},5000);

  try{
    var room=window.DEBATE_ROOMS&&window.DEBATE_ROOMS.find(function(r){return r.id===roomId});
    var roomName=room?room.name:roomId;
    var userName=window.S&&window.S.name?window.S.name:'Aluno';
    var SUPABASE_URL='https://hwjplecfqsckfiwxiedo.supabase.co';
    var SUPABASE_KEY='sb_publishable_-_ZYfPPllImPNCKOA1ZMXQ_zYYM-P6q';

    var headers={'Content-Type':'application/json','apikey':SUPABASE_KEY};
    try{
      var sess=await window.sbClient.auth.getSession();
      if(sess&&sess.data&&sess.data.session)headers['Authorization']='Bearer '+sess.data.session.access_token;
    }catch(e){}

    var res=await fetch(SUPABASE_URL+'/functions/v1/moderate-debate',{
      method:'POST',
      headers:headers,
      body:JSON.stringify({message:text,room_id:roomId,room_name:roomName,user_name:userName}),
      signal:controller.signal
    });
    clearTimeout(timeout);
    if(!res.ok){console.warn('[AI Mod] HTTP',res.status);return{allowed:true,reason:'',severity:'ok',fallback:true}}
    return await res.json();
  }catch(err){
    clearTimeout(timeout);
    if(err.name==='AbortError')console.warn('[AI Mod] timeout');
    else console.warn('[AI Mod]',err.message);
    return{allowed:true,reason:'',severity:'ok',fallback:true};
  }
}
window.aiModerateMessage=aiModerateMessage;

// TODO: Supabase table: moderation_log (id, user_id, room_id, action, reason, message_preview, created_at)
