import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "..", "..", ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";
import { listExams, listChapters, getBlueprint, listQuestions } from "@/lib/content/content-reader";

/**
 * Seeds exam/chapter/section/blueprint/question metadata into Supabase from
 * the ingested content JSON. Idempotent (upserts on natural keys), so it's
 * safe to re-run after content changes or when a new exam is added.
 *
 * Chapter body HTML lives in the committed content/*.json files and is read
 * from there at request time (see lib/content/exam-content.ts) — the copy
 * seeded into `sections.html` here is for future admin/search use, not the
 * app's primary read path.
 */
async function main() {
  const admin = createAdminClient();
  const exams = listExams();

  for (const exam of exams) {
    const { data: examRow, error: examError } = await admin
      .from("exams")
      .upsert(
        {
          slug: exam.slug,
          title: exam.title,
          exam_code: exam.examCode,
          time_limit_minutes: exam.timeLimitMinutes,
          question_count: exam.questionCount,
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (examError || !examRow) {
      throw new Error(`Failed to upsert exam ${exam.slug}: ${examError?.message}`);
    }
    console.log(`Upserted exam ${exam.slug} -> ${examRow.id}`);

    const chapterIdByNumber = new Map<number, string>();
    const chapters = listChapters(exam.slug);
    for (const chapter of chapters) {
      const { data: chapterRow, error: chapterError } = await admin
        .from("chapters")
        .upsert(
          {
            exam_id: examRow.id,
            number: chapter.number,
            slug: chapter.slug,
            title: chapter.title,
            order_index: chapter.number,
          },
          { onConflict: "exam_id,number" }
        )
        .select()
        .single();

      if (chapterError || !chapterRow) {
        throw new Error(`Failed to upsert chapter ${chapter.slug}: ${chapterError?.message}`);
      }
      chapterIdByNumber.set(chapter.number, chapterRow.id);

      for (const section of chapter.sections) {
        const { error: sectionError } = await admin.from("sections").upsert(
          {
            chapter_id: chapterRow.id,
            anchor_id: section.anchorId,
            title: section.title,
            order_index: section.order,
            html: section.html,
          },
          { onConflict: "chapter_id,anchor_id" }
        );
        if (sectionError) {
          throw new Error(`Failed to upsert section ${section.anchorId}: ${sectionError.message}`);
        }
      }

      console.log(`  Chapter ${chapter.number}: ${chapter.sections.length} sections upserted`);
    }

    const domainIdByCode = new Map<string, string>();
    const blueprint = getBlueprint(exam.slug);
    if (blueprint) {
      let domainOrder = 0;
      for (const domain of blueprint.domains) {
        const { data: domainRow, error: domainError } = await admin
          .from("blueprint_domains")
          .upsert(
            {
              exam_id: examRow.id,
              code: domain.code,
              title: domain.title,
              weight: domain.weight,
              weighting_method: blueprint.weightingMethod,
              order_index: domainOrder++,
            },
            { onConflict: "exam_id,code" }
          )
          .select()
          .single();

        if (domainError || !domainRow) {
          throw new Error(`Failed to upsert domain ${domain.code}: ${domainError?.message}`);
        }
        domainIdByCode.set(domain.code, domainRow.id);

        let objectiveOrder = 0;
        for (const objective of domain.objectives) {
          const { error: objectiveError } = await admin.from("blueprint_objectives").upsert(
            {
              domain_id: domainRow.id,
              code: objective.code,
              title: objective.title,
              content_examples: objective.contentExamples,
              chapter_numbers: objective.chapterRefs,
              order_index: objectiveOrder++,
            },
            { onConflict: "domain_id,code" }
          );
          if (objectiveError) {
            throw new Error(`Failed to upsert objective ${objective.code}: ${objectiveError.message}`);
          }
        }
      }
      console.log(`  Blueprint: ${blueprint.domains.length} domains upserted`);
    }

    const questions = listQuestions(exam.slug);
    let questionCount = 0;
    for (const q of questions) {
      const chapterId = chapterIdByNumber.get(q.chapterNumber);
      if (!chapterId) {
        throw new Error(`Question references chapter ${q.chapterNumber}, which has no seeded chapter row`);
      }
      const domainId = q.domainCode ? domainIdByCode.get(q.domainCode) ?? null : null;

      const { data: questionRow, error: questionError } = await admin
        .from("questions")
        .upsert(
          {
            exam_id: examRow.id,
            chapter_id: chapterId,
            domain_id: domainId,
            source: "book_review",
            ordinal: q.ordinal,
            stem: q.stem,
            explanation: q.explanation,
            is_multi_select: q.isMultiSelect,
          },
          { onConflict: "exam_id,chapter_id,ordinal" }
        )
        .select()
        .single();

      if (questionError || !questionRow) {
        throw new Error(
          `Failed to upsert question (chapter ${q.chapterNumber}, ordinal ${q.ordinal}): ${questionError?.message}`
        );
      }

      let choiceOrder = 0;
      for (const choice of q.choices) {
        const { error: choiceError } = await admin.from("question_choices").upsert(
          {
            question_id: questionRow.id,
            label: choice.label,
            body: choice.body,
            is_correct: choice.isCorrect,
            order_index: choiceOrder++,
          },
          { onConflict: "question_id,label" }
        );
        if (choiceError) {
          throw new Error(`Failed to upsert choice ${choice.label}: ${choiceError.message}`);
        }
      }

      questionCount++;
    }
    if (questions.length > 0) {
      console.log(`  Questions: ${questionCount} upserted`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
