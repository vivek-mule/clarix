-- ============================================================
--  Learning sessions persistence
--  Adds durable session storage so users can resume sessions.
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_sessions (
    id              UUID PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'active',
    state           JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reuse the existing helper trigger function from 001_initial_schema.sql.
DROP TRIGGER IF EXISTS trg_learning_sessions_updated_at ON learning_sessions;
CREATE TRIGGER trg_learning_sessions_updated_at
    BEFORE UPDATE ON learning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own learning sessions"
    ON learning_sessions FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own learning sessions"
    ON learning_sessions FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own learning sessions"
    ON learning_sessions FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete their own learning sessions"
    ON learning_sessions FOR DELETE
    USING (auth.uid() = student_id);
