-- RLS policies for user-owned tables: every row is only visible/writable by
-- its owner (auth.uid()). Child tables without their own user_id column are
-- scoped by joining through their parent attempt.

alter table profiles enable row level security;
alter table chapter_progress enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_attempt_answers enable row level security;
alter table exam_attempts enable row level security;
alter table exam_attempt_questions enable row level security;

create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage their own chapter progress" on chapter_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own quiz attempts" on quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own quiz attempt answers" on quiz_attempt_answers
  for all using (
    exists (
      select 1 from quiz_attempts qa
      where qa.id = quiz_attempt_answers.attempt_id
        and qa.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from quiz_attempts qa
      where qa.id = quiz_attempt_answers.attempt_id
        and qa.user_id = auth.uid()
    )
  );

create policy "Users manage their own exam attempts" on exam_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own exam attempt questions" on exam_attempt_questions
  for all using (
    exists (
      select 1 from exam_attempts ea
      where ea.id = exam_attempt_questions.attempt_id
        and ea.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from exam_attempts ea
      where ea.id = exam_attempt_questions.attempt_id
        and ea.user_id = auth.uid()
    )
  );
