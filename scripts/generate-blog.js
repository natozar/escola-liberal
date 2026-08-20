#!/usr/bin/env node
// scripts/generate-blog.js
// Escola Liberal — Blog SEO Generator with Gemini AI
// Usage: node scripts/generate-blog.js [--count=5] [--cluster=financas] [--dry-run]

const fs = require('fs');
const path = require('path');

// Load .env manually (no dotenv dependency)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BLOG_DIR = path.resolve(__dirname, '..', 'blog');
const DRAFTS_DIR = path.join(BLOG_DIR, 'drafts');
const KEYWORDS_FILE = path.join(BLOG_DIR, 'keywords.json');
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Parse args
const args = process.argv.slice(2);
const getArg = (name, def) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.split('=')[1] : def; };
const count = parseInt(getArg('count', '5'));
const cluster = getArg('cluster', null);
const dryRun = args.includes('--dry-run');

if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });

// ============================================================
// GEMINI API
// ============================================================
async function callGemini(model, prompt, maxTokens) {
  if (!GEMINI_API_KEY) return null;
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens || 8192, temperature: 0.7 }
      })
    });
    if (!res.ok) { console.error(`  ! Gemini ${model} ${res.status}`); return null; }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { console.error(`  ! Gemini error:`, e.message); return null; }
}

// ============================================================
// PROMPTS
// ============================================================
function writerPrompt(kw, allSlugs) {
  const links = (kw.relatedSlugs || []).filter(s => allSlugs.includes(s)).map(s => `<a href="${s}.html">${s.replace(/-/g, ' ')}</a>`).join(', ');
  const discCtx = kw.disciplineContext ? kw.disciplineContext.join(', ') : kw.discipline;
  return `Voce e redator senior da Escola Liberal, plataforma educacional brasileira gratuita para adultos 18+.
TAREFA: Escreva artigo educacional completo em HTML (apenas conteudo dentro de <article>, SEM <html>/<head>).

=== REGRAS DE VERACIDADE (INVIOLAVEIS) ===
1. NAO INVENTE DADOS. Se nao tem certeza de um numero ou estatistica, NAO inclua. Prefira explicacoes qualitativas.
2. NAO CITE ESTUDOS ESPECIFICOS a menos que sejam amplamente conhecidos e verificaveis.
3. NAO ATRIBUA FRASES a pessoas reais a menos que sejam citacoes classicas documentadas. Se citar, adicione: <span style="font-size:.65rem;opacity:.6">(citacao para fins educacionais — Art. 46, Lei 9.610/98)</span>
4. USE FONTES VERIFICAVEIS: IBGE, Banco Central, Receita Federal, INSS, Serasa, CAGED. Mencione a fonte.
5. VALORES EM REAIS: use valores realistas para Brasil 2026 (salario minimo ~R$1.500, aluguel ~R$1.500-3.000).
6. LEIS: cite apenas leis reais (CLT, CDC, Lei do Inquilinato). Se nao souber o artigo exato, diga "conforme a legislacao vigente".

=== REGRAS DE NEUTRALIDADE (INVIOLAVEIS — TOLERANCIA ZERO) ===
1. PROIBIDO CITAR NOMES DE POLITICOS. Nenhum. Zero. Nem presidentes, ex-presidentes, governadores, prefeitos, deputados, senadores, ministros. Nem para elogiar, nem para criticar. Se precisar de contexto, use "o governo federal da epoca" ou "a gestao vigente".
2. PROIBIDO CITAR PARTIDOS POLITICOS. Nenhum. PT, PSDB, MDB, PSD, PSOL, PL, PP — NENHUM pode aparecer.
3. PROIBIDO CITAR MINISTROS DO STF, STJ ou qualquer tribunal por nome. Use "conforme entendimento dos tribunais superiores".
4. ZERO ideologia. Nao usar: "esquerda", "direita", "conservador", "progressista", "neoliberal", "socialista", "comunista", "fascista".
5. ZERO opiniao sobre governo. IMPOSTOS: explicar como funciona, nunca se e "justo" ou "injusto". POLITICAS PUBLICAS: explicar o que sao, nunca se funcionam ou nao.
6. ECONOMIA: apresentar conceitos de forma factual. Se houver escolas diferentes, apresentar AMBAS com respeito.
7. Temas controversos: apresentar fatos dos dois lados e encerrar com "cabe a cada cidadao formar sua propria opiniao com base nos fatos".
8. NA DUVIDA, NAO INCLUA. Se um trecho pode ser interpretado como posicionamento politico, remova.

=== REGRAS DE VINCULACAO AS AULAS ===
1. O artigo e extensao da disciplina "${kw.discipline}" da Escola Liberal.
2. Na ultima secao, conectar: "Na Escola Liberal, a disciplina de ${kw.discipline} aprofunda esse tema com aulas interativas, quizzes e exercicios praticos. Sao 1.860 aulas gratuitas em 31 disciplinas."
3. DISCIPLINAS RELACIONADAS (mencionar naturalmente): ${discCtx}
4. O artigo deve ser util por si so — o leitor veio do Google, nao conhece a escola.

=== REGRAS DE CONTEUDO ===
1. Publico: adultos brasileiros 18+. Tom direto, respeitoso, pratico. NUNCA condescendente.
2. Extensao: ${kw.targetWordCount || 1800} palavras minimo. Conteudo REAL e profundo.
3. Estrutura: <h1>, 5-6 secoes <h2>, paragrafos <p>, listas quando util.
4. Keyword "${kw.keyword}" no <h1>, primeiro paragrafo, 2+ <h2>.
5. Exemplos brasileiros reais (R$, instituicoes BR).
6. NAO usar: emojis, cliches motivacionais, "neste artigo vamos explorar", frases genericas de IA.
7. NAO prometer: emprego, renda, resultados financeiros garantidos.
8. Ultimo paragrafo antes do fim: "Este artigo e de natureza educacional e nao substitui orientacao profissional especializada."
${links ? `9. Links internos: ${links}` : ''}
KEYWORD: ${kw.title} | ${kw.keyword} | ${kw.discipline}
FORMATO: Apenas HTML puro de <h1> ate ultimo </p>. Sem markdown, sem blocos de codigo.`;
}

function reviewerPrompt(html, kw) {
  return `Voce e editor-chefe da Escola Liberal, plataforma educacional seria para adultos brasileiros 18+. Contexto: ano eleitoral 2026, tolerancia ZERO para fake news ou vies politico.
TAREFA: Revise o artigo e de nota 0-10.
CRITERIOS (1 ponto cada):
1. VERACIDADE — Dados inventados, estatisticas sem fonte, citacoes fabricadas? (Se sim, nota maxima = 4)
2. NEUTRALIDADE — Menciona QUALQUER nome de politico, partido, ministro do STF/STJ? Menciona ideologia (esquerda/direita)? SE SIM → nota ZERO, artigo REPROVADO.
3. PROFUNDIDADE — Vai alem do obvio? Exemplos concretos?
4. CLAREZA — Linguagem acessivel? Estrutura logica?
5. SEO — Keyword "${kw.keyword}" no H1, primeiro paragrafo, subtitulos?
6. TOM — Direto e respeitoso? Sem cliche de IA?
7. EXEMPLOS BR — Referencias ao Brasil (R$, leis, instituicoes)?
8. VINCULACAO — Conecta o tema as aulas/disciplinas da Escola Liberal?
9. GRAMATICA — Portugues correto?
10. DISCLAIMER — Aviso "nao substitui orientacao profissional" quando aplicavel?
REGRAS: Nome de politico/partido/ministro STF → nota 0 (REPROVADO). Dado inventado → max 4. Vies ideologico → max 3. Promessa financeira → max 4.
FORMATO (JSON estrito): {"score":N,"summary":"1 frase","issues":["problema"],"suggestions":["sugestao"],"flaggedClaims":["dado suspeito"],"biasFlags":["trecho com vies"],"rewriteInstructions":"instrucoes se score<7"}
ARTIGO: ${html.substring(0, 12000)}`;
}

// ============================================================
// HTML TEMPLATE
// ============================================================
const CSS = `*{margin:0;padding:0;box-sizing:border-box}:root{--bg:#0f1729;--bg2:#141d32;--card:#1a2540;--text:#e8e6e1;--muted:#9ba3b5;--dim:#6b7488;--sage:#4a9e7e;--sage-light:#5fbf96;--sage-muted:rgba(74,158,126,.12);--border:rgba(255,255,255,.06);--r-md:12px;--r-lg:16px;--r-xl:24px}[data-theme="light"]{--bg:#f5f3ef;--bg2:#eae7e1;--card:#ffffff;--text:#1a1a2e;--muted:#4a4a5e;--dim:#7a7a8e;--sage:#3d8b6e;--sage-light:#2e7a5f;--sage-muted:rgba(61,139,110,.1);--border:rgba(0,0,0,.08)}body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.8}a{color:var(--sage-light);text-decoration:none}a:hover{text-decoration:underline}.container{max-width:720px;margin:0 auto;padding:2rem 1.25rem 4rem}.breadcrumb{font-size:.8rem;color:var(--dim);margin-bottom:2rem;display:flex;gap:.4rem;flex-wrap:wrap}.breadcrumb a{color:var(--sage-light)}article h1{font-family:'DM Serif Display',serif;font-size:2rem;line-height:1.3;margin-bottom:.75rem}article .meta{font-size:.8rem;color:var(--dim);margin-bottom:2rem;display:flex;gap:1.5rem}article h2{font-family:'DM Serif Display',serif;font-size:1.4rem;margin:2rem 0 .75rem;color:var(--sage-light)}article h3{font-size:1.1rem;font-weight:700;margin:1.5rem 0 .5rem}article p{color:var(--muted);margin-bottom:1rem;font-size:.95rem}article ul,article ol{color:var(--muted);margin:0 0 1rem 1.5rem;font-size:.95rem}article li{margin-bottom:.4rem}article blockquote{border-left:3px solid var(--sage);padding:.75rem 1.25rem;margin:1.5rem 0;background:var(--sage-muted);border-radius:0 var(--r-md) var(--r-md) 0;font-style:italic;color:var(--muted)}.highlight{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem;margin:1.5rem 0}.cta{text-align:center;background:var(--card);border:1px solid var(--border);border-radius:var(--r-xl);padding:2rem;margin:2.5rem 0}.cta h3{font-family:'DM Serif Display',serif;font-size:1.3rem;margin-bottom:.5rem;color:var(--text)}.cta p{color:var(--muted);font-size:.85rem;margin-bottom:1rem}.cta a{display:inline-block;background:var(--sage);color:#fff;padding:.75rem 2rem;border-radius:99px;font-weight:600;font-size:.9rem;text-decoration:none}.cta a:hover{background:var(--sage-light);text-decoration:none}.footer{margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border);text-align:center;font-size:.75rem;color:var(--dim)}.footer a{color:var(--sage-light)}.theme-btn{position:fixed;top:1rem;right:1rem;background:var(--card);border:1px solid var(--border);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;z-index:100}@media(max-width:600px){article h1{font-size:1.5rem}article h2{font-size:1.2rem}}`;

// ============================================================
// SAFETY VALIDATION
// ============================================================
function validateSafety(html) {
  const text = html.replace(/<[^>]+>/g, '').toLowerCase();
  const flags = [];
  // === NOMES DE POLITICOS (PROIBIDO TOTAL) ===
  const politicians = ['lula','bolsonaro','dilma','temer','fhc','fernando henrique','collor','itamar','sarney','lira','pacheco','alckmin','haddad','ciro','marina silva','boulos','marielle','moro','sergio moro','dallagnol','janot','eduardo cunha','renan calheiros','lula da silva','jair bolsonaro'];
  for (const name of politicians) { const re = new RegExp('\\b' + name.replace(/\s+/g, '\\s+') + '\\b', 'i'); if (re.test(text)) flags.push('Nome de politico: "' + name + '"'); }
  // === MINISTROS STF/STJ ===
  const ministers = ['barroso','mendonca','nunes marques','alexandre de moraes','gilmar mendes','lewandowski','fachin','rosa weber','carmem lucia','carmen lucia','toffoli','fux','luiz fux','flavio dino','cristiano zanin'];
  for (const name of ministers) { const re = new RegExp('\\b' + name.replace(/\s+/g, '\\s+') + '\\b', 'i'); if (re.test(text)) flags.push('Ministro STF/STJ: "' + name + '"'); }
  // === PARTIDOS POLITICOS ===
  const parties = [{re:/\bpt\b/,label:'PT'},{re:/\bpsd\b/,label:'PSD'},{re:/\bpsdb\b/,label:'PSDB'},{re:/\bmdb\b/,label:'MDB'},{re:/\bpsol\b/,label:'PSOL'},{re:/\buniao brasil\b/i,label:'Uniao Brasil'},{re:/\bpl\b(?=\s+(partido|deputad|senad|govern|candidat|chapa|coliga|filia))/,label:'PL (partido)'},{re:/\bpodemos\b(?=\s+(partido|chapa|coliga|deputad|senad|filia))/i,label:'Podemos (partido)'},{re:/\bpartido\s+(dos\s+trabalhadores|social|liberal|novo|verde|comunista|socialista)/i,label:'Nome de partido'}];
  for (const {re,label} of parties) { if (re.test(text)) flags.push('Partido politico: "' + label + '"'); }
  // === TERMOS IDEOLOGICOS ===
  const ideology = ['petista','bolsonarista','lulista','esquerdista','direitista','comunismo','fascismo','socialismo','neoliberal','neoliberalismo','extrema-esquerda','extrema-direita','extrema esquerda','extrema direita','impeachment','golpe de estado','golpe militar'];
  for (const t of ideology) { if (text.includes(t)) flags.push('Termo ideologico: "' + t + '"'); }
  // === PROMESSAS FINANCEIRAS ===
  const promises = ['fique rico','enriqueca','ganhe dinheiro facil','renda garantida','lucro garantido','sem risco','rentabilidade garantida','multiplique seu dinheiro','formula secreta','metodo infalivel'];
  for (const t of promises) { if (text.includes(t)) flags.push('Promessa financeira: "' + t + '"'); }
  // === DADOS NAO VERIFICAVEIS ===
  const fakePatterns = [/segundo (um )?estudo (recente )?(da|de) [a-z]/i, /\d{2,3}% (dos|das|de) /];
  for (const p of fakePatterns) { const m = text.match(p); if (m) flags.push('Dado nao verificavel: "' + m[0] + '"'); }
  return flags;
}

function getDisclaimer(cluster) {
  const d = {
    financas:'Este artigo e de natureza educacional e nao constitui recomendacao de investimento ou consultoria financeira. Consulte um profissional certificado antes de tomar decisoes financeiras.',
    economia:'Este artigo e de natureza educacional e apresenta conceitos economicos de forma didatica. Diferentes escolas de pensamento podem ter interpretacoes distintas.',
    empreendedorismo:'Este artigo e de natureza educacional e nao garante resultados financeiros. Todo empreendimento envolve riscos. Consulte um contador ou advogado.',
    marketing:'Este artigo e de natureza educacional. Resultados de marketing variam conforme contexto, mercado e execucao.',
    desenvolvimento:'Este artigo e de natureza educacional e nao substitui acompanhamento psicologico ou psiquiatrico profissional.',
    direito:'Este artigo e de natureza educacional e nao constitui aconselhamento juridico. A legislacao pode sofrer alteracoes. Consulte um advogado.',
    educacao:'Este artigo e de natureza educacional e apresenta metodos de estudo baseados em pesquisas amplamente divulgadas.',
    voto:'Este artigo e de natureza educacional e apartidaria. Nao constitui propaganda eleitoral, nao recomenda candidatos ou partidos e nao substitui a consulta as fontes oficiais (TSE, tribunais de contas e portais de transparencia).'
  };
  return d[cluster] || 'Este artigo e de natureza educacional e nao substitui orientacao profissional especializada.';
}

// ============================================================
// HTML TEMPLATE
// ============================================================
function wrapTemplate(kw, body, dateISO) {
  const words = body.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const readTime = Math.ceil(words / 200);
  const months = ['','janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const [y, m, d] = dateISO.split('-');
  const dateFmt = `${parseInt(d)} de ${months[parseInt(m)]} de ${y}`;
  const esc = s => s.replace(/"/g, '&quot;');
  const escJ = s => s.replace(/"/g, '\\"');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0f1729">
<meta name="description" content="${esc(kw.description150)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://escolaliberal.com.br/blog/${kw.slug}.html">
<meta property="og:type" content="article"><meta property="og:url" content="https://escolaliberal.com.br/blog/${kw.slug}.html"><meta property="og:title" content="${esc(kw.title)}"><meta property="og:description" content="${esc(kw.description150)}"><meta property="og:image" content="https://escolaliberal.com.br/assets/icons/icon-512.png"><meta property="og:locale" content="pt_BR"><meta property="article:published_time" content="${dateISO}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(kw.title)}"><meta name="twitter:description" content="${esc(kw.description150.substring(0,120))}"><meta name="twitter:image" content="https://escolaliberal.com.br/assets/icons/icon-512.png">
<link rel="icon" href="../assets/icons/favicon.ico" sizes="48x48"><link rel="icon" type="image/svg+xml" href="../assets/icons/favicon.svg">
<title>${kw.title} — Escola Liberal</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"${escJ(kw.title)}","description":"${escJ(kw.description150)}","datePublished":"${dateISO}","author":{"@type":"Organization","name":"Escola Liberal"},"publisher":{"@type":"Organization","name":"Escola Liberal","logo":{"@type":"ImageObject","url":"https://escolaliberal.com.br/assets/icons/icon-512.png"}},"mainEntityOfPage":"https://escolaliberal.com.br/blog/${kw.slug}.html"}<\/script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Inicio","item":"https://escolaliberal.com.br/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://escolaliberal.com.br/blog.html"},{"@type":"ListItem","position":3,"name":"${escJ(kw.title)}"}]}<\/script>
<style>${CSS}</style>
<link rel="stylesheet" href="../blog-marketing.css">
<script src="../cookie-consent.js"><\/script>
</head>
<body>
<button class="theme-btn" onclick="toggleTheme()" aria-label="Alternar tema">🌙</button>
<div class="container">
  <nav class="breadcrumb"><a href="../index.html">Inicio</a> / <a href="../blog.html">Blog</a> / <span>${kw.title.split(':')[0]}</span></nav>
  <article>
    <div class="meta"><time datetime="${dateISO}">${dateFmt}</time><span>${readTime} min de leitura</span></div>
${body}
    <p style="font-size:.8rem;color:var(--dim);font-style:italic;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border)">${getDisclaimer(kw.cluster)}</p>
  </article>
  <div class="cta"><h3>Comece hoje. E 100% gratuito.</h3><p>1.860 aulas interativas, 31 disciplinas, gamificacao completa. Para adultos. Funciona offline.</p><a href="../app.html">Comecar Gratuitamente →</a></div>
  <div class="footer"><p>Escola Liberal © 2026 · <a href="../termos.html">Termos</a> · <a href="../privacidade.html">Privacidade</a> · <a href="../contato.html">Contato</a></p></div>
</div>
<script>
function toggleTheme(){var t=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';document.documentElement.setAttribute('data-theme',t);localStorage.setItem('escola_theme',t);document.querySelector('.theme-btn').textContent=t==='light'?'☀️':'🌙'}
(function(){var t=localStorage.getItem('escola_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');document.querySelector('.theme-btn').textContent=(t==='light')?'☀️':'🌙'})();
<\/script>
<script src="../blog-marketing.js" defer><\/script>
</body>
</html>`;
}

function placeholder(kw) {
  return `<h1>${kw.title}</h1>
<p>[PLACEHOLDER — Gemini indisponivel. Editar manualmente.]</p>
<p>Keyword: ${kw.keyword} | Disciplina: ${kw.discipline}</p>
<h2>O que e</h2><p>[Escrever aqui]</p>
<h2>Por que importa</h2><p>[Escrever aqui]</p>
<h2>Como fazer na pratica</h2><p>[Escrever aqui]</p>
<h2>Erros comuns</h2><p>[Escrever aqui]</p>
<h2>Proximos passos</h2>
<p>Na Escola Liberal, a disciplina de ${kw.discipline} cobre esse tema com aulas interativas e certificados — 100% gratuito.</p>`;
}

// ============================================================
// PIPELINE
// ============================================================
async function processKw(kw, allSlugs) {
  const dateISO = new Date().toISOString().split('T')[0];
  console.log(`\n  ${kw.slug}`);

  console.log('  1/3 Gerando...');
  let html = await callGemini('gemini-2.5-flash-lite', writerPrompt(kw, allSlugs), 8192);
  if (!html) {
    console.log('  ! Fallback placeholder');
    html = placeholder(kw);
    kw.reviewScore = 0; kw.reviewNotes = 'Placeholder'; kw.status = 'drafted'; kw.draftedAt = new Date().toISOString();
    return { html: wrapTemplate(kw, html, dateISO), kw };
  }
  html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

  console.log('  2/3 Revisando...');
  let review = { score: 7, summary: 'Revisao indisponivel', issues: [] };
  const rRaw = await callGemini('gemini-2.5-flash', reviewerPrompt(html, kw), 2048);
  if (rRaw) { try { const m = rRaw.match(/\{[\s\S]*\}/); if (m) review = JSON.parse(m[0]); } catch (e) {} }
  console.log(`  -> Nota: ${review.score}/10`);

  if (review.score < 7 && review.rewriteInstructions) {
    console.log('  3/3 Reescrevendo...');
    const flaggedInfo = review.flaggedClaims ? '\nDADOS FLAGGED COMO POSSIVELMENTE FALSOS:\n' + review.flaggedClaims.join('\n') : '';
    const biasInfo = review.biasFlags ? '\nTRECHOS COM VIES DETECTADO:\n' + review.biasFlags.join('\n') : '';
    const rw = await callGemini('gemini-2.5-flash-lite',
      `ATENCAO: O editor encontrou problemas graves. Ao reescrever:\n- REMOVA TODOS os nomes de politicos, partidos, ministros de tribunais e servidores publicos\n- NAO mencione STF, STJ, TSE, Congresso em contexto de disputa politica\n- Se precisar de contexto governamental, use termos genericos: "o governo federal", "a gestao vigente", "os tribunais superiores"\n- REMOVA qualquer dado ou citacao nao verificavel\n- REMOVA qualquer frase com vies politico ou ideologico\n- SUBSTITUA numeros especificos por explicacoes qualitativas se nao tiver certeza da fonte\n- Mantenha tom educacional neutro\n${flaggedInfo}${biasInfo}\n\nCorrecoes: ${review.issues.join('; ')}. Instrucoes: ${review.rewriteInstructions}. Manter keyword "${kw.keyword}" no H1. Retorne apenas HTML.\n\nARTIGO:\n${html}`, 8192);
    if (rw) { html = rw.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim(); }
    const r2 = await callGemini('gemini-2.5-flash', reviewerPrompt(html, kw), 2048);
    if (r2) { try { const m = r2.match(/\{[\s\S]*\}/); if (m) review = JSON.parse(m[0]); } catch (e) {} }
    console.log(`  -> Pos-correcao: ${review.score}/10`);
  } else { console.log('  3/3 Aprovado'); }

  // Safety validation (local, no API)
  const safetyFlags = validateSafety(html);
  if (safetyFlags.length > 0) {
    console.log('  ! Red flags de seguranca:');
    safetyFlags.forEach(f => console.log('    -> ' + f));
  }

  kw.reviewScore = review.score;
  kw.reviewNotes = review.summary + (review.issues?.length ? ' | ' + review.issues.join('; ') : '');
  kw.safetyFlags = safetyFlags.length > 0 ? safetyFlags : null;
  kw.status = 'drafted'; kw.draftedAt = new Date().toISOString();
  return { html: wrapTemplate(kw, html, dateISO), kw };
}

async function main() {
  console.log('Escola Liberal — Blog SEO Generator');
  console.log(`  Gemini: ${GEMINI_API_KEY ? 'configurada' : 'SEM KEY (.env)'}  |  Modo: ${dryRun ? 'DRY RUN' : 'PRODUCAO'}`);

  if (!fs.existsSync(KEYWORDS_FILE)) { console.error('blog/keywords.json nao encontrado.'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));
  let pending = data.keywords.filter(k => k.status === 'pending');
  if (cluster) pending = pending.filter(k => k.cluster === cluster);
  const batch = pending.slice(0, count);
  if (!batch.length) { console.log('Nenhuma keyword pendente.'); process.exit(0); }

  const allSlugs = data.keywords.map(k => k.slug);
  console.log(`\nGerando ${batch.length} artigos...\n`);

  const results = [];
  for (const kw of batch) {
    results.push(await processKw(kw, allSlugs));
    if (batch.indexOf(kw) < batch.length - 1) await new Promise(r => setTimeout(r, 4000));
  }

  if (dryRun) { console.log('\nDRY RUN — nada salvo.'); return; }

  for (const { html, kw } of results) fs.writeFileSync(path.join(DRAFTS_DIR, `${kw.slug}.html`), html);
  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(data, null, 2));

  const drafts = data.keywords.filter(k => k.status === 'drafted');
  fs.writeFileSync(path.join(DRAFTS_DIR, 'manifest.json'), JSON.stringify({
    generated: new Date().toISOString(), count: drafts.length,
    articles: drafts.map(k => ({ slug: k.slug, title: k.title, cluster: k.cluster, tag: k.tag, reviewScore: k.reviewScore, reviewNotes: k.reviewNotes, safetyFlags: k.safetyFlags || null, draftedAt: k.draftedAt }))
  }, null, 2));

  console.log('\n' + '='.repeat(50));
  results.forEach(({ kw }) => console.log(`  ${kw.reviewScore >= 7 ? 'OK' : '!!'} ${kw.slug} — ${kw.reviewScore}/10`));
  console.log(`\nPendentes: ${data.keywords.filter(k=>k.status==='pending').length} | Rascunhos: ${drafts.length} | Publicados: ${data.keywords.filter(k=>k.status==='published').length}`);
  console.log('Proximo: abra admin-blog.html para revisar.');
}

if (require.main === module) {
  main().catch(e => { console.error('Erro:', e); process.exit(1); });
}

module.exports = { wrapTemplate, getDisclaimer };
