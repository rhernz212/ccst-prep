-- An append-only log of every review, alongside the running schedule.
--
-- `question_review_state` keeps only where a card is *now*: its current
-- interval, ease and due date. That's all SM-2 needs, and it's why every
-- review before this migration is gone — the answer was folded into the
-- state and the event itself thrown away.
--
-- That's a problem the moment you want to change scheduler. FSRS (and any
-- other fitted model) is trained on review histories: what was asked, when,
-- how long since the last time, and whether it was recalled. None of that can
-- be reconstructed from a current interval. So the log starts now, and the
-- switch can happen later against real data instead of default parameters.
--
-- It's also the substrate for retention curves ("of cards you last saw 3
-- weeks ago, how many do you still get right"), per-question difficulty, and
-- leech detection — none of which the state table can answer either.

create table review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  reviewed_at timestamptz not null default now(),

  -- Where the answer came from. A chapter quiz, a due-card review and a
  -- practice exam are the same evidence about recall, but they're taken under
  -- very different conditions, and a model shouldn't be forced to treat a
  -- 50-minute timed exam like a deliberate review.
  source text not null check (source in ('quiz', 'review', 'exam')),
  is_correct boolean not null,

  -- Days since this question was last reviewed, or null the first time it's
  -- ever seen. Stored rather than derived: it's the single most important
  -- feature for fitting a memory model, and computing it later means a
  -- self-join over the whole log per row.
  elapsed_days numeric,

  -- The schedule as it stood *before* this answer, so a fitted model can see
  -- what was predicted as well as what happened.
  prev_repetitions int,
  prev_ease_factor numeric,
  prev_interval_days numeric,

  -- ...and where this answer moved it to.
  next_repetitions int not null,
  next_ease_factor numeric not null,
  next_interval_days numeric not null,
  next_due_at timestamptz not null
);

-- The read pattern is "this user's history for these questions, oldest
-- first" — fitting a scheduler, drawing a retention curve, counting lapses.
create index review_events_user_question_idx
  on review_events(user_id, question_id, reviewed_at);
-- And "everything this user did lately", for activity and calibration views.
create index review_events_user_time_idx on review_events(user_id, reviewed_at desc);

alter table review_events enable row level security;

-- Insert and select only: a log you can rewrite isn't a log, and nothing in
-- the app has any reason to amend history.
create policy "Users read their own review events" on review_events
  for select using (auth.uid() = user_id);
create policy "Users append their own review events" on review_events
  for insert with check (auth.uid() = user_id);

-- RLS restricts rows; the base table still needs its own GRANTs. See
-- 20260731130003_grants.sql.
grant select, insert on review_events to authenticated;
grant all on review_events to service_role;
