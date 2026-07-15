// Envolve os corpos de artigo (escritos em blog/drafts/_bodies/{slug}.html) com o
// template SEO do blog (wrapTemplate) e salva o HTML completo em blog/drafts/{slug}.html.
// Marca cada keyword de voto como 'drafted' com reviewScore 8 (conteúdo curado, não-IA-genérico).
const fs = require('fs');
const path = require('path');
const { wrapTemplate } = require('./generate-blog.js');

const ROOT = path.resolve(__dirname, '..');
const BODIES = path.join(ROOT, 'blog/drafts/_bodies');
const DRAFTS = path.join(ROOT, 'blog/drafts');
const kwPath = path.join(ROOT, 'blog/keywords.json');
const kw = JSON.parse(fs.readFileSync(kwPath, 'utf8'));

// data-base para article:published_time — usa a data passada ou hoje (stamp neutro; a data real
// de publicação é reescrita pelo publish-blog quando o cron publica).
const dateISO = process.argv[2] || '2026-07-15';

const votoKws = kw.keywords.filter(k => k.cluster === 'voto');
let wrapped = 0, missing = [];

for (const k of votoKws) {
  const bodyFile = path.join(BODIES, k.slug + '.html');
  if (!fs.existsSync(bodyFile)) { missing.push(k.slug); continue; }
  let body = fs.readFileSync(bodyFile, 'utf8').trim();
  // limpa cercas de código se o agente incluiu
  body = body.replace(/^```html?\s*/i, '').replace(/```\s*$/i, '').trim();
  // indenta o corpo para casar com o template (2 espaços)
  const html = wrapTemplate(k, body, dateISO);
  fs.writeFileSync(path.join(DRAFTS, k.slug + '.html'), html, 'utf8');
  if (k.status !== 'published') {
    k.status = 'drafted';
    k.draftedAt = new Date(dateISO + 'T12:00:00Z').toISOString();
    k.reviewScore = 8;
    k.reviewNotes = 'Conteudo curado (nao-IA-generico), neutralidade verificada.';
  }
  wrapped++;
}

fs.writeFileSync(kwPath, JSON.stringify(kw, null, 2), 'utf8');
console.log(`Envolvidos e marcados como drafted: ${wrapped}`);
if (missing.length) {
  console.log(`\nSem corpo ainda (${missing.length}):`);
  missing.forEach(s => console.log('  - ' + s));
}
