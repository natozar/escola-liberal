// ============================================================
// DISCIPLINE & COLOR HELPERS
// ============================================================
const DISCIPLINES={
  voto:{label:'Voto Consciente',icon:'🗳️',order:0},
  economia:{label:'Economia',icon:'💰',order:1},
  matematica:{label:'Matemática',icon:'🔢',order:2},
  filosofia:{label:'Filosofia',icon:'🏛️',order:3},
  emocional:{label:'Inteligência Emocional',icon:'💡',order:4},
  psicologia:{label:'Psicologia',icon:'🧠',order:5},
  portugues:{label:'Português e Redação',icon:'📝',order:6},
  ciencias:{label:'Ciências da Natureza',icon:'🔬',order:7},
  historia:{label:'História do Brasil',icon:'🇧🇷',order:8},
  history:{label:'American History (English)',icon:'🇺🇸',order:9},
  financas:{label:'Educação Financeira',icon:'💳',order:10},
  ingles:{label:'Inglês',icon:'🇬🇧',order:11},
  geografia:{label:'Geografia',icon:'🌍',order:12},
  ia:{label:'Inteligência Artificial',icon:'🤖',order:13},
  midia:{label:'Educação Midiática',icon:'🛡️',order:14},
  direito:{label:'Direito e Cidadania',icon:'⚖️',order:15},
  saude:{label:'Saúde e Bem-estar',icon:'💪',order:16},
  artes:{label:'Artes e Cultura',icon:'🎨',order:17},
  logica:{label:'Lógica e Argumentação',icon:'🧩',order:18},
  programacao:{label:'Programação',icon:'💻',order:19},
  oratoria:{label:'Oratória e Debate',icon:'🎤',order:20},
  civica:{label:'Educação Cívica',icon:'🏛️',order:21},
  empreendedorismo:{label:'Empreendedorismo',icon:'🚀',order:22},
  tributario:{label:'Educação Tributária',icon:'🧾',order:23},
  trabalhista:{label:'Direito Trabalhista',icon:'👷',order:24},
  marketing:{label:'Marketing Digital',icon:'📱',order:25},
  sustentabilidade:{label:'Sustentabilidade',icon:'🌱',order:26},
  espanhol:{label:'Espanhol',icon:'🇪🇸',order:27},
  investimentos:{label:'Investimentos',icon:'📈',order:28},
  produtividade:{label:'Produtividade',icon:'⚡',order:29}
};
const COLOR_MAP={
  sage:'var(--sage)',sky:'var(--sky)',honey:'var(--honey)',
  coral:'var(--coral)',lavender:'var(--lavender)',mint:'#5bd59b'
};
const COLOR_MUTED_MAP={
  sage:'var(--sage-muted)',sky:'var(--sky-muted)',honey:'var(--honey-muted)',
  coral:'var(--coral-muted)',lavender:'var(--lavender-muted)',mint:'rgba(91,213,155,.1)'
};
function getModColor(c){return COLOR_MAP[c]||'var(--sage)'}
function getModColorMuted(c){return COLOR_MUTED_MAP[c]||'var(--sage-muted)'}

// Dynamic accent theming per discipline
const DISC_ACCENT={
  voto:'sage',
  economia:'sage',matematica:'sky',filosofia:'lavender',emocional:'honey',
  psicologia:'coral',portugues:'sage',ciencias:'mint',historia:'coral',
  history:'sky',financas:'honey',ingles:'sky',geografia:'mint',
  ia:'lavender',midia:'coral',direito:'sage',saude:'mint',artes:'honey',logica:'lavender',
  programacao:'sky',oratoria:'honey',civica:'sage',
  empreendedorismo:'coral',tributario:'sage',trabalhista:'honey',marketing:'sky',sustentabilidade:'mint',
  espanhol:'coral',
  investimentos:'mint',produtividade:'lavender'
};
function setDiscAccent(disc){
  const color=DISC_ACCENT[disc]||'sage';
  document.documentElement.style.setProperty('--accent-active',getModColor(color));
  document.documentElement.style.setProperty('--accent-active-muted',getModColorMuted(color));
  document.documentElement.classList.add('disc-themed');
}
function clearDiscAccent(){
  document.documentElement.classList.remove('disc-themed');
  document.documentElement.style.removeProperty('--accent-active');
  document.documentElement.style.removeProperty('--accent-active-muted');
}

// Get modules of a discipline within M, ordered by `order` field (fallback: index)
function getDiscModules(disc){
  return window.M.map((m,i)=>({mod:m,idx:i}))
    .filter(x=>x.mod.discipline===disc)
    .sort((a,b)=>{
      const oa = (typeof a.mod.order === 'number') ? a.mod.order : a.idx;
      const ob = (typeof b.mod.order === 'number') ? b.mod.order : b.idx;
      return oa - ob;
    });
}

// Discipline keys present in M, sorted by DISCIPLINES order (unknown keys go last, in M order)
function getOrderedDisciplineKeys(){
  const seen=[];
  (window.M||[]).forEach(m=>{
    const d=m.discipline||'economia';
    if(seen.indexOf(d)===-1)seen.push(d);
  });
  return seen.sort((a,b)=>{
    const oa=(DISCIPLINES[a]&&typeof DISCIPLINES[a].order==='number')?DISCIPLINES[a].order:999;
    const ob=(DISCIPLINES[b]&&typeof DISCIPLINES[b].order==='number')?DISCIPLINES[b].order:999;
    return oa-ob;
  });
}

window.DISCIPLINES = DISCIPLINES;
window.getOrderedDisciplineKeys = getOrderedDisciplineKeys;
window.COLOR_MAP = COLOR_MAP;
window.COLOR_MUTED_MAP = COLOR_MUTED_MAP;
window.DISC_ACCENT = DISC_ACCENT;
window.getModColor = getModColor;
window.getModColorMuted = getModColorMuted;
window.setDiscAccent = setDiscAccent;
window.clearDiscAccent = clearDiscAccent;
window.getDiscModules = getDiscModules;

export { DISCIPLINES, COLOR_MAP, COLOR_MUTED_MAP, DISC_ACCENT, getModColor, getModColorMuted, setDiscAccent, clearDiscAccent, getDiscModules, getOrderedDisciplineKeys };
