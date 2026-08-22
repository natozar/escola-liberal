#!/usr/bin/env node
// scripts/publish-blog.js
// Move approved drafts to blog/, update blog.html, blog-marketing.js (ARTICLES_MAP), sitemap.xml, sw.js
// Usage: node scripts/publish-blog.js --slugs=slug1,slug2,slug3

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const DRAFTS_DIR = path.join(BLOG_DIR, 'drafts');
const KEYWORDS_FILE = path.join(BLOG_DIR, 'keywords.json');

const slugsArg = process.argv.find(a => a.startsWith('--slugs='));
if (!slugsArg) { console.error('Usage: node scripts/publish-blog.js --slugs=slug1,slug2'); process.exit(1); }
const slugs = slugsArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);

console.log('Escola Liberal — Blog Publisher');
console.log(`Publishing ${slugs.length} articles...\n`);

// 1. Load keywords
const data = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));

// 2. Move drafts → blog/ and update status
const published = [];
for (const slug of slugs) {
  const src = path.join(DRAFTS_DIR, `${slug}.html`);
  const dest = path.join(BLOG_DIR, `${slug}.html`);
  if (!fs.existsSync(src)) { console.log(`  ! ${slug}.html not found in drafts/`); continue; }
  fs.copyFileSync(src, dest);
  fs.unlinkSync(src);
  const kw = data.keywords.find(k => k.slug === slug);
  if (kw) { kw.status = 'published'; kw.publishedAt = new Date().toISOString(); }
  published.push(kw || { slug, title: slug });
  console.log(`  + ${slug}`);
}

if (!published.length) { console.log('Nothing to publish.'); process.exit(0); }

// 3. Save keywords
fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(data, null, 2));

// 4. Regenerate blog.html
const pubKws = data.keywords.filter(k => k.status === 'published').sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
// Original articles (in blog/ but not in keywords.json)
const kwSlugs = new Set(data.keywords.map(k => k.slug));
const originals = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && !kwSlugs.has(f.replace('.html', '')) && f !== 'drafts');

const months = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtDate(iso) { if (!iso) return ''; const [y,m,d] = iso.split('T')[0].split('-'); return `${parseInt(d)} ${months[parseInt(m)]} ${y}`; }

let cards = '';
pubKws.forEach(k => {
  cards += `    <a href="blog/${k.slug}.html" class="post-card">
      <span class="post-tag">${k.tag}</span>
      <h2 class="post-title">${k.title}</h2>
      <p class="post-excerpt">${(k.description150||'').substring(0,120)}</p>
      <div class="post-meta"><span>${fmtDate(k.publishedAt)}</span><span>${k.targetWordCount ? Math.ceil(k.targetWordCount/200) : 8} min de leitura</span></div>
    </a>\n`;
});

// Read current blog.html and replace grid content
let blogHtml = fs.readFileSync(path.join(ROOT, 'blog.html'), 'utf8');
const gridStart = blogHtml.indexOf('<div class="grid">');
const gridEnd = blogHtml.indexOf('</div>', blogHtml.indexOf('</a>', blogHtml.lastIndexOf('post-card')) + 4) + 6;
if (gridStart > 0 && gridEnd > gridStart) {
  // Preserva TODO card existente que nao esta sendo regenerado a partir do keywords.json.
  // Antes isso era uma lista fixa de 5 slugs legados, entao qualquer post publicado fora do
  // fluxo do keywords.json era silenciosamente apagado do blog.html na publicacao seguinte
  // (foi exatamente o que aconteceu com como-escolher-candidato).
  const regenerados = new Set(pubKws.map(k => k.slug));
  const origCardsMatch = (blogHtml.substring(gridStart, gridEnd)
    .match(/<a href="blog\/[a-z0-9-]+\.html" class="post-card">[\s\S]*?<\/a>/g) || [])
    .filter(c => {
      const m = c.match(/href="blog\/([a-z0-9-]+)\.html"/);
      return m && !regenerados.has(m[1]);
    });
  const origCards = origCardsMatch.join('\n    ');
  blogHtml = blogHtml.substring(0, gridStart) + `<div class="grid">\n${cards}    ${origCards}\n  </div>` + blogHtml.substring(gridEnd);
  fs.writeFileSync(path.join(ROOT, 'blog.html'), blogHtml);
  console.log(`\n  blog.html updated (${pubKws.length} new + ${origCardsMatch.length} original cards)`);
}

// 5. Update sitemap.xml
let sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const k of published) {
  const loc = `https://escolaliberal.com.br/blog/${k.slug}.html`;
  if (!sitemap.includes(loc)) {
    const entry = `  <url><loc>${loc}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    sitemap = sitemap.replace('  <!-- Offline fallback', entry + '  <!-- Offline fallback');
  }
}
// Update blog.html lastmod
sitemap = sitemap.replace(/<loc>https:\/\/escolaliberal\.com\.br\/blog\.html<\/loc>\s*<lastmod>[^<]+<\/lastmod>/, `<loc>https://escolaliberal.com.br/blog.html</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('  sitemap.xml updated');

// 5b. Registrar os posts novos no ARTICLES_MAP (blog-marketing.js)
// Sem entrada aqui o post nao renderiza NEM o bloco "Continue aprendendo" NEM o card de
// disciplina: initRelatedArticles() e initDisciplineCard() fazem early-return sem ela.
// Esta etapa faltava no publicador, e foi por isso que 44 dos 66 posts ficaram sem
// nenhum link interno ate 2026-08-21.
{
  const BM = path.join(ROOT, 'blog-marketing.js');
  let bm = fs.readFileSync(BM, 'utf8');
  const eolBm = bm.includes('\r\n') ? '\r\n' : '\n';
  const MAP_START = 'const ARTICLES_MAP = {';
  const i0 = bm.indexOf(MAP_START);
  const i1 = bm.indexOf(eolBm + '  };', i0);
  if (i0 < 0 || i1 < 0) {
    console.error('  ! ARTICLES_MAP nao encontrado em blog-marketing.js — registre os posts a mao');
  } else {
    const entradas = new Map();
    for (const l of bm.slice(i0 + MAP_START.length, i1).split(eolBm)) {
      const m = l.match(/^\s*'([a-z0-9-]+)':/);
      if (m) entradas.set(m[1], l.trim().replace(/,$/, ''));
    }
    const q = v => v.includes("'") ? JSON.stringify(v) : "'" + v + "'";
    // titulo do card fica melhor cortado no gancho, antes dos dois-pontos
    const curto = t => { const j = t.indexOf(': '); return (j > 8 && j < 60) ? t.slice(0, j) : t; };
    let novos = 0;
    for (const k of published) {
      if (entradas.has(k.slug)) continue;
      const title = curto(k.title || k.slug);
      const desc = (k.description150 || '').substring(0, 120) || title;
      entradas.set(k.slug, "'" + k.slug + "': { title: " + q(title) + ", tag: " + q(k.tag || 'Educação') + ", desc: " + q(desc) + " }");
      novos++;
    }
    const corpo = [...entradas.keys()].sort().map(k => '    ' + entradas.get(k) + ',').join(eolBm);
    fs.writeFileSync(BM, bm.slice(0, i0 + MAP_START.length) + eolBm + corpo + bm.slice(i1));
    console.log('  blog-marketing.js: ' + novos + ' entrada(s) nova(s) no ARTICLES_MAP (total ' + entradas.size + ')');
  }
}

// 6. Increment SW version
let sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const vMatch = sw.match(/const SW_VERSION = 'v(\d+)'/);
if (vMatch) {
  const newV = parseInt(vMatch[1]) + 1;
  sw = sw.replace(/const SW_VERSION = 'v\d+'/g, `const SW_VERSION = 'v${newV}'`);
  sw = sw.replace(/escola-liberal-v\d+/g, `escola-liberal-v${newV}`);
  sw = sw.replace(/escola-static-v\d+/g, `escola-static-v${newV}`);
  fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);
  console.log(`  sw.js updated to v${newV}`);
}

// 7. Update drafts manifest
const remaining = data.keywords.filter(k => k.status === 'drafted');
if (fs.existsSync(path.join(DRAFTS_DIR, 'manifest.json'))) {
  fs.writeFileSync(path.join(DRAFTS_DIR, 'manifest.json'), JSON.stringify({
    generated: new Date().toISOString(), count: remaining.length,
    articles: remaining.map(k => ({ slug: k.slug, title: k.title, reviewScore: k.reviewScore }))
  }, null, 2));
}

// 8. Verify sitemap consistency (no 404 URLs, no orphan articles)
try {
  require('child_process').execSync('node scripts/verify-sitemap.mjs', { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('\n⚠ Verificação do sitemap falhou — rode `node scripts/verify-sitemap.mjs` e corrija antes de deployar.');
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Published: ${published.length} | Remaining drafts: ${remaining.length} | Total published: ${data.keywords.filter(k=>k.status==='published').length}`);
console.log(`\nNext: npm run build && git add blog/ blog.html blog-marketing.js sitemap.xml sw.js && git commit -m "blog: ${published.length} new articles" && git push`);
