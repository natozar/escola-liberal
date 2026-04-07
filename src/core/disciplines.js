// ============================================================
// DISCIPLINE & COLOR HELPERS
// ============================================================
const DISCIPLINES={
  economia:{label:'Economia',icon:'💰',order:0},
  matematica:{label:'Matemática',icon:'🔢',order:1},
  filosofia:{label:'Filosofia',icon:'🏛️',order:2},
  emocional:{label:'Inteligência Emocional',icon:'💡',order:3},
  psicologia:{label:'Psicologia',icon:'🧠',order:4},
  portugues:{label:'Português e Redação',icon:'📝',order:5},
  ciencias:{label:'Ciências da Natureza',icon:'🔬',order:6},
  historia:{label:'História do Brasil',icon:'🇧🇷',order:7},
  history:{label:'American History',icon:'🇺🇸',order:8},
  financas:{label:'Educação Financeira',icon:'💳',order:9},
  ingles:{label:'Inglês',icon:'🇬🇧',order:10},
  geografia:{label:'Geografia',icon:'🌍',order:11},
  ia:{label:'Inteligência Artificial',icon:'🤖',order:12},
  midia:{label:'Educação Midiática',icon:'🛡️',order:13},
  direito:{label:'Direito e Cidadania',icon:'⚖️',order:14},
  saude:{label:'Saúde e Bem-estar',icon:'💪',order:15},
  artes:{label:'Artes e Cultura',icon:'🎨',order:16},
  logica:{label:'Lógica e Argumentação',icon:'🧩',order:17},
  programacao:{label:'Programação',icon:'💻',order:18},
  oratoria:{label:'Oratória e Debate',icon:'🎤',order:19},
  civica:{label:'Educação Cívica',icon:'🏛️',order:20},
  empreendedorismo:{label:'Empreendedorismo',icon:'🚀',order:21},
  tributario:{label:'Educação Tributária',icon:'🧾',order:22},
  trabalhista:{label:'Direito Trabalhista',icon:'👷',order:23},
  marketing:{label:'Marketing Digital',icon:'📱',order:24},
  sustentabilidade:{label:'Sustentabilidade',icon:'🌱',order:25},
  espanol:{label:'Espanhol',icon:'🇪🇸',order:26}
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
  economia:'sage',matematica:'sky',filosofia:'lavender',emocional:'honey',
  psicologia:'coral',portugues:'sage',ciencias:'mint',historia:'coral',
  history:'sky',financas:'honey',ingles:'sky',geografia:'mint',
  ia:'lavender',midia:'coral',direito:'sage',saude:'mint',artes:'honey',logica:'lavender',
  programacao:'sky',oratoria:'honey',civica:'sage',
  empreendedorismo:'coral',tributario:'sage',trabalhista:'honey',marketing:'sky',sustentabilidade:'mint',
  espanol:'coral'
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

// Get first module index of a discipline within M
function getDiscModules(disc){return window.M.map((m,i)=>({mod:m,idx:i})).filter(x=>x.mod.discipline===disc)}

window.DISCIPLINES = DISCIPLINES;
window.COLOR_MAP = COLOR_MAP;
window.COLOR_MUTED_MAP = COLOR_MUTED_MAP;
window.DISC_ACCENT = DISC_ACCENT;
window.getModColor = getModColor;
window.getModColorMuted = getModColorMuted;
window.setDiscAccent = setDiscAccent;
window.clearDiscAccent = clearDiscAccent;
window.getDiscModules = getDiscModules;

export { DISCIPLINES, COLOR_MAP, COLOR_MUTED_MAP, DISC_ACCENT, getModColor, getModColorMuted, setDiscAccent, clearDiscAccent, getDiscModules };
