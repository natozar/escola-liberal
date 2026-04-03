const fs = require('fs');
const base = fs.readFileSync('./app.css.new', 'utf8');
const mobile = `
/* ============================================================
   MOBILE RESPONSIVENESS — DEFINITIVE
   ============================================================ */
html,body{overflow-x:hidden;max-width:100vw}
*{-webkit-text-size-adjust:100%;text-size-adjust:100%}
.lesv-body img{max-width:100%;height:auto;display:block;border-radius:var(--r-md)}
.lesv-body pre,.lesv-body code{overflow-x:auto;max-width:100%;font-size:.82rem;word-break:break-word}
.lesv-body table{width:100%;overflow-x:auto;display:block;font-size:.82rem}
.lesv-body iframe{max-width:100%;border-radius:var(--r-md)}
.mobile-header{z-index:6000!important}
.bottom-nav{z-index:5000!important}
.side{z-index:5500!important}.side.open{z-index:5500!important}
#sideScrim{z-index:5400!important}
.chat-fab{z-index:4000!important}.chat-panel{z-index:4100!important}
.audio-player{z-index:3500!important}
.sync-indicator{z-index:3000!important}
.global-progress{z-index:2000!important}
.save-modal-overlay,.onboard-overlay{z-index:8000!important}
.cert-overlay{z-index:7500!important}
.pwa-overlay,.wn-overlay{z-index:7000!important}
.pin-overlay{z-index:8500!important}
.update-banner{z-index:9000!important}
.confetti-container{z-index:9500!important}
.skip-link:focus{z-index:10000!important}
@media(max-width:600px){
.welcome h2{font-size:1.15rem}.welcome p{font-size:.8rem}.welcome{padding:1rem}
.dash-section-label{font-size:.58rem}
.mc{padding:.7rem!important;gap:.5rem!important;grid-template-columns:38px 1fr auto!important}
.mc .mc-circle,.mc-circle{width:38px!important;height:38px!important}
.mc .mc-circle-icon,.mc-circle-icon{font-size:.95rem!important}
.mc .mc-info h3{font-size:.8rem;line-height:1.25}
.mc .mc-info>p{font-size:.68rem;margin:0;line-height:1.2;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.mc .mc-meta{font-size:.62rem}.mc .mc-status{font-size:.58rem;padding:.15rem .4rem}
.lesv-body{padding:1.15rem .9rem!important}
.lesv-body h2{font-size:1.15rem}.lesv-body h3{font-size:.92rem}
.lesv-body p{font-size:.82rem;line-height:1.65;max-width:100%}
.lesv-body ul,.lesv-body ol{margin-left:.6rem;font-size:.82rem}
.highlight,.example,.thinker-quote{padding:.65rem;font-size:.8rem;line-height:1.55}
.daily-card,.continue-card,.lb-widget,.missions-card{padding:.65rem}
.continue-card{flex-direction:row;gap:.5rem}
.cc-icon{font-size:1.1rem;flex-shrink:0}.cc-title{font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cc-sub{font-size:.65rem}.cc-btn{font-size:.68rem;white-space:nowrap}
.lb-widget-head,.lb-widget-row{font-size:.7rem}
.mission-name{font-size:.75rem}.mission-xp{font-size:.68rem}
.search-wrap{margin-bottom:.75rem}.search-box{font-size:.78rem;padding:.5rem .9rem .5rem 2rem}
.streak-calendar{gap:.15rem}.streak-day{width:26px;height:26px;font-size:.52rem}.streak-day-label{font-size:.45rem}
.btn{min-height:40px;font-size:.78rem}
.disc-grid{grid-template-columns:repeat(2,1fr)!important;gap:.5rem}
.disc-grid-card{padding:.7rem .4rem;min-height:90px}
.disc-grid-card .dg-icon{font-size:1.5rem}.disc-grid-card .dg-name{font-size:.72rem}.disc-grid-card .dg-meta{font-size:.58rem}
.tools-grid{grid-template-columns:repeat(4,1fr);gap:.4rem}
.tools-grid-item{padding:.5rem .25rem;min-height:55px}.tools-grid-item .tg-icon{font-size:1rem}.tools-grid-item .tg-label{font-size:.55rem}
.perf-grid{grid-template-columns:repeat(2,1fr);gap:.4rem}.perf-val{font-size:1rem}
.sp-summary{grid-template-columns:repeat(2,1fr)}
.badges-grid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr))}
.badge-card{padding:.6rem}.badge-card .badge-icon{font-size:1.3rem}
.wa-share-card{padding:.55rem .65rem;gap:.4rem}.wa-share-icon{width:34px;height:34px}
.wa-share-title{font-size:.78rem}.wa-share-sub{font-size:.62rem}
.quote-card{padding:.65rem}.quote-text{font-size:.82rem}.quote-author{font-size:.68rem}
.chart-bars{height:65px}
.save-modal{padding:1.25rem 1rem;max-width:92vw}
.marathon-header{flex-direction:column;gap:.15rem;font-size:.78rem}
.exam-q{padding:.85rem}.game-controls{grid-template-columns:1fr}
.chat-panel{right:6px;left:6px;width:auto;max-height:55vh}
.modv-head{flex-direction:column;align-items:flex-start;gap:.4rem}.modv-head h2{font-size:1.1rem}
.lesv-nav{gap:.3rem;flex-wrap:wrap}
.xview-head{flex-direction:column;align-items:flex-start;gap:.4rem}
.ws-grid{grid-template-columns:1fr}.weekly-summary,.daily-goal{padding:.75rem}
.qz-o{min-height:44px;padding:.6rem .85rem;font-size:.82rem}
.er-opt{min-height:44px;padding:.6rem .85rem}
.ni{min-height:42px}
.lsn{padding:.75rem;gap:.5rem;min-height:50px}
.lsn-n{width:36px;height:36px;font-size:.82rem}
.lsn-info h4{font-size:.82rem}
.lsn-meta{flex-direction:column;gap:.1rem;align-items:flex-end}.reading-time{font-size:.6rem}
.cert-card{padding:1.5rem 1rem}.cert-name{font-size:1.2rem}
.onboard-features{grid-template-columns:1fr}
.sr-stats{flex-direction:column;gap:.4rem}
.game-summary{flex-direction:column;align-items:center}
.flash-container{min-height:110px}.flash-front h4{font-size:.95rem}
.gl-item{flex-direction:column;gap:.3rem}.gl-term{white-space:normal}
.review-card{padding:.85rem}
}
@media(max-width:375px){
.main{padding-left:.4rem!important;padding-right:.4rem!important}
.welcome{padding:.75rem}.welcome h2{font-size:1rem}
.mc{padding:.55rem!important}.mc .mc-info h3{font-size:.75rem}
.disc-grid{grid-template-columns:1fr!important}
.disc-grid-card{min-height:auto;flex-direction:row;gap:.5rem;padding:.6rem}
.disc-grid-card .dg-icon{font-size:1.3rem}
.tools-grid{grid-template-columns:repeat(3,1fr)}
.lesv-body{padding:.9rem .65rem!important}.lesv-body h2{font-size:1.05rem}
.btn{font-size:.74rem;min-height:38px;padding:.35rem .65rem}
.bnav-label{font-size:.5rem!important}.bnav-item{min-width:42px;padding:.25rem .3rem}
.mh-breadcrumb{font-size:.52rem}
}
@media(max-width:320px){
.main{padding-left:.25rem!important;padding-right:.25rem!important}
.welcome h2{font-size:.9rem}
.mc .mc-info h3{font-size:.72rem}.mc-circle{width:32px!important;height:32px!important}.mc{gap:.35rem!important}
.lesv-body{padding:.75rem .5rem!important}.lesv-body p{font-size:.78rem}
.bnav-icon{font-size:1rem}.bnav-label{font-size:.45rem!important}
.tools-grid{grid-template-columns:repeat(2,1fr)}.perf-grid{grid-template-columns:1fr}
}
/* ====== VERSION BAR ====== */
.app-version-bar{display:flex;align-items:center;justify-content:space-between;padding:.3rem 1rem;background:var(--bg-secondary);border-bottom:1px solid var(--border);font-size:.7rem;font-family:'DM Sans',sans-serif;color:var(--text-muted);position:sticky;top:0;z-index:6500;min-height:28px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.avb-brand{display:flex;align-items:center;gap:.4rem}
.avb-logo{width:20px;height:20px;border-radius:3px;flex-shrink:0;object-fit:contain}
.avb-name{font-size:.68rem;font-weight:600;color:var(--text-secondary);letter-spacing:.2px}
.avb-name em{font-style:normal;color:var(--sage)}
.avb-right{display:flex;align-items:center;gap:.35rem}
.avb-version{font-family:'JetBrains Mono',monospace;font-size:.58rem;font-weight:600;color:var(--text-muted)}
.avb-divider{color:var(--border);font-size:.45rem}
.avb-status{padding:.12rem .4rem;border-radius:var(--r-full);font-size:.55rem;font-weight:600;white-space:nowrap;transition:all .2s}
.avb-status.avb-ok{color:var(--sage);background:var(--sage-muted)}
.avb-status.avb-update{color:var(--honey);background:var(--honey-muted);animation:avbPulse 2s infinite}
.avb-status.avb-checking{color:var(--sky);background:var(--sky-muted)}
.avb-status.avb-offline{color:var(--coral);background:var(--coral-muted)}
.avb-check{width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border);border-radius:50%;font-size:.7rem;color:var(--text-muted);cursor:pointer;transition:all .2s;padding:0;line-height:1;flex-shrink:0}
.avb-check:hover{border-color:var(--sage);color:var(--sage);background:var(--sage-muted)}
.avb-check:active{transform:scale(.9)}
.avb-check:disabled{opacity:.4;cursor:wait;animation:avbSpin 1s linear infinite}
@keyframes avbPulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes avbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@media(max-width:900px){
.app-version-bar{display:none!important}
}`;
fs.writeFileSync('./app.css', base + mobile);
console.log('CSS rewritten:', fs.readFileSync('./app.css','utf8').split('\n').length, 'lines');
fs.unlinkSync('./app.css.new');
