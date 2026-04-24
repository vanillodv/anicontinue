-- 022_ai_usage_logs_insert_policy.sql
-- Позволяет аутентифицированным пользователям писать свои логи расхода токенов.
-- Без этой политики INSERT через user-client tихо падал (RLS+SECURITY DEFINER блокирует).

CREATE POLICY "Users can insert own usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Пользователь видит свою историю; admins — всё (уже покрыто политикой из 004).
-- Проверяем что SELECT-политика не перекрывается:
-- "Users can view own AI usage" уже создана в 004 и покрывает auth.uid() = user_id.
-- Дублировать не нужно.
