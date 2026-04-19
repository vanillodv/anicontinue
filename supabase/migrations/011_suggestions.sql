-- Таблица пожеланий/предложений
CREATE TABLE IF NOT EXISTS suggestions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username    text,
  text        text NOT NULL CHECK (char_length(text) BETWEEN 10 AND 500),
  votes       integer DEFAULT 0,
  status      text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'done', 'declined')),
  created_at  timestamptz DEFAULT now()
);

-- Голоса (чтобы один пользователь не мог голосовать дважды)
CREATE TABLE IF NOT EXISTS suggestion_votes (
  suggestion_id uuid REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (suggestion_id, user_id)
);

-- RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Все видят пожелания
CREATE POLICY "suggestions_select_all" ON suggestions FOR SELECT USING (true);
-- Авторизованные создают
CREATE POLICY "suggestions_insert_auth" ON suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Только свои удаляют
CREATE POLICY "suggestions_delete_own" ON suggestions FOR DELETE USING (auth.uid() = user_id);
-- Обновление только через service role (для votes counter)
CREATE POLICY "suggestions_update_service" ON suggestions FOR UPDATE USING (true);

-- Голоса
CREATE POLICY "votes_select_all" ON suggestion_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_auth" ON suggestion_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete_own" ON suggestion_votes FOR DELETE USING (auth.uid() = user_id);

-- Функция toggle vote + обновление счётчика
CREATE OR REPLACE FUNCTION toggle_suggestion_vote(p_suggestion_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_exists boolean;
  v_votes  integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM suggestion_votes
    WHERE suggestion_id = p_suggestion_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM suggestion_votes WHERE suggestion_id = p_suggestion_id AND user_id = p_user_id;
    UPDATE suggestions SET votes = votes - 1 WHERE id = p_suggestion_id RETURNING votes INTO v_votes;
    RETURN jsonb_build_object('voted', false, 'votes', v_votes);
  ELSE
    INSERT INTO suggestion_votes (suggestion_id, user_id) VALUES (p_suggestion_id, p_user_id);
    UPDATE suggestions SET votes = votes + 1 WHERE id = p_suggestion_id RETURNING votes INTO v_votes;
    RETURN jsonb_build_object('voted', true, 'votes', v_votes);
  END IF;
END;
$$;
