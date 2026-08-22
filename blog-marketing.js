/**
 * Escola Liberal — Blog Marketing Engine
 * Injeta dinamicamente: barra de progresso, TOC, banners animados,
 * CTAs inline, artigos relacionados, stats, ticker, newsletter, float CTA
 *
 * Carregado em cada artigo do blog. Zero dependencias.
 * Respeita tema dark/light via CSS vars.
 */
(function () {
  'use strict';

  // ── Config ──
  const APP_URL = '../app.html';
  const BLOG_URL = '../blog.html';
  const BASE = '../blog/';

  // Mapa de disciplinas → ícones
  const DISC_ICONS = {
    'Educação Financeira': '💰', 'Economia': '📊', 'Empreendedorismo': '🚀',
    'Marketing Digital': '📱', 'Filosofia': '🏛️', 'Oratória': '🎤',
    'Direito Básico': '⚖️', 'Lógica': '🧩', 'Ética': '🤝',
    'Psicologia': '🧠', 'Matemática Financeira': '🔢', 'História': '📜',
    'Sociologia': '👥', 'Comunicação': '💬', 'Produtividade': '⚡',
    'Tecnologia': '💻', 'Saúde': '❤️', 'Educação': '📚'
  };

  // Artigos publicados (slug → { title, tag, description, discipline })
  // Populado via keywords.json no build; fallback inline
  const ARTICLES_MAP = {
    'como-calcular-juros-emprestimo': { title: 'Como Calcular Juros de Empréstimo', tag: 'Finanças', desc: 'Fórmulas e exemplos práticos para calcular juros simples e compostos.' },
    'como-comecar-negocio-pouco-dinheiro': { title: 'Como Começar um Negócio com Pouco Dinheiro', tag: 'Empreendedorismo', desc: 'Estratégias para empreender com baixo investimento inicial.' },
    'como-criar-habitos': { title: 'Como Criar Hábitos que Duram', tag: 'Desenvolvimento', desc: 'A ciência dos hábitos: gatilho-rotina-recompensa, 21 vs 66 dias, habit stacking e como não desistir.' },
    'como-desenvolver-inteligencia-emocional': { title: 'Como Desenvolver Inteligência Emocional', tag: 'Desenvolvimento', desc: 'Práticas para melhorar sua inteligência emocional no dia a dia.' },
    'como-economizar-dinheiro': { title: 'Como Economizar Dinheiro', tag: 'Finanças', desc: '15 estratégias práticas para economizar no dia a dia.' },
    'como-escolher-candidato': { title: 'Como Escolher um Candidato', tag: 'Cidadania', desc: 'Método apartidário: histórico verificável, teste das promessas, ficha limpa e uma matriz de decisão simples.' },
    'como-fazer-orcamento-pessoal': { title: 'Como Fazer Orçamento Pessoal', tag: 'Finanças', desc: 'Método simples e eficiente para controlar suas finanças.' },
    'como-fazer-plano-negocios-simples': { title: 'Como Fazer um Plano de Negócios Simples', tag: 'Empreendedorismo', desc: 'Guia prático para estruturar seu plano de negócios.' },
    'como-fazer-resumo-estudar': { title: 'Como Fazer Resumo para Estudar', tag: 'Educação', desc: 'Técnicas de resumo que realmente ajudam na memorização.' },
    'como-gerenciar-tempo': { title: 'Gestão do Tempo', tag: 'Desenvolvimento', desc: 'Eisenhower, time blocking, batching e weekly review.' },
    'como-sair-das-dividas': { title: 'Como Sair das Dívidas', tag: 'Finanças', desc: 'Guia passo a passo para eliminar dívidas e recuperar sua saúde financeira.' },
    'como-ser-mais-produtivo': { title: 'Como Ser Mais Produtivo no Dia a Dia', tag: 'Desenvolvimento', desc: '10 estratégias de produtividade que funcionam na vida real: Pomodoro, batching, deep work e mais.' },
    'como-ter-mais-disciplina': { title: 'Como Ter Mais Disciplina', tag: 'Desenvolvimento', desc: 'Métodos práticos para desenvolver disciplina e consistência.' },
    'como-ter-mais-foco': { title: 'Como Ter Foco e Concentração no Trabalho', tag: 'Desenvolvimento', desc: 'Deep work, eliminação de distrações e técnicas comprovadas.' },
    'como-validar-ideia-negocio': { title: 'Como Validar uma Ideia de Negócio', tag: 'Empreendedorismo', desc: 'Passos para testar sua ideia antes de investir.' },
    'como-vencer-procrastinacao': { title: 'Como Vencer a Procrastinação', tag: 'Desenvolvimento', desc: 'Estratégias baseadas em ciência para parar de procrastinar.' },
    'como-vender-whatsapp': { title: 'Como Vender pelo WhatsApp', tag: 'Marketing', desc: 'Técnicas de vendas para WhatsApp Business.' },
    'como-voltar-estudar-depois-30': { title: 'Como Voltar a Estudar Depois dos 30', tag: 'Educação', desc: 'Guia para adultos que querem retomar os estudos.' },
    'diferenca-poupanca-cdb-tesouro': { title: 'Poupança vs CDB vs Tesouro Direto', tag: 'Finanças', desc: 'Comparação detalhada entre poupança, CDB e Tesouro Direto com simulações de rendimento real em 2026.' },
    'direitos-consumidor-ninguem-conta': { title: 'Direitos do Consumidor que Ninguém Conta', tag: 'Direito', desc: 'Conheça seus direitos e saiba como se proteger.' },
    'economia-austriaca-criancas': { title: 'Economia Austríaca para Crianças', tag: 'Economia', desc: 'Conceitos de economia explicados de forma simples.' },
    'filosofia-p4c-pensamento-critico': { title: 'Filosofia P4C e Pensamento Crítico', tag: 'Filosofia', desc: 'Como a filosofia para crianças desenvolve o pensamento crítico.' },
    'gamificacao-educacao': { title: 'Gamificação na Educação', tag: 'Educação', desc: 'Como jogos e pontos melhoram o aprendizado.' },
    'homeschool-guia-completo': { title: 'Homeschool: Guia Completo', tag: 'Educação', desc: 'Tudo sobre educação domiciliar no Brasil.' },
    'matematica-singapura-metodo': { title: 'Método Singapura de Matemática', tag: 'Educação', desc: 'Entenda o método que fez de Singapura líder em matemática.' },
    'metodos-estudo-mais-eficientes': { title: 'Métodos de Estudo Mais Eficientes', tag: 'Educação', desc: 'Técnicas comprovadas para estudar melhor em menos tempo.' },
    'o-que-e-juros-compostos': { title: 'O que São Juros Compostos', tag: 'Finanças', desc: 'Entenda a fórmula que transforma pequenos valores em grandes montantes.' },
    'reserva-emergencia-quanto-guardar': { title: 'Reserva de Emergência', tag: 'Finanças', desc: 'Descubra o valor ideal da reserva de emergência e os melhores investimentos para proteger seu dinheiro.' },
    'tesouro-direto-para-iniciantes': { title: 'Tesouro Direto para Iniciantes', tag: 'Finanças', desc: 'Guia completo para começar a investir no Tesouro Direto.' },
    'voto-algoritmo-e-bolha-politica': { title: 'Algoritmo e Bolha', tag: 'Cidadania', desc: 'Por que seu feed concorda com você — e o dos outros não' },
    'voto-ciclo-eleitoral-e-obras-publicas': { title: 'Os Incentivos de Quem Promete', tag: 'Cidadania', desc: 'Por que a obra fica pronta em ano de eleição — e a conta chega depois' },
    'voto-como-avaliar-o-passado-de-um-candidato': { title: 'Discurso vs Histórico', tag: 'Cidadania', desc: 'Por que o passado prevê comportamento melhor que qualquer promessa' },
    'voto-como-cobrar-promessa-de-campanha': { title: 'A Promessa da Eleição Passada', tag: 'Cidadania', desc: 'O plano de governo registrado no TSE é documento — e dá pra cobrar' },
    'voto-como-funciona-a-urna-eletronica': { title: 'A Urna Por Dentro', tag: 'Cidadania', desc: 'Como seu voto vira número — e como qualquer cidadão pode conferir' },
    'voto-como-funciona-o-marketing-politico': { title: 'O Marketing Político por Dentro', tag: 'Cidadania', desc: 'Candidato também é produto — e existe uma indústria inteira pra vendê-lo' },
    'voto-como-funciona-o-orcamento-publico': { title: 'O Orçamento Engessado', tag: 'Cidadania', desc: 'Quanto do dinheiro público já tem dono antes de o eleito tomar posse' },
    'voto-como-funciona-o-sistema-proporcional': { title: 'O Sistema Proporcional Sem Mistério', tag: 'Cidadania', desc: 'Por que votar num candidato pode eleger outro — a conta completa' },
    'voto-como-identificar-fake-news-eleitoral': { title: 'A Fake News de Véspera', tag: 'Cidadania', desc: 'Anatomia do boato que aparece no sábado antes da eleição' },
    'voto-como-identificar-promessa-impossivel': { title: 'O Teste da Promessa Impossível', tag: 'Cidadania', desc: 'Quatro perguntas de 30 segundos que filtram 80% do palanque' },
    'voto-como-ler-pesquisa-eleitoral': { title: 'Como Ler Pesquisa Eleitoral', tag: 'Cidadania', desc: 'Margem de erro, quem pagou e por que pesquisa não é previsão' },
    'voto-como-pesquisar-candidato-no-tse': { title: 'Onde Estão os Dados Públicos', tag: 'Cidadania', desc: 'TSE, portais de transparência e sites legislativos — tudo grátis' },
    'voto-como-pesquisar-sobre-um-candidato': { title: 'Montando a Ficha do Candidato', tag: 'Cidadania', desc: 'Roteiro prático: 30 minutos de pesquisa com checklist' },
    'voto-como-ver-votacao-de-deputado': { title: 'O Histórico de Votações', tag: 'Cidadania', desc: 'Como o parlamentar votou quando o placar estava valendo' },
    'voto-como-verificar-noticia-eleitoral': { title: 'Verificação em 5 Minutos', tag: 'Cidadania', desc: 'O kit básico pra checar antes de acreditar — ou compartilhar' },
    'voto-competencia-de-cada-cargo-eleitoral': { title: 'A Promessa Fora do Cargo', tag: 'Cidadania', desc: 'O detector de promessa impossível — competência antes de simpatia' },
    'voto-competencia-do-cargo-e-promessa': { title: 'Competência vs Promessa', tag: 'Cidadania', desc: 'Prometer o que o cargo não pode entregar é impossível por definição' },
    'voto-custo-de-oportunidade-no-governo': { title: 'Custo de Oportunidade', tag: 'Cidadania', desc: 'Cada real no projeto A é um real que não vai para o B' },
    'voto-de-onde-vem-o-dinheiro-publico': { title: 'De Onde Vem o Dinheiro Público', tag: 'Cidadania', desc: 'Governo não gera receita do nada — alguém sempre pagou antes' },
    'voto-diferenca-deputado-estadual-e-federal': { title: 'Deputado Estadual × Deputado Federal', tag: 'Cidadania', desc: 'A diferença que quase ninguém sabe explicar' },
    'voto-emocao-e-manipulacao-eleitoral': { title: 'Emoção Não É Prova', tag: 'Cidadania', desc: 'Por que jingle, história de superação e bebê no colo funcionam tão bem' },
    'voto-falacias-em-discurso-politico': { title: 'Falácias de Palanque', tag: 'Cidadania', desc: 'Os truques de argumentação que aparecem em discurso de todo espectro' },
    'voto-o-custo-invisivel-das-promessas': { title: 'Não Existe Almoço Grátis', tag: 'Cidadania', desc: 'O que se vê e o que não se vê em cada benefício prometido' },
    'voto-o-que-faz-governador-e-presidente': { title: 'Governador e Presidente', tag: 'Cidadania', desc: 'Quem cuida do quê — a divisão federal que evita cobrança errada' },
    'voto-o-que-faz-um-prefeito': { title: 'O Prefeito', tag: 'Cidadania', desc: 'O que a prefeitura realmente faz — e o que não é com ela' },
    'voto-o-que-faz-um-senador': { title: 'O Senador', tag: 'Cidadania', desc: 'Oito anos de mandato e poderes que só o Senado tem' },
    'voto-o-que-faz-um-vereador': { title: 'O Vereador', tag: 'Cidadania', desc: 'O cargo mais próximo de você — e o mais mal compreendido' },
    'voto-o-que-sao-emendas-parlamentares': { title: 'Emendas Parlamentares', tag: 'Cidadania', desc: 'O que são, por que existem e como seguir o dinheiro' },
    'voto-patrimonio-de-candidato-declarado': { title: 'O Patrimônio Declarado', tag: 'Cidadania', desc: 'A evolução dos bens entre eleições — onde olhar e o que levanta bandeira' },
    'voto-perguntas-para-avaliar-promessa-politica': { title: 'As Perguntas que Desmontam Promessa Vazia', tag: 'Cidadania', desc: 'O checklist completo para debate, sabatina ou pesquisa solo' },
    'voto-peso-do-voto-nas-eleicoes': { title: 'Seu Voto na Ponta do Lápis', tag: 'Cidadania', desc: 'A matemática que ninguém te mostrou antes de você votar' },
    'voto-por-que-candidatos-prometem-demais': { title: 'A Inflação de Promessas', tag: 'Cidadania', desc: 'Por que quem promete pouco parece fraco — e o exagero vence a triagem' },
    'voto-presenca-e-produtividade-de-parlamentar': { title: 'Presença e Produtividade', tag: 'Cidadania', desc: 'Comparecimento e projetos — e a armadilha de contar quantidade' },
    'voto-quanto-custa-uma-promessa-de-campanha': { title: 'Cabe no Orçamento? Exercício Guiado', tag: 'Cidadania', desc: 'Estimando o custo de uma promessa com números redondos' },
    'voto-quem-financia-campanha-eleitoral': { title: 'Quem Paga a Campanha', tag: 'Cidadania', desc: 'Fundo eleitoral, doadores e por que financiamento revela incentivos' },
    'voto-titulo-de-eleitor-e-justificativa': { title: 'Título, Obrigação e Justificativa', tag: 'Cidadania', desc: 'As regras reais do voto no Brasil — sem lenda urbana' },
    'voto-troca-de-partido-politico': { title: 'O Troca-Troca Partidário', tag: 'Cidadania', desc: 'Janela partidária, histórico de filiações e o que muitas trocas sugerem' },
  };

  // ── Helpers ──
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const slug = () => {
    const p = location.pathname.split('/').pop();
    return p ? p.replace('.html', '') : '';
  };
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  // ── 1. Reading Progress Bar ──
  function initProgressBar() {
    const bar = el('div', 'el-progress-bar');
    document.body.appendChild(bar);
    const article = $('article');
    if (!article) return;
    const update = () => {
      const rect = article.getBoundingClientRect();
      const total = article.scrollHeight;
      const scrolled = Math.max(0, -rect.top);
      const pct = Math.min(100, (scrolled / (total - window.innerHeight)) * 100);
      bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ── 2. Table of Contents ──
  function initTOC() {
    const article = $('article');
    if (!article) return;
    const headings = $$('article h2');
    if (headings.length < 3) return;

    const toc = el('div', 'el-toc el-fade-in');
    let html = '<div class="el-toc-title">Neste artigo</div><ol>';
    headings.forEach((h, i) => {
      const id = 'sec-' + i;
      h.id = id;
      html += `<li><a href="#${id}">${h.textContent}</a></li>`;
    });
    html += '</ol>';
    toc.innerHTML = html;

    // Insert after meta div
    const meta = $('article .meta');
    if (meta) meta.after(toc);
    else article.prepend(toc);

    // Highlight active
    const links = $$('.el-toc a');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const active = $(`.el-toc a[href="#${e.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    headings.forEach(h => observer.observe(h));
  }

  // ── 3. Inline CTA (injected mid-article) ──
  function initInlineCTAs() {
    const headings = $$('article h2');
    if (headings.length < 4) return;

    // After 2nd h2
    const ctaMessages = [
      { icon: '🎓', title: 'Aprenda mais sobre esse tema', text: 'Aulas interativas e gratuitas na Escola Liberal', btn: 'Ver Aulas' },
      { icon: '🧠', title: 'Quer dominar esse assunto?', text: '1.940 aulas em 31 disciplinas, 100% grátis', btn: 'Começar Agora' },
      { icon: '📚', title: 'Conteúdo exclusivo te esperando', text: 'Quizzes, gamificação e certificados', btn: 'Acessar Grátis' }
    ];
    const msg = ctaMessages[Math.floor(Math.random() * ctaMessages.length)];
    const cta = el('div', 'el-inline-cta el-fade-in', `
      <span class="el-inline-cta-icon">${msg.icon}</span>
      <div class="el-inline-cta-text">
        <strong>${msg.title}</strong>
        <span>${msg.text}</span>
      </div>
      <a href="${APP_URL}" class="el-btn">${msg.btn}</a>
    `);
    headings[2].before(cta);

    // Stats banner after 4th h2 (if exists)
    if (headings.length >= 5) {
      const stats = el('div', 'el-stats-banner el-fade-in', `
        <div><span class="stat-num" data-count="26">0</span><span class="stat-label">Disciplinas</span></div>
        <div><span class="stat-num" data-count="800">0</span><span class="stat-label">Aulas</span></div>
        <div><span class="stat-num" data-count="100">0</span><span class="stat-label">% Gratuito</span></div>
        <div><span class="stat-num" data-count="0">∞</span><span class="stat-label">Offline</span></div>
      `);
      headings[4].before(stats);
    }
  }

  // ── 4. Animated Banner (replaces old .cta) ──
  function upgradeMainCTA() {
    const oldCta = $('.cta');
    if (!oldCta) return;

    const liveCount = Math.floor(Math.random() * 701) + 200; // 200-900
    const heroCta = el('div', 'el-hero-cta el-fade-in', `
      <div class="el-hero-cta-stripe"></div>
      <div class="el-logo-mark">EL</div>
      <span class="el-banner-badge"><span class="dot"></span> 100% Gratuito</span>
      <h3>A Educação que a Escola Deveria Ter Dado</h3>
      <p>1.940 aulas interativas em 31 disciplinas. Gamificação, quizzes, certificados. Funciona offline.</p>
      <div class="el-live-counter"><span class="el-live-dot"></span><span class="el-live-num">${liveCount}</span> pessoas estudando agora</div>
      <div class="el-btn-row">
        <a href="${APP_URL}" class="el-btn">Começar Gratuitamente →</a>
        <a href="${BLOG_URL}" class="el-btn el-btn-ghost">Explorar Artigos</a>
      </div>
    `);
    oldCta.replaceWith(heroCta);

    // Animate live counter variation
    const numEl = heroCta.querySelector('.el-live-num');
    if (numEl) {
      setInterval(() => {
        const current = parseInt(numEl.textContent);
        const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
        numEl.textContent = Math.max(150, current + delta);
      }, 4000);
    }
  }

  // ── 5. Discipline Card ──
  function initDisciplineCard() {
    const currentSlug = slug();
    const currentArticle = ARTICLES_MAP[currentSlug];
    if (!currentArticle) return;

    // Find discipline from article content
    const text = $('article')?.textContent || '';
    let discipline = null;
    for (const [name] of Object.entries(DISC_ICONS)) {
      if (text.includes(name)) { discipline = name; break; }
    }
    if (!discipline) return;

    const icon = DISC_ICONS[discipline] || '📖';
    const card = el('div', 'el-discipline-card el-fade-in', `
      <div class="el-discipline-icon">${icon}</div>
      <div class="el-discipline-info">
        <h4>Disciplina: ${discipline}</h4>
        <p>Aprofunde esse tema com aulas interativas, quizzes e exercícios práticos na Escola Liberal.</p>
        <a href="${APP_URL}" class="el-btn">Acessar Disciplina →</a>
      </div>
    `);

    // Insert before disclaimer
    const disclaimer = $('article p[style*="font-size:.8rem"]') || $('article p:last-of-type');
    if (disclaimer) disclaimer.before(card);
  }

  // ── 6. Related Articles ──
  function initRelatedArticles() {
    const currentSlug = slug();
    const current = ARTICLES_MAP[currentSlug];
    if (!current) return;

    // Find related by same tag, exclude current
    const sameTag = Object.entries(ARTICLES_MAP)
      .filter(([s, a]) => s !== currentSlug && a.tag === current.tag)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    // Find related by different tag (cross-topic discovery)
    const diffTag = Object.entries(ARTICLES_MAP)
      .filter(([s, a]) => s !== currentSlug && a.tag !== current.tag)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const related = [...sameTag, ...diffTag].slice(0, 4);
    if (related.length < 2) return;

    let html = '<h4 class="el-related-title">Continue aprendendo</h4><div class="el-related-grid">';
    related.forEach(([s, a]) => {
      html += `<a href="${s}.html" class="el-related-card">
        <span class="tag">${a.tag}</span>
        <h5>${a.title}</h5>
        <p>${a.desc}</p>
      </a>`;
    });
    html += '</div>';

    const section = el('div', 'el-related el-fade-in', html);
    const footer = $('.footer');
    if (footer) footer.before(section);
  }

  // ── 7. Ticker Strip ──
  function initTicker() {
    const items = [
      '31 Disciplinas', '1.940 Aulas Interativas', '100% Gratuito',
      'Funciona Offline', 'Gamificação Completa', 'Quizzes em Cada Aula',
      'Para Adultos 18+', 'Certificados Digitais', 'Sem Anúncios'
    ];
    // Duplicate for seamless scroll
    const all = [...items, ...items];
    let html = '<div class="el-ticker-inner">';
    all.forEach(t => {
      html += `<span class="el-ticker-item"><span class="sep"></span> ${t}</span>`;
    });
    html += '</div>';

    const ticker = el('div', 'el-ticker el-fade-in', html);
    const article = $('article');
    if (article) article.after(ticker);
  }

  // ── 8. Floating Side CTA ──
  function initFloatCTA() {
    if (window.innerWidth < 1100) return;

    const float = el('div', 'el-float-cta', `
      <span class="el-float-cta-badge">GRÁTIS</span>
      <button class="el-float-cta-close" aria-label="Fechar">✕</button>
      <h4>Escola Liberal</h4>
      <p>1.940 aulas gratuitas em finanças, filosofia, oratória e mais 28 disciplinas.</p>
      <a href="${APP_URL}" class="el-btn">Acessar Grátis →</a>
    `);
    document.body.appendChild(float);

    float.querySelector('.el-float-cta-close').addEventListener('click', () => {
      float.classList.remove('visible');
      sessionStorage.setItem('el_float_dismissed', '1');
    });

    if (sessionStorage.getItem('el_float_dismissed')) return;

    // Show after 40% scroll
    let shown = false;
    window.addEventListener('scroll', () => {
      if (shown) return;
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (pct > 0.4) { float.classList.add('visible'); shown = true; }
    }, { passive: true });
  }

  // ── 9. Counter Animation for Stats ──
  function initCounters() {
    const counters = $$('.stat-num[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count);
        if (target === 0) return; // ∞ stays
        let current = 0;
        const step = Math.max(1, Math.floor(target / 40));
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { current = target; clearInterval(timer); }
          el.textContent = current;
        }, 30);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  // ── 10. Scroll Fade-in Observer ──
  function initFadeIn() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    $$('.el-fade-in').forEach(e => observer.observe(e));
  }

  // ── 11. Social Proof Toast ──
  function initSocialProof() {
    const KEY = 'el_sp_count';
    let shown = parseInt(sessionStorage.getItem(KEY) || '0');
    if (shown >= 3) return;

    const names = ['Maria', 'João', 'Ana', 'Carlos', 'Pedro', 'Fernanda', 'Lucas', 'Juliana', 'Rafael', 'Camila', 'Bruno', 'Larissa', 'Diego', 'Patrícia', 'Thiago', 'Renata'];
    const cities = ['SP', 'RJ', 'BH', 'Curitiba', 'Salvador', 'Recife', 'Fortaleza', 'Manaus', 'Porto Alegre', 'Brasília', 'Goiânia', 'Belém'];
    const discs = ['Educação Financeira', 'Economia', 'Empreendedorismo', 'Filosofia', 'Oratória', 'Direito Básico', 'Marketing Digital', 'Lógica', 'Psicologia', 'História'];
    const actions = ['começou', 'completou uma aula de', 'ganhou badge em', 'está estudando'];
    const times = ['agora', 'há 1 min', 'há 2 min', 'há 3 min', 'há 5 min'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const toast = el('div', 'el-social-proof');
    document.body.appendChild(toast);

    function showToast() {
      if (shown >= 3) return;
      const name = pick(names);
      const city = pick(cities);
      const action = pick(actions);
      const disc = pick(discs);
      const time = pick(times);
      toast.innerHTML = `<span class="el-sp-dot"></span><span><strong>${name}</strong> de ${city} ${action} ${disc} ${time}</span>`;
      toast.classList.add('visible');
      shown++;
      sessionStorage.setItem(KEY, String(shown));
      setTimeout(() => { toast.classList.remove('visible'); }, 4000);
      if (shown < 3) setTimeout(showToast, 30000);
    }

    // First toast after 8 seconds
    setTimeout(showToast, 8000);
  }

  // ── 12. Button Ripple Effect ──
  function initButtonEffects() {
    document.addEventListener('mouseenter', function (e) {
      const btn = e.target.closest('.el-btn');
      if (!btn) return;
      const ripple = document.createElement('span');
      ripple.className = 'el-ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (rect.width / 2 - size / 2) + 'px';
      ripple.style.top = (rect.height / 2 - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    }, true);
  }

  // ── 13. Inline CTA icon wiggle on viewport entry ──
  function initInlineCTAWiggle() {
    const icons = $$('.el-inline-cta-icon');
    if (!icons.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('wiggle');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    icons.forEach(ic => observer.observe(ic));
  }

  // ── 14. Internal Link Enrichment ──
  function enrichInternalLinks() {
    // Find all links in article that point to other blog articles
    const links = $$('article a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('../')) return;
      const s = href.replace('.html', '');
      const meta = ARTICLES_MAP[s];
      if (!meta) return;
      // Add tooltip-like title
      link.title = meta.desc;
      link.setAttribute('data-tag', meta.tag);
    });
  }

  // ── 12. Animated Mid-Article Banner ──
  function initMidBanner() {
    const headings = $$('article h2');
    if (headings.length < 3) return;

    // Insert after the last h2 section (before conclusion)
    const targetIdx = Math.max(headings.length - 2, 2);
    const banner = el('div', 'el-banner el-fade-in', `
      <div class="el-banner-icon">🎓</div>
      <span class="el-banner-badge"><span class="dot"></span> Plataforma Gratuita</span>
      <h3>Transforme conhecimento em prática</h3>
      <p>Na Escola Liberal, cada aula tem quiz interativo, exemplos reais e certificado digital. Estude no seu ritmo, online ou offline.</p>
      <a href="${APP_URL}" class="el-btn">Conhecer a Escola Liberal →</a>
    `);
    headings[targetIdx].before(banner);
  }

  // ── Init ──
  function init() {
    initProgressBar();
    initTOC();
    initInlineCTAs();
    initMidBanner();
    initDisciplineCard();
    upgradeMainCTA();
    initRelatedArticles();
    initTicker();
    initFloatCTA();
    initSocialProof();
    initButtonEffects();
    enrichInternalLinks();
    // Fade-in must be last (observes all .el-fade-in elements)
    requestAnimationFrame(() => {
      initCounters();
      initFadeIn();
      initInlineCTAWiggle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
