/**
 * ============================================================
 * ESCOLA LIBERAL i18n SYSTEM
 * ============================================================
 * Vanilla JS internationalization system for multi-language support
 * Supports Portuguese (PT) and English (EN)
 */

// ============================================================
// TRANSLATION DICTIONARY
// ============================================================
const I18N = {
  pt: {
    // Navigation & Sidebar
    nav_dashboard: 'Dashboard',
    nav_modules: 'Módulos',
    nav_profile: 'Perfil',
    nav_settings: 'Configurações',
    nav_glossary: 'Glossário',
    nav_flashcards: 'Flashcards',
    nav_review: 'Revisão',
    nav_performance: 'Desempenho',
    nav_marathon: 'Maratona',
    nav_exam: 'Simulado',
    nav_badges: 'Conquistas',
    nav_timeline: 'Histórico',
    nav_spaced: 'Revisão Espaçada',
    nav_error_review: 'Revisão de Erros',
    nav_game: 'Mini-Jogo',
    nav_backup: 'Backup',
    nav_share: 'Compartilhar',
    nav_language: 'Idioma',

    // Sidebar subtitles
    sub_dashboard: 'Visão geral',
    sub_glossary: 'Termos econômicos',
    sub_flashcards: 'Memorização ativa',
    sub_review: 'Quizzes errados',
    sub_performance: 'Suas estatísticas',
    sub_marathon: 'Quiz contra o relógio',
    sub_exam: 'Prova formal',
    sub_badges: 'Suas medalhas',
    sub_timeline: 'Timeline de estudo',
    sub_spaced: 'Método Leitner',
    sub_error_review: 'Refaça questões erradas',
    sub_game: 'Barraquinha de Limonada',
    sub_backup: 'Exportar / Importar',
    sub_share: 'Progresso em imagem',

    // Lesson & Module
    module: 'Módulo',
    lesson: 'Aula',
    lessons: 'aulas',
    level: 'Nível',
    reading_time: 'min de leitura',

    // Buttons & Actions
    btn_next: 'Próxima →',
    btn_complete: 'Concluir ✓',
    btn_previous: 'Anterior',
    btn_start: 'Começar',
    btn_try_again: 'Tentar de novo',
    btn_view_cert: '🏅 Ver Certificado',
    btn_reload: 'Recarregar',
    btn_close: 'Fechar',

    // Quiz & Questions
    quiz: 'Quiz',
    quiz_correct: '✓ Acertou!',
    quiz_wrong: '✗ Errou!',
    quiz_explanation: 'Explicação',
    quiz_feedback_correct: '✓ ',
    quiz_feedback_wrong: '✗ ',

    // Chat & Assistant
    assistant: 'Assistente',
    msg_placeholder: 'Digite sua pergunta',
    msg_send: 'Enviar',

    // Gamification
    xp: 'XP',
    xp_total: 'XP Total',
    streak: 'Sequência',
    achievement: 'Conquista',
    achievements: 'Conquistas',
    level_badge: 'Nível',

    // Progress & Status
    progress: 'Progresso',
    lessons_completed: 'Aulas concluídas',
    quiz_accuracy: 'Acertos',
    daily_challenge: 'Desafio Diário',
    daily_tag: '+50 XP',
    daily_completed: '✓ Concluído',
    daily_back: 'Volte amanhã para um novo desafio!',
    daily_xp_earned: '+50 XP conquistados 🎉',
    daily_try_again: 'Tente de novo amanhã!',

    // Authentication & Account
    sign_in: 'Entrar',
    sign_out: 'Sair',
    account: 'Conta',
    student: 'Aluno',
    name_placeholder: 'Seu nome',
    profile: 'Perfil',

    // Module/Lesson specific
    module_number: 'Módulo',
    lesson_progress: 'Aula',
    of: 'de',

    // Toasts & Messages
    toast_level_up: 'Nível {{level}}!  🎉',
    toast_xp_gain: '+{{xp}} XP',
    toast_lesson_complete: '+{{xp}} XP — Aula Concluída',
    toast_quiz_success: '+15 XP',
    toast_module_complete: '🏆 Módulo Concluído!',
    toast_streak_maintained: '🔥 {{count}} dia{{plural}} de sequência!',
    toast_streak_start: '🔥 Comece sua sequência!',
    toast_daily_challenge: '⚡ +50 XP — Desafio Diário!',

    // Achievement names
    ach_first_lesson: 'Primeira Aula',
    ach_5_lessons: '5 Aulas',
    ach_10_lessons: '10 Aulas',
    ach_25_lessons: '25 Aulas',
    ach_50_lessons: '50 Aulas',
    ach_perfect_quiz: '100% Quiz',
    ach_streak_7: 'Sequência de 7 dias',
    ach_streak_30: 'Sequência de 30 dias',

    // Level names
    level_name_learner: 'Aprendiz',
    level_name_student: 'Estudante',
    level_name_scholar: 'Erudito',
    level_name_master: 'Mestre',
    level_name_sage: 'Sábio',

    // Tools section
    tools_label: 'Ferramentas',
    navigation_label: 'Navegação',

    // Error messages
    error_title: 'Ops, algo deu errado',
    error_message: 'Um erro inesperado aconteceu. Seus dados estão salvos. Tente recarregar a página.',
    error_unlock: 'Complete o módulo anterior para desbloquear',
    error_lessons_loading: 'Não foi possível carregar as aulas',

    // Misc
    of_text: 'de',
    vision_overview: 'Visão geral',
    back_button: '←',
    pwa_close: 'Fechar',
    focus_mode: 'Modo Foco',
    terms: 'Termos econômicos',
    active_memorization: 'Memorização ativa',
    wrong_quizzes: 'Quizzes errados',
    your_stats: 'Suas estatísticas',
    timed_quiz: 'Quiz contra o relógio',
    formal_test: 'Prova formal',
    your_badges: 'Suas medalhas',
    study_timeline: 'Timeline de estudo',
    leitner_method: 'Método Leitner',
    redo_wrong: 'Refaça questões erradas',
    lemonade_stand: 'Barraquinha de Limonada',
    export_import: 'Exportar / Importar',
    progress_image: 'Progresso em imagem',
  },
  en: {
    // Navigation & Sidebar
    nav_dashboard: 'Dashboard',
    nav_modules: 'Modules',
    nav_profile: 'Profile',
    nav_settings: 'Settings',
    nav_glossary: 'Glossary',
    nav_flashcards: 'Flashcards',
    nav_review: 'Review',
    nav_performance: 'Performance',
    nav_marathon: 'Marathon',
    nav_exam: 'Exam',
    nav_badges: 'Achievements',
    nav_timeline: 'History',
    nav_spaced: 'Spaced Review',
    nav_error_review: 'Error Review',
    nav_game: 'Mini-Game',
    nav_backup: 'Backup',
    nav_share: 'Share',
    nav_language: 'Language',

    // Sidebar subtitles
    sub_dashboard: 'Overview',
    sub_glossary: 'Economic terms',
    sub_flashcards: 'Active memorization',
    sub_review: 'Wrong quizzes',
    sub_performance: 'Your statistics',
    sub_marathon: 'Timed quiz',
    sub_exam: 'Formal test',
    sub_badges: 'Your medals',
    sub_timeline: 'Study timeline',
    sub_spaced: 'Leitner method',
    sub_error_review: 'Redo wrong questions',
    sub_game: 'Lemonade Stand',
    sub_backup: 'Export / Import',
    sub_share: 'Progress image',

    // Lesson & Module
    module: 'Module',
    lesson: 'Lesson',
    lessons: 'lessons',
    level: 'Level',
    reading_time: 'min read',

    // Buttons & Actions
    btn_next: 'Next →',
    btn_complete: 'Complete ✓',
    btn_previous: 'Previous',
    btn_start: 'Start',
    btn_try_again: 'Try again',
    btn_view_cert: '🏅 View Certificate',
    btn_reload: 'Reload',
    btn_close: 'Close',

    // Quiz & Questions
    quiz: 'Quiz',
    quiz_correct: '✓ Correct!',
    quiz_wrong: '✗ Wrong!',
    quiz_explanation: 'Explanation',
    quiz_feedback_correct: '✓ ',
    quiz_feedback_wrong: '✗ ',

    // Chat & Assistant
    assistant: 'Assistant',
    msg_placeholder: 'Type your question',
    msg_send: 'Send',

    // Gamification
    xp: 'XP',
    xp_total: 'Total XP',
    streak: 'Streak',
    achievement: 'Achievement',
    achievements: 'Achievements',
    level_badge: 'Level',

    // Progress & Status
    progress: 'Progress',
    lessons_completed: 'Lessons completed',
    quiz_accuracy: 'Accuracy',
    daily_challenge: 'Daily Challenge',
    daily_tag: '+50 XP',
    daily_completed: '✓ Completed',
    daily_back: 'Come back tomorrow for a new challenge!',
    daily_xp_earned: '+50 XP earned 🎉',
    daily_try_again: 'Try again tomorrow!',

    // Authentication & Account
    sign_in: 'Sign In',
    sign_out: 'Sign Out',
    account: 'Account',
    student: 'Student',
    name_placeholder: 'Your name',
    profile: 'Profile',

    // Module/Lesson specific
    module_number: 'Module',
    lesson_progress: 'Lesson',
    of: 'of',

    // Toasts & Messages
    toast_level_up: 'Level {{level}}!  🎉',
    toast_xp_gain: '+{{xp}} XP',
    toast_lesson_complete: '+{{xp}} XP — Lesson Complete',
    toast_quiz_success: '+15 XP',
    toast_module_complete: '🏆 Module Complete!',
    toast_streak_maintained: '🔥 {{count}} day{{plural}} streak!',
    toast_streak_start: '🔥 Start your streak!',
    toast_daily_challenge: '⚡ +50 XP — Daily Challenge!',

    // Achievement names
    ach_first_lesson: 'First Lesson',
    ach_5_lessons: '5 Lessons',
    ach_10_lessons: '10 Lessons',
    ach_25_lessons: '25 Lessons',
    ach_50_lessons: '50 Lessons',
    ach_perfect_quiz: '100% Quiz',
    ach_streak_7: '7 Day Streak',
    ach_streak_30: '30 Day Streak',

    // Level names
    level_name_learner: 'Learner',
    level_name_student: 'Student',
    level_name_scholar: 'Scholar',
    level_name_master: 'Master',
    level_name_sage: 'Sage',

    // Tools section
    tools_label: 'Tools',
    navigation_label: 'Navigation',

    // Error messages
    error_title: 'Oops, something went wrong',
    error_message: 'An unexpected error occurred. Your data is safe. Try reloading the page.',
    error_unlock: 'Complete the previous module to unlock',
    error_lessons_loading: 'Failed to load lessons',

    // Misc
    of_text: 'of',
    vision_overview: 'Overview',
    back_button: '←',
    pwa_close: 'Close',
    focus_mode: 'Focus Mode',
    terms: 'Economic terms',
    active_memorization: 'Active memorization',
    wrong_quizzes: 'Wrong quizzes',
    your_stats: 'Your statistics',
    timed_quiz: 'Timed quiz',
    formal_test: 'Formal test',
    your_badges: 'Your medals',
    study_timeline: 'Study timeline',
    leitner_method: 'Leitner method',
    redo_wrong: 'Redo wrong questions',
    lemonade_stand: 'Lemonade Stand',
    export_import: 'Export / Import',
    progress_image: 'Progress image',
  }
};

// ============================================================
// LANGUAGE STATE & STORAGE
// ============================================================
let CURRENT_LANG = 'pt';

/**
 * Get current language from localStorage or detect from browser
 * Falls back to 'pt' if detection fails
 */
function getLang() {
  const stored = localStorage.getItem('escola_lang');
  if (stored && (stored === 'pt' || stored === 'en')) {
    return stored;
  }
  // Auto-detect from browser
  const browserLang = navigator.language || navigator.userLanguage || '';
  return browserLang.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/**
 * Initialize language system on page load
 * Should be called early in your initialization sequence
 */
function initI18n() {
  CURRENT_LANG = getLang();
  // On first visit, detect browser language
  if (!localStorage.getItem('escola_lang')) {
    const detected = navigator.language || navigator.userLanguage || '';
    const lang = detected.toLowerCase().startsWith('pt') ? 'pt' : 'en';
    CURRENT_LANG = lang;
    localStorage.setItem('escola_lang', lang);
  }
  // Set HTML lang attribute
  document.documentElement.lang = CURRENT_LANG === 'pt' ? 'pt-BR' : 'en';
  // Update all elements with data-i18n attribute
  updatePageTranslations();
}

/**
 * Translate a key, optionally with template variables
 * Usage: t('toast_level_up', { level: 5 })
 */
function t(key, variables = {}) {
  let text = I18N[CURRENT_LANG]?.[key] || I18N['pt']?.[key] || key;

  // Handle template variables like {{level}}, {{xp}}, {{count}}, {{plural}}
  Object.keys(variables).forEach(varKey => {
    const regex = new RegExp(`{{${varKey}}}`, 'g');
    text = text.replace(regex, variables[varKey]);
  });

  return text;
}

/**
 * Set language and update all UI
 * Saves preference to localStorage
 */
function setLang(lang) {
  if (lang !== 'pt' && lang !== 'en') {
    console.warn(`Invalid language: ${lang}, using pt`);
    lang = 'pt';
  }

  CURRENT_LANG = lang;
  localStorage.setItem('escola_lang', lang);

  // Update HTML lang attribute
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

  // Update all elements with data-i18n attribute
  updatePageTranslations();

  // Dispatch custom event for dynamic content
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/**
 * Update all elements with data-i18n attribute on the page
 */
function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);

    // Check if it's a placeholder attribute
    if (el.hasAttribute('data-i18n-placeholder')) {
      el.placeholder = translation;
    }
    // Check if it's a title/aria-label attribute
    else if (el.hasAttribute('data-i18n-title')) {
      el.title = translation;
      el.setAttribute('aria-label', translation);
    }
    // Check if it's a value attribute (for button text)
    else if (el.tagName === 'INPUT' && el.type === 'button') {
      el.value = translation;
    }
    // Default: set as text content
    else {
      el.textContent = translation;
    }
  });
}

/**
 * Create a language toggle button element
 * Returns HTML string that can be inserted into DOM
 */
function createLanguageToggle() {
  const lang = CURRENT_LANG;
  const otherLang = lang === 'pt' ? 'en' : 'pt';
  const label = lang === 'pt' ? 'English' : 'Português';

  return `<button class="lang-toggle" onclick="setLang('${otherLang}')" title="Switch language / Trocar idioma" aria-label="Language toggle">
    <span class="lang-toggle-flag">${otherLang === 'pt' ? '🇧🇷' : '🇺🇸'}</span>
    <span class="lang-toggle-text">${label}</span>
  </button>`;
}

// ============================================================
// MODULE/LESSON FILTERING BY LANGUAGE
// ============================================================

/**
 * Filter modules by language from lessons.json
 * Expects modules to have a 'lang' field: 'pt', 'en', or 'both'
 * Usage: const filteredModules = filterModulesByLang(M, CURRENT_LANG);
 */
function filterModulesByLang(modules, lang = CURRENT_LANG) {
  return modules.filter(module => {
    // If no lang field is specified, assume 'both'
    const moduleLang = module.lang || 'both';
    if (moduleLang === 'both') return true;
    return moduleLang === lang;
  });
}

/**
 * Get lessons for current language within a module
 * Expects lessons to have a 'lang' field: 'pt', 'en', or 'both'
 */
function getLessonsForLang(module, lang = CURRENT_LANG) {
  if (!module.lessons) return [];
  return module.lessons.filter(lesson => {
    const lessonLang = lesson.lang || 'both';
    if (lessonLang === 'both') return true;
    return lessonLang === lang;
  });
}

// ============================================================
// UTILITY: Generate translation keys from template
// ============================================================

/**
 * Helper to format toast messages with variables
 * Usage: formatToast('xp_gain', { xp: 25 })
 */
function formatToast(key, variables = {}) {
  return t(`toast_${key}`, variables);
}

/**
 * Helper to format achievement messages
 * Usage: formatAchievement('5_lessons')
 */
function formatAchievement(key) {
  return t(`ach_${key}`);
}

/**
 * Helper to format level names
 * Usage: formatLevelName('learner')
 */
function formatLevelName(name) {
  return t(`level_name_${name}`);
}

// ============================================================
// EXPORT FOR MODULE SYSTEMS
// ============================================================
// If using as ES6 module, uncomment:
// export { I18N, t, setLang, getLang, initI18n, updatePageTranslations, createLanguageToggle, filterModulesByLang, getLessonsForLang, formatToast, formatAchievement, formatLevelName };
