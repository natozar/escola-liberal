// @ts-check
// ============================================================
// 15-trader-responsivo.spec.js
// QA de responsividade e texto escondido na disciplina `trader`
// (mod-180 a mod-193 — 140 aulas, unica disciplina com tabelas e SVG).
//
// Verifica, em varias larguras:
//   1. overflow horizontal da pagina
//   2. elemento estourando o container da aula (fora de area rolavel)
//   3. texto cortado por overflow:hidden
//   4. texto de SVG pequeno demais para ler apos o downscale do mobile
//   5. texto de SVG fora do viewBox (recortado pelo proprio SVG)
//   6. tabela que rola mas nao tem overflow-x
//   7. conteudo invisivel (display/visibility/opacity/font-size zero)
//
// Uso: QA_URL=http://localhost:5199 npx playwright test 15-trader --project=desktop-chrome
// ============================================================
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MOD_INI = 180;
const MOD_FIM = 193;

const VIEWPORTS = [
  { nome: '320x720  (menor Android)', w: 320, h: 720 },
  { nome: '360x740  (Android tipico)', w: 360, h: 740 },
  { nome: '414x896  (iPhone Plus)', w: 414, h: 896 },
  { nome: '768x1024 (tablet)', w: 768, h: 1024 },
  { nome: '1440x900 (desktop)', w: 1440, h: 900 },
];

// Abaixo disso, texto em diagrama e ilegivel na pratica.
const PISO_FONTE_PX = 9;

const achados = [];
const registra = (o) => achados.push(o);

test.describe.configure({ mode: 'serial' });

test.describe('Trader — responsividade e texto escondido', () => {
  /** @type {import('@playwright/test').Page} */
  let page;
  let aulas = [];
  let disciplinaPresente = false;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
    // Espera o curriculo carregar (nao o numero final de modulos): contra uma URL
    // que ainda nao tem a disciplina, a espera por MOD_FIM nunca resolveria.
    await page.waitForFunction(() => window.M && window.M.length > 100, null, { timeout: 40000 })
      .catch(() => {});

    aulas = await page.evaluate(([ini, fim]) => {
      const out = [];
      for (let mi = ini; mi <= fim; mi++) {
        const m = window.M[mi];
        if (!m) continue;
        for (let li = 0; li < m.lessons.length; li++) {
          out.push({ mi, li, mod: m.title, titulo: m.lessons[li].title });
        }
      }
      return out;
    }, [MOD_INI, MOD_FIM]);

    // No CI o alvo padrao e a producao, que pode ainda nao ter propagado a
    // disciplina. Nesse caso os testes sao pulados em vez de falharem.
    disciplinaPresente = aulas.length === 140;
    if (!disciplinaPresente) {
      console.log(`[15-trader] disciplina indisponivel nesta URL (${aulas.length} aulas) — testes pulados`);
    }
  });

  test.afterAll(async () => {
    const dir = path.join(__dirname, '..', 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'trader-responsivo.json'), JSON.stringify(achados, null, 2), 'utf8');

    const porTipo = {};
    for (const a of achados) porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1;
    console.log('\n===== RESUMO DE ACHADOS =====');
    if (!achados.length) console.log('nenhum achado');
    for (const [t, n] of Object.entries(porTipo)) console.log(`${t}: ${n}`);
    console.log('relatorio completo: qa/test-results/trader-responsivo.json\n');
    await page.close();
  });

  for (const vp of VIEWPORTS) {
    test(`viewport ${vp.nome}`, async () => {
      test.skip(!disciplinaPresente, 'disciplina trader nao disponivel na URL alvo');
      test.setTimeout(600000);
      const cob = { aulas: 0, elementos: 0, svgs: 0, textosSvg: 0, tabelas: 0, figuras: 0, escalas: [], larguraBody: 0 };
      await page.setViewportSize({ width: vp.w, height: vp.h });

      for (const a of aulas) {
        await page.evaluate(async ([mi, li]) => { await window.openL(mi, li); }, [a.mi, a.li]);
        await page.waitForFunction(
          ([mi, li]) => window.S && window.S.cMod === mi && window.S.cLes === li,
          [a.mi, a.li],
          { timeout: 15000 }
        );

        const r = await page.evaluate((PISO) => {
          const out = [];
          const body = document.getElementById('lvBody');
          if (!body) return { achados: [{ tipo: 'sem-lvBody' }], cobertura: null };

          const doc = document.documentElement;
          if (doc.scrollWidth > window.innerWidth + 1) {
            out.push({
              tipo: 'overflow-horizontal-pagina',
              detalhe: `scrollWidth ${doc.scrollWidth} > innerWidth ${window.innerWidth}`,
            });
          }

          const rolavel = (el) => {
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === 'auto' || ox === 'scroll') return true;
            }
            return false;
          };

          const cont = body.getBoundingClientRect();
          const contStyle = getComputedStyle(body);
          const limDir = cont.right - parseFloat(contStyle.paddingRight);
          const limEsq = cont.left + parseFloat(contStyle.paddingLeft);

          for (const el of body.querySelectorAll('*')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const rc = el.getBoundingClientRect();
            if (rc.width === 0 && rc.height === 0) continue;

            // 2) estouro do container, ignorando o que vive dentro de area rolavel
            if (!rolavel(el) && (rc.right > limDir + 1.5 || rc.left < limEsq - 1.5)) {
              const ox = cs.overflowX;
              const proprioRolavel = ox === 'auto' || ox === 'scroll';
              if (!proprioRolavel) {
                out.push({
                  tipo: 'estoura-container',
                  el: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
                  detalhe: `direita ${Math.round(rc.right)} vs limite ${Math.round(limDir)}`,
                  trecho: (el.textContent || '').trim().slice(0, 60),
                });
              }
            }

            // 3) texto cortado por overflow hidden
            const temTexto = el.children.length === 0 && (el.textContent || '').trim().length > 0;
            if (temTexto) {
              const cortaX = cs.overflowX === 'hidden' && el.scrollWidth > el.clientWidth + 2;
              const cortaY = cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 2;
              if (cortaX || cortaY) {
                out.push({
                  tipo: 'texto-cortado',
                  el: el.tagName.toLowerCase(),
                  detalhe: cortaX
                    ? `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`
                    : `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`,
                  trecho: (el.textContent || '').trim().slice(0, 60),
                });
              }
            }

            // 7) conteudo textual invisivel
            if (temTexto) {
              const fs2 = parseFloat(cs.fontSize);
              if (cs.opacity === '0' || fs2 === 0) {
                out.push({
                  tipo: 'texto-invisivel',
                  el: el.tagName.toLowerCase(),
                  detalhe: `opacity ${cs.opacity}, font-size ${cs.fontSize}`,
                  trecho: (el.textContent || '').trim().slice(0, 60),
                });
              }
            }
          }

          // 6) tabelas que rolam precisam ter overflow-x
          for (const tb of body.querySelectorAll('table')) {
            if (tb.scrollWidth > tb.clientWidth + 1) {
              const ox = getComputedStyle(tb).overflowX;
              if (ox !== 'auto' && ox !== 'scroll') {
                out.push({
                  tipo: 'tabela-cortada',
                  detalhe: `scrollWidth ${tb.scrollWidth} > clientWidth ${tb.clientWidth}, overflow-x: ${ox}`,
                });
              }
            }
          }

          // 4 e 5) diagnostico dos SVGs
          const escalas = [];
          for (const svg of body.querySelectorAll('svg')) {
            const ctm = svg.getScreenCTM();
            const escala = ctm ? ctm.a : 1;
            const vb = svg.viewBox && svg.viewBox.baseVal;
            let menor = Infinity, menorTxt = '';
            let fora = 0, foraTxt = '';

            for (const t of svg.querySelectorAll('text')) {
              const fpx = parseFloat(getComputedStyle(t).fontSize);
              const efetivo = fpx * escala;
              if (efetivo < menor) { menor = efetivo; menorTxt = (t.textContent || '').slice(0, 45); }
              if (vb) {
                let bb = null;
                try { bb = t.getBBox(); } catch (e) { /* ignora */ }
                if (bb && (bb.x < vb.x - 0.5 || bb.y < vb.y - 0.5 ||
                           bb.x + bb.width > vb.x + vb.width + 0.5 ||
                           bb.y + bb.height > vb.y + vb.height + 0.5)) {
                  fora++;
                  if (!foraTxt) foraTxt = (t.textContent || '').slice(0, 45);
                }
              }
            }

            if (ctm) escalas.push(escala);
            if (menor !== Infinity && menor < PISO) {
              out.push({
                tipo: 'svg-texto-ilegivel',
                detalhe: `menor texto renderiza a ${menor.toFixed(1)}px (escala ${escala.toFixed(2)})`,
                trecho: menorTxt,
              });
            }
            if (fora) {
              out.push({
                tipo: 'svg-texto-fora-do-viewbox',
                detalhe: `${fora} elemento(s) <text> fora do viewBox`,
                trecho: foraTxt,
              });
            }
          }

          return {
            achados: out,
            cobertura: {
              escalas,
              larguraBody: Math.round(body.getBoundingClientRect().width),
              elementos: body.querySelectorAll('*').length,
              svgs: body.querySelectorAll('svg').length,
              textosSvg: body.querySelectorAll('svg text').length,
              tabelas: body.querySelectorAll('table').length,
              figuras: body.querySelectorAll('.lesv-fig').length,
            },
          };
        }, PISO_FONTE_PX);

        cob.aulas++;
        if (r.cobertura) {
          cob.elementos += r.cobertura.elementos;
          cob.svgs += r.cobertura.svgs;
          cob.textosSvg += r.cobertura.textosSvg;
          cob.tabelas += r.cobertura.tabelas;
          cob.figuras += r.cobertura.figuras;
          cob.escalas.push(...r.cobertura.escalas);
          cob.larguraBody = r.cobertura.larguraBody;
        }

        for (const f of r.achados) {
          registra({ viewport: vp.nome, mod: a.mi, aula: a.li + 1, titulo: a.titulo, ...f });
        }
      }

      const desteVp = achados.filter((x) => x.viewport === vp.nome);
      const criticos = desteVp.filter((x) =>
        x.tipo === 'overflow-horizontal-pagina' ||
        x.tipo === 'estoura-container' ||
        x.tipo === 'texto-cortado' ||
        x.tipo === 'tabela-cortada' ||
        x.tipo === 'texto-invisivel');

      console.log(`[${vp.nome}] ${desteVp.length} achado(s), ${criticos.length} critico(s)`);
      const escMin = cob.escalas.length ? Math.min(...cob.escalas) : 0;
      const escMax = cob.escalas.length ? Math.max(...cob.escalas) : 0;
      console.log(`   cobertura: ${cob.aulas} aulas, ${cob.elementos} elementos, ${cob.svgs} svg, ${cob.textosSvg} textos de svg, ${cob.tabelas} tabelas, ${cob.figuras} figuras roláveis`);
      console.log(`   layout vivo: largura do corpo da aula ${cob.larguraBody}px, escala dos diagramas ${escMin.toFixed(2)}–${escMax.toFixed(2)}`);
      // Guarda de vacuidade: se a aula nao estivesse renderizada, a largura seria 0
      // e getScreenCTM() devolveria null (escala ausente) — o teste passaria sem medir nada.
      expect(cob.larguraBody, 'corpo da aula renderizado').toBeGreaterThan(200);
      expect(cob.escalas.length, 'svgs com matriz de tela valida').toBe(cob.svgs);
      expect(cob.aulas, 'aulas medidas').toBe(aulas.length);
      expect(cob.svgs, 'svgs medidos').toBeGreaterThan(20);
      for (const c of criticos.slice(0, 8)) {
        console.log(`   X mod-${c.mod} aula ${c.aula} — ${c.tipo}: ${c.detalhe} | ${c.trecho || ''}`);
      }
      const ilegiveis = desteVp.filter((x) => x.tipo === 'svg-texto-ilegivel');
      if (ilegiveis.length) {
        console.log(`   ~ ${ilegiveis.length} diagrama(s) com texto abaixo de ${PISO_FONTE_PX}px`);
      }

      expect(criticos, `achados criticos em ${vp.nome}`).toEqual([]);
    });
  }
});
