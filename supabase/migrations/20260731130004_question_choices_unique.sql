-- question_choices had no natural-key uniqueness, so re-running seed-db.ts
-- would duplicate every choice on each run instead of upserting cleanly.
alter table question_choices
  add constraint question_choices_question_label_unique unique (question_id, label);
