// Publica o PRÓXIMO artigo da série "Voto Consciente" na ordem pedagógica.
// Chamado 1x/dia pelo workflow GitHub Actions. Publica só rascunhos aprovados
// (status 'drafted' + reviewScore >= 7). Se não houver, sai sem erro (série acabou
// ou o próximo ainda não passou na revisão).
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kw = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog/keywords.json'), 'utf8'));

// Candidatos: cluster voto, aprovados (drafted + score>=7), com arquivo em drafts/, ordenados por `order`
const MIN_SCORE = 7;
const ready = kw.keywords
  .filter(k => k.cluster === 'voto' && k.status === 'drafted' && (k.reviewScore ?? 0) >= MIN_SCORE)
  .filter(k => fs.existsSync(path.join(ROOT, 'blog/drafts', k.slug + '.html')))
  .sort((a, b) => (a.order ?? a.priority ?? 999) - (b.order ?? b.priority ?? 999));

if (!ready.length) {
  console.log('Nenhum rascunho de voto aprovado pronto para publicar hoje. Nada a fazer.');
  process.exit(0);
}

const next = ready[0];
console.log(`Publicando #${next.order}: ${next.slug} (score ${next.reviewScore}/10)`);
execSync(`node scripts/publish-blog.js --slugs=${next.slug}`, { cwd: ROOT, stdio: 'inherit' });

const remaining = kw.keywords.filter(k => k.cluster === 'voto' && k.status !== 'published').length;
console.log(`\nRestam ${remaining} artigos da série Voto Consciente.`);
