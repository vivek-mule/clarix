-- ============================================================
--  Adaptive Learning Platform — Supabase SQL Migration
--  Tables: student_profiles, quiz_attempts, session_logs
--  All tables have Row-Level Security (RLS) enabled.
-- ============================================================


-- ────────────────────────────────────────────────────────────
--  1. student_profiles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_profiles (
    id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    subject              TEXT NOT NULL,
    onboarding_complete  BOOLEAN DEFAULT FALSE,
    learning_style       TEXT,
    knowledge_levels     JSONB DEFAULT '{}',
    learning_path        JSONB DEFAULT '[]',
    current_module_index INT DEFAULT 0,
    completed_modules    JSONB DEFAULT '[]',
    struggle_topics      JSONB DEFAULT '[]',
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Auto-update the updated_at timestamp on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own profile"
    ON student_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Students can insert their own profile"
    ON student_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can update their own profile"
    ON student_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can delete their own profile"
    ON student_profiles FOR DELETE
    USING (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
--  2. quiz_attempts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    module_topic    TEXT NOT NULL,
    score           FLOAT NOT NULL,
    questions       JSONB NOT NULL,
    attempt_number  INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own quiz attempts"
    ON quiz_attempts FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own quiz attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own quiz attempts"
    ON quiz_attempts FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete their own quiz attempts"
    ON quiz_attempts FOR DELETE
    USING (auth.uid() = student_id);


-- ────────────────────────────────────────────────────────────
--  3. session_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_logs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    agent_trace    JSONB NOT NULL,
    session_start  TIMESTAMPTZ DEFAULT now(),
    session_end    TIMESTAMPTZ
);

-- RLS
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own session logs"
    ON session_logs FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own session logs"
    ON session_logs FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own session logs"
    ON session_logs FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete their own session logs"
    ON session_logs FOR DELETE
    USING (auth.uid() = student_id);
