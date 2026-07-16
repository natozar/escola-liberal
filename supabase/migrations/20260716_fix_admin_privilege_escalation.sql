-- ============================================================
-- FIX CRÍTICO — escalonamento de privilégio via profiles.is_admin
-- Descoberto na auditoria de RLS (2026-07-16).
--
-- PROBLEMA: o role `authenticated` tinha privilégio UPDATE na coluna
-- profiles.is_admin, e a policy profiles_update_own permite atualizar a
-- própria linha. O trigger protect_plan_fields revertia apenas plan/
-- plan_expires_at — NÃO is_admin. Resultado: qualquer usuário logado podia
-- fazer `PATCH profiles {is_admin:true}` na própria linha e virar admin,
-- ganhando acesso de leitura a profiles (CPF hash, email, nome) e leads
-- (todos os emails) de todos os usuários via as policies *_select_admin.
--
-- Verificado: os 2 admins existentes são legítimos (a falha não foi explorada).
--
-- Idempotente. Rollback no fim.
-- ============================================================

-- Camada 1: o trigger passa a reverter is_admin para usuários autenticados
CREATE OR REPLACE FUNCTION public.protect_plan_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    NEW.plan := OLD.plan;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.is_admin := OLD.is_admin;   -- fecha o escalonamento de privilégio
  END IF;
  RETURN NEW;
END;
$fn$;

-- Camada 2 (defense-in-depth): revoga o privilégio de coluna — o UPDATE nem
-- chega ao trigger. Mesmo que uma camada falhe, a outra segura.
REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated, anon;

-- ============================================================
-- VERIFICAÇÃO (deve mostrar is_admin protegido no trigger e 0 privilégios):
--   SELECT pg_get_functiondef('public.protect_plan_fields'::regproc) LIKE '%NEW.is_admin%';
--   SELECT count(*) FROM information_schema.column_privileges
--     WHERE table_name='profiles' AND column_name='is_admin'
--     AND grantee IN ('authenticated','anon') AND privilege_type='UPDATE';  -- deve ser 0
--
-- ROLLBACK (não recomendado — reabre a falha):
--   GRANT UPDATE (is_admin) ON public.profiles TO authenticated;
--   -- e remover a linha NEW.is_admin do trigger
-- ============================================================
