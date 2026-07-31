import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "..", "..", ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";
import { listExams, listChapters } from "@/lib/content/content-reader";

/**
 * Seeds exam/chapter/section structural metadata into Supabase from the
 * ingested content JSON. Idempotent (upserts on natural keys), so it's safe
 * to re-run after content changes or when a new exam is added.
 *
 * Question/answer/blueprint seeding is added in a later pass (see
 * parse-review-questions.ts / parse-answers.ts / parse-blueprint.ts) — this
 * version only seeds what reading-progress tracking needs: stable chapter
 * and section ids to reference as foreign keys.
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
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
