// ============================================================
// CHAT TUTOR — extracted from app.js lines 682-876
// ============================================================
let chatOpen=false;
const chatKB=[
  // Módulo 1 — Dinheiro
  {k:['escambo','troca','troca direta','barter'],r:'O <strong>escambo</strong> é a troca direta de bens sem dinheiro. O maior problema é a "dupla coincidência de desejos": você precisa encontrar alguém que queira exatamente o que você tem e tenha o que você precisa. Por isso o dinheiro surgiu naturalmente no mercado.'},
  {k:['moeda','ouro','prata','dinheiro surgiu','surgimento'],r:'Ouro e prata se tornaram dinheiro porque possuem as 5 propriedades: <strong>durabilidade, divisibilidade, portabilidade, escassez e aceitação</strong>. Ninguém decretou isso — foi uma ordem espontânea do mercado livre.'},
  {k:['valor subjetivo','teoria do valor','valor de um bem'],r:'A <strong>teoria subjetiva do valor</strong> de Carl Menger diz que o valor não está no objeto, mas na mente de quem avalia. Um copo d\'água vale mais no deserto do que em casa. O preço reflete a utilidade percebida pelo consumidor.'},
  {k:['inflação','imprimir dinheiro','impressão','preço sobe'],r:'<strong>Inflação</strong> ocorre quando há mais dinheiro circulando sem aumento correspondente de bens. Quando o governo "imprime" dinheiro, cada unidade perde poder de compra. É como diluir suco com água — cada copo tem menos sabor.'},
  {k:['banco central','reserva fracionária','banco','depósito'],r:'Bancos operam com <strong>reserva fracionária</strong>: emprestam parte dos depósitos. Se todos sacarem ao mesmo tempo (corrida bancária), o banco não tem o dinheiro. O Banco Central controla a política monetária: taxa de juros e quantidade de dinheiro na economia.'},
  {k:['poupança','poupar','guardar dinheiro','investir vs poupar'],r:'<strong>Poupar</strong> é adiar o consumo presente para ter mais no futuro. É a base de todo investimento e progresso econômico. Sem poupança prévia, não há capital para empreender. Como diz Bastiat: poupança é a fonte da prosperidade.'},
  // Módulo 2 — Oferta e Demanda
  {k:['oferta','demanda','preço','mercado'],r:'A <strong>lei da oferta e demanda</strong> é o coração da economia: quando a demanda sobe e a oferta se mantém, o preço sobe. Quando a oferta aumenta e a demanda não, o preço cai. Preços são sinais que coordenam milhões de decisões individuais.'},
  {k:['monopólio','concorrência','competição'],r:'<strong>Monopólios</strong> prejudicam o consumidor porque sem concorrência não há incentivo para melhorar qualidade ou baixar preços. A concorrência livre é o mecanismo mais eficiente para beneficiar o consumidor.'},
  {k:['imposto','taxa','tributo','carga tributária'],r:'Impostos são o preço que pagamos por serviços públicos, mas em excesso, distorcem o mercado. Quanto maior a <strong>carga tributária</strong>, menor o incentivo para produzir e empreender. A Curva de Laffer mostra que acima de certo ponto, aumentar impostos diminui a arrecadação.'},
  {k:['comércio internacional','importação','exportação','livre comércio'],r:'O <strong>livre comércio</strong> beneficia todas as partes envolvidas. David Ricardo demonstrou com a lei das vantagens comparativas: cada país deve produzir aquilo em que é mais eficiente e trocar o resto. Protecionismo encarece produtos e prejudica o consumidor.'},
  // Módulo 3 — Empreendedorismo
  {k:['empreendedorismo','empreender','empresa','negócio','startup'],r:'<strong>Empreender</strong> é identificar uma necessidade e criar uma solução que gere valor. O empreendedor assume riscos, inova e move a economia. Para a escola austríaca, o empreendedor é o agente central do progresso econômico.'},
  {k:['lucro','prejuízo','lucro e prejuízo'],r:'<strong>Lucro</strong> é a recompensa por satisfazer necessidades do consumidor melhor que os concorrentes. Prejuízo é o sinal de que recursos estão sendo mal alocados. O sistema de lucros e prejuízos é o GPS da economia — direciona recursos para onde são mais necessários.'},
  {k:['inovação','destruição criativa','schumpeter'],r:'<strong>Destruição criativa</strong> (Schumpeter): novas empresas e tecnologias substituem as antigas. O streaming substituiu as locadoras, o smartphone substituiu câmeras, GPS e MP3 players. É doloroso no curto prazo, mas gera progresso no longo prazo.'},
  // Módulo 4 — Finanças Pessoais
  {k:['orçamento','gastos','receita','controle financeiro'],r:'O <strong>orçamento pessoal</strong> é o mapa do seu dinheiro. Regra básica: receitas > despesas, sempre. Categorize seus gastos em fixos (aluguel, luz) e variáveis (lazer, alimentação). Comece cortando gastos variáveis desnecessários.'},
  {k:['juros compostos','compound interest','juros sobre juros'],r:'<strong>Juros compostos</strong> são a 8ª maravilha do mundo (frase atribuída a Einstein). É juros sobre juros — R$1.000 a 10% ao ano vira R$2.594 em 10 anos. Quanto antes começar, maior o efeito. Tempo é o ingrediente secreto.'},
  {k:['dívida','endividamento','cartão de crédito','empréstimo'],r:'<strong>Dívida</strong> é ferramenta, não vilã — depende do uso. Dívida para consumo (cartão de crédito) destrói patrimônio. Dívida para investimento produtivo (comprar máquina que gera receita) pode ser inteligente. Regra: nunca gaste mais do que ganha.'},
  {k:['investimento','renda fixa','ação','bolsa','tesouro'],r:'Investir é colocar dinheiro para trabalhar por você. <strong>Renda fixa</strong> (Tesouro, CDB) = menor risco, retorno previsível. <strong>Renda variável</strong> (ações, FIIs) = maior risco, maior potencial de retorno. Diversifique sempre.'},
  // Módulo 5 — História Econômica
  {k:['revolução industrial','industrialização','fábrica'],r:'A <strong>Revolução Industrial</strong> (séc. XVIII) multiplicou a produtividade humana. Pela primeira vez, as massas tiveram acesso a bens antes reservados à elite. Foi a maior redução de pobreza da história — impulsionada por propriedade privada e liberdade econômica.'},
  {k:['crise 1929','grande depressão','crash','wall street'],r:'A <strong>Crise de 1929</strong> não foi falha do mercado livre. A escola austríaca (Mises, Hayek) previu o crash: crédito artificialmente barato criou uma bolha que estourou. A intervenção governamental do New Deal prolongou a depressão ao invés de resolvê-la.'},
  {k:['socialismo','comunismo','planificação','planejamento central'],r:'O <strong>socialismo</strong> falha porque sem preços livres, não há como calcular eficientemente como alocar recursos. Este é o "problema do cálculo econômico" de Mises. A URSS, Cuba e Venezuela são exemplos reais do fracasso do planejamento central.'},
  {k:['capitalismo','livre mercado','liberalismo econômico'],r:'O <strong>capitalismo de livre mercado</strong> é o sistema que mais reduziu pobreza na história. Propriedade privada + liberdade de troca + estado limitado = prosperidade. Não é perfeito, mas todos os sistemas alternativos produziram resultados piores.'},
  // Módulo 6 — Pensamento Crítico
  {k:['falácia','argumento','lógica','pensamento crítico'],r:'<strong>Pensamento crítico</strong> é a habilidade de analisar argumentos sem se deixar levar por emoções. Falácias comuns: apelo à autoridade, espantalho, falso dilema, ad hominem. Sempre pergunte: "Quais são as evidências?" e "Quem se beneficia?"'},
  {k:['bastiat','o que se vê','janela quebrada'],r:'A <strong>falácia da janela quebrada</strong> (Bastiat): destruição não gera riqueza. O dinheiro gasto consertando a janela deixa de ser gasto em algo novo. O bom economista analisa não só "o que se vê", mas também "o que não se vê" — os custos de oportunidade.'},
  {k:['estado','governo','intervenção','regulação'],r:'Para a escola austríaca, o <strong>papel do Estado</strong> deve ser mínimo: proteger propriedade privada, garantir contratos e segurança. Cada regulação adicional cria distorções, custos ocultos e incentivos perversos. Menos estado = mais liberdade e prosperidade.'},
  {k:['mises','ludwig von mises','ação humana','praxeologia'],r:'<strong>Ludwig von Mises</strong> é um dos maiores economistas da história. Sua obra "A Ação Humana" fundamenta a economia na lógica da ação individual. Ele demonstrou que o socialismo é impossível e que a liberdade econômica é a base da civilização.'},
  {k:['hayek','friedrich hayek','conhecimento disperso','caminho da servidão'],r:'<strong>Friedrich Hayek</strong> mostrou que nenhum planejador central pode ter todo o conhecimento necessário para coordenar a economia. O preço livre faz isso naturalmente. Sua obra "O Caminho da Servidão" é um alerta contra o totalitarismo.'},
  // Perguntas gerais
  {k:['escola austríaca','austríaca','austríacos'],r:'A <strong>Escola Austríaca de Economia</strong> defende mercado livre, propriedade privada, padrão-ouro e mínima intervenção estatal. Principais pensadores: Carl Menger, Ludwig von Mises, Friedrich Hayek, Murray Rothbard. É a base teórica deste curso.'},
  {k:['como funciona','sobre o curso','módulos','aulas','how it works','about'],r:'O curso tem <strong>66 módulos com 10 aulas cada</strong> (660 aulas total) em 21 disciplinas: Economia (6 módulos), Matemática, Filosofia, Inteligência Emocional, Psicologia, Português, Ciências, História, American History (EN), Finanças, Inglês, Geografia, IA, Mídia, Direito, Saúde, Artes, Lógica, Programação, Oratória e Educação Cívica. Cada aula tem conteúdo + quiz. Complete para ganhar XP e subir de nível! | The course has <strong>66 modules with 10 lessons each</strong> (660 lessons total) across 21 subjects, including American History in English.'},
  {k:['xp','nível','pontos','gamificação'],r:'Você ganha <strong>XP</strong> ao completar aulas (25-30 XP) e acertar quizzes (+15 XP). A cada nível, precisa de mais XP (nível × 100). Mantenha uma sequência diária para desbloquear conquistas especiais!'},
];

function toggleChat(){
  chatOpen=!chatOpen;
  const fab=document.getElementById('chatFab');
  document.getElementById('chatPanel').classList.toggle('open',chatOpen);
  fab.classList.toggle('open',chatOpen);
  fab.setAttribute('aria-expanded',chatOpen);
  fab.innerHTML=chatOpen?'✕':'💬<span class="chat-badge" id="chatBadge" aria-label="1 mensagem não lida">1</span>';
  if(chatOpen&&document.getElementById('chatBody').children.length===0)initChat();
  if(chatOpen)document.getElementById('chatIn').focus();
}

function initChat(){
  if(!sessionStorage.getItem('tutor_disclaimer_seen')){
    const disc=document.createElement('div');
    disc.className='tutor-disclaimer';
    disc.innerHTML=`
      <div class="tutor-disclaimer-icon">🤖</div>
      <p><strong>Assistente Educacional IA</strong></p>
      <p>Este assistente é uma ferramenta de apoio ao aprendizado. Suas respostas têm caráter educacional e podem conter imprecisões. Não substitui professores, orientadores ou profissionais qualificados.</p>
      <p style="font-size:.75rem;opacity:.7">As interações com este assistente não são armazenadas de forma identificada após o encerramento da sessão.</p>
      <button onclick="this.parentElement.remove();sessionStorage.setItem('tutor_disclaimer_seen','1');window.addBotMsg('Olá! 👋 Sou o <strong>Tutor IA</strong> da escola liberal. Pergunte qualquer coisa sobre as aulas — uso inteligência artificial para responder! 🤖');window.showSuggestions()">Entendi — Começar</button>
    `;
    document.getElementById('chatBody').appendChild(disc);
    return;
  }
  addBotMsg('Olá! 👋 Sou o <strong>Tutor IA</strong> da escola liberal. Pergunte qualquer coisa sobre as aulas — uso inteligência artificial para responder! 🤖');
  showSuggestions();
}

function addBotMsg(html){
  const d=document.createElement('div');d.className='chat-msg bot';d.innerHTML=html;
  document.getElementById('chatBody').appendChild(d);scrollChat()
}
function addUserMsg(txt){
  const d=document.createElement('div');d.className='chat-msg user';d.textContent=txt;
  document.getElementById('chatBody').appendChild(d);scrollChat()
}
function scrollChat(){const b=document.getElementById('chatBody');b.scrollTop=b.scrollHeight}

function showSuggestions(){
  const context=getContextSugs();
  document.getElementById('chatSugs').innerHTML=context.map(s=>`<button class="chat-sug" onclick="window.askSug('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('')
}

function getContextSugs(){
  if(window.S.cMod!==null&&window.S.cMod!==undefined){
    const modSugs=[
      ['O que é escambo?','Como surgiu a moeda?','O que é inflação?'],
      ['O que é oferta e demanda?','O que são monopólios?','Como funciona o comércio internacional?'],
      ['Como empreender?','O que é lucro?','O que é destruição criativa?'],
      ['Como fazer orçamento?','O que são juros compostos?','Dívida é ruim?'],
      ['O que foi a Revolução Industrial?','O que causou a crise de 1929?','Socialismo funciona?'],
      ['O que são falácias?','Quem foi Bastiat?','Qual o papel do Estado?'],
      ['O que é valor posicional?','Como funciona multiplicação visual?','O que são frações equivalentes?'],
      ['O que é filosofia?','Quem foi Sócrates?','O que é a Alegoria da Caverna?'],
      ['O que são emoções?','Como lidar com ansiedade?','O que é empatia?'],
      ['O que é neuroplasticidade?','Mindset fixo vs crescimento?','O que são metas SMART?'],
      ['O que são classes de palavras?','Como fazer uma redação nota 1000?','O que são figuras de linguagem?'],
      ['O que é o método científico?','Como funcionam os átomos?','O que é uma cadeia alimentar?'],
      ['Como o Brasil foi descoberto?','O que foi o Plano Real?','Quem foi Visconde de Mauá?'],
      ['What was the American Revolution?','Who wrote the Constitution?','What caused the Great Depression?']
    ];
    return modSugs[window.S.cMod]||modSugs[0];
  }
  return['O que é inflação?','Como empreender?','Escola Austríaca','Juros compostos'];
}

function askSug(q){
  document.getElementById('chatIn').value=q;sendChat()
}

async function sendChat(){
  const inp=document.getElementById('chatIn'),txt=inp.value.trim();
  if(!txt)return;
  addUserMsg(txt);inp.value='';
  document.getElementById('chatSugs').innerHTML='';
  // Typing indicator
  const typing=document.createElement('div');typing.className='chat-msg bot typing';typing.id='typing';typing.textContent='Pensando...';
  document.getElementById('chatBody').appendChild(typing);scrollChat();

  // Try AI tutor first, fallback to local KB if offline or no API
  let answer;
  try{
    answer=await askAITutor(txt);
  }catch(e){
    console.warn('[Chat] AI tutor failed, using local KB:',e.message);
    answer=findAnswer(txt);
  }

  const el=document.getElementById('typing');if(el)el.remove();
  addBotMsg(answer);
  showSuggestions();
}

async function askAITutor(message){
  // OFFLINE_MODE: skip API call, go straight to local KB
  if(window.OFFLINE_MODE) throw new Error('offline');
  // Build context from current lesson
  const moduleTitle=window.S.cMod!==null&&window.M[window.S.cMod]?window.M[window.S.cMod].title:null;
  const lessonTitle=window.S.cLes!==null&&window.S.cMod!==null&&window.M[window.S.cMod]&&window.M[window.S.cMod].lessons[window.S.cLes]?window.M[window.S.cMod].lessons[window.S.cLes].title:null;
  const lessonContent=window.S.cLes!==null&&window.S.cMod!==null&&window.M[window.S.cMod]&&window.M[window.S.cMod].lessons[window.S.cLes]&&window.M[window.S.cMod].lessons[window.S.cLes].content?window.M[window.S.cMod].lessons[window.S.cLes].content.replace(/<[^>]*>/g,' ').substring(0,1500):null;

  const body={
    message,
    moduleTitle,
    lessonTitle,
    lessonContext:lessonContent,
    ageGroup:window.S.ageGroup||'teen',
    lang:typeof CURRENT_LANG!=='undefined'?CURRENT_LANG:'pt'
  };

  // Get auth token if available
  const headers={'Content-Type':'application/json'};
  if(typeof sbClient!=='undefined'&&sbClient){
    try{
      const{data}=await sbClient.auth.getSession();
      if(data.session)headers['Authorization']='Bearer '+data.session.access_token;
    }catch(e){}
  }

  const SUPABASE_URL=typeof window.SUPABASE_URL!=='undefined'?window.SUPABASE_URL:'https://hwjplecfqsckfiwxiedo.supabase.co';
  const r=await fetch(SUPABASE_URL+'/functions/v1/ai-tutor',{method:'POST',headers,body:JSON.stringify(body)});

  if(!r.ok){
    const err=await r.json().catch(()=>({}));
    if(err.error==='rate_limit')return err.message;
    throw new Error(err.error||'API error '+r.status);
  }

  const data=await r.json();
  let reply=data.reply||'Desculpe, não consegui responder.';
  if(data.remaining!==undefined&&data.remaining<=3){
    reply+=`<div style="font-size:.7rem;color:var(--text-muted);margin-top:.5rem">💬 ${data.remaining} mensagem${data.remaining!==1?'s':''} restante${data.remaining!==1?'s':''} hoje</div>`;
  }
  return reply;
}

function findAnswer(q){
  const words=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/);
  let best=null,bestScore=0;
  for(const entry of chatKB){
    let score=0;
    for(const kw of entry.k){
      const kwNorm=kw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(words.some(w=>kwNorm.includes(w)||w.includes(kwNorm)))score+=2;
      if(q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(kwNorm))score+=3;
    }
    if(score>bestScore){bestScore=score;best=entry}
  }
  if(best&&bestScore>=2)return best.r;
  // Fallback: search lesson content for keywords
  const contextHint=(window.S.cMod!==null&&window.M[window.S.cMod])?` Você está no módulo <strong>"${window.M[window.S.cMod].title}"</strong> — sugiro explorar as aulas para encontrar a resposta!`:'';
  return 'Boa pergunta! Ainda não tenho uma resposta específica para isso no meu banco de conhecimento.'+contextHint+' Tente reformular ou pergunte sobre: inflação, oferta e demanda, empreendedorismo, juros compostos, escola austríaca, ou qualquer tema das aulas. 📚';
}

// Attach to window for HTML onclick compatibility
window.toggleChat=toggleChat;
window.initChat=initChat;
window.addBotMsg=addBotMsg;
window.addUserMsg=addUserMsg;
window.scrollChat=scrollChat;
window.showSuggestions=showSuggestions;
window.getContextSugs=getContextSugs;
window.askSug=askSug;
window.sendChat=sendChat;
window.askAITutor=askAITutor;
window.findAnswer=findAnswer;

export {chatKB,toggleChat,initChat,addBotMsg,addUserMsg,scrollChat,showSuggestions,getContextSugs,askSug,sendChat,askAITutor,findAnswer};
