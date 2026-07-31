-- User-owned tables. RLS restricts every row to its owning user (auth.uid()).

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table chapter_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  section_id uuid references sections(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (user_id, chapter_id, section_id)
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  question_count int not null
);

create table quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_choice_ids uuid[] not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create table exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'timed_out')),
  started_at timestamptz not null default now(),
  time_limit_minutes int not null,
  submitted_at timestamptz,
  score numeric,
  domain_breakdown jsonb
);

create table exam_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  order_index int not null,
  selected_choice_ids uuid[],
  is_correct boolean,
  answered_at timestamptz,
  unique (attempt_id, question_id)
);

create index chapter_progress_user_idx on chapter_progress(user_id);
create index quiz_attempts_user_idx on quiz_attempts(user_id);
create index exam_attempts_user_idx on exam_attempts(user_id);
