-- ============================================================
--  Pragyantra LearnOS - Full Schema Rebuild (Fresh Setup)
--  Purpose:
--    - Rebuild the entire app schema in one migration file.
--    - Safe for fresh DBs and for already-existing partial schemas.
--
--  Includes:
--    - student_profiles
--    - quiz_attempts
--    - session_logs
--    - learning_sessions
--    - RLS + policies + indexes + updated_at trigger function
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 0) Drop existing app tables (if present)
-- ------------------------------------------------------------
-- Drop in dependency order (children first)
drop table if exists public.learning_sessions cascade;
drop table if exists public.session_logs cascade;
drop table if exists public.quiz_attempts cascade;
drop table if exists public.student_profiles cascade;

-- ------------------------------------------------------------
-- 1) Shared helper: updated_at trigger function
-- ------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 2) student_profiles
-- ------------------------------------------------------------
create table public.student_profiles (
    id                   uuid primary key references auth.users(id) on delete cascade,
    name                 text not null,
    onboarding_complete  boolean default false,
    learning_style       text,
    knowledge_levels     jsonb not null default '{}'::jsonb,
    learning_path        jsonb not null default '[]'::jsonb,
    current_module_index integer not null default 0,
    completed_modules    jsonb not null default '[]'::jsonb,
    struggle_topics      jsonb not null default '[]'::jsonb,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

drop trigger if exists trg_student_profiles_updated_at on public.student_profiles;
create trigger trg_student_profiles_updated_at
before update on public.student_profiles
for each row
execute function public.update_updated_at();

alter table public.student_profiles enable row level security;

create policy "Students can view their own profile"
    on public.student_profiles for select
    using (auth.uid() = id);

create policy "Students can insert their own profile"
    on public.student_profiles for insert
    with check (auth.uid() = id);

create policy "Students can update their own profile"
    on public.student_profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "Students can delete their own profile"
    on public.student_profiles for delete
    using (auth.uid() = id);

-- ------------------------------------------------------------
-- 3) quiz_attempts
-- ------------------------------------------------------------
create table public.quiz_attempts (
    id             uuid primary key default gen_random_uuid(),
    student_id     uuid not null references public.student_profiles(id) on delete cascade,
    module_topic   text not null,
    score          double precision not null,
    questions      jsonb not null,
    attempt_number integer not null,
    created_at     timestamptz not null default now()
);

create index idx_quiz_attempts_student_created_at
    on public.quiz_attempts(student_id, created_at desc);

create index idx_quiz_attempts_student_topic_attempt
    on public.quiz_attempts(student_id, module_topic, attempt_number desc);

alter table public.quiz_attempts enable row level security;

create policy "Students can view their own quiz attempts"
    on public.quiz_attempts for select
    using (auth.uid() = student_id);

create policy "Students can insert their own quiz attempts"
    on public.quiz_attempts for insert
    with check (auth.uid() = student_id);

create policy "Students can update their own quiz attempts"
    on public.quiz_attempts for update
    using (auth.uid() = student_id)
    with check (auth.uid() = student_id);

create policy "Students can delete their own quiz attempts"
    on public.quiz_attempts for delete
    using (auth.uid() = student_id);

-- ------------------------------------------------------------
-- 4) session_logs (agent trace logs)
-- ------------------------------------------------------------
create table public.session_logs (
    id            uuid primary key default gen_random_uuid(),
    student_id    uuid not null references public.student_profiles(id) on delete cascade,
    agent_trace   jsonb not null,
    session_start timestamptz not null default now(),
    session_end   timestamptz
);

create index idx_session_logs_student_start
    on public.session_logs(student_id, session_start desc);

alter table public.session_logs enable row level security;

create policy "Students can view their own session logs"
    on public.session_logs for select
    using (auth.uid() = student_id);

create policy "Students can insert their own session logs"
    on public.session_logs for insert
    with check (auth.uid() = student_id);

create policy "Students can update their own session logs"
    on public.session_logs for update
    using (auth.uid() = student_id)
    with check (auth.uid() = student_id);

create policy "Students can delete their own session logs"
    on public.session_logs for delete
    using (auth.uid() = student_id);

-- ------------------------------------------------------------
-- 5) learning_sessions (durable chat/session state)
-- ------------------------------------------------------------
create table public.learning_sessions (
    id              uuid primary key,
    student_id      uuid not null references public.student_profiles(id) on delete cascade,
    title           text not null default '',
    status          text not null default 'active'
                       check (status in ('active', 'completed', 'error', 'archived')),
    state           jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    last_message_at timestamptz not null default now()
);

drop trigger if exists trg_learning_sessions_updated_at on public.learning_sessions;
create trigger trg_learning_sessions_updated_at
before update on public.learning_sessions
for each row
execute function public.update_updated_at();

create index idx_learning_sessions_student_updated
    on public.learning_sessions(student_id, updated_at desc);

create index idx_learning_sessions_student_last_message
    on public.learning_sessions(student_id, last_message_at desc);

alter table public.learning_sessions enable row level security;

create policy "Students can view their own learning sessions"
    on public.learning_sessions for select
    using (auth.uid() = student_id);

create policy "Students can insert their own learning sessions"
    on public.learning_sessions for insert
    with check (auth.uid() = student_id);

create policy "Students can update their own learning sessions"
    on public.learning_sessions for update
    using (auth.uid() = student_id)
    with check (auth.uid() = student_id);

create policy "Students can delete their own learning sessions"
    on public.learning_sessions for delete
    using (auth.uid() = student_id);

commit;
