-- Content tables: written only by the ingestion/seed script (service-role key).
-- Public read-only from the app's perspective.

create extension if not exists "pgcrypto";

create table exams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  exam_code text,
  time_limit_minutes int not null,
  question_count int not null,
  created_at timestamptz not null default now()
);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  number int not null,
  slug text not null,
  title text not null,
  order_index int not null,
  unique (exam_id, number)
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  anchor_id text not null,
  title text not null,
  order_index int not null,
  html text not null,
  unique (chapter_id, anchor_id)
);

create table blueprint_domains (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  code text not null,
  title text not null,
  weight numeric not null,
  weighting_method text not null default 'equal-per-objective-count',
  order_index int not null,
  unique (exam_id, code)
);

create table blueprint_objectives (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references blueprint_domains(id) on delete cascade,
  code text not null,
  title text not null,
  content_examples text[] not null default '{}',
  chapter_numbers int[] not null default '{}',
  order_index int not null,
  unique (domain_id, code)
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  domain_id uuid references blueprint_domains(id) on delete set null,
  source text not null default 'book_review',
  ordinal int,
  stem text not null,
  explanation text,
  is_multi_select boolean not null default false,
  created_at timestamptz not null default now(),
  unique (exam_id, chapter_id, ordinal)
);

create table question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null,
  body text not null,
  is_correct boolean not null default false,
  order_index int not null
);

alter table exams enable row level security;
alter table chapters enable row level security;
alter table sections enable row level security;
alter table blueprint_domains enable row level security;
alter table blueprint_objectives enable row level security;
alter table questions enable row level security;
alter table question_choices enable row level security;

create policy "Public read access" on exams for select using (true);
create policy "Public read access" on chapters for select using (true);
create policy "Public read access" on sections for select using (true);
create policy "Public read access" on blueprint_domains for select using (true);
create policy "Public read access" on blueprint_objectives for select using (true);
create policy "Public read access" on questions for select using (true);
create policy "Public read access" on question_choices for select using (true);

-- Intentionally no insert/update/delete policies for anon/authenticated roles:
-- writes happen only via the service-role key from scripts/ingest, which bypasses RLS.
