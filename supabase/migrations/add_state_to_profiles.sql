-- Adicionar campo estado (UF) à tabela profiles
-- Para coletar localização geográfica dos alunos
-- Executar no Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state text;

-- Index para consultas de agregação geográfica
CREATE INDEX IF NOT EXISTS idx_profiles_state ON profiles(state) WHERE state IS NOT NULL;

-- Comentário
COMMENT ON COLUMN profiles.state IS 'UF do aluno (ex: SP, MG, RJ). Coletado no onboarding.';
