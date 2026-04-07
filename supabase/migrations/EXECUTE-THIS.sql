-- ================================================================
-- ESCOLA LIBERAL — ALL PENDING MIGRATIONS (consolidated)
-- ================================================================
-- Date: 2026-04-04
-- Execute in: Supabase SQL Editor
--   https://supabase.com/dashboard → SQL Editor → New query → Paste → Run
--
-- This script is IDEMPOTENT — safe to run multiple times.
-- All CREATE/ALTER use IF NOT EXISTS guards.
-- All CREATE POLICY use DROP POLICY IF EXISTS before CREATE.
--
-- Contents:
--   1. Schema: weekly_xp table (leaderboard)
--   2. Schema: profiles.state column (geography)
--   3. Schema: debate_messages table (debate ao vivo)
--   4. RLS policies for ALL tables (profiles, progress, notes, favorites,
--      timeline, weekly_xp, subscriptions, admin_settings, leads, plans,
--      debate_messages)
--   5. Performance indexes (14 indexes)
--   6. Trigger: protect_plan_fields (prevents client from changing plan)
--   7. Trigger: handle_new_user (auto-create profile on signup)
--   8. Verification queries
-- ================================================================

BEGIN;

-- ============================================================
-- 1. SCHEMA: weekly_xp table (leaderboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_xp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  league INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  avatar TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

COMMENT ON TABLE weekly_xp IS 'Weekly XP leaderboard — resets every Monday. Clients sync via upsert.';

-- ============================================================
-- 2. SCHEMA: profiles.state column (geography)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;

COMMENT ON COLUMN profiles.state IS 'UF do usuario (ex: SP, MG, RJ). Coletado no onboarding.';

-- ============================================================
-- 3. SCHEMA: debate_messages table (debate ao vivo)
-- ============================================================

CREATE TABLE IF NOT EXISTS debate_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Aluno',
  user_avatar TEXT DEFAULT '🧑‍🎓',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE debate_messages IS 'Mensagens do debate ao vivo. Salas fixas. Realtime via Supabase channels.';

-- Enable Realtime (safe to run multiple times — Supabase ignores duplicates)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE debate_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. RLS POLICIES — ALL TABLES
-- Pattern: DROP IF EXISTS → CREATE (idempotent)
-- ============================================================

-- 4a. PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4b. PROGRESS
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_own" ON progress;
CREATE POLICY "progress_select_own" ON progress
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "progress_insert_own" ON progress;
CREATE POLICY "progress_insert_own" ON progress
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "progress_update_own" ON progress;
CREATE POLICY "progress_update_own" ON progress
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 4c. NOTES
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_own" ON notes;
CREATE POLICY "notes_select_own" ON notes
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_insert_own" ON notes;
CREATE POLICY "notes_insert_own" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_update_own" ON notes;
CREATE POLICY "notes_update_own" ON notes
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_delete_own" ON notes;
CREATE POLICY "notes_delete_own" ON notes
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- 4d. FAVORITES
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- 4e. TIMELINE
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timeline_select_own" ON timeline;
CREATE POLICY "timeline_select_own" ON timeline
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "timeline_insert_own" ON timeline;
CREATE POLICY "timeline_insert_own" ON timeline
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "timeline_delete_own" ON timeline;
CREATE POLICY "timeline_delete_own" ON timeline
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- 4f. WEEKLY_XP (leaderboard — public read, write own)
ALTER TABLE weekly_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_xp_select_all" ON weekly_xp;
CREATE POLICY "weekly_xp_select_all" ON weekly_xp
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "weekly_xp_insert_own" ON weekly_xp;
CREATE POLICY "weekly_xp_insert_own" ON weekly_xp
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "weekly_xp_update_own" ON weekly_xp;
CREATE POLICY "weekly_xp_update_own" ON weekly_xp
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4g. SUBSCRIPTIONS (read own, write via service_role only)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4h. ADMIN_SETTINGS (selective read, write via service_role only)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_select_public" ON admin_settings;
CREATE POLICY "admin_settings_select_public" ON admin_settings
  FOR SELECT TO authenticated
  USING (key = 'paywall_enabled' OR key LIKE 'tutor:%');

DROP POLICY IF EXISTS "admin_settings_select_anon" ON admin_settings;
CREATE POLICY "admin_settings_select_anon" ON admin_settings
  FOR SELECT TO anon
  USING (key = 'paywall_enabled');

-- 4i. LEADS (insert only, no read for clients)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_insert_anon" ON leads;
CREATE POLICY "leads_insert_anon" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4j. PLANS (public read if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans' AND table_schema = 'public') THEN
    ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "plans_select_all" ON plans;
    CREATE POLICY "plans_select_all" ON plans
      FOR SELECT TO authenticated, anon
      USING (true);
  END IF;
END $$;

-- 4k. DEBATE_MESSAGES (public read, write own)
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debate_select_all" ON debate_messages;
CREATE POLICY "debate_select_all" ON debate_messages
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "debate_insert_own" ON debate_messages;
CREATE POLICY "debate_insert_own" ON debate_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_weekly_xp_week ON weekly_xp(week_id, xp DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_xp_user_week ON weekly_xp(user_id, week_id);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON profiles(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_progress_profile ON progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_progress_profile_sub ON progress(profile_id, sub_profile_id);
CREATE INDEX IF NOT EXISTS idx_notes_profile ON notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_favorites_profile ON favorites(profile_id);
CREATE INDEX IF NOT EXISTS idx_timeline_profile ON timeline(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);
CREATE INDEX IF NOT EXISTS idx_debate_room_time ON debate_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debate_user ON debate_messages(user_id);

-- ============================================================
-- 6. TRIGGER: Protect plan fields from client modification
-- ============================================================

CREATE OR REPLACE FUNCTION protect_plan_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    NEW.plan := OLD.plan;
    NEW.plan_expires_at := OLD.plan_expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_plan_trigger ON profiles;
CREATE TRIGGER protect_plan_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_plan_fields();

-- ============================================================
-- 7. TRIGGER: Auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, plan, name, avatar, onboarding_done)
  VALUES (
    NEW.id,
    'free',
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Aluno'),
    '🧑‍🎓',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMIT;

-- ================================================================
-- 8. VERIFICATION — Run these queries after execution to confirm
-- ================================================================

-- Check RLS is enabled on all tables:
SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('profiles','progress','notes','favorites','timeline',
                     'weekly_xp','subscriptions','admin_settings','leads',
                     'debate_messages')
  ORDER BY tablename;

-- Check all policies exist:
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;

-- Check tables have expected columns:
SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name IN ('weekly_xp','debate_messages','profiles')
  AND column_name IN ('week_id','xp','league','room_id','text','state')
  ORDER BY table_name, column_name;

-- Check triggers:
SELECT trigger_name, event_object_table, action_timing, event_manipulation
  FROM information_schema.triggers
  WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
  ORDER BY trigger_name;

-- Check indexes:
SELECT indexname, tablename FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  ORDER BY tablename, indexname;

-- ============================================================
-- 9. AGE GATE: Schema + RLS + Trigger (18+ enforcement)
-- ============================================================

-- 9a. Add age columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_group TEXT DEFAULT NULL;

-- 9b. Trigger: validate_age_gate — enforce consistency on every write
CREATE OR REPLACE FUNCTION validate_age_gate()
RETURNS TRIGGER AS $$
BEGIN
  -- If birth_year indicates under 18, force blocked
  IF NEW.birth_year IS NOT NULL AND (EXTRACT(YEAR FROM NOW()) - NEW.birth_year) < 18 THEN
    NEW.age_group := 'blocked';
  END IF;
  -- Prevent changing blocked→adult if birth_year still indicates minor
  IF OLD IS NOT NULL AND OLD.age_group = 'blocked' AND NEW.age_group = 'adult' THEN
    IF NEW.birth_year IS NOT NULL AND (EXTRACT(YEAR FROM NOW()) - NEW.birth_year) < 18 THEN
      NEW.age_group := 'blocked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_age_gate ON profiles;
CREATE TRIGGER tr_validate_age_gate
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_age_gate();

-- 9c. RLS: block underage access on profiles
DROP POLICY IF EXISTS "block_underage_profiles" ON profiles;
CREATE POLICY "block_underage_profiles" ON profiles
  FOR ALL USING (
    age_group IS NULL   -- not yet verified (allow onboarding to complete)
    OR age_group = 'adult'
    -- age_group = 'blocked' → row invisible via RLS
  );

-- 9d. RLS: block underage access on progress (via JOIN)
DROP POLICY IF EXISTS "block_underage_progress" ON progress;
CREATE POLICY "block_underage_progress" ON progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = progress.profile_id
      AND (p.age_group IS NULL OR p.age_group = 'adult')
    )
  );

-- 9e. RLS: block underage access on notes
DROP POLICY IF EXISTS "block_underage_notes" ON notes;
CREATE POLICY "block_underage_notes" ON notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = notes.profile_id
      AND (p.age_group IS NULL OR p.age_group = 'adult')
    )
  );

-- 9f. RLS: block underage access on favorites
DROP POLICY IF EXISTS "block_underage_favorites" ON favorites;
CREATE POLICY "block_underage_favorites" ON favorites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = favorites.profile_id
      AND (p.age_group IS NULL OR p.age_group = 'adult')
    )
  );

-- 9g. RLS: block underage access on timeline
DROP POLICY IF EXISTS "block_underage_timeline" ON timeline;
CREATE POLICY "block_underage_timeline" ON timeline
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = timeline.profile_id
      AND (p.age_group IS NULL OR p.age_group = 'adult')
    )
  );

-- 9h. RLS: block underage access on weekly_xp
DROP POLICY IF EXISTS "block_underage_weekly_xp" ON weekly_xp;
CREATE POLICY "block_underage_weekly_xp" ON weekly_xp
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = weekly_xp.profile_id
      AND (p.age_group IS NULL OR p.age_group = 'adult')
    )
  );

-- 9i. Verification: check age gate columns and trigger
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'profiles'
  AND column_name IN ('birth_year', 'age_verified_at', 'age_group')
  ORDER BY column_name;

SELECT trigger_name FROM information_schema.triggers
  WHERE event_object_table = 'profiles'
  AND trigger_name = 'tr_validate_age_gate';

-- ============================================================
-- 10. CPF VERIFICATION: Schema (Lei Felca compliance)
-- ============================================================

-- cpf_hash: SHA-256 of CPF (NEVER store raw CPF)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf_hash TEXT;

-- verification_method: 'cpf_serpro' | 'self_declaration' | 'self_declaration_fallback' | 'govbr'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'self_declaration';

-- ============================================================
-- 11. MODERATION LOG (resolve TODO moderation.js:356)
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  room_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own moderation logs" ON moderation_log;
CREATE POLICY "Users read own moderation logs" ON moderation_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role insert moderation logs" ON moderation_log;
CREATE POLICY "Service role insert moderation logs" ON moderation_log FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_moderation_log_user ON moderation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_room ON moderation_log(room_id);

-- ============================================================
-- 12. CERTIFICATES (verifiable via public URL)
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  profile_id UUID REFERENCES profiles(id),
  module_index INTEGER NOT NULL,
  discipline TEXT,
  user_name TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can verify certificates" ON certificates;
CREATE POLICY "Anyone can verify certificates" ON certificates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users create certificates" ON certificates;
CREATE POLICY "Authenticated users create certificates" ON certificates FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Verification: check all new tables and columns
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'profiles'
  AND column_name IN ('cpf_hash', 'verification_method')
  ORDER BY column_name;
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('moderation_log', 'certificates')
  ORDER BY table_name;

-- ============================================================
-- 13. ADMIN ACCESS: is_admin flag + RLS policies for admin reads
-- ============================================================

-- Add is_admin flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: admin can read all
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- Progress: admin can read all
DROP POLICY IF EXISTS "progress_select_admin" ON progress;
CREATE POLICY "progress_select_admin" ON progress FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

-- Leads: admin can read all (was INSERT-only for anon)
DROP POLICY IF EXISTS "leads_select_admin" ON leads;
CREATE POLICY "leads_select_admin" ON leads FOR SELECT
  USING (is_admin());

-- Notes: admin can read all
DROP POLICY IF EXISTS "notes_select_admin" ON notes;
CREATE POLICY "notes_select_admin" ON notes FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

-- Favorites: admin can read all
DROP POLICY IF EXISTS "favorites_select_admin" ON favorites;
CREATE POLICY "favorites_select_admin" ON favorites FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

-- Timeline: admin can read all
DROP POLICY IF EXISTS "timeline_select_admin" ON timeline;
CREATE POLICY "timeline_select_admin" ON timeline FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

-- Weekly XP: admin can read all
DROP POLICY IF EXISTS "weekly_xp_select_admin" ON weekly_xp;
CREATE POLICY "weekly_xp_select_admin" ON weekly_xp FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

-- Subscriptions: admin can read all
DROP POLICY IF EXISTS "subscriptions_select_admin" ON subscriptions;
CREATE POLICY "subscriptions_select_admin" ON subscriptions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Admin Settings: admin can read + write
DROP POLICY IF EXISTS "admin_settings_admin" ON admin_settings;
CREATE POLICY "admin_settings_admin" ON admin_settings FOR ALL
  USING (is_admin());

-- Moderation Log: admin can read all
DROP POLICY IF EXISTS "moderation_log_select_admin" ON moderation_log;
CREATE POLICY "moderation_log_select_admin" ON moderation_log FOR SELECT
  USING (is_admin() OR auth.uid() = user_id);

-- Verification
SELECT 'Admin policies created' AS status;
SELECT policyname, tablename FROM pg_policies
  WHERE policyname LIKE '%admin%'
  ORDER BY tablename;
