const { chromium } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
(async () => {
  const browser = await chromium.launch();
  const pages = [
    { name: 'index.html', url: 'http://localhost:4303/index.html' },
    { name: 'app.html',   url: 'http://localhost:4303/app.html' },
    { name: 'auth.html',  url: 'http://localhost:4303/auth.html' },
  ];
  for (const p of pages) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 });
    if (p.name === 'app.html') {
      await page.evaluate(() => {
        localStorage.setItem('escola_v2', JSON.stringify({name:'Audit',avatar:'A',xp:0,lvl:1,streak:0,streakDays:[],done:{},quiz:{},ageGroup:'adult'}));
        localStorage.setItem('escola_last_version','99.0.0');
        localStorage.setItem('escolalib_install_v2','1');
        localStorage.setItem('escolalib_cookie_consent','all');
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(() => {
        var ob=document.getElementById('onboard');if(ob)ob.style.display='none';
        var wn=document.getElementById('wnOverlay');if(wn)wn.classList.remove('show');
        var cb=document.getElementById('cookieBanner');if(cb)cb.style.display='none';
        if(typeof goDash==='function')goDash();
      });
      await page.waitForTimeout(3000);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    console.log(`\n=== ${p.name.toUpperCase()} AFTER ===`);
    console.log(`Violations: ${results.violations.length}`);
    results.violations.forEach(v => {
      console.log(`  ${(v.impact||'').toUpperCase().padEnd(10)} ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
      v.nodes.slice(0,2).forEach(n => console.log(`    target: ${n.target[0]}`));
    });
    console.log(`Passes: ${results.passes.length}`);
    await context.close();
  }
  await browser.close();
})();
