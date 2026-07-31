-- RLS policies restrict *rows*, but Postgres still requires base table-level
-- GRANTs before a role can query a table at all. New projects don't always
-- have default privileges pre-wired for tables created via the SQL editor,
-- so these must be explicit.

-- Content tables: public read for both anonymous and signed-in users.
grant select on exams, chapters, sections, blueprint_domains, blueprint_objectives,
  questions, question_choices to anon, authenticated;

-- User-owned tables: only signed-in users, and RLS further restricts each
-- row to its own auth.uid(). Anonymous users get no grant at all here.
grant select, insert, update, delete on
  profiles, chapter_progress, quiz_attempts, quiz_attempt_answers,
  exam_attempts, exam_attempt_questions
  to authenticated;

-- service_role is used only by trusted server-side scripts (content
-- ingestion/seeding) and needs full read/write across every table. It
-- already bypasses RLS, but that doesn't imply table-level GRANTs — this
-- project didn't have them pre-configured, so they're explicit here.
grant all on
  exams, chapters, sections, blueprint_domains, blueprint_objectives,
  questions, question_choices,
  profiles, chapter_progress, quiz_attempts, quiz_attempt_answers,
  exam_attempts, exam_attempt_questions
  to service_role;
