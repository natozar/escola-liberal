// @ts-check
// ============================================================
// 16-barras-fixas.spec.js
// O app mobile tem duas barras `position:fixed` que flutuam POR CIMA
// do conteudo: `.mobile-header` (topo) e `.bottom-nav` (rodape, com o
// botao central elevado saindo acima dela). Nenhuma delas ocupa espaco
// no fluxo — quem precisa reservar esse espaco e o padding do `.main`.
//
// Quando esse padding e zerado (foi o que um `padding:.5rem!important`
// no <style> inline do app.html fez), o defeito NAO aparece como erro,
// overflow ou elemento fora do container. A pagina rola normalmente ate
// o fim; simplesmente o comeco fica embaixo do header e o fim embaixo da
// bottom-nav. Por isso as 15 specs anteriores passavam com o bug ativo.
//
// Esta spec mede exatamente isso, tela por tela:
//   1. com a pagina no topo, o primeiro conteudo comeca ABAIXO do header
//   2. com a pagina no fim, o ultimo conteudo termina ACIMA da bottom-nav
//      (e acima do botao central, que sobe ~18px alem dela)
//   3. o `.main` nao pode ficar preso em max-height enquanto o conteudo
//      transborda para fora dele — a caixa clipada faz o padding-bottom
//      ser aplicado no lugar errado e some com a folga do rodape
//
// Uso: QA_URL=http://localhost:5321 npx playwright test 16-barras --project=desktop-chrome
// ============================================================
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { nome: '320x720  (menor Android)', w: 320, h: 720 },
  { nome: '360x740  (Android tipico)', w: 360, h: 740 },
  { nome: '390x844  (iPhone 14)', w: 390, h: 844 },
  { nome: '414x896  (iPhone Plus)', w: 414, h: 896 },
  { nome: '600x800  (limite do breakpoint)', w: 600, h: 800 },
];

// Telas do app alcancaveis por funcao global, sem depender de clique.
const TELAS = [
  { nome: 'Inicio', fn: 'goDash' },
  { nome: 'Disciplinas', fn: 'goAulasTab' },
  { nome: 'Ranking', fn: 'goLeaderboard' },
  { nome: 'Glossario', fn: 'goGlossary' },
  { nome: 'Conquistas', fn: 'goBadges' },
  { nome: 'Desempenho', fn: 'goPerf' },
  { nome: 'Plano de estudos', fn: 'goStudyPlan' },
  { nome: 'Modulo', fn: 'goMod', arg: 0 },
];

const achados = [];

test.describe.configure({ mode: 'serial' });

test.describe('Layout mobile — conteudo escondido sob as barras fixas', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.nome} — nenhum conteudo sob o header ou a bottom-nav`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.goAulasTab === 'function', null, { timeout: 15000 });
      await page.waitForTimeout(800);

      // Guarda de vacuidade: sem as barras visiveis nao ha o que medir,
      // e um teste que mede nada passa sempre.
      const barras = await page.evaluate(() => {
        const h = document.querySelector('.mobile-header');
        const n = document.querySelector('.bottom-nav');
        const c = document.querySelector('.bnav-center .bnav-icon-wrap');
        const vis = (e) => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
        return { header: vis(h), nav: vis(n), centro: vis(c) };
      });
      expect(barras.header, 'mobile-header deve estar visivel neste viewport').toBe(true);
      expect(barras.nav, 'bottom-nav deve estar visivel neste viewport').toBe(true);
      expect(barras.centro, 'botao central elevado deve estar visivel').toBe(true);

      for (const tela of TELAS) {
        const r = await page.evaluate(async ([fn, arg]) => {
          if (typeof window[fn] !== 'function') return { ausente: true };
          // Rola antes de trocar de tela: o usuario real chega na aba nova
          // vindo de uma tela ja rolada, e isso ja escondeu texto no topo.
          window.scrollTo(0, 600);
          await new Promise((r) => setTimeout(r, 120));
          arg === undefined ? window[fn]() : window[fn](arg);
          await new Promise((r) => setTimeout(r, 700));

          const head = document.querySelector('.mobile-header');
          const nav = document.querySelector('.bottom-nav');
          const centro = document.querySelector('.bnav-center .bnav-icon-wrap');
          const main = document.querySelector('.main');

          const vista = [...document.querySelectorAll('.xview, .aulas-view, .main > div')]
            .find((e) => e.offsetParent !== null && e.getBoundingClientRect().height > 60);
          if (!vista) return { semVista: true };

          // 1. topo
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 200));
          const primeiro = vista.querySelector('h1, h2, h3, .aulas-title, .welcome') || vista;
          const folgaTopo = Math.round(
            primeiro.getBoundingClientRect().top - head.getBoundingClientRect().bottom
          );

          // 2. fundo — a barra efetiva e a mais alta entre a nav e o botao central
          window.scrollTo(0, document.documentElement.scrollHeight);
          await new Promise((r) => setTimeout(r, 250));
          const topoDaBarra = Math.min(
            nav.getBoundingClientRect().top,
            centro.getBoundingClientRect().top
          );
          const maisBaixo = [...vista.querySelectorAll('*')]
            .filter((e) => e.offsetParent !== null && e.getBoundingClientRect().height > 0)
            .reduce((a, e) => Math.max(a, e.getBoundingClientRect().bottom), -1e9);
          const folgaFundo = Math.round(topoDaBarra - maisBaixo);

          // 3. main clipado com conteudo vazando para fora dele
          const cs = getComputedStyle(main);
          const clipado =
            cs.maxHeight !== 'none' &&
            main.scrollHeight > main.getBoundingClientRect().height + 2 &&
            cs.overflowY === 'visible';

          return {
            folgaTopo,
            folgaFundo,
            clipado,
            overflowH: document.documentElement.scrollWidth > window.innerWidth + 1,
          };
        }, [tela.fn, tela.arg]);

        if (r.ausente || r.semVista) continue;

        const ctx = `${vp.nome} · ${tela.nome}`;
        if (r.folgaTopo < 0) {
          achados.push(`${ctx}: primeiro conteudo ${-r.folgaTopo}px sob o header fixo`);
        }
        if (r.folgaFundo < 0) {
          achados.push(`${ctx}: ultimo conteudo ${-r.folgaFundo}px sob a bottom-nav — a tela nao rola ate o fim`);
        }
        if (r.clipado) {
          achados.push(`${ctx}: .main preso em max-height com conteudo vazando (padding-bottom nao vale)`);
        }
        if (r.overflowH) {
          achados.push(`${ctx}: overflow horizontal na pagina`);
        }
      }

      expect(achados, achados.join('\n')).toEqual([]);
    });
  }

  // ----------------------------------------------------------
  // O banner de update e a unica via pela qual o usuario autoriza
  // uma nova versao (Politica de Atualizacao PWA, regra 3). Ele
  // passou muito tempo SEM UMA LINHA DE CSS: uma div solta com
  // botoes nativos do navegador, caindo no meio do conteudo.
  // Nada testava isso porque o banner so aparece quando ha um SW
  // esperando — estado que nenhuma spec provocava.
  // ----------------------------------------------------------
  for (const vp of VIEWPORTS) {
    test(`${vp.nome} — banner de update estilizado e fora das barras`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.showUpdateBanner === 'function', null, { timeout: 15000 });
      await page.waitForTimeout(800);

      const r = await page.evaluate(() => {
        window.showUpdateBanner(); // caminho real, nao style forcado na mao
        const bn = document.getElementById('updateBanner');
        const R = bn.getBoundingClientRect();
        const cs = getComputedStyle(bn);
        const cruza = (a, b) =>
          !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        const visivel = (s) => {
          const e = document.querySelector(s);
          return e && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null;
        };
        const nav = visivel('.bottom-nav');
        const fab = visivel('.chat-fab');
        const alvos = [...bn.querySelectorAll('button')].map((e) => {
          const q = e.getBoundingClientRect();
          return Math.round(Math.min(q.width, q.height));
        });
        return {
          exibido: cs.display,
          posicao: cs.position,
          fundoTransparente: cs.backgroundColor === 'rgba(0, 0, 0, 0)',
          dentroDaTela: R.left >= -0.5 && R.right <= innerWidth + 0.5 && R.top >= -0.5 && R.bottom <= innerHeight + 0.5,
          sobrepoeNav: nav ? cruza(R, nav) : false,
          sobrepoeFab: fab ? cruza(R, fab) : false,
          menorAlvo: alvos.length ? Math.min(...alvos) : 0,
        };
      });

      expect(r.exibido, 'showUpdateBanner deve exibir o banner').toBe('flex');
      // Sem CSS ele fica `static` e transparente — foi exatamente o estado quebrado.
      expect(r.posicao, 'banner sem position:fixed cai no meio do conteudo').toBe('fixed');
      expect(r.fundoTransparente, 'banner sem fundo proprio = sem estilo').toBe(false);
      expect(r.dentroDaTela, 'banner deve caber inteiro na tela').toBe(true);
      expect(r.sobrepoeNav, 'banner nao pode ficar sob a bottom-nav').toBe(false);
      expect(r.sobrepoeFab, 'banner nao pode colidir com o botao de chat').toBe(false);
      expect(r.menorAlvo, 'botoes do banner precisam de alvo de toque >= 36px').toBeGreaterThanOrEqual(36);
    });
  }
});
