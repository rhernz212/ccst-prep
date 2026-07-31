import { notFound } from "next/navigation";
import { getExamMeta } from "@/lib/content/exam-content";
import { createClient } from "@/lib/supabase/server";
import { StartExamButton } from "@/components/exam/StartExamButton";

export default async function ExamStartPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const supabase = await createClient();
  const { data: examRow } = await supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle();

  let domainTitles: string[] = [];
  if (examRow) {
    const { data: domains } = await supabase
      .from("blueprint_domains")
      .select("title")
      .eq("exam_id", examRow.id)
      .order("order_index");
    domainTitles = (domains ?? []).map((d) => d.title);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900">Full Practice Exam</h2>
      <div className="mt-4 rounded-lg border border-gray-200 p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Time limit</dt>
            <dd className="text-lg font-semibold text-gray-900">{exam.timeLimitMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-gray-500">Questions</dt>
            <dd className="text-lg font-semibold text-gray-900">{exam.questionCount}</dd>
          </div>
        </dl>

        {domainTitles.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-500">Domains covered</div>
            <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
              {domainTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Once started, the timer cannot be paused. You can navigate between questions freely and
          submit at any time — the exam auto-submits whatever you&apos;ve answered when time runs out.
        </p>

        <div className="mt-6">
          <StartExamButton examSlug={examSlug} />
        </div>
      </div>
    </div>
  );
}
