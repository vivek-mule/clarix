-- ============================================================
--  005_uploaded_documents — Track user-uploaded PDF documents
-- ============================================================

begin;

create table if not exists public.uploaded_documents (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid not null references public.student_profiles(id) on delete cascade,
    filename        text not null,
    namespace       text not null,
    page_count      integer not null default 0,
    vector_count    integer not null default 0,
    summary         text,
    roadmap         jsonb,
    created_at      timestamptz not null default now()
);

create index if not exists idx_uploaded_documents_student
    on public.uploaded_documents(student_id, created_at desc);

alter table public.uploaded_documents enable row level security;

create policy "Students can view their own documents"
    on public.uploaded_documents for select
    using (auth.uid() = student_id);

create policy "Students can insert their own documents"
    on public.uploaded_documents for insert
    with check (auth.uid() = student_id);

create policy "Students can update their own documents"
    on public.uploaded_documents for update
    using (auth.uid() = student_id)
    with check (auth.uid() = student_id);

create policy "Students can delete their own documents"
    on public.uploaded_documents for delete
    using (auth.uid() = student_id);

commit;
