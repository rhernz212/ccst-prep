-- Per-user, per-question spaced-repetition schedule (SM-2 style). A row is
-- created/updated the first time a question is ever answered anywhere in
-- the app (chapter quiz, full exam, or the review queue itself).

create table question_review_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  repetitions int not null default 0,
  ease_factor numeric not null default 2.5,
  interval_days numeric not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  unique (user_id, question_id)
);

create index question_review_state_due_idx on question_review_state(user_id, due_at);

alter table question_review_state enable row level security;

create policy "Users manage their own review state" on question_review_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on question_review_state to authenticated;
grant all on question_review_state to service_role;
