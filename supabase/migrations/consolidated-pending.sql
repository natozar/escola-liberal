-- ================================================================
-- ESCOLA LIBERAL — Consolidated Pending Migrations
-- ================================================================
-- Date: 2026-04-02
-- Execute in: Supabase SQL Editor (https://supabase.com/dashboard/project/hwjplecfqsckfiwxiedo/sql/new)
--
-- This script is IDEMPOTENT — safe to run multiple times.
-- All CREATE/ALTER use IF NOT EXISTS/IF EXISTS guards.
-- All CREATE POLICY use DROP POLICY IF EXISTS before CREATE.
--
-- Contents:
--   1. Schema: weekly_xp table (leaderboard)
--   2. Schema: profiles.state column (geography)
--   3. RLS policies for ALL 9 tables
--   4. Performance indexes
--   5. Utility: auto-create profile on signup trigger
--   6. Rollback section (commented out)
-- ================================================================

BEGIN;

-- ============================================================
-- 1. SCHEMA: weekly_xp table (leaderboard)
-- Source: 20260331_leaderboard.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_xp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,           -- e.g. "2026-W14"
  xp INTEGER NOT NULL DEFAULT 0,
  league INTEGER NOT NULL DEFAULT 0,  -- 0=bronze, 1=silver, 2=gold, 3=diamond, 4=ruby
  name TEXT,
  avatar TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

COMMENT ON TABLE weekly_xp IS 'Weekly XP leaderboard — resets every Monday. Clients sync via upsert.';

-- ============================================================
-- 2. SCHEMA: profiles.state column (geography)
-- Source: add_state_to_profiles.sql
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;

COMMENT ON COLUMN profiles.state IS 'UF do aluno (ex: SP, MG, RJ). Coletado no onboarding step 3.';

-- ============================================================
-- 3. RLS POLICIES — ALL TABLES
-- Source: SECURITY-AUDIT.md recommendations
--
-- Pattern: DROP IF EXISTS → CREATE
-- This makes the script re-runnable without "policy already exists" errors.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 3a. PROFILES
-- Users read/update own profile only. Plan field immutable from client.
-- ────────────────────────────────────────────────────────────
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
-- NOTE: To prevent client from changing plan/plan_expires_at directly,
-- use a BEFORE UPDATE trigger (see section 5) since WITH CHECK cannot
-- reference OLD in Supabase/Postgres RLS. The RLS here restricts row
-- access; the trigger enforces column-level immutability.

-- ────────────────────────────────────────────────────────────
-- 3b. PROGRESS
-- Users manage only their own progress. No delete allowed.
-- ────────────────────────────────────────────────────────────
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

-- No DELETE policy — progress is permanent

-- ────────────────────────────────────────────────────────────
-- 3c. NOTES
-- Users CRUD only their own notes.
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 3d. FAVORITES
-- Users manage only their own favorites. Upsert pattern (delete+insert).
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 3e. TIMELINE
-- Users manage only their own timeline. Sync uses delete+insert.
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 3f. WEEKLY_XP (leaderboard)
-- Public read (leaderboard), write only own.
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 3g. SUBSCRIPTIONS
-- Read own only. Write via service_role (Edge Functions) only.
-- ────────────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for clients — Edge Functions use service_role

-- ────────────────────────────────────────────────────────────
-- 3h. ADMIN_SETTINGS
-- Selective read only. Write via service_role only.
-- ────────────────────────────────────────────────────────────
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_select_public" ON admin_settings;
CREATE POLICY "admin_settings_select_public" ON admin_settings
  FOR SELECT TO authenticated
  USING (
    key = 'paywall_enabled'
    OR key LIKE 'tutor:%'
  );

-- Also allow anon to read paywall setting (app works without login)
DROP POLICY IF EXISTS "admin_settings_select_anon" ON admin_settings;
CREATE POLICY "admin_settings_select_anon" ON admin_settings
  FOR SELECT TO anon
  USING (key = 'paywall_enabled');

-- No INSERT/UPDATE/DELETE for clients — service_role only

-- ────────────────────────────────────────────────────────────
-- 3i. LEADS
-- Insert only (anon + authenticated). No read for clients.
-- ────────────────────────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_insert_anon" ON leads;
CREATE POLICY "leads_insert_anon" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE for clients — admin dashboard uses service_role

-- ────────────────────────────────────────────────────────────
-- 3j. PLANS (config table)
-- Public read. No write for clients.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans' AND table_schema = 'public') THEN
    ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "plans_select_all" ON plans;
    CREATE POLICY "plans_select_all" ON plans
      FOR SELECT TO authenticated, anon
      USING (true);
  END IF;
END $$;


-- ============================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================

-- weekly_xp: fast leaderboard queries by week
CREATE INDEX IF NOT EXISTS idx_weekly_xp_week
  ON weekly_xp(week_id, xp DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_xp_user_week
  ON weekly_xp(user_id, week_id);

-- profiles: geography aggregation
CREATE INDEX IF NOT EXISTS idx_profiles_state
  ON profiles(state) WHERE state IS NOT NULL;

-- progress: lookup by profile_id (most frequent query)
CREATE INDEX IF NOT EXISTS idx_progress_profile
  ON progress(profile_id);

CREATE INDEX IF NOT EXISTS idx_progress_profile_sub
  ON progress(profile_id, sub_profile_id);

-- notes: lookup by profile_id + lesson_key
CREATE INDEX IF NOT EXISTS idx_notes_profile
  ON notes(profile_id);

-- favorites: lookup by profile_id
CREATE INDEX IF NOT EXISTS idx_favorites_profile
  ON favorites(profile_id);

-- timeline: lookup by profile_id, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_timeline_profile
  ON timeline(profile_id, created_at DESC);

-- subscriptions: lookup by user_id and stripe IDs
CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust
  ON subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- admin_settings: key lookup (already PK if key is PK, but just in case)
CREATE INDEX IF NOT EXISTS idx_admin_settings_key
  ON admin_settings(key);


-- ============================================================
-- 5. UTILITY: Protect plan field from client-side modification
-- ============================================================
-- Trigger that prevents clients from changing plan/plan_expires_at
-- Only service_role (Edge Functions / webhooks) can modify these fields.

CREATE OR REPLACE FUNCTION protect_plan_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If the request is from an authenticated user (not service_role),
  -- prevent modification of plan-related fields
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

COMMENT ON FUNCTION protect_plan_fields IS 'Prevents authenticated users from modifying plan/plan_expires_at. Only service_role can change these.';


-- ============================================================
-- 6. UTILITY: Auto-create profile on user signup
-- ============================================================
-- When a new user signs up via Supabase Auth, automatically create
-- a row in profiles with default values.

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

COMMENT ON FUNCTION handle_new_user IS 'Auto-creates a profiles row when a new user signs up. Sets plan=free, name from Google metadata.';


COMMIT;

-- ================================================================
-- VERIFICATION: Run after execution to confirm everything applied
-- ================================================================
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   AND tablename IN ('profiles','progress','notes','favorites','timeline',
--                      'weekly_xp','subscriptions','admin_settings','leads','plans')
--   ORDER BY tablename;
--
-- Expected: rowsecurity = true for ALL tables
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;


-- ================================================================
-- ROLLBACK (uncomment and run ONLY if you need to undo everything)
-- ================================================================
-- WARNING: This will delete data and remove security policies.
-- Only use in development/testing environments.
--
-- BEGIN;
--
-- -- Remove triggers
-- DROP TRIGGER IF EXISTS protect_plan_trigger ON profiles;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS protect_plan_fields();
-- DROP FUNCTION IF EXISTS handle_new_user();
--
-- -- Remove indexes
-- DROP INDEX IF EXISTS idx_weekly_xp_week;
-- DROP INDEX IF EXISTS idx_weekly_xp_user_week;
-- DROP INDEX IF EXISTS idx_profiles_state;
-- DROP INDEX IF EXISTS idx_progress_profile;
-- DROP INDEX IF EXISTS idx_progress_profile_sub;
-- DROP INDEX IF EXISTS idx_notes_profile;
-- DROP INDEX IF EXISTS idx_favorites_profile;
-- DROP INDEX IF EXISTS idx_timeline_profile;
-- DROP INDEX IF EXISTS idx_subscriptions_user;
-- DROP INDEX IF EXISTS idx_subscriptions_stripe_sub;
-- DROP INDEX IF EXISTS idx_subscriptions_stripe_cust;
-- DROP INDEX IF EXISTS idx_admin_settings_key;
--
-- -- Remove RLS policies (all tables)
-- DO $$ DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
--   END LOOP;
-- END $$;
--
-- -- Disable RLS (keeps data accessible but unprotected)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE progress DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE timeline DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_xp DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
--
-- -- Remove schema additions
-- ALTER TABLE profiles DROP COLUMN IF EXISTS state;
-- DROP TABLE IF EXISTS weekly_xp;
--
-- COMMIT;
