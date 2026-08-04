import { notFound } from "next/navigation";
import { CliPracticePanel } from "@/components/cli/CliPracticePanel";
import { getExamMeta } from "@/lib/content/exam-content";
import { hasExamTool } from "@/lib/content/exam-tools";

export default async function CliPracticePage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  // Hiding the tab isn't enough on its own — the route would still serve a
  // CCST-shaped simulator to an exam that doesn't offer the tool.
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam || !hasExamTool(exam, "cli")) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-fluid-xl font-semibold text-foreground">CLI Practice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A simulated Windows shell on a fixed practice network. Run the commands the exam expects
          you to read the output of.
        </p>
      </div>
      <CliPracticePanel />
    </div>
  );
}
