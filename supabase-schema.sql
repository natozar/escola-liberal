-- ============================================
-- escola liberal — Supabase Database Schema
-- Desenvolvido para rota 2 (Integração Total)
-- ============================================

-- IMPORTANTE: Os comandos abaixo irão limpar as tabelas erradas do banco 
-- para garantir que as novas sejam recriadas perfeitamente.
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS timeline CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE; -- Tabela do arquivo auth js antigo

-- 1. Tabela de perfis públicos
-- NOTA: A coluna user_id foi removida — a PK `id` já é a referência ao auth.users.
-- Todo código que usava .eq('user_id', X) deve usar .eq('id', X) em profiles.
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  plan TEXT DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  onboarding_done BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'dark',
  daily_goal INTEGER DEFAULT 3,
  pin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Tabela de planos predefinidos
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  modules_access JSONB NOT NULL DEFAULT '[]',
  price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);

-- Inserindo planos básicos
INSERT INTO plans (id, name, features, modules_access, price)
VALUES
  ('free',     'Gratuito',        '{"glossary": true, "flashcards": true, "chat_tutor": true, "spaced_repetition": false}', '[0, 1]',             0),
  ('premium',  'Premium',         '{"glossary": true, "flashcards": true, "chat_tutor": true, "spaced_repetition": true}',  '[0,1,2,3,4,5,6]', 29.90),
  ('mensal',   'Premium Mensal',  '{"glossary": true, "flashcards": true, "chat_tutor": true, "spaced_repetition": true}',  '[0,1,2,3,4,5,6]', 29.90),
  ('anual',    'Premium Anual',   '{"glossary": true, "flashcards": true, "chat_tutor": true, "spaced_repetition": true}',  '[0,1,2,3,4,5,6]', 19.90),
  ('vitalicio','Acesso Vitalício','{"glossary": true, "flashcards": true, "chat_tutor": true, "spaced_repetition": true}',  '[0,1,2,3,4,5,6]', 497)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  features = EXCLUDED.features,
  modules_access = EXCLUDED.modules_access,
  price = EXCLUDED.price;

-- 3. Tabela de assinaturas (Stripe billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages subscriptions" ON subscriptions FOR ALL USING (auth.role() = 'service_role');

-- 4. Progresso do usuário (Gamification / Lições)
CREATE TABLE progress (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sub_profile_id UUID,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_study_date TIMESTAMPTZ,
  current_module INTEGER DEFAULT 0,
  current_lesson INTEGER DEFAULT 0,
  completed_lessons JSONB DEFAULT '{}',
  quiz_results JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, sub_profile_id)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progress" ON progress FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users write own progress" ON progress FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users update own progress" ON progress FOR UPDATE USING (auth.uid() = profile_id);

-- 5. Notas dos usuários nas aulas
CREATE TABLE notes (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sub_profile_id UUID,
  lesson_key TEXT NOT NULL,
  content TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, sub_profile_id, lesson_key)
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON notes FOR ALL USING (auth.uid() = profile_id);

-- 6. Favoritos do usuário
CREATE TABLE favorites (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sub_profile_id UUID,
  lesson_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON favorites FOR ALL USING (auth.uid() = profile_id);

-- 7. Timeline / Atividades
CREATE TABLE timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sub_profile_id UUID,
  activity_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own timeline" ON timeline FOR ALL USING (auth.uid() = profile_id);

-- 8. Trigger: Auto-criar perfil e assinatura no signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- user_id coluna removida; apenas id (PK) é necessário
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Aluno'));

  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_progress_profile ON progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_notes_profile ON notes(profile_id);

-- 10. Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_timestamp ON subscriptions;
DROP TRIGGER IF EXISTS update_profiles_timestamp ON profiles;
DROP TRIGGER IF EXISTS update_progress_timestamp ON progress;
DROP TRIGGER IF EXISTS update_notes_timestamp ON notes;

CREATE TRIGGER update_subscriptions_timestamp BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_progress_timestamp BEFORE UPDATE ON progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notes_timestamp BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
