-- ============================================================
--  Remove subject column from student_profiles
--  This migration is for existing databases created before
--  subject decoupling.
-- ============================================================

ALTER TABLE IF EXISTS student_profiles
    DROP COLUMN IF EXISTS subject;
