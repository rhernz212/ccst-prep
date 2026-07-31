-- selectExamQuestions() decides which domain each question was drawn for
-- at exam-start time (a question's chapter can belong to more than one
-- domain, so this can't be losslessly re-derived later at finalize time).
-- That decision needs to survive between the start and finalize requests,
-- which are separate, potentially far-apart HTTP calls — so it has to be
-- persisted, not just held in memory.
alter table exam_attempt_questions
  add column domain_id uuid references blueprint_domains(id) on delete set null;
