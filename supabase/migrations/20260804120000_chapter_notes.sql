-- Free-text notes a reader writes while working through a chapter. One row
-- per section they've annotated; a null section_id is the chapter-level note.
--
-- `nulls not distinct` on the unique key is load-bearing: Postgres treats
-- NULLs as distinct by default, so without it every chapter-level note would
-- insert a fresh duplicate row instead of upserting. chapter_progress has the
-- same nullable column and dodges the problem only because callers always
-- pass a section id.

create table chapter_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade,
  body text not null check (length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, chapter_id, section_id)
);

-- The notes tab lists a user's notes grouped by chapter, so it reads on
-- (user_id, chapter_id) rather than user_id alone.
create index chapter_notes_user_chapter_idx on chapter_notes(user_id, chapter_id);

alter table chapter_notes enable row level security;

create policy "Users manage their own chapter notes" on chapter_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS restricts rows; the base table still needs its own GRANTs. See
-- 20260731130003_grants.sql.
grant select, insert, update, delete on chapter_notes to authenticated;
grant all on chapter_notes to service_role;
