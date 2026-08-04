-- The profile page's two pieces of genuinely new state: when you're sitting
-- each exam, and which calendar your study days belong to.
--
-- Exam date is per (user, exam) rather than a column on profiles: the app is
-- multi-certification, and someone working through two of them has two
-- different dates. There's no target_score here on purpose — ExamMeta already
-- carries one per exam (see lib/content/types.ts) and a per-user override is
-- a second source of truth nobody has asked for yet.

create table user_exam_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  exam_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

alter table user_exam_settings enable row level security;

create policy "Users manage their own exam settings" on user_exam_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS restricts rows; the base table still needs its own GRANTs. See
-- 20260731130003_grants.sql.
grant select, insert, update, delete on user_exam_settings to authenticated;
grant all on user_exam_settings to service_role;

-- A study streak counts *local* calendar days, but every timestamp in this
-- schema is timestamptz. Without the user's zone, someone studying at 10pm
-- Central has that session bucketed into tomorrow UTC and their streak breaks
-- for no visible reason. Captured from the browser on first visit to the
-- profile page; null falls back to UTC.
alter table profiles add column timezone text;
