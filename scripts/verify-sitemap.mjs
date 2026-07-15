// Verifica a consistência do sitemap.xml com os artigos reais do blog.
// Falha (exit 1) se: URL de artigo no sitemap sem arquivo (404), ou artigo em disco fora do sitemap.
// Uso: node scripts/verify-sitemap.mjs   (também roda no fim de publish-blog.js)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const realFiles = new Set(
  fs.readdirSync(path.join(ROOT, 'blog')).filter(f => f.endsWith('.html')).map(f => 'blog/' + f)
);
const sitemapUrls = [...sm.matchAll(/\/blog\/([a-z0-9-]+\.html)</g)].map(m => 'blog/' + m[1]);

const broken = sitemapUrls.filter(u => !realFiles.has(u));               // no sitemap, sem arquivo → 404
const orphans = [...realFiles].filter(f => !sitemapUrls.includes(f));    // em disco, fora do sitemap

if (broken.length || orphans.length) {
  if (broken.length) {
    console.error(`\n✗ ${broken.length} URL(s) no sitemap SEM arquivo (404 no crawl):`);
    broken.forEach(u => console.error('   - ' + u));
  }
  if (orphans.length) {
    console.error(`\n✗ ${orphans.length} artigo(s) em disco FORA do sitemap (invisíveis à busca):`);
    orphans.forEach(o => console.error('   + ' + o));
  }
  console.error('\nsitemap.xml está dessincronizado. Corrija antes de deployar.\n');
  process.exit(1);
}

console.log(`✓ sitemap OK — ${sitemapUrls.length} artigos, todos com arquivo, nenhum órfão.`);
