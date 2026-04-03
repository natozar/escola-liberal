/* ========================================================
   escola liberal — Supabase Client Layer
   Auth (Email + Google) + Sync + Plan Access Control
   ======================================================== */

// ========== CONFIG ==========
// Substituir pelas suas credenciais do Supabase
const SUPABASE_URL = 'https://hwjplecfqsckfiwxiedo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-_ZYfPPllImPNCKOA1ZMXQ_zYYM-P6q';

// ========== INICIALIZAÇÃO ==========
let sbClient = null;
let currentUser = null;
let userPlan = null;
let syncEnabled = false;
let syncQueue = [];
let syncTimer = null;

function initSupabase() {
  if (window.OFFLINE_MODE) {
    console.log('[Supabase] OFFLINE_MODE ativo — Supabase desligado');
    return false;
  }
  if (typeof window.supabase === 'undefined') {
    console.warn('[Supabase] SDK não carregado. Modo offline.');
    return false;
  }
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'implicit',          // SPA: usar hash fragments (não PKCE code)
      detectSessionInUrl: true,       // auto-detectar tokens no hash
      persistSession: true,
      autoRefreshToken: true
    }
  });

  // Listener de mudança de auth
  sbClient.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
      currentUser = session.user;
      syncEnabled = true;
      onSignIn(session.user).catch(e => console.warn('[Supabase] Erro em onSignIn:', e.message));
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      syncEnabled = false;
      userPlan = null;
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
      onSignOut();
    }
  });

  // Checar sessão existente (com timeout para não travar)
  checkSession();
  return true;
}

async function checkSession() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session check timeout (5s)')), 5000)
    );
    const { data: { session } } = await Promise.race([
      sbClient.auth.getSession(),
      timeoutPromise
    ]);
    if (session?.user) {
      currentUser = session.user;
      syncEnabled = true;
      await onSignIn(session.user);
    }
  } catch (e) {
    console.warn('[Supabase] Erro ao checar sessão:', e.message);
  }
}

// ========== AUTH: EMAIL + SENHA ==========
async function signUpEmail(email, password, name) {
  try {
    const { data, error } = await sbClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || 'Aluno' },
        emailRedirectTo: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'auth.html'
      }
    });
    if (error) throw error;
    return { success: true, data, needsConfirmation: !data.session };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function signInEmail(email, password) {
  try {
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ========== AUTH: GOOGLE ==========
async function signInGoogle() {
  try {
    // Redirect to auth.html (not app.html) — auth.html loads SDK synchronously
    // and has a dedicated onAuthStateChange listener that redirects to app.html.
    // This avoids race conditions with app.js's dynamic SDK loading.
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const { data, error } = await sbClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: base + 'auth.html',
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (e) {
    console.error('[OAuth] Google login error:', e.message);
    return { success: false, error: e.message };
  }
}

// ========== AUTH: SIGN OUT ==========
async function signOut() {
  try {
    await flushSyncQueue();
    const { error } = await sbClient.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ========== AUTH: RESET PASSWORD ==========
async function resetPassword(email) {
  try {
    const { error } = await sbClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'auth.html'
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ========== CALLBACKS PÓS-AUTH ==========
async function onSignIn(user) {
  // Salvar uid e dados do perfil Google/email no estado local
  if (typeof S !== 'undefined') {
    S.uid = user.id;
    // Capturar nome do Google (ou email signup) se ainda não definido
    if (user.user_metadata?.full_name && (!S.name || S.name === 'Aluno')) {
      S.name = user.user_metadata.full_name;
    }
    // Capturar email (sempre disponível no user object)
    if (user.email && !S.email) {
      S.email = user.email;
    }
    // Marcar provider de login para onboarding saber que veio do Google
    if (user.app_metadata?.provider) {
      S._authProvider = user.app_metadata.provider;
    }
    if (typeof save === 'function') save();

    // Se o onboarding está visível e o nome já foi preenchido pelo Google,
    // pular step 1 automaticamente (evita pedir nome/email de novo)
    if (S.name && S.name !== 'Aluno') {
      var obEl = document.getElementById('onboard');
      var step1 = document.getElementById('obStep1');
      if (obEl && obEl.style.display !== 'none' && step1 && step1.classList.contains('active')) {
        // Skip step 1 → go to step 2
        step1.classList.remove('active');
        var step2 = document.getElementById('obStep2');
        if (step2) step2.classList.add('active');
      }
    }
  }

  // Carregar plano do usuário
  await loadUserPlan();

  // Sincronizar dados locais → nuvem (merge)
  await mergeLocalToCloud();

  // Atualizar UI
  if (typeof updateAuthUI === 'function') updateAuthUI(true);
  if (typeof ui === 'function') ui();

  // Fechar save modal se estiver aberto
  try { var sm = document.getElementById('saveModal'); if (sm) sm.style.display = 'none'; } catch(e){}

  showToast('✓ Logado como ' + (user.user_metadata?.full_name || user.email));
}

function onSignOut() {
  // Limpar uid do estado local
  if (typeof S !== 'undefined') {
    S.uid = null;
    if (typeof save === 'function') save();
  }
  if (typeof updateAuthUI === 'function') updateAuthUI(false);
  showToast('Sessão encerrada');
}

// ========== PLANOS E ACESSO ==========
async function loadUserPlan() {
  if (!currentUser) return;
  try {
    const { data, error } = await sbClient
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', currentUser.id)
      .single();

    if (error) throw error;

    // Checar se plano expirou
    if (data.plan !== 'free' && data.plan_expires_at) {
      const expires = new Date(data.plan_expires_at);
      if (expires < new Date()) {
        // Plano expirou → rebaixar para free
        await sbClient
          .from('profiles')
          .update({ plan: 'free', plan_expires_at: null })
          .eq('id', currentUser.id);
        data.plan = 'free';
      }
    }

    userPlan = data.plan || 'free';

    // Carregar detalhes do plano
    const { data: planData } = await sbClient
      .from('plans')
      .select('*')
      .eq('id', userPlan)
      .single();

    if (planData) {
      window._planDetails = planData;
    }
  } catch (e) {
    console.warn('[Plano] Erro ao carregar:', e.message);
    userPlan = 'free';
  }
}

// Verifica se o módulo está liberado no plano atual
// PAYWALL TOGGLE: check admin_settings for paywall_enabled flag
function isModuleUnlocked(moduleIndex) {
  // DEMO_MODE: everything unlocked, no paywall
  if (window.DEMO_MODE) return true;
  // Global unlock: if paywall is disabled via admin, everything is free
  if (window._paywallDisabled) return true;
  // Offline/unauthenticated: all modules open (freemium local experience)
  if (!syncEnabled || !currentUser) return true;
  // Custom plan with specific module access list
  if (window._planDetails?.modules_access) {
    return window._planDetails.modules_access.includes(moduleIndex);
  }
  // Free plan: first module of each discipline only (index 0 in each discipline group)
  if (userPlan === 'free') {
    const M = window.M || [];
    if (!M[moduleIndex]) return false;
    const disc = M[moduleIndex].discipline || 'economia';
    const firstInDisc = M.findIndex(m => (m.discipline || 'economia') === disc);
    return moduleIndex === firstInDisc;
  }
  // Paid plans: all modules
  return true;
}

// Load paywall setting from admin_settings (default: DISABLED = all free)
(async function loadPaywallSetting(){
  window._paywallDisabled = true; // Default: paywall OFF
  // OFFLINE_MODE / DEMO_MODE: always disabled
  if (window.OFFLINE_MODE || window.DEMO_MODE) return;
  try {
    if (typeof sbClient !== 'undefined' && sbClient) {
      const {data} = await sbClient.from('admin_settings').select('value').eq('key','paywall_enabled').single();
      if (data && data.value === 'true') window._paywallDisabled = false;
    }
  } catch(e) { /* Keep paywall disabled on error */ }
})()

// Verifica se uma feature está liberada
function isFeatureUnlocked(featureName) {
  if (!syncEnabled || !currentUser) return true;

  if (window._planDetails?.features) {
    return window._planDetails.features[featureName] === true;
  }

  // Fallback features free
  const freeFeatures = ['glossary', 'flashcards', 'chat_tutor'];
  if (userPlan === 'free') return freeFeatures.includes(featureName);
  return true;
}

// ========== SYNC: LOCAL ↔ CLOUD ==========

// Merge dados locais para a nuvem (primeira vez logando)
async function mergeLocalToCloud() {
  if (!currentUser || !sbClient) return;

  try {
    // 1. Carregar progresso da nuvem
    // Trata PGRST116 (no rows found) como estado vazio — não abortar sync
    const { data: cloudProgress, error: progressError } = await sbClient
      .from('progress')
      .select('*')
      .eq('profile_id', currentUser.id)
      .is('sub_profile_id', null)
      .maybeSingle(); // maybeSingle() retorna null sem erro quando não há linha

    // Ignorar erros que não sejam de conectividade (ex: row not found já tratado por maybeSingle)
    if (progressError) {
      console.warn('[Sync] Erro ao carregar progresso da nuvem:', progressError.message);
      // Continuar mesmo com erro — tentar sincronizar estado local
    }

    // 2. Carregar estado local
    const localState = typeof S !== 'undefined' ? S : null;
    if (!localState) return;

    // 3. Decidir merge: weighted score (lessons×3 + XP) + timestamp tiebreaker
    const localDone = localState.done ? Object.keys(localState.done).length : 0;
    const cloudDone = cloudProgress?.completed_lessons
      ? Object.keys(cloudProgress.completed_lessons).length
      : 0;
    const localXP = localState.xp || 0;
    const cloudXP = cloudProgress?.xp || 0;
    const localLast = localState.last ? new Date(localState.last).getTime() : 0;
    const cloudLast = cloudProgress?.last_study_date ? new Date(cloudProgress.last_study_date).getTime() : 0;
    const localScore = localDone * 3 + localXP;
    const cloudScore = cloudDone * 3 + cloudXP;
    const localWins = localScore > cloudScore || (localScore === cloudScore && localLast >= cloudLast);

    if (localWins) {
      // Local tem progresso igual ou maior → enviar para nuvem
      await syncProgressToCloud(localState);
      await syncNotesToCloud();
      await syncFavsToCloud();
      await syncTimelineToCloud();
    } else {
      // Nuvem tem mais progresso → carregar para local
      await syncProgressFromCloud(cloudProgress);
      await syncNotesFromCloud();
      await syncFavsFromCloud();
      await syncTimelineFromCloud();
      if (typeof ui === 'function') ui();
    }

    // 4. Sincronizar perfil
    await sbClient
      .from('profiles')
      .update({
        name: localState.name || 'Aluno',
        avatar: localState.avatar || '🧑‍🎓',
        onboarding_done: localState.name !== 'Aluno',
        theme: localStorage.getItem('escola_theme') || 'dark',
        daily_goal: (typeof getDailyGoal === 'function' && getDailyGoal()?.target) ? getDailyGoal().target : 3,
        pin: localStorage.getItem('escola_pin') || null,
        state: localState.state || null
      })
      .eq('id', currentUser.id);

  } catch (e) {
    console.warn('[Sync] Erro no merge:', e.message);
  }
}

// ========== SYNC: PROGRESSO ==========
async function syncProgressToCloud(state) {
  if (!currentUser || !sbClient) return;
  try {
    await sbClient
      .from('progress')
      .upsert({
        profile_id: currentUser.id,
        sub_profile_id: null,
        xp: state.xp || 0,
        level: state.lvl || 1,
        streak: state.streak || 0,
        last_study_date: state.last || null,
        current_module: state.cMod,
        current_lesson: state.cLes,
        completed_lessons: state.done || {},
        quiz_results: state.quiz || {}
      }, { onConflict: 'profile_id,sub_profile_id' });
  } catch (e) {
    console.warn('[Sync] Erro progresso→cloud:', e.message);
  }
}

async function syncProgressFromCloud(cloudData) {
  if (!cloudData || typeof S === 'undefined') return;
  S.xp = cloudData.xp || 0;
  S.lvl = cloudData.level || 1;
  S.streak = cloudData.streak || 0;
  S.last = cloudData.last_study_date || null;
  S.cMod = cloudData.current_module;
  S.cLes = cloudData.current_lesson;
  S.done = cloudData.completed_lessons || {};
  S.quiz = cloudData.quiz_results || {};
  if (typeof save === 'function') save();
}

// ========== SYNC: NOTAS ==========
async function syncNotesToCloud() {
  if (!currentUser || !sbClient) return;
  try {
    const notes = JSON.parse(localStorage.getItem('escola_notes') || '{}');
    const rows = Object.entries(notes).map(([key, content]) => ({
      profile_id: currentUser.id,
      sub_profile_id: null,
      lesson_key: key,
      content: content
    }));
    if (rows.length > 0) {
      await sbClient.from('notes').upsert(rows, { onConflict: 'profile_id,sub_profile_id,lesson_key' });
    }
  } catch (e) {
    console.warn('[Sync] Erro notas→cloud:', e.message);
  }
}

async function syncNotesFromCloud() {
  if (!currentUser || !sbClient) return;
  try {
    const { data } = await sbClient
      .from('notes')
      .select('lesson_key, content')
      .eq('profile_id', currentUser.id)
      .is('sub_profile_id', null);
    if (data) {
      const notes = {};
      data.forEach(n => { notes[n.lesson_key] = n.content; });
      localStorage.setItem('escola_notes', JSON.stringify(notes));
    }
  } catch (e) {
    console.warn('[Sync] Erro cloud→notas:', e.message);
  }
}

// ========== SYNC: FAVORITOS ==========
async function syncFavsToCloud() {
  if (!currentUser || !sbClient) return;
  try {
    const favs = JSON.parse(localStorage.getItem('escola_favs') || '[]');
    // Limpar favoritos antigos na nuvem
    await sbClient.from('favorites').delete().eq('profile_id', currentUser.id).is('sub_profile_id', null);
    // Inserir atuais
    const rows = favs.map(key => ({
      profile_id: currentUser.id,
      sub_profile_id: null,
      lesson_key: key
    }));
    if (rows.length > 0) {
      await sbClient.from('favorites').insert(rows);
    }
  } catch (e) {
    console.warn('[Sync] Erro favs→cloud:', e.message);
  }
}

async function syncFavsFromCloud() {
  if (!currentUser || !sbClient) return;
  try {
    const { data } = await sbClient
      .from('favorites')
      .select('lesson_key')
      .eq('profile_id', currentUser.id)
      .is('sub_profile_id', null);
    if (data) {
      localStorage.setItem('escola_favs', JSON.stringify(data.map(f => f.lesson_key)));
    }
  } catch (e) {
    console.warn('[Sync] Erro cloud→favs:', e.message);
  }
}

// ========== SYNC: TIMELINE ==========
async function syncTimelineToCloud() {
  if (!currentUser || !sbClient) return;
  try {
    const timeline = JSON.parse(localStorage.getItem('escola_timeline') || '[]');
    const rows = timeline.map(t => ({
      profile_id: currentUser.id,
      sub_profile_id: null,
      activity_type: t.type,
      description: t.text,
      created_at: new Date(t.ts).toISOString()
    }));
    if (rows.length > 0) {
      // Limpar e reinserir (timeline é append-only)
      await sbClient.from('timeline').delete().eq('profile_id', currentUser.id).is('sub_profile_id', null);
      await sbClient.from('timeline').insert(rows);
    }
  } catch (e) {
    console.warn('[Sync] Erro timeline→cloud:', e.message);
  }
}

async function syncTimelineFromCloud() {
  if (!currentUser || !sbClient) return;
  try {
    const { data } = await sbClient
      .from('timeline')
      .select('activity_type, description, created_at')
      .eq('profile_id', currentUser.id)
      .is('sub_profile_id', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) {
      const timeline = data.map(t => ({
        type: t.activity_type,
        text: t.description,
        ts: new Date(t.created_at).getTime()
      }));
      localStorage.setItem('escola_timeline', JSON.stringify(timeline));
    }
  } catch (e) {
    console.warn('[Sync] Erro cloud→timeline:', e.message);
  }
}

// ========== SYNC DEBOUNCED (para save() hooks) ==========
// Chamado toda vez que save() roda no app
function queueSync(type, data) {
  if (!syncEnabled || !currentUser) return;

  // Substituir item do mesmo tipo na fila
  syncQueue = syncQueue.filter(q => q.type !== type);
  syncQueue.push({ type, data, ts: Date.now() });

  // Debounce: sync a cada 3 segundos
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSyncQueue, 3000);
}

async function flushSyncQueue() {
  if (!syncEnabled || !currentUser || syncQueue.length === 0) return;

  const queue = [...syncQueue];
  syncQueue = [];

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'progress':
          await syncProgressToCloud(item.data);
          break;
        case 'notes':
          await syncNotesToCloud();
          break;
        case 'favs':
          await syncFavsToCloud();
          break;
        case 'timeline':
          await syncTimelineToCloud();
          break;
      }
    } catch (e) {
      console.warn('[Sync] Erro ao flush:', e.message);
      // Detect expired session and attempt refresh
      if (e.message && (e.message.includes('JWT') || e.message.includes('401') || e.message.includes('token'))) {
        try { await sbClient.auth.refreshSession(); } catch (re) {
          console.warn('[Sync] Session refresh failed:', re.message);
          syncEnabled = false;
          return;
        }
      }
      // Re-enqueue em caso de erro
      syncQueue.push(item);
    }
  }
}

// ========== HELPERS ==========
function isLoggedIn() {
  return !!currentUser;
}

function getUserEmail() {
  return currentUser?.email || '';
}

function getUserName() {
  return currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Aluno';
}

function getUserPlan() {
  return userPlan || 'free';
}

function getPlanLabel() {
  const labels = { free: 'Gratuito', premium: 'Premium', familia: 'Família' };
  return labels[userPlan] || 'Gratuito';
}

// ========== LEAD CAPTURE (email do onboarding) ==========
async function saveLeadEmail(email, name, ageGroup, lang) {
  if (!sbClient || !email) return;
  try {
    await sbClient.from('leads').upsert({
      email: email.toLowerCase().trim(),
      name: name || 'Aluno',
      age_group: ageGroup || null,
      lang: lang || 'pt',
      source: 'onboarding',
      created_at: new Date().toISOString()
    }, { onConflict: 'email' });
    console.log('[Lead] Email salvo:', email);
  } catch (e) {
    console.warn('[Lead] Erro ao salvar (tabela leads pode não existir):', e.message);
  }
}

// Toast helper (usa a função do app se disponível)
function showToast(msg) {
  if (typeof toast === 'function') {
    toast(msg);
  } else {
    console.log('[Toast]', msg);
  }
}
