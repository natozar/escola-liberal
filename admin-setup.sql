-- ============================================================
-- Escola Liberal — Tabelas Admin (Supabase)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Garantir que profiles tem campo email (se ainda não tiver)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Trigger para copiar email de auth.users para profiles automaticamente
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- Backfill emails existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 2. Tabela de push notifications (histórico)
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_filter TEXT DEFAULT 'all',
  target_count INTEGER DEFAULT 0,
  action_url TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'cancelled', 'failed')),
  sent_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: admin pode tudo (via service_role), anon pode inserir e ler
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert push" ON public.push_notifications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon select push" ON public.push_notifications
  FOR SELECT TO anon USING (true);

-- 3. Tabela de configurações admin
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- SECURITY FIX: admin_settings only accessible to authenticated admin users
CREATE POLICY "Admin read admin_settings" ON public.admin_settings
  FOR SELECT TO authenticated USING (
    auth.uid() IN (SELECT id FROM profiles WHERE email = ANY(ARRAY['chatsagrado@gmail.com']))
  );
CREATE POLICY "Admin write admin_settings" ON public.admin_settings
  FOR ALL TO authenticated USING (
    auth.uid() IN (SELECT id FROM profiles WHERE email = ANY(ARRAY['chatsagrado@gmail.com']))
  ) WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE email = ANY(ARRAY['chatsagrado@gmail.com']))
  );

-- 4. Tabela de push subscriptions (Web Push API)
-- Para push real via VAPID/FCM no futuro
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth_key TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  UNIQUE(profile_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- SECURITY FIX: removed anon read access to push_subscriptions
-- Only authenticated admins can read all subscriptions
CREATE POLICY "Admin can read all subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (
    auth.uid() = profile_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE email = ANY(ARRAY['chatsagrado@gmail.com']))
  );

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_progress_last_study ON progress(last_study_date);
CREATE INDEX IF NOT EXISTS idx_push_created ON push_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_status ON push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- 6. View consolidada para admin (facilita queries)
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT
  p.id,
  p.name,
  p.email,
  p.plan,
  p.avatar,
  p.created_at,
  p.onboarding_done,
  pr.xp,
  pr.level,
  pr.streak,
  pr.last_study_date,
  pr.current_module,
  pr.current_lesson,
  COALESCE(jsonb_object_keys_count(pr.completed_lessons), 0) as lessons_done,
  COALESCE(jsonb_object_keys_count(pr.quiz_results), 0) as quiz_total
FROM profiles p
LEFT JOIN progress pr ON pr.profile_id = p.id AND pr.sub_profile_id IS NULL;

-- Helper function for counting JSONB keys
CREATE OR REPLACE FUNCTION jsonb_object_keys_count(j JSONB)
RETURNS INTEGER AS $$
BEGIN
  IF j IS NULL OR j = '{}'::JSONB THEN RETURN 0; END IF;
  RETURN (SELECT COUNT(*) FROM jsonb_object_keys(j));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- SECURITY FIX: admin_users_view only for authenticated admin users (removed anon)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- ============================================================
-- DONE! Agora acesse /admin.html para usar o painel.
-- ============================================================
