// Verifica a consistencia do blog entre as QUATRO fontes de verdade:
//   1. arquivos em blog/*.html          (o que existe)
//   2. sitemap.xml                      (o que o buscador descobre)
//   3. cards em blog.html               (o que o leitor encontra navegando)
//   4. ARTICLES_MAP em blog-marketing.js (o que alimenta "Continue aprendendo" e o card de disciplina)
//
// Falha (exit 1) em qualquer divergencia. Um post fora do sitemap e invisivel a busca;
// fora do blog.html e inalcancavel navegando; fora do ARTICLES_MAP nao renderiza nem o
// bloco de relacionados nem o CTA de disciplina (as funcoes fazem early-return sem a entrada).
//
// Uso: node scripts/verify-sitemap.mjs   (tambem roda no fim de publish-blog.js)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// 1. arquivos reais
const files = fs.readdirSync(path.join(ROOT, 'blog')).filter(f => f.endsWith('.html'));
const realFiles = new Set(files.map(f => 'blog/' + f));
const realSlugs = new Set(files.map(f => f.replace(/\.html$/, '')));

// 2. sitemap
const sitemapUrls = [...rd('sitemap.xml').matchAll(/\/blog\/([a-z0-9-]+\.html)</g)].map(m => 'blog/' + m[1]);
const sitemapSet = new Set(sitemapUrls);

// 3. cards do blog.html
const cardSlugs = new Set(
  [...rd('blog.html').matchAll(/<a href="blog\/([a-z0-9-]+)\.html" class="post-card">/g)].map(m => m[1])
);

// 4. ARTICLES_MAP
const bm = rd('blog-marketing.js');
const mapStart = bm.indexOf('const ARTICLES_MAP = {');
const mapEnd = bm.indexOf('\n  };', mapStart);
const mapSlugs = new Set(
  mapStart < 0 || mapEnd < 0
    ? []
    : [...bm.slice(mapStart, mapEnd).matchAll(/^\s*'([a-z0-9-]+)':\s*\{/gm)].map(m => m[1])
);

const problemas = [];
const add = (titulo, itens, prefixo) => { if (itens.length) problemas.push({ titulo, itens, prefixo }); };

add('URL(s) no sitemap SEM arquivo (404 no crawl)',
  sitemapUrls.filter(u => !realFiles.has(u)), '-');
add('artigo(s) em disco FORA do sitemap (invisiveis a busca)',
  [...realFiles].filter(f => !sitemapSet.has(f)), '+');
add('artigo(s) sem card no blog.html (inalcancaveis navegando)',
  [...realSlugs].filter(s => !cardSlugs.has(s)), '+');
add('card(s) no blog.html apontando pra arquivo inexistente',
  [...cardSlugs].filter(s => !realSlugs.has(s)), '-');
add('artigo(s) fora do ARTICLES_MAP (sem "Continue aprendendo" nem card de disciplina)',
  [...realSlugs].filter(s => !mapSlugs.has(s)), '+');
add('entrada(s) no ARTICLES_MAP sem artigo correspondente',
  [...mapSlugs].filter(s => !realSlugs.has(s)), '-');

if (problemas.length) {
  for (const p of problemas) {
    console.error(`\n✗ ${p.itens.length} ${p.titulo}:`);
    p.itens.forEach(i => console.error(`   ${p.prefixo} ${i}`));
  }
  console.error('\nO blog esta dessincronizado. Corrija antes de deployar.\n');
  process.exit(1);
}

console.log(`✓ blog OK — ${files.length} artigos; sitemap, blog.html e ARTICLES_MAP em sincronia.`);
