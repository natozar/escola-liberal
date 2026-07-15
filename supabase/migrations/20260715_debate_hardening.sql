-- ============================================================
-- DEBATE HARDENING — validação server-side de debate_messages
-- Gerado 2026-07-15 pela auditoria QA forense.
--
-- PROBLEMA: a RLS de INSERT só checava `user_id = auth.uid()`. Toda a
-- moderação (idade, rate limit, dados pessoais, avatar) rodava só no
-- cliente — quem postasse via REST com a anon key pública pulava tudo:
--   • gravava payload XSS no avatar (renderizado na tela de todos)
--   • publicava telefone/CPF/email (violação LGPD)
--   • floodava sem cooldown
--   • menores bloqueados por idade ainda postavam (debate_messages não
--     estava na lista de RLS de age gate)
--
-- Este script fecha isso no servidor. Idempotente (DROP IF EXISTS → CREATE).
-- Como aplicar: Supabase Dashboard → SQL Editor → colar tudo → Run.
-- Reversível: ver bloco "ROLLBACK" comentado no fim.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TRIGGER de validação (roda antes de cada INSERT)
--    SECURITY DEFINER: lê profiles ignorando RLS.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_debate_message()
RETURNS TRIGGER AS $$
DECLARE
  v_age_group text;
  v_recent    int;
  v_hourly    int;
BEGIN
  -- 1a. AGE GATE — menor bloqueado não posta (Lei 15.211/2025)
  SELECT age_group INTO v_age_group FROM profiles WHERE id = NEW.user_id;
  IF v_age_group = 'blocked' THEN
    RAISE EXCEPTION 'Usuário bloqueado por idade não pode participar do debate.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 1b. RATE LIMIT — cooldown de 5s entre mensagens (mesmo do cliente)
  SELECT count(*) INTO v_recent FROM debate_messages
    WHERE user_id = NEW.user_id AND created_at > now() - interval '5 seconds';
  IF v_recent > 0 THEN
    RAISE EXCEPTION 'Aguarde alguns segundos antes de enviar outra mensagem.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 1c. RATE LIMIT — máximo 30 mensagens por hora
  SELECT count(*) INTO v_hourly FROM debate_messages
    WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
  IF v_hourly >= 30 THEN
    RAISE EXCEPTION 'Limite de mensagens por hora atingido. Tente mais tarde.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 1d. XSS DEFENSE — neutraliza avatar/nome com HTML em vez de rejeitar
  --     (defense-in-depth; o cliente já escapa na renderização com _esc)
  IF NEW.user_avatar IS NULL OR NEW.user_avatar ~ '[<>&"]' OR char_length(NEW.user_avatar) > 16 THEN
    NEW.user_avatar := '🧑‍🎓';
  END IF;
  IF NEW.user_name ~ '[<>]' THEN
    NEW.user_name := regexp_replace(NEW.user_name, '[<>]', '', 'g');
  END IF;
  NEW.user_name := left(coalesce(NEW.user_name, 'Aluno'), 40);

  -- 1e. LGPD — bloqueio de dados pessoais (reforço server-side do filtro do cliente).
  --     Regexes validados contra falso-positivo: valores monetários com pontos de
  --     milhar (50.000.000.000) e percentuais NÃO disparam; só CPF/telefone/email.
  --     O CPF formatado exige o traço (distingue de valor monetário); o cru exige
  --     exatamente 11 dígitos isolados (word boundary).
  IF NEW.text ~ '\y\d{3}\.?\d{3}\.?\d{3}-\d{2}\y'                        -- CPF formatado (traço obrigatório)
     OR NEW.text ~ '\y\d{11}\y'                                          -- CPF/celular sem formatação (11 dígitos)
     OR NEW.text ~ '\(\d{2}\)\s?9?\d{4}-?\d{4}'                          -- telefone com DDD entre ()
     OR NEW.text ~ '\y\d{2}\s?9\d{4}-\d{4}\y'                            -- celular DD 9XXXX-XXXX
     OR NEW.text ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'   -- email
  THEN
    RAISE EXCEPTION 'Não compartilhe dados pessoais (telefone, CPF, email) no debate.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_debate_message ON debate_messages;
CREATE TRIGGER trg_validate_debate_message
  BEFORE INSERT ON debate_messages
  FOR EACH ROW EXECUTE FUNCTION validate_debate_message();

-- ------------------------------------------------------------
-- 2. RLS reforçada — valida o que dá para validar declarativamente
--    (o trigger cobre o resto). Substitui a policy antiga.
-- ------------------------------------------------------------
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debate_insert_own" ON debate_messages;
CREATE POLICY "debate_insert_own" ON debate_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND char_length(text) BETWEEN 1 AND 500
    AND char_length(coalesce(user_name, '')) <= 40
    AND user_name !~ '[<>]'
  );

-- SELECT continua liberado (leitura pública do debate) — sem alteração.

-- ============================================================
-- VERIFICAÇÃO (rode após aplicar, deve retornar as linhas esperadas):
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'debate_messages'::regclass;
--   SELECT polname FROM pg_policy WHERE polrelid = 'debate_messages'::regclass;
--
-- TESTE MANUAL (opcional, no SQL Editor autenticado como um usuário):
--   -- deve FALHAR (avatar com HTML é neutralizado; texto vazio rejeitado):
--   INSERT INTO debate_messages(room_id,user_id,user_name,user_avatar,text)
--   VALUES('economia', auth.uid(), 'x', '<img src=x onerror=alert(1)>', 'oi');
--   -- ↑ insere, mas user_avatar salvo = '🧑‍🎓' (neutralizado)
--
-- ============================================================
-- ROLLBACK (se precisar reverter):
--   DROP TRIGGER IF EXISTS trg_validate_debate_message ON debate_messages;
--   DROP FUNCTION IF EXISTS validate_debate_message();
--   DROP POLICY IF EXISTS "debate_insert_own" ON debate_messages;
--   CREATE POLICY "debate_insert_own" ON debate_messages
--     FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- ============================================================
