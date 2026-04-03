#!/usr/bin/env node
// test-offline.js — Verifica que OFFLINE_MODE está correto antes de deploy
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;

function check(name, condition) {
  if (condition) { console.log('  PASS', name); pass++; }
  else { console.log('  FAIL', name); fail++; }
}

console.log('\n=== TEST OFFLINE MODE ===\n');

// 1. OFFLINE_MODE === true
const bootSrc = fs.readFileSync(path.join(ROOT, 'src/boot.js'), 'utf8');
check('1. OFFLINE_MODE = true in boot.js', /const\s+OFFLINE_MODE\s*=\s*true/.test(bootSrc));

// 2. DEMO_MODE === true
check('2. DEMO_MODE = true in boot.js', /const\s+DEMO_MODE\s*=\s*true/.test(bootSrc));

// 3. seedDemoData exists and has correct structure
check('3. seedDemoData() exists', bootSrc.includes('function seedDemoData()'));
check('3a. Seeds xp >= 500', /xp:\s*7\d\d/.test(bootSrc) || /xp:\s*[5-9]\d\d/.test(bootSrc));
check('3b. Seeds streak > 0', /streak:\s*[1-9]/.test(bootSrc));
check('3c. Seeds done with lessons', /done:\s*done/.test(bootSrc) && /for\s*\(/.test(bootSrc));

// 4. isModuleUnlocked returns true with DEMO_MODE
const sbClient = fs.readFileSync(path.join(ROOT, 'supabase-client.js'), 'utf8');
check('4. isModuleUnlocked has DEMO_MODE guard', sbClient.includes('if (window.DEMO_MODE) return true'));

// 5. isFeatureUnlocked exists
check('5. isFeatureUnlocked exists', sbClient.includes('function isFeatureUnlocked'));

// 6. lessons/index.json exists and parses
try {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'lessons/index.json'), 'utf8'));
  check('6. lessons/index.json parses (' + idx.length + ' modules)', idx.length > 0);
} catch(e) { check('6. lessons/index.json parses', false); }

// 7. All 66 mod-*.json exist
let modCount = 0;
for (let i = 0; i < 66; i++) {
  if (fs.existsSync(path.join(ROOT, 'lessons/mod-' + i + '.json'))) modCount++;
}
check('7. All lesson modules exist (' + modCount + '/66)', modCount === 66);

// 8. DEBATE_ROOMS exists
const debateSrc = fs.readFileSync(path.join(ROOT, 'src/features/debate.js'), 'utf8');
check('8. DEBATE_ROOMS exists with 5 rooms', /DEBATE_ROOMS\s*=\s*\[/.test(debateSrc) && (debateSrc.match(/id:\s*'/g) || []).length >= 5);

// 9. Boot has no await before goDash that depends on network
const hasNetAwait = /await.*_waitSupabase/.test(bootSrc) && !/if\s*\(\s*!?\s*OFFLINE_MODE/.test(bootSrc.split('await')[0]);
check('9. No network-dependent await blocking boot', !(/await\s+Promise\.race\(\[_waitSupabase/.test(bootSrc) && bootSrc.indexOf('OFFLINE_MODE') > bootSrc.indexOf('await Promise.race')));

// 10. SW version incremented
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swVersion = swSrc.match(/SW_VERSION\s*=\s*'(v\d+)'/);
check('10. SW version is v41+', swVersion && parseInt(swVersion[1].slice(1)) >= 41);

// 11. initSupabase has OFFLINE_MODE guard
check('11. initSupabase has OFFLINE_MODE guard', sbClient.includes('if (window.OFFLINE_MODE)'));

// 12. loadPaywallSetting has OFFLINE_MODE guard
check('12. loadPaywallSetting has OFFLINE_MODE guard', sbClient.includes('if (window.OFFLINE_MODE || window.DEMO_MODE) return'));

// 13. askAITutor has OFFLINE_MODE guard
const chatSrc = fs.readFileSync(path.join(ROOT, 'src/features/chat.js'), 'utf8');
check('13. askAITutor has OFFLINE_MODE guard', chatSrc.includes("if(window.OFFLINE_MODE) throw"));

// 14. Supabase SDK injection is guarded
check('14. Supabase SDK injection guarded', bootSrc.includes("if(!OFFLINE_MODE){") && bootSrc.includes("cdn.jsdelivr.net"));

console.log('\n=== RESULT: ' + pass + ' PASS, ' + fail + ' FAIL ===\n');
process.exit(fail > 0 ? 1 : 0);
