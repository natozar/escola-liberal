#!/usr/bin/env node
// scripts/publish-blog.js
// Move approved drafts to blog/, update blog.html, sitemap.xml, sw.js
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
  // Find all original cards (keep them)
  const origCardsMatch = blogHtml.substring(gridStart, gridEnd).match(/<a href="blog\/(?:homeschool|economia-austriaca|matematica-singapura|filosofia-p4c|gamificacao)[\s\S]*?<\/a>/g) || [];
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

console.log(`\n${'='.repeat(50)}`);
console.log(`Published: ${published.length} | Remaining drafts: ${remaining.length} | Total published: ${data.keywords.filter(k=>k.status==='published').length}`);
console.log(`\nNext: npm run build && git add blog/ blog.html sitemap.xml sw.js && git commit -m "blog: ${published.length} new articles" && git push`);
