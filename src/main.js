// ============================================================
// ESCOLA LIBERAL — Main Entry Point (ES Modules)
// Imports all modules in correct order, then boots the app.
// ============================================================

// Phase 0: Safe DOM proxy (must run first — patches document.getElementById)
import './core/dom.js';

// Phase 1: Core data structures
import './core/state.js';       // S, SK, def, load, save → window
import './core/data.js';        // M, loadLessons, loadFullModule, preloadModules → window
import './core/disciplines.js'; // DISCIPLINES, colors, accents → window

// Phase 2: Core utilities
import './core/xp.js';          // addXP, totalXP, toast, streak, LEVEL_NAMES, getLevelInfo → window

// Phase 3: UI foundations (no feature deps)
import './ui/theme.js';         // initTheme, toggleTheme → window
import './ui/sidebar.js';       // buildSidebar, toggleDiscGroup → window
import './ui/glossary.js';      // GLOSSARY, doSearch, goGlossary, flashcards → window
import './ui/dashboard.js';     // ui, renderCards, renderAch, renderXPEvent, etc. → window

// Phase 4: Features
import './core/i18n-content.js';    // getLocalizedField → window
import './features/timeline.js';    // logActivity, loadTimeline, goTimeline
import './features/performance.js'; // goPerf
import './features/notes.js';
import './features/chat.js';
import './features/favorites.js';
import './features/tts.js';
import './features/certificates.js';
import './features/quiz.js';        // daily, review, marathon
import './features/onboarding.js';
import './features/social.js';       // share, challenges, save modal
import './features/profiles.js';     // multi-profile, parent dash, PIN
import './features/gamification.js'; // missions, badges, exam
import './features/leaderboard.js';
import './features/spaced-repetition.js';
import './features/study-plan.js';
import './features/investment-game.js';
import './features/backup.js';
import './features/moderation.js'; // debate moderation (content filter, strikes, LGPD)
import './features/debate.js';    // debate ao vivo (Supabase Realtime)

// Phase 5: Navigation (depends on features for goDash calls)
import './core/navigation.js';  // goDash, goMod, openL, nextL, prevL, hideAllViews, etc.

// Phase 6: UI overlays & utilities
import './ui/sfx.js';           // playSfx, printLesson, exportPDF, keyboard shortcuts, splash
import './ui/pwa.js';           // PWA install, what's new, notifications, save indicator
import './ui/mobile.js';        // bottom nav, mobile overrides, swipe, haptic (MUST be after navigation)

// Phase 7: Boot sequence (loads Supabase/Stripe, starts app)
import { boot } from './boot.js';

// Run boot
boot();
